import request from "supertest";
import app from "../index.js";
import { clearDatabase, createTestPerson } from "./setup.js";

describe("GET /persons/available-for-signup", () => {
    beforeEach(async () => {
        await clearDatabase();
    });

    test("returns 503 when DATABASE_URL is not set", async () => {
        const res = await request(app).get("/persons/available-for-signup?q=Jean");
        if (!process.env.DATABASE_URL) {
            expect(res.status).toBe(503);
            expect(res.body.error).toBeDefined();
        }
    });

    test("returns list when DATABASE_URL is set", async () => {
        await createTestPerson("Jean DUPONT", null, 0, 0);
        const res = await request(app).get("/persons/available-for-signup?q=Jean");
        if (process.env.DATABASE_URL) {
            expect(res.status).toBe(200);
            expect(res.body.available).toBeDefined();
            expect(Array.isArray(res.body.available)).toBe(true);
        }
    });
});
