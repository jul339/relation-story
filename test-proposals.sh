#!/bin/bash

# Script de test pour le système de propositions
# Usage: ./test-proposals.sh

API="http://localhost:3000"

echo "🧪 Test du système de propositions"
echo "=================================="
echo ""

# Test 1: Créer une proposition
echo "1️⃣  Création d'une proposition..."
RESPONSE=$(curl -s -X POST $API/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "authorName": "Jean Test",
    "authorEmail": "jean@test.com",
    "type": "add_node",
    "data": {
      "nom": "TestPerson",
      "origine": "Test",
      "x": 100,
      "y": 200
    }
  }')

PROPOSAL_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "✅ Proposition créée: $PROPOSAL_ID"
echo ""

# Test 2: Statistiques
echo "2️⃣  Statistiques des propositions..."
curl -s $API/proposals/stats | jq '.'
echo ""

# Test 3: Liste des propositions pending
echo "3️⃣  Liste des propositions en attente..."
curl -s "$API/proposals?status=pending" | jq '.[0] | {id, authorName, type, status}'
echo ""

# Test 4: Détails de la proposition
if [ ! -z "$PROPOSAL_ID" ]; then
  echo "4️⃣  Détails de la proposition $PROPOSAL_ID..."
  curl -s "$API/proposals/$PROPOSAL_ID" | jq '{id, authorName, type, data, status}'
  echo ""
fi

# Test 5: Approuver la proposition
if [ ! -z "$PROPOSAL_ID" ]; then
  echo "5️⃣  Approbation de la proposition..."
  curl -s -X POST "$API/proposals/$PROPOSAL_ID/approve" \
    -H "Content-Type: application/json" \
    -d '{
      "reviewedBy": "Admin Test",
      "comment": "Test approuvé"
    }' | jq '.'
  echo ""
fi

# Test 6: Liste des snapshots
echo "6️⃣  Liste des snapshots créés..."
curl -s $API/snapshots | jq '.[] | {id, timestamp, message, author, nodesCount}'
echo ""

# Test 7: Créer un snapshot manuel
echo "7️⃣  Création d'un snapshot manuel..."
curl -s -X POST $API/snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Snapshot de test",
    "author": "Test Script"
  }' | jq '.'
echo ""

echo "✅ Tests terminés!"
