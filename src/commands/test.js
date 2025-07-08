const { SlashCommandBuilder } = require('discord.js');
const { createSuccessEmbed } = require('../utils/embedStyles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test if the bot is working'),

    async execute(interaction) {
        const embed = createSuccessEmbed(
            'Bot Test',
            `✅ Bot is working!\n\n` +
            `**Server:** ${interaction.guild.name}\n` +
            `**User:** ${interaction.user.tag}\n` +
            `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
        );
        
        await interaction.reply({ embeds: [embed] });
    }
};
