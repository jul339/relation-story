# Relation Story 🌐

Application web de visualisation interactive de graphes de relations entre personnes.

## 🚀 Démarrage Rapide

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

- ➕ Ajout de personnes avec positions personnalisées
- 🔗 Création de relations (FAMILLE, AMIS, AMOUR)
- 🖱️ Drag & drop des nœuds avec sauvegarde automatique
- 🔍 Zoom & panning (molette, trackpad, boutons +/-)
- 📐 Ajustement automatique pour voir tout le graphe
- 💾 Export/Import de la base en JSON
- 🎨 Interface intuitive avec sidebar toggleable

## 📚 Documentation

- [AGENTS.md](./AGENTS.md) - Documentation complète pour les LLM
- [.cursorrules](./.cursorrules) - Règles du projet pour Cursor

## 🔗 Ports

- Frontend: 8080
- Backend API: 3000
- Neo4j Browser: 7474
- Neo4j Bolt: 7687
