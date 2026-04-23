import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, deleteCampaign as dbDeleteCampaign, notify, joinCampaign as dbJoinCampaign } from './firebase-manager.js';
import { buildSheetUpdatesHTML } from './ui-characters.js';

// --- Navigation ---
export const setView = (viewName) => {
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
};

export const openCampaign = (id) => {
    window.appData.activeCampaignId = id;
    window.appActions.setView('campaign');
};

export const openAdventure = (id) => {
    window.appData.activeAdventureId = id;
    window.appActions.setView('adventure');
};

// --- Campaigns ---
export const toggleNewCampaignForm = () => {
    const btn = document.getElementById('new-camp-btn');
    const form = document.getElementById('new-camp-form');
    if (btn && form) {
        btn.classList.toggle('hidden');
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) {
            document.getElementById('new-camp-name').focus();
        }
    }
};

export const createCampaign = async () => {
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
};

export const deleteCampaignAction = async (id) => {
    const success = await dbDeleteCampaign(id);
    if (success && window.appData.activeCampaignId === id) {
        window.appActions.setView('home');
    }
};

// --- Player Actions ---
export const copyCampaignId = (id, btn) => {
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
};

export const toggleJoinCampaignForm = () => {
    const btn = document.getElementById('join-camp-btn');
    const form = document.getElementById('join-camp-form');
    if (btn && form) {
        btn.classList.toggle('hidden');
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) {
            document.getElementById('join-camp-id').focus();
        }
    }
};

export const joinCampaignAction = async () => {
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
        const success = await dbJoinCampaign(campId);
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
};

// --- Adventures ---
export const toggleNewAdventureForm = () => {
    const btn = document.getElementById('new-adv-btn');
    const form = document.getElementById('new-adv-form');
    if (btn && form) {
        btn.classList.toggle('hidden');
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) {
            document.getElementById('new-adv-name').focus();
        }
    }
};

export const createAdventure = async () => {
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
};

export const deleteAdventure = async (id) => {
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
};

// --- Adventure Roster Management ---
export const openAdvRoster = () => {
    updateDerivedState();
    const adv = window.appData.activeAdventure;
    const camp = window.appData.activeCampaign;
    if (!adv || !camp || !camp._isDM) return;

    // If the adventure doesn't have an activePcIds array yet (from older save), default to all PCs
    window.appData.tempAdvRoster = adv.activePcIds ? [...adv.activePcIds] : camp.playerCharacters.map(pc => pc.id);
    window.appActions.setView('adv-roster');
};

export const toggleAdvRosterPc = (pcId) => {
    const idx = window.appData.tempAdvRoster.indexOf(pcId);
    if (idx === -1) {
        window.appData.tempAdvRoster.push(pcId);
    } else {
        window.appData.tempAdvRoster.splice(idx, 1);
    }
    reRender(); // Re-render to update checkbox visuals
};

export const saveAdvRoster = async () => {
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
};

// --- PC Manager & Sheet Updates Helpers ---

const getUpdatesFromDOM = () => {
    const raw = document.getElementById('pc-edit-sheet-updates')?.value;
    if (!raw) return [];
    return JSON.parse(decodeURIComponent(raw));
};

const setUpdatesToDOM = (updates) => {
    const el = document.getElementById('pc-edit-sheet-updates');
    if (el) el.value = encodeURIComponent(JSON.stringify(updates));
    
    const listEl = document.getElementById('pc-sheet-updates-list');
    if (listEl) {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const isDM = camp?._isDM || false;
        const pc = camp?.playerCharacters?.find(p => p.id === window.appData.activePcId);
        const isOwner = pc ? pc.playerId === window.appData.currentUserUid : false;
        
        listEl.innerHTML = buildSheetUpdatesHTML(updates, isDM, isOwner);
    }
};

export const addSheetUpdate = () => {
    const input = document.getElementById('new-sheet-update-text');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    updateDerivedState();
    const isDM = window.appData.activeCampaign?._isDM || false;
    
    const updates = getUpdatesFromDOM();
    updates.push({
        id: generateId(),
        text: text,
        isResolved: false,
        isHidden: isDM, // Hidden by default if the DM adds it, visible by default if player adds it
        timestamp: Date.now()
    });
    
    setUpdatesToDOM(updates);
    input.value = '';
};

export const toggleSheetUpdateResolved = (id) => {
    const updates = getUpdatesFromDOM();
    const target = updates.find(u => u.id === id);
    if (target) {
        target.isResolved = !target.isResolved;
    }
    setUpdatesToDOM(updates);
};

export const toggleSheetUpdateVis = (id) => {
    const updates = getUpdatesFromDOM();
    const target = updates.find(u => u.id === id);
    if (target) {
        target.isHidden = !target.isHidden;
    }
    setUpdatesToDOM(updates);
};

export const deleteSheetUpdate = (id) => {
    if (!confirm("Are you sure you want to permanently delete this task?")) return;
    const updates = getUpdatesFromDOM();
    setUpdatesToDOM(updates.filter(u => u.id !== id));
};

// --- PC Manager (Hero Profiles) Core ---
export const openPCEdit = (pcId = null) => {
    window.appData.activePcId = pcId;
    window.appActions.setView('pc-edit');
};

export const savePCEdit = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const isDM = camp._isDM;
    const pcId = window.appData.activePcId || generateId();
    const existingPC = camp.playerCharacters?.find(p => p.id === pcId) || { inspiration: false, automaticSuccess: false, playerId: '', sheetUpdates: [] };

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

    // Pull the latest sheet updates state from our hidden DOM input
    const updatesRaw = document.getElementById('pc-edit-sheet-updates')?.value;
    const sheetUpdates = updatesRaw ? JSON.parse(decodeURIComponent(updatesRaw)) : (existingPC.sheetUpdates || []);

    // Gather Inputs safely based on access level
    const updatedPC = {
        ...existingPC,
        id: pcId,
        sheetUpdates: sheetUpdates, // Apply the freshly parsed checklist
        
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

    // --- Auto-Generate / Update Linked Codex Entry for the Hero ---
    let updatedCodexArray = [...(camp.codex || [])];
    const existingCodexEntry = updatedCodexArray.find(c => c.id === pcId);
    
    if (!existingCodexEntry) {
        // Generate entirely new public codex entry with updated default description
        updatedCodexArray.push({
            id: pcId,
            name: updatedPC.name,
            type: 'NPC', // Use NPC category for visual cohesion, tagged as Hero
            tags: ['Hero', updatedPC.race, updatedPC.classLevel].filter(Boolean),
            desc: 'Rumors and public knowledge surrounding this hero are yet to be penned.',
            visibility: { mode: 'public' }
        });
    } else {
        // Update existing entry's name and tags to stay in sync, but leave desc alone
        updatedCodexArray = updatedCodexArray.map(c => {
            if (c.id === pcId) {
                return {
                    ...c,
                    name: updatedPC.name,
                    tags: ['Hero', updatedPC.race, updatedPC.classLevel].filter(Boolean)
                    // Desc and visibility are preserved so the player's custom edits remain intact
                };
            }
            return c;
        });
    }

    const updatedCamp = { ...camp, playerCharacters: newPCs, codex: updatedCodexArray };

    await saveCampaign(updatedCamp);
    window.appActions.setView('pc-manager');
    notify("Hero profile inscribed.", "success");
};

export const deletePC = async (pcId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) {
        notify("Only the DM can remove heroes.", "error");
        return;
    }

    if (!confirm("Are you sure you want to remove this hero from the campaign?")) return;

    const updatedCamp = {
        ...camp,
        playerCharacters: camp.playerCharacters.filter(pc => pc.id !== pcId),
        codex: (camp.codex || []).filter(c => c.id !== pcId) // Clean up the linked public codex entry
    };

    await saveCampaign(updatedCamp);
    notify("Hero removed.", "success");
};

export const kickPlayer = async (uid) => {
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
};
