import request from "supertest";
import app from "../index.js";
import { clearDatabase, createTestPerson, createTestRelation } from "./setup.js";

describe("Relation Endpoints", () => {
    beforeEach(async () => {
        await clearDatabase();
        await createTestPerson("Jean DUPONT", "Famille", 100, 200);
        await createTestPerson("Marie MARTIN", "Travail", 300, 400);
    });

    describe("POST /relation", () => {
        test("should create AMIS relation", async () => {
            const response = await request(app)
                .post("/relation")
                .send({
                    source: "Jean DUPONT",
                    target: "Marie MARTIN",
                    type: "AMIS"
                });

            expect(response.status).toBe(201);

            const graph = await request(app).get("/graph");
            expect(graph.body.edges).toHaveLength(1);
            expect(graph.body.edges[0].source).toBe("Jean DUPONT");
            expect(graph.body.edges[0].target).toBe("Marie MARTIN");
            expect(graph.body.edges[0].type).toBe("AMIS");
        });

        test("should create FAMILLE relation", async () => {
            const response = await request(app)
                .post("/relation")
                .send({
                    source: "Jean DUPONT",
                    target: "Marie MARTIN",
                    type: "FAMILLE"
                });

            expect(response.status).toBe(201);

            const graph = await request(app).get("/graph");
            expect(graph.body.edges[0].type).toBe("FAMILLE");
        });

        test("should create AMOUR relation", async () => {
            const response = await request(app)
                .post("/relation")
                .send({
                    source: "Jean DUPONT",
                    target: "Marie MARTIN",
                    type: "AMOUR"
                });

            expect(response.status).toBe(201);

            const graph = await request(app).get("/graph");
            expect(graph.body.edges[0].type).toBe("AMOUR");
        });
    });

    describe("DELETE /relation", () => {
        test("should delete a relation", async () => {
            await createTestRelation("Jean DUPONT", "Marie MARTIN", "AMIS");

            let graph = await request(app).get("/graph");
            expect(graph.body.edges).toHaveLength(1);

            const response = await request(app)
                .delete("/relation")
                .send({
                    source: "Jean DUPONT",
                    target: "Marie MARTIN",
                    type: "AMIS"
                });

            expect(response.status).toBe(200);

            graph = await request(app).get("/graph");
            expect(graph.body.edges).toHaveLength(0);
        });
    });

    describe("GET /graph with relations", () => {
        test("should return graph with multiple relations", async () => {
            await createTestRelation("Jean DUPONT", "Marie MARTIN", "AMIS");

            await createTestPerson("Paul BERNARD", "Sport", 500, 600);
            await createTestRelation("Marie MARTIN", "Paul BERNARD", "FAMILLE");

            const response = await request(app).get("/graph");

            expect(response.status).toBe(200);
            expect(response.body.nodes).toHaveLength(3);
            expect(response.body.edges).toHaveLength(2);

            const amis = response.body.edges.find(e => e.type === "AMIS");
            expect(amis.source).toBe("Jean DUPONT");
            expect(amis.target).toBe("Marie MARTIN");

            const famille = response.body.edges.find(e => e.type === "FAMILLE");
            expect(famille.source).toBe("Marie MARTIN");
            expect(famille.target).toBe("Paul BERNARD");
        });
    });
});
