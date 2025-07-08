const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { debugUser } = require('../services/playersTracking');
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
                content: `🔍 Debugging presence for ${user.tag}... Check the Railway logs for details!`,
                flags: 64
            });
            
            // Run debug in background
            setTimeout(async () => {
                await debugUser(interaction.client, interaction.guild.id, user.id);
            }, 1000);
            
        } catch (error) {
            logger.error('❌ Debug command error:', error);
            
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Error running debug command.',
                    flags: 64
                });
            }
        }
    }
};
