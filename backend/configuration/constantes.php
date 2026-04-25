<?php
define('QR_FENETRE_AVANT_MIN', 15);   // minutes avant l'heure prévue
define('QR_FENETRE_APRES_MIN', 60);   // minutes après (au-delà = absent)
define('RETARD_SEUIL_MIN',     30);   // minutes : en_cours → retard
define('JWT_EXPIRATION',       86400);// 24h en secondes
define('ROLES_VALIDES', [
    'administrateur', 'enseignant', 'delegue',
    'surveillant', 'comptable', 'etudiant'
]);