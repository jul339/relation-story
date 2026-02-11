import request from "supertest";
import app from "../index.js";
import { clearDatabase, createTestPerson, createTestRelation } from "./setup.js";

describe("GET /graph visibility", () => {
    beforeEach(async () => {
        await clearDatabase();
    });

    test("admin (Host localhost) receives full graph with nom and relation types", async () => {
        await createTestPerson("Jean DUPONT", "Famille", 10, 20);
        await createTestPerson("Marie MARTIN", "Amis", 30, 40);
        await createTestRelation("Jean DUPONT", "Marie MARTIN", "AMIS");

        const res = await request(app)
            .get("/graph")
            .set("Host", "localhost");

        expect(res.status).toBe(200);
        expect(res.body.nodes).toHaveLength(2);
        const nodeWithNom = res.body.nodes.find((n) => n.nom === "Jean DUPONT");
        expect(nodeWithNom).toBeDefined();
        expect(nodeWithNom.origine).toBe("Famille");
        expect(nodeWithNom.nodeId).toBeDefined();
        expect(res.body.edges).toHaveLength(1);
        expect(res.body.edges[0].type).toBe("AMIS");
        expect(res.body.edges[0].source).toBe("Jean DUPONT");
        expect(res.body.edges[0].target).toBe("Marie MARTIN");
    });

    test("non-admin (Host example.com) receives anonymous graph: nodeId only, CONNECTION type", async () => {
        await createTestPerson("Jean DUPONT", "Famille", 10, 20);
        await createTestPerson("Marie MARTIN", "Amis", 30, 40);
        await createTestRelation("Jean DUPONT", "Marie MARTIN", "AMIS");

        const res = await request(app)
            .get("/graph")
            .set("Host", "example.com");

        expect(res.status).toBe(200);
        expect(res.body.nodes).toHaveLength(2);
        res.body.nodes.forEach((n) => {
            expect(n.id).toMatch(/^\d{6}$/);
            expect(n.x).toBeDefined();
            expect(n.y).toBeDefined();
            expect(n.nom).toBeUndefined();
            expect(n.origine).toBeUndefined();
        });
        expect(res.body.edges).toHaveLength(1);
        expect(res.body.edges[0].type).toBe("CONNECTION");
        expect(res.body.edges[0].source).toMatch(/^\d{6}$/);
        expect(res.body.edges[0].target).toMatch(/^\d{6}$/);
    });
});
