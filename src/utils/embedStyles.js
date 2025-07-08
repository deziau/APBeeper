const { EmbedBuilder } = require('discord.js');
const { getGameIcon, formatShortDuration, getActivityEmoji } = require('./gameUtils');

// Discord color constants
const COLORS = {
    PRIMARY: 0x5865F2,    // Discord Blurple
    SUCCESS: 0x57F287,    // Green
    WARNING: 0xFEE75C,    // Yellow
    ERROR: 0xED4245,      // Red
    SECONDARY: 0x99AAB5,  // Gray
    APB_CITADEL: 0xFF6B35, // Orange for Citadel
    APB_JERICHO: 0x4ECDC4, // Teal for Jericho
    GAME_ONLINE: 0x57F287, // Green for online players
    GAME_IDLE: 0xFEE75C    // Yellow for idle
};

/**
 * Create a success embed
 */
function createSuccessEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create an error embed
 */
function createErrorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create a warning embed
 */
function createWarningEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setTitle(`⚠️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create an info embed
 */
function createInfoEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create APB population embed
 */
function createAPBEmbed(populationData, region) {
    const embed = new EmbedBuilder()
        .setTitle('🎮 APB: All Points Bulletin - Population')
        .setColor(region === 'Citadel' ? COLORS.APB_CITADEL : 
                 region === 'Jericho' ? COLORS.APB_JERICHO : COLORS.PRIMARY)
        .setTimestamp()
        .setFooter({ text: 'Updates every 5 minutes' });

    if (region === 'Both') {
        // Both regions
        embed.setDescription('Current population across all APB servers');
        
        if (populationData.citadel) {
            embed.addFields({
                name: '🟠 Citadel',
                value: `**${populationData.citadel.total || 0}** players online\n` +
                       `Enforcers: ${populationData.citadel.enforcers || 0}\n` +
                       `Criminals: ${populationData.citadel.criminals || 0}`,
                inline: true
            });
        }
        
        if (populationData.jericho) {
            embed.addFields({
                name: '🔵 Jericho',
                value: `**${populationData.jericho.total || 0}** players online\n` +
                       `Enforcers: ${populationData.jericho.enforcers || 0}\n` +
                       `Criminals: ${populationData.jericho.criminals || 0}`,
                inline: true
            });
        }
        
        const totalPlayers = (populationData.citadel?.total || 0) + (populationData.jericho?.total || 0);
        embed.addFields({
            name: '📊 Total Population',
            value: `**${totalPlayers}** players across all servers`,
            inline: false
        });
        
    } else {
        // Single region
        const data = populationData[region.toLowerCase()] || {};
        embed.setDescription(`Current population on ${region} server`);
        
        embed.addFields(
            {
                name: '👥 Total Players',
                value: `**${data.total || 0}**`,
                inline: true
            },
            {
                name: '🔵 Enforcers',
                value: `${data.enforcers || 0}`,
                inline: true
            },
            {
                name: '🔴 Criminals',
                value: `${data.criminals || 0}`,
                inline: true
            }
        );
        
        if (data.districts && data.districts.length > 0) {
            const districtInfo = data.districts
                .map(district => `${district.name}: ${district.population}`)
                .join('\n');
            
            embed.addFields({
                name: '🏙️ Districts',
                value: districtInfo,
                inline: false
            });
        }
    }

    return embed;
}

/**
 * Create players tracking embed
 */
async function createPlayersEmbed(gameName, playersData, guild) {
    try {
        const gameIcon = await getGameIcon(gameName);
        
        const embed = new EmbedBuilder()
            .setTitle(`🎮 ${gameName} Players`)
            .setColor(COLORS.GAME_ONLINE)
            .setThumbnail(gameIcon)
            .setTimestamp()
            .setFooter({ text: 'Updates every 5 minutes • Live tracking via Discord presence' });

        if (playersData.length === 0) {
            embed.setDescription(`No one is currently playing **${gameName}** 😴\n\nThe panel will automatically update when members start playing!`);
            embed.setColor(COLORS.SECONDARY);
            return embed;
        }

        // Separate clan members from regular members
        const clanMembers = [];
        const communityMembers = [];
        
        // Check if guild has a clan role (you can customize this logic)
        const clanRoleNames = ['clan', 'member', 'officer', 'leader', 'admin'];
        
        for (const playerData of playersData) {
            const hasRole = playerData.member.roles.cache.some(role => 
                clanRoleNames.some(clanRole => 
                    role.name.toLowerCase().includes(clanRole)
                )
            );
            
            if (hasRole) {
                clanMembers.push(playerData);
            } else {
                communityMembers.push(playerData);
            }
        }

        // Sort by play duration (longest first)
        clanMembers.sort((a, b) => b.duration - a.duration);
        communityMembers.sort((a, b) => b.duration - a.duration);

        const totalPlayers = playersData.length;
        embed.setDescription(`**${totalPlayers}** ${totalPlayers === 1 ? 'player' : 'players'} currently online`);

        // Add clan members section
        if (clanMembers.length > 0) {
            const clanList = clanMembers
                .slice(0, 10) // Limit to 10 to avoid embed limits
                .map(player => {
                    const emoji = getActivityEmoji(player.duration);
                    const duration = formatShortDuration(player.duration);
                    return `${emoji} ${player.user.displayName} - ${duration}`;
                })
                .join('\n');

            embed.addFields({
                name: `👑 Clan Members (${clanMembers.length})`,
                value: clanList,
                inline: false
            });
        }

        // Add community members section
        if (communityMembers.length > 0) {
            const communityList = communityMembers
                .slice(0, 10) // Limit to 10 to avoid embed limits
                .map(player => {
                    const emoji = getActivityEmoji(player.duration);
                    const duration = formatShortDuration(player.duration);
                    return `${emoji} ${player.user.displayName} - ${duration}`;
                })
                .join('\n');

            embed.addFields({
                name: `👥 Community (${communityMembers.length})`,
                value: communityList,
                inline: false
            });
        }

        // Add session statistics if there are multiple players
        if (playersData.length > 1) {
            const durations = playersData.map(p => p.duration);
            const longestSession = Math.max(...durations);
            const averageSession = durations.reduce((sum, dur) => sum + dur, 0) / durations.length;

            embed.addFields({
                name: '📊 Session Stats',
                value: `Longest: ${formatShortDuration(longestSession)} | Average: ${formatShortDuration(averageSession)}`,
                inline: false
            });
        }

        // Add legend
        embed.addFields({
            name: '🔍 Legend',
            value: '🟢 Just started • 🟡 Active • 🟠 Long session • 🔴 Marathon',
            inline: false
        });

        return embed;
        
    } catch (error) {
        console.error('Error creating players embed:', error);
        
        // Fallback embed
        return new EmbedBuilder()
            .setTitle(`🎮 ${gameName} Players`)
            .setDescription('Error loading player data. Please try again later.')
            .setColor(COLORS.ERROR)
            .setTimestamp();
    }
}

/**
 * Create Twitch notification embed
 */
function createTwitchEmbed(streamData) {
    const embed = new EmbedBuilder()
        .setTitle(`🔴 ${streamData.user_name} is now live!`)
        .setDescription(streamData.title)
        .setColor(0x9146FF) // Twitch purple
        .setURL(`https://twitch.tv/${streamData.user_login}`)
        .setThumbnail(streamData.thumbnail_url?.replace('{width}', '320').replace('{height}', '180'))
        .addFields(
            {
                name: '🎮 Game',
                value: streamData.game_name || 'Unknown',
                inline: true
            },
            {
                name: '👥 Viewers',
                value: streamData.viewer_count?.toString() || '0',
                inline: true
            }
        )
        .setTimestamp(new Date(streamData.started_at))
        .setFooter({ text: 'Started streaming' });

    return embed;
}

module.exports = {
    createSuccessEmbed,
    createErrorEmbed,
    createWarningEmbed,
    createInfoEmbed,
    createAPBEmbed,
    createPlayersEmbed,
    createTwitchEmbed,
    COLORS
};
