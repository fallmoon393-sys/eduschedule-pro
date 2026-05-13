-- ============================================
-- EduSchedule Pro - Script SQL Complet
-- Base de données MySQL
-- ============================================

CREATE DATABASE IF NOT EXISTS eduschedule_pro
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE eduschedule_pro;

-- ============================================
-- TABLE : classes
-- ============================================
CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    libelle VARCHAR(100) NOT NULL,
    niveau VARCHAR(50) NOT NULL,
    annee_academique VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE : matieres
-- ============================================
CREATE TABLE matieres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    libelle VARCHAR(100) NOT NULL,
    volume_horaire_total INT NOT NULL DEFAULT 0,
    coefficient FLOAT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE : enseignants
-- ============================================
CREATE TABLE enseignants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matricule VARCHAR(30) NOT NULL UNIQUE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    specialite VARCHAR(100),
    statut ENUM('vacataire', 'permanent') NOT NULL DEFAULT 'vacataire',
    taux_horaire DECIMAL(10,2) NOT NULL DEFAULT 0,
    id_utilisateur INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE : salles
-- ============================================
CREATE TABLE salles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    capacite INT NOT NULL DEFAULT 30,
    equipements TEXT,
    batiment VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE : utilisateurs
-- ============================================
CREATE TABLE utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'enseignant', 'delegue', 'surveillant', 'comptable', 'etudiant') NOT NULL,
    id_lien INT DEFAULT NULL,
    actif TINYINT(1) DEFAULT 1,
    token_reset VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE : emploi_temps
-- ============================================
CREATE TABLE emploi_temps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_classe INT NOT NULL,
    semaine_debut DATE NOT NULL,
    statut_publication ENUM('brouillon', 'publie') DEFAULT 'brouillon',
    cree_par INT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_classe) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (cree_par) REFERENCES utilisateurs(id)
);

-- ============================================
-- TABLE : creneaux
-- ============================================
CREATE TABLE creneaux (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_emploi_temps INT NOT NULL,
    id_matiere INT NOT NULL,
    id_enseignant INT NOT NULL,
    id_salle INT NOT NULL,
    jour ENUM('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi') NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    qr_token VARCHAR(255) DEFAULT NULL,
    qr_expire DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_emploi_temps) REFERENCES emploi_temps(id) ON DELETE CASCADE,
    FOREIGN KEY (id_matiere) REFERENCES matieres(id),
    FOREIGN KEY (id_enseignant) REFERENCES enseignants(id),
    FOREIGN KEY (id_salle) REFERENCES salles(id)
);

-- ============================================
-- TABLE : pointages  (CORRIGÉ : ajout id_enseignant)
-- ============================================
CREATE TABLE pointages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_creneau INT NOT NULL,
    id_enseignant INT NOT NULL,
    heure_pointage_reelle DATETIME NOT NULL,
    ip_source VARCHAR(50),
    token_utilise VARCHAR(255),
    statut ENUM('valide', 'retard', 'invalide') DEFAULT 'valide',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_creneau) REFERENCES creneaux(id) ON DELETE CASCADE,
    FOREIGN KEY (id_enseignant) REFERENCES enseignants(id)
);

-- ============================================
-- TABLE : cahiers_texte  (CORRIGÉ : ajout signe_enseignant + colonnes manquantes)
-- ============================================
CREATE TABLE cahiers_texte (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_creneau INT NOT NULL,
    id_delegue INT NOT NULL,
    titre_cours VARCHAR(200),
    contenu_json TEXT,
    niveau_avancement VARCHAR(100) DEFAULT NULL,
    observations TEXT DEFAULT NULL,
    heure_fin_reelle TIME DEFAULT NULL,
    statut ENUM('brouillon', 'signe_delegue', 'signe_enseignant', 'cloture') DEFAULT 'brouillon',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_creneau) REFERENCES creneaux(id) ON DELETE CASCADE,
    FOREIGN KEY (id_delegue) REFERENCES utilisateurs(id)
);

-- ============================================
-- TABLE : signatures
-- ============================================
CREATE TABLE signatures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_cahier INT NOT NULL,
    type_signataire ENUM('delegue', 'enseignant') NOT NULL,
    id_utilisateur INT NOT NULL,
    signature_base64 LONGTEXT NOT NULL,
    horodatage DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cahier) REFERENCES cahiers_texte(id) ON DELETE CASCADE,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id)
);

-- ============================================
-- TABLE : travaux_demandes
-- ============================================
CREATE TABLE travaux_demandes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_cahier INT NOT NULL,
    description TEXT NOT NULL,
    date_limite DATE DEFAULT NULL,
    type ENUM('devoir', 'exercice', 'projet', 'autre') DEFAULT 'devoir',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cahier) REFERENCES cahiers_texte(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE : vacations
-- ============================================
CREATE TABLE vacations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_enseignant INT NOT NULL,
    mois INT NOT NULL,
    annee INT NOT NULL,
    montant_brut DECIMAL(10,2) DEFAULT 0,
    montant_net DECIMAL(10,2) DEFAULT 0,
    statut ENUM('generee', 'signee_enseignant', 'validee_surveillant', 'approuvee_comptable') DEFAULT 'generee',
    date_generation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_enseignant) REFERENCES enseignants(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE : vacation_lignes  (CORRIGÉ : ajout id_cahier)
-- ============================================
CREATE TABLE vacation_lignes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_vacation INT NOT NULL,
    id_creneau INT NOT NULL,
    id_cahier INT NOT NULL,
    duree_heures DECIMAL(5,2) NOT NULL,
    taux DECIMAL(10,2) NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_vacation) REFERENCES vacations(id) ON DELETE CASCADE,
    FOREIGN KEY (id_creneau) REFERENCES creneaux(id),
    FOREIGN KEY (id_cahier) REFERENCES cahiers_texte(id)
);

-- ============================================
-- TABLE : validations
-- ============================================
CREATE TABLE validations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_vacation INT NOT NULL,
    id_validateur INT NOT NULL,
    role_validateur ENUM('enseignant', 'surveillant', 'comptable') NOT NULL,
    visa_base64 LONGTEXT DEFAULT NULL,
    date_validation DATETIME DEFAULT CURRENT_TIMESTAMP,
    commentaire TEXT DEFAULT NULL,
    FOREIGN KEY (id_vacation) REFERENCES vacations(id) ON DELETE CASCADE,
    FOREIGN KEY (id_validateur) REFERENCES utilisateurs(id)
);

-- ============================================
-- TABLE : scan_logs
-- ============================================
CREATE TABLE scan_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_creneau INT DEFAULT NULL,
    action VARCHAR(50) NOT NULL,
    ip_source VARCHAR(50),
    details TEXT,
    statut_scan VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_creneau) REFERENCES creneaux(id) ON DELETE SET NULL
);

-- ============================================
-- TABLE : logs_activite
-- ============================================
CREATE TABLE logs_activite (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    details_json TEXT,
    ip VARCHAR(50),
    date_heure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- ============================================
-- DONNÉES DE DÉMONSTRATION
-- ============================================

INSERT INTO classes (code, libelle, niveau, annee_academique) VALUES
('RST1', 'Réseaux et Systèmes - Année 1', 'Licence 1', '2025-2026'),
('RST2', 'Réseaux et Systèmes - Année 2', 'Licence 2', '2025-2026'),
('RST3', 'Réseaux et Systèmes - Année 3', 'Licence 3', '2025-2026');

INSERT INTO matieres (code, libelle, volume_horaire_total, coefficient) VALUES
('INFO101', 'Développement Web', 60, 3),
('INFO102', 'Base de Données', 45, 2),
('INFO103', 'Réseaux Informatiques', 45, 3),
('INFO104', 'Programmation Orientée Objet', 60, 3),
('INFO105', 'Systèmes d\'exploitation', 30, 2);

INSERT INTO salles (code, capacite, equipements, batiment) VALUES
('A101', 40, 'Projecteur, Tableau blanc', 'Bâtiment A'),
('A102', 35, 'Projecteur', 'Bâtiment A'),
('B201', 50, 'Projecteur, Climatisation', 'Bâtiment B'),
('LABO1', 30, 'Ordinateurs, Projecteur', 'Laboratoire');

-- Utilisateurs (mot de passe : "password123")
INSERT INTO utilisateurs (email, mot_de_passe_hash, role, id_lien) VALUES
('admin@isge.edu',              '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',       NULL),
('cedric.bere@isge.edu',        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'enseignant',  1),
('moussa.ouedraogo@isge.edu',   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'enseignant',  2),
('delegue.rst1@isge.edu',       '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'delegue',     NULL),
('surveillant@isge.edu',        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'surveillant', NULL),
('comptable@isge.edu',          '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'comptable',   NULL);

INSERT INTO enseignants (matricule, nom, prenom, email, specialite, statut, taux_horaire, id_utilisateur) VALUES
('ENS001', 'BERE',       'Cédric',  'cedric.bere@isge.edu',      'Développement Web', 'permanent', 15000, 2),
('ENS002', 'OUEDRAOGO',  'Moussa',  'moussa.ouedraogo@isge.edu', 'Base de Données',   'vacataire', 12000, 3),
('ENS003', 'KABORE',     'Aïcha',   'aicha.kabore@isge.edu',     'Réseaux',           'vacataire', 12000, NULL),
('ENS004', 'TRAORE',     'Ibrahim', 'ibrahim.traore@isge.edu',   'Programmation',     'permanent', 15000, NULL),
('ENS005', 'ZONGO',      'Fatima',  'fatima.zongo@isge.edu',     'Systèmes',          'vacataire', 10000, NULL);