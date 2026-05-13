<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri    = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$id     = $uri[0] ?? ($_GET['id'] ?? null);
$action = $uri[1] ?? ($_GET['action'] ?? '');

// GET - Liste des cahiers
if ($method === 'GET' && !$id) {
    $user = verifyToken();
    $db = getDB();

    $id_classe     = $_GET['id_classe']     ?? null;
    $mois          = $_GET['mois']          ?? null;
    $id_enseignant = $_GET['id_enseignant'] ?? null;

    $sql = 'SELECT ct.*,
                   m.libelle as matiere,
                   e.nom as enseignant_nom, e.prenom as enseignant_prenom,
                   cl.libelle as classe,
                   c.heure_debut, c.heure_fin, c.jour,
                   p.heure_pointage_reelle,
                   (SELECT COUNT(*) FROM signatures s WHERE s.id_cahier = ct.id AND s.type_signataire = "delegue")    as signe_delegue,
                   (SELECT COUNT(*) FROM signatures s WHERE s.id_cahier = ct.id AND s.type_signataire = "enseignant") as signe_enseignant
            FROM cahiers_texte ct
            JOIN creneaux c ON ct.id_creneau = c.id
            JOIN matieres m ON c.id_matiere = m.id
            JOIN enseignants e ON c.id_enseignant = e.id
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            JOIN classes cl ON et.id_classe = cl.id
            LEFT JOIN pointages p ON p.id_creneau = c.id AND DATE(p.created_at) = DATE(ct.date_creation)
            WHERE 1=1';
    $params = [];

    if ($id_classe)     { $sql .= ' AND et.id_classe = ?';            $params[] = $id_classe; }
    if ($mois)          { $sql .= ' AND MONTH(ct.date_creation) = ?'; $params[] = $mois; }
    if ($id_enseignant) { $sql .= ' AND c.id_enseignant = ?';         $params[] = $id_enseignant; }

    if ($user['role'] === 'enseignant') {
        $stmtE = $db->prepare('SELECT id FROM enseignants WHERE id_utilisateur = ?');
        $stmtE->execute([$user['id']]);
        $ens = $stmtE->fetch();
        if ($ens) { $sql .= ' AND c.id_enseignant = ?'; $params[] = $ens['id']; }
    }

    $sql .= ' ORDER BY ct.date_creation DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());
    exit;
}

// GET - Détail d'un cahier avec signatures
if ($method === 'GET' && $id && !$action) {
    $user = verifyToken();
    $db = getDB();

    $stmt = $db->prepare('SELECT ct.*,
                           m.libelle as matiere,
                           e.nom as enseignant_nom, e.prenom as enseignant_prenom,
                           cl.libelle as classe,
                           c.heure_debut, c.heure_fin, c.jour
                          FROM cahiers_texte ct
                          JOIN creneaux c ON ct.id_creneau = c.id
                          JOIN matieres m ON c.id_matiere = m.id
                          JOIN enseignants e ON c.id_enseignant = e.id
                          JOIN emploi_temps et ON c.id_emploi_temps = et.id
                          JOIN classes cl ON et.id_classe = cl.id
                          WHERE ct.id = ?');
    $stmt->execute([$id]);
    $cahier = $stmt->fetch();

    if (!$cahier) {
        http_response_code(404);
        echo json_encode(['error' => 'Cahier non trouvé']);
        exit;
    }

    $stmtSig = $db->prepare('SELECT type_signataire, created_at FROM signatures WHERE id_cahier = ? ORDER BY horodatage');
    $stmtSig->execute([$id]);
    $cahier['signatures'] = $stmtSig->fetchAll();

    echo json_encode($cahier);
    exit;
}

// POST - Créer un cahier
if ($method === 'POST' && !$id) {
    $user = verifyToken();
    if ($user['role'] !== 'delegue' && $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Seul le délégué peut créer un cahier']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    if (empty($data['id_creneau']) || empty($data['titre_cours'])) {
        http_response_code(400);
        echo json_encode(['error' => 'id_creneau et titre_cours sont requis']);
        exit;
    }

    $stmtCheck = $db->prepare('SELECT id FROM cahiers_texte WHERE id_creneau = ? AND DATE(date_creation) = CURDATE()');
    $stmtCheck->execute([$data['id_creneau']]);
    if ($stmtCheck->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Un cahier existe déjà pour ce créneau aujourd\'hui']);
        exit;
    }

    $stmt = $db->prepare('INSERT INTO cahiers_texte (id_creneau, id_delegue, titre_cours, contenu_json, niveau_avancement, observations, statut) VALUES (?, ?, ?, ?, ?, ?, "brouillon")');
    $stmt->execute([
        $data['id_creneau'],
        $user['id'],
        $data['titre_cours'],
        json_encode(['points' => $data['points'] ?? '', 'travaux' => $data['travaux'] ?? '']),
        $data['niveau_avancement'] ?? null,
        $data['observations']      ?? null,
    ]);

    http_response_code(201);
    echo json_encode(['message' => 'Cahier créé', 'id' => $db->lastInsertId()]);
    exit;
}

// PUT - Modifier un cahier  (CORRIGÉ : vérification de propriété ajoutée)
if ($method === 'PUT' && $id && !$action) {
    $user = verifyToken();
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $stmtCheck = $db->prepare('SELECT statut, id_delegue FROM cahiers_texte WHERE id = ?');
    $stmtCheck->execute([$id]);
    $cahier = $stmtCheck->fetch();

    if (!$cahier) {
        http_response_code(404);
        echo json_encode(['error' => 'Cahier non trouvé']);
        exit;
    }

    // Seul le délégué propriétaire ou un admin peut modifier
    if ($user['role'] !== 'admin' && (int)$cahier['id_delegue'] !== (int)$user['id']) {
        http_response_code(403);
        echo json_encode(['error' => 'Vous n\'êtes pas autorisé à modifier ce cahier']);
        exit;
    }

    if ($cahier['statut'] === 'cloture') {
        http_response_code(403);
        echo json_encode(['error' => 'Cahier clôturé — modifications impossibles']);
        exit;
    }

    $stmt = $db->prepare('UPDATE cahiers_texte SET titre_cours=?, contenu_json=?, niveau_avancement=?, observations=? WHERE id=?');
    $stmt->execute([
        $data['titre_cours'],
        json_encode(['points' => $data['points'] ?? '', 'travaux' => $data['travaux'] ?? '']),
        $data['niveau_avancement'] ?? null,
        $data['observations']      ?? null,
        $id,
    ]);

    echo json_encode(['message' => 'Cahier mis à jour']);
    exit;
}

// POST - Signer un cahier
if ($method === 'POST' && $id && $action === 'signer') {
    $user = verifyToken();
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    if (empty($data['type']) || empty($data['signature_base64'])) {
        http_response_code(400);
        echo json_encode(['error' => 'type et signature_base64 sont requis']);
        exit;
    }

    $stmtCheck = $db->prepare('SELECT statut FROM cahiers_texte WHERE id = ?');
    $stmtCheck->execute([$id]);
    $cahier = $stmtCheck->fetch();
    if (!$cahier)                          { http_response_code(404); echo json_encode(['error' => 'Cahier non trouvé']);    exit; }
    if ($cahier['statut'] === 'cloture')   { http_response_code(403); echo json_encode(['error' => 'Cahier déjà clôturé']); exit; }

    if ($data['type'] === 'delegue'    && $user['role'] !== 'delegue'    && $user['role'] !== 'admin') {
        http_response_code(403); echo json_encode(['error' => 'Seul le délégué peut signer en tant que délégué']); exit;
    }
    if ($data['type'] === 'enseignant' && $user['role'] !== 'enseignant' && $user['role'] !== 'admin') {
        http_response_code(403); echo json_encode(['error' => 'Seul l\'enseignant peut signer en tant qu\'enseignant']); exit;
    }

    // Empêcher une double-signature du même type
    $stmtDbl = $db->prepare('SELECT id FROM signatures WHERE id_cahier = ? AND type_signataire = ?');
    $stmtDbl->execute([$id, $data['type']]);
    if ($stmtDbl->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Ce cahier a déjà été signé par ce rôle']);
        exit;
    }

    $stmt = $db->prepare('INSERT INTO signatures (id_cahier, type_signataire, id_utilisateur, signature_base64) VALUES (?, ?, ?, ?)');
    $stmt->execute([$id, $data['type'], $user['id'], $data['signature_base64']]);

    // Mise à jour statut  (CORRIGÉ : signe_enseignant maintenant dans l'ENUM)
    if ($data['type'] === 'delegue') {
        $db->prepare('UPDATE cahiers_texte SET statut = "signe_delegue"    WHERE id = ?')->execute([$id]);
    } elseif ($data['type'] === 'enseignant') {
        $db->prepare('UPDATE cahiers_texte SET statut = "signe_enseignant" WHERE id = ?')->execute([$id]);
    }

    echo json_encode(['message' => 'Signature ajoutée avec succès']);
    exit;
}

// POST - Clôturer une séance
if ($method === 'POST' && $id && $action === 'cloture') {
    $user = verifyToken();
    if ($user['role'] !== 'enseignant' && $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Seul l\'enseignant peut clôturer']);
        exit;
    }
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getDB();

    $stmtSig = $db->prepare('SELECT type_signataire FROM signatures WHERE id_cahier = ?');
    $stmtSig->execute([$id]);
    $sigs = array_column($stmtSig->fetchAll(), 'type_signataire');

    if (!in_array('delegue', $sigs)) {
        http_response_code(400);
        echo json_encode(['error' => 'Le délégué doit signer avant la clôture']);
        exit;
    }
    if (!in_array('enseignant', $sigs)) {
        http_response_code(400);
        echo json_encode(['error' => 'L\'enseignant doit signer avant de clôturer']);
        exit;
    }

    $heure_fin = $data['heure_fin'] ?? date('H:i:s');
    $db->prepare('UPDATE cahiers_texte SET heure_fin_reelle = ?, statut = "cloture" WHERE id = ?')->execute([$heure_fin, $id]);

    echo json_encode(['message' => 'Séance clôturée et fiche verrouillée']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);