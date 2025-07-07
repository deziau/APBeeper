
const { getServerSettings } = require('../database');
const logger = require('../utils/logger');

/**
 * Get members currently playing a specific game based on Discord status
 */
async function getPlayersFromStatus(guild, gameName, clanRoleId = null) {
    try {
        // Fetch all members with their presence
        await guild.members.fetch();
        
        const clanPlayers = [];
        const communityPlayers = [];
        
        guild.members.cache.forEach(member => {
            // Skip bots
            if (member.user.bot) return;
            
            // Check if member has presence and is playing the game
            const presence = member.presence;
            if (!presence || !presence.activities) return;
            
            const isPlayingGame = presence.activities.some(activity => {
                return activity.name && activity.name.toLowerCase().includes(gameName.toLowerCase());
            });
            
            if (isPlayingGame) {
                const playerInfo = {
                    id: member.id,
                    username: member.user.username,
                    displayName: member.displayName,
                    avatar: member.user.displayAvatarURL()
                };
                
                // Check if member has clan role
                if (clanRoleId && member.roles.cache.has(clanRoleId)) {
                    clanPlayers.push(playerInfo);
                } else {
                    communityPlayers.push(playerInfo);
                }
            }
        });
        
        // Sort players alphabetically
        clanPlayers.sort((a, b) => a.displayName.localeCompare(b.displayName));
        communityPlayers.sort((a, b) => a.displayName.localeCompare(b.displayName));
        
        return {
            clanPlayers,
            communityPlayers,
            total: clanPlayers.length + communityPlayers.length
        };
        
    } catch (error) {
        logger.error('Error fetching players from Discord status:', error);
        return {
            clanPlayers: [],
            communityPlayers: [],
            total: 0
        };
    }
}

/**
 * Get clan role name from role ID
 */
function getClanRoleName(guild, clanRoleId) {
    if (!clanRoleId) return null;
    
    const role = guild.roles.cache.get(clanRoleId);
    return role ? role.name : null;
}

/**
 * Validate if a role exists in the guild
 */
function validateClanRole(guild, roleId) {
    if (!roleId) return false;
    return guild.roles.cache.has(roleId);
}

/**
 * Search for a role by name (case-insensitive)
 */
function findRoleByName(guild, roleName) {
    return guild.roles.cache.find(role => 
        role.name.toLowerCase() === roleName.toLowerCase()
    );
}

/**
 * Get all members with a specific role
 */
async function getMembersWithRole(guild, roleId) {
    try {
        await guild.members.fetch();
        
        const membersWithRole = guild.members.cache.filter(member => 
            member.roles.cache.has(roleId)
        );
        
        return Array.from(membersWithRole.values()).map(member => ({
            id: member.id,
            username: member.user.username,
            displayName: member.displayName,
            avatar: member.user.displayAvatarURL()
        }));
        
    } catch (error) {
        logger.error('Error fetching members with role:', error);
        return [];
    }
}

/**
 * Get detailed presence information for a member
 */
function getMemberPresenceDetails(member) {
    const presence = member.presence;
    if (!presence) return null;
    
    const activities = presence.activities.map(activity => ({
        name: activity.name,
        type: activity.type,
        details: activity.details,
        state: activity.state,
        timestamps: activity.timestamps
    }));
    
    return {
        status: presence.status,
        activities: activities
    };
}

module.exports = {
    getPlayersFromStatus,
    getClanRoleName,
    validateClanRole,
    findRoleByName,
    getMembersWithRole,
    getMemberPresenceDetails
};
