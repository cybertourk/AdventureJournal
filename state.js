import { renderApp } from './ui-core.js';

// --- GLOBAL STATE DEFAULTS ---
if (!window.appData) {
    window.appData = {
        campaigns: [],
        currentView: 'home', // home, campaign, adventure, adv-roster, session-edit, pc-manager, pc-edit, journal, codex, calendar, rules
        activeCampaignId: null,
        activeAdventureId: null,
        activeSessionId: null,
        activePcId: null,
        activeCalendarDate: null, // Tracks the currently clicked { year, monthIndex, day }
        
        // Derived Active Entities
        activeCampaign: null,
        activeAdventure: null,
        activeSession: null,

        // Codex & Smart Text State
        codexCache: [], // Array of objects { text: "Alias/Name", id: "TargetID" }
        activeSmartTextarea: null, // Tracks which textarea is currently being typed in

        // Temporary state
        tempPCs: [],
        tempAdvRoster: [], // Tracks which PC IDs are selected for an adventure
        currentMarkdown: '',
        currentUserUid: null, // Set from main.js

        // --- UI Protection Flags ---
        isEditing: false, // Locks the renderer when a user is actively typing
        hasPendingUpdate: false // Flags that new data arrived while locked
    };
}

// --- UTILITY FUNCTIONS ---

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

// --- STATE MANAGEMENT ---

export function setEditingState(isEditing) {
    window.appData.isEditing = isEditing;
    // If the user just stopped editing (e.g., closed a modal or saved), and data arrived while they were locked, render it now!
    if (!isEditing && window.appData.hasPendingUpdate) {
        window.appData.hasPendingUpdate = false;
        reRender(true);
    }
}

// Ensures derived state is accurate before rendering
export function updateDerivedState() {
    window.appData.activeCampaign = window.appData.campaigns.find(c => c.id === window.appData.activeCampaignId) || null;
    
    if (window.appData.activeCampaign) {
        // Ensure arrays exist
        if (!window.appData.activeCampaign.codex) window.appData.activeCampaign.codex = [];
        if (!window.appData.activeCampaign.rulesGlossary) window.appData.activeCampaign.rulesGlossary = [];
        
        // Build Autocomplete Cache: Combine Codex entries, Heroes, and Rules Glossary!
        const aliasMap = new Map();
        const stopWords = ['the', 'a', 'an', 'and', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'from', 'is', 'it', 'that', 'this'];
        
        const addAlias = (name, id) => {
            if(!name) return;
            const cleanName = name.trim();
            
            // Store the full exact name
            if(!aliasMap.has(cleanName.toLowerCase())) {
                aliasMap.set(cleanName.toLowerCase(), { text: cleanName, id: id });
            }
            
            // Automatically deduce a smart short name for seamless linking
            let words = cleanName.split(/\s+/);
            let targetShortWord = words[0];
            
            // If the first word is an article/stopword, grab the second word instead
            if (words.length > 1 && stopWords.includes(words[0].toLowerCase())) {
                targetShortWord = words[1];
            }
            
            // Ensure the short word is meaningful
            if(targetShortWord && targetShortWord.length > 2 && targetShortWord !== cleanName && !stopWords.includes(targetShortWord.toLowerCase())) {
                if(!aliasMap.has(targetShortWord.toLowerCase())) {
                    aliasMap.set(targetShortWord.toLowerCase(), { text: targetShortWord, id: id });
                }
            }
        };

        (window.appData.activeCampaign.codex || []).forEach(c => addAlias(c.name, c.id));
        (window.appData.activeCampaign.playerCharacters || []).forEach(pc => addAlias(pc.name, pc.id));
        (window.appData.activeCampaign.rulesGlossary || []).forEach(r => addAlias(r.name, r.id));
        
        window.appData.codexCache = Array.from(aliasMap.values());
        
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

export function reRender(force = false) {
    // SECURITY BLOCK: If the user is actively typing, DO NOT erase their screen!
    if (window.appData.isEditing && !force) {
        window.appData.hasPendingUpdate = true;
        console.log("Real-time update intercepted and paused to prevent erasing user input.");
        return;
    }

    window.appData.hasPendingUpdate = false;
    updateDerivedState();
    renderApp(window.appData);
}

// Global initialization entry point called from main.js
export function setCampaignsData(campaignsArray) {
    window.appData.campaigns = campaignsArray;
    reRender(); // The initial load can safely force a render
}

// --- DEFAULT CALENDAR SYSTEM (Harptos) ---
export const DEFAULT_CALENDAR = {
    name: "Calendar of Harptos",
    description: `### Time in the Realms\nAlthough a number of means exist for marking the days and the passage of time during a year, nearly all folk in Faerûn have adopted the Calendar of Harptos. Even the cultures and races that don't favor this method of marking time are aware of it, with the result that it is recognized across nearly all races, languages, and cultures.\n\nA year on Toril consists of 365 days. In the Calendar of Harptos, the year is divided into twelve months of thirty days, loosely following the synodic cycle of Selûne, the moon. A month is made up of three tendays, also known as rides. Five annual holidays, falling between the months, complete the 365-day calendar. Once every four years, the Calendar of Harptos includes Shieldmeet as a "leap day" following Midsummer.\n\nIndividual days of a tenday have no special names. Instead, they are denoted by counting from the beginning of the period ("first day," "second day," and so on). Days of the month are designated by a number and the month name. For example, sages would record an event as occurring on "1 Mirtul" or "27 Uktar." People might also refer to a given day by its relationship to the current date ("two tendays from today") or the nearest holiday ("three days past Greengrass").\n\n### Keeping Time from Day to Day\nMost people don't keep track of the time of day beyond notions such as "mid-morning" or "nigh sunset." If people plan to meet at a particular time, they tend to base their arrangements around such expressions.\n\nThe concept of hours and minutes exists mainly where wealthy people use clocks, but mechanical clocks are often unreliable, and rarely are two set to the same time. If a local temple or civic structure has a clock that tolls out the passing of the hours, people refer to hours as "bells," as in "I'll meet you at seven bells."\n\n### The Shifting of the Seasons\nThe worlds of Abeir and Toril drifted apart in 1487 and 1488 DR. In some places this change was accompanied by cataclysm, while in others the shift went without notice. Astronomers and navigators who closely watched the stars couldn't fail to see that there were nights when they seemed to hang in the sky. The winter of 1487–1488 lasted longer than normal. It was then noted that the solstices and equinoxes had somehow shifted, beginning with the spring equinox falling on Greengrass of 1488 DR. The seasons followed suit, with each starting later and ending later.\n\nThis shift in seasons has caused some sages, and the priests of Chauntea, to consider changing the marking of some of the annual feast days, but most folk counsel patience, believing that the seasons will fall back to their previous cycle over the coming years.`,
    currentYear: 1492,
    daysInWeek: 10,
    months: [
        { name: "Hammer", nickname: "Deepwinter", season: "Winter", lore: "", description: "", days: 30 },
        { name: "Midwinter", nickname: "Deadwinter Day", season: "Winter", lore: "The first festival day of the year is known generally as Midwinter, though some people name it differently. Nobles and monarchs of the Heartlands look to the High Festival of Winter as a day to commemorate or renew alliances. Commoners in the North, the Moonsea, and other, colder climes celebrate Deadwinter Day as a marking of the midpoint of the cold season, with hard times still ahead, but some of the worst days now past.", description: "", days: 1 },
        { name: "Alturiak", nickname: "The Claw of Winter", season: "Winter", lore: "", description: "", days: 30 },
        { name: "Ches", nickname: "The Claw of Sunsets", season: "Spring", lore: "", description: "", days: 30 },
        { name: "Tarsahk", nickname: "The Claw of Storms", season: "Spring", lore: "", description: "", days: 30 },
        { name: "Greengrass", nickname: "", season: "Spring", lore: "The traditional beginning of spring, Greengrass is celebrated by the display of freshly cut flowers (grown in special hothouses wherever the climate doesn't permit flowers so early) that are given as gifts to the gods or spread among the fields in hopes of a bountiful and speedy growing season.", description: "", days: 1 },
        { name: "Mirtul", nickname: "The Melting", season: "Spring", lore: "", description: "", days: 30 },
        { name: "Kythorn", nickname: "The Time of Flowers", season: "Summer", lore: "", description: "", days: 30 },
        { name: "Flamerule", nickname: "Summertide", season: "Summer", lore: "", description: "", days: 30 },
        { name: "Midsummer", nickname: "", season: "Summer", lore: "The midpoint of summer is a day of feasting, carousing, betrothals, and basking in the pleasant weather. Storms on Midsummer night are seen as bad omens and signs of ill fortune, and sometimes interpreted as divine disapproval of the romances or marriages sparked by the day's events.", description: "", days: 1 },
        { name: "Shieldmeet", nickname: "", season: "Summer", lore: "The great holiday of the Calendar of Harptos, Shieldmeet occurs once every four years immediately after Midsummer. It is a day for plain speaking and open council between rulers and their subjects, for the renewal of pacts and contracts, and for treaty making between peoples. Many tournaments and contests of skill are held on Shieldmeet, and most faiths mark the holiday by emphasizing one of their key tenets.\n\nThe next Shieldmeet will be observed in 1492 DR.", description: "", days: 0 }, 
        { name: "Eleasis", nickname: "Highsun", season: "Summer", lore: "", description: "", days: 30 },
        { name: "Elient", nickname: "The Fading", season: "Autumn", lore: "", description: "", days: 30 },
        { name: "Highharvestide", nickname: "", season: "Autumn", lore: "A day of feasting and thanks, Highharvestide marks the fall harvest. Most humans give thanks to Chauntea on this day for a plentiful bounty before winter approaches. Many who make their living by traveling road or sea set out immediately following the holiday, before winter comes on in full force and blocks mountain passes and harbors.", description: "", days: 1 },
        { name: "Marpenoth", nickname: "Leaffall", season: "Autumn", lore: "", description: "", days: 30 },
        { name: "Uktar", nickname: "The Rotting", season: "Autumn", lore: "", description: "", days: 30 },
        { name: "The Feast of the Moon", nickname: "", season: "Winter", lore: "As nights lengthen and winter winds begin to approach, the Feast of the Moon is the time when people celebrate their ancestors and their honored dead. During festivals on this day, people gather to share stories and legends, offer prayers for the fallen, and prepare for the coming cold.", description: "", days: 1 },
        { name: "Nightal", nickname: "The Drawing Down", season: "Winter", lore: "", description: "", days: 30 }
    ],
    notes: {}
};
