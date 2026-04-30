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
  
  // Clean up orphaned calendar notes generated by the Arc Sync Engine
  if (camp.calendar && camp.calendar.notes) {
      Object.keys(camp.calendar.notes).forEach(key => {
          if (Array.isArray(camp.calendar.notes[key])) {
              camp.calendar.notes[key] = camp.calendar.notes[key].filter(n => n.id !== id);
              if (camp.calendar.notes[key].length === 0) {
                  delete camp.calendar.notes[key];
              }
          }
      });
  }

  const updatedCamp = {
    ...camp,
    adventures: camp.adventures.filter(a => a.id !== id)
  };
  await saveCampaign(updatedCamp);
  
  if (window.appData.activeAdventureId === id) {
    window.appActions.setView('campaign');
  } else {
    reRender();
  }
};

// Adventure Editing Modal Actions
export const openEditAdventureModal = () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const adv = window.appData.activeAdventure;
    if (!camp || !adv || !camp._isDM) return;

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    let levelOptionsHtml = '';
    for (let i = 1; i <= 21; i++) {
        const lbl = i === 21 ? '20+' : i;
        levelOptionsHtml += `<option value="${i}">Level ${lbl}</option>`;
    }

    const startOptions = levelOptionsHtml.replace(`value="${adv.startLevel}"`, `value="${adv.startLevel}" selected`);
    const endOptions = levelOptionsHtml.replace(`value="${adv.endLevel}"`, `value="${adv.endLevel}" selected`);

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[13000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-md border border-[#d4c5a9] overflow-hidden flex flex-col">
                <div class="bg-stone-900 p-4 border-b-2 border-amber-600 shadow-md flex justify-between items-center">
                    <h2 class="text-lg font-serif font-bold text-amber-50 leading-tight"><i class="fa-solid fa-pen-to-square mr-2 text-amber-500"></i>Amend Arc Details</h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-red-400 transition"><i class="fa-solid fa-times text-xl"></i></button>
                </div>
                <div class="p-5 sm:p-6 bg-[#fdfbf7]">
                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Adventure Title</label>
                        <input type="text" id="edit-adv-name" value="${adv.name.replace(/"/g, '&quot;')}" class="w-full bg-white text-stone-900 border border-[#d4c5a9] p-2 text-sm font-bold outline-none rounded-sm shadow-inner focus:border-amber-600">
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Start Level</label>
                            <select id="edit-adv-start" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 bg-white outline-none focus:border-amber-600 shadow-inner">
                                ${startOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">End Level</label>
                            <select id="edit-adv-end" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 bg-white outline-none focus:border-amber-600 shadow-inner">
                                ${endOptions}
                            </select>
                        </div>
                    </div>
                    <div class="mb-2">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Party Size (Active Heroes)</label>
                        <input type="number" id="edit-adv-players" min="1" value="${adv.numPlayers || 4}" class="w-full bg-white text-stone-900 border border-[#d4c5a9] p-2 text-sm font-bold outline-none rounded-sm shadow-inner focus:border-amber-600">
                    </div>
                </div>
                <div class="p-4 bg-stone-200 border-t border-[#d4c5a9] flex justify-end gap-2">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 border border-stone-400 text-stone-600 rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-300 transition">Cancel</button>
                    <button onclick="window.appActions.saveEditAdventure()" class="px-5 py-2 bg-stone-800 text-amber-50 rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-700 transition">Save Changes</button>
                </div>
            </div>
        </div>
    `;
};

export const saveEditAdventure = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const adv = window.appData.activeAdventure;
    if (!camp || !adv || !camp._isDM) return;

    const newName = document.getElementById('edit-adv-name').value.trim();
    if (!newName) {
        notify("Adventure title cannot be empty.", "error");
        return;
    }

    const newStart = parseInt(document.getElementById('edit-adv-start').value) || 1;
    const newEnd = parseInt(document.getElementById('edit-adv-end').value) || 1;
    const newPlayers = parseInt(document.getElementById('edit-adv-players').value) || 1;

    // Smart-Sync: Update the linked Calendar Note to match the new name immediately!
    if (camp.calendar && camp.calendar.notes) {
        Object.keys(camp.calendar.notes).forEach(key => {
            const notesArr = camp.calendar.notes[key];
            if (Array.isArray(notesArr)) {
                const noteIdx = notesArr.findIndex(n => n.id === adv.id);
                if (noteIdx !== -1) {
                    // Update the title but preserve the underlying text
                    const oldText = notesArr[noteIdx].text;
                    const textParts = oldText.split('\n\n');
                    textParts[0] = `**${newName}**`; // Set the new bolded title
                    notesArr[noteIdx].text = textParts.join('\n\n');
                }
            }
        });
    }

    const updatedAdventures = camp.adventures.map(a => {
        if (a.id === adv.id) {
            return { ...a, name: newName, startLevel: newStart, endLevel: newEnd, numPlayers: newPlayers };
        }
        return a;
    });

    const updatedCamp = { ...camp, adventures: updatedAdventures };
    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Adventure details updated.", "success");
    reRender();
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
    inspiration: 0,
    automaticSuccess: false,
    playerId: ''
  };
  
  const isOwner = existingPC.playerId === window.appData.currentUserUid;
  
  if (!isDM && !isOwner) {
    notify("You do not have permission to modify this hero.", "error");
    return;
  }

  const nameInput = document.getElementById('pc-edit-name')?.value.trim();
  if (!nameInput) {
    notify("Hero must have a name.", "error");
    return;
  }

  // Gather Inputs safely based on access level
  const updatedPC = {
    ...existingPC,
    id: pcId,
    // Core Identity (Now editable by Owner AND DM)
    name: nameInput,
    race: document.getElementById('pc-edit-race')?.value.trim() || '',
    classLevel: document.getElementById('pc-edit-class')?.value.trim() || '',
    background: document.getElementById('pc-edit-background')?.value.trim() || '',
    image: document.getElementById('pc-edit-image')?.value.trim() || '',
    // Characteristics
    alignment: document.getElementById('pc-edit-alignment')?.value.trim() || '',
    faith: document.getElementById('pc-edit-faith')?.value.trim() || '',
    gender: document.getElementById('pc-edit-gender')?.value.trim() || '',
    age: document.getElementById('pc-edit-age')?.value.trim() || '',
    size: document.getElementById('pc-edit-size')?.value.trim() || '',
    height: document.getElementById('pc-edit-height')?.value.trim() || '',
    weight: document.getElementById('pc-edit-weight')?.value.trim() || '',
    eyes: document.getElementById('pc-edit-eyes')?.value.trim() || '',
    hair: document.getElementById('pc-edit-hair')?.value.trim() || '',
    skin: document.getElementById('pc-edit-skin')?.value.trim() || '',
    // Personality & Roleplay
    traits: document.getElementById('input-pc-edit-traits')?.value || '',
    ideals: document.getElementById('input-pc-edit-ideals')?.value || '',
    bonds: document.getElementById('input-pc-edit-bonds')?.value || '',
    flaws: document.getElementById('input-pc-edit-flaws')?.value || '',
    appearance: document.getElementById('input-pc-edit-appearance')?.value || '',
    backstory: document.getElementById('input-pc-edit-backstory')?.value || '',
    organizations: document.getElementById('input-pc-edit-organizations')?.value || '',
    allies: document.getElementById('input-pc-edit-allies')?.value || '',
    enemies: document.getElementById('input-pc-edit-enemies')?.value || '',
    // DM Restricted Administrative Fields
    playerId: isDM ? (document.getElementById('pc-edit-player-id')?.value || '') : (existingPC.playerId || ''),
    dmNotes: isDM ? (document.getElementById('input-pc-edit-dmnotes')?.value || '') : (existingPC.dmNotes || ''),
    boonBackstory: isDM ? (document.getElementById('pc-edit-boon-backstory')?.checked || false) : (existingPC.boonBackstory || false),
    boon1stBday: isDM ? (document.getElementById('pc-edit-boon-1st')?.value.trim() || '') : (existingPC.boon1stBday || ''),
    boon2ndBday: isDM ? (document.getElementById('pc-edit-boon-2nd')?.value.trim() || '') : (existingPC.boon2ndBday || '')
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
