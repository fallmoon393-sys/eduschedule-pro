<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri    = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$id     = $uri[0] ?? ($_GET['id'] ?? null);
$action = $uri[1] ?? ($_GET['action'] ?? '');

// GET - Liste les emplois du temps  (CORRIGÉ : verifyToken ajouté)
if ($method === 'GET' && !$action) {
    $user = verifyToken();
    $db = getDB();

    $id_classe = $_GET['id_classe'] ?? null;
    $semaine   = $_GET['semaine']   ?? null;

    $sql = 'SELECT et.*, c.libelle as classe_libelle
            FROM emploi_temps et
            JOIN classes c ON et.id_classe = c.id
            WHERE 1=1';
    $params = [];

    if ($id_classe) { $sql .= ' AND et.id_classe = ?';     $params[] = $id_classe; }
    if ($semaine)   { $sql .= ' AND et.semaine_debut = ?'; $params[] = $semaine; }

    $sql .= ' ORDER BY et.semaine_debut DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());
    exit;
}

// GET - Vérifier les conflits avant création
if ($method === 'GET' && $action === 'conflits') {
    $user = verifyToken();
    $db = getDB();

    $id_enseignant = $_GET['id_enseignant'] ?? null;
    $id_salle      = $_GET['id_salle']      ?? null;
    $jour          = $_GET['jour']          ?? null;
    $heure_debut   = $_GET['heure_debut']   ?? null;
    $heure_fin     = $_GET['heure_fin']     ?? null;
    $exclude_id    = $_GET['exclude_id']    ?? null;

    $conflits = [];

    if ($id_enseignant && $jour && $heure_debut && $heure_fin) {
        $sql = 'SELECT c.id, m.libelle as matiere, cl.libelle as classe,
                       c.heure_debut, c.heure_fin
                FROM creneaux c
                JOIN matieres m ON c.id_matiere = m.id
                JOIN emploi_temps et ON c.id_emploi_temps = et.id
                JOIN classes cl ON et.id_classe = cl.id
                WHERE c.id_enseignant = ? AND c.jour = ?
                AND c.heure_debut < ? AND c.heure_fin > ?';
        $params = [$id_enseignant, $jour, $heure_fin, $heure_debut];
        if ($exclude_id) { $sql .= ' AND c.id != ?'; $params[] = $exclude_id; }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $res = $stmt->fetchAll();
        if ($res) {
            $conflits[] = [
                'type'    => 'enseignant',
                'message' => "L'enseignant est déjà occupé le {$jour} de {$res[0]['heure_debut']} à {$res[0]['heure_fin']} ({$res[0]['matiere']} — {$res[0]['classe']})"
            ];
        }
    }

    if ($id_salle && $jour && $heure_debut && $heure_fin) {
        $sql = 'SELECT c.id, m.libelle as matiere, cl.libelle as classe,
                       c.heure_debut, c.heure_fin
                FROM creneaux c
                JOIN matieres m ON c.id_matiere = m.id
                JOIN emploi_temps et ON c.id_emploi_temps = et.id
                JOIN classes cl ON et.id_classe = cl.id
                WHERE c.id_salle = ? AND c.jour = ?
                AND c.heure_debut < ? AND c.heure_fin > ?';
        $params = [$id_salle, $jour, $heure_fin, $heure_debut];
        if ($exclude_id) { $sql .= ' AND c.id != ?'; $params[] = $exclude_id; }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $res = $stmt->fetchAll();
        if ($res) {
            $conflits[] = [
                'type'    => 'salle',
                'message' => "La salle est déjà occupée le {$jour} de {$res[0]['heure_debut']} à {$res[0]['heure_fin']} ({$res[0]['matiere']} — {$res[0]['classe']})"
            ];
        }
    }

    echo json_encode(['conflits' => $conflits, 'ok' => empty($conflits)]);
    exit;
}

// POST - Créer un emploi du temps
if ($method === 'POST' && !$action) {
    $user = verifyToken();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $stmtET = $db->prepare('SELECT id FROM emploi_temps WHERE id_classe = ? ORDER BY id DESC LIMIT 1');
    $stmtET->execute([$data['id_classe']]);
    $existing = $stmtET->fetch();

    if ($existing) {
        $id_emploi = $existing['id'];
    } else {
        $stmt = $db->prepare('INSERT INTO emploi_temps (id_classe, semaine_debut, statut_publication, cree_par) VALUES (?, ?, "publie", ?)');
        $stmt->execute([$data['id_classe'], $data['semaine_debut'], $user['id']]);
        $id_emploi = $db->lastInsertId();
    }

    $conflits_detectes = [];
    $creneaux_crees    = 0;

    if (!empty($data['creneaux'])) {
        foreach ($data['creneaux'] as $creneau) {
            $stmtC = $db->prepare('SELECT c.id FROM creneaux c
                WHERE c.id_enseignant = ? AND c.jour = ?
                AND c.heure_debut < ? AND c.heure_fin > ?');
            $stmtC->execute([$creneau['id_enseignant'], $creneau['jour'], $creneau['heure_fin'], $creneau['heure_debut']]);
            if ($stmtC->fetch()) {
                $conflits_detectes[] = "Conflit enseignant : {$creneau['jour']} {$creneau['heure_debut']}-{$creneau['heure_fin']}";
                continue;
            }

            $stmtS = $db->prepare('SELECT c.id FROM creneaux c
                WHERE c.id_salle = ? AND c.jour = ?
                AND c.heure_debut < ? AND c.heure_fin > ?');
            $stmtS->execute([$creneau['id_salle'], $creneau['jour'], $creneau['heure_fin'], $creneau['heure_debut']]);
            if ($stmtS->fetch()) {
                $conflits_detectes[] = "Conflit salle : {$creneau['jour']} {$creneau['heure_debut']}-{$creneau['heure_fin']}";
                continue;
            }

            $stmt2 = $db->prepare('INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $stmt2->execute([
                $id_emploi,
                $creneau['id_matiere'],
                $creneau['id_enseignant'],
                $creneau['id_salle'],
                $creneau['jour'],
                $creneau['heure_debut'],
                $creneau['heure_fin'],
            ]);
            $creneaux_crees++;
        }
    }

    $response = ['message' => 'Emploi du temps mis à jour', 'id' => $id_emploi, 'creneaux_crees' => $creneaux_crees];
    if (!empty($conflits_detectes)) {
        $response['conflits'] = $conflits_detectes;
        $response['warning']  = count($conflits_detectes) . ' créneau(x) ignoré(s) pour conflit';
    }

    http_response_code(201);
    echo json_encode($response);
    exit;
}

// POST - Dupliquer vers semaine suivante
if ($method === 'POST' && $action === 'dupliquer') {
    $user = verifyToken();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $id_source        = $data['id_emploi_temps'] ?? null;
    $nouvelle_semaine = $data['semaine_debut']    ?? null;
    $id_classe        = $data['id_classe']        ?? null;

    if (!$id_source || !$nouvelle_semaine || !$id_classe) {
        http_response_code(400);
        echo json_encode(['error' => 'id_emploi_temps, semaine_debut et id_classe sont requis']);
        exit;
    }

    $stmtCheck = $db->prepare('SELECT id FROM emploi_temps WHERE id_classe = ? AND semaine_debut = ?');
    $stmtCheck->execute([$id_classe, $nouvelle_semaine]);
    $existing = $stmtCheck->fetch();

    if ($existing) {
        $id_nouvel_et = $existing['id'];
    } else {
        $stmtNew = $db->prepare('INSERT INTO emploi_temps (id_classe, semaine_debut, statut_publication, cree_par) VALUES (?, ?, "publie", ?)');
        $stmtNew->execute([$id_classe, $nouvelle_semaine, $user['id']]);
        $id_nouvel_et = $db->lastInsertId();
    }

    $stmtCreneaux = $db->prepare('SELECT * FROM creneaux WHERE id_emploi_temps = ?');
    $stmtCreneaux->execute([$id_source]);
    $creneaux = $stmtCreneaux->fetchAll();

    $nb_dupliques = 0;
    $nb_conflits  = 0;

    foreach ($creneaux as $c) {
        $stmtConf = $db->prepare('SELECT id FROM creneaux WHERE id_enseignant = ? AND jour = ? AND heure_debut < ? AND heure_fin > ? AND id_emploi_temps = ?');
        $stmtConf->execute([$c['id_enseignant'], $c['jour'], $c['heure_fin'], $c['heure_debut'], $id_nouvel_et]);
        if ($stmtConf->fetch()) { $nb_conflits++; continue; }

        $stmtIns = $db->prepare('INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmtIns->execute([$id_nouvel_et, $c['id_matiere'], $c['id_enseignant'], $c['id_salle'], $c['jour'], $c['heure_debut'], $c['heure_fin']]);
        $nb_dupliques++;
    }

    echo json_encode([
        'message'      => 'Duplication terminée',
        'id'           => $id_nouvel_et,
        'nb_dupliques' => $nb_dupliques,
        'nb_conflits'  => $nb_conflits,
    ]);
    exit;
}

// PUT - Publier un emploi du temps
if ($method === 'PUT' && $id) {
    $user = verifyToken();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }
    $db = getDB();
    $db->prepare('UPDATE emploi_temps SET statut_publication = "publie" WHERE id = ?')->execute([$id]);
    echo json_encode(['message' => 'Emploi du temps publié']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);