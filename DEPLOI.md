# Héberger Relation Story (option la moins chère)

Une seule app (backend + frontend) sur **Render** (gratuit) + base **Neo4j Aura Free** (gratuite).

---

## 1. Neo4j Aura (gratuit)

1. Va sur [console.neo4j.io](https://console.neo4j.io) et connecte-toi.
2. **Create** → **New Instance** → choisis **AuraDB Free**.
3. Nomme l’instance (ex. `relation-story`), région au choix, crée.
4. À la création, **note** :
   - **URI** (ex. `neo4j+s://xxxx.databases.neo4j.io`)
   - **Password** (affiché une seule fois ; user = `neo4j`).

---

## 2. Render (gratuit)

1. Va sur [render.com](https://render.com), crée un compte (GitHub possible).
2. **New** → **Web Service**.
3. Connecte ton dépôt Git (GitHub/GitLab) et choisis le repo `relation-story`.
4. **Configuration** :
   - **Name** : `relation-story` (ou autre).
   - **Region** : proche de toi.
   - **Root Directory** : laisser vide.
   - **Runtime** : Node.
   - **Build Command** : `cd backend && npm install`
   - **Start Command** : `cd backend && node index.js`
   - **Instance Type** : Free.

5. **Environment** (Environment Variables) — ajoute :

   | Key             | Value |
   |-----------------|--------|
   | `NODE_ENV`      | `production` |
   | `NEO4J_URI`     | ton URI Aura (ex. `neo4j+s://xxxx.databases.neo4j.io`) |
   | `NEO4J_USER`    | `neo4j` |
   | `NEO4J_PASSWORD`| le mot de passe Aura |
   | `CORS_ORIGIN`   | `https://ton-service.onrender.com` (remplace par l’URL que Render t’affichera après création, ex. `https://relation-story-xxxx.onrender.com`) |

6. **Create Web Service**.

Après le premier déploiement, Render te donne une URL du type `https://relation-story-xxxx.onrender.com`. Remplace dans `CORS_ORIGIN` par cette URL exacte, puis redéploie (ou modifie la variable et sauvegarde).

---

## 3. Utilisation

- **Site** : ouvre `https://ton-service.onrender.com` (l’URL Render).
- Le frontend est servi par le même serveur ; l’API est sur la même origine, rien à configurer de plus.

---

## 4. Limites (gratuit)

- **Render Free** : le service “s’endort” après ~15 min sans visite ; le premier chargement peut prendre 30–60 s.
- **Aura Free** : 1 base, 200 k nœuds, 400 k relations, suffisant pour très peu d’utilisateurs.

---

## 5. Snapshots (versions)

Les snapshots sont enregistrés dans le **fichier** (`backend/snapshots/`). Sur Render, le disque est éphémère : à chaque redéploiement ou redémarrage, ils sont perdus. Pour les garder, il faudrait plus tard utiliser un stockage externe (ex. S3). Pour un usage léger, tu peux ignorer ou accepter cette limite.
