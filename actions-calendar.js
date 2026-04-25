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
    
    // Grab visibility from the hidden DOM inputs controlled by the global Fog of War menu
    const modeInput = container?.querySelector('.vis-mode-input');
    const playersInput = container?.querySelector('.vis-players-input');

    if (!textInput || textInput.value.trim() === '') return;

    const dateKey = `${date.year}-${date.monthIndex}-${date.day}`;
    const text = textInput.value.trim();
    const noteId = noteIdInput?.value || generateId();

    if (!camp.calendar.notes) camp.calendar.notes = {};

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
        timestamp: Date.now()
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
    
    await saveCampaign(camp);
    notify("Chronicle inscribed.", "success");
    reRender(); // Re-render to show the newly added note in the modal list
};

export const editCalendarNote = (noteId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const date = window.appData.activeCalendarDate;
    if (!camp || !date) return;

    const dateKey = `${date.year}-${date.monthIndex}-${date.day}`;
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
    const modeInput = container?.querySelector('.vis-mode-input');
    const playersInput = container?.querySelector('.vis-players-input');

    if (textInput) textInput.value = targetNote.text;
    if (noteIdInput) noteIdInput.value = targetNote.id || 'legacy';
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

export const deleteCalendarNote = async (year, monthIndex, day, noteId) => {
    if (!confirm("Are you sure you want to delete this historical note?")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp.calendar || !camp.calendar.notes) return;

    const dateKey = `${year}-${monthIndex}-${day}`;
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
                    timestamp: Date.now()
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
        <div class="flex gap-2 items-center mb-2 cal-month-row group">
            <i class="fa-solid fa-bars text-stone-300 cursor-grab hover:text-stone-500"></i>
            <input type="text" class="flex-grow p-2 border border-[#d4c5a9] rounded-sm text-sm outline-none focus:border-red-900 bg-white font-bold text-stone-900" placeholder="Month Name">
            <input type="number" min="0" class="w-24 p-2 border border-[#d4c5a9] rounded-sm text-sm outline-none focus:border-red-900 bg-white text-stone-700" placeholder="Days" value="30">
            <button type="button" class="px-3 py-2 text-stone-400 hover:text-red-700 hover:bg-red-100 rounded-sm transition" onclick="this.parentElement.remove()" title="Remove Month"><i class="fa-solid fa-trash"></i></button>
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
    
    const rows = document.querySelectorAll('.cal-month-row');
    const newMonths = [];
    
    rows.forEach(row => {
        const nameEl = row.querySelector('input[type="text"]');
        const daysEl = row.querySelector('input[type="number"]');
        if (nameEl && daysEl && nameEl.value.trim()) {
            newMonths.push({
                name: nameEl.value.trim(),
                days: parseInt(daysEl.value) || 0
            });
        }
    });

    if (newMonths.length === 0) {
        notify("A calendar must have at least one month.", "error");
        return;
    }

    camp.calendar.name = nameInput ? nameInput.value.trim() : camp.calendar.name;
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
    camp.calendar.daysInWeek = defaults.daysInWeek;
    camp.calendar.months = defaults.months;

    window.appData.calendarViewMonth = 0;
    
    await saveCampaign(camp);
    window.appActions.closeCalendarSettings();
    notify("Calendar reset to Harptos.", "success");
};
