import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { _canViewCodex } from './actions-codex.js';

// --- CORE MAP MANAGEMENT ---

export const createNewWeb = async () => {
    const name = prompt("Enter a name for the new Relationship Web:");
    if (!name || !name.trim()) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const newWeb = {
        id: generateId(),
        name: name.trim(),
        visibility: { mode: 'hidden', visibleTo: [] }, // DM only by default
        nodes: [],
        connections: [],
        expandedGroups: []
    };

    camp.webs = [...(camp.webs || []), newWeb];
    window.appData.activeWebId = newWeb.id;

    await saveCampaign(camp);
    notify("New Relationship Web forged.", "success");
    reRender(true); // Force render to bypass Data Protection
};

export const deleteCurrentWeb = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const webId = window.appData.activeWebId;
    if (!camp || !camp._isDM || !webId) return;

    if (!confirm("Are you sure you want to permanently delete this Relationship Web?")) return;

    camp.webs = camp.webs.filter(w => w.id !== webId);
    window.appData.activeWebId = camp.webs.length > 0 ? camp.webs[0].id : null;

    await saveCampaign(camp);
    notify("Relationship Web destroyed.", "success");
    reRender(true); // Force render to bypass Data Protection
};

export const switchWeb = (id) => {
    window.appData.activeWebId = id;
    reRender(true); // Force render to bypass Data Protection
};

export const toggleWebVisibility = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const web = window.appData.activeWeb;
    if (!camp || !web || !camp._isDM) return;

    const currentMode = web.visibility?.mode || 'hidden';
    web.visibility = { 
        mode: currentMode === 'public' ? 'hidden' : 'public', 
        visibleTo: [] 
    };

    await saveCampaign(camp);
    notify(web.visibility.mode === 'public' ? "Map is now Public." : "Map is now Hidden (DM Only).", "success");
    reRender(true); // Force render to bypass Data Protection
};

export const toggleWebGroup = async (codexId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const web = window.appData.activeWeb;
    if (!camp || !web) return;

    if (!web.expandedGroups) web.expandedGroups = [];

    if (web.expandedGroups.includes(codexId)) {
        web.expandedGroups = web.expandedGroups.filter(id => id !== codexId);
    } else {
        web.expandedGroups.push(codexId);
    }

    await saveCampaign(camp);
    reRender(true); // Force render to bypass Data Protection
};

// --- DATA EDITING & STRUCTURE ---

export const openWebEditModal = (type, id) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const web = window.appData.activeWeb;
    if (!camp || !web || !camp._isDM) return;

    const modal = document.getElementById('web-edit-modal');
    if (!modal) return;

    document.getElementById('web-edit-type').value = type;
    document.getElementById('web-edit-id').value = id || '';

    const nameContainer = document.getElementById('web-edit-name-container');
    const connContainer = document.getElementById('web-edit-conn-container');

    if (type === 'map') {
        nameContainer.classList.remove('hidden');
        connContainer.classList.add('hidden');
        document.getElementById('web-edit-name').value = web.name || '';
        document.getElementById('web-edit-modal-title').innerHTML = '<i class="fa-solid fa-pen mr-2"></i> Rename Map';
    } else if (type === 'connection') {
        nameContainer.classList.add('hidden');
        connContainer.classList.remove('hidden');
        document.getElementById('web-edit-modal-title').innerHTML = '<i class="fa-solid fa-link mr-2"></i> Edit Connection';
        
        const conn = web.connections.find(c => c.id === id);
        if (conn) {
            document.getElementById('web-edit-conn-label').value = conn.label || '';
            document.getElementById('web-edit-conn-style').value = conn.type || 'ally';
        }
    }

    modal.classList.remove('hidden');
};

export const saveWebEdit = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const web = window.appData.activeWeb;
    if (!camp || !web || !camp._isDM) return;

    const type = document.getElementById('web-edit-type').value;
    const id = document.getElementById('web-edit-id').value;

    if (type === 'map') {
        const newName = document.getElementById('web-edit-name').value.trim();
        if (newName) web.name = newName;
    } else if (type === 'connection') {
        const conn = web.connections.find(c => c.id === id);
        if (conn) {
            conn.label = document.getElementById('web-edit-conn-label').value.trim();
            conn.type = document.getElementById('web-edit-conn-style').value;
        }
    }

    await saveCampaign(camp);
    document.getElementById('web-edit-modal').classList.add('hidden');
    reRender(true); // Force render to bypass Data Protection
};

export const openWebMoveModal = (nodeId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const web = window.appData.activeWeb;
    if (!camp || !web || !camp._isDM) return;

    const targetNode = web.nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    const modal = document.getElementById('web-move-modal');
    const select = document.getElementById('web-move-select');
    document.getElementById('web-move-node-id').value = nodeId;

    if (!modal || !select) return;

    select.innerHTML = '<option value="">-- Root (No Parent Group) --</option>';

    // Filter valid parents (Groups, Factions, Locations)
    const validParents = web.nodes.filter(n => n.id !== nodeId);
    validParents.forEach(pNode => {
        const codexEntry = camp.codex?.find(c => c.id === pNode.id);
        if (codexEntry && ['Faction', 'Location'].includes(codexEntry.type)) {
             select.innerHTML += `<option value="${pNode.id}">${codexEntry.name} (${codexEntry.type})</option>`;
        }
    });

    select.value = targetNode.parent || "";
    modal.classList.remove('hidden');
};

export const saveWebMove = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const web = window.appData.activeWeb;
    if (!camp || !web || !camp._isDM) return;

    const nodeId = document.getElementById('web-move-node-id').value;
    const newParent = document.getElementById('web-move-select').value || null;

    const nodeIndex = web.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    // Loop detection to prevent infinite cycles
    if (newParent) {
        let currentCheck = newParent;
        while (currentCheck) {
            if (currentCheck === nodeId) {
                notify("Cannot place a group inside itself!", "error");
                return;
            }
            const pNode = web.nodes.find(n => n.id === currentCheck);
            currentCheck = pNode ? pNode.parent : null;
        }
    }

    web.nodes[nodeIndex].parent = newParent;
    await saveCampaign(camp);
    
    document.getElementById('web-move-modal').classList.add('hidden');
    reRender(true); // Force render to bypass Data Protection
};

export const addWebNode = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const web = window.appData.activeWeb;
    if (!camp || !web || !camp._isDM) return;

    let codexId = document.getElementById('web-node-codex-id').value;
    const searchInput = document.getElementById('web-node-search').value.trim();

    if (!codexId && !searchInput) {
        notify("You must select or type a name for the node.", "error");
        return;
    }

    let updatedCodex = camp.codex || [];
    
    // Auto-create a generic NPC codex entry if they just typed a name
    if (!codexId && searchInput) {
        codexId = generateId();
        const newEntry = {
            id: codexId,
            name: searchInput,
            type: 'NPC', 
            tags: ['Map Auto-Gen'],
            desc: 'A newly added entry from the Relationship Web.',
            authorId: window.appData.currentUserUid,
            visibility: { mode: 'public' }
        };
        updatedCodex = [...updatedCodex, newEntry];
        camp.codex = updatedCodex; 
    }

    if (web.nodes.some(n => n.id === codexId)) {
        notify("This entity is already on the map.", "error");
        return;
    }

    web.nodes.push({
        id: codexId,
        parent: null
    });

    await saveCampaign(camp);
    
    notify("Node bound to Web.", "success");
    reRender(true); // Force render to bypass Data Protection
};

export const addWebConnection = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const web = window.appData.activeWeb;
    if (!camp || !web || !camp._isDM) return;

    const sourceId = document.getElementById('web-conn-source').value;
    const targetId = document.getElementById('web-conn-target').value;
    const styleType = document.getElementById('web-conn-style').value;
    const label = document.getElementById('web-conn-label').value.trim();

    if (!sourceId || !targetId) {
        notify("Please select a Source and Target node.", "error");
        return;
    }

    if (sourceId === targetId) {
        notify("A node cannot connect to itself.", "error");
        return;
    }

    const exists = web.connections.some(c => c.source === sourceId && c.target === targetId && c.type === styleType);
    if (exists) {
        notify("This exact connection already exists.", "error");
        return;
    }

    const newConn = {
        id: generateId(),
        source: sourceId,
        target: targetId,
        type: styleType,
        label: label,
        visibility: { mode: 'public', visibleTo: [] } // Default visible connections
    };

    web.connections.push(newConn);
    await saveCampaign(camp);
    
    notify("Connection forged.", "success");
    reRender(true); // Force render to bypass Data Protection
};

export const removeWebNode = async (nodeId) => {
    if (!confirm("Remove this node from the map? (The Codex entry will remain safe in your Library).")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const web = window.appData.activeWeb;
    if (!camp || !web || !camp._isDM) return;

    // Purge Node
    web.nodes = web.nodes.filter(n => n.id !== nodeId);
    
    // Fix orphaned children
    web.nodes.forEach(n => {
        if (n.parent === nodeId) n.parent = null;
    });

    // Remove orphaned connections
    web.connections = web.connections.filter(c => c.source !== nodeId && c.target !== nodeId);

    await saveCampaign(camp);
    reRender(true); // Force render to bypass Data Protection
};

export const removeWebConnection = async (connId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const web = window.appData.activeWeb;
    if (!camp || !web || !camp._isDM) return;

    web.connections = web.connections.filter(c => c.id !== connId);
    
    await saveCampaign(camp);
    reRender(true); // Force render to bypass Data Protection
};

export const cleanupWebOrphans = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    let needsSave = false;

    // Build a master list of all valid Codex + Hero IDs globally
    const codexIds = new Set((camp.codex || []).map(c => c.id));
    (camp.playerCharacters || []).forEach(pc => codexIds.add(pc.id));

    (camp.webs || []).forEach(web => {
        let initialNodes = web.nodes.length;
        let initialConns = web.connections.length;

        // Strip nodes that no longer exist in the library
        web.nodes = web.nodes.filter(n => codexIds.has(n.id));
        
        // Disconnect orphaned parents
        const validNodeIds = new Set(web.nodes.map(n => n.id));
        web.nodes.forEach(n => {
            if (n.parent && !validNodeIds.has(n.parent)) {
                n.parent = null;
            }
        });

        // Sever orphaned connections
        web.connections = web.connections.filter(c => validNodeIds.has(c.source) && validNodeIds.has(c.target));

        if (web.nodes.length !== initialNodes || web.connections.length !== initialConns) {
            needsSave = true;
        }
    });

    if (needsSave) {
        await saveCampaign(camp);
    }
};

export const syncWebWithCodex = async () => {
    await cleanupWebOrphans();
    notify("Maps synchronized with Codex.", "success");
    reRender(true); // Force render to bypass Data Protection
};

// ============================================================================
// --- UI HELPERS AND EXPORTS FOR MERMAID ---
// ============================================================================

export const searchWebCodex = (query) => {
    const resultsContainer = document.getElementById('web-node-search-results');
    if (!resultsContainer) return;
    
    if (!query || query.trim() === '') {
        resultsContainer.classList.add('hidden');
        document.getElementById('web-node-codex-id').value = ""; 
        return;
    }

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const codex = camp?.codex || [];
    const pcs = camp?.playerCharacters || [];
    
    const allItems = [
        ...pcs.map(pc => ({ id: pc.id, name: pc.name, type: 'PC' })),
        ...codex
    ];
    
    const matches = allItems.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

    let html = '';
    matches.forEach(m => {
        const safeName = m.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += `
            <div class="p-3 border-b border-[#d4c5a9] hover:bg-amber-50 cursor-pointer transition-colors" onclick="window.appActions.selectWebCodexEntry('${m.id}', '${safeName}')">
                <span class="font-bold text-stone-900">${m.name}</span> 
                <span class="text-[9px] uppercase font-bold text-stone-500 ml-2 bg-stone-200 px-1.5 py-0.5 rounded-sm">${m.type}</span>
            </div>
        `;
    });

    const safeQuery = query.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    html += `
        <div class="p-3 bg-stone-100 hover:bg-amber-100 cursor-pointer text-amber-900 font-bold text-xs flex items-center transition-colors border-b border-[#d4c5a9]" onclick="window.appActions.selectWebCodexEntry('', '${safeQuery}')">
            <i class="fa-solid fa-plus-circle mr-2 text-amber-600"></i> Create New NPC: "${query}"
        </div>
    `;

    resultsContainer.innerHTML = html;
    resultsContainer.classList.remove('hidden');
};

export const selectWebCodexEntry = (id, name) => {
    const searchInput = document.getElementById('web-node-search');
    const idInput = document.getElementById('web-node-codex-id');
    const resultsContainer = document.getElementById('web-node-search-results');

    if (searchInput) searchInput.value = name;
    if (idInput) idInput.value = id; 
    if (resultsContainer) resultsContainer.classList.add('hidden');
};

export const setWebZoom = (dir) => {
    const wrapper = document.getElementById('mermaid-wrapper');
    if (!wrapper) return;
    let currentZoom = parseFloat(wrapper.getAttribute('data-zoom')) || 1.0;
    
    if (dir === 'in') currentZoom = Math.min(currentZoom + 0.1, 3.0);
    else if (dir === 'out') currentZoom = Math.max(currentZoom - 0.1, 0.5);
    else if (dir === 'reset') currentZoom = 1.0;
    
    wrapper.setAttribute('data-zoom', currentZoom);
    wrapper.style.transform = `scale(${currentZoom})`;
};

export const renderMermaidWeb = async () => {
    const container = document.getElementById('mermaid-container');
    if (!container) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const web = window.appData.activeWeb;

    if (!camp || !web) return;

    // Lazy load the Mermaid Engine if it hasn't been fetched yet
    if (!window.mermaid) {
        try {
            const module = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
            window.mermaid = module.default;
            window.mermaid.initialize({
                startOnLoad: false,
                theme: 'base',
                themeVariables: {
                    primaryColor: '#fdfbf7', // parchmentLight
                    primaryTextColor: '#1c1917',
                    primaryBorderColor: '#d4c5a9',
                    lineColor: '#78716c',
                    secondaryColor: '#f4ebd8',
                    tertiaryColor: '#fff',
                    fontFamily: 'Merriweather'
                },
                securityLevel: 'loose',
                flowchart: { curve: 'basis', htmlLabels: true }
            });
        } catch (e) {
            container.innerHTML = `<div class="text-center text-red-500 text-xs mt-10">Failed to load Graph Engine</div>`;
            return;
        }
    }

    if (web.nodes.length === 0) {
        container.innerHTML = `<div class="text-center text-stone-500 text-sm mt-10 italic">The web is silent. Add a node to begin.</div>`;
        return;
    }

    let graph = 'graph TD\n';

    // Styling Theme Tokens
    graph += 'classDef PC fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f,font-weight:bold;\n';
    graph += 'classDef NPC fill:#fdfbf7,stroke:#d4c5a9,stroke-width:2px,color:#1c1917;\n';
    graph += 'classDef Location fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#064e3b;\n';
    graph += 'classDef Faction fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;\n';
    graph += 'classDef Item fill:#faf5ff,stroke:#9333ea,stroke-width:2px,color:#581c87;\n';
    graph += 'classDef Lore fill:#fff1f2,stroke:#c026d3,stroke-width:2px,color:#701a75;\n';
    
    graph += 'classDef groupRing fill:none,stroke:#78716c,stroke-width:2px,stroke-dasharray: 5 5;\n'; 

    // Resolve Nodes to Real Data
    const resolveNode = (node) => {
        const isPC = camp.playerCharacters?.find(p => p.id === node.id);
        if (isPC) return { ...isPC, type: 'PC' };
        const isCodex = camp.codex?.find(c => c.id === node.id);
        if (isCodex) return isCodex;
        return { id: node.id, name: "Unknown Entry", type: "Lore" };
    };

    const resolvedNodes = web.nodes.map(n => ({ node: n, data: resolveNode(n) }));
    
    // Security Filter
    const visibleNodes = resolvedNodes.filter(rn => _canViewCodex(rn.data.id));
    const validIds = new Set(visibleNodes.map(rn => rn.node.id));

    const visibleConns = web.connections.filter(c => {
        if (!validIds.has(c.source) || !validIds.has(c.target)) return false;
        if (camp._isDM) return true;
        const visMode = c.visibility?.mode || 'public';
        if (visMode === 'hidden') return false;
        if (visMode === 'specific' && !c.visibility.visibleTo.includes(window.appData.currentUserUid)) return false;
        return true;
    });

    const renderedIds = new Set();
    const expandedGroups = new Set(web.expandedGroups || []);

    const renderEntity = (rn) => {
        if (renderedIds.has(rn.node.id)) return "";
        renderedIds.add(rn.node.id);

        // Security Escape to prevent Mermaid Syntax Crashing!
        const safeName = rn.data.name.replace(/"/g, "'").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // Wrap everything in literal quotes so Mermaid treats it as safe HTML!
        let shapeL = '("'; let shapeR = '")'; // Default (NPC, PC)
        
        if (rn.data.type === 'Location') { shapeL = '{{"'; shapeR = '"}}'; }
        if (rn.data.type === 'Faction') { shapeL = '>"'; shapeR = '"]'; }
        if (rn.data.type === 'Item') { shapeL = '{"'; shapeR = '"}'; }

        let label = safeName || "Unknown";
        
        // Check if this node is technically a Group, but currently collapsed
        const isGroupAble = ['Faction', 'Location'].includes(rn.data.type);
        if (isGroupAble && !expandedGroups.has(rn.node.id)) {
            const hasChildren = visibleNodes.some(child => child.node.parent === rn.node.id);
            if (hasChildren) {
                 label = `<b>${safeName}</b><br/><i>(Group)</i>`;
            }
        }
        
        let line = `${rn.node.id}${shapeL}${label}${shapeR}:::${rn.data.type}\n`;
        line += `click ${rn.node.id} call window.appActions.viewCodex("${rn.node.id}") "View Knowledge"\n`;
        
        return line;
    };

    const renderSubgraph = (rn) => {
        if (!expandedGroups.has(rn.node.id)) {
            return renderEntity(rn);
        }

        const children = visibleNodes.filter(child => child.node.parent === rn.node.id);
        if (children.length === 0) {
            return renderEntity(rn);
        }

        // Security Escape
        const safeName = rn.data.name.replace(/"/g, "'").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        let output = `subgraph ${rn.node.id}_sg ["${safeName}"]\n`; 
        output += `direction TB\n`; 
        
        output += renderEntity(rn);
        
        children.forEach(child => {
            const isChildGroupAble = ['Faction', 'Location'].includes(child.data.type);
            if (isChildGroupAble && expandedGroups.has(child.node.id)) {
                output += renderSubgraph(child); 
            } else {
                output += renderEntity(child);
            }
        });
        output += `end\n`;
        output += `class ${rn.node.id}_sg groupRing\n`;
        return output;
    };

    const roots = visibleNodes.filter(rn => !rn.node.parent || !validIds.has(rn.node.parent));
    roots.forEach(root => {
        const isGroupAble = ['Faction', 'Location'].includes(root.data.type);
        if (isGroupAble && expandedGroups.has(root.node.id)) {
             graph += renderSubgraph(root);
        } else {
             graph += renderEntity(root);
        }
    });

    // CATCH-ALL FIX: Ensure we do NOT render nodes that are hidden inside collapsed groups!
    visibleNodes.forEach(rn => {
        if (!renderedIds.has(rn.node.id)) {
            
            // Check if this node is hidden inside a collapsed parent
            let isHidden = false;
            let current = rn;
            while (current && current.node.parent) {
                if (!expandedGroups.has(current.node.parent)) {
                    isHidden = true;
                    break;
                }
                current = visibleNodes.find(p => p.node.id === current.node.parent);
            }
            
            if (!isHidden) {
                const isGroupAble = ['Faction', 'Location'].includes(rn.data.type);
                if (isGroupAble && expandedGroups.has(rn.node.id)) {
                     graph += renderSubgraph(rn);
                } else {
                     graph += renderEntity(rn);
                }
            }
        }
    });

    // RENDER CONNECTIONS
    visibleConns.forEach(c => {
        // Find effective targets for Collapsed groups
        const getEffectiveTarget = (nodeId) => {
            let current = visibleNodes.find(rn => rn.node.id === nodeId);
            let highestCollapsedParent = nodeId;
            while (current && current.node.parent) {
                 if (!expandedGroups.has(current.node.parent)) {
                     highestCollapsedParent = current.node.parent;
                 }
                 current = visibleNodes.find(rn => rn.node.id === current.node.parent);
            }
            return highestCollapsedParent;
        };

        const effSource = getEffectiveTarget(c.source);
        const effTarget = getEffectiveTarget(c.target);

        // Hide the internal connection line if they collapsed into the same parent
        if (effSource === effTarget) return;

        // Security Escape for labels
        const safeLabel = c.label ? `"${c.label.replace(/"/g, "'").replace(/</g, "&lt;").replace(/>/g, "&gt;")}"` : "";
        
        let arrow = "-->"; // Default: Ally
        if (c.type === 'enemy') arrow = "==>"; 
        if (c.type === 'affiliated') arrow = "-.->"; 
        if (c.type === 'debt') arrow = "-.->"; 
        if (c.type === 'blood') arrow = "==>"; 

        if (safeLabel) {
            if (c.type === 'enemy' || c.type === 'blood') graph += `${effSource} == ${safeLabel} ==> ${effTarget}\n`;
            else if (c.type === 'affiliated' || c.type === 'debt') graph += `${effSource} -. ${safeLabel} .-> ${effTarget}\n`;
            else graph += `${effSource} -- ${safeLabel} --> ${effTarget}\n`;
        } else {
            graph += `${effSource} ${arrow} ${effTarget}\n`;
        }
    });

    try {
        const { svg, bindFunctions } = await window.mermaid.render('mermaid-svg-' + Date.now(), graph);
        container.innerHTML = svg;
        if (bindFunctions) bindFunctions(container);
    } catch (e) {
        console.warn("Mermaid Engine Rendering Warning:", e);
    }
};
