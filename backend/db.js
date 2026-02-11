import pg from "pg";

const { Pool } = pg;

let pool = null;

export function getPool() {
    if (!pool) {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error("DATABASE_URL manquant");
        pool = new Pool({ connectionString: url });
    }
    return pool;
}

export async function runSql(text, params = []) {
    const client = await getPool().connect();
    try {
        const res = await client.query(text, params);
        return res;
    } finally {
        client.release();
    }
}

const CREATE_USERS = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  person_node_id VARCHAR(6) NOT NULL,
  visibility_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export async function initDb() {
    if (!process.env.DATABASE_URL) {
        console.warn("DATABASE_URL non défini, base SQL ignorée");
        return;
    }
    await runSql(CREATE_USERS);
}
