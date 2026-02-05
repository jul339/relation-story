#!/bin/bash
cd "$(dirname "$0")"

DOCKER_COMPOSE="docker-compose"

# Neo4j : démarrer si pas déjà en cours
if ! $DOCKER_COMPOSE ps --status running -q neo4j 2>/dev/null | grep -q .; then
  echo "Démarrage de Neo4j..."
  if ! $DOCKER_COMPOSE up -d 2>&1; then
    echo "Recréation du réseau..."
    $DOCKER_COMPOSE down
    $DOCKER_COMPOSE up -d
  fi
  sleep 3
fi

# Backend
if [ -f .backend.pid ] && kill -0 "$(cat .backend.pid)" 2>/dev/null; then
  echo "Backend déjà en cours (PID $(cat .backend.pid))"
else
  echo "Démarrage du backend..."
  (cd backend && npm start) &
  echo $! > .backend.pid
  sleep 1
fi

# Frontend
echo "Démarrage du frontend..."
cd frontend && python3 -m http.server 8080
