import express from "express";
import { runQuery } from "./neo4j.js";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // autorise toutes les origines
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // prévol OPTIONS
    }
    next();
});

/* ---------- GET GRAPH ---------- */
app.get("/graph", async (req, res) => {
    const query = `
    MATCH (p:Person)
    OPTIONAL MATCH (p)-[r]->(q:Person)
    RETURN p, r, q
  `;

    const records = await runQuery(query);

    const nodes = {};
    const edges = [];

    records.forEach(record => {
        const p = record.get("p");
        const q = record.get("q");
        const r = record.get("r");

        const pId = p.properties.nom;
        nodes[pId] = {
            id: pId,
            ...p.properties
        };

        if (q && r) {
            const qId = q.properties.nom;
            nodes[qId] = {
                id: qId,
                ...q.properties
            };

            edges.push({
                source: pId,
                target: qId,
                type: r.type
            });
        }
    });

    res.json({
        nodes: Object.values(nodes),
        edges
    });
});

/* ---------- ADD PERSON ---------- */
app.post("/person", async (req, res) => {
    const { nom, origine, x, y } = req.body;

    // Vérifier que le nom et les coordonnées sont obligatoires
    if (!nom) {
        return res.status(400).json({ 
            error: "Le nom est obligatoire" 
        });
    }
    if (x === undefined || y === undefined) {
        return res.status(400).json({ 
            error: "Les coordonnées x et y sont obligatoires" 
        });
    }

    const query = `
    CREATE (:Person {
      nom: $nom,
      origine: $origine,
      x: $x,
      y: $y
    })
  `;

    await runQuery(query, { nom, origine, x, y });
    res.sendStatus(201);
});

/* ---------- UPDATE PERSON COORDINATES ---------- */
app.patch("/person/coordinates", async (req, res) => {
    const { nom, x, y } = req.body;

    const query = `
    MATCH (p:Person {nom:$nom})
    SET p.x = $x, p.y = $y
  `;

    await runQuery(query, { nom, x, y });
    res.sendStatus(200);
});

/* ---------- UPDATE PERSON ---------- */
app.patch("/person", async (req, res) => {
    const { oldNom, nom, origine } = req.body;

    if (!oldNom) {
        return res.status(400).json({ error: "oldNom est requis" });
    }

    const query = `
    MATCH (p:Person {nom:$oldNom})
    SET p.nom = $nom, p.origine = $origine
  `;

    await runQuery(query, { oldNom, nom: nom || oldNom, origine });
    res.sendStatus(200);
});

/* ---------- DELETE PERSON ---------- */
app.delete("/person", async (req, res) => {
    const { nom } = req.body;

    const query = `
    MATCH (p:Person {nom:$nom})
    DETACH DELETE p
  `;

    await runQuery(query, { nom });
    res.sendStatus(200);
});

/* ---------- DELETE ALL ---------- */
app.delete("/all", async (req, res) => {
    const query = `MATCH (n) DETACH DELETE n`;
    await runQuery(query);
    res.json({ message: "Tous les nœuds et relations ont été supprimés" });
});

/* ---------- EXPORT ---------- */
app.get("/export", async (req, res) => {
    const query = `
    MATCH (p:Person)
    OPTIONAL MATCH (p)-[r]->(q:Person)
    RETURN p, r, q
  `;

    const records = await runQuery(query);
    const nodes = {};
    const edges = [];

    records.forEach(record => {
        const p = record.get("p");
        const q = record.get("q");
        const r = record.get("r");

        nodes[p.properties.nom] = p.properties;

        if (q && r) {
            nodes[q.properties.nom] = q.properties;
            edges.push({
                source: p.properties.nom,
                target: q.properties.nom,
                type: r.type
            });
        }
    });

    res.json({
        nodes: Object.values(nodes),
        edges,
        exportDate: new Date().toISOString()
    });
});

/* ---------- IMPORT ---------- */
app.post("/import", async (req, res) => {
    const { nodes, edges } = req.body;

    try {
        // Supprimer toutes les données existantes
        await runQuery(`MATCH (n) DETACH DELETE n`);

        // Créer tous les nœuds
        for (const node of nodes) {
            const query = `
                CREATE (:Person {
                    nom: $nom,
                    origine: $origine,
                    x: $x,
                    y: $y
                })
            `;
            await runQuery(query, {
                nom: node.nom,
                origine: node.origine || null,
                x: node.x || 0,
                y: node.y || 0
            });
        }

        // Créer toutes les relations
        for (const edge of edges) {
            const query = `
                MATCH (a:Person {nom:$source})
                MATCH (b:Person {nom:$target})
                CREATE (a)-[r:${edge.type}]->(b)
            `;
            await runQuery(query, {
                source: edge.source,
                target: edge.target
            });
        }

        res.json({ message: "Import réussi", nodesCount: nodes.length, edgesCount: edges.length });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'import", details: error.message });
    }
});

/* ---------- ADD RELATION ---------- */
app.post("/relation", async (req, res) => {
    const { source, target, type } = req.body;

    const query = `
    MATCH (a:Person {nom:$source})
    MATCH (b:Person {nom:$target})
    CREATE (a)-[r:${type}]->(b)
  `;

    await runQuery(query, { source, target });
    res.sendStatus(201);
});

/* ---------- DELETE RELATION ---------- */
app.delete("/relation", async (req, res) => {
    const { source, target, type } = req.body;

    const query = `
    MATCH (a:Person {nom:$source})
    -[r:${type}]->
    (b:Person {nom:$target})
    DELETE r
  `;

    await runQuery(query, { source, target });
    res.sendStatus(200);
});

/* ---------- START SERVER ---------- */
app.listen(3000, () => {
    console.log("Backend running on http://localhost:3000");
});
