<?php
require_once '../middleware/auth.php';

$pdo    = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts  = explode('/', trim($uri, '/'));
$id     = null;
foreach ($parts as $p) { if (is_numeric($p)) $id = (int)$p; }

$user = exigerRole(['administrateur','surveillant','comptable']);

// GET /api/enseignants
if ($method === 'GET' && !$id) {
    $where  = ['1=1'];
    $params = [];
    if (!empty($_GET['statut'])) {
        $where[]  = 'statut = ?';
        $params[] = $_GET['statut'];
    }
    if (!empty($_GET['specialite'])) {
        $where[]  = 'specialite LIKE ?';
        $params[] = '%' . $_GET['specialite'] . '%';
    }
    $stmt = $pdo->prepare(
        'SELECT * FROM enseignants WHERE ' . implode(' AND ', $where) .
        ' ORDER BY nom, prenom'
    );
    $stmt->execute($params);
    repondreJSON(200, $stmt->fetchAll());
}

// GET /api/enseignants/{id}
if ($method === 'GET' && $id) {
    $stmt = $pdo->prepare('SELECT * FROM enseignants WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) repondreErreur(404, 'Enseignant introuvable.');
    repondreJSON(200, $row);
}

// POST /api/enseignants
if ($method === 'POST') {
    exigerRole(['administrateur']);
    $body = json_decode(file_get_contents('php://input'), true);
    if (empty($body['nom']) || empty($body['prenom']) || empty($body['email'])) {
        repondreErreur(400, 'nom, prenom et email requis.');
    }
    // Générer matricule auto
    $matricule = 'ENS-' . strtoupper(substr($body['nom'], 0, 3)) . rand(100, 999);

    $stmt = $pdo->prepare(
        'INSERT INTO enseignants
            (matricule, nom, prenom, email, specialite, statut, taux_horaire)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $matricule,
        $body['nom'], $body['prenom'], $body['email'],
        $body['specialite']  ?? null,
        $body['statut']      ?? 'vacataire',
        $body['taux_horaire'] ?? 4000,
    ]);
    $id_new = (int)$pdo->lastInsertId();

    // Créer le compte utilisateur associé
    $hash = password_hash($body['password'] ?? 'password123', PASSWORD_BCRYPT);
    $pdo->prepare(
        'INSERT INTO utilisateurs (email, mot_de_passe_hash, role, id_lien)
         VALUES (?, ?, "enseignant", ?)'
    )->execute([$body['email'], $hash, $id_new]);

    repondreJSON(201, ['id' => $id_new, 'matricule' => $matricule]);
}

// PUT /api/enseignants/{id}
if ($method === 'PUT' && $id) {
    exigerRole(['administrateur']);
    $body = json_decode(file_get_contents('php://input'), true);
    $pdo->prepare(
        'UPDATE enseignants
         SET nom=?, prenom=?, email=?, specialite=?, statut=?, taux_horaire=?
         WHERE id=?'
    )->execute([
        $body['nom'], $body['prenom'], $body['email'],
        $body['specialite'], $body['statut'], $body['taux_horaire'], $id
    ]);
    repondreJSON(200, ['message' => 'Enseignant mis à jour.']);
}

// DELETE /api/enseignants/{id}
if ($method === 'DELETE' && $id) {
    exigerRole(['administrateur']);
    $pdo->prepare('DELETE FROM enseignants WHERE id = ?')->execute([$id]);
    repondreJSON(200, ['message' => 'Enseignant supprimé.']);
}

repondreErreur(404, 'Route enseignants inconnue.');