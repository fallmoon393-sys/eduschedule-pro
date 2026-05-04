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

    // Vérifier le token QR
    $stmt = $db->prepare('SELECT c.*, m.libelle as matiere, cl.libelle as classe 
                          FROM creneaux c
                          JOIN matieres m ON c.id_matiere = m.id
                          JOIN emploi_temps et ON c.id_emploi_temps = et.id
                          JOIN classes cl ON et.id_classe = cl.id
                          WHERE c.qr_token = ? AND c.qr_expire > NOW()');
    $stmt->execute([$token_qr]);
    $creneau = $stmt->fetch();

    if (!$creneau) {
        http_response_code(400);
        echo json_encode(['error' => 'QR Code invalide ou expiré']);
        exit;
    }

    // Vérifier si déjà scanné
    $stmt2 = $db->prepare('SELECT id FROM pointages WHERE id_creneau = ?');
    $stmt2->execute([$creneau['id']]);
    if ($stmt2->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'QR Code déjà utilisé']);
        exit;
    }

    // Calculer le statut (retard ou non)
    $heure_prevue = strtotime($creneau['heure_debut']);
    $heure_actuelle = time();
    $diff_minutes = ($heure_actuelle - $heure_prevue) / 60;
    $statut = $diff_minutes > 30 ? 'retard' : 'valide';

    // Enregistrer le pointage
    $stmt3 = $db->prepare('INSERT INTO pointages (id_creneau, heure_pointage_reelle, ip_source, token_utilise, statut) VALUES (?, NOW(), ?, ?, ?)');
    $stmt3->execute([
        $creneau['id'],
        $_SERVER['REMOTE_ADDR'],
        $token_qr,
        $statut
    ]);

    // Invalider le token QR
    $stmt4 = $db->prepare('UPDATE creneaux SET qr_token = NULL, qr_expire = NULL WHERE id = ?');
    $stmt4->execute([$creneau['id']]);

    echo json_encode([
        'message' => 'Pointage enregistré',
        'statut' => $statut,
        'creneau' => $creneau
    ]);
    exit;
}

// GET - Liste des pointages
if ($method === 'GET') {
    $user = verifyToken();
    $db = getDB();

    $stmt = $db->query('SELECT p.*, c.jour, c.heure_debut, m.libelle as matiere
                        FROM pointages p
                        JOIN creneaux c ON p.id_creneau = c.id
                        JOIN matieres m ON c.id_matiere = m.id
                        ORDER BY p.created_at DESC');

    echo json_encode($stmt->fetchAll());
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);