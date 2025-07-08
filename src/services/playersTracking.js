const { EmbedBuilder } = require('discord.js');
const { getAllPlayersPanels, updatePlayersPanelMessage, getActivePlayerSessions, startPlayerSession, endPlayerSession, cleanupOldSessions } = require('../database');
const { createPlayersEmbed } = require('../utils/embedStyles');
const logger = require('../utils/logger');

// Simple game name matching
function isPlayingGame(activities, targetGame) {
    if (!activities || activities.length === 0) return false;
    
    const normalizedTarget = targetGame.toLowerCase().trim();
    
    for (const activity of activities) {
        if (activity.type !== 0) continue; // Only "Playing" activities
        
        const activityName = activity.name.toLowerCase().trim();
        
        // Direct match
        if (activityName === normalizedTarget) return true;
        
        // Contains match
        if (activityName.includes(normalizedTarget) || normalizedTarget.includes(activityName)) return true;
        
        // APB specific matches
        if (normalizedTarget.includes('apb') && activityName.includes('apb')) return true;
        if (normalizedTarget.includes('reloaded') && activityName.includes('apb')) return true;
    }
    
    return false;
}

async function updatePlayersPanels(client) {
    try {
        const panels = await getAllPlayersPanels();
        logger.info(`📊 Updating ${panels.length} player panels`);
        
        for (const panel of panels) {
            try {
                const guild = client.guilds.cache.get(panel.guild_id);
                if (!guild) continue;
                
                const channel = guild.channels.cache.get(panel.channel_id);
                if (!channel) continue;
                
                // Get active sessions
                const sessions = await getActivePlayerSessions(panel.guild_id, panel.game_name);
                
                // Get player data
                const playersData = [];
                for (const session of sessions) {
                    try {
                        const member = await guild.members.fetch(session.user_id);
                        if (member) {
                            const duration = Date.now() - new Date(session.started_at).getTime();
                            playersData.push({
                                user: member.user,
                                member: member,
                                duration: duration,
                                startedAt: new Date(session.started_at)
                            });
                        }
                    } catch (error) {
                        // User left server, clean up session
                        await endPlayerSession(session.user_id, session.guild_id, session.game_name);
                    }
                }
                
                // Create embed
                const embed = await createPlayersEmbed(panel.game_name, playersData, guild);
                
                // Send or update message
                if (panel.message_id) {
                    try {
                        const message = await channel.messages.fetch(panel.message_id);
                        await message.edit({ embeds: [embed] });
                    } catch (error) {
                        // Message deleted, create new one
                        const newMessage = await channel.send({ embeds: [embed] });
                        await updatePlayersPanelMessage(panel.id, newMessage.id);
                    }
                } else {
                    const newMessage = await channel.send({ embeds: [embed] });
                    await updatePlayersPanelMessage(panel.id, newMessage.id);
                }
                
                logger.info(`✅ Updated panel for ${panel.game_name} (${playersData.length} players)`);
                
            } catch (error) {
                logger.error(`❌ Error updating panel ${panel.id}:`, error);
            }
        }
        
    } catch (error) {
        logger.error('❌ Error updating players panels:', error);
    }
}

async function handlePresenceUpdate(oldPresence, newPresence) {
    try {
        if (!newPresence?.user || newPresence.user.bot) return;
        
        const userId = newPresence.user.id;
        const guild = newPresence.guild;
        
        // Get all panels for this guild
        const panels = await getAllPlayersPanels();
        const guildPanels = panels.filter(panel => panel.guild_id === guild.id);
        
        if (guildPanels.length === 0) return;
        
        logger.info(`🔍 Presence update: ${newPresence.user.tag} in ${guild.name}`);
        
        // Log activities
        if (newPresence.activities && newPresence.activities.length > 0) {
            newPresence.activities.forEach(activity => {
                logger.info(`  📱 Activity: "${activity.name}" (type: ${activity.type})`);
            });
        } else {
            logger.info(`  📱 No activities`);
        }
        
        // Check each tracked game
        for (const panel of guildPanels) {
            const gameName = panel.game_name;
            
            const wasPlaying = oldPresence ? isPlayingGame(oldPresence.activities, gameName) : false;
            const isPlaying = isPlayingGame(newPresence.activities, gameName);
            
            logger.info(`  🎮 ${gameName}: was=${wasPlaying}, is=${isPlaying}`);
            
            if (isPlaying && !wasPlaying) {
                // Started playing
                await startPlayerSession(userId, guild.id, gameName);
                logger.info(`✅ ${newPresence.user.tag} started playing ${gameName}`);
                
            } else if (!isPlaying && wasPlaying) {
                // Stopped playing
                await endPlayerSession(userId, guild.id, gameName);
                logger.info(`❌ ${newPresence.user.tag} stopped playing ${gameName}`);
            }
        }
        
    } catch (error) {
        logger.error('❌ Error handling presence update:', error);
    }
}

async function cleanupSessions() {
    try {
        await cleanupOldSessions();
        logger.info('🧹 Cleaned up old sessions');
    } catch (error) {
        logger.error('❌ Error cleaning up sessions:', error);
    }
}

// Manual debug function
async function debugUser(client, guildId, userId) {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            logger.error(`❌ Guild ${guildId} not found`);
            return;
        }
        
        const member = await guild.members.fetch(userId);
        if (!member) {
            logger.error(`❌ Member ${userId} not found`);
            return;
        }
        
        logger.info(`🔍 === DEBUG: ${member.user.tag} ===`);
        logger.info(`📊 Status: ${member.presence?.status || 'offline'}`);
        
        if (member.presence?.activities && member.presence.activities.length > 0) {
            member.presence.activities.forEach((activity, index) => {
                logger.info(`📱 Activity ${index + 1}: "${activity.name}" (type: ${activity.type})`);
            });
        } else {
            logger.info(`📱 No activities detected`);
        }
        
        // Check against tracked games
        const panels = await getAllPlayersPanels();
        const guildPanels = panels.filter(panel => panel.guild_id === guildId);
        
        logger.info(`🎮 Checking ${guildPanels.length} tracked games:`);
        for (const panel of guildPanels) {
            const isPlaying = isPlayingGame(member.presence?.activities, panel.game_name);
            logger.info(`  ${panel.game_name}: ${isPlaying ? '✅ PLAYING' : '❌ NOT PLAYING'}`);
        }
        
    } catch (error) {
        logger.error('❌ Debug error:', error);
    }
}

module.exports = {
    updatePlayersPanels,
    handlePresenceUpdate,
    cleanupSessions,
    debugUser
};
