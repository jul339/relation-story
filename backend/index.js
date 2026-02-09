import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import crypto from "crypto";
import { runQuery } from "./neo4j.js";
import { initSnapshotsDir, createSnapshot, listSnapshots, getSnapshotById, restoreSnapshot } from "./snapshots.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV !== "test") {
    dotenv.config({ path: path.join(__dirname, "..", ".env") });
}

// Format nom : Prénom NOM (ex. Jean HEUDE-LEGRANG)
const NOM_REGEX = /^[A-Z][a-z]* [A-Z][A-Z-]*$/;
function isValidNom(nom) {
    return typeof nom === "string" && NOM_REGEX.test(nom.trim());
}

const app = express();
app.use(express.json());

// Initialiser le dossier snapshots au démarrage
initSnapshotsDir();

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // prévol OPTIONS
    }
    next();
});

/* ---------- GET GRAPH ---------- */
app.get("/graph", async (req, res) => {
    try {
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
    } catch (error) {
        console.error("GET /graph error:", error.message);
        res.status(500).json({
            error: "Erreur lors du chargement du graphe",
            details: error.message
        });
    }
});

/* ---------- Noms similaires (éviter doublons) ---------- */
function levenshtein(a, b) {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = 1 + Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]);
        }
    }
    return matrix[b.length][a.length];
}

app.get("/persons/similar", async (req, res) => {
    try {
        const q = (req.query.q || "").trim().toLowerCase();
        const limit = Math.min(15, Math.max(1, parseInt(req.query.limit, 10) || 3));
        if (q.length === 0) {
            return res.json({ similar: [] });
        }
        const query = `MATCH (p:Person) RETURN p.nom AS nom`;
        const records = await runQuery(query);
        const names = records.map(r => r.get("nom"));
        const withDist = names.map(nom => ({ nom, d: levenshtein(q, nom.toLowerCase()) }));
        withDist.sort((a, b) => a.d - b.d);
        const similar = withDist.slice(0, limit).map(x => x.nom);
        res.json({ similar });
    } catch (error) {
        console.error("GET /persons/similar error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

/* ---------- GET PERSON BY NOM ---------- */
app.get("/person/:nom", async (req, res) => {
    const { nom } = req.params;

    const query = `
        MATCH (p:Person {nom: $nom})
        RETURN p
    `;
    const records = await runQuery(query, { nom });

    if (records.length === 0) {
        return res.status(404).json({ error: "Personne non trouvée" });
    }

    const p = records[0].get("p").properties;
    res.json({
        id: p.nom,
        ...p
    });
});

/* ---------- ADD PERSON ---------- */
app.post("/person", async (req, res) => {
    const { nom, origine, x, y } = req.body;

    if (!nom) {
        return res.status(400).json({
            error: "Le nom est obligatoire"
        });
    }
    if (!isValidNom(nom)) {
        return res.status(400).json({
            error: "Le nom doit être au format Prénom NOM (ex. Jean HEUDE-LEGRANG)"
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
    const finalNom = nom || oldNom;
    if (!isValidNom(finalNom)) {
        return res.status(400).json({
            error: "Le nom doit être au format Prénom NOM (ex. Jean HEUDE-LEGRANG)"
        });
    }

    const query = `
    MATCH (p:Person {nom:$oldNom})
    SET p.nom = $nom, p.origine = $origine
  `;

    await runQuery(query, { oldNom, nom: finalNom, origine });
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
// app.delete("/all", async (req, res) => {
//     const query = `MATCH (n) DETACH DELETE n`;
//     await runQuery(query);
//     res.json({ message: "Tous les nœuds et relations ont été supprimés" });
// });

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

/* ---------- PROPOSALS ENDPOINTS ---------- */

// Soumettre une proposition (public)
app.post("/proposals", async (req, res) => {
    const { authorName, authorEmail, type, data } = req.body;

    // Validation
    if (!authorName || !type || !data) {
        return res.status(400).json({
            error: "authorName, type et data sont obligatoires"
        });
    }

    const validTypes = ["add_node", "add_relation", "modify_node", "delete_node", "delete_relation"];
    if (!validTypes.includes(type)) {
        return res.status(400).json({
            error: `Type invalide. Types acceptés: ${validTypes.join(", ")}`
        });
    }

    try {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        const query = `
            CREATE (p:Proposal {
                id: $id,
                authorName: $authorName,
                authorEmail: $authorEmail,
                type: $type,
                data: $data,
                status: 'pending',
                createdAt: $createdAt,
                reviewedAt: null,
                reviewedBy: null,
                comment: null
            })
            RETURN p
        `;

        await runQuery(query, {
            id,
            authorName,
            authorEmail: authorEmail || null,
            type,
            data: JSON.stringify(data),
            createdAt
        });

        res.status(201).json({
            id,
            message: "Proposition créée avec succès"
        });
    } catch (error) {
        res.status(500).json({
            error: "Erreur lors de la création de la proposition",
            details: error.message
        });
    }
});

// Statistiques publiques
app.get("/proposals/stats", async (req, res) => {
    try {
        const query = `
            MATCH (p:Proposal)
            RETURN p.status as status, count(p) as count
        `;

        const records = await runQuery(query);
        const stats = {
            pending: 0,
            approved: 0,
            rejected: 0,
            total: 0
        };

        records.forEach(record => {
            const status = record.get("status");
            const count = record.get("count").toNumber();
            stats[status] = count;
            stats.total += count;
        });

        res.json(stats);
    } catch (error) {
        res.status(500).json({
            error: "Erreur lors de la récupération des statistiques",
            details: error.message
        });
    }
});

// Liste des propositions (admin)
app.get("/proposals", async (req, res) => {
    const status = req.query.status || "pending";

    try {
        let query;
        if (status === "all") {
            query = `
                MATCH (p:Proposal)
                RETURN p
                ORDER BY p.createdAt DESC
            `;
        } else {
            query = `
                MATCH (p:Proposal)
                WHERE p.status = $status
                RETURN p
                ORDER BY p.createdAt DESC
            `;
        }

        const records = await runQuery(query, { status });
        const proposals = records.map(record => {
            const props = record.get("p").properties;
            return {
                ...props,
                data: JSON.parse(props.data)
            };
        });

        res.json(proposals);
    } catch (error) {
        res.status(500).json({
            error: "Erreur lors de la récupération des propositions",
            details: error.message
        });
    }
});

// Détails d'une proposition (admin)
app.get("/proposals/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            MATCH (p:Proposal {id: $id})
            RETURN p
        `;

        const records = await runQuery(query, { id });

        if (records.length === 0) {
            return res.status(404).json({ error: "Proposition introuvable" });
        }

        const props = records[0].get("p").properties;
        const proposal = {
            ...props,
            data: JSON.parse(props.data)
        };

        res.json(proposal);
    } catch (error) {
        res.status(500).json({
            error: "Erreur lors de la récupération de la proposition",
            details: error.message
        });
    }
});

// Approuver une proposition (admin)
app.post("/proposals/:id/approve", async (req, res) => {
    const { id } = req.params;
    const { reviewedBy, comment } = req.body;

    if (!reviewedBy) {
        return res.status(400).json({ error: "reviewedBy est obligatoire" });
    }

    try {
        // Récupérer la proposition
        const getQuery = `MATCH (p:Proposal {id: $id}) RETURN p`;
        const records = await runQuery(getQuery, { id });

        if (records.length === 0) {
            return res.status(404).json({ error: "Proposition introuvable" });
        }

        const props = records[0].get("p").properties;
        const proposal = {
            ...props,
            data: JSON.parse(props.data)
        };

        if (proposal.status !== "pending") {
            return res.status(400).json({
                error: `Proposition déjà ${proposal.status}`
            });
        }

        // Appliquer le changement selon le type
        const { type, data } = proposal;

        try {
            switch (type) {
                case "add_node":
                    if (!isValidNom(data.nom)) {
                        return res.status(400).json({
                            error: "Le nom doit être au format Prénom NOM (ex. Jean HEUDE-LEGRANG)"
                        });
                    }
                    await runQuery(`
                        CREATE (:Person {
                            nom: $nom,
                            origine: $origine,
                            x: $x,
                            y: $y
                        })
                    `, {
                        nom: data.nom,
                        origine: data.origine || null,
                        x: data.x,
                        y: data.y
                    });
                    break;

                case "add_relation":
                    await runQuery(`
                        MATCH (a:Person {nom: $source})
                        MATCH (b:Person {nom: $target})
                        CREATE (a)-[:${data.type}]->(b)
                    `, {
                        source: data.source,
                        target: data.target
                    });
                    break;

                case "modify_node":
                    if (data.newNom && !isValidNom(data.newNom)) {
                        return res.status(400).json({
                            error: "Le nom doit être au format Prénom NOM (ex. Jean HEUDE-LEGRANG)"
                        });
                    }
                    const setClause = [];
                    const params = { nom: data.nom };

                    if (data.newNom) {
                        setClause.push("p.nom = $newNom");
                        params.newNom = data.newNom;
                    }
                    if (data.newOrigine !== undefined) {
                        setClause.push("p.origine = $newOrigine");
                        params.newOrigine = data.newOrigine;
                    }

                    if (setClause.length > 0) {
                        await runQuery(`
                            MATCH (p:Person {nom: $nom})
                            SET ${setClause.join(", ")}
                        `, params);
                    }
                    break;

                case "delete_node":
                    await runQuery(`
                        MATCH (p:Person {nom: $nom})
                        DETACH DELETE p
                    `, { nom: data.nom });
                    break;

                case "delete_relation":
                    await runQuery(`
                        MATCH (a:Person {nom: $source})-[r:${data.type}]->(b:Person {nom: $target})
                        DELETE r
                    `, {
                        source: data.source,
                        target: data.target
                    });
                    break;

                default:
                    throw new Error(`Type de proposition inconnu: ${type}`);
            }

            // Créer un snapshot automatique
            const snapshotMessage = `Approbation proposition: ${type} - ${reviewedBy}`;
            await createSnapshot(snapshotMessage, reviewedBy);

            // Mettre à jour la proposition
            const reviewedAt = new Date().toISOString();
            await runQuery(`
                MATCH (p:Proposal {id: $id})
                SET p.status = 'approved',
                    p.reviewedAt = $reviewedAt,
                    p.reviewedBy = $reviewedBy,
                    p.comment = $comment
            `, {
                id,
                reviewedAt,
                reviewedBy,
                comment: comment || null
            });

            res.json({
                message: "Proposition approuvée et appliquée avec succès",
                snapshotCreated: true
            });

        } catch (applyError) {
            // Rollback: marquer la proposition comme rejected en cas d'erreur
            await runQuery(`
                MATCH (p:Proposal {id: $id})
                SET p.status = 'rejected',
                    p.reviewedAt = $reviewedAt,
                    p.reviewedBy = $reviewedBy,
                    p.comment = $errorComment
            `, {
                id,
                reviewedAt: new Date().toISOString(),
                reviewedBy,
                errorComment: `Erreur lors de l'application: ${applyError.message}`
            });

            throw new Error(`Impossible d'appliquer le changement: ${applyError.message}`);
        }

    } catch (error) {
        res.status(500).json({
            error: "Erreur lors de l'approbation de la proposition",
            details: error.message
        });
    }
});

// Rejeter une proposition (admin)
app.post("/proposals/:id/reject", async (req, res) => {
    const { id } = req.params;
    const { reviewedBy, comment } = req.body;

    if (!reviewedBy) {
        return res.status(400).json({ error: "reviewedBy est obligatoire" });
    }

    try {
        // Vérifier que la proposition existe
        const getQuery = `MATCH (p:Proposal {id: $id}) RETURN p`;
        const records = await runQuery(getQuery, { id });

        if (records.length === 0) {
            return res.status(404).json({ error: "Proposition introuvable" });
        }

        const props = records[0].get("p").properties;

        if (props.status !== "pending") {
            return res.status(400).json({
                error: `Proposition déjà ${props.status}`
            });
        }

        // Mettre à jour la proposition
        const reviewedAt = new Date().toISOString();
        await runQuery(`
            MATCH (p:Proposal {id: $id})
            SET p.status = 'rejected',
                p.reviewedAt = $reviewedAt,
                p.reviewedBy = $reviewedBy,
                p.comment = $comment
        `, {
            id,
            reviewedAt,
            reviewedBy,
            comment: comment || null
        });

        res.json({
            message: "Proposition rejetée avec succès"
        });

    } catch (error) {
        res.status(500).json({
            error: "Erreur lors du rejet de la proposition",
            details: error.message
        });
    }
});

/* ---------- SNAPSHOTS ENDPOINTS ---------- */

// Liste tous les snapshots disponibles
app.get("/snapshots", async (req, res) => {
    try {
        const snapshots = listSnapshots();
        res.json(snapshots);
    } catch (error) {
        res.status(500).json({
            error: "Erreur lors de la récupération des snapshots",
            details: error.message
        });
    }
});

// Télécharger un snapshot spécifique
app.get("/snapshots/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const snapshot = getSnapshotById(id);

        if (!snapshot) {
            return res.status(404).json({ error: "Snapshot introuvable" });
        }

        res.json(snapshot);
    } catch (error) {
        res.status(500).json({
            error: "Erreur lors de la récupération du snapshot",
            details: error.message
        });
    }
});

// Créer un snapshot manuel
app.post("/snapshots", async (req, res) => {
    const { message, author } = req.body;

    if (!message || !author) {
        return res.status(400).json({
            error: "message et author sont obligatoires"
        });
    }

    try {
        const result = await createSnapshot(message, author);
        res.status(201).json({
            message: "Snapshot créé avec succès",
            ...result
        });
    } catch (error) {
        res.status(500).json({
            error: "Erreur lors de la création du snapshot",
            details: error.message
        });
    }
});

// Restaurer un snapshot
app.post("/snapshots/restore/:id", async (req, res) => {
    const { id } = req.params;
    const { author } = req.body;

    if (!author) {
        return res.status(400).json({
            error: "author est obligatoire pour tracer la restauration"
        });
    }

    try {
        // Créer un snapshot de sauvegarde avant restauration
        const backupMessage = `Sauvegarde avant restauration du snapshot ${id}`;
        await createSnapshot(backupMessage, author);

        // Restaurer le snapshot
        const result = await restoreSnapshot(id);

        res.json({
            ...result,
            backupCreated: true
        });
    } catch (error) {
        res.status(500).json({
            error: "Erreur lors de la restauration du snapshot",
            details: error.message
        });
    }
});

// En production : servir le frontend (une seule URL pour tout)
if (process.env.NODE_ENV !== "test") {
    app.use(express.static(path.join(__dirname, "..", "frontend")));
}

/* ---------- START SERVER ---------- */
// N'écouter que si ce n'est pas un test
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
        console.log(`Neo4j: ${process.env.NEO4J_URI || "bolt://127.0.0.1:7687"}`);
    });
}

export default app;
