import neo4j from "neo4j-driver";

// Un seul Neo4j (docker-compose, 7687). 127.0.0.1 évite des soucis sous WSL.
const uri = process.env.NEO4J_URI || "bolt://127.0.0.1:7687";
const user = process.env.NEO4J_USER || "neo4j";
const password = process.env.NEO4J_PASSWORD || "password";

// Connexion locale (bolt://) : pas de chiffrement pour éviter ECONNRESET avec Neo4j 4+/5
const driverConfig =
    uri.startsWith("bolt://")
        ? { encrypted: false, connectionAcquisitionTimeout: 10000 }
        : {};
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), driverConfig);

export async function runQuery(query, params = {}) {
    const session = driver.session();
    try {
        const result = await session.run(query, params);
        return result.records;
    } finally {
        await session.close();
    }
}
