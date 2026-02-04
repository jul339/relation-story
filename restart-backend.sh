#!/bin/bash
cd "$(dirname "$0")"

if [ -f .backend.pid ]; then
  pid=$(cat .backend.pid)
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    echo "Backend arrêté (PID $pid)"
  fi
  rm -f .backend.pid
fi

echo "Démarrage du backend..."
cd backend && npm start &
echo $! > ../.backend.pid
cd ..
echo "Backend redémarré (PID $(cat .backend.pid))"
