<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$id = $uri[0] ?? null;
$action = $uri[1] ?? '';

// GET - Liste tous les créneaux
if ($method === 'GET' && !$id) {
    $db = getDB();
    $id_emploi_temps = $_GET['id_emploi_temps'] ?? null;

    $sql = 'SELECT c.*, m.libelle as matiere, m.id as id_matiere,
                    CONCAT(e.nom, " ", e.prenom) as enseignant,
                    e.id as id_enseignant,
                    s.code as salle, s.id as id_salle,
                    CASE 
                        WHEN c.qr_token IS NOT NULL AND c.qr_expire > NOW() THEN "actif"
                        WHEN c.qr_token IS NOT NULL AND c.qr_expire <= NOW() THEN "expire"
                        ELSE "aucun"
                    END as statut_qr
                    FROM creneaux c
                    JOIN matieres m ON c.id_matiere = m.id
                    JOIN enseignants e ON c.id_enseignant = e.id
                    JOIN salles s ON c.id_salle = s.id
                    WHERE 1=1';
    $params = [];

    if ($id_emploi_temps) {
        $sql .= ' AND c.id_emploi_temps = ?';
        $params[] = $id_emploi_temps;
    }

    $sql .= ' ORDER BY FIELD(c.jour,"Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"), c.heure_debut';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());
    exit;
}

// GET - Générer QR Code pour un créneau (fenêtre ±15 min selon cahier des charges)
if ($method === 'GET' && $id && $action === 'qr') {
    $user = verifyToken();
    $db = getDB();

    $stmtCheck = $db->prepare('SELECT c.*, m.libelle as matiere, CONCAT(e.nom," ",e.prenom) as enseignant 
                                FROM creneaux c 
                                JOIN matieres m ON c.id_matiere = m.id
                                JOIN enseignants e ON c.id_enseignant = e.id
                                WHERE c.id = ?');
    $stmtCheck->execute([$id]);
    $creneau = $stmtCheck->fetch();
    if (!$creneau) {
        http_response_code(404);
        echo json_encode(['error' => 'Créneau non trouvé']);
        exit;
    }

    // Token unique + expiration = heure_debut + 15 min + 2h buffer (valide pendant la séance)
    $token = bin2hex(random_bytes(32));
    
    // Fenêtre : de heure_debut - 15min à heure_fin + 15min
    $heure_debut_ts = strtotime(date('Y-m-d') . ' ' . $creneau['heure_debut']);
    $heure_fin_ts   = strtotime(date('Y-m-d') . ' ' . $creneau['heure_fin']);
    $debut_valide   = date('Y-m-d H:i:s', $heure_debut_ts - 15 * 60);
    $fin_valide     = date('Y-m-d H:i:s', $heure_fin_ts + 15 * 60);

    $stmt = $db->prepare('UPDATE creneaux SET qr_token = ?, qr_expire = ? WHERE id = ?');
    $stmt->execute([$token, $fin_valide, $id]);

    // Log de génération
    $db->prepare('INSERT INTO scan_logs (id_creneau, action, ip_source, details) VALUES (?, "generation", ?, ?)')
       ->execute([$id, $_SERVER['REMOTE_ADDR'], json_encode(['genere_par' => $user['id'], 'debut_valide' => $debut_valide, 'fin_valide' => $fin_valide])]);

    echo json_encode([
        'token'       => $token,
        'debut_valide'=> $debut_valide,
        'fin_valide'  => $fin_valide,
        'id_creneau'  => $id,
        'matiere'     => $creneau['matiere'],
        'enseignant'  => $creneau['enseignant'],
        'heure_debut' => $creneau['heure_debut'],
        'heure_fin'   => $creneau['heure_fin']
    ]);
    exit;
}

// PUT - Modifier un créneau
if ($method === 'PUT' && $id) {
    $user = verifyToken();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $stmt = $db->prepare('UPDATE creneaux SET id_matiere=?, id_enseignant=?, id_salle=?, jour=?, heure_debut=?, heure_fin=? WHERE id=?');
    $stmt->execute([$data['id_matiere'], $data['id_enseignant'], $data['id_salle'], $data['jour'], $data['heure_debut'], $data['heure_fin'], $id]);

    echo json_encode(['message' => 'Créneau modifié']);
    exit;
}

// DELETE - Supprimer un créneau
if ($method === 'DELETE' && $id) {
    $user = verifyToken();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }

    $db = getDB();
    $db->prepare('DELETE FROM creneaux WHERE id = ?')->execute([$id]);
    echo json_encode(['message' => 'Créneau supprimé']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);