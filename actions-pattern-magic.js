import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// =========================================================================
// Pattern Magic Core Rules Configuration
// =========================================================================
export const PATTERN_CONFIG = {
    Affinities: {
        spatia: { primary: ['range', 'areaTargets'], secondary: ['bolsterHinder'] },
        wyird: { primary: ['bolsterHinder', 'augmentia'], secondary: ['duration'] },
        dynamis: { primary: ['damageHealing', 'augmentia'], secondary: ['range', 'areaTargets'] },
        vitar: { primary: ['damageHealing', 'bolsterHinder'], secondary: ['augmentia', 'duration'] },
        formus: { primary: ['augmentia'], secondary: ['damageHealing', 'bolsterHinder', 'areaTargets'] },
        mentis: { primary: ['bolsterHinder'], secondary: ['augmentia', 'duration'] },
        arcani: { primary: ['augmentia', 'bolsterHinder'], secondary: ['duration', 'range', 'activation'] },
        umbrus: { primary: ['bolsterHinder'], secondary: ['damageHealing', 'augmentia'] },
        tempus: { primary: ['duration', 'activation', 'bolsterHinder'], secondary: ['damageHealing'] }
    },
    DamageTypesByPattern: {
        spatia: ['force', 'bludgeoning', 'piercing', 'thunder'],
        wyird: ['necrotic', 'psychic'],
        dynamis: ['acid', 'cold', 'fire', 'lightning', 'radiant', 'thunder'],
        vitar: ['poison', 'necrotic', 'acid', 'healing'],
        formus: ['acid', 'bludgeoning', 'piercing', 'slashing'],
        mentis: ['psychic'],
        arcani: ['force'],
        umbrus: ['cold', 'necrotic', 'psychic'],
        tempus: ['necrotic', 'force']
    },
    Effects: {
        range: { name: "Range", mandatory: true, tiers: [ { text: "None", cost: 0 }, { text: "Touch", cost: 1 }, { text: "Short (30 feet)", cost: 2 }, { text: "Medium (60 feet)", cost: 3 }, { text: "Long (120 feet)", cost: 4 }, { text: "Sight", cost: 5 } ] },
        duration: { 
            name: "Duration", 
            mandatory: true, 
            tiers: [ { text: "None", cost: 0 }, { text: "8 Hours", cost: 1 }, { text: "1 Hour", cost: 2 }, { text: "1 Minute", cost: 3 }, { text: "1 Round", cost: 4 }, { text: "Instantaneous", cost: 5 } ],
            invertedTiers: [ { text: "None", cost: 0 }, { text: "Instantaneous", cost: 1 }, { text: "1 Round", cost: 2 }, { text: "1 Minute", cost: 3 }, { text: "1 Hour", cost: 4 }, { text: "8 Hours", cost: 5 } ]
        },
        activation: { name: "Activation Time", mandatory: true, tiers: [ { text: "None", cost: 0 }, { text: "10 Minutes", cost: 1 }, { text: "1 Minute", cost: 2 }, { text: "1 Round", cost: 3 }, { text: "1 Action", cost: 4 }, { text: "Instantaneous", cost: 5 } ] },
        areaTargets: { name: "Area/Targets", mandatory: true, tiers: [ { text: "None", cost: 0 }, { text: "Personal or 1 Target", cost: 1 }, { text: "5-foot radius or 3 targets", cost: 2 }, { text: "10-foot radius or 6 targets", cost: 3 }, { text: "20-foot radius or 10 targets", cost: 4 }, { text: "30-foot radius or 15 targets", cost: 5 } ] },
        damageHealing: { name: "Damage/Healing", mandatory: false, tiers: [ { text: "None", cost: 0 }, { text: "Minor (2d6 Dmg / 2d4 Heal)", cost: 1 }, { text: "Weak (3d6 Dmg / 3d4 Heal)", cost: 2 }, { text: "Moderate (4d6 Dmg / 4d4 Heal)", cost: 3 }, { text: "Strong (6d6 Dmg / 6d4 Heal)", cost: 4 }, { text: "Extreme (8d6 Dmg / 8d4 Heal)", cost: 5 } ] },
        augmentia: {
            name: "Augmentia",
            mandatory: false,
            tiers: [ 
                { text: "None", cost: 0 }, 
                { text: "Minor Effect", cost: 1 }, 
                { text: "Weak Effect", cost: 2 }, 
                { text: "Moderate Effect", cost: 3 }, 
                { text: "Strong Effect", cost: 4 }, 
                { text: "Major Effect", cost: 5 }
            ]
        },
        bolsterHinder: { 
            name: "Bolster/Hinder", 
            mandatory: false, 
            tiers: [ 
                { text: "None", cost: 0 }, 
                { text: "Minor (1d4)", cost: 1, options: ['Skill Check'] }, 
                { text: "Weak (1d6)", cost: 2, options: ['Skill Check', 'Saving Throw', 'Ability Check'] }, 
                { text: "Moderate (1d8)", cost: 3, options: ['Skill Check', 'Saving Throw', 'Ability Check', 'Attack Roll'] }, 
                { text: "Strong (1d10)", cost: 4, options: ['Skill Check', 'Saving Throw', 'Ability Check', 'Attack Roll', 'Damage Roll'] }, 
                { text: "Major (1d12)", cost: 5, options: ['Skill Check', 'Saving Throw', 'Ability Check', 'Attack Roll', 'Damage Roll', 'AC'] }
            ]
        }
    },
    PatternAttributes: { spatia: "int", wyird: "wis", dynamis: "con", vitar: "wis", formus: "int", mentis: "cha", arcani: "int", umbrus: "cha", tempus: "wis" }
};

// =========================================================================
// Character State Initializer Helper
// =========================================================================
export function getOrInitPatternState(pc) {
    if (!pc.patternMagic || typeof pc.patternMagic !== 'object') {
        pc.patternMagic = {
            spatia: 0, wyird: 0, dynamis: 0, vitar: 0, formus: 0,
            mentis: 0, arcani: 0, umbrus: 0, tempus: 0,
            essentia: 0, patternPoints: 0, rotes: []
        };
    }
    // Guarantee fallback sub-arrays
    if (!Array.isArray(pc.patternMagic.rotes)) {
        pc.patternMagic.rotes = [];
    }
    return pc.patternMagic;
}

// =========================================================================
// State Controllers (Spending Points & DM Adjustments)
// =========================================================================

/**
 * Spend unspent Pattern Points to upgrade a specific Pattern Rank on a PC.
 */
export const upgradePatternRank = async (pcId, patternKey) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const myUid = window.appData.currentUserUid;
    const pcIndex = camp.playerCharacters?.findIndex(p => p.id === pcId);
    if (pcIndex === -1) return;

    const pc = camp.playerCharacters[pcIndex];
    const isOwner = pc.playerId === myUid;
    if (!camp._isDM && !isOwner) {
        notify("You do not have permission to upgrade this character's magical patterns.", "error");
        return;
    }

    const pm = getOrInitPatternState(pc);
    if (pm.patternPoints <= 0) {
        notify("No unspent Pattern Points available.", "error");
        return;
    }
    if ((pm[patternKey] || 0) >= 5) {
        notify("Pattern Ranks are capped at 5.", "error");
        return;
    }

    pm[patternKey] = (pm[patternKey] || 0) + 1;
    pm.patternPoints -= 1;

    // Recalculate max Essentia dynamically: Total Ranks * 4
    const totalRanks = Object.keys(PATTERN_CONFIG.PatternAttributes).reduce((sum, key) => sum + (pm[key] || 0), 0);
    const maxEssentia = totalRanks * 4;
    pm.essentia = Math.min(pm.essentia, maxEssentia);

    let updatedCamp = { ...camp };
    if (!camp._isDM) {
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent 1 Pattern Point to upgrade **${patternKey.toUpperCase()}** to Rank ${pm[patternKey]} on **${pc.name}**`, 'fa-magic');
    }

    await saveCampaign(updatedCamp);
    notify(`${patternKey.toUpperCase()} upgraded successfully!`, "success");
    reRender();
};

/**
 * DM Administration: Adjust Pattern Points or Ranks directly.
 */
export const adjustPatternParameter = async (pcId, paramKey, amount) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) {
        notify("Only the Dungeon Master can manipulate raw character matrices.", "error");
        return;
    }

    const pcIndex = camp.playerCharacters?.findIndex(p => p.id === pcId);
    if (pcIndex === -1) return;

    const pc = camp.playerCharacters[pcIndex];
    const pm = getOrInitPatternState(pc);

    if (paramKey === 'patternPoints') {
        pm.patternPoints = Math.max(0, pm.patternPoints + amount);
    } else if (Object.keys(PATTERN_CONFIG.PatternAttributes).includes(paramKey)) {
        pm[paramKey] = Math.max(0, Math.min(5, (pm[paramKey] || 0) + amount));
        
        // Recalculate max Essentia
        const totalRanks = Object.keys(PATTERN_CONFIG.PatternAttributes).reduce((sum, key) => sum + (pm[key] || 0), 0);
        const maxEssentia = totalRanks * 4;
        pm.essentia = Math.min(pm.essentia, maxEssentia);
    }

    await saveCampaign(camp);
    notify(`Matrix updated for ${pc.name}.`, "success");
    reRender();
};

/**
 * Adjust active Essentia level (filling or spending pips).
 */
export const setPcEssentia = async (pcId, value) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const myUid = window.appData.currentUserUid;
    const pcIndex = camp.playerCharacters?.findIndex(p => p.id === pcId);
    if (pcIndex === -1) return;

    const pc = camp.playerCharacters[pcIndex];
    const isOwner = pc.playerId === myUid;
    if (!camp._isDM && !isOwner) return;

    const pm = getOrInitPatternState(pc);
    const totalRanks = Object.keys(PATTERN_CONFIG.PatternAttributes).reduce((sum, key) => sum + (pm[key] || 0), 0);
    const maxEssentia = totalRanks * 4;

    const finalVal = Math.max(0, Math.min(maxEssentia, value));
    pm.essentia = finalVal;

    await saveCampaign(camp);
    reRender();
};

// =========================================================================
// Rote Management System
// =========================================================================

export const saveRote = async (pcId, roteData) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const pcIndex = camp.playerCharacters?.findIndex(p => p.id === pcId);
    if (pcIndex === -1) return;

    const pc = camp.playerCharacters[pcIndex];
    const pm = getOrInitPatternState(pc);

    const primaryPattern = roteData.primaryPattern;
    const currentRotesForPattern = pm.rotes.filter(r => r.primaryPattern === primaryPattern).length;
    const maxRotesAllowed = pm[primaryPattern] || 0;

    if (currentRotesForPattern >= maxRotesAllowed) {
        notify(`You cannot memorize more than ${maxRotesAllowed} rotes for ${primaryPattern.toUpperCase()} (limited by Pattern Rank).`, "error");
        return false;
    }

    pm.rotes.push({
        id: generateId(),
        name: roteData.name,
        primaryPattern: primaryPattern,
        essentiaCost: roteData.essentiaCost,
        description: roteData.description || '',
        ability: roteData.ability || 'int',
        patterns: roteData.patterns || [],
        effectTiers: roteData.effectTiers || {}
    });

    await saveCampaign(camp);
    notify(`Rote "${roteData.name}" committed to memory.`, "success");
    reRender();
    return true;
};

export const deleteRote = async (pcId, roteId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const pcIndex = camp.playerCharacters?.findIndex(p => p.id === pcId);
    if (pcIndex === -1) return;

    const pc = camp.playerCharacters[pcIndex];
    const pm = getOrInitPatternState(pc);

    pm.rotes = pm.rotes.filter(r => r.id !== roteId);

    await saveCampaign(camp);
    notify("Rote erased from memory.", "success");
    reRender();
};

// =========================================================================
// Magical Resolution Roll Mechanics
// =========================================================================

/**
 * Execute a Pattern Magic roll. Deducts Essentia and outputs a beautiful,
 * interactive card into the collaborative session log (Chronicle).
 */
export const castPatternSpell = async (pcId, castConfig) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const session = window.appData.activeSession;
    if (!camp) return;

    const pcIndex = camp.playerCharacters?.findIndex(p => p.id === pcId);
    if (pcIndex === -1) return;

    const pc = camp.playerCharacters[pcIndex];
    const pm = getOrInitPatternState(pc);

    const cost = castConfig.essentiaCost;
    if (pm.essentia < cost) {
        notify("Insufficient Essentia to weave this spell.", "error");
        return;
    }

    // Spend the fuel!
    pm.essentia -= cost;

    // Weave the roll! Formula: 1d20 + Ability Modifier + Sum of Selected Pattern Ranks
    const d20 = Math.floor(Math.random() * 20) + 1;
    const abilityMod = Math.floor(((parseInt(pc[castConfig.ability]) || 10) - 10) / 2);
    
    const selectedRanksSum = castConfig.patterns.reduce((sum, key) => sum + (pm[key] || 0), 0);
    const totalRoll = d20 + abilityMod + selectedRanksSum;
    const dc = 10 + cost;

    let successType = "failure";
    let messageText = "";

    if (totalRoll <= dc - 5) {
        successType = "critical_failure";
        messageText = `🚨 **Catastrophic Failure!** The Pattern snaps back and unravels violently!`;
    } else if (totalRoll < dc) {
        successType = "failure";
        messageText = `❌ **Failure.** The spell fizzles harmlessly into the ether.`;
    } else if (totalRoll >= dc + 5) {
        successType = totalRoll >= dc + 10 ? "exceptional_success" : "significant_success";
        messageText = `✨ **Significant Success!** You weave the Pattern with masterful control!`;
    } else {
        successType = "success";
        messageText = `✅ **Success!** You weave the spell safely into reality.`;
    }

    // Format descriptive effects for card output
    let effectsListHtml = '';
    for (const [key, effectData] of Object.entries(PATTERN_CONFIG.Effects)) {
        const tierIdx = castConfig.effectTiers[key] || 0;
        if (tierIdx > 0) {
            const list = castConfig.effectTiers.durationInverted && key === 'duration' ? effectData.invertedTiers : effectData.tiers;
            let valText = list[tierIdx].text;
            if (key === 'damageHealing') valText += ` (${castConfig.effectTiers.damageType})`;
            if (key === 'bolsterHinder') valText += ` (${castConfig.effectTiers.bolsterHinderTarget})`;
            if (key === 'augmentia') valText += ` (${castConfig.effectTiers.augmentiaCustom || 'Custom'})`;
            effectsListHtml += `<li class="ml-4 list-disc"><b>${effectData.name}:</b> ${valText}</li>`;
        }
    }

    const listHtml = effectsListHtml ? `<ul class="mt-2 text-stone-700">${effectsListHtml}</ul>` : '<p class="italic text-stone-500 mt-2">No specific effects configured.</p>';

    // Build the beautiful, interactive chat card HTML
    const cardId = generateId();
    const primaryPattern = castConfig.patterns[0] || 'arcani';
    const isSanityRequired = d20 <= 5 || dc >= 20;

    let actionButtonsHtml = '';
    if (successType === 'critical_failure') {
        actionButtonsHtml += `
            <button onclick="window.appActions.resolvePatternBacklash('${pcId}', '${primaryPattern}', '${cardId}')" id="btn-backlash-${cardId}" class="mt-3 w-full py-1.5 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[9px] tracking-widest shadow-sm">
                <i class="fa-solid fa-burst mr-1.5 animate-pulse"></i> Roll Backlash Damage
            </button>
        `;
    }
    if (isSanityRequired) {
        const sanityDc = 10 + cost;
        actionButtonsHtml += `
            <button onclick="window.appActions.resolvePatternSanityCheck('${pcId}', ${sanityDc}, ${dc}, '${cardId}')" id="btn-sanity-${cardId}" class="mt-2 w-full py-1.5 bg-[#292524] hover:bg-stone-800 text-amber-500 border border-amber-600/30 rounded font-bold uppercase text-[9px] tracking-widest shadow-sm">
                <i class="fa-solid fa-brain mr-1.5"></i> Save vs Mental Strain (DC ${sanityDc})
            </button>
        `;
    }

    const isRoteText = castConfig.isRote ? `Rote: "${castConfig.roteName}"` : `Pattern Magic`;
    const checkString = `1d20 (${d20}) + ${castConfig.ability.toUpperCase()} (${abilityMod >= 0 ? '+' : ''}${abilityMod}) + Ranks (${selectedRanksSum})`;

    let cardMarkdown = `
<div class="pattern-magic-chat-card bg-stone-900 text-stone-100 p-4 rounded-sm border-l-4 border-l-amber-600 shadow-lg font-sans relative z-10" onclick="event.stopPropagation();">
    <div class="flex justify-between items-center border-b border-stone-800 pb-1.5 mb-3">
        <h4 class="font-serif font-bold text-sm text-amber-500 flex items-center"><i class="fa-solid fa-sparkles mr-2"></i> ${isRoteText}</h4>
        <span class="text-[8px] uppercase font-bold tracking-wider text-stone-500">Check DC: ${dc}</span>
    </div>
    
    <p class="text-[11px] text-stone-300 italic mb-3 font-serif">"${castConfig.description || 'Weaving spell vectors...'}"</p>
    
    <div class="bg-[#1c1917] p-2.5 rounded border border-stone-800 text-xs text-stone-400 mb-3 space-y-1.5">
        <div class="flex justify-between border-b border-stone-800 pb-1">
            <span>Caster:</span> <strong class="text-stone-200 font-serif">${pc.name}</strong>
        </div>
        <div class="flex justify-between">
            <span>Patterns:</span> <span class="text-stone-300 font-bold">${castConfig.patterns.map(p => p.toUpperCase()).join(' + ')}</span>
        </div>
        <div class="flex justify-between">
            <span>Essentia Spent:</span> <span class="text-stone-300 font-bold">${cost} gp</span>
        </div>
        <div class="flex justify-between border-t border-stone-800 pt-1">
            <span>Roll Check:</span> <span class="text-stone-300">${checkString}</span>
        </div>
        <div class="flex justify-between items-center text-sm font-black border-t border-stone-800 pt-1">
            <span>Total Result:</span> <span class="text-amber-400 text-base">${totalRoll}</span>
        </div>
    </div>
    
    <div class="p-2.5 rounded border border-stone-800 text-xs bg-white text-stone-800 mb-3 font-serif">
        <h5 class="text-[9px] uppercase font-bold text-stone-400 tracking-widest border-b border-stone-200 pb-0.5 mb-1.5">Spell Form Factors</h5>
        ${listHtml}
    </div>

    <div class="p-2.5 rounded bg-stone-850 border border-stone-800 text-xs leading-relaxed text-stone-300 mb-1">
        ${messageText}
    </div>
    
    ${actionButtonsHtml}
</div>
`;

    // Inject directly into the shared Chronicle of the active session
    let updatedCamp = { ...camp };
    if (session) {
        const newChronicleEntry = {
            id: generateId(),
            text: cardMarkdown,
            authorId: myUid,
            timestamp: Date.now()
        };
        // Traverse back into active adventure's sessions array to write the shared card
        const updatedAdventures = camp.adventures.map(a => {
            if (a.id !== window.appData.activeAdventureId) return a;
            const updatedSessions = a.sessions.map(s => {
                if (s.id !== session.id) return s;
                return { ...s, chronicle: [...(s.chronicle || []), newChronicleEntry] };
            });
            return { ...a, sessions: updatedSessions };
        });
        updatedCamp.adventures = updatedAdventures;
    } else {
        // Fallback: Post as a Campaign Activity Log if not in a session
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `cast a spell via Pattern Magic: **${totalRoll}** vs DC ${dc} (Essentia Spent: ${cost})`, 'fa-magic');
    }

    await saveCampaign(updatedCamp);
    notify("Spell cast successfully! Result posted to Chronicle.", "success");
    reRender();
};

// =========================================================================
// Backlash & Sanity Roll Engine
// =========================================================================

/**
 * Automate Catastrophic Backlash roll on Critical Failures.
 */
export const resolvePatternBacklash = async (pcId, primaryPattern, cardId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const session = window.appData.activeSession;
    if (!camp || !session) return;

    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const damageMap = { spatia: 'force', wyird: 'necrotic', dynamis: 'fire', vitar: 'poison', formus: 'bludgeoning', mentis: 'psychic', arcani: 'force', umbrus: 'cold', tempus: 'force' };
    const roll = Math.floor(Math.random() * 4) + 1;
    
    let resultText = "";
    let damageDetails = "";

    if (roll === 1) resultText = "<b>Unstable Connection:</b> You suffer disadvantage on all Pattern checks for the next 24 hours.";
    if (roll === 2) resultText = "<b>Mental Fatigue:</b> You suffer disadvantage on Wisdom saving throws for the next 24 hours.";
    if (roll === 3) {
        const dmg = Math.floor(Math.random() * 6) + 1;
        resultText = "<b>Physical Overload:</b> You take 1d6 force damage and are poisoned for the next hour.";
        damageDetails = `(Overload Damage: **${dmg} force**)`;
    }
    if (roll === 4) {
        const dmg = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
        const element = damageMap[primaryPattern] || 'force';
        resultText = `<b>Elemental Backlash:</b> You take 2d6 ${element} damage directly.`;
        damageDetails = `(Backlash Damage: **${dmg} ${element}**)`;
    }

    const responseMarkdown = `
<div class="mt-3 p-3 bg-red-955/40 text-stone-100 border border-red-900 rounded-sm text-xs relative z-10" onclick="event.stopPropagation();">
    <h5 class="font-bold text-red-500 uppercase tracking-widest text-[9px] border-b border-red-900/30 pb-1 mb-2"><i class="fa-solid fa-burst"></i> Backlash Consequence (d4 = ${roll})</h5>
    <p class="font-serif leading-relaxed mb-1">${resultText}</p>
    ${damageDetails ? `<p class="font-black text-red-400 font-mono mt-1">${damageDetails}</p>` : ''}
</div>
`;

    // Surgically append this consequence box underneath the exact chat card in the Chronicle!
    const updatedAdventures = camp.adventures.map(a => {
        if (a.id !== window.appData.activeAdventureId) return a;
        return {
            ...a,
            sessions: a.sessions.map(s => {
                if (s.id !== session.id) return s;
                return {
                    ...s,
                    chronicle: s.chronicle.map(entry => {
                        if (entry.text.includes(`id="btn-backlash-${cardId}"`)) {
                            // Erase the button and append the consequence box!
                            let text = entry.text.replace(new RegExp(`<button[^>]*id="btn-backlash-${cardId}"[^>]*>[\\s\\S]*?<\\/button>`), '');
                            text += responseMarkdown;
                            return { ...entry, text };
                        }
                        return entry;
                    })
                };
            })
        };
    });

    await saveCampaign({ ...camp, adventures: updatedAdventures });
    reRender();
};

/**
 * Automate Sanity Saving Throws & Madness table generation.
 */
export const resolvePatternSanityCheck = async (pcId, dc, spellDC, cardId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const session = window.appData.activeSession;
    if (!camp || !session) return;

    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    // Roll Sanity Save: 1d20 + Sanity Save modifier (standardized to Wisdom modifier / 10 + flat wis mod)
    const d20 = Math.floor(Math.random() * 20) + 1;
    const wisScore = parseInt(pc.wis) || 10;
    const wisMod = Math.floor((wisScore - 10) / 2);
    const saveTotal = d20 + wisMod;

    const isSuccess = saveTotal >= dc;
    let resultHeader = isSuccess ? "✅ Sanity Check Succeeded!" : "❌ Sanity Check Failed!";
    let resultBody = isSuccess ? `*Your mind withstands the dimensional pressure and the reality-bending strain fades.*` : `*Your sanity buckles under the strain.*`;

    // Generate Madness if failed and spellDC is significant
    let madnessHtml = '';
    if (!isSuccess && spellDC >= 13) {
        const d100 = Math.floor(Math.random() * 100) + 1;
        let type = "Short-Term";
        let duration = `${Math.floor(Math.random() * 10) + 1} minutes`;
        let effect = "";

        if (spellDC >= 30) {
            type = "Indefinite";
            duration = "Until Cured";
            const table = [
                { range: [1, 15], flaw: "Being drunk keeps me sane." },
                { range: [16, 25], flaw: "I keep whatever I find." },
                { range: [26, 30], flaw: "I adopt the mannerisms, style, and name of someone else I know." },
                { range: [31, 35], flaw: "I must bend the truth, exaggerate, or outright lie to be interesting." },
                { range: [36, 45], flaw: "Achieving my goal is the only thing of interest, ignoring everything else." },
                { range: [46, 50], flaw: "I find it hard to care about anything that goes on around me." },
                { range: [51, 55], flaw: "I don’t like the way people judge me all the time." },
                { range: [56, 70], flaw: "I am the smartest, wisest, strongest, fastest, and most beautiful person I know." },
                { range: [71, 80], flaw: "I am sure powerful enemies are watching and hunting me at all times." },
                { range: [81, 85], flaw: "I trust only one person. And only I can see this special friend." },
                { range: [86, 95], flaw: "I can’t take anything seriously. The more serious, the funnier I find it." },
                { range: [86, 100], flaw: "I’ve discovered that I really like killing people." }
            ];
            const match = table.find(e => d100 >= e.range[0] && d100 <= e.range[1]);
            effect = `**Flaw:** "${match?.flaw || 'Murderous urges'}"`;
        } else if (spellDC >= 20) {
            type = "Long-Term";
            duration = `${(Math.floor(Math.random() * 10) + 1) * 10} hours`;
            const table = [
                { range: [1, 10], effect: "Compelled to repeat a specific activity over and over." },
                { range: [11, 20], effect: "Vivid hallucinations; disadvantage on ability checks." },
                { range: [21, 30], effect: "Extreme paranoia; disadvantage on Wisdom and Charisma checks." },
                { range: [31, 40], effect: "Intense revulsion toward a nearby object or creature." },
                { range: [41, 45], effect: "Powerful delusion: believe you are under the effect of a random potion." },
                { range: [46, 55], effect: "Attached to a 'lucky charm'; disadvantage on checks/attacks if more than 30ft away." },
                { range: [56, 65], effect: "Blinded (25%) or deafened (75%)." },
                { range: [66, 75], effect: "Uncontrollable tremors; disadvantage on checks/saves involving Strength or Dexterity." },
                { range: [76, 85], effect: "Partial amnesia; you do not recognize companions or remember past events." },
                { range: [86, 90], effect: "Taking damage forces a DC 15 Wis save or triggers Confusion for 1 minute." },
                { range: [91, 95], effect: "You completely lose the ability to speak." },
                { range: [96, 100], effect: "You fall unconscious and cannot be awoken by any means." }
            ];
            const match = table.find(e => d100 >= e.range[0] && d100 <= e.range[1]);
            effect = `**Symptom:** ${match?.effect || 'Amnesia'}`;
        } else {
            type = "Short-Term";
            const table = [
                { range: [1, 20], effect: "Paralyzed within your own mind. Ends early if you take any damage." },
                { range: [21, 30], effect: "Incapacitated: spend the duration screaming, laughing, or weeping." },
                { range: [31, 40], effect: "Frightened: must use all movement and actions to flee from the source." },
                { range: [41, 50], effect: "Babbling: incapable of normal speech or spellcasting." },
                { range: [51, 60], effect: "Homocidal: must use actions to attack the nearest creature." },
                { range: [61, 70], effect: "Vivid hallucinations; disadvantage on ability checks." },
                { range: [71, 75], effect: "Suggestible: you do whatever you are told (unless obviously self-destructive)." },
                { range: [76, 80], effect: "Uncontrollable urge to eat dirt, mud, or offal." },
                { range: [81, 90], effect: "Stunned." },
                { range: [91, 100], effect: "Unconscious." }
            ];
            const match = table.find(e => d100 >= e.range[0] && d100 <= e.range[1]);
            effect = `**Symptom:** ${match?.effect || 'Stunned'}`;
        }

        madnessHtml = `
            <div class="mt-2.5 p-2 bg-[#1c1917] border border-red-900/30 rounded text-[11px] text-stone-300">
                <span class="block text-[8px] uppercase tracking-wider font-bold text-red-500 mb-0.5">${type} Madness (d100 = ${d100})</span>
                <p class="font-serif italic leading-relaxed">${effect}</p>
                <span class="block text-[8px] text-stone-500 font-bold mt-1 uppercase">Duration: ${duration}</span>
            </div>
        `;
    }

    const responseMarkdown = `
<div class="mt-3 p-3 bg-stone-950/40 text-stone-100 border border-stone-850 rounded-sm text-xs relative z-10" onclick="event.stopPropagation();">
    <h5 class="font-bold text-amber-500 uppercase tracking-widest text-[9px] border-b border-stone-800 pb-1 mb-2"><i class="fa-solid fa-brain"></i> Sanity Resolution</h5>
    <div class="bg-[#1c1917] p-2 rounded text-[11px] text-stone-400 mb-2 font-mono">
        Roll: 1d20 (${d20}) + WIS Mod (${wisMod >= 0 ? '+' : ''}${wisMod}) = <strong>${saveTotal}</strong> vs DC ${dc}
    </div>
    <p class="font-sans font-bold text-xs ${isSuccess ? 'text-emerald-500' : 'text-red-500'}">${resultHeader}</p>
    <p class="font-serif leading-relaxed text-[11px] mt-0.5">${resultBody}</p>
    ${madnessHtml}
</div>
`;

    // Append this resolution box and strip the sanity button from the Chronicle card!
    const updatedAdventures = camp.adventures.map(a => {
        if (a.id !== window.appData.activeAdventureId) return a;
        return {
            ...a,
            sessions: a.sessions.map(s => {
                if (s.id !== session.id) return s;
                return {
                    ...s,
                    chronicle: s.chronicle.map(entry => {
                        if (entry.text.includes(`id="btn-sanity-${cardId}"`)) {
                            // Strip button and append the results box
                            let text = entry.text.replace(new RegExp(`<button[^>]*id="btn-sanity-${cardId}"[^>]*>[\\s\\S]*?<\\/button>`), '');
                            text += responseMarkdown;
                            return { ...entry, text };
                        }
                        return entry;
                    })
                };
            })
        };
    });

    await saveCampaign({ ...camp, adventures: updatedAdventures });
    reRender();
};

// ============================================================================
// --- VIEW ROUTING BINDINGS ---
// ============================================================================
if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    // Core State Setters
    window.appActions.upgradePatternRank = upgradePatternRank;
    window.appActions.adjustPatternParameter = adjustPatternParameter;
    window.appActions.setPcEssentia = setPcEssentia;
    
    // Rote Controllers
    window.appActions.saveRote = saveRote;
    window.appActions.deleteRote = deleteRote;
    
    // Casting and Resolution Engine
    window.appActions.castPatternSpell = castPatternSpell;
    window.appActions.resolvePatternBacklash = resolvePatternBacklash;
    window.appActions.resolvePatternSanityCheck = resolvePatternSanityCheck;
}
