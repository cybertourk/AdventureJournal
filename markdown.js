// --- Markdown Generators ---

// Helper to check Fog of War visibility
function isVisible(entity, campaign) {
    if (!campaign) return true;
    if (campaign._isDM) return true; // DM sees all
    
    const vis = entity.visibility || { mode: 'public' };
    
    if (vis.mode === 'public') return true;
    if (vis.mode === 'hidden') return false;
    
    const myUid = window.appData?.currentUserUid;
    if (vis.mode === 'specific' && vis.visibleTo && Array.isArray(vis.visibleTo)) {
        return vis.visibleTo.includes(myUid);
    }
    
    return false;
}

export function generateSessionMarkdown(session, campaign) {
    let md = `### ${session.name}\n`;
    md += `*Logged on ${new Date(session.timestamp).toLocaleDateString()}*\n\n`;

    // 1. SCENES (Dynamic Format)
    if (session.scenes && session.scenes.length > 0) {
        const activeScenes = session.scenes.filter(s => s.text && s.text.trim() !== '' && isVisible(s, campaign));
        if (activeScenes.length > 0) {
            activeScenes.forEach(scene => {
                md += `${scene.text}\n\n`;
            });
        }
    } 
    
    // 2. CLUES (Dynamic Format)
    if (session.clues && session.clues.length > 0) {
        const activeClues = session.clues.filter(c => c.text && c.text.trim() !== '' && isVisible(c, campaign));
        if (activeClues.length > 0) {
            md += `#### Investigation & Clues\n`;
            activeClues.forEach(clue => {
                md += `- ${clue.text}\n`;
            });
            md += `\n`;
        }
    }

    // 3. LOOT
    if (session.lootText && session.lootText.trim() && isVisible({visibility: session.lootVisibility}, campaign)) {
        if (campaign && campaign._isDM) {
            md += `#### Loot (${session.lootValue.toLocaleString()} gp)\n${session.lootText}\n\n`;
        } else {
            md += `#### Loot\n${session.lootText}\n\n`;
        }
    }

    // 4. NOTES
    if (session.notes && session.notes.trim() && isVisible({visibility: session.notesVisibility}, campaign)) {
        md += `#### General Notes\n${session.notes}\n\n`;
    }

    // 5. PLAYER NOTES
    if (session.playerNotes && Object.keys(session.playerNotes).length > 0) {
        let playerNotesOutput = `#### Player Notes\n`;
        let hasVisiblePlayerNotes = false;
        
        const myUid = window.appData?.currentUserUid;

        for (const [uid, noteData] of Object.entries(session.playerNotes)) {
            if (noteData && noteData.text && noteData.text.trim() !== '') {
                // Players can ALWAYS see their own notes. Otherwise, check visibility.
                const isAuthor = myUid === uid;
                if (isAuthor || isVisible(noteData, campaign)) {
                    const playerName = (campaign && campaign.playerNames && campaign.playerNames[uid]) ? campaign.playerNames[uid] : "Unknown Player";
                    playerNotesOutput += `**${playerName}:**\n${noteData.text}\n\n`;
                    hasVisiblePlayerNotes = true;
                }
            }
        }
        
        if (hasVisiblePlayerNotes) {
            md += playerNotesOutput;
        }
    }

    // 6. PC NOTES (DM Specific Notes)
    if (session.pcNotes && Object.keys(session.pcNotes).length > 0) {
        // PC Notes are implicitly DM only (Legacy/Core design)
        if (campaign && campaign._isDM) {
            let pcNotesOutput = `#### Hero Specific Notes\n`;
            let hasAnyNotes = false;
            
            campaign.playerCharacters?.forEach(pc => {
                if (session.pcNotes[pc.id] && session.pcNotes[pc.id].trim() !== '') {
                    pcNotesOutput += `**${pc.name}:** ${session.pcNotes[pc.id]}\n\n`;
                    hasAnyNotes = true;
                }
            });
            
            if (hasAnyNotes) {
                md += pcNotesOutput + `\n`;
            }
        }
    }

    return md;
}

export function generateAdventureMarkdown(adventure, campaign) {
    let md = `## Adventure Arc: ${adventure.name}\n`;
    
    if (campaign && campaign._isDM) {
        md += `*Level ${adventure.startLevel} - ${adventure.endLevel} | ${adventure.numPlayers} Players | Arc Loot: ${adventure.totalLootGP.toLocaleString()} gp*\n\n`;
    } else {
        md += `*Level ${adventure.startLevel} - ${adventure.endLevel} | ${adventure.numPlayers} Players*\n\n`;
    }
    
    const sortedSessions = adventure.sessions ? [...adventure.sessions].sort((a, b) => a.timestamp - b.timestamp) : [];
    
    if (sortedSessions.length === 0) {
        md += `*No sessions have been recorded for this adventure yet.*\n\n`;
    } else {
        sortedSessions.forEach(session => {
            md += generateSessionMarkdown(session, campaign);
            md += `---\n\n`;
        });
    }
    
    return md;
}

export function generateCampaignMarkdown(campaign) {
    let md = `# Campaign: ${campaign.name}\n\n`;
    
    if (campaign && campaign._isDM) {
        const totalLoot = campaign.adventures ? campaign.adventures.reduce((sum, adv) => sum + adv.totalLootGP, 0) : 0;
        md += `*Total Campaign Loot: ${totalLoot.toLocaleString()} gp*\n\n---\n\n`;
    } else {
        md += `\n---\n\n`;
    }

    if (!campaign.adventures || campaign.adventures.length === 0) {
        md += `*No adventures have been recorded for this campaign yet.*\n\n`;
    } else {
        campaign.adventures.forEach(adv => {
            md += generateAdventureMarkdown(adv, campaign);
        });
    }
    
    return md;
}
