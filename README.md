# CertiCampus

Projet blanc full-stack realise comme base d'entrainement pour un examen de developpement web.

L'application simule une plateforme de gestion de certifications numeriques pour etablissements:
- espace ecole
- espace administrateur
- gestion des etudiants et formations
- import de donnees
- generation de certificats avec QR code
- verification publique des certificats

## Objectif du projet

Ce projet sert a s'entrainer sur un sujet tres proche d'un projet d'examen:
- construire une API claire
- gerer une authentification avec roles
- faire du CRUD metier
- manipuler une base SQLite locale
- brancher un front React sur une API
- ajouter des tests backend
- preparer une base propre pour la suite: Docker, CI/CD, deploiement

## Stack technique

### Frontend
- `React`
- `TypeScript`
- `Vite`
- `React Router`
- `Axios`

### Backend
- `Node.js`
- `Express`
- `SQLite` via `node:sqlite`
- `jsonwebtoken`
- `bcryptjs`
- `zod`
- `multer`
- `xlsx`
- `qrcode`

### Qualite
- `Vitest`
- `Supertest`

## Fonctionnalites disponibles

### Authentification
- connexion avec redirection selon le role
- inscription d'une nouvelle ecole
- conservation de session cote front

### Espace ecole
- dashboard avec statistiques globales
- CRUD formations
- CRUD etudiants
- import d'etudiants via fichier `.xlsx`, `.xls` ou `.csv`
- telechargement d'un template CSV d'import
- certification individuelle ou multiple
- apercu d'un certificat avant generation
- consultation de la liste des certificats generes
- modification du profil ecole
- changement de mot de passe

### Espace administrateur
- dashboard global
- creation et suppression d'ecoles
- activation / desactivation d'ecoles
- creation, modification et suppression d'abonnements
- modification du template par defaut du certificat

### Verification publique
- page publique de verification d'un certificat par code

## Structure du projet

```text
projet blanc/
├── backend/        # API Express, base SQLite, seed, tests
├── frontend/       # application React/Vite
├── README.md
└── package.json    # scripts racine
```

## Installation

### Prerequis
- `Node.js` 22+
- `npm`

### Installation des dependances

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

## Lancement du projet

### 1. Seeder la base locale

```bash
npm run seed --prefix backend
```

### 2. Lancer front + back

```bash
npm run dev
```

Cela demarre:
- le backend sur `http://localhost:3001`
- le frontend sur `http://localhost:5173`

## URLs utiles

- Frontend: [http://localhost:5173](http://localhost:5173)
- API racine: [http://localhost:3001](http://localhost:3001)
- Healthcheck API: [http://localhost:3001/api/health](http://localhost:3001/api/health)

## Comptes de demonstration

### Espace ecole
- email: `school@certicampus.test`
- mot de passe: `School1234`

### Espace admin
- email: `admin@certicampus.test`
- mot de passe: `Admin1234`

## Scripts utiles

### Racine

```bash
npm run dev
npm run dev:api
npm run dev:web
npm run seed
npm run test
npm run build
```

### Backend

```bash
npm run dev --prefix backend
npm run start --prefix backend
npm run db:init --prefix backend
npm run seed --prefix backend
npm run test --prefix backend
```

### Frontend

```bash
npm run dev --prefix frontend
npm run build --prefix frontend
npm run preview --prefix frontend
```

## Parcours de test recommande

### Compte ecole
1. Se connecter avec le compte ecole
2. Verifier le dashboard
3. Ajouter une formation
4. Ajouter un etudiant
5. Importer un fichier CSV/Excel
6. Cliquer sur `Preview` pour voir le certificat
7. Cliquer sur `Certify` pour generer un certificat
8. Ouvrir le lien de verification publique
9. Modifier le profil dans `settings`
10. Modifier le mot de passe

### Compte admin
1. Se connecter avec le compte admin
2. Verifier le dashboard global
3. Ajouter une ecole
4. Activer / desactiver une ecole
5. Ajouter un abonnement
6. Modifier un abonnement
7. Modifier le template de certificat

## Tests

Les tests backend couvrent deja les points suivants:
- inscription d'une ecole
- connexion
- creation de formation
- creation d'etudiant
- acces dashboard ecole
- acces admin a la liste des ecoles

Lancement:

```bash
npm run test --prefix backend
```

## Base de donnees

Le projet utilise une base SQLite locale creee automatiquement au demarrage du backend.

Fichiers generes localement:
- `backend/dev.db`
- `backend/test.db`

Ils sont ignores par Git.

## Etat actuel

Le projet est volontairement centre sur un MVP solide pour l'entrainement:
- beaucoup de fonctionnalites coeur sont deja presentes
- le deploiement Docker / GitHub / GitLab CI peut etre ajoute ensuite
- certaines editions passent encore par des `prompt()` simples cote front pour aller vite

## Pistes d'amelioration

- ajouter Docker et `docker-compose`
- ajouter une pipeline CI/CD
- remplacer certains `prompt()` par de vraies modales
- ajouter plus de tests API
- ajouter une vraie generation PDF de certificat
- brancher un systeme d'envoi de mails
