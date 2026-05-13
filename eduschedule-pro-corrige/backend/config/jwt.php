<?php
// Configuration JWT
// IMPORTANT : en production, utiliser une variable d'environnement
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'eduschedule_secret_key_2026_change_me_in_production');
define('JWT_EXPIRATION', 86400); // 24 heures en secondes
