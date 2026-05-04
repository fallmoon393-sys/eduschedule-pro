<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$id = $uri[0] ?? null;
$action = $uri[1] ?? '';

// GET - Liste des vacations
if ($method === 'GET' && !$id) {
    $user = verifyToken();
    $db = getDB();

    $id_enseignant = $_GET['id_enseignant'] ?? null;
    $mois = $_GET['mois'] ?? null;
    $annee = $_GET['annee'] ?? null;

    $sql = 'SELECT v.*, e.nom, e.prenom 
            FROM vacations v
            JOIN enseignants e ON v.id_enseignant = e.id
            WHERE 1=1';
    $params = [];

    if ($id_enseignant) {
        $sql .= ' AND v.id_enseignant = ?';
        $params[] = $id_enseignant;
    }
    if ($mois) {
        $sql .= ' AND v.mois = ?';
        $params[] = $mois;
    }
    if ($annee) {
        $sql .= ' AND v.annee = ?';
        $params[] = $annee;
    }

    $sql .= ' ORDER BY v.annee DESC, v.mois DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    echo json_encode($stmt->fetchAll());
    exit;
}

// POST - Générer une fiche de vacation
if ($method === 'POST' && $action === 'generer') {
    $user = verifyToken();
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $id_enseignant = $data['id_enseignant'];
    $mois = $data['mois'];
    $annee = $data['annee'];

    // Récupérer les séances clôturées du mois
    $stmt = $db->prepare('SELECT ct.*, c.heure_debut, c.heure_fin, 
                          ct.heure_fin_reelle, e.taux_horaire
                          FROM cahiers_texte ct
                          JOIN creneaux c ON ct.id_creneau = c.id
                          JOIN enseignants e ON c.id_enseignant = e.id
                          WHERE c.id_enseignant = ?
                          AND MONTH(ct.date_creation) = ?
                          AND YEAR(ct.date_creation) = ?
                          AND ct.statut = "cloture"');
    $stmt->execute([$id_enseignant, $mois, $annee]);
    $seances = $stmt->fetchAll();

    $montant_brut = 0;
    $lignes = [];

    foreach ($seances as $seance) {
        $debut = strtotime($seance['heure_debut']);
        $fin = strtotime($seance['heure_fin_reelle'] ?? $seance['heure_fin']);
        $duree = ($fin - $debut) / 3600;
        $montant = $duree * $seance['taux_horaire'];
        $montant_brut += $montant;
        $lignes[] = [
            'id_creneau' => $seance['id_creneau'],
            'duree' => $duree,
            'taux' => $seance['taux_horaire'],
            'montant' => $montant
        ];
    }

    // Créer la fiche
    $stmt2 = $db->prepare('INSERT INTO vacations (id_enseignant, mois, annee, montant_brut, montant_net, statut) VALUES (?, ?, ?, ?, ?, "generee")');
    $stmt2->execute([$id_enseignant, $mois, $annee, $montant_brut, $montant_brut]);
    $id_vacation = $db->lastInsertId();

    // Créer les lignes
    foreach ($lignes as $ligne) {
        $stmt3 = $db->prepare('INSERT INTO vacation_lignes (id_vacation, id_creneau, duree_heures, taux, montant) VALUES (?, ?, ?, ?, ?)');
        $stmt3->execute([$id_vacation, $ligne['id_creneau'], $ligne['duree'], $ligne['taux'], $ligne['montant']]);
    }

    http_response_code(201);
    echo json_encode(['message' => 'Fiche générée', 'id' => $id_vacation, 'montant_brut' => $montant_brut]);
    exit;
}

// POST - Valider une vacation (surveillant)
if ($method === 'POST' && $id && $action === 'valider') {
    $user = verifyToken();
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $stmt = $db->prepare('UPDATE vacations SET statut = "validee_surveillant" WHERE id = ?');
    $stmt->execute([$id]);

    $stmt2 = $db->prepare('INSERT INTO validations (id_vacation, id_validateur, role_validateur, visa_base64, commentaire) VALUES (?, ?, "surveillant", ?, ?)');
    $stmt2->execute([$id, $user['id'], $data['visa_base64'] ?? null, $data['commentaire'] ?? null]);

    echo json_encode(['message' => 'Vacation validée par le surveillant']);
    exit;
}

// POST - Approuver une vacation (comptable)
if ($method === 'POST' && $id && $action === 'approuver') {
    $user = verifyToken();
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $stmt = $db->prepare('UPDATE vacations SET statut = "approuvee_comptable" WHERE id = ?');
    $stmt->execute([$id]);

    $stmt2 = $db->prepare('INSERT INTO validations (id_vacation, id_validateur, role_validateur, commentaire) VALUES (?, ?, "comptable", ?)');
    $stmt2->execute([$id, $user['id'], $data['commentaire'] ?? null]);

    echo json_encode(['message' => 'Vacation approuvée par le comptable']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);