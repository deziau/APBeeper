
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateServerSetting } = require('../database');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embedStyles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setgame')
        .setDescription('Set the game name to track for Discord status')
        .addStringOption(option =>
            option.setName('game')
                .setDescription('The game name to track (e.g., "APB: Reloaded")')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const gameName = interaction.options.getString('game');
        const guildId = interaction.guild.id;

        try {
            // Update the game name in database
            await updateServerSetting(guildId, 'game_name', gameName);

            const embed = createSuccessEmbed(
                '🎮 Game Updated',
                `Now tracking players for: **${gameName}**\n\nUse \`/players\` to see who's currently playing!`
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error updating game name:', error);
            
            const embed = createErrorEmbed(
                'Error',
                'Failed to update the game name. Please try again.'
            );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
