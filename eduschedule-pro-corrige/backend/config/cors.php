<?php
// Origines autorisées — ajouter l'URL de production via variable d'environnement
$allowed_origins = array_filter([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    getenv('FRONTEND_URL') ?: '',   // ex: https://monsite.com
]);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}