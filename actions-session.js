import { generateId, calculateLootValue, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { BUDGET_BY_LEVEL, updateBudgetUI, updateSessionTabUI } from './ui-core.js';
import { generateSessionMarkdown } from './markdown.js';

// --- Session Editing ---
export const openSessionEdit = (sessionId = null) => {
    window.appData.activeSessionId = sessionId;
    window.appActions.setView('session-edit');
};

export const switchSessionTab = (tabId) => {
    updateSessionTabUI(tabId);
    if (tabId === 'preview') {
        window.appActions.updateSessionPreview();
    }
};

export const updateSessionBudget = () => {
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
};

export const _readDynamicList = (containerId, mapper) => {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.children).map(mapper).filter(x => x !== null);
};

// Strict Calendar Math Helpers reused here for accurate duration calculations
const getDaysInYear = (cal) => cal.months.reduce((sum, m) => sum + parseInt(m.days || 0, 10), 0);

const getDayOfYear = (cal, mIdx, day) => {
    let doy = 0;
    for(let i = 0; i < mIdx; i++) doy += parseInt(cal.months[i].days || 0, 10);
    return doy + parseInt(day, 10);
};

const getDateFromDayOfYear = (cal, doy) => {
    let currentDoy = 0;
    for (let i = 0; i < cal.months.length; i++) {
        const mDays = parseInt(cal.months[i].days || 0, 10);
        if (currentDoy + mDays >= doy) {
            return { monthIndex: i, day: doy - currentDoy };
        }
        currentDoy += mDays;
    }
    return { monthIndex: Math.max(0, cal.months.length - 1), day: parseInt(cal.months[cal.months.length - 1]?.days || 1, 10) };
};

export const syncSessionDates = (trigger) => {
    const camp = window.appData?.activeCampaign;
    if (!camp || !camp.calendar) return;

    const cal = camp.calendar;

    const startYEl = document.getElementById('draft-ingame-y');
    const startMEl = document.getElementById('draft-ingame-m');
    const startDEl = document.getElementById('draft-ingame-d');

    const endYEl = document.getElementById('draft-ingame-end-y');
    const endMEl = document.getElementById('draft-ingame-end-m');
    const endDEl = document.getElementById('draft-ingame-end-d');

    const durationEl = document.getElementById('draft-ingame-dur');

    if (!startYEl || !startMEl || !startDEl || !endYEl || !endMEl || !endDEl || !durationEl) return;

    let sY = parseInt(startYEl.value, 10); if (isNaN(sY)) sY = 0;
    let sM = parseInt(startMEl.value, 10); if (isNaN(sM)) sM = 0;
    let sD = parseInt(startDEl.value, 10); if (isNaN(sD)) sD = 1;

    let eY = parseInt(endYEl.value, 10); if (isNaN(eY)) eY = sY;
    let eM = parseInt(endMEl.value, 10); if (isNaN(eM)) eM = sM;
    let eD = parseInt(endDEl.value, 10); if (isNaN(eD)) eD = sD;

    let duration = parseInt(durationEl.value, 10); if (isNaN(duration)) duration = 1;
    const totalDays = getDaysInYear(cal);

    if (trigger === 'duration' || trigger === 'startdate') {
        if (duration < 1) {
            duration = 1;
            durationEl.value = 1;
        }

        const startDoy = getDayOfYear(cal, sM, sD);
        const endDoy = startDoy + duration - 1;

        eY = sY + Math.floor((endDoy - 1) / totalDays);
        let remDoy = ((endDoy - 1) % totalDays) + 1;
        let endMD = getDateFromDayOfYear(cal, remDoy);

        eM = endMD.monthIndex;
        eD = endMD.day;

        endYEl.value = eY;
        if (endMEl.value != eM) {
            endMEl.value = eM;
            if (window.updateDayOptions) window.updateDayOptions(eM, 'draft-ingame-end-d');
        }
        endDEl.value = eD;
        
    } else if (trigger === 'enddate') {
        const startDoy = getDayOfYear(cal, sM, sD);
        const endDoy = getDayOfYear(cal, eM, eD);

        let calcDuration = (eY - sY) * totalDays + endDoy - startDoy + 1;

        if (calcDuration < 1) {
            calcDuration = 1;
        }

        durationEl.value = calcDuration;
    }
};

export const _gatherSessionDraft = () => {
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
        
        // Grab the numeric inspiration value
        const inspEl = document.getElementById(`pc-insp-${pc.id}`);
        if (inspEl) pc.inspiration = parseInt(inspEl.value, 10) || 0;
        
        const autoEl = document.getElementById(`pc-auto-${pc.id}`);
        if (autoEl) pc.automaticSuccess = autoEl.checked;
    });

    // Helper to grab visibility from the DOM rows
    const grabVisibility = (row) => {
        const mode = row.querySelector('.vis-mode-input')?.value || 'public';
        const playersStr = row.querySelector('.vis-players-input')?.value || '';
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

    // Parse Dates
    const realDateInput = document.getElementById('draft-real-date')?.value;
    let timestamp = session?.timestamp || Date.now();
    let displayDateObj = new Date();
    
    if (realDateInput) {
        // Appending T12:00:00 ensures timezone shifts don't accidentally bump the date back a day
        const parsedDate = new Date(realDateInput + 'T12:00:00');
        if (!isNaN(parsedDate.getTime())) {
            timestamp = parsedDate.getTime();
            displayDateObj = parsedDate;
        }
    }
    
    // Process new strict In-Game Date dropdowns + Duration
    let inGameDateObj = null;
    const igY = parseInt(document.getElementById('draft-ingame-y')?.value, 10);
    const igM = parseInt(document.getElementById('draft-ingame-m')?.value, 10);
    const igD = parseInt(document.getElementById('draft-ingame-d')?.value, 10);
    
    const igEndY = parseInt(document.getElementById('draft-ingame-end-y')?.value, 10);
    const igEndM = parseInt(document.getElementById('draft-ingame-end-m')?.value, 10);
    const igEndD = parseInt(document.getElementById('draft-ingame-end-d')?.value, 10);
    
    const igDur = parseInt(document.getElementById('draft-ingame-dur')?.value, 10) || 1;

    if (!isNaN(igY) && !isNaN(igM) && !isNaN(igD)) {
        inGameDateObj = { 
            year: igY, 
            month: igM, 
            day: igD,
            endYear: !isNaN(igEndY) ? igEndY : igY,
            endMonth: !isNaN(igEndM) ? igEndM : igM,
            endDay: !isNaN(igEndD) ? igEndD : igD,
            duration: igDur
        };
    }

    return {
        sessionData: {
            id: session?.id || generateId(),
            name: document.getElementById('draft-name')?.value || `Log from ${displayDateObj.toLocaleDateString()}`,
            timestamp: timestamp,
            inGameDate: inGameDateObj, // Pushes the strict date object to the database
            image: document.getElementById('draft-image')?.value.trim() || '',
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
            
            chronicle: session?.chronicle || [], // Preserves the collaborative log feed!
            
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
};

export const updateSessionPreview = () => {
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
};

// --- AUTOMATED CALENDAR SYNC ENGINE ---

// Syncs the individual Session note onto the calendar (Deep Indigo marker)
const _syncIndividualSessionCalendarNote = (camp, sessionData) => {
    if (!camp.calendar) return;
    if (!camp.calendar.notes) camp.calendar.notes = {};

    // 1. Purge the old version of this specific session note from everywhere on the calendar
    Object.keys(camp.calendar.notes).forEach(key => {
        if (Array.isArray(camp.calendar.notes[key])) {
            camp.calendar.notes[key] = camp.calendar.notes[key].filter(n => n.id !== sessionData.id);
            if (camp.calendar.notes[key].length === 0) delete camp.calendar.notes[key];
        }
    });

    // 2. If the session has a valid strict date, generate its Calendar Note!
    if (sessionData.inGameDate && typeof sessionData.inGameDate === 'object') {
        const { year, month, day, duration } = sessionData.inGameDate;
        
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            
            let noteText = `**${sessionData.name}**`;
            if (sessionData.notes && sessionData.notes.trim() !== '') {
                noteText += `\n\n${sessionData.notes.trim()}`;
            }

            const newNote = {
                id: sessionData.id, // Tie the note ID strictly to the Session ID for easy updating/purging
                text: noteText,
                authorId: camp.dmId,
                visibility: { mode: 'public', visibleTo: [] },
                timestamp: sessionData.timestamp, 
                duration: duration || 1,
                repeatsYearly: false,
                category: 'Session' // Uses the new Indigo UI color!
            };

            const dateKey = `${year}-${month}-${day}`;
            if (!camp.calendar.notes[dateKey]) camp.calendar.notes[dateKey] = [];
            camp.calendar.notes[dateKey].push(newNote);
        }
    }
};

// Syncs the overarching Adventure Arc banner onto the calendar
const _syncAdventureCalendarNote = (camp, advId, sessions) => {
    if (!camp.calendar) return;
    if (!camp.calendar.notes) camp.calendar.notes = {};

    // 1. Purge the old version of this adventure's note from everywhere on the calendar
    Object.keys(camp.calendar.notes).forEach(key => {
        if (Array.isArray(camp.calendar.notes[key])) {
            camp.calendar.notes[key] = camp.calendar.notes[key].filter(n => n.id !== advId);
            if (camp.calendar.notes[key].length === 0) delete camp.calendar.notes[key];
        }
    });

    // 2. Gather and sort all strict dates from the adventure's sessions
    const validDates = [];
    const cal = camp.calendar;
    
    const getAbsoluteDay = (c, y, m, d) => (y * getDaysInYear(c)) + getDayOfYear(c, m, d);

    sessions.forEach(s => {
        if (s.inGameDate && typeof s.inGameDate === 'object') {
            const { year, month, day, endYear, endMonth, endDay } = s.inGameDate;
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                
                validDates.push({
                    year, month, day,
                    abs: getAbsoluteDay(cal, year, month, day)
                });
                
                // If a session has a duration, make sure we count its END date as part of the overall arc bounds!
                if (endYear !== undefined && endMonth !== undefined && endDay !== undefined) {
                    validDates.push({
                        year: endYear, month: endMonth, day: endDay,
                        abs: getAbsoluteDay(cal, endYear, endMonth, endDay)
                    });
                }
            }
        }
    });

    // 3. Rebuild the master note if valid dates exist!
    if (validDates.length > 0) {
        validDates.sort((a, b) => a.abs - b.abs);
        const start = validDates[0];
        const end = validDates[validDates.length - 1];
        const duration = end.abs - start.abs + 1;

        const adv = camp.adventures.find(a => a.id === advId);
        const advName = adv ? adv.name : "Adventure";

        const newNote = {
            id: advId, // Tie the note ID strictly to the Adventure ID for easy updating
            text: `**${advName}**\n\n*Auto-generated chronicle of the party's timeline during this arc.*`,
            authorId: camp.dmId,
            visibility: { mode: 'public', visibleTo: [] },
            timestamp: 10, // A tiny artificial timestamp forces this "Arc Banner" to float to the very top of the day's grid
            duration: duration,
            repeatsYearly: false,
            category: 'Adventure'
        };

        const dateKey = `${start.year}-${start.month}-${start.day}`;
        if (!camp.calendar.notes[dateKey]) camp.calendar.notes[dateKey] = [];
        camp.calendar.notes[dateKey].push(newNote);
    }
};

export const saveSession = async () => {
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

    // Auto-generate the individual session note on the calendar!
    _syncIndividualSessionCalendarNote(camp, draft.sessionData);

    const newAdventures = camp.adventures.map(a => {
        if (a.id !== adv.id) return a;

        const isNewSession = !a.sessions.some(s => s.id === draft.sessionData.id);
        const newSessions = isNewSession 
            ? [...(a.sessions || []), draft.sessionData]
            : a.sessions.map(s => s.id === draft.sessionData.id ? draft.sessionData : s);

        // Auto-generate the spanned calendar note for this overall adventure!
        _syncAdventureCalendarNote(camp, a.id, newSessions);

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
};

export const deleteSession = async (sessionId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const adv = window.appData.activeAdventure;
    if (!camp || !adv || !camp._isDM) {
        notify("Only the DM can delete session logs.", "error");
        return;
    }

    if (!confirm("Are you sure you want to delete this session log?")) return;

    // Purge the individual session note from the calendar
    if (camp.calendar && camp.calendar.notes) {
        Object.keys(camp.calendar.notes).forEach(key => {
            if (Array.isArray(camp.calendar.notes[key])) {
                camp.calendar.notes[key] = camp.calendar.notes[key].filter(n => n.id !== sessionId);
                if (camp.calendar.notes[key].length === 0) delete camp.calendar.notes[key];
            }
        });
    }

    const newAdventures = camp.adventures.map(a => {
        if (a.id !== adv.id) return a;
        
        const newSessions = a.sessions.filter(s => s.id !== sessionId);
        
        // Auto-update the overarching calendar note for this adventure since the dates might have shifted!
        _syncAdventureCalendarNote(camp, a.id, newSessions);

        return {
            ...a,
            sessions: newSessions,
            totalLootGP: newSessions.reduce((acc, s) => acc + s.lootValue, 0)
        };
    });

    const updatedCamp = { ...camp, adventures: newAdventures };
    await saveCampaign(updatedCamp);
    notify("Session log destroyed.", "success");
};

// --- Collaborative Chronicle ---

export const editChronicleEntry = (entryId) => {
    const rawInput = document.getElementById(`raw-chronicle-${entryId}`);
    const editor = document.getElementById('new-chronicle-input');
    const idTracker = document.getElementById('edit-chronicle-id');

    if (!rawInput || !editor || !idTracker) return;

    // Load the text (unescape quotes and newlines)
    editor.value = rawInput.value.replace(/&#10;/g, '\n').replace(/&quot;/g, '"');
    idTracker.value = entryId;

    // Update UI
    document.getElementById('edit-chronicle-label')?.classList.remove('hidden');
    document.getElementById('cancel-chronicle-edit')?.classList.remove('hidden');
    
    const submitText = document.getElementById('submit-chronicle-text');
    const submitIcon = document.getElementById('submit-chronicle-icon');
    if (submitText) submitText.innerText = 'Save Changes';
    if (submitIcon) submitIcon.className = 'fa-solid fa-floppy-disk mr-2';

    // Focus and scroll
    editor.focus();
    document.getElementById('chronicle-input-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

export const cancelChronicleEdit = () => {
    const editor = document.getElementById('new-chronicle-input');
    const idTracker = document.getElementById('edit-chronicle-id');
    
    if (editor) editor.value = '';
    if (idTracker) idTracker.value = '';

    document.getElementById('edit-chronicle-label')?.classList.add('hidden');
    document.getElementById('cancel-chronicle-edit')?.classList.add('hidden');
    
    const submitText = document.getElementById('submit-chronicle-text');
    const submitIcon = document.getElementById('submit-chronicle-icon');
    if (submitText) submitText.innerText = 'Submit Entry';
    if (submitIcon) submitIcon.className = 'fa-solid fa-paper-plane mr-2';
};

export const addChronicleEntry = async () => {
    const input = document.getElementById('new-chronicle-input');
    const editIdInput = document.getElementById('edit-chronicle-id');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const adv = window.appData.activeAdventure;
    const session = window.appData.activeSession;
    const myUid = window.appData.currentUserUid;
    
    if (!camp || !adv || !myUid) return;

    if (!session) {
        notify("You must save the new session first before adding collaborative chronicle entries.", "error");
        return;
    }

    const editId = editIdInput ? editIdInput.value : '';

    const updatedAdventures = camp.adventures.map(a => {
        if (a.id !== adv.id) return a;
        const updatedSessions = a.sessions.map(s => {
            if (s.id !== session.id) return s;
            
            let newChronicle = s.chronicle ? [...s.chronicle] : [];
            
            if (editId) {
                // UPDATE EXISTING ENTRY
                const targetIdx = newChronicle.findIndex(e => e.id === editId);
                if (targetIdx > -1) {
                    newChronicle[targetIdx].text = text;
                }
            } else {
                // ADD NEW ENTRY
                newChronicle.push({
                    id: generateId(),
                    text: text,
                    authorId: myUid,
                    timestamp: Date.now()
                });
            }

            return { ...s, chronicle: newChronicle };
        });
        return { ...a, sessions: updatedSessions };
    });

    const updatedCamp = { ...camp, adventures: updatedAdventures };
    
    // Clean up input fields and UI state
    input.value = '';
    window.appActions.cancelChronicleEdit();
    
    await saveCampaign(updatedCamp);
    
    // Force a local re-render so the new/edited message pops up instantly for the author
    reRender();
};

export const deleteChronicleEntry = async (entryId) => {
    if (!confirm("Are you sure you want to permanently erase this entry from the chronicle?")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const adv = window.appData.activeAdventure;
    const session = window.appData.activeSession;
    
    if (!camp || !adv || !session) return;

    const updatedAdventures = camp.adventures.map(a => {
        if (a.id !== adv.id) return a;
        const updatedSessions = a.sessions.map(s => {
            if (s.id !== session.id) return s;
            return {
                ...s,
                chronicle: (s.chronicle || []).filter(e => e.id !== entryId)
            };
        });
        return { ...a, sessions: updatedSessions };
    });

    const updatedCamp = { ...camp, adventures: updatedAdventures };
    
    await saveCampaign(updatedCamp);
    
    // If they delete an entry they were currently editing, clear the edit state!
    const editIdInput = document.getElementById('edit-chronicle-id');
    if (editIdInput && editIdInput.value === entryId) {
        window.appActions.cancelChronicleEdit();
    } else {
        reRender();
    }
};


// --- Dynamic DOM Log Builders ---

export const addLogScene = () => {
    const container = document.getElementById('container-scenes');
    if(!container) return;
    const idx = container.children.length;
    const inputId = `scene-input-${idx}`;
    
    const html = `
        <div class="mb-4 scene-row vis-container bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm flex flex-col group cursor-text" onclick="window.appActions.openUniversalEditor('${inputId}', 'Scene ${idx + 1}')">
            <div class="flex justify-between items-center bg-[#f4ebd8] px-3 py-1.5 border-b border-[#d4c5a9] rounded-t-sm">
                <span class="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Scene ${idx + 1}</span>
                <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                    <button class="text-red-700 hover:text-red-600 font-bold px-2 py-1 text-[10px] uppercase tracking-widest transition flex items-center" onclick="event.stopPropagation(); window.appActions.openVisibilityMenu(this, 'dom')">
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
};

export const addLogClue = () => {
    const container = document.getElementById('container-clues');
    if(!container) return;
    const html = `
        <div class="mb-2 flex gap-2 items-center clue-row vis-container bg-[#fdfbf7] border border-[#d4c5a9] p-1.5 rounded-sm shadow-sm group">
            <i class="fa-solid fa-magnifying-glass text-stone-400 ml-1"></i>
            <input type="hidden" class="vis-mode-input" value="hidden">
            <input type="hidden" class="vis-players-input" value="">
            
            <input type="text" class="clue-input flex-1 bg-transparent border-none text-stone-900 px-1 text-xs sm:text-sm outline-none placeholder:italic placeholder:text-stone-400" placeholder="Quest update, clue, or objective...">
            
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="text-red-700 hover:text-red-600 font-bold px-2 py-1 text-[10px] uppercase tracking-widest transition flex items-center" onclick="window.appActions.openVisibilityMenu(this, 'dom')">
                    <i class="fa-solid fa-eye-slash"></i>
                </button>
                <button class="text-stone-400 hover:text-red-700 font-bold px-2 transition" onclick="this.closest('.clue-row').remove()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
};

// --- VISIBILITY (FOG OF WAR) ACTIONS ---

// Internal state pointer so the Save function knows what element we are currently editing
export let _activeVisBtn = null;

export const openVisibilityMenu = (btnElement, type = 'dom', explicitId = null) => {
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
    // Mode C: Global Checklist Tasks
    else if (type === 'checklist') {
        const entry = (camp.sheetUpdates || []).find(u => u.id === explicitId);
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
};

export const toggleVisSpecificList = () => {
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
};

export const saveVisibility = async () => {
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
    // MODE C: Database Update (For Global Checklist Tasks)
    else if (targetType === 'checklist') {
        const explicitId = document.getElementById('vis-target-idx').value;
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        if (!camp) return;

        const newUpdatesArray = (camp.sheetUpdates || []).map(u => {
            if (u.id === explicitId) {
                return {
                    ...u,
                    visibility: { mode: finalMode, visibleTo: selectedPlayers }
                };
            }
            return u;
        });

        await window.appActions._saveCampaignHelper({ ...camp, sheetUpdates: newUpdatesArray });
    }

    // Clean up
    document.getElementById('vis-target-type').value = '';
    document.getElementById('vis-target-idx').value = '';
    modal.classList.add('hidden');
};

// A tiny helper to avoid importing saveCampaign here while retaining closure scope
export const _saveCampaignHelper = async (campData) => {
    const { saveCampaign } = await import('./firebase-manager.js');
    await saveCampaign(campData);
};

// --- UNIVERSAL EDITOR ACTIONS ---

export const openUniversalEditor = (targetInputId, title) => {
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
};

export const closeUniversalEditor = () => {
    const modal = document.getElementById('universal-editor-modal');
    if (modal) modal.classList.add('hidden');
    document.getElementById('autocomplete-suggestions').style.display = 'none';
};

export const saveUniversalEditor = () => {
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
};

export const formatText = (textareaId, formatType) => {
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
};
