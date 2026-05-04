<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$id = $uri[0] ?? null;
$action = $uri[1] ?? '';

// GET - Liste des cahiers
if ($method === 'GET' && !$id) {
    $user = verifyToken();
    $db = getDB();

    $id_classe = $_GET['id_classe'] ?? null;
    $mois = $_GET['mois'] ?? null;

    $sql = 'SELECT ct.*, m.libelle as matiere, e.nom as enseignant_nom, e.prenom as enseignant_prenom
            FROM cahiers_texte ct
            JOIN creneaux c ON ct.id_creneau = c.id
            JOIN matieres m ON c.id_matiere = m.id
            JOIN enseignants e ON c.id_enseignant = e.id
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            WHERE 1=1';
    $params = [];

    if ($id_classe) {
        $sql .= ' AND et.id_classe = ?';
        $params[] = $id_classe;
    }
    if ($mois) {
        $sql .= ' AND MONTH(ct.date_creation) = ?';
        $params[] = $mois;
    }

    $sql .= ' ORDER BY ct.date_creation DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    echo json_encode($stmt->fetchAll());
    exit;
}

// GET - Détail d'un cahier
if ($method === 'GET' && $id) {
    $user = verifyToken();
    $db = getDB();

    $stmt = $db->prepare('SELECT * FROM cahiers_texte WHERE id = ?');
    $stmt->execute([$id]);
    $cahier = $stmt->fetch();

    if (!$cahier) {
        http_response_code(404);
        echo json_encode(['error' => 'Cahier non trouvé']);
        exit;
    }

    echo json_encode($cahier);
    exit;
}

// POST - Créer un cahier
if ($method === 'POST' && !$id) {
    $user = verifyToken();
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $stmt = $db->prepare('INSERT INTO cahiers_texte (id_creneau, id_delegue, titre_cours, contenu_json, statut) VALUES (?, ?, ?, ?, "brouillon")');
    $stmt->execute([
        $data['id_creneau'],
        $user['id'],
        $data['titre_cours'],
        json_encode($data['contenu_json'] ?? [])
    ]);

    http_response_code(201);
    echo json_encode(['message' => 'Cahier créé', 'id' => $db->lastInsertId()]);
    exit;
}

// POST - Signer un cahier
if ($method === 'POST' && $id && $action === 'signer') {
    $user = verifyToken();
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $stmt = $db->prepare('INSERT INTO signatures (id_cahier, type_signataire, id_utilisateur, signature_base64) VALUES (?, ?, ?, ?)');
    $stmt->execute([
        $id,
        $data['type'],
        $user['id'],
        $data['signature_base64']
    ]);

    // Mettre à jour le statut
    if ($data['type'] === 'delegue') {
        $db->prepare('UPDATE cahiers_texte SET statut = "signe_delegue" WHERE id = ?')->execute([$id]);
    }

    echo json_encode(['message' => 'Signature ajoutée']);
    exit;
}

// POST - Clôturer une séance
if ($method === 'POST' && $id && $action === 'cloture') {
    $user = verifyToken();
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $stmt = $db->prepare('UPDATE cahiers_texte SET heure_fin_reelle = ?, statut = "cloture" WHERE id = ?');
    $stmt->execute([$data['heure_fin'], $id]);

    echo json_encode(['message' => 'Séance clôturée']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);