import { runQuery } from "../neo4j.js";
import { generateUniqueNodeId, generateUniqueEdgeId } from "../ids.js";
import request from "supertest";
import express from "express";
import crypto from "crypto";
import { initSnapshotsDir, createSnapshot, listSnapshots, getSnapshotById, restoreSnapshot } from "../snapshots.js";

// Créer l'application Express pour les tests
export function createApp() {
    const app = express();
    app.use(express.json());

    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });

    return app;
}

// Nettoyer toutes les données de test (Person + Proposals)
export async function clearDatabase() {
    await runQuery(`MATCH (n) DETACH DELETE n`);
}

// Helper pour créer une personne de test
export async function createTestPerson(nom, origine = null, x = 0, y = 0) {
    const nodeId = await generateUniqueNodeId();
    const query = `
        CREATE (p:Person {
            nom: $nom,
            origine: $origine,
            x: $x,
            y: $y,
            nodeId: $nodeId
        })
        RETURN p
    `;
    const records = await runQuery(query, { nom, origine, x, y, nodeId });
    return records[0].get("p").properties;
}

// Helper pour créer une relation de test
export async function createTestRelation(source, target, type) {
    const edgeId = await generateUniqueEdgeId();
    const query = `
        MATCH (a:Person {nom: $source})
        MATCH (b:Person {nom: $target})
        CREATE (a)-[r:${type} {edgeId: $edgeId}]->(b)
        RETURN r
    `;
    await runQuery(query, { source, target, edgeId });
}

// Helper pour créer une proposition de test (authorEmail optionnel)
export async function createTestProposal(authorName, type, data, authorEmail = null) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const query = `
        CREATE (p:Proposal {
            id: $id,
            authorName: $authorName,
            authorEmail: $authorEmail,
            type: $type,
            data: $data,
            status: 'pending',
            createdAt: $createdAt,
            reviewedAt: null,
            reviewedBy: null,
            comment: null
        })
        RETURN p
    `;

    const records = await runQuery(query, {
        id,
        authorName,
        authorEmail,
        type,
        data: JSON.stringify(data),
        createdAt
    });

    return {
        id,
        ...records[0].get("p").properties,
        data: JSON.parse(records[0].get("p").properties.data)
    };
}

// Helper pour récupérer toutes les personnes
export async function getAllPersons() {
    const query = `MATCH (p:Person) RETURN p`;
    const records = await runQuery(query);
    return records.map(record => record.get("p").properties);
}

// Helper pour récupérer toutes les propositions
export async function getAllProposals() {
    const query = `MATCH (p:Proposal) RETURN p ORDER BY p.createdAt DESC`;
    const records = await runQuery(query);
    return records.map(record => {
        const props = record.get("p").properties;
        return {
            ...props,
            data: JSON.parse(props.data)
        };
    });
}
