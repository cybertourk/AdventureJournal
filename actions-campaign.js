import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, deleteCampaign as dbDeleteCampaign, notify, joinCampaign as dbJoinCampaign } from './firebase-manager.js';

// --- Navigation ---
export const setView = (viewName) => {
  window.appData.currentView = viewName;
  // Reset specific state based on navigation
  if (viewName === 'home') {
    window.appData.activeCampaignId = null;
    window.appData.activeAdventureId = null;
    window.appData.activeSessionId = null;
    window.appData.activePcId = null;
    window.appData.activeCalendarDate = null;
  } else if (viewName === 'campaign') {
    window.appData.activeAdventureId = null;
    window.appData.activeSessionId = null;
    window.appData.activePcId = null;
    window.appData.activeCalendarDate = null;
  } else if (viewName === 'pc-manager') {
    window.appData.activePcId = null;
  } else if (viewName === 'calendar') {
    window.appData.activeAdventureId = null;
    window.appData.activeSessionId = null;
    window.appData.activePcId = null;
    window.appData.activeCalendarDate = null;
    window.appData.showCalendarSettings = false;
  } else if (viewName === 'rules') {
    window.appData.activeAdventureId = null;
    window.appData.activeSessionId = null;
    window.appData.activePcId = null;
    window.appData.activeCalendarDate = null;
    window.appData.showCalendarSettings = false;
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
    sheetUpdates: [], // Initialize Global Checklist
    codex: [],
    rulesGlossary: [] // Initialize Rules Glossary
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
    btn.innerHTML = `Copied!`;
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

// --- GLOBAL SHEET UPDATES CHECKLIST ---
export const openChecklistMenu = () => {
  const modal = document.getElementById('checklist-modal');
  if (modal) {
    // Ensure UI is fully up to date before revealing
    reRender();
    modal.classList.remove('hidden');
  }
};

export const closeChecklistMenu = () => {
  const modal = document.getElementById('checklist-modal');
  if (modal) modal.classList.add('hidden');
};

export const addSheetUpdate = async () => {
  const input = document.getElementById('new-sheet-update-text');
  if (!input) return;
  
  const text = input.value.trim();
  if (!text) return;
  
  updateDerivedState();
  const camp = window.appData.activeCampaign;
  if (!camp || !camp._isDM) return;

  const newUpdate = {
    id: generateId(),
    text: text,
    resolvedBy: [], // Array of player UIDs who have marked this done
    visibility: { mode: 'public' }, // Default public, DM can change via visibility menu
    timestamp: Date.now()
  };

  const updatedCamp = {
    ...camp,
    sheetUpdates: [...(camp.sheetUpdates || []), newUpdate]
  };
  input.value = '';
  await saveCampaign(updatedCamp);
};

export const toggleSheetUpdateResolved = async (id) => {
  updateDerivedState();
  const camp = window.appData.activeCampaign;
  const myUid = window.appData.currentUserUid;
  if (!camp || !myUid) return;

  const updates = camp.sheetUpdates || [];
  const targetIdx = updates.findIndex(u => u.id === id);
  if (targetIdx === -1) return;

  const target = updates[targetIdx];
  const resolvedBy = target.resolvedBy || [];
  const hasResolved = resolvedBy.includes(myUid);
  
  const newResolvedBy = hasResolved ? resolvedBy.filter(uid => uid !== myUid) : [...resolvedBy, myUid];

  const updatedUpdates = [...updates];
  updatedUpdates[targetIdx] = { ...target, resolvedBy: newResolvedBy };
  
  const updatedCamp = { ...camp, sheetUpdates: updatedUpdates };
  await saveCampaign(updatedCamp);
};

export const deleteSheetUpdate = async (id) => {
  if (!confirm("Are you sure you want to permanently delete this task?")) return;
  
  updateDerivedState();
  const camp = window.appData.activeCampaign;
  if (!camp || !camp._isDM) return;

  const updatedCamp = {
    ...camp,
    sheetUpdates: (camp.sheetUpdates || []).filter(u => u.id !== id)
  };
  await saveCampaign(updatedCamp);
};

// Dummy export to prevent data.js from throwing an error
// (Visibility is handled natively in actions-session.js now!)
export const toggleSheetUpdateVis = () => {};


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
  
  const existingPC = camp.playerCharacters?.find(p => p.id === pcId) || {
    inspiration: false,
    automaticSuccess: false,
    playerId: ''
  };
  
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
    image: isDM ? (document.getElementById('pc-edit-image')?.value.trim() || '') : (existingPC.image || ''),
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
  const newPCs = isNew ? [...(camp.playerCharacters || []), updatedPC] : camp.playerCharacters.map(p => p.id === pcId ? updatedPC : p);

  // --- Auto-Generate / Update Linked Codex Entry for the Hero ---
  let updatedCodexArray = [...(camp.codex || [])];
  const existingCodexEntry = updatedCodexArray.find(c => c.id === pcId);
  
  if (!existingCodexEntry) {
    // Generate entirely new public codex entry with updated default description
    updatedCodexArray.push({
      id: pcId,
      name: updatedPC.name,
      type: 'PC',
      tags: ['Hero', updatedPC.race, updatedPC.classLevel].filter(Boolean),
      desc: 'Rumors and public knowledge surrounding this hero are yet to be penned.',
      visibility: { mode: 'public' },
      image: updatedPC.image
    });
  } else {
    // Update existing entry's name, type, tags and image to stay in sync
    updatedCodexArray = updatedCodexArray.map(c => {
      if (c.id === pcId) {
        return {
          ...c,
          name: updatedPC.name,
          type: 'PC',
          tags: ['Hero', updatedPC.race, updatedPC.classLevel].filter(Boolean),
          image: updatedPC.image
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
