# Relation Story - Documentation pour Agents IA

## 🎯 Vue d'ensemble

Application web permettant de créer et visualiser un graphe de relations entre personnes. Les utilisateurs peuvent ajouter des personnes, créer des relations entre elles, et déplacer les nœuds pour organiser visuellement le graphe. **Mode collaborateur** : partage du lien avec `?mode=propose` pour que des tiers soumettent des propositions (ajout/modification/suppression) que l'administrateur peut approuver ou rejeter. Les approbations créent des snapshots (versions) du graphe.

## 🏗️ Architecture

### Backend (Node.js + Express)

**Fichier principal**: `backend/index.js`

- Port: `process.env.PORT` (défaut 3000)
- CORS: `process.env.CORS_ORIGIN` (défaut `*` en dev)
- Connexion Neo4j via `neo4j.js` (variables d’environnement, voir ci‑dessous)
- Module snapshots : `backend/snapshots.js` (création/liste/restauration de versions JSON)
- Dossier `backend/snapshots/` : fichiers JSON des versions (format `snapshot-{timestamp}-{id}.json`)
- **Production** : en dehors des tests, le backend sert le frontend en statique (`express.static("../frontend")`) pour un déploiement en une seule URL.

**Configuration Neo4j**: `backend/neo4j.js`

- Lit `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`. Valeurs par défaut dans le fichier : `bolt://127.0.0.1:7687`, neo4j, password (utilisées si variables absentes, ex. en mode test sans dotenv).
- En production (ex. Neo4j Aura) : définir ces variables dans `.env` ou chez l’hébergeur (voir `DEPLOI.md`)

### Frontend (HTML/CSS/JS + Cytoscape.js)

**Fichiers**:

- `frontend/index.html` - Structure avec formulaires et conteneur graphe
- `frontend/renderer.js` - Initialisation Cytoscape, gestion événements, API calls. `API_BASE` : en dev (localhost:8080) → `http://localhost:3000`, sinon `window.location.origin` (prod même domaine).
- `frontend/style.css` - Styles responsive avec sidebar toggleable

**Serveur**: Python HTTP server sur port 8080 (dev local)

### Base de données (Neo4j 5)

**Docker Compose**: `docker-compose.yml`

- Ports: 7474 (HTTP), 7687 (Bolt)
- Volume persistant: neo4j_data

### Tests Backend

**Dossier**: `backend/__tests__/`

- `setup.js` : clearDatabase, createTestPerson, createTestProposal, etc.
- `person.test.js`, `relation.test.js`, `proposals.test.js`, `snapshots.test.js`, `export-import.test.js`
- Commande : `npm test` (Jest + supertest, Neo4j requis).
- **Base pour les tests** : dev et tests utilisent la même Neo4j (docker-compose, **7687**). Défaut `bolt://127.0.0.1:7687` pour limiter les ECONNRESET sous WSL. Voir `backend/__tests__/README.md`.

## 📊 Modèle de Données

### Nœud `Person`

- **Format du nom** : obligatoire **Prénom NOM** (regex `^[A-Z][a-z]* [A-Z][A-Z-]*$`). Exemple : `Jean HEUDE-LEGRANG`. Validé côté backend (POST /person, PATCH /person, approve add_node/modify_node) et frontend.

```cypher
(:Person {
  nom: String,      // UNIQUE, REQUIRED - format "Prénom NOM" (ex. Jean DUPONT)
  origine: String,  // OPTIONAL - origine de la personne
  x: Number,        // REQUIRED - position X dans le graphe
  y: Number         // REQUIRED - position Y dans le graphe
})
```

### Relations

- `[:FAMILLE]` - Relation familiale (couleur: bleu)
- `[:AMIS]` - Relation amicale (couleur: vert)
- `[:AMOUR]` - Relation amoureuse (couleur: rouge)

### Nœud `Proposal` (collaboration)

Séparé des Person (pas de relations entre eux). Stocke les propositions en attente de validation.

```cypher
(:Proposal {
  id: String,           // UUID unique
  authorName: String,
  authorEmail: String,  // optionnel
  type: String,        // add_node | add_relation | modify_node | delete_node | delete_relation
  data: String,        // JSON stringifié des données
  status: String,      // pending | approved | rejected
  createdAt: String,   // ISO timestamp
  reviewedAt: String,
  reviewedBy: String,
  comment: String
})
```

## 🔌 API REST

### GET /graph

Récupère tous les nœuds et relations

```json
Response: {
  "nodes": [{ "id": "nom", "nom": "Jean DUPONT", "origine": "...", "x": 0, "y": 0 }],
  "edges": [{ "source": "Jean DUPONT", "target": "Marie MARTIN", "type": "AMIS" }]
}
```

### GET /persons/similar

Retourne les 3 noms existants les plus proches (distance de Levenshtein) pour éviter les doublons à la saisie.

```json
Query: ?q=jean
Response: { "similar": ["Jean DUPONT", "Jeanne MARTIN", "Juan GARCIA"] }
```

### POST /person

Crée une nouvelle personne. Le nom doit respecter le format Prénom NOM.

```json
Body: { "nom": "Jean DUPONT", "origine": "Travail", "x": 100, "y": 200 }
Response: 201 Created
Erreur: 400 si nom manquant, format invalide (Prénom NOM) ou coordonnées manquantes
```

### DELETE /person

Supprime une personne et ses relations

```json
Body: { "nom": "Jean DUPONT" }
Response: 200 OK
```

### PATCH /person/coordinates

Met à jour les coordonnées d'une personne

```json
Body: { "nom": "Jean DUPONT", "x": 150, "y": 250 }
Response: 200 OK
```

### PATCH /person

Met à jour le nom et/ou l'origine d'une personne. Le nouveau nom doit respecter le format Prénom NOM.

```json
Body: { "oldNom": "Jean DUPONT", "nom": "Jean MARTIN", "origine": "Travail" }
Response: 200 OK
Erreur: 400 si nouveau nom au mauvais format
```

### POST /relation

Crée une relation entre deux personnes

```json
Body: { "source": "Jean DUPONT", "target": "Marie MARTIN", "type": "AMIS" }
Response: 201 Created
```

### DELETE /relation

Supprime une relation

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

Importe et restaure les données (supprime tout avant)

```json
Body: { "nodes": [...], "edges": [...] }
Response: { "message": "Import réussi", "nodesCount": 5, "edgesCount": 3 }
```

### Propositions (collaboration)

- **POST /proposals** – Soumettre une proposition. Body: `{ authorName, authorEmail?, type, data }`. Types: add_node, add_relation, modify_node, delete_node, delete_relation.
- **GET /proposals/stats** – Statistiques (pending, approved, rejected, total).
- **GET /proposals** – Liste des propositions. Query: `?status=pending|approved|rejected|all` (défaut: pending).
- **GET /proposals/:id** – Détails d'une proposition.
- **POST /proposals/:id/approve** – Approuver (applique le changement, crée un snapshot). Body: `{ reviewedBy, comment? }`. Pour add_node et modify_node, le nom (data.nom / data.newNom) doit respecter le format Prénom NOM, sinon 400.
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

1. **Sidebar toggleable** (bouton "≡ Menu" en haut à gauche)
2. **Mode collaborateur** (`?mode=propose`) : bloc "Proposer des modifications" (Votre nom, email), stats "X proposition(s) en attente". Masqué : Tout supprimer, Importer.
3. **Propositions en attente** : section toujours visible avec liste et bouton Rafraîchir. En mode admin : boutons Approuver/Rejeter sur chaque proposition. En mode propose : liste en lecture seule.
4. **Formulaire Personne** : consigne « Nom en majuscule OBLIGATOIRE, exemple : Jean HEUDE-LEGRANG » ; champ nom (format Prénom NOM, validé par regex) ; sous le champ, affichage des **3 noms les plus proches** existants (GET /persons/similar) pour éviter les doublons ; origine (optionnel), x/y (auto si vide).
5. **Formulaire Liste** : noms CSV au format Prénom NOM, origine optionnelle (positions auto)
6. **Formulaire Relation**: source, cible, type
7. **Contrôles du graphe**: Zoom +, Zoom -, Ajuster
8. **Actions**: Rafraîchir, Tout supprimer
9. **Sauvegarde**: Exporter, Importer

### Propositions en attente sur le graphe

Les propositions en attente sont affichées sur le graphe avec une transparence pour les distinguer des éléments validés. Au chargement du graphe, `loadPendingOnGraph()` récupère les propositions (GET /proposals?status=pending) et :

- **add_node** : nœuds ajoutés avec la classe Cytoscape `pending` (opacity 0,5)
- **add_relation** : arêtes ajoutées avec la classe `pending` (opacity 0,45, trait en pointillés)
- **modify_node** : nœud existant reçoit la classe `pending-modify` (opacity 0,6)
- **delete_node** : nœud existant reçoit la classe `pending-delete` (opacity 0,4)
- **delete_relation** : arête existante reçoit la classe `pending-delete` (opacity 0,35, pointillés)

### Interactions Directes

- **Clic sur fond** → Crée un nœud (ou envoie une proposition en mode `?mode=propose`)
- **Double-clic nœud** → Menu modifier/supprimer (ou proposition en mode propose)
- **Double-clic relation** → Menu changer type/supprimer (ou proposition en mode propose)
- **Double-clic groupe** → Info/Dissoudre (en mode propose : message "Seul l'administrateur peut dissoudre")
- **Drag nœud** → Déplace avec auto-save (en mode propose : pas de sauvegarde, drag visuel seulement)

### Mode collaborateur (URL `?mode=propose`)

- Détection : `urlParams.get("mode") === "propose"` dans `renderer.js`.
- Tous les ajouts/modifications/suppressions passent par **POST /proposals** au lieu des endpoints directs.
- Champ "Votre nom" obligatoire pour soumettre une proposition.
- Lien à partager pour collaborateurs : `http://localhost:8080?mode=propose`.

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
- **Noms similaires** : GET /persons/similar?q=xxx (3 noms les plus proches en Levenshtein), affichés sous le champ nom pour éviter doublons.
- **Modèle simplifié** : Anciennement nom+prénom, maintenant nom unique au format Prénom NOM
- **Coordonnées auto**: Calcul intelligent si non spécifiées
- **Origine optionnelle**: Peut être null/undefined
- **Ajout en masse**: Liste CSV avec positions auto en cercle
- **Création par clic**: Clic sur fond → nouveau nœud
- **Modification par double-clic**: Nœuds, relations, groupes
- **Groupes visuels**: Rectangles arrondis par origine
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

- **Frontend**: Vanilla JS avec async/await pour les API calls
- **Backend**: Express avec runQuery() pour Neo4j
- **Erreurs**: Gestion avec try-catch et codes HTTP appropriés
- **CORS**: Headers manuels dans le backend

### Résolution de Problèmes Courants

1. **Graphe ne s'affiche pas**: Vérifier backend démarré + Neo4j running
2. **ERR_CONNECTION_REFUSED**: Backend pas démarré sur port 3000
3. **Nœuds ne bougent pas**: Vérifier autoungrabify: false
4. **Sidebar ne réapparaît pas**: Utiliser transform au lieu de margin-left
5. **Hitbox trop petite**: Augmenter width/height des nœuds (actuellement 60x60)
6. **Mode propose** : Vérifier URL avec `?mode=propose` ; "Votre nom" requis pour soumettre
7. **Tests** : Même Neo4j que le dev (7687, docker-compose). `docker-compose up -d` puis `npm test` dans backend. Les défauts Neo4j sont dans `neo4j.js` (uri/user/password), donc les tests peuvent tourner sans `.env`. Sous WSL, éviter un second conteneur limite les ECONNRESET.
8. **Nom refusé (400)** : Vérifier le format Prénom NOM (ex. Jean DUPONT), pas uniquement le prénom.

### Conventions de Développement

- Pas de framework frontend (vanilla JS)
- Noms de variables en français dans les formulaires
- Console.log pour debugging (visible avec F12)
- Alerts pour feedback utilisateur
- JSON pretty-print pour export (indent: 2)
- Backend : `API_BASE` dans renderer.js déduit selon l’origine (dev local vs prod, voir section Environnement)
- Tests : Jest + supertest, ES modules avec `NODE_OPTIONS=--experimental-vm-modules`, `beforeEach` clearDatabase
