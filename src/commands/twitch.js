
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { 
    getServerSettings, 
    updateServerSetting, 
    getTwitchStreamers, 
    addTwitchStreamer, 
    removeTwitchStreamer 
} = require('../database');
const { 
    isValidTwitchUrl, 
    extractTwitchUsername, 
    validateTwitchChannel 
} = require('../services/twitchNotify');
const { 
    createSuccessEmbed, 
    createErrorEmbed, 
    createTwitchListEmbed,
    createWarningEmbed 
} = require('../utils/embedStyles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('twitch')
        .setDescription('Manage Twitch stream integration')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add your Twitch stream')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('Your Twitch channel URL or username')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove your Twitch stream')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all streamers in this server')
        )
        .addSubcommandGroup(group =>
            group
                .setName('admin')
                .setDescription('Admin commands for Twitch integration')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('enable')
                        .setDescription('Enable Twitch features for this server')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('disable')
                        .setDescription('Disable Twitch features for this server')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a Twitch stream for a user')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('The user to add a stream for')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName('url')
                                .setDescription('The Twitch channel URL or username')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a user\'s Twitch stream')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('The user to remove the stream for')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('setchannel')
                        .setDescription('Set the channel for stream notifications')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('The channel for stream notifications')
                                .setRequired(true)
                        )
                )
        ),

    async execute(interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        try {
            if (subcommandGroup === 'admin') {
                // Check admin permissions
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    const embed = createErrorEmbed(
                        'Permission Denied',
                        'You need the "Manage Server" permission to use admin commands.'
                    );
                    
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }

                await handleAdminCommands(interaction, subcommand, guildId);
            } else {
                await handleUserCommands(interaction, subcommand, guildId, userId);
            }

        } catch (error) {
            console.error('Error executing twitch command:', error);
            
            const embed = createErrorEmbed(
                'Error',
                'An error occurred while processing your request. Please try again.'
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },
};

async function handleUserCommands(interaction, subcommand, guildId, userId) {
    const settings = await getServerSettings(guildId);

    if (!settings.twitch_enabled) {
        const embed = createWarningEmbed(
            'Twitch Features Disabled',
            'Twitch integration is currently disabled for this server. Contact an admin to enable it.'
        );
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    switch (subcommand) {
        case 'add':
            await handleAddStream(interaction, guildId, userId);
            break;
        case 'remove':
            await handleRemoveStream(interaction, guildId, userId);
            break;
        case 'list':
            await handleListStreamers(interaction, guildId);
            break;
    }
}

async function handleAdminCommands(interaction, subcommand, guildId) {
    switch (subcommand) {
        case 'enable':
            await updateServerSetting(guildId, 'twitch_enabled', 1);
            
            const enableEmbed = createSuccessEmbed(
                '✅ Twitch Features Enabled',
                'Users can now add their Twitch streams and receive notifications.'
            );
            
            await interaction.reply({ embeds: [enableEmbed] });
            break;

        case 'disable':
            await updateServerSetting(guildId, 'twitch_enabled', 0);
            
            const disableEmbed = createSuccessEmbed(
                '❌ Twitch Features Disabled',
                'Twitch integration has been disabled. Stream notifications will stop.'
            );
            
            await interaction.reply({ embeds: [disableEmbed] });
            break;

        case 'add':
            await handleAdminAddStream(interaction, guildId);
            break;

        case 'remove':
            await handleAdminRemoveStream(interaction, guildId);
            break;

        case 'setchannel':
            await handleSetNotificationChannel(interaction, guildId);
            break;
    }
}

async function handleAddStream(interaction, guildId, userId) {
    const url = interaction.options.getString('url');
    
    if (!isValidTwitchUrl(url)) {
        const embed = createErrorEmbed(
            'Invalid URL',
            'Please provide a valid Twitch URL (e.g., `https://twitch.tv/username` or just `username`).'
        );
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    const username = extractTwitchUsername(url);
    const fullUrl = url.startsWith('http') ? url : `https://twitch.tv/${username}`;

    // Validate the Twitch channel exists
    const isValid = await validateTwitchChannel(fullUrl);
    if (!isValid) {
        const embed = createErrorEmbed(
            'Channel Not Found',
            'The specified Twitch channel could not be found. Please check the URL and try again.'
        );
        
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    // Add to database
    await addTwitchStreamer(guildId, userId, username, fullUrl);

    const embed = createSuccessEmbed(
        '📺 Stream Added',
        `Your Twitch stream has been added: **${username}**\n\nYou'll receive notifications when you go live!`
    );

    await interaction.editReply({ embeds: [embed] });
}

async function handleRemoveStream(interaction, guildId, userId) {
    const result = await removeTwitchStreamer(guildId, userId);
    
    if (result.changes === 0) {
        const embed = createWarningEmbed(
            'No Stream Found',
            'You don\'t have a Twitch stream registered in this server.'
        );
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const embed = createSuccessEmbed(
        '📺 Stream Removed',
        'Your Twitch stream has been removed from this server.'
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleListStreamers(interaction, guildId) {
    const streamers = await getTwitchStreamers(guildId);
    const embed = createTwitchListEmbed(streamers, interaction.guild.name);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleAdminAddStream(interaction, guildId) {
    const user = interaction.options.getUser('user');
    const url = interaction.options.getString('url');
    
    if (!isValidTwitchUrl(url)) {
        const embed = createErrorEmbed(
            'Invalid URL',
            'Please provide a valid Twitch URL.'
        );
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    await interaction.deferReply();

    const username = extractTwitchUsername(url);
    const fullUrl = url.startsWith('http') ? url : `https://twitch.tv/${username}`;

    // Validate the Twitch channel exists
    const isValid = await validateTwitchChannel(fullUrl);
    if (!isValid) {
        const embed = createErrorEmbed(
            'Channel Not Found',
            'The specified Twitch channel could not be found.'
        );
        
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    // Add to database
    await addTwitchStreamer(guildId, user.id, username, fullUrl, interaction.user.id);

    const embed = createSuccessEmbed(
        '📺 Stream Added (Admin)',
        `Added Twitch stream for ${user}: **${username}**`
    );

    await interaction.editReply({ embeds: [embed] });
}

async function handleAdminRemoveStream(interaction, guildId) {
    const user = interaction.options.getUser('user');
    const result = await removeTwitchStreamer(guildId, user.id);
    
    if (result.changes === 0) {
        const embed = createWarningEmbed(
            'No Stream Found',
            `${user} doesn't have a Twitch stream registered in this server.`
        );
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const embed = createSuccessEmbed(
        '📺 Stream Removed (Admin)',
        `Removed Twitch stream for ${user}.`
    );

    await interaction.reply({ embeds: [embed] });
}

async function handleSetNotificationChannel(interaction, guildId) {
    const channel = interaction.options.getChannel('channel');
    
    // Check if bot has permissions
    const botMember = interaction.guild.members.me;
    const permissions = channel.permissionsFor(botMember);
    
    if (!permissions.has(['SendMessages', 'EmbedLinks'])) {
        const embed = createErrorEmbed(
            'Permission Error',
            `I don't have permission to send messages in ${channel}. Please check my permissions.`
        );
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    await updateServerSetting(guildId, 'twitch_channel_id', channel.id);

    const embed = createSuccessEmbed(
        '📺 Notification Channel Set',
        `Stream notifications will now be sent to ${channel}.`
    );

    await interaction.reply({ embeds: [embed] });
}
