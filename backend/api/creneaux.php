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
    $stmt = $db->query('SELECT c.*, m.libelle as matiere, 
                        CONCAT(e.nom, " ", e.prenom) as enseignant,
                        s.code as salle
                        FROM creneaux c
                        JOIN matieres m ON c.id_matiere = m.id
                        JOIN enseignants e ON c.id_enseignant = e.id
                        JOIN salles s ON c.id_salle = s.id
                        ORDER BY c.jour, c.heure_debut');
    echo json_encode($stmt->fetchAll());
    exit;
}

// GET - Générer QR Code pour un créneau
if ($method === 'GET' && $id && $action === 'qr') {
    $user = verifyToken();
    $db = getDB();
    
    // Générer un token unique
    $token = bin2hex(random_bytes(32));
    $expire = date('Y-m-d H:i:s', strtotime('+2 hours'));
    
    // Sauvegarder le token
    $stmt = $db->prepare('UPDATE creneaux SET qr_token = ?, qr_expire = ? WHERE id = ?');
    $stmt->execute([$token, $expire, $id]);
    
    echo json_encode([
        'token' => $token,
        'expire' => $expire,
        'id_creneau' => $id
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);