<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../config/jwt.php';
require_once '../vendor/firebase/php-jwt-5.5.1/src/JWT.php';
require_once '../vendor/firebase/php-jwt-5.5.1/src/Key.php';
require_once '../vendor/firebase/php-jwt-5.5.1/src/BeforeValidException.php';
require_once '../vendor/firebase/php-jwt-5.5.1/src/ExpiredException.php';
require_once '../vendor/firebase/php-jwt-5.5.1/src/SignatureInvalidException.php';

use Firebase\JWT\JWT;

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

$db = getDB();
$stmt = $db->prepare('SELECT * FROM utilisateurs WHERE email = ? AND actif = 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['mot_de_passe_hash'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Email ou mot de passe incorrect']);
    exit;
}

$payload = [
    'iat' => time(),
    'exp' => time() + JWT_EXPIRATION,
    'id' => $user['id'],
    'email' => $user['email'],
    'role' => $user['role']
];

$token = JWT::encode($payload, JWT_SECRET, 'HS256');
echo json_encode(['token' => $token, 'user' => ['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role']]]);