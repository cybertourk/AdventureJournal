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
    if (!camp || !camp.calendar) return;

    const date = window.appData.activeCalendarDate;
    if (!date) return;

    const container = document.getElementById('cal-note-editor');
    const textInput = document.getElementById('cal-note-text');
    
    // Grab visibility from the hidden DOM inputs controlled by the global Fog of War menu
    const modeInput = container?.querySelector('.vis-mode-input');
    const playersInput = container?.querySelector('.vis-players-input');

    if (!textInput) return;

    const dateKey = `${date.year}-${date.monthIndex}-${date.day}`;
    const text = textInput.value.trim();

    if (!camp.calendar.notes) camp.calendar.notes = {};

    if (text === '') {
        delete camp.calendar.notes[dateKey];
    } else {
        camp.calendar.notes[dateKey] = {
            text: text,
            visibility: {
                mode: modeInput ? modeInput.value : 'public',
                visibleTo: playersInput && playersInput.value ? playersInput.value.split(',') : []
            }
        };
    }

    await saveCampaign(camp);
    window.appActions.closeCalendarDay();
    notify("Chronicle inscribed.", "success");
};

export const deleteCalendarNote = async (year, monthIndex, day) => {
    if (!confirm("Are you sure you want to delete this historical note?")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp.calendar || !camp.calendar.notes) return;

    const dateKey = `${year}-${monthIndex}-${day}`;
    delete camp.calendar.notes[dateKey];

    await saveCampaign(camp);
    window.appActions.closeCalendarDay();
    notify("Note erased.", "success");
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
