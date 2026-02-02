#!/bin/bash

# Script pour peupler la base avec des données de test
# Usage: ./seed-data.sh

API_URL="http://localhost:3000"

echo "🌱 Début du peuplement de la base de données..."
echo ""

# Supprimer toutes les données existantes
echo "🗑️  Suppression des données existantes..."
curl -s -X DELETE "$API_URL/all"
echo ""
sleep 1

# Ajouter les personnes
echo "👥 Ajout des personnes..."

curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Gali","origine":"Famille","x":200,"y":200}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Odilon","origine":"Famille","x":350,"y":180}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Eva","origine":"Famille","x":500,"y":220}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Maxime","origine":"Travail","x":200,"y":350}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Robin","origine":"École","x":350,"y":330}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Arthur","origine":"Travail","x":500,"y":370}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Inès","origine":"École","x":650,"y":200}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Cléo","origine":"Amis","x":650,"y":350}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Marion","origine":"Travail","x":800,"y":270}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Titou","origine":"Famille","x":200,"y":500}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Paul","origine":"Travail","x":350,"y":480}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Greg","origine":"Sport","x":500,"y":520}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"David","origine":"Travail","x":650,"y":500}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Sophie","origine":"École","x":800,"y":480}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Lucas","origine":"Sport","x":950,"y":200}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Camille","origine":"Amis","x":950,"y":350}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Thomas","origine":"Travail","x":950,"y":500}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Emma","origine":"École","x":100,"y":350}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Louis","origine":"Famille","x":1100,"y":350}'
  
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Léa","origine":"Amis","x":500,"y":100}'

echo "✅ 20 personnes ajoutées"
echo ""
sleep 1

# Ajouter les relations
echo "🔗 Ajout des relations..."

# Relations FAMILLE (bleu)
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Gali","target":"Odilon","type":"FAMILLE"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Gali","target":"Eva","type":"FAMILLE"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Odilon","target":"Eva","type":"FAMILLE"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Gali","target":"Titou","type":"FAMILLE"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Emma","target":"Gali","type":"FAMILLE"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Louis","target":"Marion","type":"FAMILLE"}'

# Relations AMIS (vert)
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Maxime","target":"Robin","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Robin","target":"Arthur","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Maxime","target":"Arthur","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Inès","target":"Cléo","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Marion","target":"Cléo","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Paul","target":"Greg","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Greg","target":"David","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Sophie","target":"Emma","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Lucas","target":"Thomas","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Camille","target":"Léa","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Robin","target":"Inès","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Arthur","target":"David","type":"AMIS"}'

# Relations AMOUR (rouge)
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Maxime","target":"Sophie","type":"AMOUR"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Sophie","target":"Maxime","type":"AMOUR"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Lucas","target":"Camille","type":"AMOUR"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Camille","target":"Lucas","type":"AMOUR"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Paul","target":"Marion","type":"AMOUR"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Marion","target":"Paul","type":"AMOUR"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Léa","target":"Thomas","type":"AMOUR"}'

# Relations mixtes (travail, école, etc.)
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Gali","target":"Maxime","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Eva","target":"Inès","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Titou","target":"Paul","type":"FAMILLE"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Odilon","target":"Robin","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"David","target":"Thomas","type":"AMIS"}'

echo "✅ 32 relations ajoutées"
echo ""

echo "🎉 Peuplement terminé avec succès !"
echo "📊 Statistiques :"
echo "   - 20 personnes"
echo "   - 32 relations"
echo "   - Types : FAMILLE (bleu), AMIS (vert), AMOUR (rouge)"
echo ""
echo "🌐 Actualisez votre navigateur pour voir le graphe !"
