import { runQuery } from "./neo4j.js";

function random6() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export async function generateUniqueNodeId() {
    for (let i = 0; i < 50; i++) {
        const id = random6();
        const records = await runQuery(`MATCH (p:Person {nodeId: $id}) RETURN p`, { id });
        if (records.length === 0) return id;
    }
    throw new Error("Impossible de générer un nodeId unique");
}

export async function generateUniqueEdgeId() {
    for (let i = 0; i < 50; i++) {
        const id = random6();
        const records = await runQuery(
            `MATCH ()-[r]->() WHERE r.edgeId = $id RETURN r LIMIT 1`,
            { id }
        );
        if (records.length === 0) return id;
    }
    throw new Error("Impossible de générer un edgeId unique");
}

export async function migrateNodeIdsAndEdgeIds() {
    const personsWithoutId = await runQuery(
        `MATCH (p:Person) WHERE p.nodeId IS NULL OR size(toString(p.nodeId)) <> 6 RETURN p.nom AS nom`
    );
    for (const rec of personsWithoutId) {
        const nom = rec.get("nom");
        const nodeId = await generateUniqueNodeId();
        await runQuery(`MATCH (p:Person {nom: $nom}) SET p.nodeId = $nodeId`, { nom, nodeId });
    }
    const rels = await runQuery(`
        MATCH (a:Person)-[r]->(b:Person)
        WHERE r.edgeId IS NULL OR size(toString(r.edgeId)) <> 6
        RETURN a.nom AS source, b.nom AS target, type(r) AS type
    `);
    for (const rec of rels) {
        const source = rec.get("source");
        const target = rec.get("target");
        const type = rec.get("type");
        const edgeId = await generateUniqueEdgeId();
        await runQuery(
            `MATCH (a:Person {nom: $source})-[r:${type}]->(b:Person {nom: $target}) SET r.edgeId = $edgeId`,
            { source, target, edgeId }
        );
    }
}
