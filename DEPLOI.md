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

7. **Mettre à jour CORS_ORIGIN** (après le premier déploiement) :
   - En haut de la page du service Render, tu vois l’**URL** du site (ex. `https://relation-story-abc12.onrender.com`). Copie-la.
   - Dans le menu de gauche : **Environment** (Variables d’environnement).
   - Repère la ligne **CORS_ORIGIN** et clique sur **Edit** (crayon) ou modifie la valeur.
   - Colle l’URL exacte (ex. `https://relation-story-abc12.onrender.com`), **sans** slash final.
   - Clique sur **Save Changes**. Render redéploie automatiquement avec la nouvelle variable.

---

## 3. Utilisation

- **Site** : ouvre `https://ton-service.onrender.com` (l’URL Render).
- Le frontend est servi par le même serveur ; l’API est sur la même origine, rien à configurer de plus.

---

## 4. Limites (gratuit)

- **Render Free** : le service “s’endort” après ~15 min sans visite ; le premier chargement peut prendre 30–60 s.
- **Aura Free** : 1 base, 200 k nœuds, 400 k relations, suffisant pour très peu d’utilisateurs.

---

## 5. Admin en local avec Neo4j de production

Pour utiliser le **mode admin** en local sur la base Aura (prod), utilise un **seul** `.env` : commente les lignes Neo4j **dev** (Docker) et décommente celles **prod** (Aura), ou l’inverse selon le cas.

Exemple dans `.env` :

```bash
# --- Dev (Neo4j Docker local) ---
# NEO4J_URI=bolt://127.0.0.1:7687
# NEO4J_USER=neo4j
# NEO4J_PASSWORD=password

# --- Prod (Aura) — décommenter pour admin local sur prod ---
NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=ton_mot_de_passe_aura
```

Puis `cd backend && npm start` et frontend en local sur `http://localhost:8080`. Garde la Neo4j Docker pour les **tests** (`npm test` ne charge pas `.env` et utilise la base locale).

---

## 6. Snapshots (versions)

Les snapshots sont enregistrés dans le **fichier** (`backend/snapshots/`). Sur Render, le disque est éphémère : à chaque redéploiement ou redémarrage, ils sont perdus. Pour les garder, il faudrait plus tard utiliser un stockage externe (ex. S3). Pour un usage léger, tu peux ignorer ou accepter cette limite.
   