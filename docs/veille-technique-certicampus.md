# Veille technique

## Titre

Veille technique autour d'une plateforme web de gestion de certifications numeriques

## Contexte

Dans le cadre du projet CertiCampus, l'objectif est de realiser une application web permettant a des etablissements de gerer des etudiants, des formations, des certifications et des certificats numeriques.  
Le projet doit rester realiste dans un contexte d'examen ou de sprint court, avec une architecture claire, rapide a prendre en main et defendable a l'oral.

La veille technique a donc pour objectif de justifier les choix retenus pour le projet, en evaluant plusieurs familles d'outils :
- frontend
- backend
- gestion des donnees
- securite
- outillage de developpement
- tests

## Problematique

Comment choisir une stack technique simple, credible et suffisamment moderne pour realiser rapidement une application web full-stack avec authentification, CRUD, import de donnees, generation de certificats et tests automatises ?

## Methode de veille

La veille repose sur l'etude de technologies couramment utilisees dans le developpement web moderne, en comparant :
- leur simplicite de mise en oeuvre
- leur pertinence pedagogique
- leur adequation au projet
- leur facilite de maintenance
- leur capacite a etre defendues lors d'une soutenance

Le but n'est pas de selectionner les technologies les plus "a la mode", mais celles qui apportent le meilleur equilibre entre rapidite, clarte et robustesse.

## 1. Choix du frontend

### React

React est une bibliotheque JavaScript tres populaire pour construire des interfaces utilisateur basees sur des composants reutilisables.

#### Pourquoi React est pertinent ici
- il permet de decomposer l'interface en blocs simples : page de connexion, dashboard, tableau d'etudiants, page admin, etc.
- il est tres adapte aux applications de type dashboard
- il facilite la gestion de plusieurs vues dans une SPA
- il dispose d'un ecosysteme tres riche
- il est largement connu en entreprise et souvent attendu dans les projets web modernes

#### Limites
- React ne fournit pas tout nativement
- il faut choisir des outils complementaires pour le routage, les appels API et parfois l'etat global

#### Conclusion
React est un choix credible car il offre une bonne vitesse de developpement et une structure claire pour separer les differentes parties de l'application.

### Vite

Vite est un outil de developpement et de build pour projets frontend modernes.

#### Avantages
- demarrage tres rapide du serveur de dev
- experience fluide pendant le developpement
- configuration legere
- tres bien adapte a React + TypeScript

#### Conclusion
Pour un projet d'examen ou de sprint court, Vite est plus interessant qu'un setup plus lourd, car il fait gagner du temps des le debut du projet.

### TypeScript

TypeScript ajoute un systeme de typage statique au JavaScript.

#### Avantages
- limite les erreurs de manipulation de donnees
- clarifie la structure des objets exchanges entre front et back
- aide a mieux maintenir le projet
- rend le code plus lisible a plusieurs

#### Limites
- demande un leger temps d'adaptation
- impose un peu plus de rigueur

#### Conclusion
Dans un projet avec plusieurs objets metier comme `User`, `Student`, `Formation` ou `Certificate`, TypeScript apporte une vraie valeur.

## 2. Choix du backend

### Node.js

Node.js permet d'executer du JavaScript cote serveur.

#### Avantages
- meme langage entre front et back
- prise en main rapide
- grand ecosysteme de packages
- tres adapte aux API REST

#### Conclusion
Node.js est particulierement pertinent dans un projet de formation, car il permet de rester coherent sur toute la stack technique.

### Express

Express est un framework minimaliste pour Node.js, souvent utilise pour creer des API.

#### Avantages
- structure simple
- routes faciles a organiser
- excellente flexibilite
- rapide a mettre en place

#### Dans ce projet
Express permet de definir clairement :
- les routes d'authentification
- les routes etudiants
- les routes formations
- les routes certificats
- les routes admin

#### Limites
- Express est peu directif
- il faut soi-meme structurer correctement le projet

#### Conclusion
Express convient tres bien a un MVP ou a un sujet d'examen, car il offre un bon compromis entre simplicite et clarte.

## 3. Choix de la base de donnees

### SQLite

SQLite est une base de donnees legere qui fonctionne dans un simple fichier local.

#### Avantages
- installation tres simple
- pas besoin de serveur de base separe
- tres pratique en environnement local
- ideal pour un prototype, un exercice ou un examen

#### Pourquoi c'est un bon choix ici
- le projet doit etre rapide a lancer
- il faut eviter une complexite inutile d'infrastructure
- le but principal est de valider les fonctionnalites metier, pas de gerer une architecture distribuee

#### Limites
- moins adapte a une application fortement multi-utilisateur
- moins pertinent pour un projet de production a grande echelle

#### Conclusion
SQLite est tres plausible dans un contexte d'examen, car il permet de se concentrer sur la logique metier plutot que sur l'administration d'une base.

### Pourquoi ne pas avoir choisi MongoDB

MongoDB est une base NoSQL tres populaire, mais elle n'a pas ete retenue dans cette version pour plusieurs raisons :
- elle demande une prise en main supplementaire
- le projet manipule des donnees assez structurees
- le temps de developpement est limite
- une base relationnelle legere est plus simple a defender ici

Dans un projet plus long, MongoDB resterait envisageable, mais dans ce contexte SQLite est un choix plus pragmatique.

## 4. Securite et authentification

### JWT

Le JSON Web Token permet d'authentifier un utilisateur sans stocker la session cote serveur.

#### Avantages
- simple a integrer dans une API REST
- facilite la separation front/back
- permet de transporter les informations utiles comme le role utilisateur

#### Usage dans le projet
- connexion admin ou ecole
- protection des routes
- differenciation des droits selon le role

### bcryptjs

Le mot de passe ne doit jamais etre stocke en clair.  
bcryptjs permet de hasher les mots de passe avant de les enregistrer.

#### Pourquoi c'est mieux qu'un simple SHA-256
- SHA-256 seul est trop rapide pour du stockage de mots de passe
- bcrypt est pense specifiquement pour cet usage
- il augmente la resistance face aux attaques par brute force

#### Conclusion
L'usage de JWT et bcrypt constitue un duo classique, credible et pedagogiquement defendable.

## 5. Gestion et validation des donnees

### zod

Zod est une bibliotheque de validation de schemas.

#### Avantages
- controle les donnees recues par l'API
- evite de traiter des requetes mal formees
- rend la validation tres lisible

#### Conclusion
Zod est utile pour rendre l'API plus robuste sans ajouter une complexite excessive.

## 6. Fonctionnalites metier specifiques

### xlsx

Le package `xlsx` permet de lire des fichiers Excel ou CSV.

#### Interet dans le projet
- import massif d'etudiants
- simulation d'un vrai besoin metier d'etablissement
- gain de temps par rapport a une saisie manuelle

#### Conclusion
Cette technologie est directement liee au besoin fonctionnel du cahier des charges.

### qrcode

Le package `qrcode` permet de generer un QR code a integrer dans un certificat.

#### Interet dans le projet
- renforce l'authenticite du certificat
- permet une verification rapide
- apporte une dimension visuelle et metier forte a la demonstration

#### Conclusion
Le QR code est une fonctionnalite tres pertinente ici, car elle donne du sens au concept de certificat numerique.

## 7. Tests

### Vitest

Vitest est un framework de test moderne, bien integre a l'ecosysteme JavaScript.

#### Avantages
- rapide
- syntaxe simple
- bonne integration avec un projet moderne

### Supertest

Supertest permet de tester les routes HTTP d'une API Express.

#### Interet
- verifier l'inscription
- verifier la connexion
- verifier la creation d'etudiant ou de formation
- verifier les routes protegees

#### Conclusion
Le couple Vitest + Supertest est tres pertinent pour garantir un minimum de qualite sur une API REST.

## 8. Organisation de l'application

L'application suit une architecture separee :
- un frontend pour l'interface
- un backend pour la logique metier et les routes
- une base SQLite locale

Cette separation permet :
- une meilleure lisibilite
- une maintenance plus facile
- une vraie logique full-stack
- une preparation naturelle pour un futur deploiement

## 9. Limites de la version actuelle

La version actuelle est un MVP. Certaines limites sont normales :
- pas encore de Docker
- pas encore de pipeline CI/CD
- pas encore d'envoi d'e-mails reel
- pas encore de vrai export PDF avance
- certaines modifications passent encore par des `prompt()` simples

Ces limites sont acceptables dans un contexte d'entrainement, car l'objectif principal est de prouver la maitrise des briques fondamentales.

## 10. Recommandation finale

Pour un projet de type examen, la stack retenue est tres coherent :
- `React` pour construire l'interface
- `Vite` pour gagner du temps
- `TypeScript` pour fiabiliser le code
- `Node.js + Express` pour l'API
- `SQLite` pour la simplicite locale
- `JWT + bcryptjs` pour la securite
- `xlsx` pour l'import metier
- `qrcode` pour la generation de certificats
- `Vitest + Supertest` pour les tests

Cette combinaison est :
- moderne
- realiste
- rapide a mettre en place
- defendable a l'oral
- adaptee a un sprint court

## Conclusion

La veille technique montre qu'il n'est pas toujours necessaire de choisir les technologies les plus complexes pour produire une application credible.  
Dans un contexte de projet court ou d'examen, le meilleur choix est souvent celui qui maximise la lisibilite, la rapidite de mise en oeuvre et la robustesse minimale.

Le projet CertiCampus s'appuie donc sur une stack simple mais tres pertinente, qui permet de couvrir les besoins essentiels du cahier des charges tout en restant accessible a une equipe d'etudiants.
