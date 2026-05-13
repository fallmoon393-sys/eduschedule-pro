<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = explode(',', $_ENV['CORS_ORIGINS'] ?? 'http://localhost:5173');

if (in_array($origin, $allowed)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}