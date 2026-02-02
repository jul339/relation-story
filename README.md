# Relation Story 🌐

Application web de visualisation interactive de graphes de relations entre personnes.

## 🚀 Démarrage Rapide

### Version Web

```bash
# 1. Démarrer Neo4j
docker-compose up -d

# 2. Démarrer le backend
cd backend && npm start

# 3. Servir le frontend
cd frontend && python3 -m http.server 8080
```

Ouvrir http://localhost:8080

## 🛠️ Stack Technique

- **Frontend**: HTML/CSS/JavaScript + Cytoscape.js
- **Backend**: Node.js + Express
- **Database**: Neo4j 5
- **Deployment**: Docker Compose

## ✨ Fonctionnalités

### 👥 Gestion des Nœuds
- ➕ **Ajout individuel** : formulaire avec positions optionnelles (calcul auto)
- 📝 **Ajout en masse** : liste de noms séparés par virgules
- 🖱️ **Clic pour créer** : cliquez sur le graphe pour ajouter un nœud
- ✏️ **Double-clic pour modifier** : nom, origine
- 🗑️ **Double-clic pour supprimer** : confirmation requise
- 🎯 **Drag & drop** : déplacez les nœuds avec sauvegarde auto

### 🔗 Gestion des Relations
- ➕ **Création** : FAMILLE (bleu), AMIS (vert), AMOUR (rouge)
- ✏️ **Double-clic** : changer le type ou supprimer
- 🎨 **Flèches optimisées** : fines, s'arrêtent avant les nœuds

### 🎨 Organisation Visuelle
- 📦 **Groupes automatiques** : rectangles arrondis par origine
- 🌈 **Couleurs par origine** : Famille, Travail, École, Amis, Sport
- 💡 **Labels protégés** : fond blanc semi-transparent

### 🔍 Navigation
- 🔍 **Zoom** : molette, trackpad (pinch), boutons +/-
- 📐 **Ajustement auto** : bouton pour voir tout le graphe
- 🖱️ **Panning** : trackpad (2 doigts), clic sur fond

### 💾 Sauvegarde
- 📤 **Export** : téléchargement JSON
- 📥 **Import** : restauration complète
- 🔄 **Auto-save** : positions sauvegardées après drag

### 🎛️ Interface
- 🎨 **Sidebar toggleable** : bouton "≡ Menu"
- 📊 **Formulaires intuitifs** : ajout individuel et en masse
- 🎯 **Contrôles directs** : double-clic sur les éléments

## 📚 Documentation

- [AGENTS.md](./AGENTS.md) - Documentation complète pour les LLM
- [.cursorrules](./.cursorrules) - Règles du projet pour Cursor

## 🎮 Interactions

### Créer
- **Clic sur fond vide** → Crée un nœud aux coordonnées du clic
- **Formulaire individuel** → Nom + origine (optionnels : X, Y)
- **Formulaire liste** → Noms séparés par virgules (positions auto)

### Modifier
- **Double-clic sur nœud** → Menu modifier/supprimer
- **Double-clic sur relation** → Menu changer type/supprimer
- **Double-clic sur groupe** → Voir membres/dissoudre

### Organiser
- **Drag nœud** → Déplace et sauvegarde automatiquement
- **Zoom** : Molette / Trackpad pinch / Boutons +/-
- **Pan** : Trackpad 2 doigts / Clic fond + déplacement

## 🔗 Ports

- Frontend: 8080
- Backend API: 3000
- Neo4j Browser: 7474
- Neo4j Bolt: 7687
