<?php
require_once '../middleware/auth.php';
require_once '../models/Pointage.php';

$pdo    = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts  = explode('/', trim($uri, '/'));

$id = $action = null;
foreach ($parts as $i => $p) {
    if (is_numeric($p)) { $id = (int)$p; $action = $parts[$i+1] ?? null; }
}

$model = new Pointage($pdo);
$user  = exigerRole(['enseignant','administrateur']);

// POST /api/pointages/scan
if ($method === 'POST' && in_array('scan', $parts)) {
    $body = json_decode(file_get_contents('php://input'), true);
    if (empty($body['token_qr'])) repondreErreur(400, 'token_qr requis.');
    repondreJSON(201, $model->scanner($body['token_qr'], $_SERVER['REMOTE_ADDR']));
}

// GET /api/pointages  (historique)
if ($method === 'GET' && !$id) {
    $stmt = $pdo->prepare(
        'SELECT p.*, cr.heure_debut, cr.heure_fin,
                m.libelle AS matiere, cl.libelle AS classe,
                e.nom, e.prenom
         FROM pointages p
         JOIN creneaux     cr ON cr.id = p.id_creneau
         JOIN matieres     m  ON m.id  = cr.id_matiere
         JOIN enseignants  e  ON e.id  = cr.id_enseignant
         JOIN emploi_temps et ON et.id = cr.id_emploi_temps
         JOIN classes      cl ON cl.id = et.id_classe
         WHERE 1=1
         ORDER BY p.heure_pointage_reelle DESC
         LIMIT 100'
    );
    $stmt->execute();
    repondreJSON(200, $stmt->fetchAll());
}

repondreErreur(404, 'Route pointages inconnue.');