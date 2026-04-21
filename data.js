import { saveCampaign, deleteCampaign, notify } from './firebase-manager.js';
import { renderApp, BUDGET_BY_LEVEL, updateBudgetUI, updateSessionTabUI } from './ui-core.js';
import { generateSessionMarkdown, generateAdventureMarkdown, generateCampaignMarkdown } from './markdown.js';

// --- GLOBAL STATE ---
window.appData = {
    campaigns: [],
    currentView: 'home', // home, campaign, adventure, session-edit, pc-manager, journal
    activeCampaignId: null,
    activeAdventureId: null,
    activeSessionId: null,
    
    // Derived Active Entities (updated via getters/setters or before render)
    activeCampaign: null,
    activeAdventure: null,
    activeSession: null,

    // Temporary state for editing
    tempPCs: [],
    currentMarkdown: ''
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
    
    if (window.appData.activeCampaign && window.appData.activeAdventureId) {
        window.appData.activeAdventure = window.appData.activeCampaign.adventures.find(a => a.id === window.appData.activeAdventureId) || null;
    } else {
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
// We bind these to the window object so they can be called directly from inline HTML event handlers.

window.appActions = {
    
    // --- Navigation ---
    setView: (viewName) => {
        window.appData.currentView = viewName;
        
        // Reset specific state based on navigation
        if (viewName === 'home') {
            window.appData.activeCampaignId = null;
            window.appData.activeAdventureId = null;
            window.appData.activeSessionId = null;
        } else if (viewName === 'campaign') {
            window.appData.activeAdventureId = null;
            window.appData.activeSessionId = null;
        } else if (viewName === 'pc-manager') {
            updateDerivedState(); // Ensure activeCampaign is set
            window.appData.tempPCs = JSON.parse(JSON.stringify(window.appData.activeCampaign?.playerCharacters || []));
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
            adventures: []
        };

        // Note: Firebase snapshot will trigger a re-render automatically once saved
        await saveCampaign(newCamp);
        
        // Optimistic UI update to make it feel fast
        window.appData.campaigns.push(newCamp);
        window.appActions.openCampaign(newCamp.id);
    },

    deleteCampaign: async (id) => {
        const success = await deleteCampaign(id);
        if (success && window.appData.activeCampaignId === id) {
            window.appActions.setView('home');
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
        if (!camp) return;

        const nameInput = document.getElementById('new-adv-name');
        const startLevelSelect = document.getElementById('new-adv-start');
        const endLevelSelect = document.getElementById('new-adv-end');
        
        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) return;

        const startLevel = parseInt(startLevelSelect.value) || 1;
        const endLevel = parseInt(endLevelSelect.value) || 2;

        const newAdv = {
            id: generateId(),
            name: name,
            startLevel: startLevel,
            endLevel: endLevel,
            numPlayers: camp.playerCharacters.length || 4,
            totalLootGP: 0,
            sessions: []
        };

        // Create a copy of the campaign with the new adventure
        const updatedCamp = {
            ...camp,
            adventures: [...(camp.adventures || []), newAdv]
        };

        await saveCampaign(updatedCamp);
        
        // Optimistic UI update
        const campIndex = window.appData.campaigns.findIndex(c => c.id === camp.id);
        if (campIndex !== -1) window.appData.campaigns[campIndex] = updatedCamp;
        
        window.appActions.openAdventure(newAdv.id);
    },

    deleteAdventure: async (id) => {
        if (!confirm("Delete this adventure arc? All contained sessions will be lost.")) return;
        
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        if (!camp) return;

        const updatedCamp = {
            ...camp,
            adventures: camp.adventures.filter(a => a.id !== id)
        };

        await saveCampaign(updatedCamp);
        
        // Optimistic update
        const campIndex = window.appData.campaigns.findIndex(c => c.id === camp.id);
        if (campIndex !== -1) window.appData.campaigns[campIndex] = updatedCamp;
        
        if (window.appData.activeAdventureId === id) {
            window.appActions.setView('campaign');
        } else {
            reRender();
        }
    },

    // --- PC Manager ---
    addTempPC: () => {
        const input = document.getElementById('new-pc-name');
        const name = input ? input.value.trim() : '';
        if (!name) return;

        window.appData.tempPCs.push({
            id: generateId(),
            name: name,
            inspiration: false,
            automaticSuccess: false
        });
        
        input.value = '';
        reRender(); // Re-render to show new PC in the list
    },

    removeTempPC: (id) => {
        window.appData.tempPCs = window.appData.tempPCs.filter(pc => pc.id !== id);
        reRender();
    },

    savePCs: async () => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        if (!camp) return;

        const updatedCamp = {
            ...camp,
            playerCharacters: window.appData.tempPCs
        };

        await saveCampaign(updatedCamp);
        
        // Optimistic update
        const campIndex = window.appData.campaigns.findIndex(c => c.id === camp.id);
        if (campIndex !== -1) window.appData.campaigns[campIndex] = updatedCamp;
        
        window.appActions.setView('campaign');
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

        // Gather current input values
        const startLvl = parseInt(document.getElementById('draft-start-level')?.value || 1);
        const endLvl = parseInt(document.getElementById('draft-end-level')?.value || 2);
        const numPlayers = parseInt(document.getElementById('draft-num-players')?.value || 1);
        const lootText = document.getElementById('draft-loot')?.value || '';

        // Calculate Loot
        const newLootValue = calculateLootValue(lootText);
        
        // Calculate prior loot (excluding current session if editing)
        const currentSessionId = window.appData.activeSessionId;
        const lootBeforeThisSession = adv.sessions
            .filter(s => s.id !== currentSessionId)
            .reduce((acc, s) => acc + s.lootValue, 0);

        // Budget Math
        const startBudget = BUDGET_BY_LEVEL[startLvl] || 0;
        const endBudget = BUDGET_BY_LEVEL[endLvl] || 0;
        const budgetPerPC = (endLvl > startLvl) ? (endBudget - startBudget) : 0;
        const totalPartyBudget = budgetPerPC * numPlayers;
        
        const currentTotalLoot = lootBeforeThisSession + newLootValue;
        const remainingBudget = totalPartyBudget - currentTotalLoot;

        // Update DOM
        updateBudgetUI(totalPartyBudget, currentTotalLoot, remainingBudget, newLootValue);
    },

    // Build a temporary session object from DOM elements for previews or saving
    _gatherSessionDraft: () => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const session = window.appData.activeSession;

        const lootText = document.getElementById('draft-loot')?.value || '';
        
        // Gather PC states from the DOM
        const pcNotes = {};
        const draftPCs = JSON.parse(JSON.stringify(camp?.playerCharacters || []));
        
        draftPCs.forEach(pc => {
            const noteEl = document.getElementById(`pc-note-${pc.id}`);
            if (noteEl && noteEl.value.trim()) {
                pcNotes[pc.id] = noteEl.value.trim();
            }
            
            const inspEl = document.getElementById(`pc-insp-${pc.id}`);
            if (inspEl) pc.inspiration = inspEl.checked;
            
            const autoEl = document.getElementById(`pc-auto-${pc.id}`);
            if (autoEl) pc.automaticSuccess = autoEl.checked;
        });

        return {
            sessionData: {
                id: session?.id || generateId(),
                name: document.getElementById('draft-name')?.value || `Log from ${new Date().toLocaleDateString()}`,
                timestamp: session?.timestamp || Date.now(),
                lootText: lootText,
                lootValue: calculateLootValue(lootText),
                events: document.getElementById('draft-events')?.value || '',
                npcs: document.getElementById('draft-npcs')?.value || '',
                locations: document.getElementById('draft-locations')?.value || '',
                notes: document.getElementById('draft-notes')?.value || '',
                pcNotes: pcNotes
            },
            updatedPCs: draftPCs,
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
        if (!camp) return;

        const draft = window.appActions._gatherSessionDraft();
        
        // To generate an accurate markdown preview, we temporarily spoof the campaign PCs
        const mockCampaign = { ...camp, playerCharacters: draft.updatedPCs };
        const md = generateSessionMarkdown(draft.sessionData, mockCampaign);
        
        const previewEl = document.getElementById('draft-preview-text');
        if (previewEl) previewEl.value = md;
    },

    saveSession: async () => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const adv = window.appData.activeAdventure;
        if (!camp || !adv) return;

        const draft = window.appActions._gatherSessionDraft();

        // Update the specific adventure's session list
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

        const updatedCamp = {
            ...camp,
            playerCharacters: draft.updatedPCs,
            adventures: newAdventures
        };

        await saveCampaign(updatedCamp);
        
        // Optimistic update
        const campIndex = window.appData.campaigns.findIndex(c => c.id === camp.id);
        if (campIndex !== -1) window.appData.campaigns[campIndex] = updatedCamp;
        
        window.appActions.setView('adventure');
        notify("Session recorded.", "success");
    },

    deleteSession: async (sessionId) => {
        if (!confirm("Are you sure you want to delete this session log?")) return;

        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const adv = window.appData.activeAdventure;
        if (!camp || !adv) return;

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
        
        // Optimistic update
        const campIndex = window.appData.campaigns.findIndex(c => c.id === camp.id);
        if (campIndex !== -1) window.appData.campaigns[campIndex] = updatedCamp;
        
        reRender();
        notify("Session log destroyed.", "success");
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
            updateDerivedState(); // Re-derive to ensure activeSession is set
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
                btn.className = "px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center transition shadow-md bg-emerald-700 text-white border border-emerald-900";
                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.className = "px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center transition shadow-md bg-stone-700 text-amber-50 hover:bg-stone-600 border border-stone-500";
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
