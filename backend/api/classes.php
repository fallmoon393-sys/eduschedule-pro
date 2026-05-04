<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET - Liste toutes les classes
if ($method === 'GET') {
    $db = getDB();
    $annee = $_GET['annee'] ?? null;
    
    if ($annee) {
        $stmt = $db->prepare('SELECT * FROM classes WHERE annee_academique = ? ORDER BY niveau');
        $stmt->execute([$annee]);
    } else {
        $stmt = $db->query('SELECT * FROM classes ORDER BY niveau');
    }
    
    echo json_encode($stmt->fetchAll());
    exit;
}

// POST - Créer une classe (admin seulement)
if ($method === 'POST') {
    $user = verifyToken();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();
    
    $stmt = $db->prepare('INSERT INTO classes (code, libelle, niveau, annee_academique) VALUES (?, ?, ?, ?)');
    $stmt->execute([$data['code'], $data['libelle'], $data['niveau'], $data['annee_academique']]);
    
    http_response_code(201);
    echo json_encode(['message' => 'Classe créée', 'id' => $db->lastInsertId()]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);