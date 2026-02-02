# Relation Story - Documentation pour Agents IA

## 🎯 Vue d'ensemble
Application web permettant de créer et visualiser un graphe de relations entre personnes. Les utilisateurs peuvent ajouter des personnes, créer des relations entre elles, et déplacer les nœuds pour organiser visuellement le graphe.

## 🏗️ Architecture

### Backend (Node.js + Express)
**Fichier principal**: `backend/index.js`
- Port: 3000
- CORS activé pour toutes origines
- Connexion Neo4j via `neo4j.js`

**Configuration Neo4j**: `backend/neo4j.js`
- URI: bolt://localhost:7687
- User: neo4j
- Password: password

### Frontend (HTML/CSS/JS + Cytoscape.js)
**Fichiers**:
- `frontend/index.html` - Structure avec formulaires et conteneur graphe
- `frontend/renderer.js` - Initialisation Cytoscape, gestion événements, API calls
- `frontend/style.css` - Styles responsive avec sidebar toggleable

**Serveur**: Python HTTP server sur port 8080

### Base de données (Neo4j 5)
**Docker Compose**: `docker-compose.yml`
- Ports: 7474 (HTTP), 7687 (Bolt)
- Volume persistant: neo4j_data

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
2. **Formulaire Personne**: nom (unique), origine (optionnel), x, y
3. **Formulaire Relation**: source, cible, type
4. **Contrôles du graphe**: Zoom +, Zoom -, Ajuster
5. **Actions**: Rafraîchir, Tout supprimer
6. **Sauvegarde**: Exporter, Importer

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
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Neo4j Browser: http://localhost:7474

## 📝 Points Importants pour l'IA

### Historique des Changements
- **Modèle simplifié**: Anciennement nom+prénom, maintenant juste nom unique
- **Coordonnées obligatoires**: x et y requis pour chaque nœud
- **Origine optionnelle**: Peut être null/undefined
- **Drag & drop**: Sauvegarde auto via endpoint PATCH
- **Export/Import**: Système complet de backup/restore
- **Contrôles de zoom**: Boutons +/-, Ajuster, support trackpad et molette
- **Panning réactivé**: Support trackpad et souris, distinction auto avec drag de nœuds

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

### Conventions de Développement
- Pas de framework frontend (vanilla JS)
- Noms de variables en français dans les formulaires
- Console.log pour debugging (visible avec F12)
- Alerts pour feedback utilisateur
- JSON pretty-print pour export (indent: 2)
