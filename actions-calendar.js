import { generateId, updateDerivedState, reRender, DEFAULT_CALENDAR } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';

// --- Calendar Navigation & Initialization ---
export const openCalendar = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    // Initialize calendar if it doesn't exist yet
    if (!camp.calendar) {
        camp.calendar = JSON.parse(JSON.stringify(DEFAULT_CALENDAR));
        camp.calendar.currentMonth = 0;
        camp.calendar.currentDay = 1;
        await saveCampaign(camp);
    }

    // Set the view to the current campaign date if not already looking at a specific date
    if (window.appData.calendarViewYear === undefined) {
        window.appData.calendarViewYear = camp.calendar.currentYear || 1492;
        window.appData.calendarViewMonth = camp.calendar.currentMonth || 0;
    }

    window.appActions.setView('calendar');
};

export const navCalendarMonth = (direction) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp.calendar) return;

    let viewYear = window.appData.calendarViewYear;
    let viewMonth = window.appData.calendarViewMonth;

    viewMonth += direction;
    
    if (viewMonth >= camp.calendar.months.length) {
        viewMonth = 0;
        viewYear++;
    } else if (viewMonth < 0) {
        viewMonth = camp.calendar.months.length - 1;
        viewYear--;
    }

    window.appData.calendarViewYear = viewYear;
    window.appData.calendarViewMonth = viewMonth;
    reRender();
};

export const jumpToCurrentDate = () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp.calendar) return;

    window.appData.calendarViewYear = camp.calendar.currentYear || 1492;
    window.appData.calendarViewMonth = camp.calendar.currentMonth || 0;
    reRender();
};

export const jumpToSpecificDate = () => {
    const yearInput = document.getElementById('jump-year');
    const monthSelect = document.getElementById('jump-month');
    const daySelect = document.getElementById('jump-day');

    if (yearInput && monthSelect) {
        window.appData.calendarViewYear = parseInt(yearInput.value) || 1492;
        window.appData.calendarViewMonth = parseInt(monthSelect.value) || 0;
    }

    // If they selected a specific day, open that day's modal directly
    if (daySelect && daySelect.value) {
        const day = parseInt(daySelect.value);
        window.appActions.openCalendarDay(window.appData.calendarViewYear, window.appData.calendarViewMonth, day);
    } else {
        reRender();
    }
};

// --- Global Calendar Lore Inspector ---
export const openCalendarLore = () => {
    updateDerivedState();
    window.appData.showCalendarLore = true;
    reRender();
};

export const closeCalendarLore = () => {
    window.appData.showCalendarLore = false;
    reRender();
};

// --- Month Info Inspector ---
export const openMonthInfo = (monthIndex) => {
    window.appData.viewMonthInfoIdx = monthIndex;
    reRender();
};

export const closeMonthInfo = () => {
    window.appData.viewMonthInfoIdx = null;
    reRender();
};

// --- Day Actions ---
export const openCalendarDay = (year, monthIndex, day) => {
    window.appData.activeCalendarDate = { year, monthIndex, day };
    reRender();
};

export const closeCalendarDay = () => {
    window.appData.activeCalendarDate = null;
    reRender();
};

export const setCurrentCampaignDate = async (year, monthIndex, day) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM || !camp.calendar) return;

    camp.calendar.currentYear = year;
    camp.calendar.currentMonth = monthIndex;
    camp.calendar.currentDay = day;

    await saveCampaign(camp);
    notify("Campaign date updated.", "success");
    reRender(); // Refresh to show the new "Current Date" styling on the grid
};

// --- Calendar Math Helpers ---
const getDaysInYear = (cal) => cal.months.reduce((sum, m) => sum + (m.days || 0), 0);

const getDayOfYear = (cal, mIdx, day) => {
    let doy = 0;
    for(let i = 0; i < mIdx; i++) doy += (cal.months[i].days || 0);
    return doy + day;
};

const getDateFromDayOfYear = (cal, doy) => {
    let currentDoy = 0;
    for (let i = 0; i < cal.months.length; i++) {
        const mDays = cal.months[i].days || 0;
        if (currentDoy + mDays >= doy) {
            return { monthIndex: i, day: doy - currentDoy };
        }
        currentDoy += mDays;
    }
    return { monthIndex: Math.max(0, cal.months.length - 1), day: cal.months[cal.months.length - 1]?.days || 1 };
};

export const syncCalendarNoteDates = (trigger) => {
    const camp = window.appData?.activeCampaign;
    if (!camp || !camp.calendar) return;

    const cal = camp.calendar;

    const startYEl = document.getElementById('cal-note-start-y');
    const startMEl = document.getElementById('cal-note-start-m');
    const startDEl = document.getElementById('cal-note-start-d');

    const endYEl = document.getElementById('cal-note-end-y');
    const endMEl = document.getElementById('cal-note-end-m');
    const endDEl = document.getElementById('cal-note-end-d');

    const durationEl = document.getElementById('cal-note-duration');

    if (!startYEl || !startMEl || !startDEl || !endYEl || !endMEl || !endDEl || !durationEl) return;

    const sY = parseInt(startYEl.value) || 0;
    const sM = parseInt(startMEl.value) || 0;
    const sD = parseInt(startDEl.value) || 1;

    let eY = parseInt(endYEl.value) || sY;
    let eM = parseInt(endMEl.value) || sM;
    let eD = parseInt(endDEl.value) || sD;

    let duration = parseInt(durationEl.value) || 1;
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
            if (window.updateDayOptions) window.updateDayOptions(eM, 'cal-note-end-d');
        }
        endDEl.value = eD;
        
    } else if (trigger === 'enddate') {
        const startDoy = getDayOfYear(cal, sM, sD);
        const endDoy = getDayOfYear(cal, eM, eD);

        let calcDuration = (eY - sY) * totalDays + endDoy - startDoy + 1;

        if (calcDuration < 1) {
            // Prevent users from setting an end date that occurs before the start date
            eY = sY;
            eM = sM;
            eD = sD;
            calcDuration = 1;

            endYEl.value = eY;
            if (endMEl.value != eM) {
                endMEl.value = eM;
                if (window.updateDayOptions) window.updateDayOptions(eM, 'cal-note-end-d');
            }
            endDEl.value = eD;
        }

        durationEl.value = calcDuration;
    }
};

// --- Notes ---
export const saveCalendarNote = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp || !camp.calendar) return;

    const date = window.appData.activeCalendarDate;
    if (!date) return;

    const container = document.getElementById('cal-note-editor');
    const textInput = document.getElementById('cal-note-text');
    const noteIdInput = document.getElementById('cal-note-id');
    const origYInput = document.getElementById('cal-note-orig-y');
    const origMInput = document.getElementById('cal-note-orig-m');
    const origDInput = document.getElementById('cal-note-orig-d');
    
    const startYInput = document.getElementById('cal-note-start-y');
    const startMInput = document.getElementById('cal-note-start-m');
    const startDInput = document.getElementById('cal-note-start-d');
    
    const endYInput = document.getElementById('cal-note-end-y');
    const endMInput = document.getElementById('cal-note-end-m');
    const endDInput = document.getElementById('cal-note-end-d');
    
    const repeatsInput = document.getElementById('cal-note-repeats');
    
    // Grab visibility from the hidden DOM inputs controlled by the global Fog of War menu
    const modeInput = container?.querySelector('.vis-mode-input');
    const playersInput = container?.querySelector('.vis-players-input');

    if (!textInput || textInput.value.trim() === '') return;

    let startY = startYInput ? parseInt(startYInput.value) || date.year : date.year;
    let startM = startMInput ? parseInt(startMInput.value) || date.monthIndex : date.monthIndex;
    let startD = startDInput ? parseInt(startDInput.value) || date.day : date.day;

    let endY = endYInput ? parseInt(endYInput.value) || startY : startY;
    let endM = endMInput ? parseInt(endMInput.value) || startM : startM;
    let endD = endDInput ? parseInt(endDInput.value) || startD : startD;

    // Safety fallback for end date logic in case user enters it backwards
    if (endY < startY || (endY === startY && endM < startM) || (endY === startY && endM === startM && endD < startD)) {
        endY = startY; endM = startM; endD = startD;
    }

    // Calculate absolute duration based on calendar days
    const totalDays = getDaysInYear(camp.calendar);
    const startDoy = getDayOfYear(camp.calendar, startM, startD);
    const endDoy = getDayOfYear(camp.calendar, endM, endD);
    let duration = (endY - startY) * totalDays + endDoy - startDoy + 1;
    if (duration < 1) duration = 1;

    const noteId = noteIdInput?.value || generateId();
    
    if (!camp.calendar.notes) camp.calendar.notes = {};

    // Remove the note from its original anchor date if the user moved its start date
    if (origYInput && origYInput.value !== '') {
        const oY = parseInt(origYInput.value);
        const oM = parseInt(origMInput.value);
        const oD = parseInt(origDInput.value);
        const oldKey = `${oY}-${oM}-${oD}`;
        const newKey = `${startY}-${startM}-${startD}`;
        
        if (oldKey !== newKey && camp.calendar.notes[oldKey]) {
            let filteredNotes = [];
            if (Array.isArray(camp.calendar.notes[oldKey])) {
                filteredNotes = camp.calendar.notes[oldKey].filter(n => n.id !== noteId);
            }
            if (filteredNotes.length === 0) {
                delete camp.calendar.notes[oldKey];
            } else {
                camp.calendar.notes[oldKey] = filteredNotes;
            }
        }
    }

    const dateKey = `${startY}-${startM}-${startD}`;
    const text = textInput.value.trim();

    // Backward compatibility: Convert legacy single-note object to an array
    let dayNotes = camp.calendar.notes[dateKey];
    if (dayNotes && !Array.isArray(dayNotes)) {
        dayNotes = [{ id: generateId(), text: dayNotes.text, visibility: dayNotes.visibility, authorId: camp.dmId }];
    }
    if (!dayNotes) dayNotes = [];

    const existingNoteIndex = dayNotes.findIndex(n => n.id === noteId);

    const newNote = {
        id: noteId,
        text: text,
        authorId: myUid,
        visibility: {
            mode: modeInput ? modeInput.value : 'public',
            visibleTo: playersInput && playersInput.value ? playersInput.value.split(',') : []
        },
        timestamp: Date.now(),
        duration: duration,
        repeatsYearly: repeatsInput ? repeatsInput.checked : false
    };

    if (existingNoteIndex >= 0) {
        // Preserve original author if just editing
        newNote.authorId = dayNotes[existingNoteIndex].authorId || myUid;
        dayNotes[existingNoteIndex] = newNote;
    } else {
        dayNotes.push(newNote);
    }

    camp.calendar.notes[dateKey] = dayNotes;

    // Clear the editor inputs to allow adding another note immediately
    if (textInput) textInput.value = '';
    if (noteIdInput) noteIdInput.value = '';
    if (origYInput) origYInput.value = '';
    if (origMInput) origMInput.value = '';
    if (origDInput) origDInput.value = '';
    if (startYInput) startYInput.value = date.year;
    if (startMInput) startMInput.value = date.monthIndex;
    if (startDInput) startDInput.value = date.day;
    if (endYInput) endYInput.value = date.year;
    if (endMInput) endMInput.value = date.monthIndex;
    if (endDInput) endDInput.value = date.day;
    if (repeatsInput) repeatsInput.checked = false;
    
    await saveCampaign(camp);
    notify("Chronicle inscribed.", "success");
    reRender(); // Re-render to show the newly added note in the modal list
};

export const editCalendarNote = (noteId, anchorYear, anchorMonth, anchorDay) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const date = window.appData.activeCalendarDate; // The day currently being viewed
    if (!camp || !date) return;

    // Load from the anchor date (where the note actually lives), fallback to active date for legacy
    let targetY = anchorYear !== undefined ? anchorYear : date.year;
    let targetM = anchorMonth !== undefined ? anchorMonth : date.monthIndex;
    let targetD = anchorDay !== undefined ? anchorDay : date.day;

    const dateKey = `${targetY}-${targetM}-${targetD}`;
    const dayNotes = camp.calendar.notes[dateKey] || [];
    
    // Backward compatibility
    let targetNote = null;
    if (!Array.isArray(dayNotes)) {
        targetNote = { id: noteId, text: dayNotes.text, visibility: dayNotes.visibility };
    } else {
        targetNote = dayNotes.find(n => n.id === noteId);
    }

    if (!targetNote) return;

    const container = document.getElementById('cal-note-editor');
    const textInput = document.getElementById('cal-note-text');
    const noteIdInput = document.getElementById('cal-note-id');
    const origYInput = document.getElementById('cal-note-orig-y');
    const origMInput = document.getElementById('cal-note-orig-m');
    const origDInput = document.getElementById('cal-note-orig-d');
    
    const startYInput = document.getElementById('cal-note-start-y');
    const startMInput = document.getElementById('cal-note-start-m');
    const startDInput = document.getElementById('cal-note-start-d');
    
    const endYInput = document.getElementById('cal-note-end-y');
    const endMInput = document.getElementById('cal-note-end-m');
    const endDInput = document.getElementById('cal-note-end-d');
    
    const durationInput = document.getElementById('cal-note-duration');
    const repeatsInput = document.getElementById('cal-note-repeats');
    
    const modeInput = container?.querySelector('.vis-mode-input');
    const playersInput = container?.querySelector('.vis-players-input');

    if (textInput) textInput.value = targetNote.text;
    if (noteIdInput) noteIdInput.value = targetNote.id || 'legacy';
    
    // Track the true anchor so we know where to delete it from if they change the start date
    if (origYInput) origYInput.value = targetY;
    if (origMInput) origMInput.value = targetM;
    if (origDInput) origDInput.value = targetD;
    
    // Populate the Start Date UI
    if (startYInput) startYInput.value = targetY;
    if (startMInput) {
        startMInput.value = targetM;
        // Dynamically recalculate the Day dropdown options for the selected start month!
        if (window.updateDayOptions) window.updateDayOptions(targetM, 'cal-note-start-d');
    }
    if (startDInput) startDInput.value = targetD;

    // Calculate End Date math based on the duration
    const duration = targetNote.duration || 1;
    const totalDays = getDaysInYear(camp.calendar);
    let startDoy = getDayOfYear(camp.calendar, targetM, targetD);
    let endDoy = startDoy + duration - 1;
    
    let endY = targetY + Math.floor((endDoy - 1) / totalDays);
    let remDoy = ((endDoy - 1) % totalDays) + 1;
    let endMD = getDateFromDayOfYear(camp.calendar, remDoy);

    // Populate Duration UI
    if (durationInput) durationInput.value = duration;

    // Populate the End Date UI
    if (endYInput) endYInput.value = endY;
    if (endMInput) {
        endMInput.value = endMD.monthIndex;
        // Dynamically recalculate the Day dropdown options for the selected end month!
        if (window.updateDayOptions) window.updateDayOptions(endMD.monthIndex, 'cal-note-end-d');
    }
    if (endDInput) endDInput.value = endMD.day;

    if (repeatsInput) repeatsInput.checked = targetNote.repeatsYearly || false;

    // Populate Visibility DOM overrides
    if (modeInput) modeInput.value = targetNote.visibility?.mode || 'public';
    if (playersInput) playersInput.value = (targetNote.visibility?.visibleTo || []).join(',');

    // Visually update the visibility button to match the note's state
    const visBtn = container?.querySelector('button');
    if (visBtn) {
        const mode = targetNote.visibility?.mode || 'public';
        let icon = 'fa-eye'; let text = 'Public'; let color = 'text-emerald-600 hover:text-emerald-500';
        if (mode === 'hidden') { icon = 'fa-eye-slash'; text = 'Hidden'; color = 'text-red-700 hover:text-red-600'; }
        else if (mode === 'specific') { icon = 'fa-user-lock'; text = 'Shared'; color = 'text-blue-600 hover:text-blue-500'; }

        visBtn.className = `${color} font-bold px-2 py-1 text-[10px] uppercase tracking-widest transition flex items-center bg-stone-200 border border-[#d4c5a9] rounded-sm shadow-sm`;
        visBtn.innerHTML = `<i class="fa-solid ${icon} mr-1"></i> ${text}`;
    }

    // Scroll down to the editor so the user sees it's ready to edit
    container?.scrollIntoView({ behavior: 'smooth' });
};

export const deleteCalendarNote = async (anchorYear, anchorMonth, anchorDay, noteId) => {
    if (!confirm("Are you sure you want to delete this historical note?")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp.calendar || !camp.calendar.notes) return;

    const dateKey = `${anchorYear}-${anchorMonth}-${anchorDay}`;
    let dayNotes = camp.calendar.notes[dateKey];

    // Backward compatibility & array filtering
    if (dayNotes && !Array.isArray(dayNotes)) {
        delete camp.calendar.notes[dateKey];
    } else if (Array.isArray(dayNotes)) {
        dayNotes = dayNotes.filter(n => n.id !== noteId);
        if (dayNotes.length === 0) {
            delete camp.calendar.notes[dateKey];
        } else {
            camp.calendar.notes[dateKey] = dayNotes;
        }
    }

    await saveCampaign(camp);
    notify("Note erased.", "success");
    reRender();
};

// --- Foundry VTT Exporter Integration ---
export const importFoundryCalendarNotes = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // 1. Flatten all notes gracefully depending on the export format
            let rawNotes = [];
            if (Array.isArray(data)) {
                // Older flat array
                rawNotes = data;
            } else if (data.notes) {
                if (Array.isArray(data.notes)) {
                    // Wrapped array
                    rawNotes = data.notes;
                } else if (typeof data.notes === 'object') {
                    // Foundry V11/12 Journal V2 dictionary format (keyed by calendar ID)
                    Object.values(data.notes).forEach(arr => {
                        if (Array.isArray(arr)) rawNotes.push(...arr);
                    });
                }
            }

            if (rawNotes.length === 0) {
                notify("No notes found in this JSON file.", "error");
                return;
            }

            updateDerivedState();
            const camp = window.appData.activeCampaign;
            if (!camp || !camp._isDM) return;

            let importCount = 0;

            rawNotes.forEach(fn => {
                // 2. Extract Date (Foundry hides this inside flags)
                const scFlags = fn.flags?.["foundryvtt-simple-calendar-reborn"] || fn.flags?.["foundryvtt-simple-calendar"];
                const startDate = scFlags?.noteData?.startDate || fn.date;
                
                if (!startDate) return;

                let y = startDate.year;
                let m = startDate.month;
                let d = startDate.day;

                if (y === undefined || m === undefined || d === undefined) return;

                // Simple Calendar days are 0-indexed internally. 
                // Simple Calendar months perfectly align with our monthIndex handling of intercalary days!
                d += 1;

                // Determine Duration and Repeats from Simple Calendar format
                let duration = 1;
                let repeatsYearly = false;
                
                if (scFlags?.noteData) {
                    if (scFlags.noteData.repeats === 1) repeatsYearly = true; // Simple Calendar uses '1' for Yearly
                    
                    const endDate = scFlags.noteData.endDate;
                    if (endDate && endDate.year !== undefined && endDate.month !== undefined && endDate.day !== undefined) {
                        let ey = endDate.year;
                        let em = endDate.month;
                        let ed = endDate.day + 1; // Convert 0-indexed to 1-indexed
                        
                        const totalDays = getDaysInYear(camp.calendar);
                        const startDoy = getDayOfYear(camp.calendar, m, d);
                        const endDoy = getDayOfYear(camp.calendar, em, ed);
                        duration = (ey - y) * totalDays + endDoy - startDoy + 1;
                        if (duration < 1) duration = 1;
                    }
                }

                // 3. Extract Title
                let title = fn.title || fn.name || '';

                // 4. Extract Content (Journal V2 uses the pages array)
                let rawContent = '';
                if (fn.pages && Array.isArray(fn.pages)) {
                    fn.pages.forEach(page => {
                        if (page.text && page.text.content) {
                            rawContent += page.text.content + '\n\n';
                        }
                    });
                } else {
                    // Fallback for Journal V1
                    rawContent = fn.content || fn.details || '';
                }

                // 5. Clean up HTML and proprietary Foundry tags
                let processedContent = rawContent.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
                let strippedContent = processedContent.replace(/<[^>]*>?/gm, '').trim();
                
                // Scrub out UUID tags like @UUID[JournalEntry.TkjqfkZ6w8WBe1Lh]{Session 42!} -> Session 42!
                strippedContent = strippedContent.replace(/@UUID\[.*?\]\{(.*?)\}/g, '$1');
                
                let combinedText = title;
                if (title && strippedContent) {
                    combinedText = `**${title}**\n\n${strippedContent}`;
                } else if (!title) {
                    combinedText = strippedContent;
                }

                if (!combinedText) return;

                const dateKey = `${y}-${m}-${d}`;
                
                if (!camp.calendar.notes) camp.calendar.notes = {};
                
                let dayNotes = camp.calendar.notes[dateKey];
                if (dayNotes && !Array.isArray(dayNotes)) {
                    dayNotes = [{ id: generateId(), text: dayNotes.text, visibility: dayNotes.visibility, authorId: camp.dmId }];
                }
                if (!dayNotes) dayNotes = [];

                dayNotes.push({
                    id: generateId(),
                    text: combinedText,
                    authorId: camp.dmId,
                    visibility: { mode: 'public' }, // Imported notes default to public
                    timestamp: Date.now(),
                    duration: duration,
                    repeatsYearly: repeatsYearly
                });

                camp.calendar.notes[dateKey] = dayNotes;
                importCount++;
            });

            await saveCampaign(camp);
            notify(`Successfully imported ${importCount} historical records!`, "success");
            window.appActions.closeCalendarSettings();
            reRender();

        } catch (err) {
            console.error(err);
            notify("Failed to parse Foundry VTT JSON file. Ensure it is a valid Simple Calendar export.", "error");
        }
    };
    reader.readAsText(file);
    
    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
};

// --- DM Settings ---
export const openCalendarSettings = () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;
    window.appData.showCalendarSettings = true;
    reRender();
};

export const closeCalendarSettings = () => {
    window.appData.showCalendarSettings = false;
    reRender();
};

export const addCalendarMonthRow = () => {
    const container = document.getElementById('cal-months-container');
    if (!container) return;
    
    const html = `
        <div class="cal-month-row bg-stone-100 p-3 sm:p-4 border border-[#d4c5a9] rounded-sm shadow-sm relative group">
            <div class="absolute right-3 top-3">
                <button type="button" class="text-stone-400 hover:text-red-700 transition" onclick="this.closest('.cal-month-row').remove()" title="Remove Month"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="flex items-center gap-2 mb-3 cursor-grab text-stone-400 hover:text-stone-600 w-max pr-8">
                <i class="fa-solid fa-bars"></i> <span class="text-[10px] font-bold uppercase tracking-widest">Reorder Month</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                    <label class="block text-[9px] uppercase text-stone-500 font-bold tracking-widest mb-1">Name</label>
                    <input type="text" class="cal-month-name w-full p-2 border border-[#d4c5a9] rounded-sm text-sm outline-none focus:border-red-900 bg-white font-bold text-stone-900 shadow-inner" placeholder="e.g. Hammer">
                </div>
                <div>
                    <label class="block text-[9px] uppercase text-stone-500 font-bold tracking-widest mb-1">Nickname</label>
                    <input type="text" class="cal-month-nickname w-full p-2 border border-[#d4c5a9] rounded-sm text-sm outline-none focus:border-red-900 bg-white text-stone-700 shadow-inner" placeholder="e.g. Deepwinter">
                </div>
                <div>
                    <label class="block text-[9px] uppercase text-stone-500 font-bold tracking-widest mb-1">Season</label>
                    <input type="text" class="cal-month-season w-full p-2 border border-[#d4c5a9] rounded-sm text-sm outline-none focus:border-red-900 bg-white text-stone-700 shadow-inner" placeholder="e.g. Winter">
                </div>
                <div>
                    <label class="block text-[9px] uppercase text-stone-500 font-bold tracking-widest mb-1">Days</label>
                    <input type="number" min="0" value="30" class="cal-month-days w-full p-2 border border-[#d4c5a9] rounded-sm text-sm outline-none focus:border-red-900 bg-white text-stone-900 font-mono shadow-inner" placeholder="Days">
                </div>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="block text-[9px] uppercase text-stone-500 font-bold tracking-widest mb-1">Lore & Traditions</label>
                    <textarea class="cal-month-lore w-full p-2 border border-[#d4c5a9] rounded-sm text-xs sm:text-sm outline-none focus:border-red-900 bg-white text-stone-700 shadow-inner resize-y min-h-[60px]" placeholder="Festivals, celestial alignments, common traditions..."></textarea>
                </div>
                <div>
                    <label class="block text-[9px] uppercase text-stone-500 font-bold tracking-widest mb-1">General Notes</label>
                    <textarea class="cal-month-desc w-full p-2 border border-[#d4c5a9] rounded-sm text-xs sm:text-sm outline-none focus:border-red-900 bg-white text-stone-700 shadow-inner resize-y min-h-[60px]" placeholder="Additional info, weather patterns, DM secrets..."></textarea>
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
};

export const saveCalendarSettings = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const nameInput = document.getElementById('cal-config-name');
    const daysInWeekInput = document.getElementById('cal-config-week');
    const descInput = document.getElementById('cal-config-desc');
    
    const rows = document.querySelectorAll('.cal-month-row');
    const newMonths = [];
    
    rows.forEach(row => {
        const nameEl = row.querySelector('.cal-month-name');
        const nickEl = row.querySelector('.cal-month-nickname');
        const seasonEl = row.querySelector('.cal-month-season');
        const loreEl = row.querySelector('.cal-month-lore');
        const descEl = row.querySelector('.cal-month-desc');
        const daysEl = row.querySelector('.cal-month-days');
        
        if (nameEl && daysEl && nameEl.value.trim()) {
            newMonths.push({
                name: nameEl.value.trim(),
                nickname: nickEl ? nickEl.value.trim() : "",
                season: seasonEl ? seasonEl.value.trim() : "",
                lore: loreEl ? loreEl.value.trim() : "",
                description: descEl ? descEl.value.trim() : "",
                days: parseInt(daysEl.value) || 0
            });
        }
    });

    if (newMonths.length === 0) {
        notify("A calendar must have at least one month.", "error");
        return;
    }

    camp.calendar.name = nameInput ? nameInput.value.trim() : camp.calendar.name;
    camp.calendar.description = descInput ? descInput.value.trim() : (camp.calendar.description || '');
    camp.calendar.daysInWeek = daysInWeekInput ? parseInt(daysInWeekInput.value) || 7 : 7;
    camp.calendar.months = newMonths;

    // Reset view to the beginning of the year just in case they deleted the month they were currently viewing
    window.appData.calendarViewMonth = 0;

    await saveCampaign(camp);
    window.appActions.closeCalendarSettings();
    notify("Calendar structure updated.", "success");
};

export const resetCalendarToDefault = async () => {
    if (!confirm("Reset the calendar to the Harptos default? This will NOT delete your notes, but it will overwrite your custom months and days of the week.")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const defaults = JSON.parse(JSON.stringify(DEFAULT_CALENDAR));
    camp.calendar.name = defaults.name;
    camp.calendar.description = defaults.description;
    camp.calendar.daysInWeek = defaults.daysInWeek;
    camp.calendar.months = defaults.months;

    window.appData.calendarViewMonth = 0;
    
    await saveCampaign(camp);
    window.appActions.closeCalendarSettings();
    notify("Calendar reset to Harptos.", "success");
};
