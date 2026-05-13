<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$action = $uri[1] ?? '';
$id = $uri[0] ?? null;

// GET - Liste les emplois du temps
if ($method === 'GET') {
    $db = getDB();
    $id_classe = $_GET['id_classe'] ?? null;
    $semaine = $_GET['semaine'] ?? null;

    $sql = 'SELECT et.*, c.libelle as classe_libelle 
            FROM emploi_temps et 
            JOIN classes c ON et.id_classe = c.id 
            WHERE 1=1';
    $params = [];

    if ($id_classe) {
        $sql .= ' AND et.id_classe = ?';
        $params[] = $id_classe;
    }
    if ($semaine) {
        $sql .= ' AND et.semaine_debut = ?';
        $params[] = $semaine;
    }

    $sql .= ' ORDER BY et.semaine_debut DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    echo json_encode($stmt->fetchAll());
    exit;
}

// POST - Créer un emploi du temps
if ($method === 'POST' && empty($action)) {
    $user = verifyToken();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $stmt = $db->prepare('INSERT INTO emploi_temps (id_classe, semaine_debut, statut_publication, cree_par) VALUES (?, ?, "brouillon", ?)');
    $stmt->execute([
        $data['id_classe'],
        $data['semaine_debut'],
        $user['id']
    ]);

    $id_emploi = $db->lastInsertId();

    // Créer les créneaux si fournis
    if (!empty($data['creneaux'])) {
        $stmt2 = $db->prepare('INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES (?, ?, ?, ?, ?, ?, ?)');
        foreach ($data['creneaux'] as $creneau) {
            $stmt2->execute([
                $id_emploi,
                $creneau['id_matiere'],
                $creneau['id_enseignant'],
                $creneau['id_salle'],
                $creneau['jour'],
                $creneau['heure_debut'],
                $creneau['heure_fin']
            ]);
        }
    }

    http_response_code(201);
    echo json_encode(['message' => 'Emploi du temps créé', 'id' => $id_emploi]);
    exit;
}

// PUT - Publier un emploi du temps
if ($method === 'PUT' && $action === 'publier' && $id) {
    $user = verifyToken();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }

    $db = getDB();
    $stmt = $db->prepare('UPDATE emploi_temps SET statut_publication = "publie" WHERE id = ?');
    $stmt->execute([$id]);

    echo json_encode(['message' => 'Emploi du temps publié']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);