import request from "supertest";
import app from "../index.js";
import { clearDatabase, createTestPerson } from "./setup.js";

describe("Person Endpoints", () => {
    beforeEach(async () => {
        await clearDatabase();
    });

    describe("GET /graph", () => {
        test("should return empty graph", async () => {
            const response = await request(app).get("/graph");

            expect(response.status).toBe(200);
            expect(response.body.nodes).toEqual([]);
            expect(response.body.edges).toEqual([]);
        });

        test("should return graph with persons", async () => {
            await createTestPerson("Jean", "Famille", 100, 200);
            await createTestPerson("Marie", "Travail", 300, 400);

            const response = await request(app).get("/graph");

            expect(response.status).toBe(200);
            expect(response.body.nodes).toHaveLength(2);
            expect(response.body.nodes.map(n => n.nom)).toContain("Jean");
            expect(response.body.nodes.map(n => n.nom)).toContain("Marie");
        });
    });

    describe("POST /person", () => {
        test("should create a person", async () => {
            const response = await request(app)
                .post("/person")
                .send({
                    nom: "Jean",
                    origine: "Famille",
                    x: 100,
                    y: 200
                });

            expect(response.status).toBe(201);

            // Vérifier que la personne a été créée
            const graph = await request(app).get("/graph");
            expect(graph.body.nodes).toHaveLength(1);
            expect(graph.body.nodes.map(n => n.nom)).toContain("Jean");
        });

        test("should return 400 if nom is missing", async () => {
            const response = await request(app)
                .post("/person")
                .send({
                    origine: "Famille",
                    x: 100,
                    y: 200
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe("Le nom est obligatoire");
        });

        test("should return 400 if coordinates are missing", async () => {
            const response = await request(app)
                .post("/person")
                .send({
                    nom: "Jean",
                    origine: "Famille"
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe("Les coordonnées x et y sont obligatoires");
        });
    });

    describe("PATCH /person/coordinates", () => {
        test("should update person coordinates", async () => {
            await createTestPerson("Jean", "Famille", 100, 200);

            const response = await request(app)
                .patch("/person/coordinates")
                .send({
                    nom: "Jean",
                    x: 500,
                    y: 600
                });

            expect(response.status).toBe(200);

            // Vérifier la mise à jour
            const Jean = await request(app).get("/person/Jean");
            expect(Jean.body.x).toBe(500); // verifier le noed dont le nom est Jean a pour coordonnees x = 500
            expect(Jean.body.y).toBe(600);
        });
    });

    describe("PATCH /person", () => {
        test("should update person name and origine", async () => {
            await createTestPerson("Jean", "Famille", 100, 200);

            const response = await request(app)
                .patch("/person")
                .send({
                    oldNom: "Jean",
                    nom: "Jean-Paul",
                    origine: "Travail"
                });

            expect(response.status).toBe(200);

            // Vérifier la mise à jour
            const Jean = await request(app).get("/Person/Jean-Paul");
            expect(Jean.body.nom).toBe("Jean-Paul");
            expect(Jean.body.origine).toBe("Travail");

            const graph = await request(app).get("/graph");
            expect(graph.body.nodes).toHaveLength(1);
        });

        test("should return 400 if oldNom is missing", async () => {
            const response = await request(app)
                .patch("/person")
                .send({
                    nom: "Jean-Paul"
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe("oldNom est requis");
        });
    });

    describe("DELETE /person", () => {
        test("should delete a person", async () => {
            await createTestPerson("Jean", "Famille", 100, 200);

            const response = await request(app)
                .delete("/person")
                .send({ nom: "Jean" });

            expect(response.status).toBe(200);

            // Vérifier la suppression
            const graph = await request(app).get("/graph");
            expect(graph.body.nodes).toHaveLength(0);
        });
    });

    describe("DELETE /all", () => {
        test("should delete all data", async () => {
            await createTestPerson("Jean", "Famille", 100, 200);
            await createTestPerson("Marie", "Travail", 300, 400);

            const response = await request(app).delete("/all");

            expect(response.status).toBe(200);
            expect(response.body.message).toBe("Tous les nœuds et relations ont été supprimés");

            // Vérifier la suppression
            const graph = await request(app).get("/graph");
            expect(graph.body.nodes).toHaveLength(0);
        });
    });
});
