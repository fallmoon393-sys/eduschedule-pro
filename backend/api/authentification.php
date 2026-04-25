<?php
require_once '../middleware/auth.php';
require_once '../models/User.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($method === 'POST' && str_ends_with($uri, '/login')) {
    $body = json_decode(file_get_contents('php://input'), true);

    if (empty($body['email']) || empty($body['password'])) {
        repondreErreur(400, 'Email et mot de passe requis.');
    }

    $model = new User($pdo);
    try {
        $resultat = $model->login($body['email'], $body['password']);
        repondreJSON(200, $resultat);
    } catch (RuntimeException $e) {
        repondreErreur(401, $e->getMessage());
    }
}

if ($method === 'POST' && str_ends_with($uri, '/logout')) {
    // Avec JWT stateless, le logout est géré côté client
    // On logue juste l'action
    $user = authentifier();
    $pdo->prepare('INSERT INTO logs_activite (id_utilisateur, action, ip, date_heure)
                   VALUES (?, "logout", ?, NOW())')
        ->execute([$user['id'], $_SERVER['REMOTE_ADDR']]);
    repondreJSON(200, ['message' => 'Déconnecté.']);
}

repondreErreur(404, 'Route inconnue.');