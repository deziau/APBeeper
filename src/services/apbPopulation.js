
const axios = require('axios');
const { getAllAPBPanels } = require('../database');
const { createAPBPopulationEmbed } = require('../utils/embedStyles');
const logger = require('../utils/logger');

// APB API endpoints (these are example endpoints - replace with actual APB API URLs)
const APB_ENDPOINTS = {
    NA: 'https://api.gamersfirst.com/apb/servers/na', // Example endpoint
    EU: 'https://api.gamersfirst.com/apb/servers/eu'  // Example endpoint
};

/**
 * Fetch APB population data from API
 */
async function fetchAPBPopulation(region) {
    try {
        // Since actual APB API endpoints may not be available, we'll simulate the data
        // In a real implementation, replace this with actual API calls
        
        const mockData = generateMockAPBData(region);
        return mockData;
        
        // Actual implementation would look like:
        // const response = await axios.get(APB_ENDPOINTS[region], {
        //     timeout: 10000,
        //     headers: {
        //         'User-Agent': 'APBeeper-Bot/1.0'
        //     }
        // });
        // return response.data;
        
    } catch (error) {
        logger.error(`Error fetching APB population for ${region}:`, error.message);
        return null;
    }
}

/**
 * Generate mock APB population data for demonstration
 * Replace this with actual API integration
 */
function generateMockAPBData(region) {
    const basePopulation = region === 'NA' ? 150 : 200;
    const variance = Math.floor(Math.random() * 100) - 50;
    const totalPop = Math.max(0, basePopulation + variance);
    
    if (totalPop === 0) return [];
    
    const districts = [
        { name: 'Financial', population: Math.floor(totalPop * 0.4) },
        { name: 'Waterfront', population: Math.floor(totalPop * 0.35) },
        { name: 'Asylum', population: Math.floor(totalPop * 0.25) }
    ];
    
    // Only return districts with population > 0
    return districts.filter(district => district.population > 0);
}

/**
 * Update all APB population panels across all servers
 */
async function updateAPBPanels(client) {
    try {
        const panels = await getAllAPBPanels();
        
        for (const panel of panels) {
            await updateSinglePanel(client, panel);
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        logger.info(`Updated ${panels.length} APB population panels`);
        
    } catch (error) {
        logger.error('Error updating APB panels:', error);
    }
}

/**
 * Update a single APB population panel
 */
async function updateSinglePanel(client, panel) {
    try {
        const guild = client.guilds.cache.get(panel.guild_id);
        if (!guild) {
            logger.warn(`Guild ${panel.guild_id} not found for panel update`);
            return;
        }
        
        const channel = guild.channels.cache.get(panel.channel_id);
        if (!channel) {
            logger.warn(`Channel ${panel.channel_id} not found for panel update`);
            return;
        }
        
        let populationData = [];
        
        if (panel.region === 'BOTH') {
            const naData = await fetchAPBPopulation('NA');
            const euData = await fetchAPBPopulation('EU');
            
            if (naData) populationData.push(...naData.map(d => ({ ...d, region: 'NA' })));
            if (euData) populationData.push(...euData.map(d => ({ ...d, region: 'EU' })));
        } else {
            const data = await fetchAPBPopulation(panel.region);
            if (data) populationData = data;
        }
        
        const embed = createAPBPopulationEmbed(populationData, panel.region);
        
        try {
            const message = await channel.messages.fetch(panel.message_id);
            await message.edit({ embeds: [embed] });
        } catch (fetchError) {
            // Message might have been deleted, create a new one
            logger.warn(`Could not fetch message ${panel.message_id}, creating new panel`);
            const newMessage = await channel.send({ embeds: [embed] });
            
            // Update database with new message ID
            const { addAPBPanel } = require('../database');
            await addAPBPanel(panel.guild_id, panel.channel_id, newMessage.id, panel.region);
        }
        
    } catch (error) {
        logger.error(`Error updating panel for guild ${panel.guild_id}:`, error);
    }
}

/**
 * Create a new APB population panel
 */
async function createAPBPanel(channel, region) {
    try {
        let populationData = [];
        
        if (region === 'BOTH') {
            const naData = await fetchAPBPopulation('NA');
            const euData = await fetchAPBPopulation('EU');
            
            if (naData) populationData.push(...naData.map(d => ({ ...d, region: 'NA' })));
            if (euData) populationData.push(...euData.map(d => ({ ...d, region: 'EU' })));
        } else {
            const data = await fetchAPBPopulation(region);
            if (data) populationData = data;
        }
        
        const embed = createAPBPopulationEmbed(populationData, region);
        const message = await channel.send({ embeds: [embed] });
        
        return message;
        
    } catch (error) {
        logger.error('Error creating APB panel:', error);
        throw error;
    }
}

/**
 * Get current APB population for immediate display
 */
async function getCurrentAPBPopulation(region) {
    try {
        if (region === 'BOTH') {
            const naData = await fetchAPBPopulation('NA');
            const euData = await fetchAPBPopulation('EU');
            
            return {
                NA: naData,
                EU: euData
            };
        } else {
            const data = await fetchAPBPopulation(region);
            return { [region]: data };
        }
        
    } catch (error) {
        logger.error('Error getting current APB population:', error);
        return null;
    }
}

module.exports = {
    fetchAPBPopulation,
    updateAPBPanels,
    updateSinglePanel,
    createAPBPanel,
    getCurrentAPBPopulation
};
