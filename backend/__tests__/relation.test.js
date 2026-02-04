import request from "supertest";
import app from "../index.js";
import { clearDatabase, createTestPerson, createTestRelation } from "./setup.js";

describe("Relation Endpoints", () => {
    beforeEach(async () => {
        await clearDatabase();
        // Créer deux personnes pour les tests de relations
        await createTestPerson("Jean", "Famille", 100, 200);
        await createTestPerson("Marie", "Travail", 300, 400);
    });

    describe("POST /relation", () => {
        test("should create AMIS relation", async () => {
            const response = await request(app)
                .post("/relation")
                .send({
                    source: "Jean",
                    target: "Marie",
                    type: "AMIS"
                });

            expect(response.status).toBe(201);

            // Vérifier que la relation existe
            const graph = await request(app).get("/graph");
            expect(graph.body.edges).toHaveLength(1);
            expect(graph.body.edges[0].source).toBe("Jean");
            expect(graph.body.edges[0].target).toBe("Marie");
            expect(graph.body.edges[0].type).toBe("AMIS");
        });

        test("should create FAMILLE relation", async () => {
            const response = await request(app)
                .post("/relation")
                .send({
                    source: "Jean",
                    target: "Marie",
                    type: "FAMILLE"
                });

            expect(response.status).toBe(201);

            // Vérifier que la relation existe
            const graph = await request(app).get("/graph");
            expect(graph.body.edges[0].type).toBe("FAMILLE");
        });

        test("should create AMOUR relation", async () => {
            const response = await request(app)
                .post("/relation")
                .send({
                    source: "Jean",
                    target: "Marie",
                    type: "AMOUR"
                });

            expect(response.status).toBe(201);

            // Vérifier que la relation existe
            const graph = await request(app).get("/graph");
            expect(graph.body.edges[0].type).toBe("AMOUR");
        });
    });

    describe("DELETE /relation", () => {
        test("should delete a relation", async () => {
            // Créer une relation
            await createTestRelation("Jean", "Marie", "AMIS");

            // Vérifier qu'elle existe
            let graph = await request(app).get("/graph");
            expect(graph.body.edges).toHaveLength(1);

            // Supprimer la relation
            const response = await request(app)
                .delete("/relation")
                .send({
                    source: "Jean",
                    target: "Marie",
                    type: "AMIS"
                });

            expect(response.status).toBe(200);

            // Vérifier qu'elle a été supprimée
            graph = await request(app).get("/graph");
            expect(graph.body.edges).toHaveLength(0);
        });
    });

    describe("GET /graph with relations", () => {
        test("should return graph with multiple relations", async () => {
            // Créer plusieurs relations
            await createTestRelation("Jean", "Marie", "AMIS");

            // Créer une troisième personne
            await createTestPerson("Paul", "Sport", 500, 600);
            await createTestRelation("Marie", "Paul", "FAMILLE");

            const response = await request(app).get("/graph");

            expect(response.status).toBe(200);
            expect(response.body.nodes).toHaveLength(3);
            expect(response.body.edges).toHaveLength(2);

            // Vérifier les relations
            const amis = response.body.edges.find(e => e.type === "AMIS");
            expect(amis.source).toBe("Jean");
            expect(amis.target).toBe("Marie");

            const famille = response.body.edges.find(e => e.type === "FAMILLE");
            expect(famille.source).toBe("Marie");
            expect(famille.target).toBe("Paul");
        });
    });
});
