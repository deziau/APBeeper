
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateServerSetting } = require('../database');
const { findRoleByName, validateClanRole } = require('../services/discordStatus');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embedStyles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setclangroup')
        .setDescription('Set the clan role for separating clan members from community members')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role that identifies clan members')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const guildId = interaction.guild.id;

        try {
            // Validate that the role exists
            if (!validateClanRole(interaction.guild, role.id)) {
                const embed = createErrorEmbed(
                    'Invalid Role',
                    'The specified role could not be found in this server.'
                );
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            // Update the clan role in database
            await updateServerSetting(guildId, 'clan_role_id', role.id);

            const embed = createSuccessEmbed(
                '👑 Clan Role Updated',
                `Clan role set to: **${role.name}**\n\nMembers with this role will be shown separately in the \`/players\` command.`
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error updating clan role:', error);
            
            const embed = createErrorEmbed(
                'Error',
                'Failed to update the clan role. Please try again.'
            );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
