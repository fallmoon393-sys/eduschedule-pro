<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$id = $uri[0] ?? ($_GET['id'] ?? null);
$action = $uri[1] ?? ($_GET['action'] ?? '');

// GET - Liste des vacations avec détail des séances
if ($method === 'GET' && !$id) {
    $user = verifyToken();
    $db = getDB();

    $id_enseignant = $_GET['id_enseignant'] ?? null;
    $mois = $_GET['mois'] ?? null;
    $annee = $_GET['annee'] ?? null;

    $sql = 'SELECT v.*, e.nom, e.prenom, e.taux_horaire,
                   (SELECT COUNT(*) FROM vacation_lignes vl WHERE vl.id_vacation = v.id) as nb_seances
            FROM vacations v
            JOIN enseignants e ON v.id_enseignant = e.id
            WHERE 1=1';
    $params = [];

    if ($id_enseignant) { $sql .= ' AND v.id_enseignant = ?'; $params[] = $id_enseignant; }
    if ($mois)          { $sql .= ' AND v.mois = ?';          $params[] = $mois; }
    if ($annee)         { $sql .= ' AND v.annee = ?';         $params[] = $annee; }

    // Enseignant voit uniquement ses fiches
    if ($user['role'] === 'enseignant') {
        $stmtE = $db->prepare('SELECT id FROM enseignants WHERE id_utilisateur = ?');
        $stmtE->execute([$user['id']]);
        $ens = $stmtE->fetch();
        if ($ens) { $sql .= ' AND v.id_enseignant = ?'; $params[] = $ens['id']; }
    }

    $sql .= ' ORDER BY v.annee DESC, v.mois DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());
    exit;
}

// GET - Détail d'une vacation avec ses lignes
if ($method === 'GET' && $id && !$action) {
    $user = verifyToken();
    $db = getDB();

    $stmt = $db->prepare('SELECT v.*, e.nom, e.prenom, e.taux_horaire
                          FROM vacations v
                          JOIN enseignants e ON v.id_enseignant = e.id
                          WHERE v.id = ?');
    $stmt->execute([$id]);
    $vacation = $stmt->fetch();

    if (!$vacation) {
        http_response_code(404);
        echo json_encode(['error' => 'Vacation non trouvée']);
        exit;
    }

    // Récupérer les lignes de séances
    $stmtL = $db->prepare('SELECT vl.*, ct.titre_cours, ct.date_creation,
                            m.libelle as matiere, cl.libelle as classe
                            FROM vacation_lignes vl
                            JOIN cahiers_texte ct ON vl.id_creneau = ct.id_creneau
                            JOIN creneaux c ON vl.id_creneau = c.id
                            JOIN matieres m ON c.id_matiere = m.id
                            JOIN emploi_temps et ON c.id_emploi_temps = et.id
                            JOIN classes cl ON et.id_classe = cl.id
                            WHERE vl.id_vacation = ?
                            ORDER BY ct.date_creation');
    $stmtL->execute([$id]);
    $vacation['lignes'] = $stmtL->fetchAll();

    echo json_encode($vacation);
    exit;
}

// POST - Générer une fiche de vacation
if ($method === 'POST' && $action === 'generer') {
    $user = verifyToken();
    if ($user['role'] !== 'admin' && $user['role'] !== 'comptable') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé']);
        exit;
    }
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $id_enseignant = $data['id_enseignant'] ?? null;
    $mois          = $data['mois'] ?? null;
    $annee         = $data['annee'] ?? null;

    if (!$id_enseignant || !$mois || !$annee) {
        http_response_code(400);
        echo json_encode(['error' => 'id_enseignant, mois et annee sont requis']);
        exit;
    }

    // Vérifier doublon
    $stmtCheck = $db->prepare('SELECT id FROM vacations WHERE id_enseignant = ? AND mois = ? AND annee = ?');
    $stmtCheck->execute([$id_enseignant, $mois, $annee]);
    if ($stmtCheck->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Une fiche existe déjà pour cet enseignant ce mois-ci']);
        exit;
    }

    // Récupérer les séances clôturées du mois
    $stmt = $db->prepare('SELECT ct.id as id_cahier, ct.heure_fin_reelle, ct.date_creation,
                           c.id as id_creneau, c.heure_debut, c.heure_fin,
                           m.libelle as matiere, cl.libelle as classe,
                           e.taux_horaire
                           FROM cahiers_texte ct
                           JOIN creneaux c ON ct.id_creneau = c.id
                           JOIN matieres m ON c.id_matiere = m.id
                           JOIN enseignants e ON c.id_enseignant = e.id
                           JOIN emploi_temps et ON c.id_emploi_temps = et.id
                           JOIN classes cl ON et.id_classe = cl.id
                           WHERE c.id_enseignant = ?
                           AND MONTH(ct.date_creation) = ?
                           AND YEAR(ct.date_creation) = ?
                           AND ct.statut = "cloture"');
    $stmt->execute([$id_enseignant, $mois, $annee]);
    $seances = $stmt->fetchAll();

    if (empty($seances)) {
        http_response_code(400);
        echo json_encode(['error' => 'Aucune séance clôturée trouvée pour ce mois. Les séances doivent être clôturées avant de générer la fiche.']);
        exit;
    }

    $montant_brut = 0;
    $lignes = [];

    foreach ($seances as $seance) {
        $heure_fin_effective = $seance['heure_fin_reelle'] ?? $seance['heure_fin'];
        $debut = strtotime('1970-01-01 ' . $seance['heure_debut']);
        $fin   = strtotime('1970-01-01 ' . $heure_fin_effective);
        $duree = max(0, ($fin - $debut) / 3600);
        $montant = round($duree * $seance['taux_horaire']);
        $montant_brut += $montant;
        $lignes[] = [
            'id_creneau' => $seance['id_creneau'],
            'duree'      => $duree,
            'taux'       => $seance['taux_horaire'],
            'montant'    => $montant,
            'matiere'    => $seance['matiere'],
            'classe'     => $seance['classe']
        ];
    }

    $db->beginTransaction();
    try {
        $stmt2 = $db->prepare('INSERT INTO vacations (id_enseignant, mois, annee, montant_brut, montant_net, statut) VALUES (?, ?, ?, ?, ?, "generee")');
        $stmt2->execute([$id_enseignant, $mois, $annee, $montant_brut, $montant_brut]);
        $id_vacation = $db->lastInsertId();

        foreach ($lignes as $ligne) {
            $stmt3 = $db->prepare('INSERT INTO vacation_lignes (id_vacation, id_creneau, duree_heures, taux, montant) VALUES (?, ?, ?, ?, ?)');
            $stmt3->execute([$id_vacation, $ligne['id_creneau'], $ligne['duree'], $ligne['taux'], $ligne['montant']]);
        }

        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Erreur lors de la génération : ' . $e->getMessage()]);
        exit;
    }

    http_response_code(201);
    echo json_encode([
        'message'      => 'Fiche générée avec succès',
        'id'           => $id_vacation,
        'nb_seances'   => count($lignes),
        'montant_brut' => $montant_brut
    ]);
    exit;
}

// POST - Valider une vacation (surveillant)
if ($method === 'POST' && $id && $action === 'valider') {
    $user = verifyToken();
    if ($user['role'] !== 'surveillant' && $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé : rôle surveillant requis']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $stmtCheck = $db->prepare('SELECT statut FROM vacations WHERE id = ?');
    $stmtCheck->execute([$id]);
    $vacation = $stmtCheck->fetch();

    if (!$vacation) { http_response_code(404); echo json_encode(['error' => 'Vacation non trouvée']); exit; }
    if ($vacation['statut'] !== 'generee') {
        http_response_code(409);
        echo json_encode(['error' => 'La vacation doit être dans l\'état "generee" pour être validée']);
        exit;
    }

    $db->prepare('UPDATE vacations SET statut = "validee_surveillant" WHERE id = ?')->execute([$id]);
    $db->prepare('INSERT INTO validations (id_vacation, id_validateur, role_validateur, visa_base64, commentaire) VALUES (?, ?, "surveillant", ?, ?)')
       ->execute([$id, $user['id'], $data['visa_base64'] ?? null, $data['commentaire'] ?? 'Validé par le surveillant']);

    echo json_encode(['message' => 'Vacation validée par le surveillant']);
    exit;
}

// POST - Approuver une vacation (comptable)
if ($method === 'POST' && $id && $action === 'approuver') {
    $user = verifyToken();
    if ($user['role'] !== 'comptable' && $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé : rôle comptable requis']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $stmtCheck = $db->prepare('SELECT statut, montant_brut FROM vacations WHERE id = ?');
    $stmtCheck->execute([$id]);
    $vacation = $stmtCheck->fetch();

    if (!$vacation) { http_response_code(404); echo json_encode(['error' => 'Vacation non trouvée']); exit; }
    if ($vacation['statut'] !== 'validee_surveillant') {
        http_response_code(409);
        echo json_encode(['error' => 'La vacation doit d\'abord être validée par le surveillant']);
        exit;
    }

    // Calcul retenues si applicable
    $retenues = $data['retenues'] ?? 0;
    $montant_net = $vacation['montant_brut'] - $retenues;

    $db->prepare('UPDATE vacations SET statut = "approuvee_comptable", montant_net = ? WHERE id = ?')
       ->execute([$montant_net, $id]);
    $db->prepare('INSERT INTO validations (id_vacation, id_validateur, role_validateur, commentaire) VALUES (?, ?, "comptable", ?)')
       ->execute([$id, $user['id'], $data['commentaire'] ?? 'Approuvé par le comptable']);

    echo json_encode(['message' => 'Vacation approuvée', 'montant_net' => $montant_net]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);