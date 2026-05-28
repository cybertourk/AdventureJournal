import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, deleteCampaign as dbDeleteCampaign, notify, dbJoinCampaign, saveSpecificSheetUpdate, deleteSpecificSheetUpdate, pushActivityLog } from './firebase-manager.js';

// --- ACTIVITY LOG ENGINE ---
export const logPlayerActivity = (camp, myUid, message, icon = 'fa-clock-rotate-left') => {
    if (!camp || camp.dmId === myUid) return camp;
    
    const pName = camp.playerNames ? (camp.playerNames[myUid] || 'Unknown Player') : 'Unknown Player';
    const fullMessage = `<span class="font-bold text-stone-900">${pName}</span> ${message}`;
    
    const newLog = {
        id: generateId(),
        timestamp: Date.now(),
        text: fullMessage,
        icon: icon
    };
    
    return {
        ...camp,
        activityLog: [newLog, ...(camp.activityLog || [])].slice(0, 100)
    };
};

export const openActivityLog = () => {
    window.appActions.setView('activity-log');
};

export const clearActivityLog = async () => {
    if (!confirm("Are you sure you want to clear the entire activity log?")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;
    
    const updatedCamp = { ...camp, activityLog: [] };
    await saveCampaign(updatedCamp);
    notify("Activity log cleared.", "success");
    reRender(true);
};

// --- Navigation ---
export const setView = (viewName) => {
  window.appData.currentView = viewName;
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
  } else if (viewName === 'activity-log') {
    window.appData.activeAdventureId = null;
    window.appData.activeSessionId = null;
    window.appData.activePcId = null;
    window.appData.activeCalendarDate = null;
    window.appData.showCalendarSettings = false;
  }
  reRender(true); 
};

export const openCampaign = (id) => {
  window.appData.activeCampaignId = id;
  // NEW: Save the last accessed campaign to local storage for the auto-router!
  localStorage.setItem('lastAccessedCampaignId', id);
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
  // Sanitize input to prevent XSS injection in the header
  const name = nameInput ? nameInput.value.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
  if (!name) return;
  const newCamp = {
    id: generateId(),
    name: name,
    playerCharacters: [],
    adventures: [],
    sheetUpdates: [],
    codex: [],
    rulesGlossary: [],
    activityLog: []
  };
  await saveCampaign(newCamp);
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
  
  // Sanitize input to prevent XSS
  const name = nameInput ? nameInput.value.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
  if (!name) return;

  const startLevel = parseInt(startLevelSelect.value) || 1;
  const endLevel = parseInt(endLevelSelect.value) || 2;
  
  const defaultRoster = [];
  const assignedPlayers = new Set();
  (camp.playerCharacters || []).forEach(pc => {
      if (pc.playerId && !assignedPlayers.has(pc.playerId)) {
          defaultRoster.push(pc.id);
          assignedPlayers.add(pc.playerId);
      } else if (!pc.playerId) {
          defaultRoster.push(pc.id);
      }
  });

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

  const updatedPCs = (camp.playerCharacters || []).map(pc => {
      let maxInsp = 0;
      if (pc.boonBackstory) maxInsp += 1;
      if (pc.boon2ndBday) maxInsp += 1;
      return {
          ...pc,
          inspiration: maxInsp,
          automaticSuccess: pc.unlockAutoSuccess ? true : false
      };
  });

  const updatedCamp = {
    ...camp,
    playerCharacters: updatedPCs,
    adventures: [...(camp.adventures || []), newAdv]
  };
  
  await saveCampaign(updatedCamp);
  window.appActions.openAdventure(newAdv.id);
  notify("Adventure begun! Party boons have been refreshed.", "success");
};

export const deleteAdventure = async (id) => {
  updateDerivedState();
  const camp = window.appData.activeCampaign;
  if (!camp || !camp._isDM) {
    notify("Only the DM can delete adventures.", "error");
    return;
  }
  
  if (!confirm("Delete this adventure arc? All contained sessions will be lost.")) return;
  
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
    reRender(true);
  }
};

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
                <div class="p-4 bg-stone-200 border-t border-[#d4c5a9] flex flex-wrap-reverse sm:flex-nowrap justify-between gap-3 items-center">
                    <button onclick="window.appActions.refreshPartyBoons()" class="w-full sm:w-auto px-4 py-2 border border-amber-400 bg-amber-100 text-amber-700 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-amber-200 transition whitespace-nowrap" title="Top up Inspiration & Auto-Success">
                        <i class="fa-solid fa-gift mr-1"></i> Refresh Boons
                    </button>
                    <div class="flex gap-2 w-full sm:w-auto justify-end">
                        <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 border border-stone-400 text-stone-600 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-300 transition">Cancel</button>
                        <button onclick="window.appActions.saveEditAdventure()" class="px-5 py-2 bg-stone-800 text-amber-50 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-700 transition">Save Changes</button>
                    </div>
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

    // Sanitize to prevent XSS
    const newName = document.getElementById('edit-adv-name').value.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (!newName) {
        notify("Adventure title cannot be empty.", "error");
        return;
    }

    const newStart = parseInt(document.getElementById('edit-adv-start').value) || 1;
    const newEnd = parseInt(document.getElementById('edit-adv-end').value) || 1;
    const newPlayers = parseInt(document.getElementById('edit-adv-players').value) || 1;

    if (camp.calendar && camp.calendar.notes) {
        Object.keys(camp.calendar.notes).forEach(key => {
            const notesArr = camp.calendar.notes[key];
            if (Array.isArray(notesArr)) {
                const noteIdx = notesArr.findIndex(n => n.id === adv.id);
                if (noteIdx !== -1) {
                    const oldText = notesArr[noteIdx].text;
                    const textParts = oldText.split('\n\n');
                    textParts[0] = `**${newName}**`;
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
    reRender(true);
};

export const refreshPartyBoons = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    if (!confirm("This will restore Inspiration to maximum and grant 1 Auto-Success for eligible heroes. Proceed?")) return;

    const updatedPCs = (camp.playerCharacters || []).map(pc => {
        let maxInsp = 0;
        if (pc.boonBackstory) maxInsp += 1;
        if (pc.boon2ndBday) maxInsp += 1;
        return {
            ...pc,
            inspiration: maxInsp,
            automaticSuccess: pc.unlockAutoSuccess ? true : false
        };
    });

    const updatedCamp = { ...camp, playerCharacters: updatedPCs };
    await saveCampaign(updatedCamp);
    
    notify("Party boons have been refreshed.", "success");
    reRender(true);
};

export const openAdvRoster = () => {
  updateDerivedState();
  const adv = window.appData.activeAdventure;
  const camp = window.appData.activeCampaign;
  if (!adv || !camp || !camp._isDM) return;
  
  if (adv.activePcIds) {
      window.appData.tempAdvRoster = [...adv.activePcIds];
  } else {
      window.appData.tempAdvRoster = [];
      const assignedPlayers = new Set();
      camp.playerCharacters.forEach(pc => {
          if (pc.playerId && !assignedPlayers.has(pc.playerId)) {
              window.appData.tempAdvRoster.push(pc.id);
              assignedPlayers.add(pc.playerId);
          } else if (!pc.playerId) {
              window.appData.tempAdvRoster.push(pc.id);
          }
      });
  }
  window.appActions.setView('adv-roster');
};

export const toggleAdvRosterPc = (pcId) => {
  const camp = window.appData.activeCampaign;
  const targetPc = camp.playerCharacters.find(p => p.id === pcId);
  const idx = window.appData.tempAdvRoster.indexOf(pcId);

  if (idx === -1) {
    if (targetPc && targetPc.playerId) {
        const existingPcIdx = window.appData.tempAdvRoster.findIndex(id => {
            const p = camp.playerCharacters.find(c => c.id === id);
            return p && p.playerId === targetPc.playerId;
        });
        
        if (existingPcIdx !== -1) {
            const oldPcId = window.appData.tempAdvRoster[existingPcIdx];
            const oldPc = camp.playerCharacters.find(c => c.id === oldPcId);
            window.appData.tempAdvRoster.splice(existingPcIdx, 1);
            notify(`Swapped active hero (Removed ${oldPc.name}).`, 'info');
        }
    }
    window.appData.tempAdvRoster.push(pcId);
  } else {
    window.appData.tempAdvRoster.splice(idx, 1);
  }
  reRender(true);
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
      numPlayers: window.appData.tempAdvRoster.length 
    };
  });

  const updatedCamp = { ...camp, adventures: updatedAdventures };
  await saveCampaign(updatedCamp);
  window.appActions.setView('adventure');
  notify("Arc roster inscribed.", "success");
};

// ============================================================================
// --- PC MANAGEMENT AND CHECKLIST / SHEET UPDATES ---
// ============================================================================

export const openChecklistMenu = () => {
  const modal = document.getElementById('checklist-modal');
  if (modal) {
    reRender(true);
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
  
  const text = input.value.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;"); // XSS Sanitization
  if (!text) return;
  
  updateDerivedState();
  const camp = window.appData.activeCampaign;
  const myUid = window.appData.currentUserUid;
  if (!camp || !myUid) return;

  const newUpdate = {
    id: generateId(),
    text: text,
    authorId: myUid,
    resolvedBy: [],
    visibility: camp._isDM ? { mode: 'public' } : { mode: 'hidden' }, // Player tasks default to Private between DM and Player
    timestamp: Date.now()
  };

  // Optimistic UI update
  camp.sheetUpdates = [...(camp.sheetUpdates || []), newUpdate];
  input.value = '';
  
  // Granular Save
  await saveSpecificSheetUpdate(camp.id, newUpdate);
  
  // LOG ACTIVITY WHEN A PLAYER ADDS A TASK
  if (!camp._isDM) {
      const pName = camp.playerNames ? (camp.playerNames[myUid] || 'Unknown Player') : 'Unknown Player';
      const logMsg = `<span class="font-bold text-stone-900">${pName}</span> created a new task: <span class="italic text-stone-600">"${text}"</span>`;
      
      const newLog = {
          id: generateId(),
          timestamp: Date.now(),
          text: logMsg,
          icon: 'fa-list-check'
      };
      
      // Optimistic push to local log
      camp.activityLog = [newLog, ...(camp.activityLog || [])].slice(0, 100);
      
      // Granular remote push
      await pushActivityLog(camp.id, newLog);
  }
  
  reRender(true);
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

  const updatedUpdate = { ...target, resolvedBy: newResolvedBy };
  
  // Optimistic local update
  camp.sheetUpdates[targetIdx] = updatedUpdate;
  
  // Execute granular remote save without race conditions!
  await saveSpecificSheetUpdate(camp.id, updatedUpdate);
  
  // LOG ACTIVITY WHEN A PLAYER MARKS A TASK AS COMPLETE
  if (!camp._isDM && !hasResolved) {
      const pName = camp.playerNames ? (camp.playerNames[myUid] || 'Unknown Player') : 'Unknown Player';
      const logMsg = `<span class="font-bold text-stone-900">${pName}</span> marked a task as complete: <span class="italic text-stone-600">"${target.text}"</span>`;
      
      const newLog = {
          id: generateId(),
          timestamp: Date.now(),
          text: logMsg,
          icon: 'fa-check'
      };
      
      // Optimistic push to local log
      camp.activityLog = [newLog, ...(camp.activityLog || [])].slice(0, 100);
      
      // Granular remote push
      await pushActivityLog(camp.id, newLog);
  }
  
  reRender(true);
};

export const deleteSheetUpdate = async (id) => {
  if (!confirm("Are you sure you want to permanently delete this task?")) return;
  
  updateDerivedState();
  const camp = window.appData.activeCampaign;
  const myUid = window.appData.currentUserUid;
  if (!camp || !myUid) return;

  const target = (camp.sheetUpdates || []).find(u => u.id === id);
  if (!target) return;

  if (!camp._isDM && target.authorId !== myUid) {
      notify("Only the DM or the task's author can delete it.", "error");
      return;
  }

  // Optimistic update
  camp.sheetUpdates = (camp.sheetUpdates || []).filter(u => u.id !== id);
  
  // Granular Save
  await deleteSpecificSheetUpdate(camp.id, id);
  reRender(true);
};

export const toggleSheetUpdateVis = () => {}; 

export const openPCEdit = (pcId = null) => {
  window.appData.activePcId = pcId;
  window.appActions.setView('pc-edit');
};

export const calculateBirthdaysLive = () => {
    const monthEl = document.getElementById('pc-edit-birth-month');
    const dayEl = document.getElementById('pc-edit-birth-day');
    const joinEl = document.getElementById('pc-edit-join-date');
    const countEl = document.getElementById('pc-edit-bday-count');

    if (!monthEl || !dayEl || !joinEl || !countEl) return;

    const effMonth = parseInt(monthEl.value, 10);
    const effDay = parseInt(dayEl.value, 10);
    const joinDateStr = joinEl.value;

    let calculatedBirthdays = 0;

    if (!isNaN(effMonth) && !isNaN(effDay) && joinDateStr) {
        const joinDate = new Date(joinDateStr);
        if (!isNaN(joinDate.getTime())) {
            const today = new Date();
            let count = 0;
            for (let y = joinDate.getFullYear(); y <= today.getFullYear(); y++) {
                const bDateThisYear = new Date(y, effMonth - 1, effDay);
                if (bDateThisYear >= joinDate && bDateThisYear <= today) count++;
            }
            calculatedBirthdays = count;
        }
    }

    countEl.textContent = calculatedBirthdays;

    for (let i = 3; i <= 12; i++) {
        const slot = document.getElementById(`extra-boon-slot-${i}`);
        if (slot) {
            const select = document.getElementById(`pc-edit-boon-${i}`);
            if (i <= calculatedBirthdays || (select && select.value !== '')) slot.classList.remove('hidden');
            else slot.classList.add('hidden');
        }
    }
};

export const savePCEdit = async () => {
  updateDerivedState();
  const camp = window.appData.activeCampaign;
  if (!camp) return;

  const isDM = camp._isDM;
  const myUid = window.appData.currentUserUid;
  const pcId = window.appData.activePcId || generateId();

  const existingPC = camp.playerCharacters?.find(p => p.id === pcId) || {
      inspiration: 0,
      automaticSuccess: false,
      playerId: '',
      birthMonth: null,
      birthDay: null,
      extraBdayBoons: [],
      availableDowntime: 0,
      downtimeLog: '',
      str: '', dex: '', con: '', int: '', wis: '', cha: '',
      saves: '', skills: '', proficiencies: '',
      wealth: '', equipped: '', backpack: '', ddbId: '',
      isPrivate: false
  };

  const isOwner = existingPC.playerId === myUid;

  if (!isDM && !isOwner) {
      notify("You do not have permission to modify this hero.", "error");
      return;
  }

  const nameInput = document.getElementById('pc-edit-name')?.value.trim();
  if (!nameInput) {
      notify("Hero must have a name.", "error");
      return;
  }

  // Handle DM's manual birthday entry vs Account linkage
  const bMonthEl = document.getElementById('pc-edit-birth-month');
  const bDayEl = document.getElementById('pc-edit-birth-day');

  const localBMonth = isDM ? ((bMonthEl && !bMonthEl.disabled) ? (parseInt(bMonthEl.value) || null) : existingPC.birthMonth) : existingPC.birthMonth;
  const localBDay = isDM ? ((bDayEl && !bDayEl.disabled) ? (parseInt(bDayEl.value) || null) : existingPC.birthDay) : existingPC.birthDay;
  
  const isPrivateFlag = isDM ? (document.getElementById('pc-edit-is-private')?.checked || false) : (existingPC.isPrivate || false);

  // Gather Extra Birthday Boons (3rd+)
  const extraBdayBoons = [];
  if (isDM) {
      for (let i = 3; i <= 12; i++) {
          const select = document.getElementById(`pc-edit-boon-${i}`);
          if (select) {
              extraBdayBoons.push(select.value);
          }
      }
      while (extraBdayBoons.length > 0 && extraBdayBoons[extraBdayBoons.length - 1] === '') {
          extraBdayBoons.pop();
      }
  }

  // Helper to gracefully extract values, allowing empty strings to overwrite existing data
  const getVal = (id, fallback) => {
      const el = document.getElementById(id);
      if (el) return el.value; 
      return fallback || '';
  };

  // Gather Inputs safely based on access level
  const updatedPC = {
      ...existingPC,
      id: pcId,
      isPrivate: isPrivateFlag,
      // Core Identity
      name: nameInput,
      race: getVal('pc-edit-race', existingPC.race),
      classLevel: getVal('pc-edit-class', existingPC.classLevel),
      background: getVal('pc-edit-background', existingPC.background),
      image: getVal('pc-edit-image', existingPC.image),
      ddbId: getVal('pc-edit-ddb-id', existingPC.ddbId),
      // Characteristics
      alignment: getVal('pc-edit-alignment', existingPC.alignment),
      faith: getVal('pc-edit-faith', existingPC.faith),
      gender: getVal('pc-edit-gender', existingPC.gender),
      age: getVal('pc-edit-age', existingPC.age),
      size: getVal('pc-edit-size', existingPC.size),
      height: getVal('pc-edit-height', existingPC.height),
      weight: getVal('pc-edit-weight', existingPC.weight),
      eyes: getVal('pc-edit-eyes', existingPC.eyes),
      hair: getVal('pc-edit-hair', existingPC.hair),
      skin: getVal('pc-edit-skin', existingPC.skin),
      // Core Stats
      str: getVal('pc-edit-str', existingPC.str),
      dex: getVal('pc-edit-dex', existingPC.dex),
      con: getVal('pc-edit-con', existingPC.con),
      int: getVal('pc-edit-int', existingPC.int),
      wis: getVal('pc-edit-wis', existingPC.wis),
      cha: getVal('pc-edit-cha', existingPC.cha),
      saves: getVal('pc-edit-saves', existingPC.saves),
      skills: getVal('pc-edit-skills', existingPC.skills),
      proficiencies: getVal('pc-edit-proficiencies', existingPC.proficiencies),
      // Personality & Roleplay
      traits: getVal('input-pc-edit-traits', existingPC.traits),
      ideals: getVal('input-pc-edit-ideals', existingPC.ideals),
      bonds: getVal('input-pc-edit-bonds', existingPC.bonds),
      flaws: getVal('input-pc-edit-flaws', existingPC.flaws),
      appearance: getVal('input-pc-edit-appearance', existingPC.appearance),
      backstory: getVal('input-pc-edit-backstory', existingPC.backstory),
      organizations: getVal('input-pc-edit-organizations', existingPC.organizations),
      allies: getVal('input-pc-edit-allies', existingPC.allies),
      enemies: getVal('input-pc-edit-enemies', existingPC.enemies),
      // Equipment & Wealth
      wealth: getVal('pc-edit-wealth', existingPC.wealth),
      equipped: getVal('input-pc-edit-equipped', existingPC.equipped),
      backpack: getVal('input-pc-edit-backpack', existingPC.backpack),

      // Downtime Log (Explicitly allowing it to be cleared out)
      downtimeLog: getVal('input-pc-edit-downtimelog', existingPC.downtimeLog),

      // DM Restricted Administrative Fields
      playerId: isDM ? getVal('pc-edit-player-id', existingPC.playerId) : (existingPC.playerId || ''),
      dmNotes: isDM ? getVal('input-pc-edit-dmnotes', existingPC.dmNotes) : (existingPC.dmNotes || ''),
      joinDate: isDM ? getVal('pc-edit-join-date', existingPC.joinDate) : (existingPC.joinDate || ''), 
      birthMonth: localBMonth,
      birthDay: localBDay,
      boonBackstory: isDM ? (document.getElementById('pc-edit-boon-backstory')?.checked || false) : (existingPC.boonBackstory || false),
      unlockAutoSuccess: isDM ? (document.getElementById('pc-edit-unlock-auto-success')?.checked || false) : (existingPC.unlockAutoSuccess || false),
      boon1stBday: isDM ? getVal('pc-edit-boon-1st', existingPC.boon1stBday) : (existingPC.boon1stBday || ''),
      boon2ndBday: isDM ? getVal('pc-edit-boon-2nd', existingPC.boon2ndBday) : (existingPC.boon2ndBday || ''),
      extraBdayBoons: isDM ? extraBdayBoons : (existingPC.extraBdayBoons || []),
      availableDowntime: isDM ? (parseInt(document.getElementById('pc-edit-downtime')?.value) || 0) : (parseInt(existingPC.availableDowntime) || 0)
  };

  const isNew = !camp.playerCharacters?.some(p => p.id === pcId);
  const newPCs = isNew ? [...(camp.playerCharacters || []), updatedPC] : camp.playerCharacters.map(p => p.id === pcId ? updatedPC : p);

  // --- Auto-Generate / Update Linked Codex Entry for the Hero ---
  let codexVisibility = { mode: 'public', visibleTo: [] };
  if (isPrivateFlag) {
      if (updatedPC.playerId) {
          codexVisibility = { mode: 'specific', visibleTo: [updatedPC.playerId] };
      } else {
          codexVisibility = { mode: 'hidden', visibleTo: [] };
      }
  }

  let updatedCodexArray = [...(camp.codex || [])];
  const existingCodexEntry = updatedCodexArray.find(c => c.id === pcId);

  // Core generated tags for the Hero
  const baseTags = ['Hero', updatedPC.race, updatedPC.classLevel].filter(Boolean);
  
  if (!existingCodexEntry) {
      updatedCodexArray.push({
          id: pcId,
          name: updatedPC.name,
          type: 'PC',
          tags: baseTags,
          desc: 'Rumors and public knowledge surrounding this hero are yet to be penned.',
          visibility: codexVisibility,
          image: updatedPC.image
      });
  } else {
      // PRESERVE CUSTOM TAGS: Get any tags currently on the codex entry, merge with the base tags, and deduplicate.
      // This is the Safe Tag Merge logic ensuring manual adjustments to PC tags are retained safely.
      const existingTags = existingCodexEntry.tags || [];
      const mergedTags = [...new Set([...baseTags, ...existingTags])];

      updatedCodexArray = updatedCodexArray.map(c => {
          if (c.id === pcId) {
              return {
                  ...c,
                  name: updatedPC.name,
                  type: 'PC',
                  tags: mergedTags,
                  visibility: codexVisibility,
                  image: updatedPC.image
              };
          }
          return c;
      });
  }

  let updatedCamp = { ...camp, playerCharacters: newPCs, codex: updatedCodexArray };

  // Track Player Edits!
  if (!isDM) {
      updatedCamp = logPlayerActivity(updatedCamp, myUid, `updated the private journal for <span class="font-bold text-amber-700">${updatedPC.name}</span>.`, 'fa-user-pen');
  }

  // Local Optimistic Update
  window.appData.activeCampaign = updatedCamp;
  reRender();

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
    codex: (camp.codex || []).filter(c => c.id !== pcId) 
  };
  
  await saveCampaign(updatedCamp);
  notify("Hero removed.", "success");
  
  if (window.appData.activePcId === pcId) {
      window.appActions.setView('pc-manager');
  } else {
      reRender(true);
  }
};

export const kickPlayer = async (uid) => {
  updateDerivedState();
  const camp = window.appData.activeCampaign;
  if (!camp || !camp._isDM) return;
  
  if (!confirm("Exile this player from the campaign? They will lose access to the tome.")) return;
  
  const updatedPlayers = (camp.activePlayers || []).filter(id => id !== uid);
  
  const updatedNames = { ...camp.playerNames };
  delete updatedNames[uid];
  
  const updatedBirthdays = { ...camp.playerBirthdays };
  delete updatedBirthdays[uid];
  
  const updatedPCs = (camp.playerCharacters || []).map(pc => {
    if (pc.playerId === uid) return { ...pc, playerId: '' };
    return pc;
  });
  
  const updatedCamp = {
    ...camp,
    activePlayers: updatedPlayers,
    playerNames: updatedNames,
    playerBirthdays: updatedBirthdays,
    playerCharacters: updatedPCs
  };
  
  await saveCampaign(updatedCamp);
  notify("Player exiled from the campaign.", "success");
  reRender(true);
};

// ============================================================================
// --- D&D BEYOND IMPORT ENGINE ---
// ============================================================================

const parseDDBCharacter = (charData) => {
    const statModMap = { 'strength-score': 1, 'dexterity-score': 2, 'constitution-score': 3, 'intelligence-score': 4, 'wisdom-score': 5, 'charisma-score': 6 };
    const skillAbilities = {
        'athletics': 1, 'acrobatics': 2, 'sleight-of-hand': 2, 'stealth': 2,
        'arcana': 4, 'history': 4, 'investigation': 4, 'nature': 4, 'religion': 4,
        'animal-handling': 5, 'insight': 5, 'medicine': 5, 'perception': 5, 'survival': 5,
        'deception': 6, 'intimidation': 6, 'performance': 6, 'persuasion': 6
    };
    
    const formatName = (str) => str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const stripHtml = (html) => html ? html.replace(/<[^>]*>?/gm, '').trim() : '';

    const alignmentMap = { 1: 'Lawful Good', 2: 'Neutral Good', 3: 'Chaotic Good', 4: 'Lawful Neutral', 5: 'True Neutral', 6: 'Chaotic Neutral', 7: 'Lawful Evil', 8: 'Neutral Evil', 9: 'Chaotic Evil' };
    const sizeMap = { 2: 'Tiny', 3: 'Small', 4: 'Medium', 5: 'Large', 6: 'Huge', 7: 'Gargantuan' };

    const stats = { 1: {base: 10, bonus: 0, override: 0}, 2: {base: 10, bonus: 0, override: 0}, 3: {base: 10, bonus: 0, override: 0}, 4: {base: 10, bonus: 0, override: 0}, 5: {base: 10, bonus: 0, override: 0}, 6: {base: 10, bonus: 0, override: 0} };
    charData.stats?.forEach(s => { if(stats[s.id]) stats[s.id].base = s.value; });
    charData.overrideStats?.forEach(s => { if(stats[s.id] && s.value) stats[s.id].override = s.value; });
    
    let proficiencies = { saves: {}, skills: {}, weapons: [], armor: [], tools: [], languages: [] };

    Object.values(charData.modifiers || {}).forEach(modArr => {
        if (Array.isArray(modArr)) {
            modArr.forEach(mod => {
                const subType = mod.subType || '';
                const type = mod.type || '';
                const friendlyName = mod.friendlySubtypeName || formatName(subType);

                if (type === 'bonus' && statModMap[subType]) {
                    stats[statModMap[subType]].bonus += mod.value;
                }
                
                if (type === 'proficiency' || type === 'expertise') {
                    const profVal = type === 'expertise' ? 2 : 1;
                    if (subType.includes('saving-throws')) {
                        const statId = statModMap[subType.replace('-saving-throws', '-score')];
                        if (statId) proficiencies.saves[statId] = profVal;
                    } else if (skillAbilities[subType]) {
                        proficiencies.skills[subType] = Math.max(proficiencies.skills[subType] || 0, profVal);
                    } else if (type === 'language') {
                         proficiencies.languages.push(friendlyName);
                    } else if (subType.includes('armor') || subType === 'shields') {
                        proficiencies.armor.push(friendlyName);
                    } else if (subType.includes('weapons') || subType.includes('sword') || subType.includes('bow') || subType.includes('axe') || subType.includes('hammer') || subType.includes('mace') || subType.includes('crossbow')) {
                         proficiencies.weapons.push(friendlyName);
                    } else if (subType.includes('tools') || subType.includes('kit') || subType.includes('supplies') || subType.includes('instrument') || subType.includes('vehicles') || subType.includes('utensils')) {
                         proficiencies.tools.push(friendlyName);
                    } else {
                        if (friendlyName.includes('Armor') || friendlyName.includes('Shield')) proficiencies.armor.push(friendlyName);
                        else if (friendlyName.includes('Weapons') || friendlyName.includes('Sword') || friendlyName.includes('Bow')) proficiencies.weapons.push(friendlyName);
                    }
                } else if (type === 'language') {
                     proficiencies.languages.push(friendlyName);
                }
            });
        }
    });

    for(let i=1; i<=6; i++) {
        stats[i].total = stats[i].override || (stats[i].base + stats[i].bonus);
    }

    const equippedItems = [];
    const backpackItems = [];
    let wealth = charData.currencies || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    
    if (charData.inventory && Array.isArray(charData.inventory)) {
        charData.inventory.forEach(item => {
            const name = item.definition?.name || 'Unknown Item';
            const qty = item.quantity > 1 ? ` (x${item.quantity})` : '';
            if (item.equipped) equippedItems.push(`${name}${qty}`);
            else backpackItems.push(`${name}${qty}`);
        });
    }

    const savesArr = [];
    const statNames = {1:'STR', 2:'DEX', 3:'CON', 4:'INT', 5:'WIS', 6:'CHA'};
    for (let i = 1; i <= 6; i++) { if (proficiencies.saves[i]) savesArr.push(statNames[i]); }

    const skillsArr = [];
    Object.keys(skillAbilities).forEach(skillKey => {
        if (proficiencies.skills[skillKey]) skillsArr.push(formatName(skillKey));
    });

    const sizeId = charData.race?.sizeId || charData.sizeId;
    const finalSize = sizeMap[sizeId] || charData.size || '';

    return {
        name: charData.name || 'Unknown',
        race: charData.race?.fullName || charData.race?.baseName || '',
        classLevel: charData.classes?.map(c => `${c.definition?.name} ${c.level}`).join(' / ') || '',
        background: charData.background?.definition?.name || (charData.background?.customBackground ? charData.background.customBackground.name : ''),
        alignment: alignmentMap[charData.alignmentId] || '', 
        faith: charData.faith || '',
        gender: charData.gender || '',
        age: charData.age || '',
        size: finalSize,
        height: charData.height || '',
        weight: charData.weight || '',
        eyes: charData.eyes || '',
        hair: charData.hair || '',
        skin: charData.skin || '',
        image: '', 
        str: stats[1].total, dex: stats[2].total, con: stats[3].total, 
        int: stats[4].total, wis: stats[5].total, cha: stats[6].total,
        saves: savesArr.join(', '),
        skills: skillsArr.join(', '),
        proficiencies: [...new Set([...proficiencies.weapons, ...proficiencies.armor, ...proficiencies.tools, ...proficiencies.languages])].join(', '),
        wealth: `${wealth.cp}cp, ${wealth.sp}sp, ${wealth.ep}ep, ${wealth.gp}gp, ${wealth.pp}pp`,
        equipped: equippedItems.join('\n'),
        backpack: backpackItems.join('\n'),
        traits: stripHtml(charData.traits?.personalityTraits),
        ideals: stripHtml(charData.traits?.ideals),
        bonds: stripHtml(charData.traits?.bonds),
        flaws: stripHtml(charData.traits?.flaws),
        appearance: stripHtml(charData.traits?.appearance),
        backstory: stripHtml(charData.notes?.backstory),
        organizations: stripHtml(charData.notes?.organizations),
        allies: stripHtml(charData.notes?.allies),
        enemies: stripHtml(charData.notes?.enemies)
    };
};

// --- NEW PROXY CASCADE ENGINE ---
const fetchWithProxyCascade = async (targetUrl) => {
    const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${targetUrl}`
    ];

    let lastError = null;
    for (const proxy of proxies) {
        try {
            console.log(`Attempting D&D Beyond fetch via: ${proxy.split('/')[2]}`);
            const response = await fetch(proxy, { headers: { 'Cache-Control': 'no-cache' } });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (err) {
            console.warn(`Proxy failed: ${proxy.split('/')[2]}`, err);
            lastError = err;
        }
    }
    
    // If we exhaust the loop, all proxies failed
    throw new Error("All CORS proxies failed. D&D Beyond might be down, or you are being rate-limited. Please try again later.");
};


export const openDndBeyondImportModal = () => {
    const container = document.getElementById('global-popup-container');
    if (!container) return;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-4xl border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div class="bg-stone-900 p-4 border-b-4 border-red-900 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-file-import mr-2 text-red-500"></i> D&D Beyond Importer</h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-times text-xl"></i></button>
                </div>
                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7] flex flex-col gap-4">
                    <div class="bg-amber-50 border border-amber-200 p-4 rounded-sm shadow-sm text-amber-900 text-sm leading-snug">
                        <i class="fa-solid fa-circle-info mr-1 text-amber-600"></i> Paste the full URL to your public D&D Beyond character sheet. The app will fetch the data and extract your hero's attributes, classes, and lore automatically.
                    </div>
                    
                    <div class="flex gap-2 w-full max-w-2xl mx-auto mt-2">
                        <input type="text" id="ddb-url-input" class="flex-grow p-3 border border-[#d4c5a9] rounded-sm text-sm font-bold bg-white shadow-inner focus:border-red-900 outline-none" placeholder="e.g. https://www.dndbeyond.com/characters/12345678">
                        <button id="ddb-fetch-btn" onclick="window.appActions.fetchAndAnalyzeDndBeyond()" class="px-6 py-3 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-xs shadow-md shrink-0 whitespace-nowrap"><i class="fa-solid fa-cloud-arrow-down mr-2"></i> Fetch & Analyze</button>
                    </div>

                    <div id="ddb-analysis-output" class="hidden flex-grow bg-stone-900 text-green-400 p-4 rounded-sm font-mono text-[10px] sm:text-xs overflow-auto custom-scrollbar min-h-[300px] border border-stone-700 shadow-inner whitespace-pre-wrap mt-4"></div>
                </div>
            </div>
        </div>
    `;
};

export const fetchAndAnalyzeDndBeyond = async () => {
    const input = document.getElementById('ddb-url-input').value.trim();
    const output = document.getElementById('ddb-analysis-output');
    const btn = document.getElementById('ddb-fetch-btn');
    
    if (!input) {
        notify("Please enter a valid D&D Beyond character URL.", "error");
        return;
    }

    const match = input.match(/\/characters?\/(\d+)/i) || input.match(/^(\d+)$/);
    if (!match) {
        notify("Could not find a character ID. Please ensure it looks like dndbeyond.com/characters/12345678", "error");
        return;
    }
    const characterId = match[1];

    const originalBtnHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Fetching...';
    btn.disabled = true;
    output.classList.add('hidden');

    try {
        const cacheBust = new Date().getTime();
        const apiUrl = `https://character-service.dndbeyond.com/character/v5/character/${characterId}?cb=${cacheBust}`;
        
        // Execute the new Proxy Cascade!
        const ddbData = await fetchWithProxyCascade(apiUrl);
        
        if (!ddbData || !ddbData.success || !ddbData.data) {
            throw new Error("D&D Beyond returned an unexpected data structure. Ensure the character is set to Public.");
        }

        const parsedData = parseDDBCharacter(ddbData.data);
        
        window.appData.tempDdbImport = {
            ...parsedData,
            id: generateId(),
            ddbId: characterId,
            playerId: '', inspiration: 0, automaticSuccess: false, availableDowntime: 0, downtimeLog: ''
        };

        let analysis = `✅ Character Successfully Fetched via API.\n\n`;
        analysis += `Name: ${parsedData.name}\n`;
        analysis += `Race: ${parsedData.race}\n`;
        analysis += `Class: ${parsedData.classLevel}\n\n`;
        
        analysis += `STR: ${parsedData.str} | DEX: ${parsedData.dex} | CON: ${parsedData.con}\n`;
        analysis += `INT: ${parsedData.int} | WIS: ${parsedData.wis} | CHA: ${parsedData.cha}\n\n`;
        
        analysis += `Saving Throws: ${parsedData.saves || 'None'}\n`;
        analysis += `Skills: ${parsedData.skills || 'None'}\n`;
        analysis += `Proficiencies: ${parsedData.proficiencies || 'None'}\n\n`;
        
        analysis += `Wealth: ${parsedData.wealth}\n`;
        
        const eqCount = parsedData.equipped ? parsedData.equipped.split('\n').length : 0;
        const bpCount = parsedData.backpack ? parsedData.backpack.split('\n').length : 0;
        analysis += `Equipment: ${eqCount} items equipped, ${bpCount} in backpack.\n`;

        output.innerHTML = `
            <div class="text-green-400 whitespace-pre-wrap mb-4">${analysis}</div>
            <button onclick="window.appActions.executeDndBeyondImport()" class="w-full py-3 bg-emerald-700 text-white rounded-sm hover:bg-emerald-600 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                <i class="fa-solid fa-user-check mr-2"></i> Import ${parsedData.name} into Campaign
            </button>
        `;
        
        output.classList.remove('hidden');
        output.classList.remove('text-red-500');
        output.classList.add('text-green-400');
        
    } catch (e) {
        output.textContent = "Error parsing D&D Beyond data: \n" + e.message;
        output.classList.remove('hidden');
        output.classList.remove('text-green-400');
        output.classList.add('text-red-500');
    } finally {
        btn.innerHTML = originalBtnHtml;
        btn.disabled = false;
    }
};

export const executeDndBeyondImport = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const newPC = window.appData.tempDdbImport;
    if (!newPC) {
        notify("No character data found to import.", "error");
        return;
    }

    const newPCs = [...(camp.playerCharacters || []), newPC];

    let updatedCodexArray = [...(camp.codex || [])];
    updatedCodexArray.push({
        id: newPC.id,
        name: newPC.name,
        type: 'PC',
        tags: ['Hero', newPC.race, newPC.classLevel].filter(Boolean),
        desc: 'Rumors and public knowledge surrounding this hero are yet to be penned.',
        visibility: { mode: 'public' },
        image: newPC.image
    });

    let updatedCamp = { ...camp, playerCharacters: newPCs, codex: updatedCodexArray };
    updatedCamp = logPlayerActivity(updatedCamp, window.appData.currentUserUid, `imported a new hero: <span class="font-bold text-amber-700">${newPC.name}</span>.`, 'fa-file-import');

    await saveCampaign(updatedCamp);

    document.getElementById('global-popup-container').innerHTML = '';
    window.appData.tempDdbImport = null;
    notify("Hero imported successfully.", "success");
    reRender(true);
};

export const quickSyncDDB = async (pcId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    let ddbIdToUse = "";
    const isEditView = window.appData.currentView === 'pc-edit';
    
    if (isEditView) {
        const inputEl = document.getElementById('pc-edit-ddb-id');
        if (inputEl && inputEl.value.trim()) {
            ddbIdToUse = inputEl.value.trim();
        }
    } 
    
    if (!ddbIdToUse) {
        const pc = camp.playerCharacters?.find(p => p.id === pcId);
        if (pc && pc.ddbId) {
            ddbIdToUse = pc.ddbId;
        }
    }

    if (!ddbIdToUse) {
        notify("No D&D Beyond ID or URL found for this hero. Enter one and try again.", "error");
        return;
    }

    const match = ddbIdToUse.match(/\/characters?\/(\d+)/i) || ddbIdToUse.match(/^(\d+)$/);
    if (!match) {
        notify("Invalid D&D Beyond ID or URL format.", "error");
        return;
    }
    const characterId = match[1];

    notify("Syncing with D&D Beyond...", "info");

    try {
        const cacheBust = new Date().getTime();
        const apiUrl = `https://character-service.dndbeyond.com/character/v5/character/${characterId}?cb=${cacheBust}`;
        
        // Execute the new Proxy Cascade!
        const ddbData = await fetchWithProxyCascade(apiUrl);

        if (!ddbData || !ddbData.success || !ddbData.data) {
            throw new Error("D&D Beyond returned an unexpected data structure.");
        }

        const parsedData = parseDDBCharacter(ddbData.data);
        parsedData.ddbId = characterId;

        if (isEditView) {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
            
            setVal('pc-edit-name', parsedData.name);
            setVal('pc-edit-race', parsedData.race);
            setVal('pc-edit-class', parsedData.classLevel);
            setVal('pc-edit-background', parsedData.background);
            setVal('pc-edit-alignment', parsedData.alignment);
            setVal('pc-edit-faith', parsedData.faith);
            setVal('pc-edit-gender', parsedData.gender);
            setVal('pc-edit-age', parsedData.age);
            setVal('pc-edit-size', parsedData.size);
            setVal('pc-edit-height', parsedData.height);
            setVal('pc-edit-weight', parsedData.weight);
            setVal('pc-edit-eyes', parsedData.eyes);
            setVal('pc-edit-hair', parsedData.hair);
            setVal('pc-edit-skin', parsedData.skin);
            
            setVal('pc-edit-str', parsedData.str);
            setVal('pc-edit-dex', parsedData.dex);
            setVal('pc-edit-con', parsedData.con);
            setVal('pc-edit-int', parsedData.int);
            setVal('pc-edit-wis', parsedData.wis);
            setVal('pc-edit-cha', parsedData.cha);
            
            setVal('pc-edit-saves', parsedData.saves);
            setVal('pc-edit-skills', parsedData.skills);
            setVal('pc-edit-proficiencies', parsedData.proficiencies);
            setVal('pc-edit-wealth', parsedData.wealth);
            
            setVal('input-pc-edit-traits', parsedData.traits);
            setVal('input-pc-edit-ideals', parsedData.ideals);
            setVal('input-pc-edit-bonds', parsedData.bonds);
            setVal('input-pc-edit-flaws', parsedData.flaws);
            setVal('input-pc-edit-appearance', parsedData.appearance);
            setVal('input-pc-edit-backstory', parsedData.backstory);
            setVal('input-pc-edit-organizations', parsedData.organizations);
            setVal('input-pc-edit-allies', parsedData.allies);
            setVal('input-pc-edit-enemies', parsedData.enemies);
            setVal('input-pc-edit-equipped', parsedData.equipped);
            setVal('input-pc-edit-backpack', parsedData.backpack);
            
            notify("Fields populated! Click 'Inscribe' when ready to save.", "success");
            
            const zenDivs = ['traits', 'ideals', 'bonds', 'flaws', 'appearance', 'backstory', 'organizations', 'allies', 'enemies', 'equipped', 'backpack'];
            zenDivs.forEach(z => {
                const viewDiv = document.getElementById(`view-input-pc-edit-${z}`);
                if (viewDiv) viewDiv.innerHTML = parsedData[z] ? window.appActions.parseSmartText(parsedData[z]) : '<span class="text-stone-400 italic">No entry provided...</span>';
            });
        } 
        else {
            const pc = camp.playerCharacters?.find(p => p.id === pcId);
            if (!pc) return;

            const mergedPC = {
                ...pc,
                ...parsedData,
                image: pc.image || '', 
                appearance: parsedData.appearance || pc.appearance || '',
                backstory: parsedData.backstory || pc.backstory || '',
            };

            const updatedPCs = camp.playerCharacters.map(p => p.id === pcId ? mergedPC : p);
            
            let updatedCamp = { ...camp, playerCharacters: updatedPCs };
            updatedCamp = logPlayerActivity(updatedCamp, window.appData.currentUserUid, `synced <span class="font-bold text-amber-700">${mergedPC.name}</span> with D&D Beyond.`, 'fa-cloud-arrow-down');

            await saveCampaign(updatedCamp);
            notify(`${mergedPC.name} synced perfectly.`, "success");
            reRender(true);
        }

    } catch (e) {
        console.error(e);
        notify("Failed to sync: " + e.message, "error");
    }
};
