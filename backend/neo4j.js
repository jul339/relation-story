import neo4j from "neo4j-driver";

const driver = neo4j.driver(
    "bolt://localhost:7687",
    neo4j.auth.basic("neo4j", "password")
);

export async function runQuery(query, params = {}) {
    const session = driver.session();
    try {
        const result = await session.run(query, params);
        return result.records;
    } finally {
        await session.close();
    }
}
