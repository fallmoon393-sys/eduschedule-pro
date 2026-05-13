<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET - Liste toutes les matières
if ($method === 'GET') {
    $db = getDB();
    $stmt = $db->query('SELECT * FROM matieres ORDER BY libelle');
    echo json_encode($stmt->fetchAll());
    exit;
}

// POST - Créer une matière (admin seulement)
if ($method === 'POST') {
    $user = verifyToken();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();
    
    $stmt = $db->prepare('INSERT INTO matieres (code, libelle, volume_horaire_total, coefficient) VALUES (?, ?, ?, ?)');
    $stmt->execute([
        $data['code'],
        $data['libelle'],
        $data['volume_horaire_total'],
        $data['coefficient']
    ]);
    
    http_response_code(201);
    echo json_encode(['message' => 'Matière créée', 'id' => $db->lastInsertId()]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);