import request from "supertest";
import app from "../index.js";
import { clearDatabase, createTestPerson, createTestProposal, getAllPersons, getAllProposals } from "./setup.js";

describe("Proposals Endpoints", () => {
    beforeEach(async () => {
        await clearDatabase();
    });

    describe("POST /proposals", () => {
        test("should create add_node proposal", async () => {
            const response = await request(app)
                .post("/proposals")
                .send({
                    authorName: "Jean Test",
                    authorEmail: "jean@test.com",
                    type: "add_node",
                    data: {
                        nom: "TestPerson",
                        origine: "Test",
                        x: 100,
                        y: 200
                    }
                });

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.message).toBe("Proposition créée avec succès");
        });

        test("should create add_relation proposal", async () => {
            const response = await request(app)
                .post("/proposals")
                .send({
                    authorName: "Jean Test",
                    type: "add_relation",
                    data: {
                        source: "Jean",
                        target: "Marie",
                        type: "AMIS"
                    }
                });

            expect(response.status).toBe(201);
        });

        test("should create modify_node proposal", async () => {
            const response = await request(app)
                .post("/proposals")
                .send({
                    authorName: "Jean Test",
                    type: "modify_node",
                    data: {
                        nom: "Jean",
                        newNom: "Jean-Paul",
                        newOrigine: "Sport"
                    }
                });

            expect(response.status).toBe(201);
        });

        test("should create delete_node proposal", async () => {
            const response = await request(app)
                .post("/proposals")
                .send({
                    authorName: "Jean Test",
                    type: "delete_node",
                    data: {
                        nom: "Jean"
                    }
                });

            expect(response.status).toBe(201);
        });

        test("should return 400 if type is invalid", async () => {
            const response = await request(app)
                .post("/proposals")
                .send({
                    authorName: "Jean Test",
                    type: "invalid_type",
                    data: {}
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain("Type invalide");
        });

        test("should return 400 if authorName is missing", async () => {
            const response = await request(app)
                .post("/proposals")
                .send({
                    type: "add_node",
                    data: {}
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe("authorName, type et data sont obligatoires");
        });
    });

    describe("GET /proposals/stats", () => {
        test("should return correct statistics", async () => {
            // Créer plusieurs propositions
            await createTestProposal("User1", "add_node", { nom: "Test1", x: 0, y: 0 });
            await createTestProposal("User2", "add_node", { nom: "Test2", x: 0, y: 0 });

            const response = await request(app).get("/proposals/stats");

            expect(response.status).toBe(200);
            expect(response.body.pending).toBe(2);
            expect(response.body.approved).toBe(0);
            expect(response.body.rejected).toBe(0);
            expect(response.body.total).toBe(2);
        });

        test("should return zero stats for empty database", async () => {
            const response = await request(app).get("/proposals/stats");

            expect(response.status).toBe(200);
            expect(response.body.pending).toBe(0);
            expect(response.body.total).toBe(0);
        });
    });

    describe("GET /proposals", () => {
        test("should list pending proposals by default", async () => {
            await createTestProposal("User1", "add_node", { nom: "Test1", x: 0, y: 0 });

            const response = await request(app).get("/proposals");

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].status).toBe("pending");
            expect(response.body[0].authorName).toBe("User1");
        });

        test("should filter proposals by status", async () => {
            const proposal = await createTestProposal("User1", "add_node", { nom: "Test1", x: 0, y: 0 });

            // Approuver la proposition directement dans la DB pour le test
            const response = await request(app)
                .get("/proposals?status=all");

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
        });
    });

    describe("GET /proposals/:id", () => {
        test("should get proposal details", async () => {
            const proposal = await createTestProposal("User1", "add_node", { nom: "Test1", x: 0, y: 0 });

            const response = await request(app).get(`/proposals/${proposal.id}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(proposal.id);
            expect(response.body.authorName).toBe("User1");
            expect(response.body.type).toBe("add_node");
            expect(response.body.data.nom).toBe("Test1");
        });

        test("should return 404 for non-existent proposal", async () => {
            const response = await request(app).get("/proposals/non-existent-id");

            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Proposition introuvable");
        });
    });

    describe("POST /proposals/:id/approve", () => {
        test("should approve add_node proposal", async () => {
            const proposal = await createTestProposal("User1", "add_node", {
                nom: "NewPerson",
                origine: "Test",
                x: 100,
                y: 200
            });

            const response = await request(app)
                .post(`/proposals/${proposal.id}/approve`)
                .send({
                    reviewedBy: "Admin",
                    comment: "Approuvé"
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toContain("approuvée");
            expect(response.body.snapshotCreated).toBe(true);

            // Vérifier que la personne a été créée
            const persons = await getAllPersons();
            expect(persons).toHaveLength(1);
            expect(persons[0].nom).toBe("NewPerson");
        });

        test("should approve add_relation proposal", async () => {
            // Créer deux personnes
            await createTestPerson("Jean", "Famille", 100, 200);
            await createTestPerson("Marie", "Travail", 300, 400);

            const proposal = await createTestProposal("User1", "add_relation", {
                source: "Jean",
                target: "Marie",
                type: "AMIS"
            });

            const response = await request(app)
                .post(`/proposals/${proposal.id}/approve`)
                .send({
                    reviewedBy: "Admin"
                });

            expect(response.status).toBe(200);

            // Vérifier que la relation a été créée
            const graph = await request(app).get("/graph");
            expect(graph.body.edges).toHaveLength(1);
            expect(graph.body.edges[0].type).toBe("AMIS");
        });

        test("should return 400 if reviewedBy is missing", async () => {
            const proposal = await createTestProposal("User1", "add_node", {
                nom: "Test",
                x: 0,
                y: 0
            });

            const response = await request(app)
                .post(`/proposals/${proposal.id}/approve`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe("reviewedBy est obligatoire");
        });

        test("should return 404 for non-existent proposal", async () => {
            const response = await request(app)
                .post("/proposals/non-existent-id/approve")
                .send({
                    reviewedBy: "Admin"
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Proposition introuvable");
        });

        test("should return 400 if already approved", async () => {
            const proposal = await createTestProposal("User1", "add_node", {
                nom: "Test",
                origine: "Test",
                x: 0,
                y: 0
            });

            // Approuver une première fois
            await request(app)
                .post(`/proposals/${proposal.id}/approve`)
                .send({ reviewedBy: "Admin" });

            // Essayer d'approuver une deuxième fois
            const response = await request(app)
                .post(`/proposals/${proposal.id}/approve`)
                .send({ reviewedBy: "Admin" });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain("déjà approved");
        });
    });

    describe("POST /proposals/:id/reject", () => {
        test("should reject a proposal", async () => {
            const proposal = await createTestProposal("User1", "add_node", {
                nom: "Test",
                x: 0,
                y: 0
            });

            const response = await request(app)
                .post(`/proposals/${proposal.id}/reject`)
                .send({
                    reviewedBy: "Admin",
                    comment: "Non pertinent"
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toContain("rejetée");

            // Vérifier que le statut a changé
            const proposals = await getAllProposals();
            expect(proposals[0].status).toBe("rejected");
            expect(proposals[0].reviewedBy).toBe("Admin");
            expect(proposals[0].comment).toBe("Non pertinent");
        });

        test("should return 400 if reviewedBy is missing", async () => {
            const proposal = await createTestProposal("User1", "add_node", {
                nom: "Test",
                x: 0,
                y: 0
            });

            const response = await request(app)
                .post(`/proposals/${proposal.id}/reject`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe("reviewedBy est obligatoire");
        });

        test("should return 400 if already rejected", async () => {
            const proposal = await createTestProposal("User1", "add_node", {
                nom: "Test",
                x: 0,
                y: 0
            });

            // Rejeter une première fois
            await request(app)
                .post(`/proposals/${proposal.id}/reject`)
                .send({ reviewedBy: "Admin", comment: "Test" });

            // Essayer de rejeter une deuxième fois
            const response = await request(app)
                .post(`/proposals/${proposal.id}/reject`)
                .send({ reviewedBy: "Admin", comment: "Test" });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain("déjà rejected");
        });
    });
});
