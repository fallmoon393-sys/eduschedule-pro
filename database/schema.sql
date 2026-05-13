
--  EduSchedule Pro — Schéma base de données MySQL 


SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- 1. RÉFÉRENTIEL
-- ------------------------------------------------------------

CREATE TABLE classes (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code             VARCHAR(20)  NOT NULL UNIQUE,
    libelle          VARCHAR(100) NOT NULL,
    niveau           VARCHAR(50)  NOT NULL,
    annee_academique VARCHAR(9)   NOT NULL DEFAULT '2025-2026',
    created_at       DATETIME     NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE matieres (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code                VARCHAR(20)    NOT NULL UNIQUE,
    libelle             VARCHAR(150)   NOT NULL,
    volume_horaire_total DECIMAL(6,2)  NOT NULL DEFAULT 0,
    coefficient         TINYINT        NOT NULL DEFAULT 1,
    created_at          DATETIME       NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE enseignants (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    matricule   VARCHAR(30)    NOT NULL UNIQUE,
    nom         VARCHAR(100)   NOT NULL,
    prenom      VARCHAR(100)   NOT NULL,
    email       VARCHAR(191)   NOT NULL UNIQUE,
    specialite  VARCHAR(150),
    statut      ENUM('permanent','vacataire') NOT NULL DEFAULT 'vacataire',
    taux_horaire DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at  DATETIME       NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE salles (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(30)  NOT NULL UNIQUE,
    capacite    SMALLINT     NOT NULL DEFAULT 30,
    equipements TEXT,
    batiment    VARCHAR(100),
    created_at  DATETIME     NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 2. UTILISATEURS
-- ------------------------------------------------------------

CREATE TABLE utilisateurs (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email            VARCHAR(191) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role             ENUM('administrateur','enseignant','delegue',
                         'surveillant','comptable','etudiant') NOT NULL,
    id_lien          INT UNSIGNED DEFAULT NULL, -- FK vers enseignants ou autre
    actif            TINYINT(1)   NOT NULL DEFAULT 1,
    token_reset      VARCHAR(100) DEFAULT NULL,
    reset_expire     DATETIME     DEFAULT NULL,
    created_at       DATETIME     NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 3. PLANNING
-- ------------------------------------------------------------

CREATE TABLE emploi_temps (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_classe           INT UNSIGNED NOT NULL,
    semaine_debut       DATE         NOT NULL,
    statut_publication  ENUM('brouillon','publie') NOT NULL DEFAULT 'brouillon',
    cree_par            INT UNSIGNED NOT NULL,
    date_creation       DATETIME     NOT NULL DEFAULT NOW(),
    FOREIGN KEY (id_classe) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (cree_par)  REFERENCES utilisateurs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE creneaux (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_emploi_temps  INT UNSIGNED NOT NULL,
    id_matiere       INT UNSIGNED NOT NULL,
    id_enseignant    INT UNSIGNED NOT NULL,
    id_salle         INT UNSIGNED NOT NULL,
    jour             TINYINT      NOT NULL COMMENT '0=lundi … 5=samedi',
    heure_debut      TIME         NOT NULL,
    heure_fin        TIME         NOT NULL,
    qr_token         VARCHAR(255) DEFAULT NULL,
    qr_expire        DATETIME     DEFAULT NULL,
    token_utilise    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at       DATETIME     NOT NULL DEFAULT NOW(),
    FOREIGN KEY (id_emploi_temps) REFERENCES emploi_temps(id) ON DELETE CASCADE,
    FOREIGN KEY (id_matiere)      REFERENCES matieres(id),
    FOREIGN KEY (id_enseignant)   REFERENCES enseignants(id),
    FOREIGN KEY (id_salle)        REFERENCES salles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 4. POINTAGES
-- ------------------------------------------------------------

CREATE TABLE pointages (
    id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_creneau            INT UNSIGNED NOT NULL,
    heure_pointage_reelle DATETIME     NOT NULL,
    ip_source             VARCHAR(45)  DEFAULT NULL,
    token_utilise         VARCHAR(255) DEFAULT NULL,
    statut                ENUM('en_cours','retard','absent') NOT NULL DEFAULT 'en_cours',
    created_at            DATETIME     NOT NULL DEFAULT NOW(),
    FOREIGN KEY (id_creneau) REFERENCES creneaux(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 5. CAHIER DE TEXTE
-- ------------------------------------------------------------

CREATE TABLE cahiers_texte (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_creneau      INT UNSIGNED NOT NULL UNIQUE,
    id_delegue      INT UNSIGNED NOT NULL,
    titre_cours     VARCHAR(255) DEFAULT NULL,
    contenu_json    JSON         DEFAULT NULL,
    heure_fin_reelle TIME        DEFAULT NULL,
    statut          ENUM('brouillon','signe_delegue','cloture') NOT NULL DEFAULT 'brouillon',
    date_creation   DATETIME     NOT NULL DEFAULT NOW(),
    FOREIGN KEY (id_creneau) REFERENCES creneaux(id) ON DELETE CASCADE,
    FOREIGN KEY (id_delegue) REFERENCES utilisateurs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE signatures (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_cahier        INT UNSIGNED NOT NULL,
    type_signataire  ENUM('delegue','enseignant') NOT NULL,
    id_utilisateur   INT UNSIGNED NOT NULL,
    signature_base64 LONGTEXT     NOT NULL,
    horodatage       DATETIME     NOT NULL DEFAULT NOW(),
    FOREIGN KEY (id_cahier)      REFERENCES cahiers_texte(id) ON DELETE CASCADE,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE travaux_demandes (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_cahier   INT UNSIGNED NOT NULL,
    description TEXT         NOT NULL,
    date_limite DATE         DEFAULT NULL,
    type        ENUM('devoir','exercice','projet','autre') NOT NULL DEFAULT 'devoir',
    FOREIGN KEY (id_cahier) REFERENCES cahiers_texte(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 6. VACATIONS
-- ------------------------------------------------------------

CREATE TABLE vacations (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_enseignant    INT UNSIGNED NOT NULL,
    mois             TINYINT      NOT NULL,
    annee            SMALLINT     NOT NULL,
    montant_brut     DECIMAL(12,2) NOT NULL DEFAULT 0,
    retenues         DECIMAL(12,2) NOT NULL DEFAULT 0,
    montant_net      DECIMAL(12,2) NOT NULL DEFAULT 0,
    statut           ENUM('generee','signee_enseignant','validee_surveillant',
                          'approuvee_comptable') NOT NULL DEFAULT 'generee',
    date_generation  DATETIME     NOT NULL DEFAULT NOW(),
    FOREIGN KEY (id_enseignant) REFERENCES enseignants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vacation_lignes (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_vacation   INT UNSIGNED   NOT NULL,
    id_creneau    INT UNSIGNED   NOT NULL,
    duree_heures  DECIMAL(5,2)   NOT NULL,
    taux          DECIMAL(10,2)  NOT NULL,
    montant       DECIMAL(12,2)  NOT NULL,
    FOREIGN KEY (id_vacation) REFERENCES vacations(id) ON DELETE CASCADE,
    FOREIGN KEY (id_creneau)  REFERENCES creneaux(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE validations (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_vacation     INT UNSIGNED NOT NULL,
    id_validateur   INT UNSIGNED NOT NULL,
    role_validateur ENUM('enseignant','surveillant','comptable') NOT NULL,
    visa_base64     LONGTEXT     DEFAULT NULL,
    date_validation DATETIME     NOT NULL DEFAULT NOW(),
    commentaire     TEXT         DEFAULT NULL,
    FOREIGN KEY (id_vacation)   REFERENCES vacations(id) ON DELETE CASCADE,
    FOREIGN KEY (id_validateur) REFERENCES utilisateurs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 7. JOURS FÉRIÉS & ALERTES
-- ------------------------------------------------------------

CREATE TABLE jours_feries (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    date_ferie  DATE         NOT NULL UNIQUE,
    libelle     VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE alertes (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type        ENUM('retard','absent','cahier_manquant','conflit') NOT NULL,
    id_creneau  INT UNSIGNED DEFAULT NULL,
    message     TEXT         NOT NULL,
    lu          TINYINT(1)   NOT NULL DEFAULT 0,
    date_heure  DATETIME     NOT NULL DEFAULT NOW(),
    FOREIGN KEY (id_creneau) REFERENCES creneaux(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 8. LOGS
-- ------------------------------------------------------------

CREATE TABLE logs_activite (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT UNSIGNED DEFAULT NULL,
    action       VARCHAR(100) NOT NULL,
    details_json JSON         DEFAULT NULL,
    ip           VARCHAR(45)  DEFAULT NULL,
    date_heure   DATETIME     NOT NULL DEFAULT NOW(),
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;