-- ============================================================
--  EduSchedule Pro — Données de démonstration
-- ============================================================

-- Classes
INSERT INTO classes (code, libelle, niveau, annee_academique) VALUES
('L1-RST', 'Licence 1 RST', 'Licence 1', '2025-2026'),
('L2-RST', 'Licence 2 RST', 'Licence 2', '2025-2026'),
('L3-RST', 'Licence 3 RST', 'Licence 3', '2025-2026'),
('M1-RST', 'Master 1 RST',  'Master 1',  '2025-2026');

-- Matières
INSERT INTO matieres (code, libelle, volume_horaire_total, coefficient) VALUES
('RIP',  'Réseaux IP',               45, 3),
('PWB',  'Programmation Web',         30, 2),
('SYS',  'Systèmes d\'exploitation',  40, 3),
('BDD',  'Base de données',           35, 3),
('MAT',  'Mathématiques',             40, 2),
('TEL',  'Télécommunications',        30, 2),
('ELN',  'Électronique',              25, 2),
('PTU',  'Projet tutoré',             20, 1);

-- Salles
INSERT INTO salles (code, capacite, equipements, batiment) VALUES
('AMPHI-A', 150, 'Projecteur, micro, climatisation', 'Bâtiment A'),
('SALLE-12', 40, 'Tableau blanc, projecteur',        'Bâtiment B'),
('LABO-INFO', 30, 'PC par étudiant, internet',       'Bâtiment C');

-- Enseignants
INSERT INTO enseignants (matricule, nom, prenom, email, specialite, statut, taux_horaire) VALUES
('ENS-001', 'Béré',      'Wend-Panga Cédric', 'bere@isge.bf',      'Réseaux et Télécoms',   'permanent',  5000),
('ENS-002', 'Ouédraogo', 'Moussa',            'ouedraogo@isge.bf', 'Mathématiques',          'vacataire',  4000),
('ENS-003', 'Sawadogo',  'Aïcha',             'sawadogo@isge.bf',  'Systèmes embarqués',     'vacataire',  4500),
('ENS-004', 'Traoré',    'Issouf',            'traore@isge.bf',    'Base de données',        'vacataire',  4000),
('ENS-005', 'Compaoré',  'Fatimata',          'compaore@isge.bf',  'Programmation Web',      'vacataire',  4000);

-- Utilisateurs (mots de passe = "password123" hashé bcrypt)
INSERT INTO utilisateurs (email, mot_de_passe_hash, role, id_lien) VALUES
('admin@isge.bf',      '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'administrateur', NULL),
('bere@isge.bf',       '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'enseignant',     1),
('ouedraogo@isge.bf',  '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'enseignant',     2),
('sawadogo@isge.bf',   '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'enseignant',     3),
('delegue1@isge.bf',   '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'delegue',        NULL),
('surveillant@isge.bf','$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'surveillant',    NULL),
('comptable@isge.bf',  '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'comptable',      NULL);

-- Emploi du temps semaine du 07/04/2026 — L1 RST
INSERT INTO emploi_temps (id_classe, semaine_debut, statut_publication, cree_par) VALUES
(1, '2026-04-07', 'publie', 1);

-- Créneaux (id_emploi_temps=1)
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(1, 1, 1, 1, 0, '07:30:00', '09:00:00'), -- Lundi  : Réseaux IP      / Dr Béré      / Amphi A
(1, 2, 5, 3, 0, '09:00:00', '10:30:00'), -- Lundi  : Prog Web        / Compaoré     / Labo Info
(1, 3, 3, 2, 1, '07:30:00', '09:00:00'), -- Mardi  : Sys exploit     / Sawadogo     / Salle 12
(1, 5, 2, 1, 1, '10:30:00', '12:00:00'), -- Mardi  : Maths           / Ouédraogo    / Amphi A
(1, 6, 3, 2, 2, '13:00:00', '14:30:00'), -- Mercredi: Télécoms       / Sawadogo     / Salle 12
(1, 4, 4, 3, 3, '09:00:00', '10:30:00'), -- Jeudi  : BDD             / Traoré       / Labo Info
(1, 7, 3, 2, 4, '07:30:00', '09:00:00'), -- Vendredi: Électronique   / Sawadogo     / Salle 12
(1, 8, 1, 3, 5, '09:00:00', '11:00:00'); -- Samedi : Projet tutoré   / Dr Béré      / Labo Info

-- Jours fériés 2026 (Burkina Faso)
INSERT INTO jours_feries (date_ferie, libelle) VALUES
('2026-01-01', 'Jour de l\'an'),
('2026-01-03', 'Fête de la Révolution'),
('2026-03-08', 'Journée internationale de la femme'),
('2026-04-03', 'Vendredi Saint'),
('2026-05-01', 'Fête du Travail'),
('2026-08-05', 'Fête nationale'),
('2026-11-01', 'Toussaint'),
('2026-12-11', 'Proclamation de la République'),
('2026-12-25', 'Noël');