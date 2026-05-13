# EduSchedule Pro

Système Intégré de Gestion de l'Emploi du Temps et de Suivi Pédagogique des Séances de Cours.

## Technologies utilisées

- **Frontend** : React 18, Bootstrap 5, Axios
- **Backend** : PHP 7.4, API REST, JWT
- **Base de données** : MySQL 8 (via WAMP)
- **Authentification** : JWT (firebase/php-jwt)
- **Signatures** : signature_pad (canvas HTML5)

---

## Prérequis

- WAMP (ou XAMPP) installé
- Node.js installé
- Navigateur web moderne

---

## Installation

### 1. Cloner le projet
Télécharger le projet et le placer dans :

C:\wamp64\www\eduschedule-pro

### 2. Base de données
- Démarrer WAMP
- Ouvrir phpMyAdmin : http://localhost/phpmyadmin
- Créer une base de données : `eduschedule_pro`
- Importer le fichier : `database/eduschedule.sql`

### 3. Backend PHP
Le backend est automatiquement disponible via WAMP à :

http://localhost/eduschedule-pro-corrige/backend/api/

### 4. Frontend React
```bash
cd frontend
npm install
npm start

L'application s'ouvre sur : http://localhost:3000

COMPTE DE TEST :

Email                      Mot de passe             Role 

admin@isge.edu             password123              Administrateur

cedric.bere@isge.edu       password123              Enseignant

delegue.rst1@isge.edu      password123               Delegue

surveillant@isge.edu       password123               Surveillant

comptable@isge.edu         password123               Comptable


Modules du projet

Module 1 — Emploi du temps
	•	Création des créneaux par l’admin
	•	Vue par classe et par semaine
	•	Génération automatique des QR Codes
Module 2 — Pointage QR Code
	•	Génération d’un QR Code unique par créneau
	•	Validation de la présence de l’enseignant
	•	Token valide ±15 minutes autour de l’heure du cours
Module 3 — Cahier de texte numérique
	•	Saisie du contenu pédagogique par le délégué
	•	Signature numérique du délégué et de l’enseignant
	•	Archivage des séances
Module 4 — Fiche de vacation
	•	Calcul automatique des heures réalisées
	•	Workflow de validation : Enseignant → Surveillant → Comptable
	•	Génération de la fiche mensuelle
Module 5 — Tableau de bord
	•	KPIs par rôle (admin, enseignant, délégué, surveillant, comptable)
	•	Statistiques en temps réel

    Structure du projet 

    eduschedule-pro/
├── backend/
│   ├── api/          # Endpoints REST PHP
│   ├── config/       # Configuration BDD, CORS, JWT
│   ├── middleware/   # Authentification JWT
│   └── vendor/       # Librairies PHP
├── database/
│   └── eduschedule.sql
├── frontend/
│   └── src/
│       ├── context/  # AuthContext
│       ├── pages/    # Pages React
│       └── utils/    # Configuration Axios
└── README.md


Annee Universitaire 2025-2026

ISGE-Reseaux et Systeme de telecommunications 

Faite  **Ctrl+S** 