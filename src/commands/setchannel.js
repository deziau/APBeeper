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
                    { name: 'Players Tracking', value: 'players' }
                ))
        .addStringOption(option =>
            option.setName('game')
                .setDescription('Game to track players for')
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
            const game = interaction.options.getString('game');
            const action = interaction.options.getString('action') || 'set';

            // Validate channel type
            if (channel.type !== 0) { // TEXT_CHANNEL
                const embed = createErrorEmbed('Invalid Channel', 'Please select a text channel.');
                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: 64 // MessageFlags.Ephemeral
                });
            }

            // Check bot permissions in the target channel
            const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
            const permissions = channel.permissionsFor(botMember);
            
            if (!permissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                const embed = createErrorEmbed(
                    'Missing Permissions',
                    `I need the following permissions in ${channel}:\n• View Channel\n• Send Messages\n• Embed Links`
                );
                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: 64 // MessageFlags.Ephemeral
                });
            }

            if (type === 'players') {
                await handlePlayersPanel(interaction, channel, game, action);
            }

        } catch (error) {
            logger.error('Error in setchannel command:', error);
            const embed = createErrorEmbed('Command Error', 'An error occurred while processing your request.');
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    embeds: [embed], 
                    flags: 64 // MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({ 
                    embeds: [embed], 
                    flags: 64 // MessageFlags.Ephemeral
                });
            }
        }
    }
};

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
        return await interaction.reply({ 
            embeds: [embed], 
            flags: 64 // MessageFlags.Ephemeral
        });
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
            await interaction.reply({ 
                embeds: [embed], 
                flags: 64 // MessageFlags.Ephemeral
            });
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
        await interaction.reply({ 
            embeds: [embed], 
            flags: 64 // MessageFlags.Ephemeral
        });
    }
}
