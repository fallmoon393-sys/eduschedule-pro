<?php
$jwt_secret = getenv('JWT_SECRET');

// En production, JWT_SECRET DOIT être défini dans les variables d'environnement
if (empty($jwt_secret)) {
    if (getenv('APP_ENV') === 'production') {
        http_response_code(500);
        echo json_encode(['error' => 'Configuration serveur manquante (JWT_SECRET)']);
        exit;
    }
    // Développement local uniquement
    $jwt_secret = 'eduschedule_dev_secret_change_me';
}

define('JWT_SECRET',     $jwt_secret);
define('JWT_EXPIRATION', 86400); // 24h