import { saveCampaign, deleteCampaign, notify, joinCampaign } from './firebase-manager.js';
import { renderApp, BUDGET_BY_LEVEL, updateBudgetUI, updateSessionTabUI } from './ui-core.js';
import { generateSessionMarkdown, generateAdventureMarkdown, generateCampaignMarkdown } from './markdown.js';

// --- GLOBAL STATE ---
window.appData = {
    campaigns: [],
    currentView: 'home', // home, campaign, adventure, adv-roster, session-edit, pc-manager, pc-edit, journal, codex
    activeCampaignId: null,
    activeAdventureId: null,
    activeSessionId: null,
    activePcId: null, 
    
    // Derived Active Entities
    activeCampaign: null,
    activeAdventure: null,
    activeSession: null,

    // Codex & Smart Text State
    codexCache: [], // Array of strings (names of all codex entries in the active campaign)
    activeSmartTextarea: null, // Tracks which textarea is currently being typed in

    // Temporary state
    tempPCs: [],
    tempAdvRoster: [], // Tracks which PC IDs are selected for an adventure
    currentMarkdown: '',
    currentUserUid: null // Set from main.js
};

// --- HELPER FUNCTIONS ---

export function generateId() {
    return Math.random().toString(36).substring(2, 11);
}

export function calculateLootValue(text) {
    if (!text) return 0;
    const processedText = text.toLowerCase()
      .replace(/\bplatinum\b/g, 'pp').replace(/\bgold\b/g, 'gp')
      .replace(/\belectrum\b/g, 'ep').replace(/\bsilver\b/g, 'sp').replace(/\bcopper\b/g, 'cp');
    
    const currencyRegex = /(\d+(\.\d+)?)\s*(pp|gp|ep|sp|cp)/g;
    const conversion = { pp: 10, gp: 1, ep: 0.5, sp: 0.1, cp: 0.01 };
    let totalGP = 0;
    
    for (const match of processedText.matchAll(currencyRegex)) {
      totalGP += parseFloat(match[1]) * (conversion[match[3]] || 0);
    }
    return totalGP;
}

// Ensure derived state is accurate before rendering
function updateDerivedState() {
    window.appData.activeCampaign = window.appData.campaigns.find(c => c.id === window.appData.activeCampaignId) || null;
    
    if (window.appData.activeCampaign) {
        // Ensure Codex array exists
        if (!window.appData.activeCampaign.codex) window.appData.activeCampaign.codex = [];
        // Build Autocomplete Cache
        window.appData.codexCache = window.appData.activeCampaign.codex.map(c => c.name);
        
        if (window.appData.activeAdventureId) {
            window.appData.activeAdventure = window.appData.activeCampaign.adventures.find(a => a.id === window.appData.activeAdventureId) || null;
        } else {
            window.appData.activeAdventure = null;
        }
    } else {
        window.appData.codexCache = [];
        window.appData.activeAdventure = null;
    }

    if (window.appData.activeAdventure && window.appData.activeSessionId) {
        window.appData.activeSession = window.appData.activeAdventure.sessions.find(s => s.id === window.appData.activeSessionId) || null;
    } else {
        window.appData.activeSession = null;
    }
}

function reRender() {
    updateDerivedState();
    renderApp(window.appData);
}

// --- INITIALIZATION ---

export function setCampaignsData(campaignsArray) {
    window.appData.campaigns = campaignsArray;
    reRender();
}

// --- APP ACTIONS ---

window.appActions = {
    
    // --- Navigation ---
    setView: (viewName) => {
        window.appData.currentView = viewName;
        
        // Reset specific state based on navigation
        if (viewName === 'home') {
            window.appData.activeCampaignId = null;
            window.appData.activeAdventureId = null;
            window.appData.activeSessionId = null;
            window.appData.activePcId = null;
        } else if (viewName === 'campaign') {
            window.appData.activeAdventureId = null;
            window.appData.activeSessionId = null;
            window.appData.activePcId = null;
        } else if (viewName === 'pc-manager') {
            window.appData.activePcId = null;
        }
        
        reRender();
    },

    openCampaign: (id) => {
        window.appData.activeCampaignId = id;
        window.appActions.setView('campaign');
    },

    openAdventure: (id) => {
        window.appData.activeAdventureId = id;
        window.appActions.setView('adventure');
    },

    // --- Campaigns ---
    toggleNewCampaignForm: () => {
        const btn = document.getElementById('new-camp-btn');
        const form = document.getElementById('new-camp-form');
        if (btn && form) {
            btn.classList.toggle('hidden');
            form.classList.toggle('hidden');
            if (!form.classList.contains('hidden')) {
                document.getElementById('new-camp-name').focus();
            }
        }
    },

    createCampaign: async () => {
        const nameInput = document.getElementById('new-camp-name');
        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) return;

        const newCamp = {
            id: generateId(),
            name: name,
            playerCharacters: [],
            adventures: [],
            codex: [] // Initialize empty Codex
        };

        await saveCampaign(newCamp);
        // The real-time listener handles injecting the new data into state!
    },

    deleteCampaign: async (id) => {
        const success = await deleteCampaign(id);
        if (success && window.appData.activeCampaignId === id) {
            window.appActions.setView('home');
        }
    },

    // --- Player Actions ---
    copyCampaignId: (id, btn) => {
        const originalHtml = btn.innerHTML;
        const originalClass = btn.className;

        const handleSuccess = () => {
            btn.innerHTML = `<i class="fa-solid fa-check mr-1.5"></i> Copied!`;
            btn.className = "mt-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white transition flex items-center bg-emerald-600 border border-emerald-700 px-2 py-1 rounded-sm shadow-sm w-max";
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.className = originalClass;
            }, 2000);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(id).then(handleSuccess);
        } else {
            let textArea = document.createElement("textarea");
            textArea.value = id;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                handleSuccess();
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }
            document.body.removeChild(textArea);
        }
    },

    toggleJoinCampaignForm: () => {
        const btn = document.getElementById('join-camp-btn');
        const form = document.getElementById('join-camp-form');
        if (btn && form) {
            btn.classList.toggle('hidden');
            form.classList.toggle('hidden');
            if (!form.classList.contains('hidden')) {
                document.getElementById('join-camp-id').focus();
            }
        }
    },

    joinCampaign: async () => {
        const input = document.getElementById('join-camp-id');
        const campId = input ? input.value.trim() : '';
        if (!campId) {
            notify("Please enter a valid Campaign ID.", "error");
            return;
        }
        
        const form = document.getElementById('join-camp-form');
        const submitBtn = form.querySelector('button:last-child');
        const origText = submitBtn.textContent;
        submitBtn.textContent = "Joining...";
        submitBtn.disabled = true;
        
        try {
            const success = await joinCampaign(campId);
            if (success) {
                input.value = '';
                window.appActions.toggleJoinCampaignForm();
                // The onSnapshot listener in main.js will automatically fetch the new campaign and update the UI!
            }
        } catch (e) {
            console.error(e);
        } finally {
            submitBtn.textContent = origText;
            submitBtn.disabled = false;
        }
    },

    // --- Adventures ---
    toggleNewAdventureForm: () => {
        const btn = document.getElementById('new-adv-btn');
        const form = document.getElementById('new-adv-form');
        if (btn && form) {
            btn.classList.toggle('hidden');
            form.classList.toggle('hidden');
            if (!form.classList.contains('hidden')) {
                document.getElementById('new-adv-name').focus();
            }
        }
    },

    createAdventure: async () => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        if (!camp || !camp._isDM) {
            notify("Only the DM can begin new adventures.", "error");
            return;
        }

        const nameInput = document.getElementById('new-adv-name');
        const startLevelSelect = document.getElementById('new-adv-start');
        const endLevelSelect = document.getElementById('new-adv-end');
        
        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) return;

        const startLevel = parseInt(startLevelSelect.value) || 1;
        const endLevel = parseInt(endLevelSelect.value) || 2;
        const defaultRoster = camp.playerCharacters?.map(pc => pc.id) || [];

        const newAdv = {
            id: generateId(),
            name: name,
            startLevel: startLevel,
            endLevel: endLevel,
            numPlayers: defaultRoster.length || 4,
            activePcIds: defaultRoster,
            totalLootGP: 0,
            sessions: []
        };

        const updatedCamp = {
            ...camp,
            adventures: [...(camp.adventures || []), newAdv]
        };

        await saveCampaign(updatedCamp);
        window.appActions.openAdventure(newAdv.id);
    },

    deleteAdventure: async (id) => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        if (!camp || !camp._isDM) {
            notify("Only the DM can delete adventures.", "error");
            return;
        }

        if (!confirm("Delete this adventure arc? All contained sessions will be lost.")) return;

        const updatedCamp = {
            ...camp,
            adventures: camp.adventures.filter(a => a.id !== id)
        };

        await saveCampaign(updatedCamp);
        
        if (window.appData.activeAdventureId === id) {
            window.appActions.setView('campaign');
        }
    },

    // --- Adventure Roster Management ---
    openAdvRoster: () => {
        updateDerivedState();
        const adv = window.appData.activeAdventure;
        const camp = window.appData.activeCampaign;
        if (!adv || !camp || !camp._isDM) return;

        // If the adventure doesn't have an activePcIds array yet (from older save), default to all PCs
        window.appData.tempAdvRoster = adv.activePcIds ? [...adv.activePcIds] : camp.playerCharacters.map(pc => pc.id);
        window.appActions.setView('adv-roster');
    },

    toggleAdvRosterPc: (pcId) => {
        const idx = window.appData.tempAdvRoster.indexOf(pcId);
        if (idx === -1) {
            window.appData.tempAdvRoster.push(pcId);
        } else {
            window.appData.tempAdvRoster.splice(idx, 1);
        }
        reRender(); // Re-render to update checkbox visuals
    },

    saveAdvRoster: async () => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const adv = window.appData.activeAdventure;
        if (!camp || !adv || !camp._isDM) return;

        const updatedAdventures = camp.adventures.map(a => {
            if (a.id !== adv.id) return a;
            return {
                ...a,
                activePcIds: window.appData.tempAdvRoster,
                numPlayers: window.appData.tempAdvRoster.length // Auto-update the expected party size
            };
        });

        const updatedCamp = { ...camp, adventures: updatedAdventures };
        await saveCampaign(updatedCamp);

        window.appActions.setView('adventure');
        notify("Arc roster inscribed.", "success");
    },

    // --- PC Manager (Hero Profiles) ---
    
    openPCEdit: (pcId = null) => {
        window.appData.activePcId = pcId;
        window.appActions.setView('pc-edit');
    },

    savePCEdit: async () => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        if (!camp) return;

        const isDM = camp._isDM;
        const pcId = window.appData.activePcId || generateId();
        const existingPC = camp.playerCharacters?.find(p => p.id === pcId) || { inspiration: false, automaticSuccess: false, playerId: '' };

        const isOwner = existingPC.playerId === window.appData.currentUserUid;

        if (!isDM && !isOwner) {
            notify("You do not have permission to modify this hero.", "error");
            return;
        }

        const nameInput = document.getElementById('pc-edit-name')?.value.trim();
        if (!nameInput && isDM) {
            notify("Hero must have a name.", "error");
            return;
        }

        // Gather Inputs safely based on access level
        const updatedPC = {
            ...existingPC,
            id: pcId,
            
            // Core Identity (DM only can edit these, Players retain existing)
            name: isDM ? nameInput : existingPC.name,
            race: isDM ? (document.getElementById('pc-edit-race')?.value.trim() || '') : existingPC.race,
            classLevel: isDM ? (document.getElementById('pc-edit-class')?.value.trim() || '') : existingPC.classLevel,
            background: isDM ? (document.getElementById('pc-edit-background')?.value.trim() || '') : existingPC.background,
            
            // Characteristics (DM only)
            alignment: isDM ? (document.getElementById('pc-edit-alignment')?.value.trim() || '') : existingPC.alignment,
            faith: isDM ? (document.getElementById('pc-edit-faith')?.value.trim() || '') : existingPC.faith,
            gender: isDM ? (document.getElementById('pc-edit-gender')?.value.trim() || '') : existingPC.gender,
            age: isDM ? (document.getElementById('pc-edit-age')?.value.trim() || '') : existingPC.age,
            size: isDM ? (document.getElementById('pc-edit-size')?.value.trim() || '') : existingPC.size,
            height: isDM ? (document.getElementById('pc-edit-height')?.value.trim() || '') : existingPC.height,
            weight: isDM ? (document.getElementById('pc-edit-weight')?.value.trim() || '') : existingPC.weight,
            eyes: isDM ? (document.getElementById('pc-edit-eyes')?.value.trim() || '') : existingPC.eyes,
            hair: isDM ? (document.getElementById('pc-edit-hair')?.value.trim() || '') : existingPC.hair,
            skin: isDM ? (document.getElementById('pc-edit-skin')?.value.trim() || '') : existingPC.skin,

            // Personality & Roleplay (DM or Player Owner can edit)
            traits: document.getElementById('input-pc-edit-traits')?.value || '',
            ideals: document.getElementById('input-pc-edit-ideals')?.value || '',
            bonds: document.getElementById('input-pc-edit-bonds')?.value || '',
            flaws: document.getElementById('input-pc-edit-flaws')?.value || '',
            appearance: document.getElementById('input-pc-edit-appearance')?.value || '',
            backstory: document.getElementById('input-pc-edit-backstory')?.value || '',
            
            // DM Restricted Administrative Fields
            playerId: isDM ? (document.getElementById('pc-edit-player-id')?.value || '') : (existingPC.playerId || ''),
            dmNotes: isDM ? (document.getElementById('input-pc-edit-dmnotes')?.value || '') : (existingPC.dmNotes || '')
        };

        const isNew = !camp.playerCharacters?.some(p => p.id === pcId);
        const newPCs = isNew 
            ? [...(camp.playerCharacters || []), updatedPC]
            : camp.playerCharacters.map(p => p.id === pcId ? updatedPC : p);

        const updatedCamp = { ...camp, playerCharacters: newPCs };

        await saveCampaign(updatedCamp);
        window.appActions.setView('pc-manager');
        notify("Hero profile inscribed.", "success");
    },

    deletePC: async (pcId) => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        if (!camp || !camp._isDM) {
            notify("Only the DM can remove heroes.", "error");
            return;
        }

        if (!confirm("Are you sure you want to remove this hero from the campaign?")) return;

        const updatedCamp = {
            ...camp,
            playerCharacters: camp.playerCharacters.filter(pc => pc.id !== pcId)
        };

        await saveCampaign(updatedCamp);
        notify("Hero removed.", "success");
    },

    kickPlayer: async (uid) => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        if (!camp || !camp._isDM) return;

        if (!confirm("Exile this player from the campaign? They will lose access to the tome.")) return;

        const updatedPlayers = (camp.activePlayers || []).filter(id => id !== uid);
        const updatedNames = { ...camp.playerNames };
        delete updatedNames[uid];
        
        const updatedPCs = (camp.playerCharacters || []).map(pc => {
            if (pc.playerId === uid) return { ...pc, playerId: '' };
            return pc;
        });

        const updatedCamp = {
            ...camp,
            activePlayers: updatedPlayers,
            playerNames: updatedNames,
            playerCharacters: updatedPCs
        };

        await saveCampaign(updatedCamp);
        notify("Player exiled from the campaign.", "success");
    },

    // --- Session Editing ---
    openSessionEdit: (sessionId = null) => {
        window.appData.activeSessionId = sessionId;
        window.appActions.setView('session-edit');
    },

    switchSessionTab: (tabId) => {
        updateSessionTabUI(tabId);
        if (tabId === 'preview') {
            window.appActions.updateSessionPreview();
        }
    },

    updateSessionBudget: () => {
        updateDerivedState();
        const adv = window.appData.activeAdventure;
        if (!adv) return;

        const startLvl = parseInt(document.getElementById('draft-start-level')?.value || 1);
        const endLvl = parseInt(document.getElementById('draft-end-level')?.value || 2);
        const numPlayers = parseInt(document.getElementById('draft-num-players')?.value || 1);
        const lootText = document.getElementById('input-draft-loot')?.value || '';

        const newLootValue = calculateLootValue(lootText);
        const currentSessionId = window.appData.activeSessionId;
        const lootBeforeThisSession = adv.sessions
            .filter(s => s.id !== currentSessionId)
            .reduce((acc, s) => acc + s.lootValue, 0);

        const startBudget = BUDGET_BY_LEVEL[startLvl] || 0;
        const endBudget = BUDGET_BY_LEVEL[endLvl] || 0;
        const budgetPerPC = (endLvl > startLvl) ? (endBudget - startBudget) : 0;
        const totalPartyBudget = budgetPerPC * numPlayers;
        
        const currentTotalLoot = lootBeforeThisSession + newLootValue;
        const remainingBudget = totalPartyBudget - currentTotalLoot;

        updateBudgetUI(totalPartyBudget, currentTotalLoot, remainingBudget, newLootValue);
    },

    _readDynamicList: (containerId, mapper) => {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return Array.from(container.children).map(mapper).filter(x => x !== null);
    },

    _gatherSessionDraft: () => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const adv = window.appData.activeAdventure;
        const session = window.appData.activeSession;

        const lootText = document.getElementById('input-draft-loot')?.value || '';
        const pcNotes = {};
        
        // Filter PCs down to ONLY the ones active in this specific adventure
        const activePcIds = adv?.activePcIds || camp?.playerCharacters?.map(p => p.id) || [];
        const draftPCs = JSON.parse(JSON.stringify(camp?.playerCharacters || [])).filter(pc => activePcIds.includes(pc.id));
        
        draftPCs.forEach(pc => {
            const noteEl = document.getElementById(`input-pc-note-${pc.id}`);
            if (noteEl && noteEl.value.trim()) pcNotes[pc.id] = noteEl.value.trim();
            
            const inspEl = document.getElementById(`pc-insp-${pc.id}`);
            if (inspEl) pc.inspiration = inspEl.checked;
            
            const autoEl = document.getElementById(`pc-auto-${pc.id}`);
            if (autoEl) pc.automaticSuccess = autoEl.checked;
        });

        // Helper to grab visibility from a DOM container
        const grabVisibility = (container) => {
            if (!container) return { mode: 'public', visibleTo: [] };
            const modeInput = container.querySelector('.vis-mode-input');
            const playersInput = container.querySelector('.vis-players-input');
            const mode = modeInput ? modeInput.value : 'public';
            const playersStr = playersInput ? playersInput.value : '';
            const players = playersStr ? playersStr.split(',') : [];
            return { mode: mode, visibleTo: players };
        };

        // Helper to grab visibility from static elements like Loot/Notes
        const getStaticVis = (inputId) => {
            const inputEl = document.getElementById(inputId);
            if (!inputEl) return { mode: 'public', visibleTo: [] };
            const container = inputEl.closest('.scene-row') || inputEl.closest('.vis-container') || inputEl.parentElement;
            return grabVisibility(container);
        };

        return {
            sessionData: {
                id: session?.id || generateId(),
                name: document.getElementById('draft-name')?.value || `Log from ${new Date().toLocaleDateString()}`,
                timestamp: session?.timestamp || Date.now(),
                
                lootText: lootText,
                lootValue: calculateLootValue(lootText),
                lootVisibility: getStaticVis('input-draft-loot'),
                
                scenes: window.appActions._readDynamicList('container-scenes', (row, idx) => ({
                    id: idx + 1,
                    text: row.querySelector('.scene-hidden-input')?.value || '',
                    visibility: grabVisibility(row)
                })),
                clues: window.appActions._readDynamicList('container-clues', (row, idx) => ({
                    id: idx + 1,
                    text: row.querySelector('.clue-input')?.value || '',
                    visibility: grabVisibility(row)
                })),
                
                // Legacy / Static Elements
                events: document.getElementById('input-draft-events')?.value || '',
                eventsVisibility: getStaticVis('input-draft-events'),
                
                npcs: document.getElementById('input-draft-npcs')?.value || '',
                npcsVisibility: getStaticVis('input-draft-npcs'),
                
                locations: document.getElementById('input-draft-locations')?.value || '',
                locationsVisibility: getStaticVis('input-draft-locations'),
                
                notes: document.getElementById('input-draft-notes')?.value || '',
                notesVisibility: getStaticVis('input-draft-notes'),
                
                playerNotes: session?.playerNotes || {}, // Preserves existing player notes when DM saves
                
                pcNotes: pcNotes
            },
            updatedPCs: draftPCs, // Only updates the states for PCs in this draft
            advSettings: {
                startLevel: parseInt(document.getElementById('draft-start-level')?.value || 1),
                endLevel: parseInt(document.getElementById('draft-end-level')?.value || 2),
                numPlayers: parseInt(document.getElementById('draft-num-players')?.value || 1)
            }
        };
    },

    updateSessionPreview: () => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        
        // Players don't use the live preview mechanism the same way, return early
        if (!camp || !camp._isDM) return;

        const draft = window.appActions._gatherSessionDraft();
        const mockCampaign = { ...camp, playerCharacters: draft.updatedPCs };
        const md = generateSessionMarkdown(draft.sessionData, mockCampaign);
        
        const previewEl = document.getElementById('draft-preview-text');
        if (previewEl) {
            // Apply the smart text formatting so the live preview renders beautifully
            previewEl.innerHTML = window.appActions.parseSmartText(md);
        }
    },

    saveSession: async () => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const adv = window.appData.activeAdventure;
        const session = window.appData.activeSession;
        if (!camp || !adv) return;
        
        if (!camp._isDM) {
            // PLAYER SAVE MODE - Only modify personal notes
            const myUid = window.appData.currentUserUid;
            if (!session) return; // Players can only edit existing sessions

            const noteInput = document.getElementById(`input-player-note-${myUid}`);
            if (!noteInput) {
                window.appActions.setView('adventure');
                return;
            }

            const container = noteInput.closest('.vis-container') || noteInput.parentElement;
            const modeInput = container ? container.querySelector('.vis-mode-input') : null;
            const playersInput = container ? container.querySelector('.vis-players-input') : null;

            const vis = {
                mode: modeInput ? modeInput.value : 'hidden', // Default hidden (only DM + author)
                visibleTo: playersInput && playersInput.value ? playersInput.value.split(',') : []
            };

            const updatedAdventures = camp.adventures.map(a => {
                if (a.id !== adv.id) return a;
                const updatedSessions = a.sessions.map(s => {
                    if (s.id !== session.id) return s;
                    const pNotes = s.playerNotes ? JSON.parse(JSON.stringify(s.playerNotes)) : {};
                    pNotes[myUid] = { text: noteInput.value, visibility: vis };
                    return { ...s, playerNotes: pNotes };
                });
                return { ...a, sessions: updatedSessions };
            });

            const updatedCamp = { ...camp, adventures: updatedAdventures };
            await saveCampaign(updatedCamp);
            window.appActions.setView('adventure');
            notify("Personal notes inscribed.", "success");
            return;
        }

        // DM SAVE MODE - Standard Full Save
        const draft = window.appActions._gatherSessionDraft();

        const newAdventures = camp.adventures.map(a => {
            if (a.id !== adv.id) return a;

            const isNewSession = !a.sessions.some(s => s.id === draft.sessionData.id);
            const newSessions = isNewSession 
                ? [...(a.sessions || []), draft.sessionData]
                : a.sessions.map(s => s.id === draft.sessionData.id ? draft.sessionData : s);

            return {
                ...a,
                ...draft.advSettings,
                totalLootGP: newSessions.reduce((acc, s) => acc + s.lootValue, 0),
                sessions: newSessions
            };
        });

        // Merge the draft PCs back into the global Campaign PCs array safely
        const mergedPCs = camp.playerCharacters.map(pc => {
            const draftedPC = draft.updatedPCs.find(d => d.id === pc.id);
            return draftedPC ? draftedPC : pc; // Only overwrite if they were in the draft
        });

        const updatedCamp = {
            ...camp,
            playerCharacters: mergedPCs,
            adventures: newAdventures
        };

        await saveCampaign(updatedCamp);
        window.appActions.setView('adventure');
        notify("Session recorded.", "success");
    },

    deleteSession: async (sessionId) => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const adv = window.appData.activeAdventure;
        if (!camp || !adv || !camp._isDM) {
            notify("Only the DM can delete session logs.", "error");
            return;
        }

        if (!confirm("Are you sure you want to delete this session log?")) return;

        const newAdventures = camp.adventures.map(a => {
            if (a.id !== adv.id) return a;
            
            const newSessions = a.sessions.filter(s => s.id !== sessionId);
            return {
                ...a,
                sessions: newSessions,
                totalLootGP: newSessions.reduce((acc, s) => acc + s.lootValue, 0)
            };
        });

        const updatedCamp = { ...camp, adventures: newAdventures };
        await saveCampaign(updatedCamp);
        notify("Session log destroyed.", "success");
    },

    // --- Dynamic DOM Log Builders ---
    
    addLogScene: () => {
        const container = document.getElementById('container-scenes');
        if(!container) return;
        const idx = container.children.length;
        const inputId = `scene-input-${idx}`;
        
        const html = `
            <div class="mb-4 scene-row vis-container bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm flex flex-col group cursor-text" onclick="window.appActions.openUniversalEditor('${inputId}', 'Scene ${idx + 1}')">
                <div class="flex justify-between items-center bg-[#f4ebd8] px-3 py-1.5 border-b border-[#d4c5a9] rounded-t-sm">
                    <span class="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Scene ${idx + 1}</span>
                    <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                        <button class="text-red-700 hover:text-red-600 font-bold px-2 py-1 text-[10px] uppercase tracking-widest transition flex items-center" onclick="event.stopPropagation(); window.appActions.openVisibilityMenu(this)">
                            <i class="fa-solid fa-eye-slash mr-1"></i> Hidden
                        </button>
                        <div class="w-px h-3 bg-stone-300"></div>
                        <button class="text-[10px] text-stone-500 hover:text-blue-600 uppercase font-bold transition" onclick="event.stopPropagation(); window.appActions.openUniversalEditor('${inputId}', 'Scene ${idx + 1}')"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="text-[10px] text-red-800 hover:text-red-600 uppercase font-bold transition" onclick="event.stopPropagation(); this.closest('.scene-row').remove()"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <input type="hidden" class="vis-mode-input" value="hidden">
                <input type="hidden" class="vis-players-input" value="">
                <input type="hidden" id="${inputId}" class="scene-hidden-input" value="">
                <div id="view-${inputId}" class="w-full text-stone-800 text-xs sm:text-sm p-3 min-h-[4rem] leading-relaxed whitespace-pre-wrap font-serif group-hover:bg-white transition">
                    <span class="text-stone-400 italic font-sans">Tap to describe the scene...</span>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    },

    addLogClue: () => {
        const container = document.getElementById('container-clues');
        if(!container) return;
        const html = `
            <div class="mb-2 flex gap-2 items-center clue-row vis-container bg-[#fdfbf7] border border-[#d4c5a9] p-1.5 rounded-sm shadow-sm group">
                <i class="fa-solid fa-magnifying-glass text-stone-400 ml-1"></i>
                <input type="hidden" class="vis-mode-input" value="hidden">
                <input type="hidden" class="vis-players-input" value="">
                
                <input type="text" class="clue-input flex-1 bg-transparent border-none text-stone-900 px-1 text-xs sm:text-sm outline-none placeholder:italic placeholder:text-stone-400" placeholder="Quest update, clue, or objective...">
                
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="text-red-700 hover:text-red-600 font-bold px-2 py-1 text-[10px] uppercase tracking-widest transition flex items-center" onclick="window.appActions.openVisibilityMenu(this)">
                        <i class="fa-solid fa-eye-slash"></i>
                    </button>
                    <button class="text-stone-400 hover:text-red-700 font-bold px-2 transition" onclick="this.closest('.clue-row').remove()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    },

    // --- VISIBILITY (FOG OF WAR) ACTIONS ---

    // Internal state pointer so the Save function knows what element we are currently editing
    _activeVisBtn: null,

    openVisibilityMenu: (btnElement, type = 'dom', explicitId = null) => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const myUid = window.appData.currentUserUid;
        if (!camp) return;

        window.appActions._activeVisBtn = btnElement;
        
        // 1. Gather Data depending on where the button was clicked
        let currentMode = 'public';
        let currentPlayers = [];
        
        // Mode A: DOM Elements (Scenes, Clues, and Static Containers living entirely in the HTML string before being saved)
        if (type === 'dom') {
            const container = btnElement.closest('.scene-row') || btnElement.closest('.clue-row') || btnElement.closest('.vis-container');
            if (!container) return;
            
            const modeInput = container.querySelector('.vis-mode-input');
            const playersInput = container.querySelector('.vis-players-input');
            
            if (modeInput) currentMode = modeInput.value || 'public';
            if (playersInput && playersInput.value) currentPlayers = playersInput.value.split(',');
        } 
        // Mode B: Database Entities (Codex entries, where clicking instantly updates the database)
        else if (type === 'codex') {
            const entry = camp.codex.find(c => c.id === explicitId);
            if (entry && entry.visibility) {
                currentMode = entry.visibility.mode || 'public';
                currentPlayers = entry.visibility.visibleTo || [];
            }
            document.getElementById('vis-target-type').value = type;
            document.getElementById('vis-target-idx').value = explicitId;
        }

        // 2. Setup the Radio Buttons
        const modal = document.getElementById('visibility-modal');
        const radios = modal.querySelectorAll('input[name="vis-mode"]');
        radios.forEach(r => {
            r.checked = (r.value === currentMode);
        });

        // 3. Build the Specific Player Checklist dynamically
        const specificList = document.getElementById('vis-specific-list');
        specificList.innerHTML = '';
        
        const activePlayers = camp.activePlayers || [];
        const playerNames = camp.playerNames || {};
        
        // Filter out the DM and the Author (they don't need to be in the "Specific Players" list, they already have access)
        const validPlayers = activePlayers.filter(uid => uid !== camp.dmId && uid !== myUid);
        
        if (validPlayers.length === 0) {
            specificList.innerHTML = `<p class="text-xs text-stone-500 italic">No players available to share with.</p>`;
        } else {
            validPlayers.forEach(uid => {
                const isChecked = currentPlayers.includes(uid) ? 'checked' : '';
                const pName = playerNames[uid] || `Unknown (${uid.substring(0,5)})`;
                
                specificList.innerHTML += `
                    <label class="flex items-center mb-2 cursor-pointer group">
                        <input type="checkbox" value="${uid}" class="vis-player-checkbox mr-2 w-3 h-3 text-blue-600 focus:ring-blue-600" ${isChecked}>
                        <span class="text-xs font-bold text-stone-700 group-hover:text-stone-900 transition">${pName}</span>
                    </label>
                `;
            });
        }

        // 4. Update UI and Show
        window.appActions.toggleVisSpecificList();
        modal.classList.remove('hidden');
    },

    toggleVisSpecificList: () => {
        const modal = document.getElementById('visibility-modal');
        const mode = modal.querySelector('input[name="vis-mode"]:checked').value;
        const list = document.getElementById('vis-specific-list');
        const header = document.getElementById('vis-modal-header-bar');
        const icon = document.getElementById('vis-modal-icon');
        
        if (mode === 'specific') {
            list.classList.remove('hidden');
            header.className = 'absolute top-0 left-0 w-full h-2 bg-blue-600';
            icon.className = 'fa-solid fa-user-lock mr-2 text-stone-700';
        } else {
            list.classList.add('hidden');
            if (mode === 'hidden') {
                header.className = 'absolute top-0 left-0 w-full h-2 bg-red-700';
                icon.className = 'fa-solid fa-eye-slash mr-2 text-stone-700';
            } else {
                header.className = 'absolute top-0 left-0 w-full h-2 bg-emerald-600';
                icon.className = 'fa-solid fa-eye mr-2 text-stone-700';
            }
        }
    },

    saveVisibility: async () => {
        const modal = document.getElementById('visibility-modal');
        const mode = modal.querySelector('input[name="vis-mode"]:checked').value;
        
        // Gather selected player IDs
        const checkboxes = modal.querySelectorAll('.vis-player-checkbox:checked');
        const selectedPlayers = Array.from(checkboxes).map(cb => cb.value);

        // Security check: If specific is checked but no one is selected, force it to 'hidden'
        const finalMode = (mode === 'specific' && selectedPlayers.length === 0) ? 'hidden' : mode;

        const targetType = document.getElementById('vis-target-type').value;

        // MODE A: DOM Update (For Session Editor)
        if (!targetType || targetType === '') {
            const btn = window.appActions._activeVisBtn;
            if (!btn) return;

            const container = btn.closest('.scene-row') || btn.closest('.clue-row') || btn.closest('.vis-container');
            if (container) {
                const modeInput = container.querySelector('.vis-mode-input');
                const playersInput = container.querySelector('.vis-players-input');
                
                if (modeInput) modeInput.value = finalMode;
                if (playersInput) playersInput.value = selectedPlayers.join(',');

                // Update the Button UI so the DM instantly sees the change
                if (container.classList.contains('scene-row') || container.classList.contains('vis-container')) {
                    if (finalMode === 'hidden') btn.innerHTML = `<i class="fa-solid fa-eye-slash mr-1"></i> Hidden`;
                    else if (finalMode === 'specific') btn.innerHTML = `<i class="fa-solid fa-user-lock mr-1"></i> Shared`;
                    else btn.innerHTML = `<i class="fa-solid fa-eye mr-1"></i> Public`;
                } else {
                    if (finalMode === 'hidden') btn.innerHTML = `<i class="fa-solid fa-eye-slash"></i>`;
                    else if (finalMode === 'specific') btn.innerHTML = `<i class="fa-solid fa-user-lock"></i>`;
                    else btn.innerHTML = `<i class="fa-solid fa-eye"></i>`;
                }

                // Update Button Color
                btn.className = btn.className.replace(/text-(emerald|red|blue)-\d00/g, '');
                btn.className = btn.className.replace(/hover:text-(emerald|red|blue)-\d00/g, '');
                
                if (finalMode === 'hidden') btn.className += ' text-red-700 hover:text-red-600';
                else if (finalMode === 'specific') btn.className += ' text-blue-600 hover:text-blue-500';
                else btn.className += ' text-emerald-600 hover:text-emerald-500';
            }
        } 
        // MODE B: Database Update (For Codex Entries)
        else if (targetType === 'codex') {
            const explicitId = document.getElementById('vis-target-idx').value;
            updateDerivedState();
            const camp = window.appData.activeCampaign;
            if (!camp) return;

            const newCodexArray = camp.codex.map(c => {
                if (c.id === explicitId) {
                    return {
                        ...c,
                        visibility: { mode: finalMode, visibleTo: selectedPlayers }
                    };
                }
                return c;
            });

            await window.appActions._saveCampaignHelper({ ...camp, codex: newCodexArray });
        }

        // Clean up
        document.getElementById('vis-target-type').value = '';
        document.getElementById('vis-target-idx').value = '';
        modal.classList.add('hidden');
    },

    // A tiny helper to avoid importing saveCampaign here while retaining closure scope
    _saveCampaignHelper: async (campData) => {
        const { saveCampaign } = await import('./firebase-manager.js');
        await saveCampaign(campData);
    },

    // --- UNIVERSAL EDITOR ACTIONS ---

    openUniversalEditor: (targetInputId, title) => {
        const modal = document.getElementById('universal-editor-modal');
        const textarea = document.getElementById('ue-textarea');
        const targetInput = document.getElementById(targetInputId);
        const titleEl = document.getElementById('ue-title-text');
        const hiddenTargetId = document.getElementById('ue-target-id');

        if (!modal || !textarea || !targetInput) return;

        // Populate Editor
        titleEl.textContent = title;
        textarea.value = targetInput.value;
        hiddenTargetId.value = targetInputId;

        // Show Modal
        modal.classList.remove('hidden');
        textarea.focus();
    },

    closeUniversalEditor: () => {
        const modal = document.getElementById('universal-editor-modal');
        if (modal) modal.classList.add('hidden');
        document.getElementById('autocomplete-suggestions').style.display = 'none';
    },

    saveUniversalEditor: () => {
        const modal = document.getElementById('universal-editor-modal');
        const textarea = document.getElementById('ue-textarea');
        const hiddenTargetId = document.getElementById('ue-target-id').value;
        
        if (!modal || !textarea || !hiddenTargetId) return;

        const targetInput = document.getElementById(hiddenTargetId);
        const viewDiv = document.getElementById(`view-${hiddenTargetId}`);

        if (targetInput) {
            targetInput.value = textarea.value;
        }

        if (viewDiv) {
            const hasText = textarea.value && textarea.value.trim().length > 0;
            if (hasText) {
                viewDiv.innerHTML = window.appActions.parseSmartText(textarea.value);
            } else {
                viewDiv.innerHTML = `<span class="text-stone-400 italic font-sans">Tap to edit...</span>`;
            }
        }

        window.appActions.closeUniversalEditor();

        if (hiddenTargetId === 'input-draft-loot' && window.appActions.updateSessionBudget && window.appData.currentView === 'session-edit') {
            window.appActions.updateSessionBudget();
        }
    },

    formatText: (textareaId, formatType) => {
        const textarea = document.getElementById(textareaId);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        let prefix = '';
        let suffix = '';

        switch (formatType) {
            case 'bold': prefix = '**'; suffix = '**'; break;
            case 'italic': prefix = '*'; suffix = '*'; break;
            case 'underline': prefix = '__'; suffix = '__'; break;
            case 'h1': prefix = '# '; suffix = ''; break;
            case 'h2': prefix = '## '; suffix = ''; break;
            case 'h3': prefix = '### '; suffix = ''; break;
            case 'list': prefix = '- '; suffix = ''; break;
        }

        if (['h1', 'h2', 'h3', 'list'].includes(formatType)) {
            const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
            textarea.setSelectionRange(lineStart, end);
            const lineText = textarea.value.substring(lineStart, end);
            textarea.value = textarea.value.substring(0, lineStart) + prefix + lineText + suffix + textarea.value.substring(end);
            textarea.focus();
            textarea.setSelectionRange(lineStart + prefix.length, end + prefix.length);
        } else {
            textarea.value = textarea.value.substring(0, start) + prefix + selectedText + suffix + textarea.value.substring(end);
            textarea.focus();
            if (start === end) {
                textarea.setSelectionRange(start + prefix.length, start + prefix.length); 
            } else {
                textarea.setSelectionRange(start, end + prefix.length + suffix.length);
            }
        }
    },

    // --- Smart Text & Codex Interactions ---
    
    parseSmartText: (text) => {
        if (!text) return "";
        let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // --- 1. PARSE MARKDOWN FORMATTING ---
        // Enhanced Headings and Dividers to perfectly support the markdown generator outputs
        safeText = safeText.replace(/^#### (.*$)/gim, '<h4 class="text-base font-serif font-bold text-amber-700 mt-4 mb-1">$1</h4>');
        safeText = safeText.replace(/^### (.*$)/gim, '<h3 class="text-lg font-serif font-bold text-amber-600 mt-5 mb-1 border-b border-[#d4c5a9] pb-1">$1</h3>');
        safeText = safeText.replace(/^## (.*$)/gim, '<h2 class="text-xl font-serif font-bold text-amber-500 mt-6 mb-2 border-b border-amber-600/30 pb-1">$1</h2>');
        safeText = safeText.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-serif font-black text-amber-500 mt-6 mb-3 border-b-2 border-amber-500 pb-2">$1</h1>');
        safeText = safeText.replace(/^---$/gim, '<hr class="border-t border-[#d4c5a9] my-6">');
        
        // Lists
        safeText = safeText.replace(/^\- (.*$)/gim, '<li class="ml-6 list-disc marker:text-amber-600 py-0.5">$1</li>');

        // Bold, Underline, Italic
        safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-stone-900">$1</strong>');
        safeText = safeText.replace(/__(.*?)__/g, '<u class="underline decoration-stone-500 underline-offset-2">$1</u>');
        safeText = safeText.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em class="italic text-stone-700">$1</em>');
        safeText = safeText.replace(/\b_(.*?)_\b/g, '<em class="italic text-stone-700">$1</em>');

        // --- 2. PARSE CODEX LINKS ---
        const sortedCache = [...window.appData.codexCache].sort((a,b) => b.length - a.length);
        
        sortedCache.forEach(name => {
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Safely look for word boundaries but ignore matches that happen inside HTML tags
            const regex = new RegExp(`(?<!<[^>]*)\\b${escapedName}\\b(?![^<]*>)`, 'gi');
            
            const entry = (window.appData.activeCampaign?.codex || []).find(c => c.name.toLowerCase() === name.toLowerCase());
            if (entry) {
                safeText = safeText.replace(regex, (match) => {
                    return `<span class="codex-link" onclick="event.stopPropagation(); window.appActions.viewCodex('${entry.id}')">${match}</span>`;
                });
            }
        });
        
        // --- 3. LINE BREAKS ---
        safeText = safeText.replace(/\n/g, '<br>');
        
        // Cleanup trailing <br> tags immediately following block elements
        safeText = safeText.replace(/<\/h1><br>/g, '</h1>');
        safeText = safeText.replace(/<\/h2><br>/g, '</h2>');
        safeText = safeText.replace(/<\/h3><br>/g, '</h3>');
        safeText = safeText.replace(/<\/h4><br>/g, '</h4>');
        safeText = safeText.replace(/<\/li><br>/g, '</li>');
        safeText = safeText.replace(/(<hr[^>]*>)<br>/g, '$1');

        return safeText;
    },

    handleSmartInput: (textarea) => {
        window.appData.activeSmartTextarea = textarea;
        const text = textarea.value;
        const cursorPos = textarea.selectionStart;
        
        const match = text.substring(0, cursorPos).match(/@([\w\s]*)$/);
        
        if (match) {
            const query = match[1].toLowerCase();
            const matches = window.appData.codexCache.filter(name => name.toLowerCase().includes(query));
            
            if (matches.length > 0) {
                window.appActions._showSuggestions(matches, textarea, cursorPos, match[0].length);
            } else {
                document.getElementById('autocomplete-suggestions').style.display = 'none';
            }
        } else {
            document.getElementById('autocomplete-suggestions').style.display = 'none';
        }
    },

    _showSuggestions: (matches, inputEl, cursor, triggerLen) => {
        const suggestions = document.getElementById('autocomplete-suggestions');
        if(!suggestions) return;
        
        suggestions.innerHTML = '';
        
        const rect = inputEl.getBoundingClientRect();
        suggestions.style.left = (rect.left + window.scrollX + 20) + 'px';
        suggestions.style.top = (rect.top + window.scrollY + 30) + 'px'; 
        suggestions.style.display = 'block';
        
        matches.forEach(m => {
            const div = document.createElement('div');
            div.className = "autocomplete-item";
            div.innerText = m;
            div.onmousedown = (e) => { 
                e.preventDefault();
                const text = inputEl.value;
                const before = text.substring(0, cursor - triggerLen);
                const after = text.substring(cursor);
                inputEl.value = before + m + after;
                suggestions.style.display = 'none';
            };
            suggestions.appendChild(div);
        });
    },

    viewCodex: (id) => {
        updateDerivedState();
        const entry = (window.appData.activeCampaign?.codex || []).find(c => c.id === id);
        if (!entry) return;
        window.appActions._openCodexModal(entry);
    },

    _openCodexModal: (entry) => {
        const container = document.getElementById('global-popup-container');
        if (!container) return;

        const isNew = entry.isNew || !entry.id;
        const id = entry.id || "";
        const name = entry.name || "";
        const type = entry.type || "NPC";
        const desc = entry.desc || "";
        const tags = entry.tags ? entry.tags.join(', ') : "";
        
        const viewHidden = isNew ? "hidden" : "";
        const editHidden = isNew ? "" : "hidden";

        let tagsHTML = `<span class="codex-tag border border-stone-600 text-stone-400">${type}</span>`;
        if (entry.tags) {
            tagsHTML += entry.tags.map(t => `<span class="codex-tag">${t}</span>`).join('');
        }
        
        const parsedDesc = desc ? window.appActions.parseSmartText(desc) : "No description provided.";

        container.innerHTML = `
            <div id="codex-popup" class="fixed inset-0 bg-stone-950/90 z-[12000] flex items-center justify-center p-4 backdrop-blur-sm animate-in">
                <div class="bg-[#f4ebd8] border-2 border-stone-800 p-6 max-w-lg w-full shadow-[0_0_30px_rgba(0,0,0,0.8)] relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto custom-scrollbar rounded-sm">
                    <button onclick="document.getElementById('global-popup-container').innerHTML=''" class="absolute top-3 right-4 text-stone-500 hover:text-red-800 text-2xl transition"><i class="fa-solid fa-xmark"></i></button>
                    
                    <!-- VIEW MODE -->
                    <div id="codex-popup-view" class="${viewHidden}">
                        <h3 class="text-2xl text-stone-900 font-serif font-bold mb-2 border-b-2 border-stone-300 pb-2">${name}</h3>
                        <div class="flex gap-2 mb-4 flex-wrap">${tagsHTML}</div>
                        <div class="text-sm text-stone-700 leading-relaxed font-sans whitespace-pre-wrap bg-[#fdfbf7] p-4 border border-[#d4c5a9] rounded-sm shadow-inner min-h-[100px]">${parsedDesc}</div>
                        <div class="mt-6 pt-4 border-t border-[#d4c5a9] text-right">
                            <button onclick="document.getElementById('codex-popup-view').classList.add('hidden'); document.getElementById('codex-popup-edit').classList.remove('hidden');" class="text-xs text-stone-600 hover:text-amber-600 font-bold uppercase tracking-widest flex items-center justify-end w-full"><i class="fa-solid fa-pen mr-2"></i> Amend Record</button>
                        </div>
                    </div>

                    <!-- EDIT MODE -->
                    <div id="codex-popup-edit" class="${editHidden} flex flex-col gap-4">
                        <h3 class="text-xl text-stone-900 font-serif font-bold border-b-2 border-stone-300 pb-2 flex items-center"><i class="fa-solid fa-feather mr-2 text-red-900"></i> ${isNew ? 'Define New Entity' : 'Amend Record'}</h3>
                        <input type="hidden" id="cx-modal-id" value="${id}">
                        
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Name (Auto-Link Trigger)</label>
                            <input type="text" id="cx-modal-name" value="${name}" class="w-full bg-[#fdfbf7] border border-[#d4c5a9] text-stone-900 p-2 text-sm font-bold focus:border-red-900 outline-none rounded-sm shadow-inner">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Type</label>
                                <select id="cx-modal-type" class="w-full bg-[#fdfbf7] border border-[#d4c5a9] text-stone-900 p-2 text-xs outline-none rounded-sm shadow-inner">
                                    <option value="NPC" ${type==='NPC'?'selected':''}>NPC</option>
                                    <option value="Location" ${type==='Location'?'selected':''}>Location</option>
                                    <option value="Faction" ${type==='Faction'?'selected':''}>Faction</option>
                                    <option value="Item" ${type==='Item'?'selected':''}>Item</option>
                                    <option value="Lore" ${type==='Lore'?'selected':''}>Lore / Rule</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Tags (Comma Separated)</label>
                                <input type="text" id="cx-modal-tags" value="${tags}" class="w-full bg-[#fdfbf7] border border-[#d4c5a9] text-stone-900 p-2 text-xs focus:border-red-900 outline-none rounded-sm shadow-inner" placeholder="e.g. Ally, Vendor">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Description</label>
                            
                            <div class="format-toolbar flex gap-1 bg-[#e8dec7] border border-b-0 border-[#d4c5a9] p-1 rounded-t-sm mt-1">
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'bold')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bold"><i class="fa-solid fa-bold"></i></button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'italic')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Italic"><i class="fa-solid fa-italic"></i></button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'underline')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Underline"><i class="fa-solid fa-underline"></i></button>
                                <div class="w-px h-4 bg-[#d4c5a9] mx-1 self-center"></div>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'h1')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition font-serif font-bold" title="Heading 1">H1</button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'h2')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition font-serif font-bold" title="Heading 2">H2</button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'list')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bullet List"><i class="fa-solid fa-list-ul"></i></button>
                            </div>

                            <textarea id="cx-modal-desc" class="w-full h-40 bg-[#fdfbf7] border border-[#d4c5a9] text-stone-900 p-3 text-sm focus:border-red-900 outline-none resize-none rounded-b-sm shadow-inner custom-scrollbar" placeholder="Description... Use @ to link other entries.">${desc}</textarea>
                        </div>
                        
                        <div class="flex justify-end gap-2 mt-4 pt-4 border-t border-[#d4c5a9]">
                            ${!isNew ? `<button onclick="window.appActions.deleteCodexEntry('${id}')" class="text-red-700 hover:text-red-900 text-[10px] uppercase font-bold mr-auto tracking-widest px-2">Delete</button>` : ''}
                            <button onclick="document.getElementById('global-popup-container').innerHTML=''" class="border border-stone-400 text-stone-600 px-4 py-2 text-xs uppercase font-bold hover:bg-stone-200 rounded-sm tracking-widest">Cancel</button>
                            <button onclick="window.appActions.saveCodexEntry()" class="bg-stone-900 text-amber-50 px-5 py-2 text-xs uppercase font-bold hover:bg-stone-800 shadow-md rounded-sm tracking-widest">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    saveCodexEntry: async () => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        if (!camp) return;

        const id = document.getElementById('cx-modal-id').value;
        const name = document.getElementById('cx-modal-name').value.trim();
        if (!name) {
            notify("A name is required for Codex auto-linking.", "error");
            return;
        }

        const newEntry = {
            id: id || generateId(),
            name: name,
            type: document.getElementById('cx-modal-type').value,
            tags: document.getElementById('cx-modal-tags').value.split(',').map(t=>t.trim()).filter(t=>t),
            desc: document.getElementById('cx-modal-desc').value
        };

        const isNew = !id;
        const newCodexArray = isNew
            ? [...(camp.codex || []), newEntry]
            : camp.codex.map(c => c.id === id ? newEntry : c);

        const updatedCamp = { ...camp, codex: newCodexArray };

        await saveCampaign(updatedCamp);
        document.getElementById('global-popup-container').innerHTML = '';
        notify("Codex updated.", "success");
    },

    deleteCodexEntry: async (id) => {
        if (!confirm("Destroy this Codex entry? Auto-links using this name will no longer function.")) return;
        
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        if (!camp) return;

        const updatedCamp = {
            ...camp,
            codex: (camp.codex || []).filter(c => c.id !== id)
        };

        await saveCampaign(updatedCamp);
        document.getElementById('global-popup-container').innerHTML = '';
        notify("Entry destroyed.", "success");
    },

    // --- Journal Viewing ---
    openJournal: (scope, sessionId = null) => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const adv = window.appData.activeAdventure;
        
        if (!camp) return;

        let md = '';
        if (scope === 'session' && sessionId) {
            window.appData.activeSessionId = sessionId;
            updateDerivedState(); 
            const session = window.appData.activeSession;
            if (session) md = generateSessionMarkdown(session, camp);
        } else if (scope === 'adventure' && adv) {
            window.appData.activeSessionId = null;
            md = generateAdventureMarkdown(adv, camp);
        } else if (scope === 'campaign') {
            window.appData.activeAdventureId = null;
            window.appData.activeSessionId = null;
            md = generateCampaignMarkdown(camp);
        }

        window.appData.currentMarkdown = md;
        window.appActions.setView('journal');
    },

    closeJournal: () => {
        if (window.appData.activeSessionId) {
            window.appData.activeSessionId = null;
            window.appActions.setView('adventure');
        } else if (window.appData.activeAdventureId) {
            window.appActions.setView('adventure');
        } else {
            window.appActions.setView('campaign');
        }
    },

    copyJournal: () => {
        const text = window.appData.currentMarkdown || '';
        const btn = document.getElementById('journal-copy-btn');
        const originalHtml = btn ? btn.innerHTML : '';

        const handleSuccess = () => {
            if (btn) {
                btn.innerHTML = `<i class="fa-solid fa-check mr-2"></i> Scribed!`;
                btn.className = "flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider flex justify-center items-center transition shadow-md bg-emerald-700 text-white border border-emerald-900";
                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.className = "flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider flex justify-center items-center transition shadow-md bg-stone-700 text-amber-50 hover:bg-stone-600 border border-stone-500";
                }, 2000);
            }
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(handleSuccess);
        } else {
            let textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                handleSuccess();
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }
            document.body.removeChild(textArea);
        }
    }
};
