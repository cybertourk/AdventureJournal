import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';

// Inline helper to prevent circular dependencies with actions-campaign.js
const logPlayerActivity = (camp, myUid, message, icon = 'fa-clock-rotate-left') => {
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
        range: { name: "Range", mandatory: true, tiers: [ { text: "None", cost: 0 }, { text: "Touch", cost: 1 }, { text: "Short (30 feet)", cost: 2 }, { text: "Medium (60 feet)", cost: 3 }, { text: "Long (120 feet)", cost: 4 }, { text: "Sight", cost: 5 } ], description: "Determines how far from you the spell can take effect." },
        duration: { 
            name: "Duration", 
            mandatory: true, 
            description: "Select the desired duration. Check the box if a longer duration is more advantageous for your spell.",
            tiers: [ { text: "None", cost: 0 }, { text: "8 Hours", cost: 1 }, { text: "1 Hour", cost: 2 }, { text: "1 Minute", cost: 3 }, { text: "1 Round", cost: 4 }, { text: "Instantaneous", cost: 5 } ],
            invertedTiers: [ { text: "None", cost: 0 }, { text: "Instantaneous", cost: 1 }, { text: "1 Round", cost: 2 }, { text: "1 Minute", cost: 3 }, { text: "1 Hour", cost: 4 }, { text: "8 Hours", cost: 5 } ]
        },
        activation: { name: "Activation Time", mandatory: true, tiers: [ { text: "None", cost: 0 }, { text: "10 Minutes", cost: 1 }, { text: "1 Minute", cost: 2 }, { text: "1 Round", cost: 3 }, { text: "1 Action", cost: 4 }, { text: "Instantaneous", cost: 5 } ], description: "How quickly the spell is cast." },
        areaTargets: { name: "Area/Targets", mandatory: true, tiers: [ { text: "None", cost: 0 }, { text: "Personal or 1 Target", cost: 1 }, { text: "5-foot radius or 3 targets", cost: 2 }, { text: "10-foot radius or 6 targets", cost: 3 }, { text: "20-foot radius or 10 targets", cost: 4 }, { text: "30-foot radius or 15 targets", cost: 5 } ], description: "The scope of the spell's effect." },
        damageHealing: { name: "Damage/Healing", mandatory: false, tiers: [ { text: "None", cost: 0 }, { text: "Minor (2d6 Dmg / 2d4 Heal)", cost: 1 }, { text: "Weak (3d6 Dmg / 3d4 Heal)", cost: 2 }, { text: "Moderate (4d6 Dmg / 4d4 Heal)", cost: 3 }, { text: "Strong (6d6 Dmg / 6d4 Heal)", cost: 4 }, { text: "Extreme (8d6 Dmg / 8d4 Heal)", cost: 5 } ], description: "Use this to cause direct harm or restore hit points." },
        augmentia: {
            name: "Augmentia",
            mandatory: false,
            description: "A flexible category for a huge variety of magical effects.",
            tiers: [ 
                { text: "None", cost: 0 }, 
                { text: "Minor Effect", cost: 1, examples: [
                    { name: 'Mending', tip: "This could be achieved by using Formus to physically reshape an object and fit the broken pieces back together. Alternatively, one could use Tempus to briefly rewind the object's personal timeline to a moment before it was damaged." },
                    { name: 'Prestidigitation', tip: "The effects of this spell are best represented by Mentis, creating minor sensory effects and illusions. Its ability to create a small, temporary trinket is a minor expression of Formus." },
                    { name: 'Druidcraft', tip: "This is a pure expression of Vitar, involving direct interaction with natural life, predicting natural phenomena, and creating minor, nature-themed sensory effects." },
                    { name: 'Thaumaturgy', tip: "This spell demonstrates power and presence, making it a perfect fit for Dynamis. It uses energy and forces to create its overt physical phenomena: a booming voice, tremors, and altering flames." },
                    { name: 'Mage Hand', tip: "A caster could give form to a spectral hand using Formus and move it through space with Spatia. Another approach is to use Dynamis to create a focused, invisible field of kinetic force." }
                ]}, 
                { text: "Weak Effect", cost: 2, examples: [
                    { name: 'Movement (Jump/Spider Climb)', tip: "These effects can be created by altering a creature's body with Vitar or by changing its relationship to gravity with Spatia. Mentis could also convince the target's mind it is capable of such feats." },
                    { name: 'Simple Object Creation', tip: "Formus is the obvious path to creating a solid object like a Floating Disk. For Rope Trick, Spatia can be used to fold space and create a pocket dimension." },
                    { name: 'Minor Alterations (Enlarge/Reduce)', tip: "Reshaping a target's physical form is a function of Formus, supplemented by Vitar if the target is alive. A different take would be to use Spatia to warp the space the target occupies, causing it to stretch or shrink." }
                ]}, 
                { text: "Moderate Effect", cost: 3, examples: [
                    { name: 'Flight', tip: "A caster might grant the biological means for flight with Vitar, directly control one's position in the air with Spatia, or use Dynamis to create a sustained kinetic updraft." },
                    { name: 'Polymorph (Limited)', tip: "The most direct method is to use Vitar and Formus in concert to rewrite the target's physical structure. An Umbrus caster might overlay a beast spirit onto the target, forcing the body to warp to the new spiritual blueprint." },
                    { name: 'Short-Range Teleportation', tip: "The primary method is to use Spatia to instantly cross the intervening distance. However, a Tempus mage could accelerate their personal timeline to move between two points in an imperceptible instant." }
                ]}, 
                { text: "Strong Effect", cost: 4, examples: [
                    { name: 'Advanced Creation (Fabricate)', tip: "Formus is key to shaping materials. A Tempus caster might accelerate time for the raw materials, completing weeks of crafting in seconds." },
                    { name: 'Animate Objects', tip: "Vitar can grant the semblance of life, while a Mentis user could implant a rudimentary consciousness, compelling obedience." },
                    { name: 'Advanced Teleportation', tip: "Spatia can fold reality to connect two distant points. A powerful Mentis caster might transfer their consciousness to a creature at the destination and reshape the new body into their own." },
                    { name: 'Extradimensional Spaces', tip: "The most common way is to use Spatia to weave a new pocket of space. A Wyird caster might instead find and pry open a natural flaw in the fabric of reality." }
                ]},
                { text: "Major Effect", cost: 5, examples: [
                    { name: 'True Polymorph', tip: "This is the pinnacle of alteration, using Vitar and Formus to permanently reshape a creature's body and essence. A Tempus mage might achieve this by rapidly 'evolving' or 'devolving' a target along its timeline." },
                    { name: 'Planar Travel', tip: "Spatia can be used to create a direct bridge between two distinct planes. A Wyird caster could change the fundamental laws of physics around the targets to match the destination plane, causing reality to 'snap' them there." },
                    { name: 'Creation of Life', tip: "Life can be built from the ground up by combining the patterns of life (Vitar), form (Formus), and mind (Mentis). A truly powerful caster might use Tempus and Wyird to pull a creature from a possible past or a potential future." }
                ]}
            ]
        },
        bolsterHinder: { 
            name: "Bolster/Hinder", 
            mandatory: false, 
            description: "Use this to apply a buff to an ally or a debuff to an enemy.",
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
// State Controllers (Mastery Points & DM Adjustments)
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
    pm.essentia = Math.min(pm.essentia, totalRanks * 4);

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
        pm.essentia = Math.min(pm.essentia, totalRanks * 4);
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

    pm.essentia = Math.max(0, Math.min(maxEssentia, value));

    await saveCampaign(camp);
    reRender();
};

export const saveRote = async (pcId, roteData) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return false;

    const pcIndex = camp.playerCharacters?.findIndex(p => p.id === pcId);
    if (pcIndex === -1) return false;

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


// Modal popup handler for pre-roll success modifications (Significant/Exceptional upgrades)
export const selectSuccessUpgradesAndCast = async (pc, pm, castConfig, difference) => {
    return new Promise(resolve => {
        const upgradeCount = difference >= 10 ? 2 : 1;
        const activeEffects = [];

        for (const [key, effectData] of Object.entries(PATTERN_CONFIG.Effects)) {
            const currentTier = castConfig.effectTiers[key] || 0;
            // Only effects configured above Tier 0 and below Tier 5 can be upgraded
            if (currentTier > 0 && currentTier < 5) {
                activeEffects.push({ key, name: effectData.name });
            }
        }

        if (activeEffects.length === 0) {
            // No active effects are eligible for upgrade, proceed immediately
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
                    <select class="upgrade-category-select w-full p-2 border border-[#d4c5a9] rounded text-xs font-serif bg-white text-stone-900 shadow-inner">
                        <option value="">-- Choose Element --</option>
                        ${activeEffects.map(eff => `<option value="${eff.key}">${eff.name}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="bg-[#f4ebd8] p-5 sm:p-6 rounded-sm border-2 border-amber-600 shadow-2xl max-w-sm w-full relative overflow-hidden flex flex-col">
                <div class="absolute top-0 left-0 w-full h-1.5 bg-emerald-600"></div>
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
                    <button id="btn-apply-upgrades" class="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Weave Upgrades</button>
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

    // Weave the d20 roll!
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
        // Handle Significant/Exceptional Upgrades Interactively
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

            // Render upgrade formatting
            if (appliedUpgrades.includes(key)) {
                const nextTierIdx = Math.min(5, tierIdx + 1);
                let nextValText = list[nextTierIdx].text;
                if (key === 'damageHealing') nextValText += ` (${castConfig.effectTiers.damageType})`;
                if (key === 'bolsterHinder') {
                    const bolsterOpts = PATTERN_CONFIG.Effects.bolsterHinder.tiers[nextTierIdx].options || [];
                    nextValText += ` (${bolsterOpts[bolsterOpts.length - 1]})`;
                }
                if (key === 'augmentia') nextValText += ` (${castConfig.effectTiers.augmentiaCustom || 'Custom'})`;
                
                effectsListHtml += `<li class="ml-4 list-disc mb-1"><b>${effectData.name}:</b> <span class="line-through text-stone-500">${valText}</span> <i class="fa-solid fa-arrow-right text-emerald-600 mx-1"></i> <b class="text-emerald-700">${nextValText}</b></li>`;
            } else {
                effectsListHtml += `<li class="ml-4 list-disc mb-1"><b>${effectData.name}:</b> ${valText}</li>`;
            }
        }
    }

    const listHtml = effectsListHtml ? `<ul class="mt-2 text-stone-700 font-sans">${effectsListHtml}</ul>` : '<p class="italic text-stone-500 mt-2">No specific effects configured.</p>';

    // Build chronicle entries
    const cardId = generateId();
    const primaryPattern = castConfig.patterns[0] || 'arcani';
    const isSanityRequired = d20 <= 5 || dc >= 20;

    let actionButtonsHtml = '';
    if (successType === 'critical_failure') {
        actionButtonsHtml += `
            <button onclick="window.appActions.resolvePatternBacklash('${pcId}', '${primaryPattern}', '${cardId}')" id="btn-backlash-${cardId}" class="mt-3 w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded-sm font-bold uppercase text-[10px] tracking-widest shadow-md transition">
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

    let cardMarkdown = `
<div class="pattern-magic-chat-card bg-[#fdfbf7] text-stone-800 p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-sm font-serif relative z-10 text-left" onclick="event.stopPropagation();">
    <div class="flex justify-between items-start sm:items-center border-b border-[#d4c5a9] pb-2 mb-3 flex-col sm:flex-row gap-2 sm:gap-0">
        <h4 class="font-bold text-lg text-amber-900 flex items-center"><i class="fa-solid fa-sparkles mr-2 text-amber-600"></i> ${isRoteText}</h4>
        <span class="text-[10px] uppercase font-bold tracking-widest text-stone-500 bg-stone-100 px-2 py-1 rounded shadow-sm border border-stone-200">Check DC: ${dc}</span>
    </div>
    
    <p class="text-sm text-stone-600 italic mb-4 border-l-2 border-amber-500 pl-3 leading-relaxed">"${castConfig.description || 'Weaving spell vectors...'}"</p>
    
    <div class="bg-white p-3 rounded-sm border border-[#d4c5a9] text-xs text-stone-600 mb-4 space-y-2 shadow-inner">
        <div class="flex justify-between border-b border-stone-100 pb-1.5">
            <span class="uppercase tracking-widest text-[9px] font-bold text-stone-400">Caster:</span> <strong class="text-stone-900 text-sm">${pc.name}</strong>
        </div>
        <div class="flex justify-between items-center">
            <span class="uppercase tracking-widest text-[9px] font-bold text-stone-400">Patterns:</span> <span class="text-amber-700 font-bold uppercase tracking-wider text-[10px]">${castConfig.patterns.join(' + ')}</span>
        </div>
        <div class="flex justify-between items-center">
            <span class="uppercase tracking-widest text-[9px] font-bold text-stone-400">Essentia Spent:</span> <span class="text-stone-900 font-bold">${cost}</span>
        </div>
        <div class="flex justify-between items-center border-t border-stone-100 pt-1.5">
            <span class="uppercase tracking-widest text-[9px] font-bold text-stone-400">Roll Check:</span> <span class="text-stone-600 font-sans">${checkString}</span>
        </div>
        <div class="flex justify-between items-center text-sm font-black border-t border-stone-100 pt-1.5 mt-1">
            <span class="uppercase tracking-widest text-[10px] font-bold text-stone-500">Total Result:</span> <span class="text-amber-600 text-xl">${totalRoll}</span>
        </div>
    </div>
    
    <div class="p-3 rounded-sm border border-[#d4c5a9] text-xs bg-stone-50 text-stone-700 mb-4 shadow-inner">
        <h5 class="text-[9px] uppercase font-bold text-amber-800 tracking-widest border-b border-[#d4c5a9] pb-1 mb-2">Spell Form Factors</h5>
        ${listHtml}
    </div>

    <div class="p-3 rounded-sm bg-amber-50 border border-amber-200 text-sm leading-relaxed text-amber-900 mb-2 shadow-sm">
        ${messageText}
    </div>
    
    ${actionButtonsHtml}
</div>
`;

    // --- SAVE TO HERO'S PRIVATE PATTERN LOG ---
    const timestampStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logAddition = `\n\n---\n\n**Pattern: ${primaryPattern.toUpperCase()}**\n**Casted on ${timestampStr} at ${timeStr}**\n${cardMarkdown}`;

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            return { ...p, patternLog: (p.patternLog || '') + logAddition };
        }
        return p;
    });

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };

    // --- SAVE TO COLLABORATIVE CHRONICLE (IF IN SESSION) ---
    if (session) {
        const newChronicleEntry = {
            id: generateId(),
            text: cardMarkdown,
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
    
    // --- DISPLAY THE POPUP MODAL UNTIL DISMISSED ---
    const modalHtml = `
    <div class="fixed inset-0 bg-stone-950/90 z-[30000] flex items-center justify-center p-4 backdrop-blur-sm animate-in pointer-events-auto" id="pattern-result-modal">
        <div class="max-w-md w-full relative">
            ${cardMarkdown}
            <div class="mt-5 flex justify-center">
                <button onclick="document.getElementById('pattern-result-modal').remove();" class="px-8 py-2.5 bg-[#fdfbf7] text-stone-800 hover:text-stone-900 hover:bg-white rounded-sm font-bold uppercase tracking-widest text-[10px] sm:text-xs shadow-lg border border-[#d4c5a9] transition">Dismiss Result</button>
            </div>
        </div>
    </div>`;
    document.getElementById('global-popup-container').innerHTML = modalHtml;

    reRender(true);
};


// Complete Sanity saving throw and full short-term/long-term/indefinite tables matching Macro 2
export const resolvePatternSanityCheck = async (pcId, dc, spellDC, cardId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const session = window.appData.activeSession;
    if (!camp) return;

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
                { range: [26, 30], flaw: "I try to become more like someone else I know — adopting his or her style of dress, mannerisms, and name." },
                { range: [31, 35], flaw: "I must bend the truth, exaggerate, or outright lie to be interesting to other people." },
                { range: [36, 45], flaw: "Achieving my goal is the only thing of interest to me, and I’ll ignore everything else to pursue it." },
                { range: [46, 50], flaw: "I find it hard to care about anything that goes on around me." },
                { range: [51, 55], flaw: "I don’t like the way people judge me all the time." },
                { range: [56, 70], flaw: "I am the smartest, wisest, strongest, fastest, and most beautiful person I know." },
                { range: [71, 80], flaw: "I am convinced that powerful enemies are hunting me, and their agents are everywhere I go. I am sure they’re watching me all the time." },
                { range: [81, 85], flaw: "There’s only one person I can trust. And only I can see this special friend." },
                { range: [86, 95], flaw: "I can’t take anything seriously. The more serious the situation, the funnier I find it." },
                { range: [96, 100], flaw: "I've discovered that I really like killing people." }
            ];
            const match = table.find(e => d100 >= e.range[0] && d100 <= e.range[1]);
            effect = `**Flaw:** "${match?.flaw || 'Murderous urges'}"`;
        } else if (spellDC >= 20) {
            type = "Long-Term";
            duration = `${(Math.floor(Math.random() * 10) + 1) * 10} hours`;
            const table = [
                { range: [1, 10], effect: "The character feels compelled to repeat a specific activity over and over..." },
                { range: [11, 20], effect: "The character experiences vivid hallucinations and has disadvantage on ability checks." },
                { range: [21, 30], effect: "The character suffers extreme paranoia. The character has disadvantage on Wisdom and Charisma checks." },
                { range: [31, 40], effect: "The character regards something with intense revulsion, as if affected by the antipathy/sympathy spell." },
                { range: [41, 45], effect: "The character experiences a powerful delusion. Choose a potion. The character imagines that he or she is under its effects." },
                { range: [46, 55], effect: "The character becomes attached to a “lucky charm,” and has disadvantage on attack rolls, ability checks, and saving throws while more than 30 feet from it." },
                { range: [56, 65], effect: "The character is blinded (25%) or deafened (75%)." },
                { range: [66, 75], effect: "The character experiences uncontrollable tremors or tics, which impose disadvantage on attack rolls, ability checks, and saving throws that involve Strength or Dexterity." },
                { range: [76, 85], effect: "The character suffers from partial amnesia... doesn’t recognize other people or remember anything that happened before the madness took effect." },
                { range: [86, 90], effect: "Whenever the character takes damage, they must succeed on a DC 15 Wisdom saving throw or be affected by the confusion spell for 1 minute." },
                { range: [91, 95], effect: "The character loses the ability to speak." },
                { range: [96, 100], effect: "The character falls unconscious. No amount of jostling or damage can wake the character." }
            ];
            const match = table.find(e => d100 >= e.range[0] && d100 <= e.range[1]);
            effect = `**Symptom:** ${match?.effect || 'Amnesia'}`;
        } else {
            type = "Short-Term";
            const table = [
                { range: [1, 20], effect: "The character retreats into his or her mind and becomes paralyzed. The effect ends if the character takes any damage." },
                { range: [21, 30], effect: "The character becomes incapacitated and spends the duration screaming, laughing, or weeping." },
                { range: [31, 40], effect: "The character becomes frightened and must use his or her action and movement each round to flee from the source of the fear." },
                { range: [41, 50], effect: "The character begins babbling and is incapable of normal speech or spellcasting." },
                { range: [51, 60], effect: "The character must use his or her action each round to attack the nearest creature." },
                { range: [61, 70], effect: "The character experiences vivid hallucinations and has disadvantage on ability checks." },
                { range: [71, 75], effect: "The character does whatever anyone tells him or her to do that isn’t obviously self-destructive." },
                { range: [76, 80], effect: "The character experiences an overpowering urge to eat something strange such as dirt, slime, or offal." },
                { range: [81, 90], effect: "The character is stunned." },
                { range: [91, 100], effect: "The character falls unconscious." }
            ];
            const match = table.find(e => d100 >= e.range[0] && d100 <= e.range[1]);
            effect = `**Symptom:** ${match?.effect || 'Stunned'}`;
        }

        madnessHtml = `
            <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-900 shadow-inner">
                <span class="block text-[9px] uppercase tracking-widest font-bold text-red-700 mb-1">${type} Madness (d100 = ${d100})</span>
                <p class="font-serif italic leading-relaxed text-sm">${window.appActions.parseSmartText ? window.appActions.parseSmartText(effect) : effect}</p>
                <span class="block text-[9px] text-red-800 font-bold mt-2 uppercase tracking-widest">Duration: ${duration}</span>
            </div>
        `;
    }

    const responseMarkdown = `
<div class="mt-4 p-3 sm:p-4 bg-white border border-[#d4c5a9] rounded-sm text-xs relative z-10 shadow-sm text-left" onclick="event.stopPropagation();">
    <h5 class="font-bold text-stone-500 uppercase tracking-widest text-[10px] border-b border-[#d4c5a9] pb-1.5 mb-2.5"><i class="fa-solid fa-brain mr-1.5 text-stone-400"></i> Sanity Resolution</h5>
    <div class="bg-stone-50 p-2.5 rounded-sm text-xs text-stone-600 mb-3 font-mono shadow-inner border border-stone-200">
        Roll: 1d20 (${d20}) + WIS Mod (${wisMod >= 0 ? '+' : ''}${wisMod}) = <strong>${saveTotal}</strong> vs DC ${dc}
    </div>
    <p class="font-serif font-bold text-sm ${isSuccess ? 'text-emerald-700' : 'text-red-700'} mb-1">${resultHeader}</p>
    <p class="font-serif leading-relaxed text-xs text-stone-600">${resultBody}</p>
    ${madnessHtml}
</div>
`;

    // 1. UPDATE DOM INSTANTLY IF IN THE POPUP MODAL
    const btnDom = document.getElementById(`btn-sanity-${cardId}`);
    if (btnDom) btnDom.outerHTML = responseMarkdown;

    // 2. UPDATE PERSONAL PATTERN LOG
    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            let text = p.patternLog || '';
            if (text.includes(`id="btn-sanity-${cardId}"`)) {
                text = text.replace(new RegExp(`<button[^>]*id="btn-sanity-${cardId}"[^>]*>[\\s\\S]*?<\\/button>`), responseMarkdown);
            }
            return { ...p, patternLog: text };
        }
        return p;
    });

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };

    // 3. UPDATE CHRONICLE IF IN SESSION
    if (session) {
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
                                let text = entry.text.replace(new RegExp(`<button[^>]*id="btn-sanity-${cardId}"[^>]*>[\\s\\S]*?<\\/button>`), responseMarkdown);
                                return { ...entry, text };
                            }
                            return entry;
                        })
                    };
                })
            };
        });
        updatedCamp.adventures = updatedAdventures;
    }

    await saveCampaign(updatedCamp);
    // Silent save, no need to trigger full reRender since we patched the DOM directly
};


// Automated Catastrophic Backlash consequences matching the macro table
export const resolvePatternBacklash = async (pcId, primaryPattern, cardId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const session = window.appData.activeSession;
    if (!camp) return;

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
<div class="mt-4 p-3 sm:p-4 bg-red-50 text-red-900 border border-red-200 rounded-sm text-xs relative z-10 shadow-sm text-left" onclick="event.stopPropagation();">
    <h5 class="font-bold text-red-700 uppercase tracking-widest text-[10px] border-b border-red-200 pb-1.5 mb-2.5"><i class="fa-solid fa-burst mr-1.5"></i> Backlash Consequence (d4 = ${roll})</h5>
    <p class="font-serif leading-relaxed text-sm text-red-950">${resultText}</p>
    ${damageDetails ? `<p class="font-mono font-bold text-red-700 mt-2 bg-white p-2 rounded-sm border border-red-200 shadow-inner">${damageDetails}</p>` : ''}
</div>
`;

    // 1. UPDATE DOM INSTANTLY IF IN THE POPUP MODAL
    const btnDom = document.getElementById(`btn-backlash-${cardId}`);
    if (btnDom) btnDom.outerHTML = responseMarkdown;

    // 2. UPDATE PERSONAL PATTERN LOG
    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            let text = p.patternLog || '';
            if (text.includes(`id="btn-backlash-${cardId}"`)) {
                text = text.replace(new RegExp(`<button[^>]*id="btn-backlash-${cardId}"[^>]*>[\\s\\S]*?<\\/button>`), responseMarkdown);
            }
            return { ...p, patternLog: text };
        }
        return p;
    });

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };

    // 3. UPDATE CHRONICLE IF IN SESSION
    if (session) {
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
                                let text = entry.text.replace(new RegExp(`<button[^>]*id="btn-backlash-${cardId}"[^>]*>[\\s\\S]*?<\\/button>`), responseMarkdown);
                                return { ...entry, text };
                            }
                            return entry;
                        })
                    };
                })
            };
        });
        updatedCamp.adventures = updatedAdventures;
    }

    await saveCampaign(updatedCamp);
    // Silent save, no need to trigger full reRender since we patched the DOM directly
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
