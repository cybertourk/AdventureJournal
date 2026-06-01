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
                { text: "Minor Effect", cost: 1, examples: [
                    { name: 'Mending', tip: 'Physically reshape an object and fit broken pieces together.' },
                    { name: 'Prestidigitation', tip: 'Create minor sensory effects and illusions or a small trinket.' },
                    { name: 'Druidcraft', tip: 'Interact with natural life, predict weather, sensory effects.' },
                    { name: 'Thaumaturgy', tip: 'Create overt physical phenomena: booming voice, tremors, altering flames.' },
                    { name: 'Mage Hand', tip: 'Create a focused, invisible field of kinetic force to manipulate objects.' }
                ]}, 
                { text: "Weak Effect", cost: 2, examples: [
                    { name: 'Movement (Jump/Spider Climb)', tip: 'Alter body or gravity to enhance movement capabilities.' },
                    { name: 'Simple Object Creation', tip: 'Create a solid object like a Floating Disk or fold a pocket dimension.' },
                    { name: 'Minor Alterations (Enlarge/Reduce)', tip: 'Reshape physical form or warp occupied space to stretch/shrink.' }
                ]}, 
                { text: "Moderate Effect", cost: 3, examples: [
                    { name: 'Flight', tip: 'Grant biological wings, control gravity, or create a kinetic updraft.' },
                    { name: 'Polymorph (Limited)', tip: 'Rewrite physical structure into a beast form.' },
                    { name: 'Short-Range Teleportation', tip: 'Instantly cross short distances by folding space or accelerating time.' }
                ]}, 
                { text: "Strong Effect", cost: 4, examples: [
                    { name: 'Advanced Creation (Fabricate)', tip: 'Accelerate time for raw materials or instantly shape complex objects.' },
                    { name: 'Animate Objects', tip: 'Grant the semblance of life and rudimentary consciousness.' },
                    { name: 'Advanced Teleportation', tip: 'Fold reality to connect distant points across the world.' },
                    { name: 'Extradimensional Spaces', tip: 'Weave a new pocket of space or pry open a flaw in reality.' }
                ]},
                { text: "Major Effect", cost: 5, examples: [
                    { name: 'True Polymorph', tip: 'Permanently reshape a creature\'s body and essence.' },
                    { name: 'Planar Travel', tip: 'Create a direct bridge or conduit to another plane of existence.' },
                    { name: 'Creation of Life', tip: 'Build life from the ground up by combining patterns of life, form, and mind.' }
                ]}
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
    if (!Array.isArray(pc.patternMagic.rotes)) {
        pc.patternMagic.rotes = [];
    }
    return pc.patternMagic;
}

// =========================================================================
// State Controllers (Spending Points & DM Adjustments)
// =========================================================================

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
        
        const totalRanks = Object.keys(PATTERN_CONFIG.PatternAttributes).reduce((sum, key) => sum + (pm[key] || 0), 0);
        const maxEssentia = totalRanks * 4;
        pm.essentia = Math.min(pm.essentia, maxEssentia);
    }

    await saveCampaign(camp);
    notify(`Matrix updated for ${pc.name}.`, "success");
    reRender();
};

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
// Interactive Upgrade Resolution System
// =========================================================================

export const selectSuccessUpgradesAndCast = async (pc, pm, castConfig, difference) => {
    return new Promise(resolve => {
        const upgradeCount = difference >= 10 ? 2 : 1;
        const activeEffects = [];

        for (const [key, effectData] of Object.entries(PATTERN_CONFIG.Effects)) {
            const currentTier = castConfig.effectTiers[key] || 0;
            if (currentTier > 0 && currentTier < 5) {
                activeEffects.push({ key, name: effectData.name });
            }
        }

        if (activeEffects.length === 0) {
            resolve({ upgrades: [] });
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-stone-950/80 z-[25000] flex items-center justify-center p-4 backdrop-blur-sm animate-in';
        modal.id = 'tapestry-success-upgrade-modal';

        let choicesDropdowns = '';
        for (let i = 0; i < upgradeCount; i++) {
            choicesDropdowns += `
                <div>
                    <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Upgrade Option ${i + 1}</label>
                    <select class="upgrade-category-select w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-serif bg-white text-stone-900 shadow-inner outline-none focus:border-amber-600">
                        <option value="">-- Choose Element --</option>
                        ${activeEffects.map(eff => `<option value="${eff.key}">${eff.name}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="bg-[#f4ebd8] p-5 sm:p-6 rounded-sm border-2 border-emerald-700 shadow-2xl max-w-sm w-full relative overflow-hidden flex flex-col">
                <div class="text-center mb-4">
                    <i class="fa-solid fa-sparkles text-3xl text-emerald-600 mb-2 drop-shadow-md animate-pulse"></i>
                    <h3 class="font-serif font-bold text-lg text-emerald-900">Success Enhancement!</h3>
                    <span class="text-[9px] uppercase tracking-wider text-stone-500 font-bold block mt-1">Configure ${upgradeCount} Upgraded Vector(s)</span>
                </div>
                <p class="text-xs text-stone-700 font-serif leading-relaxed text-center mb-5">Your masterly check exceeded the weaving threshold. Select which components to enhance.</p>
                
                <div class="space-y-4 mb-6">
                    ${choicesDropdowns}
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-[#d4c5a9]">
                    <button id="btn-apply-upgrades" class="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-amber-50 rounded-sm font-bold uppercase text-[10px] tracking-widest shadow-sm">Weave Upgrades</button>
                </div>
            </div>
        `;

        document.getElementById('global-popup-container').appendChild(modal);

        document.getElementById('btn-apply-upgrades').onclick = () => {
            const selects = document.querySelectorAll('.upgrade-category-select');
            const chosen = Array.from(selects).map(s => s.value).filter(Boolean);

            if (chosen.length < upgradeCount) {
                notify("Select upgrades for all available slots.", "error");
                return;
            }

            modal.remove();
            resolve({ upgrades: chosen });
        };
    });
};

// =========================================================================
// Magical Resolution Roll Mechanics
// =========================================================================

export const castPatternSpell = async (pcId, castConfig) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const session = window.appData.activeSession;
    if (!camp) return;

    const myUid = window.appData.currentUserUid;
    const pcIndex = camp.playerCharacters?.findIndex(p => p.id === pcId);
    if (pcIndex === -1) return;

    const pc = camp.playerCharacters[pcIndex];
    const pm = getOrInitPatternState(pc);

    const cost = castConfig.essentiaCost;
    if (pm.essentia < cost) {
        notify("Insufficient Essentia to weave this spell.", "error");
        return;
    }

    pm.essentia -= cost;

    const d20 = Math.floor(Math.random() * 20) + 1;
    const abilityMod = Math.floor(((parseInt(pc[castConfig.ability]) || 10) - 10) / 2);
    const selectedRanksSum = castConfig.patterns.reduce((sum, key) => sum + (pm[key] || 0), 0);
    const totalRoll = d20 + abilityMod + selectedRanksSum;
    const dc = 10 + cost;

    let successType = "failure";
    let messageText = "";
    let appliedUpgrades = [];

    if (totalRoll <= dc - 5) {
        successType = "critical_failure";
        messageText = `🚨 <b>Critical Failure!</b> The Pattern unravels violently! The spell fails spectacularly, and the magical backlash threatens your mind.`;
    } else if (totalRoll < dc) {
        successType = "failure";
        messageText = `❌ <b>Failure.</b> You fail to weave the Pattern correctly. The spell fizzles and has no effect.`;
    } else if (totalRoll >= dc + 5) {
        const diff = totalRoll - dc;
        const resolution = await selectSuccessUpgradesAndCast(pc, pm, castConfig, diff);
        appliedUpgrades = resolution.upgrades;
        
        successType = diff >= 10 ? "exceptional_success" : "significant_success";
        const gradeText = diff >= 10 ? "Exceptional" : "Significant";
        messageText = `✨ <b>${gradeText} Success!</b> You weave the Pattern with masterful precision and enhance its effects!`;
    } else {
        successType = "success";
        messageText = `✅ <b>Success!</b> You successfully weave the Pattern and the spell takes effect.`;
    }

    // Prepare arrays for HTML (Popup) and Markdown (Database)
    let htmlEffects = '';
    let markdownEffects = '';

    for (const [key, effectData] of Object.entries(PATTERN_CONFIG.Effects)) {
        const tierIdx = castConfig.effectTiers[key] || 0;
        if (tierIdx > 0) {
            const list = castConfig.effectTiers.durationInverted && key === 'duration' ? effectData.invertedTiers : effectData.tiers;
            let valText = list[tierIdx].text;
            
            if (key === 'damageHealing') valText += ` (${castConfig.effectTiers.damageType})`;
            if (key === 'bolsterHinder') valText += ` (${castConfig.effectTiers.bolsterHinderTarget})`;
            if (key === 'augmentia') valText += ` (${castConfig.effectTiers.augmentiaCustom || 'Custom'})`;

            if (appliedUpgrades.includes(key)) {
                const nextTierIdx = Math.min(5, tierIdx + 1);
                let nextValText = list[nextTierIdx].text;
                if (key === 'damageHealing') nextValText += ` (${castConfig.effectTiers.damageType})`;
                if (key === 'bolsterHinder') {
                    const bolsterOpts = PATTERN_CONFIG.Effects.bolsterHinder.tiers[nextTierIdx].options || [];
                    nextValText += ` (${bolsterOpts[bolsterOpts.length - 1]})`;
                }
                if (key === 'augmentia') nextValText += ` (${castConfig.effectTiers.augmentiaCustom || 'Custom'})`;
                
                htmlEffects += `<li class="ml-4 list-disc mb-1"><b>${effectData.name}:</b> <span class="line-through text-stone-500">${valText}</span> <i class="fa-solid fa-arrow-right text-emerald-600 mx-1"></i> <b class="text-emerald-700">${nextValText}</b></li>`;
                markdownEffects += `- **${effectData.name}:** ~~${valText}~~ -> **${nextValText}**\n`;
            } else {
                htmlEffects += `<li class="ml-4 list-disc mb-1"><b>${effectData.name}:</b> ${valText}</li>`;
                markdownEffects += `- **${effectData.name}:** ${valText}\n`;
            }
        }
    }

    const listHtml = htmlEffects ? `<ul class="mt-2 text-stone-700 font-sans">${htmlEffects}</ul>` : '<p class="italic text-stone-500 mt-2">No specific effects configured.</p>';

    const cardId = generateId();
    const primaryPattern = castConfig.patterns[0] || 'arcani';
    const isSanityRequired = d20 <= 5 || dc >= 20;

    let actionButtonsHtml = '';
    if (successType === 'critical_failure') {
        actionButtonsHtml += `
            <button onclick="window.appActions.resolvePatternBacklash('${pcId}', '${primaryPattern}', '${cardId}')" id="btn-backlash-${cardId}" class="mt-3 w-full py-2 bg-red-900 hover:bg-red-800 text-amber-50 rounded-sm font-bold uppercase text-[10px] tracking-widest shadow-md transition">
                <i class="fa-solid fa-burst mr-1.5 animate-pulse"></i> Roll for Consequence
            </button>
        `;
    }
    if (isSanityRequired) {
        const sanityDc = 10 + cost;
        actionButtonsHtml += `
            <button onclick="window.appActions.resolvePatternSanityCheck('${pcId}', ${sanityDc}, ${dc}, '${cardId}')" id="btn-sanity-${cardId}" class="mt-2 w-full py-2 bg-stone-800 hover:bg-stone-700 text-amber-50 rounded-sm font-bold uppercase text-[10px] tracking-widest shadow-md transition">
                <i class="fa-solid fa-brain mr-1.5"></i> Save vs Mental Strain (DC ${sanityDc})
            </button>
        `;
    }

    const isRoteText = castConfig.isRote ? `Rote: "${castConfig.roteName}"` : `Pattern Magic`;
    const checkString = `1d20 (${d20}) + ${castConfig.ability.toUpperCase()} (${abilityMod >= 0 ? '+' : ''}${abilityMod}) + Ranks (${selectedRanksSum})`;

    // ==============================================================================
    // 1. Generate PURE MARKDOWN for Database Storage (No HTML tags leak into logs!)
    // ==============================================================================
    let plainMessage = messageText.replace(/<[^>]*>?/gm, ''); // Strip HTML from success message
    let logMarkdown = `### ${isRoteText}\n*"${castConfig.description || 'Weaving spell vectors...'}"*\n\n**Caster:** ${pc.name}\n**Patterns:** ${castConfig.patterns.join(' + ').toUpperCase()}\n**Essentia Spent:** ${cost}\n**Roll Check:** ${checkString}\n**Total Result: ${totalRoll}** vs DC ${dc}\n\n**Spell Form Factors:**\n${markdownEffects || 'None\n'}\n**Outcome:** ${plainMessage}\n<!-- RESOLUTION_PLACEHOLDER_${cardId} -->`;

    const timestampStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logAddition = `\n\n---\n\n**Pattern: ${primaryPattern.toUpperCase()}**\n**Casted on ${timestampStr} at ${timeStr}**\n${logMarkdown}`;

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            return { ...p, patternLog: (p.patternLog || '') + logAddition };
        }
        return p;
    });

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };

    if (session) {
        const newChronicleEntry = {
            id: cardId, // Tie the entry ID to the placeholder ID
            text: logMarkdown,
            authorId: myUid,
            timestamp: Date.now()
        };
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
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `cast a spell via Pattern Magic: **${totalRoll}** vs DC ${dc} (Essentia Spent: ${cost})`, 'fa-magic');
    }

    await saveCampaign(updatedCamp);

    // ==============================================================================
    // 2. Generate BEAUTIFUL HTML for the Immediate Popup Modal (Safe from Markdown parsing)
    // ==============================================================================
    let cardHtml = `
<div class="bg-[#fdfbf7] text-stone-900 p-5 rounded-sm border border-[#d4c5a9] shadow-2xl font-sans relative z-10 text-left border-t-4 border-t-amber-600" onclick="event.stopPropagation();">
    <div class="flex justify-between items-center border-b border-[#d4c5a9] pb-2 mb-3">
        <h4 class="font-serif font-bold text-lg text-amber-900 flex items-center"><i class="fa-solid fa-sparkles mr-2 text-amber-500"></i> ${isRoteText}</h4>
        <span class="text-[10px] uppercase font-bold tracking-widest text-stone-500 bg-stone-100 px-2 py-1 rounded border border-stone-300 shadow-sm">Check DC: ${dc}</span>
    </div>
    
    <p class="text-sm text-stone-600 italic mb-4 font-serif border-l-2 border-stone-400 pl-3">"${castConfig.description || 'Weaving spell vectors...'}"</p>
    
    <div class="bg-stone-50 p-3 rounded-sm border border-stone-200 text-xs text-stone-600 mb-4 space-y-2 shadow-inner">
        <div class="flex justify-between border-b border-stone-200 pb-1.5">
            <span>Caster:</span> <strong class="text-stone-900 font-serif">${pc.name}</strong>
        </div>
        <div class="flex justify-between">
            <span>Patterns:</span> <span class="text-stone-900 font-bold uppercase tracking-wider text-[10px]">${castConfig.patterns.join(' + ')}</span>
        </div>
        <div class="flex justify-between">
            <span>Essentia Spent:</span> <span class="text-stone-900 font-bold">${cost}</span>
        </div>
        <div class="flex justify-between border-t border-stone-200 pt-1.5">
            <span>Roll Check:</span> <span class="text-stone-700">${checkString}</span>
        </div>
        <div class="flex justify-between items-center text-sm font-black border-t border-stone-200 pt-1.5 mt-1">
            <span>Total Result:</span> <span class="text-amber-600 text-lg drop-shadow-sm">${totalRoll}</span>
        </div>
    </div>
    
    <div class="p-3 rounded-sm border border-[#d4c5a9] text-xs bg-white text-stone-800 mb-4 shadow-sm">
        <h5 class="text-[10px] uppercase font-bold text-amber-700 tracking-widest border-b border-[#d4c5a9] pb-1 mb-2">Spell Form Factors</h5>
        ${listHtml}
    </div>

    <div class="p-3 rounded-sm bg-stone-100 border border-stone-300 text-sm font-serif leading-relaxed text-stone-800 mb-2 shadow-inner">
        ${messageText}
    </div>
    
    ${actionButtonsHtml}
</div>
`;

    const modalHtml = `
    <div class="fixed inset-0 bg-stone-950/90 z-[30000] flex items-center justify-center p-4 backdrop-blur-sm animate-in pointer-events-auto" id="pattern-result-modal">
        <div class="max-w-md w-full relative">
            ${cardHtml}
            <div class="mt-5 flex justify-center">
                <button onclick="document.getElementById('pattern-result-modal').remove();" class="px-8 py-2.5 bg-[#fdfbf7] text-stone-800 hover:text-stone-900 hover:bg-white rounded-sm font-bold uppercase tracking-widest text-[10px] sm:text-xs shadow-lg border border-[#d4c5a9] transition">Dismiss Result</button>
            </div>
        </div>
    </div>`;
    
    document.getElementById('global-popup-container').innerHTML = modalHtml;
    reRender(true);
};

// =========================================================================
// Backlash & Sanity Roll Engine
// =========================================================================

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

    // 1. Generate HTML for the Popup Modal
    const responseHtml = `
<div class="mt-3 p-3 bg-red-50 text-red-900 border border-red-200 rounded-sm text-xs shadow-sm">
    <h5 class="font-bold text-red-700 uppercase tracking-widest text-[10px] border-b border-red-200 pb-1 mb-2"><i class="fa-solid fa-burst"></i> Backlash Consequence</h5>
    <p class="font-serif leading-relaxed mb-1">${resultText}</p>
    ${damageDetails ? `<p class="font-black text-red-700 font-mono mt-1">${damageDetails}</p>` : ''}
</div>`;

    const btnDom = document.getElementById(`btn-backlash-${cardId}`);
    if (btnDom) btnDom.outerHTML = responseHtml;

    // 2. Generate Pure Markdown for the Database
    let plainResult = resultText.replace(/<b>(.*?)<\/b>/gi, '**$1**');
    let mdBacklash = `\n---\n\n### Backlash Consequence (d4 = ${roll})\n${plainResult}`;
    if (damageDetails) mdBacklash += `\n${damageDetails}`;
    mdBacklash += `\n<!-- RESOLUTION_PLACEHOLDER_${cardId} -->`; // keep placeholder alive

    const updatedAdventures = camp.adventures.map(a => {
        if (a.id !== window.appData.activeAdventureId) return a;
        return {
            ...a,
            sessions: a.sessions.map(s => {
                if (s.id !== session.id) return s;
                return {
                    ...s,
                    chronicle: s.chronicle.map(entry => {
                        if (entry.text.includes(`<!-- RESOLUTION_PLACEHOLDER_${cardId} -->`)) {
                            let text = entry.text.replace(`<!-- RESOLUTION_PLACEHOLDER_${cardId} -->`, mdBacklash);
                            return { ...entry, text };
                        }
                        return entry;
                    })
                };
            })
        };
    });

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            let text = p.patternLog || '';
            if (text.includes(`<!-- RESOLUTION_PLACEHOLDER_${cardId} -->`)) {
                text = text.replace(`<!-- RESOLUTION_PLACEHOLDER_${cardId} -->`, mdBacklash);
            }
            return { ...p, patternLog: text };
        }
        return p;
    });

    await saveCampaign({ ...camp, adventures: updatedAdventures, playerCharacters: updatedPCs });
    reRender();
};

export const resolvePatternSanityCheck = async (pcId, dc, spellDC, cardId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const session = window.appData.activeSession;
    if (!camp || !session) return;

    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const d20 = Math.floor(Math.random() * 20) + 1;
    const wisScore = parseInt(pc.wis) || 10;
    const wisMod = Math.floor((wisScore - 10) / 2);
    const saveTotal = d20 + wisMod;

    const isSuccess = saveTotal >= dc;
    let resultHeader = isSuccess ? "✅ Sanity Check Succeeded!" : "❌ Sanity Check Failed!";
    let resultBody = isSuccess ? `*Your mind withstands the dimensional pressure and the reality-bending strain fades.*` : `*Your sanity buckles under the strain.*`;

    let madnessHtml = '';
    let type = "";
    let durationText = "";
    let effect = "";
    let d100 = 0;

    if (!isSuccess && spellDC >= 13) {
        d100 = Math.floor(Math.random() * 100) + 1;
        
        if (spellDC >= 30) {
            type = "Indefinite";
            durationText = "Until Cured";
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
            durationText = `${(Math.floor(Math.random() * 10) + 1) * 10} hours`;
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
            durationText = `${Math.floor(Math.random() * 10) + 1} minutes`;
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
            <div class="mt-2.5 p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-900 shadow-inner">
                <span class="block text-[9px] uppercase tracking-widest font-bold text-red-700 mb-1">${type} Madness (d100 = ${d100})</span>
                <p class="font-serif italic leading-relaxed text-sm">${effect.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>')}</p>
                <span class="block text-[9px] text-red-800 font-bold mt-2 uppercase tracking-widest">Duration: ${durationText}</span>
            </div>
        `;
    }

    // 1. Generate HTML for the Popup Modal
    const responseHtml = `
<div class="mt-3 p-4 bg-white border border-[#d4c5a9] rounded-sm text-xs shadow-sm">
    <h5 class="font-bold text-stone-500 uppercase tracking-widest text-[10px] border-b border-[#d4c5a9] pb-1 mb-2"><i class="fa-solid fa-brain"></i> Sanity Resolution</h5>
    <div class="bg-stone-50 p-2 rounded text-[11px] text-stone-600 mb-2 font-mono shadow-inner border border-stone-200">
        Roll: 1d20 (${d20}) + WIS Mod (${wisMod >= 0 ? '+' : ''}${wisMod}) = <strong>${saveTotal}</strong> vs DC ${dc}
    </div>
    <p class="font-sans font-bold text-sm ${isSuccess ? 'text-emerald-600' : 'text-red-600'}">${resultHeader}</p>
    <p class="font-serif leading-relaxed text-xs mt-1 text-stone-700">${resultBody}</p>
    ${madnessHtml}
</div>`;

    const btnDom = document.getElementById(`btn-sanity-${cardId}`);
    if (btnDom) btnDom.outerHTML = responseHtml;

    // 2. Generate Pure Markdown for the Database
    let mdSanity = `\n---\n\n### ${resultHeader}\n**Roll:** 1d20 (${d20}) + WIS Mod (${wisMod >= 0 ? '+' : ''}${wisMod}) = **${saveTotal}** vs DC ${dc}\n*${resultBody.replace(/\*/g, '')}*`;
    if (madnessHtml) {
        mdSanity += `\n\n**${type} Madness (d100 = ${d100}):**\n${effect}\n*Duration: ${durationText}*`;
    }
    mdSanity += `\n<!-- RESOLUTION_PLACEHOLDER_${cardId} -->`;

    const updatedAdventures = camp.adventures.map(a => {
        if (a.id !== window.appData.activeAdventureId) return a;
        return {
            ...a,
            sessions: a.sessions.map(s => {
                if (s.id !== session.id) return s;
                return {
                    ...s,
                    chronicle: s.chronicle.map(entry => {
                        if (entry.text.includes(`<!-- RESOLUTION_PLACEHOLDER_${cardId} -->`)) {
                            let text = entry.text.replace(`<!-- RESOLUTION_PLACEHOLDER_${cardId} -->`, mdSanity);
                            return { ...entry, text };
                        }
                        return entry;
                    })
                };
            })
        };
    });

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            let text = p.patternLog || '';
            if (text.includes(`<!-- RESOLUTION_PLACEHOLDER_${cardId} -->`)) {
                text = text.replace(`<!-- RESOLUTION_PLACEHOLDER_${cardId} -->`, mdSanity);
            }
            return { ...p, patternLog: text };
        }
        return p;
    });

    await saveCampaign({ ...camp, adventures: updatedAdventures, playerCharacters: updatedPCs });
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
