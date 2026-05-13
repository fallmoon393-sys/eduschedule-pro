# EduSchedule Pro

Système de gestion des emplois du temps, de présence et des vacations pour établissements d'enseignement supérieur.

Développé dans le cadre du projet informatique ITRST — Année universitaire 2025-2026.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, Bootstrap 5, Chart.js, Axios |
| Backend | PHP 8 (API REST), PDO |
| Base de données | MySQL 8 |
| Auth | JWT (firebase/php-jwt) |
| PDF | jsPDF |
| Signatures | signature_pad (canvas HTML5) |
| QR Code | qrcode.react |

---

## Structure du projet

```
eduschedule-pro/
├── frontend/                  # Application React
│   ├── public/
│   └── src/
│       ├── context/
│       │   └── AuthContext.js         # Gestion session JWT
│       ├── pages/
│       │   ├── LoginPage.js
│       │   ├── DashboardAdmin.js
│       │   ├── DashboardEnseignant.js
│       │   ├── DashboardDelegue.js
│       │   ├── DashboardSurveillant.js
│       │   ├── DashboardComptable.js
│       │   ├── EmploiTempsPage.js
│       │   ├── QRCodePage.js
│       │   ├── CahierTextePage.js
│       │   └── VacationsPage.js
│       └── utils/
│           ├── api.js                 # Client Axios + intercepteurs JWT
│           └── exportPDF.js           # Export PDF emploi du temps, cahiers, vacations
├── backend/                   # API REST PHP
│   ├── api/
│   │   ├── auth.php           # Login / logout
│   │   ├── classes.php
│   │   ├── matieres.php
│   │   ├── enseignants.php
│   │   ├── salles.php
│   │   ├── emploi_temps.php   # Emplois du temps + conflits + duplication
│   │   ├── creneaux.php       # Créneaux + génération QR Code
│   │   ├── pointages.php      # Scan QR + logs
│   │   ├── cahiers.php        # Cahiers de texte + signatures
│   │   └── vacations.php      # Fiches de vacation + workflow validation
│   ├── config/
│   │   ├── database.php       # Connexion PDO
│   │   ├── cors.php           # Headers CORS
│   │   └── jwt.php            # Configuration JWT
│   └── middleware/
│       └── auth.php           # Vérification token JWT
└── database/
    └── eduschedule.sql        # Schéma complet + données de démo
```

---

## Installation

### Prérequis

- XAMPP (PHP 8.1+, MySQL 8, Apache) ou équivalent
- Node.js 18+
- Composer

### 1. Base de données

```sql
-- Dans phpMyAdmin ou MySQL CLI :
source eduschedule-pro/database/eduschedule.sql
```

### 2. Backend PHP

```bash
cd eduschedule-pro/backend
composer install
```

Copier et configurer les variables d'environnement :

```bash
cp ../.env.example .env
```

Définir dans les variables d'environnement Apache/PHP (ou `.htaccess`) :

```
SetEnv DB_HOST     localhost
SetEnv DB_NAME     eduschedule_pro
SetEnv DB_USER     root
SetEnv DB_PASS     
SetEnv JWT_SECRET  votre_secret_tres_long_et_aleatoire
SetEnv FRONTEND_URL http://localhost:3000
```

Placer le dossier `backend/` dans le répertoire web :

```
C:\xampp\htdocs\eduschedule-pro\backend\
```

### 3. Frontend React

```bash
cd eduschedule-pro/frontend
cp .env.example .env
npm install
npm start
```

Le frontend démarre sur `http://localhost:3000`.

---

## Comptes de démonstration

> Mot de passe pour tous les comptes : **`password123`**

| Email | Rôle |
|-------|------|
| admin@isge.edu | Administrateur |
| cedric.bere@isge.edu | Enseignant |
| moussa.ouedraogo@isge.edu | Enseignant |
| delegue.rst1@isge.edu | Délégué |
| surveillant@isge.edu | Surveillant |
| comptable@isge.edu | Comptable |

---

## Fonctionnalités par rôle

### Administrateur
- Gestion des classes, matières, enseignants, salles
- Création et modification des emplois du temps hebdomadaires
- Détection automatique des conflits (enseignant occupé, salle prise)
- Publication / dépublication des emplois du temps
- Duplication vers la semaine suivante
- Génération des QR Codes de séance (token unique, fenêtre ±15 min)
- Tableau de bord avec statistiques et alertes

### Enseignant
- Pointage de présence via QR Code (smartphone)
- Consultation de son planning hebdomadaire
- Signature numérique des cahiers de texte
- Clôture de séance (heure de fin réelle)
- Consultation et signature de ses fiches de vacation
- Historique complet des séances par mois

### Délégué
- Saisie du cahier de texte pendant la séance (titre, points abordés, niveau d'avancement, travaux)
- Signature numérique du cahier de texte
- Consultation de l'emploi du temps de sa classe

### Surveillant
- Scan des QR Codes pour enregistrement du pointage
- Consultation des pointages et logs de scan
- Validation des fiches de vacation (visa de contrôle)
- Consultation des cahiers de texte en lecture seule

### Comptable
- Génération des fiches de vacation mensuelles
- Approbation finale et calcul du montant net (retenues)
- Export PDF des fiches de paiement

---

## Processus clés

### Pointage QR Code
```
Admin génère QR Code
        ↓
QR affiché en salle (±15 min avant la séance)
        ↓
Surveillant scanne → pointage enregistré
        ↓
Token invalidé (usage unique)
        ↓
Retard > 30 min → alerte automatique
```

### Cahier de texte
```
Enseignant pointe (QR)
        ↓
Délégué saisit le contenu pendant la séance
        ↓
Délégué signe numériquement
        ↓
Enseignant confirme l'heure de fin + signe
        ↓
Fiche verrouillée (statut : Clôturé)
```

### Fiche de vacation
```
Génération automatique (séances clôturées du mois)
        ↓
Enseignant consulte et signe
        ↓
Surveillant vérifie et appose son visa
        ↓
Comptable approuve + calcule le net
        ↓
Export PDF → bon de paiement
```

---

## API — Endpoints principaux

### Authentification
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/auth.php/login` | Connexion, retourne JWT |
| POST | `/auth.php/logout` | Déconnexion |

### Emploi du temps
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/emploi_temps.php` | Liste (filtre : id_classe, semaine) |
| POST | `/emploi_temps.php` | Créer avec créneaux + détection conflits |
| POST | `/emploi_temps.php?action=dupliquer` | Dupliquer vers semaine suivante |
| PUT | `/emploi_temps.php/{id}` | Publier / dépublier |
| GET | `/emploi_temps.php?action=conflits` | Vérifier conflits avant création |

### Créneaux & QR
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/creneaux.php` | Liste (filtre : id_emploi_temps) |
| GET | `/creneaux.php/{id}/qr` | Générer un QR Code |
| PUT | `/creneaux.php/{id}` | Modifier un créneau |
| DELETE | `/creneaux.php/{id}` | Supprimer un créneau |

### Pointages
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/pointages.php/scan` | Scanner un QR Code |
| GET | `/pointages.php` | Liste des pointages |
| GET | `/pointages.php/logs` | Logs de toutes les tentatives |

### Cahiers de texte
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/cahiers.php` | Liste (filtre : id_classe, mois, id_enseignant) |
| GET | `/cahiers.php/{id}` | Détail + signatures |
| POST | `/cahiers.php` | Créer un cahier |
| PUT | `/cahiers.php/{id}` | Modifier (si non clôturé, propriétaire uniquement) |
| POST | `/cahiers.php/{id}/signer` | Signer (délégué ou enseignant) |
| POST | `/cahiers.php/{id}/cloture` | Clôturer la séance |

### Vacations
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/vacations.php` | Liste |
| GET | `/vacations.php/{id}` | Détail + lignes de séances |
| POST | `/vacations.php?action=generer` | Générer la fiche du mois |
| POST | `/vacations.php/{id}/signer` | Signature enseignant |
| POST | `/vacations.php/{id}/valider` | Visa surveillant |
| POST | `/vacations.php/{id}/approuver` | Approbation comptable |

---

## Sécurité

- Authentification JWT (expiration 24h)
- Toutes les routes protégées par `verifyToken()` sauf le login
- Vérification des rôles sur chaque action sensible
- QR Code à usage unique — token invalidé après scan
- Token QR expiré après la fenêtre horaire définie
- Log de toutes les tentatives de scan (réussies et échouées)
- Credentials base de données via variables d'environnement (jamais en dur)
- Vérification de propriété sur la modification des cahiers de texte
- CORS restreint aux origines autorisées

---

## Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DB_HOST` | Hôte MySQL | `localhost` |
| `DB_NAME` | Nom de la base | `eduschedule_pro` |
| `DB_USER` | Utilisateur MySQL | `root` |
| `DB_PASS` | Mot de passe MySQL | *(vide en local)* |
| `JWT_SECRET` | Clé secrète JWT | Chaîne aléatoire 64 caractères |
| `FRONTEND_URL` | URL du frontend (CORS) | `https://monsite.com` |
| `APP_ENV` | Environnement | `production` ou *(vide)* |

>  En production, `JWT_SECRET` est **obligatoire**. L'application refuse de démarrer sans cette variable si `APP_ENV=production`.

---

## Déploiement production

1. Définir toutes les variables d'environnement sur le serveur
2. Construire le frontend :
   ```bash
   npm run build
   ```
3. Déposer le dossier `build/` à la racine du domaine
4. Mettre à jour `REACT_APP_API_URL` dans `.env` avec l'URL de production
5. S'assurer que `FRONTEND_URL` dans le backend correspond à l'URL du frontend déployé

---

## Auteur
