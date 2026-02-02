const colors = {
    FAMILLE: "blue",
    AMIS: "green",
    AMOUR: "red"
};

const cy = cytoscape({
    container: document.getElementById('cy'),
    style: [
        {
            selector: 'node',
            style: {
                'label': 'data(id)',
                'background-opacity': 0,        // Rend le fond transparent
                'color': '#000',                // Couleur du texte en noir
                'text-valign': 'center',
                'text-halign': 'center',
                'width': 10,                    // Zone cliquable plus grande
                'height': 10,                   // Zone cliquable plus grande
                'border-width': 0,              // Pas de bordure
                'font-size': 14,                // Taille du texte
                'text-wrap': 'wrap',            // Retour à la ligne si nécessaire
                'text-max-width': 80,           // Largeur max du texte
                'text-background-opacity': 0.9, // Fond semi-transparent
                'text-background-color': '#fff', // Fond blanc
                'text-background-padding': '2px', // Padding réduit
                'z-index': 10                   // Nœuds au-dessus des edges
            }
        },
        {
            selector: 'node[type="group"]',    // Nœuds de type groupe
            style: {
                'label': 'data(id)',
                'text-valign': 'top',
                'text-halign': 'center',
                'text-margin-y': -10,
                'background-opacity': 0.2,      // Fond semi-transparent
                'background-color': 'data(color)', // Couleur selon l'origine
                'border-width': 2,
                'border-color': 'data(color)',
                'border-opacity': 0.6,
                'shape': 'roundrectangle',      // Rectangle avec coins arrondis
                'font-size': 12,
                'font-weight': 'bold',
                'color': '#333',
                'z-index': 0,                   // En arrière-plan
                'padding': 20                   // Espace autour des enfants
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 2,                     // Épaisseur modérée
                'line-color': 'data(color)',
                'target-arrow-color': 'data(color)',
                'target-arrow-shape': 'triangle',
                'arrow-scale': 1,               // Taille normale des flèches
                'curve-style': 'bezier',
                'target-distance-from-node': 20, // Distance du nœud cible
                'source-distance-from-node': 20, // Distance du nœud cible
                'z-index': 1                    // Edges en dessous des nœuds
            }
        }
    ],
    layout: { name: 'cose' },
    // Activer le zoom et le panning
    userZoomingEnabled: true,
    userPanningEnabled: true,  // Active le panning avec trackpad/souris
    boxSelectionEnabled: false,
    autoungrabify: false,  // Permet de déplacer les nœuds
    panningEnabled: true,
    minZoom: 0.1,
    maxZoom: 10
});

// Fonction pour récupérer le graphe depuis le backend
async function loadGraph() {
    try {
        const res = await fetch("http://localhost:3000/graph");
        const data = await res.json();

        cy.elements().remove(); // reset graphe

        // Couleurs pour les groupes (origines)
        const groupColors = {
            'Famille': '#e3f2fd',
            'Travail': '#fff3e0',
            'École': '#f3e5f5',
            'Amis': '#e8f5e9',
            'Sport': '#fce4ec',
            'default': '#f5f5f5'
        };

        // Identifier les origines uniques et créer les groupes
        const origines = new Set();
        data.nodes.forEach(node => {
            if (node.origine) {
                origines.add(node.origine);
            }
        });

        // Créer un nœud parent pour chaque origine
        origines.forEach(origine => {
            cy.add({
                group: 'nodes',
                data: { 
                    id: `group_${origine}`,
                    type: 'group',
                    color: groupColors[origine] || groupColors.default
                }
            });
        });

        // Ajouter les nœuds avec leurs coordonnées et assigner au groupe parent
        data.nodes.forEach(node => {
            const parent = node.origine ? `group_${node.origine}` : undefined;
            cy.add({
                group: 'nodes',
                data: { 
                    id: node.id, 
                    label: node.id,
                    parent: parent
                },
                position: { x: node.x, y: node.y }
            });
        });

        // Ajouter les relations
        data.edges.forEach(edge => {
            cy.add({
                group: 'edges',
                data: {
                    id: `${edge.source}_${edge.target}_${edge.type}`,
                    source: edge.source,
                    target: edge.target,
                    color: colors[edge.type] || 'black'
                }
            });
        });

        // Utiliser le layout preset pour respecter les coordonnées
        cy.layout({ name: 'preset' }).run();
    } catch (error) {
        console.error("Erreur lors du chargement du graphe:", error);
    }
}

// Fonction pour calculer une position automatique
async function calculateAutoPosition() {
    try {
        const res = await fetch("http://localhost:3000/graph");
        const data = await res.json();

        if (!data.nodes || data.nodes.length === 0) {
            // Première personne au centre
            return { x: 500, y: 350 };
        }

        // Calculer le centre
        const sumX = data.nodes.reduce((sum, node) => sum + (node.x || 0), 0);
        const sumY = data.nodes.reduce((sum, node) => sum + (node.y || 0), 0);
        const centerX = sumX / data.nodes.length;
        const centerY = sumY / data.nodes.length;

        // Calculer le rayon max
        let maxDist = 0;
        data.nodes.forEach(node => {
            const dist = Math.sqrt(
                Math.pow(node.x - centerX, 2) +
                Math.pow(node.y - centerY, 2)
            );
            maxDist = Math.max(maxDist, dist);
        });

        // Placer le nouveau nœud à une distance légèrement plus grande
        const angle = Math.random() * 2 * Math.PI;
        const radius = maxDist + 100;

        return {
            x: Math.round(centerX + radius * Math.cos(angle)),
            y: Math.round(centerY + radius * Math.sin(angle))
        };
    } catch (error) {
        // Valeurs par défaut en cas d'erreur
        return {
            x: Math.round(400 + Math.random() * 200),
            y: Math.round(250 + Math.random() * 200)
        };
    }
}

// Fonction pour ajouter une personne
async function addPerson(nom, origine, x, y) {
    // Calculer les positions automatiquement si non fournies
    if (x === null || y === null || isNaN(x) || isNaN(y)) {
        const pos = await calculateAutoPosition();
        x = pos.x;
        y = pos.y;
    }

    const res = await fetch("http://localhost:3000/person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, origine: origine || null, x, y })
    });

    if (res.ok) {
        alert("Personne ajoutée avec succès !");
        loadGraph();
    } else {
        const error = await res.json();
        alert("Erreur : " + error.error);
    }
}

// Fonction pour ajouter une liste de personnes
async function addPersonList(noms, origine) {
    const nomsArray = noms.split(',')
        .map(nom => nom.trim())
        .filter(nom => nom.length > 0);

    if (nomsArray.length === 0) {
        alert("Aucun nom valide dans la liste !");
        return;
    }

    // Récupérer les nœuds existants pour calculer les positions
    let centerX = 500;
    let centerY = 350;
    let radius = 200;

    try {
        const res = await fetch("http://localhost:3000/graph");
        const data = await res.json();

        if (data.nodes && data.nodes.length > 0) {
            // Calculer le centre (moyenne des positions)
            const sumX = data.nodes.reduce((sum, node) => sum + (node.x || 0), 0);
            const sumY = data.nodes.reduce((sum, node) => sum + (node.y || 0), 0);
            centerX = Math.round(sumX / data.nodes.length);
            centerY = Math.round(sumY / data.nodes.length);

            // Calculer le rayon (distance max du centre + marge)
            let maxDist = 0;
            data.nodes.forEach(node => {
                const dist = Math.sqrt(
                    Math.pow(node.x - centerX, 2) +
                    Math.pow(node.y - centerY, 2)
                );
                maxDist = Math.max(maxDist, dist);
            });
            radius = Math.round(maxDist + 150); // Ajouter une marge
        }
    } catch (error) {
        console.log("Utilisation des valeurs par défaut", error);
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Calculer les positions en cercle
    for (let i = 0; i < nomsArray.length; i++) {
        const angle = (2 * Math.PI * i) / nomsArray.length;
        const x = Math.round(centerX + radius * Math.cos(angle));
        const y = Math.round(centerY + radius * Math.sin(angle));

        try {
            const res = await fetch("http://localhost:3000/person", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nom: nomsArray[i],
                    origine: origine || null,
                    x,
                    y
                })
            });

            if (res.ok) {
                successCount++;
            } else {
                errorCount++;
                const error = await res.json();
                errors.push(`${nomsArray[i]}: ${error.error}`);
            }
        } catch (error) {
            errorCount++;
            errors.push(`${nomsArray[i]}: ${error.message}`);
        }
    }

    let message = `✅ ${successCount} personnes ajoutées`;
    if (errorCount > 0) {
        message += `\n❌ ${errorCount} erreurs:\n${errors.join('\n')}`;
    }

    alert(message);
    loadGraph();
}

// Fonction pour supprimer une personne
async function deletePerson(nom) {
    const res = await fetch("http://localhost:3000/person", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom })
    });
    
    if (res.ok) {
        alert("Personne supprimée avec succès !");
        loadGraph();
    } else {
        alert("Erreur lors de la suppression");
    }
}

// Fonction pour mettre à jour une personne
async function updatePerson(oldNom, nom, origine) {
    const res = await fetch("http://localhost:3000/person", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldNom, nom, origine })
    });
    
    if (res.ok) {
        alert("Personne modifiée avec succès !");
        loadGraph();
    } else {
        alert("Erreur lors de la modification");
    }
}

// Fonction pour ajouter une relation
async function addRelation(source, target, type) {
    const res = await fetch("http://localhost:3000/relation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, target, type })
    });

    if (res.ok) {
        alert("Relation ajoutée avec succès !");
        loadGraph();
    } else {
        alert("Erreur lors de l'ajout de la relation");
    }
}

// Fonction pour tout supprimer
async function deleteAll() {
    if (!confirm("Voulez-vous vraiment tout supprimer ?")) {
        return;
    }

    const res = await fetch("http://localhost:3000/all", {
        method: "DELETE"
    });

    if (res.ok) {
        alert("Tout a été supprimé !");
        loadGraph();
    } else {
        alert("Erreur lors de la suppression");
    }
}

// Fonction pour sauvegarder les coordonnées d'un nœud
async function saveNodePosition(nom, x, y) {
    await fetch("http://localhost:3000/person/coordinates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, x: Math.round(x), y: Math.round(y) })
    });
}

// Event listener pour le drag and drop des nœuds
cy.on('dragfree', 'node', function (evt) {
    const node = evt.target;
    const position = node.position();
    const nom = node.data('id');

    console.log(`Nœud ${nom} déplacé vers (${position.x}, ${position.y})`);
    saveNodePosition(nom, position.x, position.y);
});

// Event listener pour ajouter un nœud en cliquant sur le fond
cy.on('click', function (evt) {
    // Vérifier que le clic est sur le fond (pas sur un nœud ou une arête)
    if (evt.target === cy) {
        const position = evt.position;
        const nom = prompt("Nom de la personne :");

        if (nom && nom.trim()) {
            const origine = prompt("Origine (optionnel, appuyez sur Entrée pour ignorer) :");
            addPerson(nom.trim(), origine ? origine.trim() : null,
                Math.round(position.x), Math.round(position.y));
        }
    }
});

// Event listener pour modifier/supprimer un nœud en cliquant dessus
cy.on('tap', 'node[!type]', function(evt) {
    const node = evt.target;
    const nom = node.data('id');
    
    const action = prompt(
        `Nœud: ${nom}\n\n` +
        `Tapez:\n` +
        `- "s" ou "supprimer" pour supprimer\n` +
        `- "m" ou "modifier" pour modifier\n` +
        `- Entrée pour annuler`
    );
    
    if (!action) return;
    
    const actionLower = action.toLowerCase().trim();
    
    if (actionLower === 's' || actionLower === 'supprimer') {
        if (confirm(`Voulez-vous vraiment supprimer "${nom}" ?`)) {
            deletePerson(nom);
        }
    } else if (actionLower === 'm' || actionLower === 'modifier') {
        const newNom = prompt(`Nouveau nom (actuel: ${nom}) :`, nom);
        if (newNom && newNom.trim()) {
            const newOrigine = prompt(`Nouvelle origine (laissez vide pour aucune) :`);
            updatePerson(nom, newNom.trim(), newOrigine ? newOrigine.trim() : null);
        }
    }
});

// Fonction pour exporter les données
async function exportData() {
    const res = await fetch("http://localhost:3000/export");
    const data = await res.json();

    // Créer un fichier JSON et le télécharger
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert("Export réussi !");
}

// Fonction pour importer les données
async function importData(file) {
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.nodes || !data.edges) {
                alert("Format de fichier invalide !");
                return;
            }

            const res = await fetch("http://localhost:3000/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const result = await res.json();
                alert(`Import réussi ! ${result.nodesCount} nœuds et ${result.edgesCount} relations importés.`);
                loadGraph();
            } else {
                const error = await res.json();
                alert("Erreur lors de l'import : " + error.error);
            }
        } catch (error) {
            alert("Erreur lors de la lecture du fichier : " + error.message);
        }
    };

    reader.readAsText(file);
}

// Initialisation après chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    // Gestionnaire du formulaire personne
    document.getElementById('form-person').addEventListener('submit', (e) => {
        e.preventDefault();
        const nom = document.getElementById('nom').value;
        const origine = document.getElementById('origine').value;
        const xVal = document.getElementById('x').value;
        const yVal = document.getElementById('y').value;
        const x = xVal ? parseInt(xVal) : null;
        const y = yVal ? parseInt(yVal) : null;

        addPerson(nom, origine, x, y);
        e.target.reset();
    });

    // Gestionnaire du formulaire liste
    document.getElementById('form-list').addEventListener('submit', (e) => {
        e.preventDefault();
        const noms = document.getElementById('list-noms').value;
        const origine = document.getElementById('list-origine').value;

        addPersonList(noms, origine);
        // Reset seulement le textarea des noms
        document.getElementById('list-noms').value = '';
    });

    // Gestionnaire du formulaire relation
    document.getElementById('form-relation').addEventListener('submit', (e) => {
        e.preventDefault();
        const source = document.getElementById('source-nom').value;
        const target = document.getElementById('target-nom').value;
        const type = document.getElementById('type').value;

        addRelation(source, target, type);
        e.target.reset();
    });

    // Contrôles de zoom
    document.getElementById('zoom-in').addEventListener('click', () => {
        cy.zoom(cy.zoom() * 1.2);
        cy.center();
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        cy.zoom(cy.zoom() * 0.8);
        cy.center();
    });

    document.getElementById('fit').addEventListener('click', () => {
        cy.fit();
    });

    // Bouton pour rafraîchir le graphe
    document.getElementById('refresh').addEventListener('click', loadGraph);

    // Bouton pour tout supprimer
    document.getElementById('delete-all').addEventListener('click', deleteAll);

    // Bouton pour exporter
    document.getElementById('export').addEventListener('click', exportData);

    // Bouton pour importer
    document.getElementById('import').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });

    // Gestionnaire du fichier d'import
    document.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importData(file);
            e.target.value = ''; // Reset input
        }
    });

    // Bouton pour afficher/cacher le menu
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        console.log('Avant toggle:', sidebar.className);
        sidebar.classList.toggle('hidden');
        console.log('Après toggle:', sidebar.className);

        // Forcer Cytoscape à se redimensionner après l'animation
        setTimeout(() => {
            cy.resize();
            cy.fit();
        }, 300);
    });

    // Chargement initial
    loadGraph();
});
