<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET - Liste tous les enseignants
if ($method === 'GET') {
    $db = getDB();
    $specialite = $_GET['specialite'] ?? null;
    $statut = $_GET['statut'] ?? null;
    
    $sql = 'SELECT * FROM enseignants WHERE 1=1';
    $params = [];
    
    if ($specialite) {
        $sql .= ' AND specialite = ?';
        $params[] = $specialite;
    }
    if ($statut) {
        $sql .= ' AND statut = ?';
        $params[] = $statut;
    }
    
    $sql .= ' ORDER BY nom';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    echo json_encode($stmt->fetchAll());
    exit;
}

// POST - Créer un enseignant (admin seulement)
if ($method === 'POST') {
    $user = verifyToken();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();
    
    $stmt = $db->prepare('INSERT INTO enseignants (matricule, nom, prenom, email, specialite, statut, taux_horaire) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $data['matricule'],
        $data['nom'],
        $data['prenom'],
        $data['email'],
        $data['specialite'],
        $data['statut'],
        $data['taux_horaire']
    ]);
    
    http_response_code(201);
    echo json_encode(['message' => 'Enseignant créé', 'id' => $db->lastInsertId()]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);