const logger = require('./logger');

// Game icon mappings - Discord application IDs for popular games
const GAME_ICONS = {
    'valorant': '700136079562375258',
    'league of legends': '401518684763586560',
    'apex legends': '438122941302046720',
    'fortnite': '432980957394370572',
    'minecraft': '356875221078245376',
    'among us': '477175586805252107',
    'fall guys': '702509529748586536',
    'rocket league': '379286085710381056',
    'overwatch': '356877880938070016',
    'counter-strike': '367827983903490050',
    'cs:go': '367827983903490050',
    'counter-strike: global offensive': '367827983903490050',
    'dota 2': '367827983903490050',
    'world of warcraft': '356876176465199104',
    'destiny 2': '356877880938070016',
    'call of duty': '438122941302046720',
    'warzone': '438122941302046720',
    'gta v': '356877880938070016',
    'grand theft auto v': '356877880938070016',
    'apb reloaded': '356877880938070016',
    'apb': '356877880938070016',
    'rust': '356877880938070016',
    'terraria': '356877880938070016',
    'stardew valley': '356877880938070016',
    'discord': '356877880938070016'
};

// Default game icon for unknown games
const DEFAULT_GAME_ICON = 'https://cdn.discordapp.com/attachments/1234567890/game-controller.png';

/**
 * Get game icon URL from Discord's CDN
 * @param {string} gameName - Name of the game
 * @returns {Promise<string>} - Game icon URL
 */
async function getGameIcon(gameName) {
    try {
        const normalizedName = gameName.toLowerCase().trim();
        
        // Check if we have a known application ID for this game
        const appId = GAME_ICONS[normalizedName];
        
        if (appId) {
            // Try to get the icon from Discord's RPC endpoint
            try {
                const response = await fetch(`https://discord.com/api/v10/applications/${appId}/rpc`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.icon) {
                        return `https://cdn.discordapp.com/app-icons/${appId}/${data.icon}.png?size=256`;
                    }
                }
            } catch (error) {
                logger.warn(`Failed to fetch icon for ${gameName}:`, error.message);
            }
            
            // Fallback to a generic icon URL structure
            return `https://cdn.discordapp.com/app-icons/${appId}/icon.png?size=256`;
        }
        
        // For unknown games, try to generate a generic gaming icon
        return getGenericGameIcon(gameName);
        
    } catch (error) {
        logger.error(`Error getting game icon for ${gameName}:`, error);
        return DEFAULT_GAME_ICON;
    }
}

/**
 * Generate a generic game icon for unknown games
 * @param {string} gameName - Name of the game
 * @returns {string} - Generic game icon URL
 */
function getGenericGameIcon(gameName) {
    // Use Discord's default game controller icon or create a simple text-based icon
    const gameInitials = gameName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
    
    // For now, return a generic gaming icon
    // In a real implementation, you might generate a custom icon or use a service
    return `https://cdn.discordapp.com/attachments/123456789/game-placeholder.png`;
}

/**
 * Format duration in milliseconds to human-readable format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} - Formatted duration (e.g., "2h 15m", "45m", "30s")
 */
function formatDuration(milliseconds) {
    if (!milliseconds || milliseconds < 0) return '0s';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        const remainingHours = hours % 24;
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    } else if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } else if (minutes > 0) {
        const remainingSeconds = seconds % 60;
        return remainingSeconds > 0 && minutes < 5 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Format duration for display in embeds (shorter format)
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} - Short formatted duration
 */
function formatShortDuration(milliseconds) {
    if (!milliseconds || milliseconds < 0) return '0s';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Get activity status emoji based on duration
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} - Status emoji
 */
function getActivityEmoji(milliseconds) {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    
    if (minutes < 5) return '🟢'; // Just started
    if (minutes < 30) return '🟡'; // Playing for a while
    if (minutes < 120) return '🟠'; // Long session
    return '🔴'; // Very long session
}

/**
 * Normalize game name for better matching
 * @param {string} gameName - Raw game name from Discord
 * @returns {string} - Normalized game name
 */
function normalizeGameName(gameName) {
    return gameName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Check if two game names are similar (for better matching)
 * @param {string} name1 - First game name
 * @param {string} name2 - Second game name
 * @returns {boolean} - Whether the names are similar
 */
function areGameNamesSimilar(name1, name2) {
    const normalized1 = normalizeGameName(name1);
    const normalized2 = normalizeGameName(name2);
    
    // Exact match
    if (normalized1 === normalized2) return true;
    
    // Check if one contains the other
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;
    
    // Check for common abbreviations
    const abbreviations = {
        'cs': 'counter-strike',
        'csgo': 'counter-strike global offensive',
        'lol': 'league of legends',
        'wow': 'world of warcraft',
        'cod': 'call of duty',
        'gta': 'grand theft auto',
        'apb': 'apb reloaded'
    };
    
    const abbrev1 = abbreviations[normalized1];
    const abbrev2 = abbreviations[normalized2];
    
    if (abbrev1 && (abbrev1 === normalized2 || normalized2.includes(abbrev1))) return true;
    if (abbrev2 && (abbrev2 === normalized1 || normalized1.includes(abbrev2))) return true;
    
    return false;
}

module.exports = {
    getGameIcon,
    getGenericGameIcon,
    formatDuration,
    formatShortDuration,
    getActivityEmoji,
    normalizeGameName,
    areGameNamesSimilar,
    GAME_ICONS
};
