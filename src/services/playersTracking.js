const { EmbedBuilder } = require('discord.js');
const { getAllPlayersPanels, updatePlayersPanelMessage, getActivePlayerSessions, startPlayerSession, endPlayerSession, cleanupOldSessions } = require('../database');
const { getGameIcon, formatDuration, areGameNamesSimilar } = require('../utils/gameUtils');
const { createPlayersEmbed } = require('../utils/embedStyles');
const logger = require('../utils/logger');

// Track active sessions in memory for faster lookups
const activeSessions = new Map();

async function updatePlayersPanels(client) {
    try {
        const panels = await getAllPlayersPanels();
        logger.info(`Updating ${panels.length} player panels`);
        
        for (const panel of panels) {
            try {
                const guild = client.guilds.cache.get(panel.guild_id);
                if (!guild) {
                    logger.warn(`Guild ${panel.guild_id} not found`);
                    continue;
                }
                
                const channel = guild.channels.cache.get(panel.channel_id);
                if (!channel) {
                    logger.warn(`Channel ${panel.channel_id} not found in guild ${guild.name}`);
                    continue;
                }
                
                // Get active sessions for this game
                const sessions = await getActivePlayerSessions(panel.guild_id, panel.game_name);
                logger.info(`Found ${sessions.length} active sessions for ${panel.game_name} in ${guild.name}`);
                
                // Get user data for each session
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
                            logger.info(`Active player: ${member.user.tag} playing ${panel.game_name} for ${Math.floor(duration/60000)}m`);
                        }
                    } catch (error) {
                        logger.warn(`User ${session.user_id} not found in guild, ending session`);
                        // User might have left the server, end their session
                        await endPlayerSession(session.user_id, session.guild_id, session.game_name);
                    }
                }
                
                // Create embed
                const embed = await createPlayersEmbed(panel.game_name, playersData, guild);
                
                // Update or create message
                if (panel.message_id) {
                    try {
                        const message = await channel.messages.fetch(panel.message_id);
                        await message.edit({ embeds: [embed] });
                        logger.info(`Updated panel message for ${panel.game_name} in ${guild.name}`);
                    } catch (error) {
                        logger.warn(`Panel message ${panel.message_id} not found, creating new one`);
                        // Message was deleted, create new one
                        const newMessage = await channel.send({ embeds: [embed] });
                        await updatePlayersPanelMessage(panel.id, newMessage.id);
                        logger.info(`Created new panel message for ${panel.game_name} in ${guild.name}`);
                    }
                } else {
                    const newMessage = await channel.send({ embeds: [embed] });
                    await updatePlayersPanelMessage(panel.id, newMessage.id);
                    logger.info(`Created initial panel message for ${panel.game_name} in ${guild.name}`);
                }
                
            } catch (error) {
                logger.error(`Error updating players panel ${panel.id}:`, error);
            }
        }
        
    } catch (error) {
        logger.error('Error updating players panels:', error);
    }
}

async function handlePresenceUpdate(oldPresence, newPresence) {
    try {
        // Skip if no user or if it's a bot
        if (!newPresence?.user || newPresence.user.bot) return;
        
        const userId = newPresence.user.id;
        const guild = newPresence.guild;
        
        logger.info(`Presence update for ${newPresence.user.tag} in ${guild.name}`);
        
        // Log current activities
        if (newPresence.activities && newPresence.activities.length > 0) {
            newPresence.activities.forEach(activity => {
                logger.info(`  Activity: ${activity.name} (type: ${activity.type})`);
            });
        } else {
            logger.info(`  No activities detected`);
        }
        
        // Get all panels for this guild
        const panels = await getAllPlayersPanels();
        const guildPanels = panels.filter(panel => panel.guild_id === guild.id);
        
        if (guildPanels.length === 0) {
            logger.info(`No panels configured for guild ${guild.name}`);
            return;
        }
        
        logger.info(`Checking ${guildPanels.length} panels for guild ${guild.name}`);
        
        // Check each game being tracked
        for (const panel of guildPanels) {
            const gameName = panel.game_name;
            logger.info(`Checking panel for game: ${gameName}`);
            
            // Check if user is currently playing the tracked game
            const isPlayingGame = newPresence.activities?.some(activity => {
                const isGameActivity = activity.type === 0; // Playing activity
                const nameMatch = areGameNamesSimilar(activity.name, gameName);
                
                logger.info(`    Activity "${activity.name}" vs "${gameName}": type=${activity.type}, match=${nameMatch}`);
                
                return isGameActivity && nameMatch;
            });
            
            // Check if user was playing the game before
            const wasPlayingGame = oldPresence?.activities?.some(activity => {
                const isGameActivity = activity.type === 0; // Playing activity
                const nameMatch = areGameNamesSimilar(activity.name, gameName);
                return isGameActivity && nameMatch;
            });
            
            const sessionKey = `${userId}-${guild.id}-${panel.game_name}`;
            
            logger.info(`Game ${gameName}: was playing=${wasPlayingGame}, is playing=${isPlayingGame}`);
            
            if (isPlayingGame && !wasPlayingGame) {
                // User started playing the game
                try {
                    await startPlayerSession(userId, guild.id, panel.game_name);
                    activeSessions.set(sessionKey, Date.now());
                    logger.info(`✅ User ${newPresence.user.tag} started playing ${panel.game_name} in ${guild.name}`);
                } catch (error) {
                    logger.error(`Error starting session for ${newPresence.user.tag}:`, error);
                }
                
            } else if (!isPlayingGame && wasPlayingGame) {
                // User stopped playing the game
                try {
                    await endPlayerSession(userId, guild.id, panel.game_name);
                    activeSessions.delete(sessionKey);
                    logger.info(`❌ User ${newPresence.user.tag} stopped playing ${panel.game_name} in ${guild.name}`);
                } catch (error) {
                    logger.error(`Error ending session for ${newPresence.user.tag}:`, error);
                }
            }
        }
        
    } catch (error) {
        logger.error('Error handling presence update:', error);
    }
}

async function cleanupSessions() {
    try {
        await cleanupOldSessions();
        logger.info('Cleaned up old player sessions');
    } catch (error) {
        logger.error('Error cleaning up sessions:', error);
    }
}

// Get player statistics for a specific game and guild
async function getPlayerStats(guildId, gameName) {
    try {
        const sessions = await getActivePlayerSessions(guildId, gameName);
        
        if (sessions.length === 0) {
            return {
                totalPlayers: 0,
                longestSession: 0,
                averageSession: 0,
                totalPlaytime: 0
            };
        }
        
        const now = Date.now();
        const durations = sessions.map(session => {
            return now - new Date(session.started_at).getTime();
        });
        
        const totalPlaytime = durations.reduce((sum, duration) => sum + duration, 0);
        const longestSession = Math.max(...durations);
        const averageSession = totalPlaytime / durations.length;
        
        return {
            totalPlayers: sessions.length,
            longestSession,
            averageSession,
            totalPlaytime
        };
        
    } catch (error) {
        logger.error('Error getting player stats:', error);
        return {
            totalPlayers: 0,
            longestSession: 0,
            averageSession: 0,
            totalPlaytime: 0
        };
    }
}

// Debug function to manually check current presence
async function debugPresence(client, guildId, userId) {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            logger.error(`Guild ${guildId} not found`);
            return;
        }
        
        const member = await guild.members.fetch(userId);
        if (!member) {
            logger.error(`Member ${userId} not found`);
            return;
        }
        
        logger.info(`=== DEBUG PRESENCE FOR ${member.user.tag} ===`);
        logger.info(`Status: ${member.presence?.status || 'offline'}`);
        
        if (member.presence?.activities && member.presence.activities.length > 0) {
            member.presence.activities.forEach((activity, index) => {
                logger.info(`Activity ${index + 1}:`);
                logger.info(`  Name: ${activity.name}`);
                logger.info(`  Type: ${activity.type}`);
                logger.info(`  State: ${activity.state || 'N/A'}`);
                logger.info(`  Details: ${activity.details || 'N/A'}`);
            });
        } else {
            logger.info('No activities detected');
        }
        
        // Check panels
        const panels = await getAllPlayersPanels();
        const guildPanels = panels.filter(panel => panel.guild_id === guildId);
        
        logger.info(`=== CHECKING ${guildPanels.length} PANELS ===`);
        for (const panel of guildPanels) {
            logger.info(`Panel: ${panel.game_name}`);
            
            const isPlaying = member.presence?.activities?.some(activity => {
                const match = areGameNamesSimilar(activity.name, panel.game_name);
                logger.info(`  "${activity.name}" matches "${panel.game_name}": ${match}`);
                return activity.type === 0 && match;
            });
            
            logger.info(`  Is playing ${panel.game_name}: ${isPlaying}`);
        }
        
    } catch (error) {
        logger.error('Error in debug presence:', error);
    }
}

module.exports = {
    updatePlayersPanels,
    handlePresenceUpdate,
    cleanupSessions,
    getPlayerStats,
    debugPresence
};
