<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/JWTHelper.php';

function authentifier(): array
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($header, 'Bearer ')) {
        repondreErreur(401, 'Token manquant.');
    }

    $token = substr($header, 7);
    try {
        return JWTHelper::verifier($token);
    } catch (RuntimeException $e) {
        repondreErreur((int)$e->getCode() ?: 401, $e->getMessage());
    }
}

function exigerRole(array $roles): array
{
    $user = authentifier();
    if (!in_array($user['role'], $roles)) {
        repondreErreur(403, 'Accès refusé pour ce rôle.');
    }
    return $user;
}