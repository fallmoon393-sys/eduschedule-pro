<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$action = $uri[0] ?? '';

// POST /pointages.php/scan - Scanner un QR Code
if ($method === 'POST' && $action === 'scan') {
    $user = verifyToken();
    $data = json_decode(file_get_contents('php://input'), true);
    $token_qr = $data['token_qr'] ?? '';

    if (empty($token_qr)) {
        http_response_code(400);
        echo json_encode(['error' => 'Token QR manquant']);
        exit;
    }

    $db = getDB();

    // Vérifier le token QR et récupérer le créneau
    $stmt = $db->prepare('SELECT c.*, m.libelle as matiere, cl.libelle as classe,
                           CONCAT(e.nom," ",e.prenom) as enseignant_nom
                           FROM creneaux c
                           JOIN matieres m ON c.id_matiere = m.id
                           JOIN enseignants e ON c.id_enseignant = e.id
                           JOIN emploi_temps et ON c.id_emploi_temps = et.id
                           JOIN classes cl ON et.id_classe = cl.id
                           WHERE c.qr_token = ?');
    $stmt->execute([$token_qr]);
    $creneau = $stmt->fetch();

    // Log de la tentative (réussie ou échouée)
    $log_details = ['token' => substr($token_qr, 0, 8) . '...', 'user_id' => $user['id'], 'role' => $user['role']];

    if (!$creneau) {
        $db->prepare('INSERT INTO scan_logs (id_creneau, action, ip_source, details, statut_scan) VALUES (NULL, "scan_echec", ?, ?, "token_invalide")')
           ->execute([$_SERVER['REMOTE_ADDR'], json_encode($log_details)]);
        http_response_code(400);
        echo json_encode(['error' => 'QR Code invalide ou token inconnu']);
        exit;
    }

    // Vérifier expiration
    if (strtotime($creneau['qr_expire']) < time()) {
        $db->prepare('INSERT INTO scan_logs (id_creneau, action, ip_source, details, statut_scan) VALUES (?, "scan_echec", ?, ?, "expire")')
           ->execute([$creneau['id'], $_SERVER['REMOTE_ADDR'], json_encode($log_details)]);
        http_response_code(400);
        echo json_encode(['error' => 'QR Code expiré']);
        exit;
    }

    // Vérifier fenêtre horaire ±15 min
    $heure_prevue_ts = strtotime(date('Y-m-d') . ' ' . $creneau['heure_debut']);
    $maintenant = time();
    $diff_minutes = ($maintenant - $heure_prevue_ts) / 60;

    if ($diff_minutes < -15) {
        http_response_code(400);
        echo json_encode(['error' => 'Trop tôt — le scan n\'est autorisé que 15 min avant le début du cours']);
        exit;
    }

    // Vérifier si déjà scanné aujourd'hui
    $stmt2 = $db->prepare('SELECT id FROM pointages WHERE id_creneau = ? AND DATE(created_at) = CURDATE()');
    $stmt2->execute([$creneau['id']]);
    if ($stmt2->fetch()) {
        $db->prepare('INSERT INTO scan_logs (id_creneau, action, ip_source, details, statut_scan) VALUES (?, "scan_echec", ?, ?, "doublon")')
           ->execute([$creneau['id'], $_SERVER['REMOTE_ADDR'], json_encode($log_details)]);
        http_response_code(400);
        echo json_encode(['error' => 'Pointage déjà enregistré pour ce créneau aujourd\'hui']);
        exit;
    }

    // Calculer statut : valide / retard / absent
    $statut = 'valide';
    if ($diff_minutes > 30) {
        $statut = 'retard';
    }

    // Enregistrer le pointage
    $stmt3 = $db->prepare('INSERT INTO pointages (id_creneau, id_enseignant, heure_pointage_reelle, ip_source, token_utilise, statut) VALUES (?, ?, NOW(), ?, ?, ?)');
    $stmt3->execute([$creneau['id'], $creneau['id_enseignant'], $_SERVER['REMOTE_ADDR'], $token_qr, $statut]);
    $id_pointage = $db->lastInsertId();

    // Invalider le token (usage unique)
    $db->prepare('UPDATE creneaux SET qr_token = NULL, qr_expire = NULL WHERE id = ?')->execute([$creneau['id']]);

    // Log succès
    $db->prepare('INSERT INTO scan_logs (id_creneau, action, ip_source, details, statut_scan) VALUES (?, "scan_succes", ?, ?, ?)')
       ->execute([$creneau['id'], $_SERVER['REMOTE_ADDR'], json_encode(array_merge($log_details, ['retard_min' => round($diff_minutes)])), $statut]);

    // Alerte si retard > 30 min
    $alerte = null;
    if ($statut === 'retard') {
        $alerte = "⚠️ Retard de " . round($diff_minutes) . " minutes détecté pour {$creneau['matiere']} — {$creneau['classe']}";
    }

    echo json_encode([
        'message'     => 'Pointage enregistré avec succès',
        'statut'      => $statut,
        'retard_min'  => round($diff_minutes),
        'alerte'      => $alerte,
        'creneau'     => [
            'matiere'    => $creneau['matiere'],
            'classe'     => $creneau['classe'],
            'enseignant' => $creneau['enseignant_nom'],
            'heure_debut'=> $creneau['heure_debut'],
            'heure_fin'  => $creneau['heure_fin']
        ]
    ]);
    exit;
}

// GET - Liste des pointages avec statuts
if ($method === 'GET' && !$action) {
    $user = verifyToken();
    $db = getDB();

    $id_enseignant = $_GET['id_enseignant'] ?? null;
    $date = $_GET['date'] ?? null;

    $sql = 'SELECT p.*, c.jour, c.heure_debut, c.heure_fin, 
                   m.libelle as matiere, cl.libelle as classe,
                   CONCAT(e.nom," ",e.prenom) as enseignant
            FROM pointages p
            JOIN creneaux c ON p.id_creneau = c.id
            JOIN matieres m ON c.id_matiere = m.id
            JOIN enseignants e ON c.id_enseignant = e.id
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            JOIN classes cl ON et.id_classe = cl.id
            WHERE 1=1';
    $params = [];

    if ($id_enseignant) { $sql .= ' AND c.id_enseignant = ?'; $params[] = $id_enseignant; }
    if ($date)          { $sql .= ' AND DATE(p.created_at) = ?'; $params[] = $date; }

    $sql .= ' ORDER BY p.created_at DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());
    exit;
}

// GET /pointages.php/logs - Log de toutes les tentatives
if ($method === 'GET' && $action === 'logs') {
    $user = verifyToken();
    if ($user['role'] !== 'admin' && $user['role'] !== 'surveillant') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }
    $db = getDB();
    $stmt = $db->query('SELECT sl.*, c.jour, m.libelle as matiere 
                        FROM scan_logs sl
                        LEFT JOIN creneaux c ON sl.id_creneau = c.id
                        LEFT JOIN matieres m ON c.id_matiere = m.id
                        ORDER BY sl.created_at DESC LIMIT 100');
    echo json_encode($stmt->fetchAll());
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);