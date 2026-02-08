# Tests Backend

Suite de tests d'intégration pour l'API backend.

## Prérequis

1. **Neo4j** : les tests utilisent la **même** Neo4j que le dev (docker-compose, port 7687). Un seul conteneur, ce qui évite les erreurs ECONNRESET sous WSL.

   ```bash
   cd /home/jules/relation-story
   docker-compose up -d
   ```

   Les tests nettoient la base avant chaque suite. Pour utiliser une autre instance : `NEO4J_URI=bolt://127.0.0.1:7688 npm test`.

2. **Dépendances installées** :

   ```bash
   cd backend
   npm install
   ```

## Lancer les tests

### Tous les tests

```bash
npm test
```

### En mode watch (relance automatique)

```bash
npm run test:watch
```

### Un fichier spécifique

```bash
npm test person.test.js
```

ou

```bash
npm test proposals
```

### Avec couverture

```bash
npm test -- --coverage
```

## Structure des tests

- `setup.js` - Helpers et utilitaires (clearDatabase, createTestPerson, etc.)
- `person.test.js` - Tests endpoints Person (GET /graph, POST /person, etc.)
- `relation.test.js` - Tests endpoints Relations (POST /relation, DELETE /relation)
- `proposals.test.js` - Tests système de propositions (création, approbation, rejet)
- `snapshots.test.js` - Tests snapshots (création, liste, restauration)
- `export-import.test.js` - Tests export/import JSON

## Notes importantes

- **Même base que le dev** : tests et app utilisent Neo4j sur **7687** (docker-compose). Sous WSL, un seul conteneur évite les ECONNRESET.
- **Base de données nettoyée** : Chaque test nettoie la base avant de s'exécuter
- **Isolation** : Les tests sont isolés et peuvent être lancés dans n'importe quel ordre
- **Timeout** : 10 secondes par test (Neo4j peut être lent)
- **Proposals préservées** : Les tests de restore vérifient que les Proposals ne sont pas supprimées

## Résolution de problèmes

### Erreur de connexion Neo4j

```
Error: Failed to connect to server
```

**Solution** : Démarrer Neo4j avec `docker-compose up -d`, puis lancer `npm test` depuis `backend/`.

### Tests qui timeout

```
Timeout - Async callback was not invoked within the 10000 ms timeout
```

**Solution** : Augmenter le timeout dans `jest.config.js` :

```javascript
testTimeout: 20000
```

### Erreur ES modules

```
SyntaxError: Cannot use import statement outside a module
```

**Solution** : Vérifier que `NODE_OPTIONS=--experimental-vm-modules` est bien dans le script test

## Statistiques

- **5 fichiers de tests**
- **~50 tests au total**
- **Couverture** : Person, Relations, Proposals, Snapshots, Export/Import
