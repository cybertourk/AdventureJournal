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
    currentYear: 1492,
    daysInWeek: 10,
    months: [
        { name: "Hammer", nickname: "Deepwinter", season: "Winter", lore: "", description: "", days: 30 },
        { name: "Midwinter", nickname: "The Long Night", season: "Winter", lore: "A festival marking the midpoint of winter, often associated with auril and survival.", description: "", days: 1 },
        { name: "Alturiak", nickname: "The Claw of Winter", season: "Winter", lore: "", description: "", days: 30 },
        { name: "Ches", nickname: "Of the Sunsets", season: "Spring", lore: "", description: "", days: 30 },
        { name: "Tarsakh", nickname: "Of the Storms", season: "Spring", lore: "", description: "", days: 30 },
        { name: "Greengrass", nickname: "", season: "Spring", lore: "The traditional start of spring, where flowers are brought out to encourage the gods to bring warmth.", description: "", days: 1 },
        { name: "Mirtul", nickname: "The Melting", season: "Spring", lore: "", description: "", days: 30 },
        { name: "Kythorn", nickname: "The Time of Flowers", season: "Summer", lore: "", description: "", days: 30 },
        { name: "Flamerule", nickname: "Summertide", season: "Summer", lore: "", description: "", days: 30 },
        { name: "Midsummer", nickname: "The High Festival", season: "Summer", lore: "A night of wild revelry, feasting, and romance under the summer stars.", description: "", days: 1 },
        { name: "Shieldmeet", nickname: "", season: "Summer", lore: "A leap day added every four years following Midsummer. Traditionally a day of open councils, tournaments, and the signing of treaties.", description: "", days: 0 }, 
        { name: "Eleasias", nickname: "Highsun", season: "Summer", lore: "", description: "", days: 30 },
        { name: "Eleint", nickname: "The Fading", season: "Autumn", lore: "", description: "", days: 30 },
        { name: "Highharvestide", nickname: "The Feast of Gathering", season: "Autumn", lore: "A festival celebrating the harvest, featuring great feasts and the storing of crops for the winter.", description: "", days: 1 },
        { name: "Marpenoth", nickname: "Leaffall", season: "Autumn", lore: "", description: "", days: 30 },
        { name: "Uktar", nickname: "The Rotting", season: "Autumn", lore: "", description: "", days: 30 },
        { name: "The Feast of the Moon", nickname: "Day of the Dead", season: "Winter", lore: "A solemn day dedicated to honoring ancestors and the dead. Tombs are blessed and tales of heroes are recounted.", description: "", days: 1 },
        { name: "Nightal", nickname: "The Drawing Down", season: "Winter", lore: "", description: "", days: 30 }
    ],
    notes: {}
};
