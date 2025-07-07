
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { updateServerSetting, addAPBPanel, removeAPBPanel } = require('../database');
const { createAPBPanel } = require('../services/apbPopulation');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embedStyles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('Set up auto-updating APB population panels in a channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel for APB population updates')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
            option.setName('region')
                .setDescription('Which region to display (NA, EU, or both)')
                .setRequired(false)
                .addChoices(
                    { name: 'North America (Jericho)', value: 'NA' },
                    { name: 'Europe (Citadel)', value: 'EU' },
                    { name: 'Both Regions', value: 'BOTH' }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const region = interaction.options.getString('region') || 'BOTH';
        const guildId = interaction.guild.id;

        try {
            await interaction.deferReply();

            // Check if bot has permissions to send messages in the channel
            const botMember = interaction.guild.members.me;
            const permissions = channel.permissionsFor(botMember);
            
            if (!permissions.has(['SendMessages', 'EmbedLinks'])) {
                const embed = createErrorEmbed(
                    'Permission Error',
                    `I don't have permission to send messages or embed links in ${channel}. Please check my permissions.`
                );
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // Update server settings
            await updateServerSetting(guildId, 'apb_channel_id', channel.id);

            // Create the population panel(s)
            if (region === 'BOTH') {
                // Create separate panels for NA and EU
                const naMessage = await createAPBPanel(channel, 'NA');
                const euMessage = await createAPBPanel(channel, 'EU');
                
                // Add to database
                await addAPBPanel(guildId, channel.id, naMessage.id, 'NA');
                await addAPBPanel(guildId, channel.id, euMessage.id, 'EU');
                
                const embed = createSuccessEmbed(
                    '📊 APB Population Panels Created',
                    `Auto-updating population panels for both regions have been set up in ${channel}.\n\n` +
                    `The panels will update every 5 minutes automatically.`
                );
                
                await interaction.editReply({ embeds: [embed] });
            } else {
                // Create single panel for specified region
                const message = await createAPBPanel(channel, region);
                
                // Add to database
                await addAPBPanel(guildId, channel.id, message.id, region);
                
                const regionName = region === 'NA' ? 'North America (Jericho)' : 'Europe (Citadel)';
                
                const embed = createSuccessEmbed(
                    '📊 APB Population Panel Created',
                    `Auto-updating population panel for ${regionName} has been set up in ${channel}.\n\n` +
                    `The panel will update every 5 minutes automatically.`
                );
                
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error setting up APB channel:', error);
            
            const embed = createErrorEmbed(
                'Error',
                'Failed to set up the APB population channel. Please make sure I have the necessary permissions and try again.'
            );

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },
};
