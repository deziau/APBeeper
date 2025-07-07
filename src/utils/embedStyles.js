
const { EmbedBuilder } = require('discord.js');

const COLORS = {
    PRIMARY: 0x00AE86,      // Teal
    SUCCESS: 0x00FF00,      // Green
    WARNING: 0xFFAA00,      // Orange
    ERROR: 0xFF0000,        // Red
    INFO: 0x0099FF,         // Blue
    APB_CRIM: 0xFF4444,     // Red for Criminals
    APB_ENF: 0x4444FF,      // Blue for Enforcers
    TWITCH: 0x9146FF        // Twitch Purple
};

function createBaseEmbed(title, description = null, color = COLORS.PRIMARY) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTimestamp();
    
    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    
    return embed;
}

function createSuccessEmbed(title, description = null) {
    return createBaseEmbed(title, description, COLORS.SUCCESS);
}

function createErrorEmbed(title, description = null) {
    return createBaseEmbed(title, description, COLORS.ERROR);
}

function createWarningEmbed(title, description = null) {
    return createBaseEmbed(title, description, COLORS.WARNING);
}

function createInfoEmbed(title, description = null) {
    return createBaseEmbed(title, description, COLORS.INFO);
}

function createAPBPopulationEmbed(populationData, region) {
    const embed = createBaseEmbed(
        `🎮 APB Population - ${region}`,
        null,
        COLORS.PRIMARY
    );

    if (!populationData || populationData.length === 0) {
        embed.setDescription('❌ Unable to fetch population data or servers are offline.');
        return embed;
    }

    let totalPlayers = 0;
    let totalCrims = 0;
    let totalEnfs = 0;
    const districts = [];

    populationData.forEach(server => {
        if (server.population && server.population > 0) {
            totalPlayers += server.population;
            
            // Add district info
            const crimCount = Math.floor(server.population * 0.5); // Approximate split
            const enfCount = server.population - crimCount;
            
            totalCrims += crimCount;
            totalEnfs += enfCount;
            
            districts.push({
                name: server.name,
                population: server.population,
                crims: crimCount,
                enfs: enfCount
            });
        }
    });

    if (totalPlayers === 0) {
        embed.setDescription('🔴 All servers appear to be offline or empty.');
        return embed;
    }

    // Add total population field
    embed.addFields({
        name: '📊 Total Population',
        value: `**${totalPlayers}** players online\n🔴 **${totalCrims}** Criminals\n🔵 **${totalEnfs}** Enforcers`,
        inline: false
    });

    // Add district breakdown
    if (districts.length > 0) {
        const districtText = districts
            .sort((a, b) => b.population - a.population)
            .map(district => 
                `**${district.name}**: ${district.population} (🔴${district.crims} | 🔵${district.enfs})`
            )
            .join('\n');

        embed.addFields({
            name: '🏙️ Active Districts',
            value: districtText,
            inline: false
        });
    }

    embed.setFooter({ text: 'Updates every 5 minutes' });
    
    return embed;
}

function createPlayersEmbed(clanPlayers, communityPlayers, gameName, clanRoleName) {
    const embed = createBaseEmbed(
        `🎮 Players Online - ${gameName}`,
        null,
        COLORS.PRIMARY
    );

    const totalPlayers = clanPlayers.length + communityPlayers.length;

    if (totalPlayers === 0) {
        embed.setDescription(`No one is currently playing **${gameName}**.`);
        return embed;
    }

    embed.setDescription(`**${totalPlayers}** ${totalPlayers === 1 ? 'player' : 'players'} currently online`);

    // Add clan members section
    if (clanPlayers.length > 0) {
        const clanList = clanPlayers
            .map(player => `• ${player.displayName}`)
            .join('\n');
        
        embed.addFields({
            name: `👑 ${clanRoleName || 'Clan Members'} (${clanPlayers.length})`,
            value: clanList,
            inline: false
        });
    }

    // Add community members section
    if (communityPlayers.length > 0) {
        const communityList = communityPlayers
            .map(player => `• ${player.displayName}`)
            .join('\n');
        
        embed.addFields({
            name: `🌟 Community Members (${communityPlayers.length})`,
            value: communityList,
            inline: false
        });
    }

    embed.setFooter({ text: 'Based on Discord status' });
    
    return embed;
}

function createTwitchEmbed(streamer, streamData) {
    const embed = createBaseEmbed(
        `🔴 ${streamer.username} is now live!`,
        null,
        COLORS.TWITCH
    );

    if (streamData) {
        if (streamData.title) {
            embed.addFields({
                name: '📺 Stream Title',
                value: streamData.title,
                inline: false
            });
        }

        if (streamData.game) {
            embed.addFields({
                name: '🎮 Playing',
                value: streamData.game,
                inline: true
            });
        }

        if (streamData.viewers !== undefined) {
            embed.addFields({
                name: '👥 Viewers',
                value: streamData.viewers.toString(),
                inline: true
            });
        }

        if (streamData.thumbnail) {
            embed.setImage(streamData.thumbnail);
        }
    }

    embed.addFields({
        name: '🔗 Watch Stream',
        value: `[Click here to watch](${streamer.twitch_url})`,
        inline: false
    });

    embed.setFooter({ text: 'Stream notification' });
    
    return embed;
}

function createTwitchListEmbed(streamers, guildName) {
    const embed = createBaseEmbed(
        `📺 Twitch Streamers - ${guildName}`,
        null,
        COLORS.TWITCH
    );

    if (streamers.length === 0) {
        embed.setDescription('No streamers have been added yet.\nUse `/twitch add <url>` to add your stream!');
        return embed;
    }

    const liveStreamers = streamers.filter(s => s.is_live);
    const offlineStreamers = streamers.filter(s => !s.is_live);

    if (liveStreamers.length > 0) {
        const liveList = liveStreamers
            .map(s => `🔴 **${s.username}** - [Watch](${s.twitch_url})`)
            .join('\n');
        
        embed.addFields({
            name: `🔴 Live Now (${liveStreamers.length})`,
            value: liveList,
            inline: false
        });
    }

    if (offlineStreamers.length > 0) {
        const offlineList = offlineStreamers
            .map(s => `⚫ ${s.username} - [Channel](${s.twitch_url})`)
            .join('\n');
        
        embed.addFields({
            name: `⚫ Offline (${offlineStreamers.length})`,
            value: offlineList,
            inline: false
        });
    }

    embed.setFooter({ text: 'Stream status updates automatically' });
    
    return embed;
}

module.exports = {
    COLORS,
    createBaseEmbed,
    createSuccessEmbed,
    createErrorEmbed,
    createWarningEmbed,
    createInfoEmbed,
    createAPBPopulationEmbed,
    createPlayersEmbed,
    createTwitchEmbed,
    createTwitchListEmbed
};
