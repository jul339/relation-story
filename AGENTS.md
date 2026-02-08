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

**Configuration Neo4j**: `backend/neo4j.js`

- Lit `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` (défauts locaux : bolt://localhost:7687, neo4j, password)
- En production (ex. Neo4j Aura) : définir ces variables dans `.env` ou chez l’hébergeur

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
- Commande : `npm test` (Jest + supertest, Neo4j réel requis)

## 📊 Modèle de Données

### Nœud `Person`

```cypher
(:Person {
  nom: String,      // UNIQUE, REQUIRED - identifiant de la personne
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
  "nodes": [{ "id": "nom", "nom": "...", "origine": "...", "x": 0, "y": 0 }],
  "edges": [{ "source": "nom1", "target": "nom2", "type": "AMIS" }]
}
```

### POST /person

Crée une nouvelle personne

```json
Body: { "nom": "Jean", "origine": "Travail", "x": 100, "y": 200 }
Response: 201 Created
Erreur: 400 si nom ou coordonnées manquantes
```

### DELETE /person

Supprime une personne et ses relations

```json
Body: { "nom": "Jean" }
Response: 200 OK
```

### PATCH /person/coordinates

Met à jour les coordonnées d'une personne

```json
Body: { "nom": "Jean", "x": 150, "y": 250 }
Response: 200 OK
```

### PATCH /person

Met à jour le nom et/ou l'origine d'une personne

```json
Body: { "oldNom": "Jean", "nom": "Jean-Paul", "origine": "Travail" }
Response: 200 OK
```

### POST /relation

Crée une relation entre deux personnes

```json
Body: { "source": "Jean", "target": "Marie", "type": "AMIS" }
Response: 201 Created
```

### DELETE /relation

Supprime une relation

```json
Body: { "source": "Jean", "target": "Marie", "type": "AMIS" }
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
- **POST /proposals/:id/approve** – Approuver (applique le changement, crée un snapshot). Body: `{ reviewedBy, comment? }`.
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
3. **Mode admin** (sans paramètre) : bloc "Propositions en attente" avec liste, boutons Approuver/Rejeter, Rafraîchir.
4. **Formulaire Personne**: nom (unique), origine (optionnel), x/y (auto si vide)
5. **Formulaire Liste**: noms CSV, origine optionnelle (positions auto)
6. **Formulaire Relation**: source, cible, type
7. **Contrôles du graphe**: Zoom +, Zoom -, Ajuster
8. **Actions**: Rafraîchir, Tout supprimer
9. **Sauvegarde**: Exporter, Importer

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

## 🔧 Environnement (dev / production)

- **Fichier `.env`** à la **racine du projet** (optionnel en dev). Le backend charge ce fichier via `dotenv` (dépendance dans `backend/package.json`).
- **`.env.example`** à la racine liste les variables possibles ; copier en `.env` et adapter. Ne pas commiter `.env` (déjà dans `.gitignore`).

**Variables d’environnement (backend)**:

| Variable        | Défaut (dev local)     | Production (ex.)                          |
|----------------|------------------------|-------------------------------------------|
| `NEO4J_URI`    | bolt://localhost:7687  | neo4j+s://xxx.databases.neo4j.io (Aura)   |
| `NEO4J_USER`   | neo4j                  | neo4j                                     |
| `NEO4J_PASSWORD` | password             | mot de passe Aura                          |
| `PORT`         | 3000                   | fourni par l’hébergeur (Render, etc.)     |
| `CORS_ORIGIN`  | *                      | https://ton-frontend.com (origine du front) |

- **Sans `.env`** : le backend utilise les défauts ci‑dessus (Neo4j local, port 3000, CORS `*`).
- **Frontend** : en production, si le front est servi depuis le **même domaine** que l’API, `API_BASE = window.location.origin` suffit. Sinon (front et API sur domaines différents), il faudrait adapter la logique dans `renderer.js` (ex. URL en dur ou endpoint de config).

## 📝 Points Importants pour l'IA

### Historique des Changements

- **Modèle simplifié**: Anciennement nom+prénom, maintenant juste nom unique
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
- **Frontend mode propose**: URL `?mode=propose`, soumission de propositions, section admin "Propositions en attente"
- **Tests backend**: Suite Jest dans backend/**tests** (person, relation, proposals, snapshots, export-import), `npm test`
- **Environnement**: `.env` à la racine (optionnel), dotenv dans le backend ; NEO4J_*, PORT, CORS_ORIGIN ; frontend API_BASE = localhost:8080 → localhost:3000, sinon origin

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
7. **Tests** : Neo4j doit être démarré pour les tests d'intégration (`npm test` dans backend)

### Conventions de Développement

- Pas de framework frontend (vanilla JS)
- Noms de variables en français dans les formulaires
- Console.log pour debugging (visible avec F12)
- Alerts pour feedback utilisateur
- JSON pretty-print pour export (indent: 2)
- Backend : `API_BASE` dans renderer.js déduit selon l’origine (dev local vs prod, voir section Environnement)
- Tests : Jest + supertest, ES modules avec `NODE_OPTIONS=--experimental-vm-modules`, `beforeEach` clearDatabase
