<?php
class User
{
    public function __construct(private PDO $pdo) {}

    public function login(string $email, string $password): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT u.*, e.nom, e.prenom
             FROM utilisateurs u
             LEFT JOIN enseignants e ON e.id = u.id_lien
             WHERE u.email = ? AND u.actif = 1 LIMIT 1'
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['mot_de_passe_hash'])) {
            throw new RuntimeException('Email ou mot de passe incorrect.');
        }

        $payload = [
            'id'    => $user['id'],
            'email' => $user['email'],
            'role'  => $user['role'],
            'nom'   => $user['nom'] ?? 'Admin',
            'prenom'=> $user['prenom'] ?? '',
            'id_lien' => $user['id_lien'],
        ];

        $this->pdo->prepare('INSERT INTO logs_activite
            (id_utilisateur, action, ip, date_heure) VALUES (?, "login", ?, NOW())')
            ->execute([$user['id'], $_SERVER['REMOTE_ADDR']]);

        return [
            'token' => JWTHelper::generer($payload),
            'user'  => $payload,
        ];
    }
}