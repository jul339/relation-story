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
            // Créer des personnes et relations
            await createTestPerson("Jean", "Famille", 100, 200);
            await createTestPerson("Marie", "Travail", 300, 400);
            await createTestRelation("Jean", "Marie", "AMIS");

            const response = await request(app).get("/export");

            expect(response.status).toBe(200);
            expect(response.body.nodes).toHaveLength(2);
            expect(response.body.edges).toHaveLength(1);
            expect(response.body.exportDate).toBeDefined();

            // Vérifier les nœuds
            const jean = response.body.nodes.find(n => n.nom === "Jean");
            expect(jean).toBeDefined();
            expect(jean.origine).toBe("Famille");
            expect(jean.x).toBe(100);
            expect(jean.y).toBe(200);

            // Vérifier les relations
            expect(response.body.edges[0].source).toBe("Jean");
            expect(response.body.edges[0].target).toBe("Marie");
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
                    { nom: "Jean", origine: "Famille", x: 100, y: 200 },
                    { nom: "Marie", origine: "Travail", x: 300, y: 400 }
                ],
                edges: [
                    { source: "Jean", target: "Marie", type: "AMIS" }
                ]
            };

            const response = await request(app)
                .post("/import")
                .send(importData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe("Import réussi");
            expect(response.body.nodesCount).toBe(2);
            expect(response.body.edgesCount).toBe(1);

            // Vérifier que les données ont été importées
            const graph = await request(app).get("/graph");
            expect(graph.body.nodes).toHaveLength(2);
            expect(graph.body.edges).toHaveLength(1);
        });

        test("should clear existing data before import", async () => {
            // Créer des données existantes
            await createTestPerson("Paul", "Sport", 500, 600);

            // Vérifier que Paul existe
            let persons = await getAllPersons();
            expect(persons).toHaveLength(1);

            // Importer de nouvelles données
            const importData = {
                nodes: [
                    { nom: "Jean", origine: "Famille", x: 100, y: 200 }
                ],
                edges: []
            };

            await request(app)
                .post("/import")
                .send(importData);

            // Vérifier que seules les nouvelles données existent
            persons = await getAllPersons();
            expect(persons).toHaveLength(1);
            expect(persons[0].nom).toBe("Jean");
            expect(persons.find(p => p.nom === "Paul")).toBeUndefined();
        });

        test("should handle import with missing origine", async () => {
            const importData = {
                nodes: [
                    { nom: "Jean", x: 100, y: 200 }
                ],
                edges: []
            };

            const response = await request(app)
                .post("/import")
                .send(importData);

            expect(response.status).toBe(200);

            const persons = await getAllPersons();
            expect(persons[0].nom).toBe("Jean");
            expect(persons[0].origine).toBeUndefined();
        });

        test("should handle import with multiple relations", async () => {
            const importData = {
                nodes: [
                    { nom: "Jean", origine: "Famille", x: 100, y: 200 },
                    { nom: "Marie", origine: "Travail", x: 300, y: 400 },
                    { nom: "Paul", origine: "Sport", x: 500, y: 600 }
                ],
                edges: [
                    { source: "Jean", target: "Marie", type: "AMIS" },
                    { source: "Marie", target: "Paul", type: "FAMILLE" },
                    { source: "Jean", target: "Paul", type: "AMOUR" }
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
            // Créer un graphe complet
            await createTestPerson("Jean", "Famille", 100, 200);
            await createTestPerson("Marie", "Travail", 300, 400);
            await createTestPerson("Paul", "Sport", 500, 600);
            await createTestRelation("Jean", "Marie", "AMIS");
            await createTestRelation("Marie", "Paul", "FAMILLE");

            // Exporter
            const exportResponse = await request(app).get("/export");
            const exportData = exportResponse.body;

            // Nettoyer
            await clearDatabase();

            // Vérifier que c'est vide
            let persons = await getAllPersons();
            expect(persons).toHaveLength(0);

            // Importer
            await request(app)
                .post("/import")
                .send(exportData);

            // Vérifier que tout a été restauré
            persons = await getAllPersons();
            expect(persons).toHaveLength(3);

            const graph = await request(app).get("/graph");
            expect(graph.body.edges).toHaveLength(2);

            // Vérifier les détails
            const jean = persons.find(p => p.nom === "Jean");
            expect(jean.origine).toBe("Famille");
            expect(jean.x).toBe(100);
            expect(jean.y).toBe(200);
        });
    });
});
