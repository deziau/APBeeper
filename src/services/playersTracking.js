const { EmbedBuilder } = require('discord.js');
const { getAllPlayersPanels, updatePlayersPanelMessage, getActivePlayerSessions, startPlayerSession, endPlayerSession, cleanupOldSessions } = require('../database');
const { getGameIcon, formatDuration } = require('../utils/gameUtils');
const { createPlayersEmbed } = require('../utils/embedStyles');
const logger = require('../utils/logger');

// Track active sessions in memory for faster lookups
const activeSessions = new Map();

async function updatePlayersPanels(client) {
    try {
        const panels = await getAllPlayersPanels();
        
        for (const panel of panels) {
            try {
                const guild = client.guilds.cache.get(panel.guild_id);
                if (!guild) continue;
                
                const channel = guild.channels.cache.get(panel.channel_id);
                if (!channel) continue;
                
                // Get active sessions for this game
                const sessions = await getActivePlayerSessions(panel.guild_id, panel.game_name);
                
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
                        }
                    } catch (error) {
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
                    } catch (error) {
                        // Message was deleted, create new one
                        const newMessage = await channel.send({ embeds: [embed] });
                        await updatePlayersPanelMessage(panel.id, newMessage.id);
                    }
                } else {
                    const newMessage = await channel.send({ embeds: [embed] });
                    await updatePlayersPanelMessage(panel.id, newMessage.id);
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
        
        // Get all panels for this guild
        const panels = await getAllPlayersPanels();
        const guildPanels = panels.filter(panel => panel.guild_id === guild.id);
        
        if (guildPanels.length === 0) return;
        
        // Check each game being tracked
        for (const panel of guildPanels) {
            const gameName = panel.game_name.toLowerCase();
            
            // Check if user is currently playing the tracked game
            const isPlayingGame = newPresence.activities?.some(activity => 
                activity.type === 0 && // Playing activity
                activity.name.toLowerCase().includes(gameName)
            );
            
            // Check if user was playing the game before
            const wasPlayingGame = oldPresence?.activities?.some(activity => 
                activity.type === 0 && // Playing activity
                activity.name.toLowerCase().includes(gameName)
            );
            
            const sessionKey = `${userId}-${guild.id}-${panel.game_name}`;
            
            if (isPlayingGame && !wasPlayingGame) {
                // User started playing the game
                await startPlayerSession(userId, guild.id, panel.game_name);
                activeSessions.set(sessionKey, Date.now());
                logger.info(`User ${newPresence.user.tag} started playing ${panel.game_name} in ${guild.name}`);
                
            } else if (!isPlayingGame && wasPlayingGame) {
                // User stopped playing the game
                await endPlayerSession(userId, guild.id, panel.game_name);
                activeSessions.delete(sessionKey);
                logger.info(`User ${newPresence.user.tag} stopped playing ${panel.game_name} in ${guild.name}`);
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

module.exports = {
    updatePlayersPanels,
    handlePresenceUpdate,
    cleanupSessions,
    getPlayerStats
};
