
const { SlashCommandBuilder } = require('discord.js');
const { getServerSettings } = require('../database');
const { getPlayersFromStatus, getClanRoleName } = require('../services/discordStatus');
const { createPlayersEmbed, createInfoEmbed } = require('../utils/embedStyles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('players')
        .setDescription('Show members currently playing the tracked game'),

    async execute(interaction) {
        const guildId = interaction.guild.id;

        try {
            await interaction.deferReply();

            const settings = await getServerSettings(guildId);
            const gameName = settings.game_name || 'APB: Reloaded';
            const clanRoleId = settings.clan_role_id;

            // Get players from Discord status
            const playersData = await getPlayersFromStatus(interaction.guild, gameName, clanRoleId);
            
            const clanRoleName = getClanRoleName(interaction.guild, clanRoleId);

            if (playersData.total === 0) {
                const embed = createInfoEmbed(
                    '🎮 No Players Online',
                    `No one is currently playing **${gameName}**.\n\nMake sure your Discord status shows the game you're playing!`
                );
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const embed = createPlayersEmbed(
                playersData.clanPlayers,
                playersData.communityPlayers,
                gameName,
                clanRoleName
            );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error getting players:', error);
            
            const embed = createErrorEmbed(
                'Error',
                'Failed to get player information. Please try again.'
            );

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },
};
