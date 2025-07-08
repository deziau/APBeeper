const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { debugPresence } = require('../services/playersTracking');
const { createInfoEmbed } = require('../utils/embedStyles');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Debug player presence detection')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to debug (defaults to you)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user') || interaction.user;
            
            await interaction.reply({
                content: `🔍 Debugging presence for ${user.tag}... Check the logs!`,
                flags: 64 // MessageFlags.Ephemeral
            });
            
            // Run debug
            await debugPresence(interaction.client, interaction.guild.id, user.id);
            
        } catch (error) {
            logger.error('Error in debug command:', error);
            await interaction.reply({
                content: 'Error running debug command.',
                flags: 64 // MessageFlags.Ephemeral
            });
        }
    }
};
