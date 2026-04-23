import { renderApp } from './ui-core.js';

// --- GLOBAL STATE DEFAULTS ---
if (!window.appData) {
    window.appData = {
        campaigns: [],
        currentView: 'home', // home, campaign, adventure, adv-roster, session-edit, pc-manager, pc-edit, journal, codex
        activeCampaignId: null,
        activeAdventureId: null,
        activeSessionId: null,
        activePcId: null, 
        
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
        currentUserUid: null // Set from main.js
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

// Ensures derived state is accurate before rendering
export function updateDerivedState() {
    window.appData.activeCampaign = window.appData.campaigns.find(c => c.id === window.appData.activeCampaignId) || null;
    
    if (window.appData.activeCampaign) {
        // Ensure Codex array exists
        if (!window.appData.activeCampaign.codex) window.appData.activeCampaign.codex = [];
        
        // Build Autocomplete Cache: Combine Codex entries + any legacy/unassigned PCs without codex entries
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
            
            // If the first word is an article/stopword, grab the second word instead (e.g. "The Candlekeep Library" -> "Candlekeep")
            if (words.length > 1 && stopWords.includes(words[0].toLowerCase())) {
                targetShortWord = words[1];
            }
            
            // Ensure the short word is meaningful (>2 chars, not the full name itself, and not another stop word)
            if(targetShortWord && targetShortWord.length > 2 && targetShortWord !== cleanName && !stopWords.includes(targetShortWord.toLowerCase())) {
                if(!aliasMap.has(targetShortWord.toLowerCase())) {
                    aliasMap.set(targetShortWord.toLowerCase(), { text: targetShortWord, id: id });
                }
            }
        };

        (window.appData.activeCampaign.codex || []).forEach(c => addAlias(c.name, c.id));
        (window.appData.activeCampaign.playerCharacters || []).forEach(pc => addAlias(pc.name, pc.id));
        
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

export function reRender() {
    updateDerivedState();
    renderApp(window.appData);
}

// Global initialization entry point called from main.js
export function setCampaignsData(campaignsArray) {
    window.appData.campaigns = campaignsArray;
    reRender();
}
