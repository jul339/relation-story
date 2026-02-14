import request from "supertest";
import app from "../index.js";
import { clearDatabase, createTestPerson, createTestRelation, getAllPersons } from "./setup.js";

describe("Export/Import Endpoints", () => {
    beforeEach(async () => {
        await clearDatabase();
    });

    describe("GET /export", () => {
        test("should export empty graph", async () => {
            const response = await request(app).get("/export");

            expect(response.status).toBe(200);
            expect(response.body.nodes).toEqual([]);
            expect(response.body.edges).toEqual([]);
            expect(response.body.exportDate).toBeDefined();
        });

        test("should export graph with data", async () => {
            await createTestPerson("Jean DUPONT", "Famille", 100, 200);
            await createTestPerson("Marie MARTIN", "Travail", 300, 400);
            await createTestRelation("Jean DUPONT", "Marie MARTIN", "AMIS");

            const response = await request(app).get("/export");

            expect(response.status).toBe(200);
            expect(response.body.nodes).toHaveLength(2);
            expect(response.body.edges).toHaveLength(1);
            expect(response.body.exportDate).toBeDefined();

            const jean = response.body.nodes.find(n => n.nom === "Jean DUPONT");
            expect(jean).toBeDefined();
            expect(jean.origines).toEqual(["Famille"]);
            expect(jean.x).toBe(100);
            expect(jean.y).toBe(200);

            expect(response.body.edges[0].source).toBe("Jean DUPONT");
            expect(response.body.edges[0].target).toBe("Marie MARTIN");
            expect(response.body.edges[0].type).toBe("AMIS");
        });

        test("should include export date in ISO format", async () => {
            const response = await request(app).get("/export");

            const exportDate = new Date(response.body.exportDate);
            expect(exportDate).toBeInstanceOf(Date);
            expect(exportDate.toISOString()).toBe(response.body.exportDate);
        });
    });

    describe("POST /import", () => {
        test("should import data", async () => {
            const importData = {
                nodes: [
                    { nom: "Jean DUPONT", origines: ["Famille"], x: 100, y: 200 },
                    { nom: "Marie MARTIN", origines: ["Travail"], x: 300, y: 400 }
                ],
                edges: [
                    { source: "Jean DUPONT", target: "Marie MARTIN", type: "AMIS" }
                ]
            };

            const response = await request(app)
                .post("/import")
                .send(importData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe("Import réussi");
            expect(response.body.nodesCount).toBe(2);
            expect(response.body.edgesCount).toBe(1);

            const graph = await request(app).get("/graph");
            expect(graph.body.nodes).toHaveLength(2);
            expect(graph.body.edges).toHaveLength(1);
        });

        test("should clear existing data before import", async () => {
            await createTestPerson("Paul BERNARD", "Sport", 500, 600);

            let persons = await getAllPersons();
            expect(persons).toHaveLength(1);

            const importData = {
                nodes: [
                    { nom: "Jean DUPONT", origines: ["Famille"], x: 100, y: 200 }
                ],
                edges: []
            };

            await request(app)
                .post("/import")
                .send(importData);

            persons = await getAllPersons();
            expect(persons).toHaveLength(1);
            expect(persons[0].nom).toBe("Jean DUPONT");
            expect(persons.find(p => p.nom === "Paul BERNARD")).toBeUndefined();
        });

        test("should handle import with missing origines", async () => {
            const importData = {
                nodes: [
                    { nom: "Jean DUPONT", x: 100, y: 200 }
                ],
                edges: []
            };

            const response = await request(app)
                .post("/import")
                .send(importData);

            expect(response.status).toBe(200);

            const persons = await getAllPersons();
            expect(persons[0].nom).toBe("Jean DUPONT");
            expect(persons[0].origines).toEqual([]);
        });

        test("should handle import with multiple relations", async () => {
            const importData = {
                nodes: [
                    { nom: "Jean DUPONT", origines: ["Famille"], x: 100, y: 200 },
                    { nom: "Marie MARTIN", origines: ["Travail"], x: 300, y: 400 },
                    { nom: "Paul BERNARD", origines: ["Sport"], x: 500, y: 600 }
                ],
                edges: [
                    { source: "Jean DUPONT", target: "Marie MARTIN", type: "AMIS" },
                    { source: "Marie MARTIN", target: "Paul BERNARD", type: "FAMILLE" },
                    { source: "Jean DUPONT", target: "Paul BERNARD", type: "AMOUR" }
                ]
            };

            const response = await request(app)
                .post("/import")
                .send(importData);

            expect(response.status).toBe(200);
            expect(response.body.nodesCount).toBe(3);
            expect(response.body.edgesCount).toBe(3);

            const graph = await request(app).get("/graph");
            expect(graph.body.edges).toHaveLength(3);

            const types = graph.body.edges.map(e => e.type);
            expect(types).toContain("AMIS");
            expect(types).toContain("FAMILLE");
            expect(types).toContain("AMOUR");
        });

        test("should handle empty import", async () => {
            const importData = {
                nodes: [],
                edges: []
            };

            const response = await request(app)
                .post("/import")
                .send(importData);

            expect(response.status).toBe(200);
            expect(response.body.nodesCount).toBe(0);
            expect(response.body.edgesCount).toBe(0);
        });
    });

    describe("Export then Import (round-trip)", () => {
        test("should preserve all data in export/import cycle", async () => {
            await createTestPerson("Jean DUPONT", "Famille", 100, 200);
            await createTestPerson("Marie MARTIN", "Travail", 300, 400);
            await createTestPerson("Paul BERNARD", "Sport", 500, 600);
            await createTestRelation("Jean DUPONT", "Marie MARTIN", "AMIS");
            await createTestRelation("Marie MARTIN", "Paul BERNARD", "FAMILLE");

            const exportResponse = await request(app).get("/export");
            const exportData = exportResponse.body;

            await clearDatabase();

            let persons = await getAllPersons();
            expect(persons).toHaveLength(0);

            await request(app)
                .post("/import")
                .send(exportData);

            persons = await getAllPersons();
            expect(persons).toHaveLength(3);

            const graph = await request(app).get("/graph");
            expect(graph.body.edges).toHaveLength(2);

            const jean = persons.find(p => p.nom === "Jean DUPONT");
            expect(jean.origines).toEqual(["Famille"]);
            expect(jean.x).toBe(100);
            expect(jean.y).toBe(200);
        });
    });
});
