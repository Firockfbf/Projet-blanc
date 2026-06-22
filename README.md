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

### Deploiement
- `Docker`
- `Docker Compose`
- `GitLab CI/CD`
- `GitLab Runner`

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

## Lancement avec Docker

### 1. Preparer les variables

```bash
cp .env.example .env
```

### 2. Construire et lancer les conteneurs

```bash
docker compose up --build -d
```

### 3. Injecter les donnees de demonstration

```bash
docker compose exec backend npm run seed
```

Le projet sera alors disponible sur:
- `http://localhost` pour le frontend
- `http://localhost/api/health` pour l'API via le proxy nginx
- `http://localhost:3001/api/health` pour l'API en acces local machine uniquement

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

## Pipeline GitLab CI/CD

Le projet est prepare pour suivre la logique du cours DevOps:
- `backend:test` installe et lance les tests API
- `frontend:build` compile l'application React
- `docker:build` construit puis pousse les images backend et frontend dans le Container Registry GitLab
- `deploy:production` recupere les images depuis le registry, lance une sauvegarde SQLite, redemarre `docker compose` puis effectue un smoke test

### Variables GitLab a prevoir

- `JWT_SECRET`
- `APP_URL`
- `BACKEND_PORT`
- `FRONTEND_PORT`
- `BACKUP_RETENTION_DAYS`

### Logique de deploiement

Le job de deploy est pense pour la branche principale avec un `gitlab-runner` installe sur la VM Ubuntu en mode `shell`, avec Docker et `docker compose` disponibles.

L'architecture la plus simple et la plus defendable pour le rendu est la suivante:
- une VM Ubuntu Desktop ou Server
- un `gitlab-runner` sur cette VM
- `Docker Compose` pour lancer front + API
- un volume Docker persistant pour la base SQLite
- le backend expose seulement `127.0.0.1:3001`
- le frontend nginx expose le site et reverse-proxy `/api`

## Exigences du document de mise en production

Le livrable final demande de couvrir les points suivants:
- code source et configurations versionnes
- scripts de deploiement
- documentation technique d'architecture
- application accessible en demonstration ou production
- services et gestion des processus
- variables d'environnement et securisation des acces
- pipeline CI/CD automatisee
- supervision et sauvegarde

Dans cette version du projet:
- les configurations Docker et GitLab sont presentes
- l'application peut tourner sur une VM Ubuntu via `docker compose`
- le backend n'est pas expose publiquement hors de la machine
- un script de sauvegarde SQLite est fourni
- un script de verification post-deploiement est fourni
- il reste a preparer la documentation finale d'architecture et la mise en place effective du runner sur la VM

## Scripts d'exploitation

### Sauvegarde SQLite

```bash
./ops/backup-certicampus.sh
```

Le script exporte la base SQLite du conteneur backend vers `./backups` et nettoie les sauvegardes trop anciennes.

### Verification post-deploiement

```bash
./ops/check-certicampus.sh
```

Le script verifie:
- la page web front
- l'endpoint `api/health`
- l'etat des conteneurs Docker

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

En version Docker, la base est stockee dans un volume nomme `certicampus-data`.

## Etat actuel

Le projet est volontairement centre sur un MVP solide pour l'entrainement:
- beaucoup de fonctionnalites coeur sont deja presentes
- le deploiement Docker et GitLab CI sont maintenant prepares
- certaines editions passent encore par des `prompt()` simples cote front pour aller vite
- la supervision reste volontairement legere via healthchecks, smoke test et sauvegarde SQLite

## Pistes d'amelioration

- remplacer certains `prompt()` par de vraies modales
- ajouter plus de tests API
- ajouter une vraie generation PDF de certificat
- brancher un systeme d'envoi de mails
