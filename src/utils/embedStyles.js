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

        // Set title with game icon
        embed.setTitle(`${gameIcon} ${gameName} - Players Online`);

        if (!playersData || playersData.length === 0) {
            embed.setDescription(`**No one is currently playing ${gameName}**\n\n*Panel updates every 5 minutes*`);
            embed.setFooter({
                text: `Last Updated`,
                iconURL: guild.iconURL() || undefined
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
                
                // Check if user is a clan member
                const isClanMember = member.roles.cache.some(role => 
                    role.name.toLowerCase().includes('clan') ||
                    role.name.toLowerCase().includes('member') ||
                    role.name.toLowerCase().includes('officer') ||
                    role.name.toLowerCase().includes('sppd')
                ) || (member.nickname && (
                    member.nickname.includes('[SPPD]') || 
                    member.nickname.includes('SPPD') ||
                    member.nickname.toLowerCase().includes('clan')
                ));

                const playerInfo = {
                    name: member.displayName,
                    tag: user.tag,
                    avatar: user.displayAvatarURL({ size: 32 }),
                    duration: formatDuration(duration),
                    durationMs: duration,
                    userId: user.id
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

        // Build main description with prominent player display
        let description = '';
        
        if (clanMembers.length > 0) {
            description += '## 🏛️ **Clan Members Online**\n';
            clanMembers.forEach((player, index) => {
                const position = index + 1;
                description += `### ${position}. **${player.name}**\n`;
                description += `⏱️ **Playing for:** ${player.duration}\n`;
                if (index < clanMembers.length - 1) description += '\n';
            });
            
            if (communityMembers.length > 0) {
                description += '\n\n';
            }
        }

        if (communityMembers.length > 0) {
            description += '## 👥 **Community Members Online**\n';
            communityMembers.forEach((player, index) => {
                const position = index + 1;
                description += `### ${position}. **${player.name}**\n`;
                description += `⏱️ **Playing for:** ${player.duration}\n`;
                if (index < communityMembers.length - 1) description += '\n';
            });
        }

        embed.setDescription(description);

        // Compact statistics section (much smaller)
        const totalPlayers = playersData.length;
        const longestSession = Math.max(...playersData.map(p => p.duration));
        
        embed.addFields({
            name: '📊 Quick Stats',
            value: `**${totalPlayers}** players • **${clanMembers.length}** clan • **${communityMembers.length}** community\n` +
                   `Longest session: **${formatDuration(longestSession)}**`,
            inline: false
        });

        // Footer with last updated (replaces server info)
        embed.setFooter({
            text: `Last Updated • Updates every 5 minutes`,
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
            .setFooter({
                text: `Last Updated`,
                iconURL: guild.iconURL() || undefined
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
