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
                'text-max-width': 80            // Largeur max du texte
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 3,
                'line-color': 'data(color)',
                'target-arrow-color': 'data(color)',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier'
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

        // Ajouter les nœuds avec leurs coordonnées
        data.nodes.forEach(node => {
            cy.add({
                group: 'nodes',
                data: { id: node.id, label: node.id },
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

// Fonction pour ajouter une personne
async function addPerson(nom, origine, x, y) {
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
        const x = parseInt(document.getElementById('x').value);
        const y = parseInt(document.getElementById('y').value);

        addPerson(nom, origine, x, y);
        e.target.reset();
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
