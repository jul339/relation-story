import request from "supertest";
import app from "../index.js";
import { clearDatabase, createTestPerson, createTestProposal, getAllPersons } from "./setup.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOTS_DIR = path.join(__dirname, "../snapshots");

describe("Snapshots Endpoints", () => {
    beforeEach(async () => {
        await clearDatabase();

        // Nettoyer les snapshots de test
        if (fs.existsSync(SNAPSHOTS_DIR)) {
            const files = fs.readdirSync(SNAPSHOTS_DIR);
            files.forEach(file => {
                fs.unlinkSync(path.join(SNAPSHOTS_DIR, file));
            });
        }
    });

    describe("POST /snapshots", () => {
        test("should create a manual snapshot", async () => {
            // Créer quelques données
            await createTestPerson("Jean", "Famille", 100, 200);
            await createTestPerson("Marie", "Travail", 300, 400);

            const response = await request(app)
                .post("/snapshots")
                .send({
                    message: "Test snapshot",
                    author: "Admin"
                });

            expect(response.status).toBe(201);
            expect(response.body.message).toBe("Snapshot créé avec succès");
            expect(response.body.id).toBeDefined();
            expect(response.body.filename).toBeDefined();
            expect(response.body.timestamp).toBeDefined();
        });

        test("should return 400 if message is missing", async () => {
            const response = await request(app)
                .post("/snapshots")
                .send({
                    author: "Admin"
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe("message et author sont obligatoires");
        });

        test("should return 400 if author is missing", async () => {
            const response = await request(app)
                .post("/snapshots")
                .send({
                    message: "Test"
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe("message et author sont obligatoires");
        });
    });

    describe("GET /snapshots", () => {
        test("should list all snapshots", async () => {
            // Créer des données et un snapshot
            await createTestPerson("Jean", "Famille", 100, 200);

            await request(app)
                .post("/snapshots")
                .send({
                    message: "Snapshot 1",
                    author: "Admin"
                });

            await request(app)
                .post("/snapshots")
                .send({
                    message: "Snapshot 2",
                    author: "Admin"
                });

            const response = await request(app).get("/snapshots");

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].message).toBe("Snapshot 2"); // Plus récent en premier
            expect(response.body[1].message).toBe("Snapshot 1");
            expect(response.body[0].nodesCount).toBeDefined();
            expect(response.body[0].edgesCount).toBeDefined();
        });

        test("should return empty array if no snapshots", async () => {
            const response = await request(app).get("/snapshots");

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe("GET /snapshots/:id", () => {
        test("should download a snapshot", async () => {
            // Créer des données et un snapshot
            await createTestPerson("Jean", "Famille", 100, 200);

            const createResponse = await request(app)
                .post("/snapshots")
                .send({
                    message: "Test snapshot",
                    author: "Admin"
                });

            const snapshotId = createResponse.body.id;

            const response = await request(app).get(`/snapshots/${snapshotId}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(snapshotId);
            expect(response.body.message).toBe("Test snapshot");
            expect(response.body.author).toBe("Admin");
            expect(response.body.nodes).toHaveLength(1);
            expect(response.body.nodes[0].nom).toBe("Jean");
        });

        test("should return 404 for non-existent snapshot", async () => {
            const response = await request(app).get("/snapshots/non-existent");

            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Snapshot introuvable");
        });
    });

    describe("POST /snapshots/restore/:id", () => {
        test("should restore a snapshot", async () => {
            // Créer des données initiales
            await createTestPerson("Jean", "Famille", 100, 200);
            await createTestPerson("Marie", "Travail", 300, 400);

            // Créer un snapshot
            const createResponse = await request(app)
                .post("/snapshots")
                .send({
                    message: "Backup",
                    author: "Admin"
                });

            const snapshotId = createResponse.body.id;

            // Modifier les données
            await request(app)
                .delete("/person")
                .send({ nom: "Marie" });

            await createTestPerson("Paul", "Sport", 500, 600);

            // Vérifier l'état actuel
            let persons = await getAllPersons();
            expect(persons).toHaveLength(2);
            expect(persons.find(p => p.nom === "Paul")).toBeDefined();

            // Restaurer le snapshot
            const response = await request(app)
                .post(`/snapshots/restore/${snapshotId}`)
                .send({
                    author: "Admin"
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe("Snapshot restauré avec succès");
            expect(response.body.nodesRestored).toBe(2);
            expect(response.body.backupCreated).toBe(true);

            // Vérifier que les données ont été restaurées
            persons = await getAllPersons();
            expect(persons).toHaveLength(2);
            expect(persons.find(p => p.nom === "Jean")).toBeDefined();
            expect(persons.find(p => p.nom === "Marie")).toBeDefined();
            expect(persons.find(p => p.nom === "Paul")).toBeUndefined();
        });

        test("should preserve proposals when restoring", async () => {
            // Créer une personne et un snapshot
            await createTestPerson("Jean", "Famille", 100, 200);

            const createResponse = await request(app)
                .post("/snapshots")
                .send({
                    message: "Backup",
                    author: "Admin"
                });

            const snapshotId = createResponse.body.id;

            // Créer une proposition
            await createTestProposal("User1", "add_node", {
                nom: "Test",
                x: 0,
                y: 0
            });

            // Restaurer le snapshot
            await request(app)
                .post(`/snapshots/restore/${snapshotId}`)
                .send({
                    author: "Admin"
                });

            // Vérifier que la proposition existe toujours
            const proposals = await request(app).get("/proposals");
            expect(proposals.body).toHaveLength(1);
            expect(proposals.body[0].authorName).toBe("User1");
        });

        test("should return 400 if author is missing", async () => {
            const response = await request(app)
                .post("/snapshots/restore/some-id")
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe("author est obligatoire pour tracer la restauration");
        });

        test("should return 500 for non-existent snapshot", async () => {
            const response = await request(app)
                .post("/snapshots/restore/non-existent")
                .send({
                    author: "Admin"
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toContain("Erreur lors de la restauration");
        });
    });
});
