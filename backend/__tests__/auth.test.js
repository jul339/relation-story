import request from "supertest";
import app from "../index.js";
import { clearDatabase, createTestPerson } from "./setup.js";

describe("Auth Endpoints", () => {
    beforeEach(async () => {
        await clearDatabase();
    });

    describe("POST /auth/register", () => {
        test("should return 400 if email, password or person_node_id missing", async () => {
            const res = await request(app)
                .post("/auth/register")
                .send({ email: "a@b.com", password: "x" });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/requis/);
        });

        test("should return 400 if person_node_id is not 6 digits", async () => {
            const res = await request(app)
                .post("/auth/register")
                .send({
                    email: "a@b.com",
                    password: "secret",
                    person_node_id: "12345"
                });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/6 chiffres/);
        });

        test("should return 503 when DATABASE_URL is not set", async () => {
            const person = await createTestPerson("Jean DUPONT", null, 0, 0);
            const res = await request(app)
                .post("/auth/register")
                .send({
                    email: "user@test.com",
                    password: "secret",
                    person_node_id: person.nodeId
                });
            if (!process.env.DATABASE_URL) {
                expect(res.status).toBe(503);
                expect(res.body.error).toBeDefined();
            }
        });
    });

    describe("POST /auth/login", () => {
        test("should return 400 if email or password missing", async () => {
            const res = await request(app)
                .post("/auth/login")
                .send({ email: "a@b.com" });
            expect(res.status).toBe(400);
        });

        test("should return 503 when DATABASE_URL is not set", async () => {
            const res = await request(app)
                .post("/auth/login")
                .send({ email: "a@b.com", password: "x" });
            if (!process.env.DATABASE_URL) {
                expect(res.status).toBe(503);
            }
        });
    });

    describe("GET /auth/me", () => {
        test("should return 401 when not logged in", async () => {
            const res = await request(app).get("/auth/me");
            expect(res.status).toBe(401);
        });
    });

    describe("POST /auth/logout", () => {
        test("should return 200 and message", async () => {
            const res = await request(app).post("/auth/logout");
            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/Déconnecté|déconnecté/i);
        });
    });

    describe("Auth flow (when DATABASE_URL is set)", () => {
        test("register then login then me then logout", async () => {
            if (!process.env.DATABASE_URL) return;
            const person = await createTestPerson("Jean DUPONT", null, 0, 0);
            const agent = request(app);

            const reg = await agent
                .post("/auth/register")
                .send({
                    email: "authflow@test.com",
                    password: "secret123",
                    person_node_id: person.nodeId
                });
            expect(reg.status).toBe(201);

            const login = await agent
                .post("/auth/login")
                .send({ email: "authflow@test.com", password: "secret123" });
            expect(login.status).toBe(200);
            expect(login.body.user).toBeDefined();
            expect(login.body.user.email).toBe("authflow@test.com");
            expect(login.body.user.person_node_id).toBe(person.nodeId);

            const me = await agent.get("/auth/me");
            expect(me.status).toBe(200);
            expect(me.body.email).toBe("authflow@test.com");

            const logout = await agent.post("/auth/logout");
            expect(logout.status).toBe(200);

            const meAfter = await agent.get("/auth/me");
            expect(meAfter.status).toBe(401);
        });
    });
});
