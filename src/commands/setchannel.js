const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addAPBPanel, removeAPBPanel, addPlayersPanel, removePlayersPanel } = require('../database');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embedStyles');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('Configure channels for bot notifications and panels')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to configure')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of panel to set up')
                .setRequired(true)
                .addChoices(
                    { name: 'APB Population', value: 'apb' },
                    { name: 'Players Tracking', value: 'players' }
                ))
        .addStringOption(option =>
            option.setName('region')
                .setDescription('APB region (only for APB Population type)')
                .setRequired(false)
                .addChoices(
                    { name: 'Citadel', value: 'Citadel' },
                    { name: 'Jericho', value: 'Jericho' },
                    { name: 'Both Regions', value: 'Both' }
                ))
        .addStringOption(option =>
            option.setName('game')
                .setDescription('Game to track players for (only for Players Tracking type)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform')
                .setRequired(false)
                .addChoices(
                    { name: 'Set/Update', value: 'set' },
                    { name: 'Remove', value: 'remove' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            const type = interaction.options.getString('type');
            const region = interaction.options.getString('region');
            const game = interaction.options.getString('game');
            const action = interaction.options.getString('action') || 'set';

            // Validate channel type
            if (channel.type !== 0) { // TEXT_CHANNEL
                const embed = createErrorEmbed('Invalid Channel', 'Please select a text channel.');
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Check bot permissions in the target channel
            const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
            const permissions = channel.permissionsFor(botMember);
            
            if (!permissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                const embed = createErrorEmbed(
                    'Missing Permissions',
                    `I need the following permissions in ${channel}:\n• View Channel\n• Send Messages\n• Embed Links`
                );
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (type === 'apb') {
                await handleAPBPanel(interaction, channel, region, action);
            } else if (type === 'players') {
                await handlePlayersPanel(interaction, channel, game, action);
            }

        } catch (error) {
            logger.error('Error in setchannel command:', error);
            const embed = createErrorEmbed('Command Error', 'An error occurred while processing your request.');
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    }
};

async function handleAPBPanel(interaction, channel, region, action) {
    if (!region) {
        const embed = createErrorEmbed('Missing Region', 'Please specify a region for APB population tracking.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (action === 'remove') {
        try {
            await removeAPBPanel(interaction.guild.id, channel.id);
            const embed = createSuccessEmbed(
                'APB Panel Removed',
                `APB population panel has been removed from ${channel}.`
            );
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error removing APB panel:', error);
            const embed = createErrorEmbed('Error', 'Failed to remove APB panel.');
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        return;
    }

    // Set/Update APB panel
    try {
        await addAPBPanel(interaction.guild.id, channel.id, region);
        
        const embed = createSuccessEmbed(
            'APB Panel Configured',
            `APB population panel has been set up in ${channel}.\n\n` +
            `**Region:** ${region}\n` +
            `**Updates:** Every 5 minutes\n\n` +
            `The panel will appear shortly with current population data.`
        );
        
        embed.addFields({
            name: '📊 Features',
            value: '• Real-time population tracking\n• Server status monitoring\n• Historical data trends\n• Automatic updates',
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        logger.error('Error setting up APB panel:', error);
        const embed = createErrorEmbed('Setup Error', 'Failed to set up APB population panel.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

async function handlePlayersPanel(interaction, channel, game, action) {
    if (!game) {
        const embed = createErrorEmbed(
            'Missing Game Name', 
            'Please specify a game name for player tracking.\n\n' +
            '**Examples:**\n' +
            '• `Valorant`\n' +
            '• `APB Reloaded`\n' +
            '• `League of Legends`\n' +
            '• `Minecraft`'
        );
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (action === 'remove') {
        try {
            await removePlayersPanel(interaction.guild.id, channel.id, game);
            const embed = createSuccessEmbed(
                'Players Panel Removed',
                `Player tracking panel for **${game}** has been removed from ${channel}.`
            );
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error removing players panel:', error);
            const embed = createErrorEmbed('Error', 'Failed to remove players panel.');
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        return;
    }

    // Set/Update players panel
    try {
        await addPlayersPanel(interaction.guild.id, channel.id, game);
        
        const embed = createSuccessEmbed(
            'Players Panel Configured',
            `Player tracking panel has been set up in ${channel}.\n\n` +
            `**Game:** ${game}\n` +
            `**Updates:** Every 5 minutes\n` +
            `**Tracking:** Real-time presence detection\n\n` +
            `The panel will appear shortly and will automatically track when members play **${game}**.`
        );
        
        embed.addFields(
            {
                name: '🎮 Features',
                value: '• Real-time player tracking\n• Play duration monitoring\n• Clan vs Community separation\n• Session statistics',
                inline: true
            },
            {
                name: '📊 Display Info',
                value: '• Player avatars & names\n• Current play duration\n• Game icons\n• Activity status',
                inline: true
            }
        );

        embed.addFields({
            name: '💡 How It Works',
            value: `The bot monitors Discord presence and automatically detects when members are playing **${game}**. ` +
                   `It tracks session duration and updates the panel every 5 minutes with current players.`,
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        logger.error('Error setting up players panel:', error);
        const embed = createErrorEmbed('Setup Error', 'Failed to set up players tracking panel.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
