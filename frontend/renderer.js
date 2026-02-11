const API_BASE =
    window.location.hostname === "localhost" && window.location.port === "8080"
        ? "http://localhost:3000"
        : window.location.origin;

function apiFetch(url, opts = {}) {
    return fetch(url, { ...opts, credentials: "include" });
}

// Format nom : Prénom NOM (ex. Jean HEUDE-LEGRANG)
const NOM_REGEX = /^[A-Z][a-z]* [A-Z][A-Z-]*$/;
function isValidNom(nom) {
    return typeof nom === "string" && NOM_REGEX.test(nom.trim());
}

// Mode collaborateur : ?mode=propose dans l'URL ; en dehors de localhost, seul le mode propose est accessible
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const urlParams = new URLSearchParams(window.location.search);
const isProposeMode = !isLocalhost || urlParams.get("mode") === "propose";

let currentUser = null; // { email, person_node_id, visibility_level } ou null

const colors = {
    FAMILLE: "blue",
    AMIS: "green",
    AMOUR: "red",
    CONNECTION: "#999"
};

const cy = cytoscape({
    container: document.getElementById('cy'),
    style: [
        {
            selector: 'node',
            style: {
                'label': 'data(label)',
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
        },
        {
            selector: 'node.pending',
            style: {
                'opacity': 0.5,
                'text-opacity': 0.8
            }
        },
        {
            selector: 'edge.pending',
            style: {
                'opacity': 0.45,
                'line-style': 'dashed'
            }
        },
        {
            selector: 'node.pending-delete',
            style: { 'opacity': 0.4 }
        },
        {
            selector: 'edge.pending-delete',
            style: { 'opacity': 0.35, 'line-style': 'dashed' }
        },
        {
            selector: 'node.pending-modify',
            style: { 'opacity': 0.6 }
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
        const res = await apiFetch(`${API_BASE}/graph`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data.details || data.error || res.statusText;
            alert("Erreur graphe: " + msg);
            return;
        }
        if (data.error) {
            alert("Erreur graphe: " + (data.details || data.error));
            return;
        }

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
            const label = node.nom != null ? node.nom : node.id;
            cy.add({
                group: 'nodes',
                data: {
                    id: node.id,
                    label: label,
                    parent: parent
                },
                position: { x: node.x, y: node.y }
            });
        });

        // Ajouter les relations (type peut être CONNECTION quand masqué)
        data.edges.forEach(edge => {
            const edgeId = edge.edgeId || `${edge.source}_${edge.target}_${edge.type || "CONNECTION"}`;
            cy.add({
                group: 'edges',
                data: {
                    id: edgeId,
                    source: edge.source,
                    target: edge.target,
                    color: colors[edge.type] || colors.CONNECTION || '#999'
                }
            });
        });

        // Afficher les propositions en attente sur le graphe (transparence)
        await loadPendingOnGraph();

        // Utiliser le layout preset pour respecter les coordonnées
        cy.layout({ name: 'preset' }).run();
    } catch (error) {
        console.error("Erreur lors du chargement du graphe:", error);
    }
}

async function loadPendingOnGraph() {
    try {
        const res = await apiFetch(`${API_BASE}/proposals?status=pending`);
        if (!res.ok) return;
        const list = await res.json();
        if (!Array.isArray(list) || list.length === 0) return;

        list.forEach(p => {
            const data = p.data || {};
            if (p.type === "add_node" && data.nom) {
                if (cy.getElementById(data.nom).length > 0) return;
                const parent = data.origine && cy.getElementById(`group_${data.origine}`).length > 0 ? `group_${data.origine}` : undefined;
                cy.add({
                    group: 'nodes',
                    data: { id: data.nom, label: data.nom, parent },
                    position: { x: data.x != null ? data.x : 0, y: data.y != null ? data.y : 0 },
                    classes: 'pending'
                });
            }
        });

        list.forEach(p => {
            const data = p.data || {};
            if (p.type === "add_relation" && data.source && data.target) {
                if (cy.getElementById(data.source).length === 0 || cy.getElementById(data.target).length === 0) return;
                const edgeId = `pending_e_${p.id}`;
                if (cy.getElementById(edgeId).length > 0) return;
                cy.add({
                    group: 'edges',
                    data: {
                        id: edgeId,
                        source: data.source,
                        target: data.target,
                        color: colors[data.type] || 'black'
                    },
                    classes: 'pending'
                });
            }
        });

        list.forEach(p => {
            const data = p.data || {};
            if (p.type === "modify_node" && data.nom) {
                const node = cy.getElementById(data.nom);
                if (node.length) node.addClass('pending-modify');
            }
            if (p.type === "delete_node" && data.nom) {
                const node = cy.getElementById(data.nom);
                if (node.length) node.addClass('pending-delete');
            }
            if (p.type === "delete_relation" && data.source && data.target && data.type) {
                const edge = cy.getElementById(`${data.source}_${data.target}_${data.type}`);
                if (edge.length) edge.addClass('pending-delete');
            }
        });
    } catch (_) { }
}

// Fonction pour calculer une position automatique
async function calculateAutoPosition() {
    try {
        const res = await apiFetch(`${API_BASE}/graph`);
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

    const res = await apiFetch(`${API_BASE}/person`, {
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
    const invalid = nomsArray.filter(n => !isValidNom(n));
    if (invalid.length > 0) {
        alert("Noms invalides (format Prénom NOM requis) : " + invalid.join(", "));
        return;
    }

    // Récupérer les nœuds existants pour calculer les positions
    let centerX = 500;
    let centerY = 350;
    let radius = 200;

    try {
        const res = await apiFetch(`${API_BASE}/graph`);
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
            const res = await apiFetch(`${API_BASE}/person`, {
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
    const res = await apiFetch(`${API_BASE}/person`, {
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
    const res = await apiFetch(`${API_BASE}/person`, {
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
    const res = await apiFetch(`${API_BASE}/relation`, {
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

// Fonction pour supprimer une relation
async function deleteRelation(source, target, type) {
    const res = await apiFetch(`${API_BASE}/relation`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, target, type })
    });

    if (res.ok) {
        alert("Relation supprimée avec succès !");
        loadGraph();
    } else {
        alert("Erreur lors de la suppression de la relation");
    }
}

// Fonction pour dissoudre un groupe (retirer l'origine des membres)
async function dissolveGroup(members) {
    let successCount = 0;
    let errorCount = 0;

    for (const member of members) {
        const nom = member.data('id');
        try {
            const res = await apiFetch(`${API_BASE}/person`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ oldNom: nom, nom: nom, origine: null })
            });

            if (res.ok) {
                successCount++;
            } else {
                errorCount++;
            }
        } catch (error) {
            errorCount++;
        }
    }

    alert(`Groupe dissous : ${successCount} membres mis à jour, ${errorCount} erreurs`);
    loadGraph();
}

// Fonction pour tout supprimer
async function deleteAll() {
    if (!confirm("Voulez-vous vraiment tout supprimer ?")) {
        return;
    }

    const res = await apiFetch(`${API_BASE}/all`, {
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
    await apiFetch(`${API_BASE}/person/coordinates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, x: Math.round(x), y: Math.round(y) })
    });
}

// --- Propositions (mode collaborateur) ---
async function submitProposal(type, data) {
    if (isProposeMode && !currentUser) {
        alert("Connectez-vous pour proposer une modification.");
        return;
    }
    try {
        const res = await apiFetch(`${API_BASE}/proposals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, data })
        });
        const json = await res.json();
        if (res.ok) {
            alert("Proposition envoyée. Elle sera validée par l'administrateur.");
            loadProposalStats();
        } else {
            alert("Erreur : " + (json.error || json.details || "envoi impossible"));
        }
    } catch (e) {
        alert("Erreur réseau : " + e.message);
    }
}

async function loadProposalStats() {
    if (!isProposeMode) return;
    try {
        const res = await apiFetch(`${API_BASE}/proposals/stats`);
        const data = await res.json();
        const el = document.getElementById("proposal-stats");
        if (el) el.textContent = `${data.pending || 0} proposition(s) en attente`;
    } catch (_) { }
}

async function loadPendingProposals() {
    try {
        const res = await apiFetch(`${API_BASE}/proposals?status=pending`);
        const list = await res.json();
        const container = document.getElementById("proposals-list");
        if (!container) return;
        container.innerHTML = "";
        if (list.length === 0) {
            container.innerHTML = "<p class=\"proposal-stats\">Aucune proposition en attente.</p>";
            return;
        }
        list.forEach(p => {
            const card = document.createElement("div");
            card.className = "proposal-card";
            const typeLabel = { add_node: "Ajouter personne", add_relation: "Ajouter relation", modify_node: "Modifier personne", delete_node: "Supprimer personne", delete_relation: "Supprimer relation" }[p.type] || p.type;
            const dataStr = typeof p.data === "object" ? JSON.stringify(p.data) : p.data;
            card.innerHTML = `
                <div class="proposal-meta">${p.authorName} · ${typeLabel}</div>
                <div>${dataStr}</div>
                <div class="proposal-actions">
                    <button class="approve" data-id="${p.id}">Approuver</button>
                    <button class="reject" data-id="${p.id}">Rejeter</button>
                </div>`;
            container.appendChild(card);
        });
        container.querySelectorAll("button.approve").forEach(btn => {
            btn.addEventListener("click", () => approveProposal(btn.dataset.id));
        });
        container.querySelectorAll("button.reject").forEach(btn => {
            btn.addEventListener("click", () => rejectProposal(btn.dataset.id));
        });
    } catch (e) {
        console.error(e);
        const container = document.getElementById("proposals-list");
        if (container) container.innerHTML = "<p>Erreur chargement propositions.</p>";
    }
}

async function approveProposal(id) {
    const reviewedBy = prompt("Votre nom (reviewer) :", "Admin") || "Admin";
    try {
        const res = await apiFetch(`${API_BASE}/proposals/${id}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reviewedBy })
        });
        if (res.ok) {
            alert("Proposition approuvée.");
            loadGraph();
            loadPendingProposals();
        } else {
            const j = await res.json();
            alert("Erreur : " + (j.error || j.details || "inconnu"));
        }
    } catch (e) {
        alert("Erreur : " + e.message);
    }
}

async function rejectProposal(id) {
    const comment = prompt("Commentaire (optionnel) :");
    const reviewedBy = prompt("Votre nom (reviewer) :", "Admin") || "Admin";
    try {
        const res = await apiFetch(`${API_BASE}/proposals/${id}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reviewedBy, comment: comment || null })
        });
        if (res.ok) {
            alert("Proposition rejetée.");
            loadPendingProposals();
        } else {
            const j = await res.json();
            alert("Erreur : " + (j.error || j.details || "inconnu"));
        }
    } catch (e) {
        alert("Erreur : " + e.message);
    }
}

function applyProposeModeUI() {
    const authorSection = document.getElementById("propose-author-section");
    const adminSection = document.getElementById("proposals-admin-section");
    const deleteAllBtn = document.getElementById("delete-all");
    const importBtn = document.getElementById("import");
    const loginHint = document.getElementById("propose-login-hint");
    const statsEl = document.getElementById("proposal-stats");
    if (isProposeMode) {
        if (authorSection) authorSection.style.display = "block";
        if (adminSection) adminSection.style.display = "none";
        if (deleteAllBtn) deleteAllBtn.style.display = "none";
        if (importBtn) importBtn.style.display = "none";
        if (currentUser) {
            if (loginHint) loginHint.style.display = "none";
            if (statsEl) statsEl.style.display = "";
            loadProposalStats();
        } else {
            if (loginHint) loginHint.style.display = "block";
            if (statsEl) statsEl.style.display = "none";
        }
    } else {
        if (authorSection) authorSection.style.display = "none";
        if (adminSection) adminSection.style.display = "block";
        if (deleteAllBtn) deleteAllBtn.style.display = "block";
        if (importBtn) importBtn.style.display = "block";
        loadPendingProposals();
    }
}

// Event listener pour le drag and drop des nœuds (ne pas sauver en mode proposition)
cy.on('dragfree', 'node', function (evt) {
    if (isProposeMode) return;
    const node = evt.target;
    const position = node.position();
    const nom = node.data('id');
    saveNodePosition(nom, position.x, position.y);
});

// Event listener pour ajouter un nœud en cliquant sur le fond
cy.on('click', function (evt) {
    if (evt.target !== cy) return;
    const position = evt.position;
    const nom = prompt("Nom de la personne (ex. Jean HEUDE-LEGRANG) :");
    if (!nom || !nom.trim()) return;
    if (!isValidNom(nom)) {
        alert("Le nom doit être au format Prénom NOM (ex. Jean HEUDE-LEGRANG).");
        return;
    }
    const origine = prompt("Origine (optionnel, appuyez sur Entrée pour ignorer) :");
    if (isProposeMode) {
        submitProposal("add_node", {
            nom: nom.trim(),
            origine: origine ? origine.trim() : null,
            x: Math.round(position.x),
            y: Math.round(position.y)
        });
    } else {
        addPerson(nom.trim(), origine ? origine.trim() : null, Math.round(position.x), Math.round(position.y));
    }
});

// Event listener pour modifier/supprimer un nœud en double-cliquant dessus
cy.on('dbltap', 'node[!type]', function (evt) {
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
        if (!confirm(`Voulez-vous vraiment supprimer "${nom}" ?`)) return;
        if (isProposeMode) {
            submitProposal("delete_node", { nom });
        } else {
            deletePerson(nom);
        }
    } else if (actionLower === 'm' || actionLower === 'modifier') {
        const newNom = prompt(`Nouveau nom (actuel: ${nom}), format Prénom NOM :`, nom);
        if (!newNom || !newNom.trim()) return;
        if (!isValidNom(newNom)) {
            alert("Le nom doit être au format Prénom NOM (ex. Jean HEUDE-LEGRANG).");
            return;
        }
        const newOrigine = prompt(`Nouvelle origine (laissez vide pour aucune) :`);
        if (isProposeMode) {
            submitProposal("modify_node", { nom, newNom: newNom.trim(), newOrigine: newOrigine ? newOrigine.trim() : null });
        } else {
            updatePerson(nom, newNom.trim(), newOrigine ? newOrigine.trim() : null);
        }
    }
});

// Event listener pour modifier/supprimer une relation en double-cliquant dessus
cy.on('dbltap', 'edge', function (evt) {
    const edge = evt.target;
    const source = edge.data('source');
    const target = edge.data('target');
    const type = edge.id().split('_').pop();

    const action = prompt(
        `Relation: ${source} → ${target} (${type})\n\n` +
        `Tapez:\n` +
        `- "s" ou "supprimer" pour supprimer\n` +
        `- "f" "a" ou "m" pour changer le type (FAMILLE, AMIS, AMOUR)\n` +
        `- Entrée pour annuler`
    );

    if (!action) return;

    const actionLower = action.toLowerCase().trim();

    if (actionLower === 's' || actionLower === 'supprimer') {
        if (!confirm(`Voulez-vous vraiment supprimer cette relation ?`)) return;
        if (isProposeMode) {
            submitProposal("delete_relation", { source, target, type });
        } else {
            deleteRelation(source, target, type);
        }
    } else if (actionLower === 'f' || actionLower === 'a' || actionLower === 'm') {
        const newType = actionLower === 'f' ? 'FAMILLE' : actionLower === 'a' ? 'AMIS' : 'AMOUR';
        if (isProposeMode) {
            submitProposal("delete_relation", { source, target, type });
            submitProposal("add_relation", { source, target, type: newType });
        } else {
            deleteRelation(source, target, type);
            setTimeout(() => addRelation(source, target, newType), 500);
        }
    }
});

// Event listener pour les groupes en double-cliquant dessus
cy.on('dbltap', 'node[type="group"]', function (evt) {
    if (isProposeMode) {
        alert("Seul l'administrateur peut dissoudre un groupe.");
        return;
    }
    const group = evt.target;
    const groupName = group.data('id').replace('group_', '');
    const members = cy.nodes(`[parent="${group.data('id')}"]`);
    const memberNames = members.map(n => n.data('id')).join(', ');
    const action = prompt(
        `Groupe: ${groupName}\n` +
        `Membres (${members.length}): ${memberNames}\n\n` +
        `Tapez:\n` +
        `- "d" ou "dissoudre" pour retirer l'origine de tous les membres\n` +
        `- Entrée pour annuler`
    );
    if (!action) return;
    const actionLower = action.toLowerCase().trim();
    if (actionLower === 'd' || actionLower === 'dissoudre') {
        if (confirm(`Voulez-vous vraiment retirer l'origine "${groupName}" de tous les membres ?`)) {
            dissolveGroup(members);
        }
    }
});

// Fonction pour exporter les données
async function exportData() {
    const res = await apiFetch(`${API_BASE}/export`);
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

            const res = await apiFetch(`${API_BASE}/import`, {
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

async function initAuth() {
    const bar = document.getElementById("auth-bar");
    if (!bar) return;
    try {
        const res = await apiFetch(`${API_BASE}/auth/me`);
        if (res.ok) {
            const user = await res.json();
            currentUser = user;
            bar.innerHTML = `Connecté : ${user.email} · <button type="button" id="auth-logout">Déconnexion</button>`;
            document.getElementById("auth-logout").addEventListener("click", async () => {
                await apiFetch(`${API_BASE}/auth/logout`, { method: "POST" });
                window.location.reload();
            });
        } else {
            currentUser = null;
            bar.innerHTML = '<a href="login.html">Connexion</a>';
        }
    } catch {
        currentUser = null;
        bar.innerHTML = '<a href="login.html">Connexion</a>';
    }
    applyProposeModeUI();
}

// Initialisation après chargement du DOM
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    applyProposeModeUI();

    // Gestionnaire du formulaire personne
    document.getElementById('form-person').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nom = document.getElementById('nom').value.trim();
        if (!isValidNom(nom)) {
            alert("Le nom doit être au format Prénom NOM (ex. Jean HEUDE-LEGRANG).");
            return;
        }
        const origine = document.getElementById('origine').value.trim() || null;
        const xVal = document.getElementById('x').value;
        const yVal = document.getElementById('y').value;
        let x = xVal ? parseInt(xVal) : null;
        let y = yVal ? parseInt(yVal) : null;
        if (isProposeMode) {
            if (x === null || y === null || isNaN(x) || isNaN(y)) {
                const pos = await calculateAutoPosition();
                x = pos.x;
                y = pos.y;
            }
            submitProposal("add_node", { nom, origine, x, y });
            e.target.reset();
            document.getElementById('nom-similar-hint').style.display = 'none';
            return;
        }
        addPerson(nom, origine, x, y);
        e.target.reset();
        document.getElementById('nom-similar-hint').style.display = 'none';
    });

    // Suggestions de noms proches (éviter doublons)
    let similarTimeout;
    document.getElementById('nom').addEventListener('input', () => {
        clearTimeout(similarTimeout);
        const hint = document.getElementById('nom-similar-hint');
        const q = document.getElementById('nom').value.trim();
        if (!q) {
            hint.style.display = 'none';
            return;
        }
        similarTimeout = setTimeout(async () => {
            try {
                const res = await apiFetch(`${API_BASE}/persons/similar?q=${encodeURIComponent(q)}`);
                const data = await res.json();
                if (data.similar && data.similar.length > 0) {
                    hint.textContent = 'Noms proches existants : ' + data.similar.join(', ');
                    hint.style.display = 'block';
                } else {
                    hint.style.display = 'none';
                }
            } catch (_) {
                hint.style.display = 'none';
            }
        }, 300);
    });

    // Gestionnaire du formulaire liste
    document.getElementById('form-list').addEventListener('submit', async (e) => {
        e.preventDefault();
        const noms = document.getElementById('list-noms').value;
        const origine = document.getElementById('list-origine').value.trim() || null;
        const nomsArray = noms.split(',').map(n => n.trim()).filter(n => n.length > 0);
        if (nomsArray.length === 0) {
            alert("Aucun nom valide dans la liste !");
            return;
        }
        const invalidList = nomsArray.filter(n => !isValidNom(n));
        if (invalidList.length > 0) {
            alert("Noms invalides (format Prénom NOM requis) : " + invalidList.join(", "));
            return;
        }
        if (isProposeMode) {
            if (!currentUser) {
                alert("Connectez-vous pour proposer une modification.");
                return;
            }
            let centerX = 500, centerY = 350, radius = 200;
            try {
                const res = await apiFetch(`${API_BASE}/graph`);
                const data = await res.json();
                if (data.nodes && data.nodes.length > 0) {
                    centerX = data.nodes.reduce((s, n) => s + (n.x || 0), 0) / data.nodes.length;
                    centerY = data.nodes.reduce((s, n) => s + (n.y || 0), 0) / data.nodes.length;
                    let maxDist = 0;
                    data.nodes.forEach(n => {
                        const d = Math.hypot(n.x - centerX, n.y - centerY);
                        maxDist = Math.max(maxDist, d);
                    });
                    radius = maxDist + 150;
                }
            } catch (_) { }
            let ok = 0;
            for (let i = 0; i < nomsArray.length; i++) {
                const angle = (2 * Math.PI * i) / nomsArray.length;
                const x = Math.round(centerX + radius * Math.cos(angle));
                const y = Math.round(centerY + radius * Math.sin(angle));
                try {
                    const res = await apiFetch(`${API_BASE}/proposals`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            type: "add_node",
                            data: { nom: nomsArray[i], origine, x, y }
                        })
                    });
                    if (res.ok) ok++;
                } catch (_) { }
            }
            alert(ok + " proposition(s) envoyée(s).");
            document.getElementById('list-noms').value = '';
            loadProposalStats();
            loadGraph();
            return;
        }
        addPersonList(noms, origine);
        document.getElementById('list-noms').value = '';
    });

    // Gestionnaire du formulaire relation (sélection obligatoire dans la liste)
    document.getElementById('form-relation').addEventListener('submit', (e) => {
        e.preventDefault();
        const sourceInput = document.getElementById('source-nom');
        const targetInput = document.getElementById('target-nom');
        document.getElementById('source-suggestions').classList.remove('show');
        document.getElementById('target-suggestions').classList.remove('show');
        if (!sourceInput.dataset.selected || !targetInput.dataset.selected) {
            alert("Veuillez choisir la source et la cible en cliquant sur un nom dans les listes proposées.");
            return;
        }
        const source = sourceInput.value.trim();
        const target = targetInput.value.trim();
        const type = document.getElementById('type').value;
        if (isProposeMode) {
            submitProposal("add_relation", { source, target, type });
            e.target.reset();
            sourceInput.dataset.selected = "";
            targetInput.dataset.selected = "";
            return;
        }
        addRelation(source, target, type);
        e.target.reset();
        sourceInput.dataset.selected = "";
        targetInput.dataset.selected = "";
    });

    // Suggestions de noms existants pour source/cible — sélection obligatoire par clic
    function setupRelationNameAutocomplete(inputId, containerId) {
        const input = document.getElementById(inputId);
        const container = document.getElementById(containerId);
        let timeout;
        input.addEventListener("input", () => {
            delete input.dataset.selected;
            clearTimeout(timeout);
            const q = input.value.trim();
            if (!q) {
                container.classList.remove("show");
                container.innerHTML = "";
                return;
            }
            timeout = setTimeout(async () => {
                try {
                    const res = await apiFetch(`${API_BASE}/persons/similar?q=${encodeURIComponent(q)}&limit=8`);
                    const data = await res.json();
                    container.innerHTML = "";
                    if (data.similar && data.similar.length > 0) {
                        data.similar.forEach((nom) => {
                            const el = document.createElement("div");
                            el.className = "suggestion-item";
                            el.textContent = nom;
                            el.addEventListener("click", () => {
                                input.value = nom;
                                input.dataset.selected = "1";
                                container.classList.remove("show");
                                container.innerHTML = "";
                            });
                            container.appendChild(el);
                        });
                        container.classList.add("show");
                    } else {
                        container.classList.remove("show");
                    }
                } catch (_) {
                    container.classList.remove("show");
                }
            }, 250);
        });
        input.addEventListener("blur", () => {
            setTimeout(() => container.classList.remove("show"), 150);
        });
    }
    setupRelationNameAutocomplete("source-nom", "source-suggestions");
    setupRelationNameAutocomplete("target-nom", "target-suggestions");

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

    // Rafraîchir les propositions (admin)
    document.getElementById('refresh-proposals').addEventListener('click', loadPendingProposals);

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
