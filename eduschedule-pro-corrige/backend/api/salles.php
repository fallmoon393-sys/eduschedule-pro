<?php
require_once '../config/cors.php';
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $db = getDB();
    $stmt = $db->query('SELECT * FROM salles ORDER BY code');
    echo json_encode($stmt->fetchAll());
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);