#!/bin/bash

# Script pour peupler la base avec des données de test
# Usage: ./seed-data.sh
# Modèle: nom = "Prénom NOM", origines = tableau de strings (voir AGENTS.md)

API_URL="http://localhost:3000"

echo "🌱 Début du peuplement de la base de données..."
echo ""

# Ajouter les personnes (nom au format Prénom NOM, origines en array)
echo "👥 Ajout des personnes..."

curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Gali MARTIN","origines":["Famille"],"x":200,"y":200}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Odilon BERNARD","origines":["Famille"],"x":350,"y":180}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Eva LEROY","origines":["Famille"],"x":500,"y":220}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Maxime DUPONT","origines":["Travail"],"x":200,"y":350}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Robin PETIT","origines":["École"],"x":350,"y":330}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Arthur ROUSSEAU","origines":["Travail"],"x":500,"y":370}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Inès MOREAU","origines":["École"],"x":650,"y":200}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Cléo SIMON","origines":["Amis"],"x":650,"y":350}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Marion LAURENT","origines":["Travail"],"x":800,"y":270}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Titou LEFEBVRE","origines":["Famille"],"x":200,"y":500}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Paul MICHEL","origines":["Travail"],"x":350,"y":480}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Greg GARCIA","origines":["Sport"],"x":500,"y":520}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"David ROBERT","origines":["Travail"],"x":650,"y":500}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Sophie RICHARD","origines":["École"],"x":800,"y":480}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Lucas DURAND","origines":["Sport"],"x":950,"y":200}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Camille BERNARD","origines":["Amis"],"x":950,"y":350}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Thomas MARTINEZ","origines":["Travail"],"x":950,"y":500}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Emma FAURE","origines":["École"],"x":100,"y":350}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Louis ROY","origines":["Famille"],"x":1100,"y":350}'
curl -s -X POST "$API_URL/person" -H "Content-Type: application/json" \
  -d '{"nom":"Léa MERCIER","origines":["Amis"],"x":500,"y":100}'

echo "✅ 20 personnes ajoutées"
echo ""
sleep 1

# Ajouter les relations (source/target = nom complet "Prénom NOM")
echo "🔗 Ajout des relations..."

# FAMILLE
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Gali MARTIN","target":"Odilon BERNARD","type":"FAMILLE"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Gali MARTIN","target":"Eva LEROY","type":"FAMILLE"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Odilon BERNARD","target":"Eva LEROY","type":"FAMILLE"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Gali MARTIN","target":"Titou LEFEBVRE","type":"FAMILLE"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Emma FAURE","target":"Gali MARTIN","type":"FAMILLE"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Louis ROY","target":"Marion LAURENT","type":"FAMILLE"}'

# AMIS
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Maxime DUPONT","target":"Robin PETIT","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Robin PETIT","target":"Arthur ROUSSEAU","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Maxime DUPONT","target":"Arthur ROUSSEAU","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Inès MOREAU","target":"Cléo SIMON","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Marion LAURENT","target":"Cléo SIMON","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Paul MICHEL","target":"Greg GARCIA","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Greg GARCIA","target":"David ROBERT","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Sophie RICHARD","target":"Emma FAURE","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Lucas DURAND","target":"Thomas MARTINEZ","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Camille BERNARD","target":"Léa MERCIER","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Robin PETIT","target":"Inès MOREAU","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Arthur ROUSSEAU","target":"David ROBERT","type":"AMIS"}'

# AMOUR
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Maxime DUPONT","target":"Sophie RICHARD","type":"AMOUR"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Sophie RICHARD","target":"Maxime DUPONT","type":"AMOUR"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Lucas DURAND","target":"Camille BERNARD","type":"AMOUR"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Camille BERNARD","target":"Lucas DURAND","type":"AMOUR"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Paul MICHEL","target":"Marion LAURENT","type":"AMOUR"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Marion LAURENT","target":"Paul MICHEL","type":"AMOUR"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Léa MERCIER","target":"Thomas MARTINEZ","type":"AMOUR"}'

# Mixtes
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Gali MARTIN","target":"Maxime DUPONT","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Eva LEROY","target":"Inès MOREAU","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Titou LEFEBVRE","target":"Paul MICHEL","type":"FAMILLE"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"Odilon BERNARD","target":"Robin PETIT","type":"AMIS"}'
curl -s -X POST "$API_URL/relation" -H "Content-Type: application/json" \
  -d '{"source":"David ROBERT","target":"Thomas MARTINEZ","type":"AMIS"}'

echo "✅ 32 relations ajoutées"
echo ""

echo "🎉 Peuplement terminé avec succès !"
echo "📊 Statistiques :"
echo "   - 20 personnes (nom = Prénom NOM, origines = array)"
echo "   - 32 relations"
echo "   - Types : FAMILLE (bleu), AMIS (vert), AMOUR (rouge)"
echo ""
echo "🌐 Actualisez votre navigateur pour voir le graphe !"
