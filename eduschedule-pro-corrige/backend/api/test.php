<?php
require_once '../config/database.php';
$db = getDB();
$stmt = $db->prepare('SELECT * FROM utilisateurs WHERE email = ?');
$stmt->execute(['admin@isge.edu']);
$user = $stmt->fetch();
echo "Hash en base : " . $user['mot_de_passe_hash'] . "<br>";
echo "Verify : " . (password_verify('password123', $user['mot_de_passe_hash']) ? 'OK' : 'FAIL');