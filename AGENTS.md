# Relation Story - Documentation pour Agents IA

## 🎯 Vue d'ensemble

Application web permettant de créer et visualiser un graphe de relations entre personnes. **Deux modes** : **admin** (en local, hostname localhost/127.0.0.1) a accès à tout le graphe et peut ajouter/modifier/supprimer directement ; **utilisateur** (hébergé ou `?mode=propose`) ne peut que soumettre des propositions (ajout/modification/suppression) que l'admin approuve ou rejette. Chaque utilisateur doit être une personne du graphe : inscription par email + choix du nœud (recherche par nom), un seul compte par nœud. **Visibilité du graphe** : non connecté = nœuds/arêtes sans noms ni types (ids 6 chiffres, type CONNECTION) ; connecté = selon niveau (1 = noms des voisins, 2 = + types des relations avec soi, 3 = + noms des voisins de voisins). Les propositions ne sont visibles que par leur auteur (email) et par l'admin. Les approbations créent des snapshots (versions).

## 🏗️ Architecture

### Backend (Node.js + Express)

**Fichier principal**: `backend/index.js`

- Port: `process.env.PORT` (défaut 3000)
- CORS: `process.env.CORS_ORIGIN` (défaut `*` ; si `*` et requête avec `Origin`, la réponse renvoie cette origine pour permettre `credentials: 'include'`).
- Connexion Neo4j via `neo4j.js` ; module **ids.js** : `generateUniqueNodeId`, `generateUniqueEdgeId`, `migrateNodeIdsAndEdgeIds` (IDs 6 chiffres pour Person et relations).
- **Base SQL** : `backend/db.js` (PostgreSQL via `DATABASE_URL`, ex. Supabase). Tables : `users` ; `node_events` (audit nœuds) ; `edge_events` (audit relations : edge_id, action add/delete, created_by, created_at, created_with_visibility_level) ; `session` (connect-pg-simple). `initDb()` au démarrage.
- Session : `express-session` + `connect-pg-simple` si `DATABASE_URL`, sinon mémoire. Cookie httpOnly, 7 jours. `isAdmin(req)` = hostname localhost ou 127.0.0.1 ; `requireAdmin` = 403 si non admin ; `requireAuth` = 401 si non connecté.
- Écritures directes (POST/PATCH/DELETE person, POST/DELETE relation, POST /import) protégées par **requireAdmin** : 403 en dehors de localhost.
- Module snapshots : `backend/snapshots.js` (création/liste/restauration de versions JSON).
- Dossier `backend/snapshots/` : fichiers JSON des versions (format `snapshot-{timestamp}-{id}.json`).
- **Production** : en dehors des tests, le backend sert le frontend en statique (`express.static("../frontend")`) pour un déploiement en une seule URL.

**Configuration Neo4j**: `backend/neo4j.js`

- Lit `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`. Valeurs par défaut : `bolt://127.0.0.1:7687`, neo4j, password (utilisées si variables absentes, ex. en mode test sans dotenv).
- En production (ex. Neo4j Aura) : définir ces variables dans `.env` ou chez l’hébergeur (voir `DEPLOI.md`).

### Frontend (HTML/CSS/JS + Cytoscape.js)

**Fichiers**:

- `frontend/index.html` - Structure avec formulaires et conteneur graphe ; bloc `#auth-bar` (lien Connexion ou "Connecté : email" + Déconnexion).
- `frontend/login.html` - Page connexion/inscription : formulaire login (email, mot de passe) ; inscription (email, mot de passe, recherche par nom → choix du nœud → POST /auth/register). Redirection vers index.html après login/register.
- `frontend/renderer.js` - Initialisation Cytoscape, gestion événements, API calls. `API_BASE` : en dev (localhost:8080) → `http://localhost:3000`, sinon `window.location.origin`. Tous les appels API passent par **apiFetch** (fetch avec `credentials: 'include'`). Au chargement : `initAuth()` (GET /auth/me, mise à jour de #auth-bar). Mode propose : `isProposeMode = !isLocalhost || urlParams.get("mode") === "propose"` ; en mode propose les formulaires envoient des propositions (POST /proposals) au lieu des endpoints directs.
- `frontend/style.css` - Styles responsive avec sidebar toggleable

**Serveur**: Python HTTP server sur port 8080 (dev local)

### Base de données (Neo4j 5)

**Docker Compose**: `docker-compose.yml`

- Ports: 7474 (HTTP), 7687 (Bolt)
- Volume persistant: neo4j_data

### Tests Backend

**Dossier**: `backend/__tests__/`

- `setup.js` : clearDatabase, createTestPerson(nom, **origines** (array), x, y), createTestRelation, createTestProposal(authorName, type, data, authorEmail?), etc.
- `person.test.js`, `relation.test.js`, `proposals.test.js`, `snapshots.test.js`, `export-import.test.js`, **auth.test.js**, **graph-visibility.test.js**, **available-for-signup.test.js**
- Commande : `npm test` (Jest + supertest, Neo4j requis). Tests auth complets (register → login → me → logout) nécessitent `DATABASE_URL`.
- **Base pour les tests** : dev et tests utilisent la même Neo4j (docker-compose, **7687**). Défaut `bolt://127.0.0.1:7687` pour limiter les ECONNRESET sous WSL. Voir `backend/__tests__/README.md`.

## 📊 Modèle de Données

### Nœud `Person`

- **Format du nom** : obligatoire **Prénom NOM** (regex `^[A-Z][a-z]* [A-Z][A-Z-]*$`). Exemple : `Jean HEUDE-LEGRANG`. Validé côté backend (POST /person, PATCH /person, approve add_node/modify_node) et frontend.
- **nodeId** : identifiant unique 6 chiffres (string), généré à la création ; utilisé pour lier un compte utilisateur (table `users`) et pour la visibilité du graphe (réponses filtrées exposent id = nodeId).
- **origines** : liste ordonnée de strings (ex. `["Famille", "Travail"]`). Un nœud peut appartenir à plusieurs groupes visuels.

```cypher
(:Person {
  nom: String,        // UNIQUE, REQUIRED - format "Prénom NOM" (ex. Jean DUPONT)
  origines: [String], // OPTIONAL - liste d'origines (plusieurs groupes possibles)
  x: Number,          // REQUIRED - position X dans le graphe
  y: Number,          // REQUIRED - position Y dans le graphe
  nodeId: String      // REQUIRED - 6 chiffres, unique
})
```

### Relations

- `[:FAMILLE]` - Relation familiale (couleur: bleu)
- `[:AMIS]` - Relation amicale (couleur: vert)
- `[:AMOUR]` - Relation amoureuse (couleur: rouge)
- Chaque relation a une propriété **edgeId** (6 chiffres, unique). En réponses filtrées (non admin), le type peut être masqué et renvoyé comme **CONNECTION** (couleur grise frontend).

### Nœud `Proposal` (collaboration)

Séparé des Person (pas de relations entre eux). Stocke les propositions en attente de validation. **Filtrage** : GET /proposals et GET /proposals/:id ne renvoient que les propositions dont l'utilisateur connecté est l'auteur (authorEmail = session.user.email) ou si admin.

```cypher
(:Proposal {
  id: String,           // UUID unique
  authorEmail: String,  // rempli depuis la session (filtrage par auteur)
  authorNodeId: String, // nodeId de la Person auteur (6 chiffres), rempli depuis la session
  type: String,         // add_node | add_relation | modify_node | delete_node | delete_relation
  data: String,        // JSON stringifié des données
  status: String,      // pending | approved | rejected
  createdAt: String,   // ISO timestamp
  reviewedAt: String,
  reviewedBy: String,
  comment: String
})
// authorName : résolu côté API à partir de authorNodeId (Person.nom) pour l'affichage ; anciennes propositions peuvent avoir authorName en base
```

### Table `users` (PostgreSQL)

- **email** (unique) – identifiant de connexion
- **password_hash** – bcrypt
- **person_node_id** (6 chiffres) – nœud Person réservé à ce compte (un seul compte par nœud)
- **visibility_level** (integer, défaut 1) – niveau de visibilité du graphe (1 = noms des voisins, 2 = + types des relations avec soi, 3 = + noms des voisins de voisins)
- **created_at**

### Table `node_events` (PostgreSQL)

Audit des ajouts et modifications de nœuds (une ligne par événement). Remplie si `DATABASE_URL` est défini.

- **id** (SERIAL) – identifiant de l’événement
- **node_id** (VARCHAR(6)) – nodeId du nœud Person concerné
- **action** – `'add'` ou `'modify'`
- **created_by** – email de l’utilisateur (session) ou null
- **created_at** (TIMESTAMPTZ)
- **created_with_visibility_level** – niveau de visibilité de l’utilisateur au moment de l’action

### Table `edge_events` (PostgreSQL)

Audit des créations et suppressions de relations (une ligne par événement). Remplie si `DATABASE_URL` est défini.

- **id** (SERIAL) – identifiant de l’événement
- **edge_id** (VARCHAR(6)) – edgeId de la relation concernée
- **action** – `'add'` ou `'delete'`
- **created_by** – email de l’utilisateur (session) ou null
- **created_at** (TIMESTAMPTZ)
- **created_with_visibility_level** – niveau de visibilité de l’utilisateur au moment de l’action

## 🔌 API REST

### GET /graph

Récupère le graphe selon le contexte (admin / anonyme / connecté).

- **Admin** (hostname localhost ou 127.0.0.1) : réponse complète (id = nom, nodeId, nom, **origines** (array), x, y ; edges avec source/target = nom, type, edgeId).
- **Non connecté** : nœuds avec `id` = nodeId (6 chiffres), x, y (pas de nom ni origines) ; arêtes avec source/target = nodeId, `type: "CONNECTION"`, edgeId.
- **Connecté** : selon `visibility_level` de la session (1 = noms des voisins, 2 = + types des relations avec soi, 3 = + noms des voisins de voisins). Réponse avec id = nodeId ; nom/origines et type d'arête exposés selon le niveau.

```json
// Admin
{ "nodes": [{ "id": "nom", "nodeId": "123456", "nom": "Jean DUPONT", "origines": ["Famille", "Travail"], "x": 0, "y": 0 }], "edges": [{ "source": "Jean DUPONT", "target": "Marie MARTIN", "type": "AMIS", "edgeId": "654321" }] }

// Anonyme / filtré
{ "nodes": [{ "id": "123456", "x": 0, "y": 0 }], "edges": [{ "source": "123456", "target": "654321", "type": "CONNECTION", "edgeId": "111222" }] }
```

### GET /persons/similar

Retourne les noms existants les plus proches (distance de Levenshtein). Utilisé pour éviter les doublons (formulaire personne) et pour la sélection source/cible (formulaire relation).

```json
Query: ?q=jean&limit=8   (limit optionnel, défaut 3, max 15)
Response: { "similar": ["Jean DUPONT", "Jeanne MARTIN", "Juan GARCIA", ...] }
```

### GET /persons/available-for-signup

Liste des Person dont le nodeId n'est pas encore lié à un compte (pour l'inscription). Filtre optionnel par nom.

```json
Query: ?q=Jean
Response: { "available": [{ "nodeId": "123456", "nom": "Jean DUPONT" }, ...] }
```
503 si `DATABASE_URL` absent.

### GET /origines

Liste des origines distinctes présentes sur les nœuds (pour le multi-select du formulaire).

```json
Response: { "origines": ["Famille", "Travail", "Sport", ...] }
```

### Auth (session, credentials)

- **POST /auth/register** – Inscription. Body: `{ email, password, person_node_id }` (person_node_id = 6 chiffres). Vérifie que le nœud existe en Neo4j et n'est pas déjà pris ; hash bcrypt ; insertion dans `users`. 400 si nœud inexistant ou déjà pris, 503 si pas de DB.
- **POST /auth/login** – Connexion. Body: `{ email, password }`. Crée la session ; réponse `{ user: { email, person_node_id, visibility_level } }`. 401 si identifiants incorrects, 503 si pas de DB.
- **GET /auth/me** – Utilisateur courant (session). 401 si non connecté.
- **POST /auth/logout** – Déconnexion (destruction de la session).

### POST /person

Crée une nouvelle personne. Le nom doit respecter le format Prénom NOM. **Réservé à l'admin** (requireAdmin) : 403 en dehors de localhost. Enregistre un événement dans `node_events` (action `add`) si `DATABASE_URL` est défini.

```json
Body: { "nom": "Jean DUPONT", "origines": ["Travail", "Famille"], "x": 100, "y": 200 }
Response: 201 Created
Erreur: 400 si nom manquant, format invalide (Prénom NOM) ou coordonnées manquantes ; 403 si non admin
```

### DELETE /person

Supprime une personne et ses relations. **Réservé à l'admin** : 403 en dehors de localhost.

```json
Body: { "nom": "Jean DUPONT" }
Response: 200 OK
```

### PATCH /person/coordinates

Met à jour les coordonnées d'une personne. **Réservé à l'admin** : 403 en dehors de localhost. Enregistre un événement `modify` dans `node_events` si `DATABASE_URL` est défini.

```json
Body: { "nom": "Jean DUPONT", "x": 150, "y": 250 }
Response: 200 OK
```

### PATCH /person

Met à jour le nom et/ou les origines d'une personne. Le nouveau nom doit respecter le format Prénom NOM. **Réservé à l'admin** : 403 en dehors de localhost. Enregistre un événement `modify` dans `node_events` si `DATABASE_URL` est défini.

```json
Body: { "oldNom": "Jean DUPONT", "nom": "Jean MARTIN", "origines": ["Travail", "Sport"] }
Response: 200 OK
Erreur: 400 si nouveau nom au mauvais format
```

### POST /relation

Crée une relation entre deux personnes. **Réservé à l'admin** : 403 en dehors de localhost. Enregistre un événement dans `edge_events` (action `add`) si `DATABASE_URL` est défini.

```json
Body: { "source": "Jean DUPONT", "target": "Marie MARTIN", "type": "AMIS" }
Response: 201 Created
```

### DELETE /relation

Supprime une relation. **Réservé à l'admin** : 403 en dehors de localhost. Enregistre un événement dans `edge_events` (action `delete`) si `DATABASE_URL` est défini.

```json
Body: { "source": "Jean DUPONT", "target": "Marie MARTIN", "type": "AMIS" }
Response: 200 OK
```

### DELETE /all

Supprime tous les nœuds et relations

```json
Response: { "message": "Tous les nœuds et relations ont été supprimés" }
```

### GET /export

Exporte toutes les données en JSON

```json
Response: {
  "nodes": [...],
  "edges": [...],
  "exportDate": "2026-02-02T10:00:00.000Z"
}
```

### POST /import

Importe et restaure les données (supprime tout avant). **Réservé à l'admin** : 403 en dehors de localhost.

```json
Body: { "nodes": [...], "edges": [...] }
Response: { "message": "Import réussi", "nodesCount": 5, "edgesCount": 3 }
```

### Propositions (collaboration)

- **POST /proposals** – Soumettre une proposition (**utilisateur connecté uniquement**, 401 sinon). Body: `{ type, data }`. L'auteur est déduit de la session (email, person_node_id → authorEmail, authorNodeId). Types: add_node (data: nom, **origines**, x, y), add_relation (data: source, target, type), modify_node (data: nom, newNom?, **newOrigines**?), delete_node, delete_relation.
- **GET /proposals/stats** – Admin : stats globales. Connecté (non admin) : stats uniquement pour les propositions de l'utilisateur (authorEmail = session.user.email). Non connecté : `{ pending: 0, approved: 0, rejected: 0, total: 0 }`.
- **GET /proposals** – Admin : toutes les propositions. Connecté : uniquement celles dont authorEmail = session.user.email. Non connecté : 401.
- **GET /proposals/:id** – Détails d'une proposition. Admin : accès à toute. Connecté : uniquement si authorEmail = session.user.email, sinon 403.
- **POST /proposals/:id/approve** – Approuver (applique le changement, crée un snapshot ; enregistre dans `node_events` pour add_node/modify_node, dans `edge_events` pour add_relation/delete_relation, si `DATABASE_URL` défini). Body: `{ reviewedBy, comment? }`. Pour add_node et modify_node, le nom doit respecter le format Prénom NOM, sinon 400.
- **POST /proposals/:id/reject** – Rejeter. Body: `{ reviewedBy, comment }`.

### Snapshots (versions)

- **GET /snapshots** – Liste des snapshots (id, timestamp, message, author, nodesCount, edgesCount).
- **GET /snapshots/:id** – Contenu JSON d'un snapshot.
- **POST /snapshots** – Créer un snapshot manuel. Body: `{ message, author }`.
- **POST /snapshots/restore/:id** – Restaurer un snapshot (sauvegarde automatique avant). Body: `{ author }`. Ne touche pas aux Proposals.

## 🎨 Frontend - Fonctionnalités

### Cytoscape Configuration

- **Layout**: `preset` (positions fixes basées sur x,y)
- **Drag & Drop**: Activé (`autoungrabify: false`)
- **Panning**: Activé (`userPanningEnabled: true`, `panningEnabled: true`)
- **Zoom**: Activé (`userZoomingEnabled: true`, limites: 0.1x à 10x)
- **Auto-save**: Les positions sont sauvegardées automatiquement après drag

### Contrôles de Navigation

- **Zoom** :
  - Molette de la souris
  - Trackpad : pinch to zoom (2 doigts)
  - Boutons +/- dans l'interface
  - Bouton "Ajuster" pour voir tout le graphe
- **Panning** :
  - Trackpad : déplacement avec 2 doigts
  - Souris : clic sur le fond + déplacement
  - Note : cliquer sur un nœud = drag du nœud, cliquer sur le fond = pan de la vue

### Style des Nœuds

- Background transparent (`background-opacity: 0`)
- Hitbox: 60x60px (pour faciliter le drag)
- Label: nom de la personne
- Font-size: 14px

### Style des Relations

- Largeur: 3px
- Flèches dirigées vers la cible
- Couleur selon le type (FAMILLE=bleu, AMIS=vert, AMOUR=rouge)
- Courbes bezier

### Interface Utilisateur

1. **Auth bar** (sous le titre) : lien "Connexion" (vers login.html) ou "Connecté : email" + bouton Déconnexion. Mise à jour au chargement via GET /auth/me (apiFetch avec credentials).
2. **Page login.html** : formulaire Connexion (email, mot de passe) ; inscription (email, mot de passe, recherche par nom → GET /persons/available-for-signup → choix du nœud → POST /auth/register). Redirection vers index.html après succès.
3. **Sidebar toggleable** (bouton "≡ Menu" en haut à gauche)
4. **Mode collaborateur** (`?mode=propose` ou hors localhost) : bloc "Proposer des modifications" (titre + hint + stats "X proposition(s) en attente" si connecté, sinon "Connectez-vous pour proposer" + lien Connexion). **Connexion obligatoire** pour soumettre une proposition. Masqué : Tout supprimer, Importer. Les formulaires (personne, liste, relation) envoient des propositions (POST /proposals) au lieu des endpoints directs ; les écritures directes (POST /person, etc.) sont refusées (403) par le backend en dehors de localhost.
5. **Propositions en attente** : section toujours visible avec liste et bouton Rafraîchir. En mode admin : boutons Approuver/Rejeter sur chaque proposition. En mode propose : liste en lecture seule (filtrée par auteur côté API).
4. **Formulaire Personne** : consigne « Nom en majuscule OBLIGATOIRE, exemple : Jean HEUDE-LEGRANG » ; champ nom (format Prénom NOM, validé par regex) ; sous le champ, affichage des **3 noms les plus proches** existants (GET /persons/similar) ; **origines** : multi-select (GET /origines pour les options) + champ « Nouvelle origine » + bouton Ajouter ; x/y (auto si vide).
5. **Formulaire Liste** : noms CSV au format Prénom NOM ; mêmes origines que la sélection du multi-select ci-dessus (positions auto)
6. **Formulaire Relation** : source et cible via **sélection obligatoire** : l’utilisateur tape un nom ou le début du nom, une liste de noms existants s’affiche (GET /persons/similar?q=…&limit=8) ; il doit **cliquer** sur un nom pour valider la source et un pour la cible (la saisie libre n’est pas acceptée à l’envoi). Type : select FAMILLE / AMIS / AMOUR.
7. **Contrôles du graphe**: Zoom +, Zoom -, Ajuster
8. **Actions**: Rafraîchir, Tout supprimer
9. **Sauvegarde**: Exporter, Importer

### Groupes visuels (origines)

Un **rectangle par origine** ; les rectangles peuvent **se chevaucher**. Un nœud peut avoir plusieurs origines (plusieurs groupes). Les boîtes sont calculées à partir des positions des nœuds ayant chaque origine ; elles sont mises à jour après drag d’un nœud. Double-clic sur un groupe : « Dissoudre » retire cette origine pour tous les membres (sans toucher aux autres origines).

### Propositions en attente sur le graphe

Les propositions en attente sont affichées sur le graphe avec une transparence pour les distinguer des éléments validés. Au chargement du graphe, `loadPendingOnGraph()` récupère les propositions (GET /proposals?status=pending) et :

- **add_node** : nœuds ajoutés avec la classe Cytoscape `pending` (opacity 0,5), data.origines (array)
- **add_relation** : arêtes ajoutées avec la classe `pending` (opacity 0,45, trait en pointillés)
- **modify_node** : nœud existant reçoit la classe `pending-modify` (opacity 0,6)
- **delete_node** : nœud existant reçoit la classe `pending-delete` (opacity 0,4)
- **delete_relation** : arête existante reçoit la classe `pending-delete` (opacity 0,35, pointillés)

### Interactions Directes

- **Clic sur fond** → Crée un nœud (prompt nom + origines séparées par des virgules) ou envoie une proposition en mode propose
- **Double-clic nœud** → Menu modifier (nom + origines, virgules) / supprimer (ou proposition en mode propose)
- **Double-clic relation** → Menu changer type/supprimer (ou proposition en mode propose)
- **Double-clic groupe** → Info/Dissoudre (en mode propose : message "Seul l'administrateur peut dissoudre")
- **Drag nœud** → Déplace avec auto-save (en mode propose : pas de sauvegarde, drag visuel seulement)

### Mode collaborateur (URL `?mode=propose` ou hors localhost)

- Détection : `isProposeMode = !isLocalhost || urlParams.get("mode") === "propose"` dans `renderer.js`.
- En mode propose, tous les ajouts/modifications/suppressions passent par **POST /proposals** au lieu des endpoints directs ; le backend renvoie 403 sur POST /person, PATCH /person, DELETE /person, POST /relation, DELETE /relation, POST /import en dehors de localhost (requireAdmin).
- **Connexion obligatoire** pour soumettre une proposition (401 sinon) ; l'auteur est identifié par la session (person_node_id + email).
- Lien à partager pour collaborateurs : `http://localhost:8080?mode=propose` (ou l'URL hébergée).

## 🚀 Démarrage du Projet

```bash
# Terminal 1 - Neo4j
cd /home/jules/relation-story
docker-compose up -d

# Terminal 2 - Backend
cd /home/jules/relation-story/backend
npm start

# Terminal 3 - Frontend
cd /home/jules/relation-story/frontend
python3 -m http.server 8080
```

Accès:

- Frontend: <http://localhost:8080>
- Backend API: <http://localhost:3000>
- Neo4j Browser: <http://localhost:7474>

## 🌐 Hébergement (production)

- **Guide** : `DEPLOI.md` — option économique (Neo4j Aura Free + Render Free), une seule app (backend sert le frontend), variables d’environnement à configurer sur Render.
- En prod, même origine : l’URL du service (ex. `https://relation-story.onrender.com`) sert à la fois l’API et le frontend ; `API_BASE = window.location.origin` dans le frontend suffit.

## 🔧 Environnement (dev / production)

- **Fichier `.env`** à la **racine du projet** (optionnel en dev). Le backend charge ce fichier via `dotenv`. Un seul `.env` : commenter/décommenter les lignes NEO4J_* selon dev (Docker) ou prod (Aura). En mode test, dotenv n’est pas chargé (tests utilisent la Neo4j locale).
- **`.env.example`** à la racine liste les variables possibles ; copier en `.env` et adapter. Ne pas commiter `.env` (déjà dans `.gitignore`).

**Variables d’environnement (backend)**:

| Variable        | Défaut (dev local)     | Production (ex.)                          |
|----------------|------------------------|-------------------------------------------|
| `NEO4J_URI`    | bolt://127.0.0.1:7687 | neo4j+s://xxx.databases.neo4j.io (Aura)   |
| `NEO4J_USERNAME`   | neo4j                  | neo4j                                     |
| `NEO4J_PASSWORD` | password             | mot de passe Aura                          |
| `PORT`         | 3000                   | fourni par l’hébergeur (Render, etc.)     |
| `CORS_ORIGIN`  | *                      | <https://ton-app.onrender.com> (URL du service si front servi par le backend) |

- **Sans `.env`** : le backend utilise les défauts ci‑dessus (Neo4j local, port 3000, CORS `*`).
- **Frontend** : en production, si le front est servi depuis le **même domaine** que l’API, `API_BASE = window.location.origin` suffit. Sinon (front et API sur domaines différents), il faudrait adapter la logique dans `renderer.js` (ex. URL en dur ou endpoint de config).

## 📝 Points Importants pour l'IA

### Historique des Changements

- **Format nom** : Prénom NOM obligatoire (regex `^[A-Z][a-z]* [A-Z][A-Z-]*$`), consigne et validation front + backend ; refus 400 si format invalide (POST /person, PATCH /person, approve add_node/modify_node).
- **Noms similaires** : GET /persons/similar?q=xxx (paramètre optionnel `limit`, défaut 3, max 15). Formulaire personne : 3 noms proches sous le champ ; formulaire relation : jusqu’à 8 suggestions, **sélection obligatoire par clic** (source et cible).
- **Relations** : source et cible doivent correspondre à des personnes existantes ; validation backend (POST /relation, approve add_relation) → 400 si personne non trouvée. Frontend : message d’erreur API affiché ; formulaire relation impose de choisir dans la liste (clic).
- **Modèle simplifié** : Anciennement nom+prénom, maintenant nom unique au format Prénom NOM
- **Coordonnées auto**: Calcul intelligent si non spécifiées
- **Origines (liste)**: Chaque nœud a `origines` (array de strings) ; multi-select dans le formulaire ; GET /origines pour la liste des options.
- **Ajout en masse**: Liste CSV avec positions auto en cercle (mêmes origines que la sélection)
- **Création par clic**: Clic sur fond → nouveau nœud (prompt nom + origines)
- **Modification par double-clic**: Nœuds (nom + origines), relations, groupes
- **Groupes visuels**: Un rectangle par origine, pouvant se chevaucher ; un nœud peut être dans plusieurs rectangles
- **Audit nœuds**: Table `node_events` (une ligne par add/modify). **Audit relations**: Table `edge_events` (une ligne par add/delete de relation).
- **Drag & drop**: Sauvegarde auto via endpoint PATCH
- **Export/Import**: Système complet de backup/restore
- **Contrôles de zoom**: Boutons +/-, Ajuster, support trackpad et molette
- **Panning**: Support trackpad et souris, distinction auto avec drag de nœuds
- **Flèches optimisées**: 2px, s'arrêtent 5px avant nœuds
- **Labels protégés**: Fond blanc semi-transparent
- **Collaboration**: Nœuds Proposal dans Neo4j, endpoints /proposals et /proposals/:id/approve|reject
- **Snapshots**: Fichiers JSON dans backend/snapshots/, création auto à chaque approbation, GET/POST /snapshots et restore
- **Frontend mode propose**: URL `?mode=propose`, soumission de propositions, section "Propositions en attente" toujours visible (liste + Rafraîchir) ; en admin : boutons Approuver/Rejeter. En dehors de localhost (production), seul le mode propose est exposé ; l’admin (Tout supprimer, Importer, validation des propositions) n’est accessible qu’en local.
- **Propositions sur le graphe**: Les propositions en attente sont affichées sur le graphe (loadPendingOnGraph après loadGraph) avec styles transparents : classes Cytoscape `pending`, `pending-modify`, `pending-delete` pour distinguer ajouts/modifications/suppressions proposés.
- **Tests backend**: Suite Jest dans backend/**tests** (person, relation, proposals, snapshots, export-import), `npm test`
- **Environnement**: `.env` à la racine (optionnel), dotenv dans le backend ; NEO4J_*, PORT, CORS_ORIGIN ; frontend API_BASE = localhost:8080 → localhost:3000, sinon origin
- **Déploiement**: `DEPLOI.md` — Aura Free + Render ; en prod le backend sert le frontend (une URL), snapshots éphémères sur Render sauf stockage externe

### Patterns de Code

- **Frontend**: Vanilla JS avec async/await ; **apiFetch(url, opts)** = fetch avec `credentials: 'include'` pour envoyer le cookie de session
- **Backend**: Express avec runQuery() pour Neo4j, runSql() pour PostgreSQL ; isAdmin(req), requireAdmin, requireAuth
- **Erreurs**: Gestion avec try-catch et codes HTTP appropriés
- **CORS**: Headers manuels ; si CORS_ORIGIN = `*` et requête a Origin, renvoyer cette origine (pour credentials)

### Résolution de Problèmes Courants

1. **Graphe ne s'affiche pas**: Vérifier backend démarré + Neo4j running
2. **ERR_CONNECTION_REFUSED**: Backend pas démarré sur port 3000
3. **CORS / credentials** : Si "Access-Control-Allow-Origin must not be * when credentials is include", le backend renvoie déjà l'origine de la requête quand CORS_ORIGIN est `*` ; vérifier que le front utilise apiFetch (credentials: 'include').
4. **403 sur POST /person (ou relation, import)** : Réservé à l'admin (hostname localhost/127.0.0.1). En production, les utilisateurs passent par POST /proposals.
5. **Nœuds ne bougent pas**: Vérifier autoungrabify: false
6. **Sidebar ne réapparaît pas**: Utiliser transform au lieu de margin-left
7. **Hitbox trop petite**: Augmenter width/height des nœuds (actuellement 60x60)
8. **Mode propose** : Vérifier URL avec `?mode=propose` ou accès hors localhost ; "Votre nom" requis pour soumettre
9. **Auth 503** : DATABASE_URL non défini ; configurer une base PostgreSQL (ex. Supabase) et ajouter DATABASE_URL dans .env.
10. **Tests** : Même Neo4j que le dev (7687, docker-compose). `docker-compose up -d` puis `npm test` dans backend. Tests auth complets : définir DATABASE_URL pour tester register/login/me/logout.
11. **Nom refusé (400)** : Vérifier le format Prénom NOM (ex. Jean DUPONT), pas uniquement le prénom.
12. **Relation non envoyée** : Source et cible doivent être choisies en cliquant sur un nom dans les listes (taper puis cliquer) ; la saisie libre n’est pas acceptée.

### Conventions de Développement

- Pas de framework frontend (vanilla JS)
- Noms de variables en français dans les formulaires
- Console.log pour debugging (visible avec F12)
- Alerts pour feedback utilisateur
- JSON pretty-print pour export (indent: 2)
- Backend : `API_BASE` dans renderer.js déduit selon l’origine (dev local vs prod, voir section Environnement)
- Tests : Jest + supertest, ES modules avec `NODE_OPTIONS=--experimental-vm-modules`, `beforeEach` clearDatabase
