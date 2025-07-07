
const { SlashCommandBuilder } = require('discord.js');
const { getCurrentAPBPopulation } = require('../services/apbPopulation');
const { createAPBPopulationEmbed, createErrorEmbed } = require('../utils/embedStyles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apbpop')
        .setDescription('Show current APB population')
        .addStringOption(option =>
            option.setName('region')
                .setDescription('Which region to show (NA, EU, or both)')
                .setRequired(false)
                .addChoices(
                    { name: 'North America (Jericho)', value: 'NA' },
                    { name: 'Europe (Citadel)', value: 'EU' },
                    { name: 'Both Regions', value: 'BOTH' }
                )
        ),

    async execute(interaction) {
        const region = interaction.options.getString('region') || 'BOTH';

        try {
            await interaction.deferReply();

            const populationData = await getCurrentAPBPopulation(region);

            if (!populationData) {
                const embed = createErrorEmbed(
                    'Error',
                    'Failed to fetch APB population data. The servers might be offline or there could be a connection issue.'
                );
                
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            if (region === 'BOTH') {
                // Create embeds for both regions
                const embeds = [];
                
                if (populationData.NA) {
                    embeds.push(createAPBPopulationEmbed(populationData.NA, 'North America (Jericho)'));
                }
                
                if (populationData.EU) {
                    embeds.push(createAPBPopulationEmbed(populationData.EU, 'Europe (Citadel)'));
                }

                if (embeds.length === 0) {
                    const embed = createErrorEmbed(
                        'No Data Available',
                        'Unable to fetch population data for any region.'
                    );
                    
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }

                await interaction.editReply({ embeds: embeds });
            } else {
                const data = populationData[region];
                const regionName = region === 'NA' ? 'North America (Jericho)' : 'Europe (Citadel)';
                const embed = createAPBPopulationEmbed(data, regionName);
                
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error getting APB population:', error);
            
            const embed = createErrorEmbed(
                'Error',
                'Failed to get APB population data. Please try again.'
            );

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },
};
