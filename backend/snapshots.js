import { runQuery } from "./neo4j.js";
import { generateUniqueNodeId, generateUniqueEdgeId } from "./ids.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");

// Créer le dossier snapshots s'il n'existe pas
export function initSnapshotsDir() {
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
        fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
        console.log("Dossier snapshots créé");
    }
}

// Récupérer le graphe actuel (Person uniquement, pas les Proposals)
async function getCurrentGraph() {
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
        nodes[pId] = p.properties;

        if (q && r) {
            const qId = q.properties.nom;
            nodes[qId] = q.properties;

            edges.push({
                source: pId,
                target: qId,
                type: r.type,
                edgeId: r.properties?.edgeId ?? null
            });
        }
    });

    return {
        nodes: Object.values(nodes),
        edges
    };
}

// Créer un snapshot du graphe actuel
export async function createSnapshot(message, author) {
    const graph = await getCurrentGraph();
    const id = crypto.randomUUID().substring(0, 8);
    const timestamp = new Date().toISOString();

    const snapshot = {
        id,
        timestamp,
        message,
        author,
        nodes: graph.nodes,
        edges: graph.edges
    };

    const filename = `snapshot-${timestamp.replace(/:/g, "-")}-${id}.json`;
    const filepath = path.join(SNAPSHOTS_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));

    return { id, filename, timestamp };
}

// Lister tous les snapshots disponibles
export function listSnapshots() {
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
        return [];
    }

    const files = fs.readdirSync(SNAPSHOTS_DIR)
        .filter(file => file.startsWith("snapshot-") && file.endsWith(".json"))
        .sort()
        .reverse(); // Plus récents en premier

    return files.map(filename => {
        const filepath = path.join(SNAPSHOTS_DIR, filename);
        const content = JSON.parse(fs.readFileSync(filepath, "utf8"));

        return {
            id: content.id,
            filename,
            timestamp: content.timestamp,
            message: content.message,
            author: content.author,
            nodesCount: content.nodes.length,
            edgesCount: content.edges.length
        };
    });
}

// Récupérer un snapshot par son ID
export function getSnapshotById(id) {
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
        return null;
    }

    const files = fs.readdirSync(SNAPSHOTS_DIR)
        .filter(file => file.includes(`-${id}.json`));

    if (files.length === 0) {
        return null;
    }

    const filepath = path.join(SNAPSHOTS_DIR, files[0]);
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
}

// Restaurer un snapshot (supprime les Person et recrée depuis le snapshot)
export async function restoreSnapshot(id) {
    const snapshot = getSnapshotById(id);

    if (!snapshot) {
        throw new Error(`Snapshot ${id} introuvable`);
    }

    // Supprimer uniquement les Person et leurs relations (pas les Proposals)
    await runQuery(`MATCH (p:Person) DETACH DELETE p`);

    for (const node of snapshot.nodes) {
        const nodeId = node.nodeId && /^\d{6}$/.test(node.nodeId)
            ? node.nodeId
            : await generateUniqueNodeId();
        const originesList = Array.isArray(node.origines)
            ? node.origines.filter(Boolean)
            : (node.origine ? [node.origine] : []);
        const query = `
            CREATE (:Person {
                nom: $nom,
                origines: $origines,
                x: $x,
                y: $y,
                nodeId: $nodeId
            })
        `;
        await runQuery(query, {
            nom: node.nom,
            origines: originesList,
            x: node.x || 0,
            y: node.y || 0,
            nodeId
        });
    }

    for (const edge of snapshot.edges) {
        const edgeId = edge.edgeId && /^\d{6}$/.test(edge.edgeId)
            ? edge.edgeId
            : await generateUniqueEdgeId();
        const query = `
            MATCH (a:Person {nom: $source})
            MATCH (b:Person {nom: $target})
            CREATE (a)-[r:${edge.type} {edgeId: $edgeId}]->(b)
        `;
        await runQuery(query, {
            source: edge.source,
            target: edge.target,
            edgeId
        });
    }

    return {
        message: "Snapshot restauré avec succès",
        nodesRestored: snapshot.nodes.length,
        edgesRestored: snapshot.edges.length
    };
}
