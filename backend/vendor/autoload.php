<?php
// Autoloader manuel pour EduSchedule Pro
spl_autoload_register(function ($class) {
    $base_dir = __DIR__ . '/';
    $file = $base_dir . str_replace('\\', '/', $class) . '.php';
    if (file_exists($file)) {
        require $file;
    }
});

// Chargement manuel de firebase/php-jwt
$jwt_src = __DIR__ . '/firebase/php-jwt-5.5.1/src/';
require_once $jwt_src . 'JWT.php';
require_once $jwt_src . 'Key.php';
require_once $jwt_src . 'BeforeValidException.php';
require_once $jwt_src . 'ExpiredException.php';
require_once $jwt_src . 'SignatureInvalidException.php';