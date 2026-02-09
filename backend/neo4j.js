import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import neo4j from "neo4j-driver";

// Charger .env avant de lire les variables (les imports ESM sont évalués avant le reste de index.js)
if (process.env.NODE_ENV !== "test") {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    dotenv.config({ path: path.join(__dirname, "..", ".env") });
}

const uri = process.env.NEO4J_URI || "bolt://127.0.0.1:7687";
const user = process.env.NEO4J_USERNAME || "neo4j";
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
