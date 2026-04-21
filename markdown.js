// --- Markdown Generators ---

export function generateSessionMarkdown(session, campaign) {
    let md = `### ${session.name}\n`;
    md += `*Logged on ${new Date(session.timestamp).toLocaleDateString()}*\n\n`;

    if (session.events && session.events.trim()) md += `#### Events\n${session.events}\n\n`;
    if (session.npcs && session.npcs.trim()) md += `#### NPCs\n${session.npcs}\n\n`;
    if (session.locations && session.locations.trim()) md += `#### Locations\n${session.locations}\n\n`;
    
    if (session.lootText && session.lootText.trim()) {
        md += `#### Loot (${session.lootValue.toLocaleString()} gp)\n${session.lootText}\n\n`;
    }

    if (session.notes && session.notes.trim()) md += `#### General Notes\n${session.notes}\n\n`;

    const pcNotesKeys = Object.keys(session.pcNotes || {});
    if (pcNotesKeys.length > 0 && campaign && campaign.playerCharacters && campaign.playerCharacters.length > 0) {
        md += `#### Player Character Notes\n`;
        campaign.playerCharacters.forEach(pc => {
            const note = session.pcNotes[pc.id];
            const hasNote = note && note.trim() !== '';
            const statuses = [];
            if (pc.inspiration) statuses.push('Inspiration');
            if (pc.automaticSuccess) statuses.push('Auto-Success');
            
            if (hasNote || statuses.length > 0) {
                let statusStr = statuses.length > 0 ? ` [${statuses.join(' | ')}]` : '';
                md += `- **${pc.name}${statusStr}:** ${hasNote ? note : '*No specific notes this session.*'}\n`;
            }
        });
        md += `\n`;
    }

    return md;
}

export function generateAdventureMarkdown(adventure, campaign) {
    let md = `## Adventure Arc: ${adventure.name}\n`;
    md += `*Level ${adventure.startLevel} - ${adventure.endLevel} | ${adventure.numPlayers} Players | Arc Loot: ${adventure.totalLootGP.toLocaleString()} gp*\n\n`;
    
    const sortedSessions = adventure.sessions ? [...adventure.sessions].sort((a, b) => a.timestamp - b.timestamp) : [];
    
    if (sortedSessions.length === 0) {
        md += `*No sessions logged in this arc yet.*\n\n`;
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
    const totalLoot = campaign.adventures ? campaign.adventures.reduce((sum, adv) => sum + adv.totalLootGP, 0) : 0;
    md += `*Total Campaign Loot: ${totalLoot.toLocaleString()} gp*\n\n---\n\n`;

    if (!campaign.adventures || campaign.adventures.length === 0) {
        md += `*No adventures recorded yet.*\n`;
    } else {
        campaign.adventures.forEach(adv => {
            md += generateAdventureMarkdown(adv, campaign);
        });
    }

    return md;
}
