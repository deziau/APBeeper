const { EmbedBuilder } = require('discord.js');
const { getGameIcon, formatDuration } = require('./gameUtils');
const logger = require('./logger');

// Color constants
const COLORS = {
    SUCCESS: 0x00ff00,
    ERROR: 0xff0000,
    INFO: 0x0099ff,
    WARNING: 0xffaa00,
    PLAYERS: 0x7289da,
    GAME: 0x9932cc
};

function createSuccessEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function createErrorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function createInfoEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function createWarningEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setTitle(`⚠️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

async function createPlayersEmbed(gameName, playersData, guild) {
    try {
        const embed = new EmbedBuilder()
            .setColor(COLORS.PLAYERS)
            .setTimestamp();

        // Get game icon
        let gameIcon;
        try {
            gameIcon = await getGameIcon(gameName);
        } catch (error) {
            logger.warn(`Could not get icon for ${gameName}:`, error);
            gameIcon = '🎮'; // Fallback emoji
        }

        // Set title and thumbnail
        embed.setTitle(`${gameIcon} ${gameName} - Players Online`);
        
        if (typeof gameIcon === 'string' && gameIcon.startsWith('http')) {
            embed.setThumbnail(gameIcon);
        }

        if (!playersData || playersData.length === 0) {
            embed.setDescription(`No one is currently playing **${gameName}**.`);
            embed.addFields({
                name: '📊 Statistics',
                value: '• **Active Players:** 0\n• **Total Sessions:** 0\n• **Longest Session:** N/A',
                inline: false
            });
            return embed;
        }

        // Sort players by play duration (longest first)
        playersData.sort((a, b) => b.duration - a.duration);

        // Separate clan members and community members
        const clanMembers = [];
        const communityMembers = [];

        for (const playerData of playersData) {
            try {
                const member = playerData.member;
                const user = playerData.user;
                const duration = playerData.duration;
                
                // Check if user is a clan member (has specific roles or nickname patterns)
                const isClanMember = member.roles.cache.some(role => 
                    role.name.toLowerCase().includes('clan') ||
                    role.name.toLowerCase().includes('member') ||
                    role.name.toLowerCase().includes('officer')
                ) || (member.nickname && member.nickname.includes('[SPPD]'));

                const playerInfo = {
                    name: member.displayName,
                    tag: user.tag,
                    avatar: user.displayAvatarURL({ size: 32 }),
                    duration: formatDuration(duration),
                    durationMs: duration
                };

                if (isClanMember) {
                    clanMembers.push(playerInfo);
                } else {
                    communityMembers.push(playerInfo);
                }
            } catch (error) {
                logger.warn('Error processing player data:', error);
            }
        }

        // Build description
        let description = '';
        
        if (clanMembers.length > 0) {
            description += '**🏛️ Clan Members:**\n';
            clanMembers.forEach(player => {
                description += `• **${player.name}** - ${player.duration}\n`;
            });
            description += '\n';
        }

        if (communityMembers.length > 0) {
            description += '**👥 Community Members:**\n';
            communityMembers.forEach(player => {
                description += `• **${player.name}** - ${player.duration}\n`;
            });
        }

        if (description === '') {
            description = `No one is currently playing **${gameName}**.`;
        }

        embed.setDescription(description);

        // Add statistics
        const totalPlayers = playersData.length;
        const longestSession = Math.max(...playersData.map(p => p.duration));
        const averageSession = playersData.reduce((sum, p) => sum + p.duration, 0) / totalPlayers;

        embed.addFields({
            name: '📊 Statistics',
            value: `• **Active Players:** ${totalPlayers}\n` +
                   `• **Clan Members:** ${clanMembers.length}\n` +
                   `• **Community:** ${communityMembers.length}\n` +
                   `• **Longest Session:** ${formatDuration(longestSession)}\n` +
                   `• **Average Session:** ${formatDuration(averageSession)}`,
            inline: true
        });

        // Add server info
        embed.addFields({
            name: '🏛️ Server Info',
            value: `• **Server:** ${guild.name}\n` +
                   `• **Total Members:** ${guild.memberCount}\n` +
                   `• **Last Updated:** <t:${Math.floor(Date.now() / 1000)}:R>`,
            inline: true
        });

        // Set footer
        embed.setFooter({
            text: `${guild.name} • Updates every 5 minutes`,
            iconURL: guild.iconURL() || undefined
        });

        return embed;

    } catch (error) {
        logger.error('Error creating players embed:', error);
        
        // Return error embed
        return new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle(`❌ Error Loading Player Data`)
            .setDescription(`Could not load player data for **${gameName}**.\nPlease try again later.`)
            .addFields({
                name: 'Error Details',
                value: error.message || 'Unknown error occurred',
                inline: false
            })
            .setTimestamp();
    }
}

module.exports = {
    createSuccessEmbed,
    createErrorEmbed,
    createInfoEmbed,
    createWarningEmbed,
    createPlayersEmbed,
    COLORS
};
