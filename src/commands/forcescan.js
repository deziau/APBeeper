const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getAllPlayersPanels, startPlayerSession, endPlayerSession } = require('../database');
const { createSuccessEmbed } = require('../utils/embedStyles');
const logger = require('../utils/logger');

// Simple game matching function
function isPlayingGame(activities, targetGame) {
    if (!activities || activities.length === 0) return false;
    
    const normalizedTarget = targetGame.toLowerCase().trim();
    
    for (const activity of activities) {
        if (activity.type !== 0) continue; // Only "Playing" activities
        
        const activityName = activity.name.toLowerCase().trim();
        
        if (activityName === normalizedTarget) return true;
        if (activityName.includes(normalizedTarget) || normalizedTarget.includes(activityName)) return true;
        if (normalizedTarget.includes('apb') && activityName.includes('apb')) return true;
    }
    
    return false;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forcescan')
        .setDescription('Manually scan all members for game activity')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });
            
            const guild = interaction.guild;
            
            // Get all tracked games for this guild
            const panels = await getAllPlayersPanels();
            const guildPanels = panels.filter(panel => panel.guild_id === guild.id);
            
            if (guildPanels.length === 0) {
                await interaction.editReply({
                    content: '❌ No games are being tracked in this server. Use `/setchannel` first.'
                });
                return;
            }
            
            // Fetch all members
            await guild.members.fetch();
            
            let scannedCount = 0;
            let foundPlayers = 0;
            
            // Scan each member
            for (const [memberId, member] of guild.members.cache) {
                if (member.user.bot) continue;
                
                scannedCount++;
                
                // Check each tracked game
                for (const panel of guildPanels) {
                    const isPlaying = isPlayingGame(member.presence?.activities, panel.game_name);
                    
                    if (isPlaying) {
                        await startPlayerSession(memberId, guild.id, panel.game_name);
                        foundPlayers++;
                        logger.info(`🎮 Found ${member.user.tag} playing ${panel.game_name}`);
                    } else {
                        await endPlayerSession(memberId, guild.id, panel.game_name);
                    }
                }
            }
            
            const embed = createSuccessEmbed(
                'Force Scan Complete',
                `✅ Scanned ${scannedCount} members\n` +
                `🎮 Found ${foundPlayers} active players\n` +
                `📊 Tracking ${guildPanels.length} games\n\n` +
                `**Tracked Games:**\n${guildPanels.map(p => `• ${p.game_name}`).join('\n')}`
            );
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            logger.error('❌ Force scan error:', error);
            
            await interaction.editReply({
                content: '❌ Error during force scan. Check logs for details.'
            });
        }
    }
};
