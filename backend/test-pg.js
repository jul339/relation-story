import 'dotenv/config';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const sql = postgres(process.env.DATABASE_URL);

async function test() {
    try {
        const res = await sql`SELECT NOW()`;
        console.log('Connexion réussie ! Heure serveur:', res[0].now);
    } catch (e) {
        console.log('Échec:', e.message);
    } finally {
        await sql.end();
    }
}

test();