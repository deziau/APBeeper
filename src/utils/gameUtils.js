/**
 * Normalize game name for comparison
 * @param {string} gameName - Game name to normalize
 * @returns {string} - Normalized game name
 */
function normalizeGameName(gameName) {
    return gameName.toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' '); // Normalize spaces
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
    
    console.log(`Comparing: "${normalized1}" vs "${normalized2}"`);
    
    // Exact match
    if (normalized1 === normalized2) {
        console.log('  ✅ Exact match');
        return true;
    }
    
    // Check if one contains the other
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        console.log('  ✅ Contains match');
        return true;
    }
    
    // Check for common abbreviations and variations
    const gameVariations = {
        'apb': ['apb reloaded', 'apb all points bulletin', 'all points bulletin'],
        'apb reloaded': ['apb', 'apb all points bulletin', 'all points bulletin'],
        'counter-strike': ['cs', 'csgo', 'counter-strike global offensive', 'cs go'],
        'cs': ['counter-strike', 'csgo', 'counter-strike global offensive'],
        'csgo': ['counter-strike', 'cs', 'counter-strike global offensive'],
        'league of legends': ['lol', 'league'],
        'lol': ['league of legends', 'league'],
        'world of warcraft': ['wow'],
        'wow': ['world of warcraft'],
        'call of duty': ['cod', 'warzone'],
        'cod': ['call of duty', 'warzone'],
        'grand theft auto': ['gta', 'gta v', 'gta 5'],
        'gta': ['grand theft auto', 'gta v', 'gta 5'],
        'valorant': ['val']
    };
    
    // Check variations
    const variations1 = gameVariations[normalized1] || [];
    const variations2 = gameVariations[normalized2] || [];
    
    if (variations1.includes(normalized2) || variations2.includes(normalized1)) {
        console.log('  ✅ Variation match');
        return true;
    }
    
    // Check if any variation of name1 matches name2 or vice versa
    for (const variation of variations1) {
        if (normalized2.includes(variation) || variation.includes(normalized2)) {
            console.log('  ✅ Variation contains match');
            return true;
        }
    }
    
    for (const variation of variations2) {
        if (normalized1.includes(variation) || variation.includes(normalized1)) {
            console.log('  ✅ Variation contains match');
            return true;
        }
    }
    
    console.log('  ❌ No match');
    return false;
}

/**
 * Format duration in milliseconds to human readable string
 * @param {number} duration - Duration in milliseconds
 * @returns {string} - Formatted duration string
 */
function formatDuration(duration) {
    if (!duration || duration < 0) return '0m';
    
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        const remainingHours = hours % 24;
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
    
    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    
    if (minutes > 0) {
        return `${minutes}m`;
    }
    
    return seconds > 0 ? `${seconds}s` : '0m';
}

/**
 * Get game icon URL or emoji
 * @param {string} gameName - Name of the game
 * @returns {Promise<string>} - Game icon URL or emoji
 */
async function getGameIcon(gameName) {
    try {
        const normalizedName = normalizeGameName(gameName);
        
        // Game-specific icons (using emojis for reliability)
        const gameIcons = {
            'apb reloaded': '🚔',
            'apb': '🚔',
            'apb all points bulletin': '🚔',
            'all points bulletin': '🚔',
            'valorant': '🎯',
            'counter-strike': '🔫',
            'cs': '🔫',
            'csgo': '🔫',
            'counter-strike global offensive': '🔫',
            'league of legends': '⚔️',
            'lol': '⚔️',
            'league': '⚔️',
            'minecraft': '🧱',
            'world of warcraft': '🗡️',
            'wow': '🗡️',
            'fortnite': '🏗️',
            'call of duty': '💥',
            'cod': '💥',
            'warzone': '💥',
            'grand theft auto': '🚗',
            'gta': '🚗',
            'gta v': '🚗',
            'gta 5': '🚗',
            'rocket league': '🚀',
            'overwatch': '🎮',
            'apex legends': '🎯',
            'destiny': '🌌',
            'rainbow six siege': '🏠',
            'pubg': '🎯',
            'fall guys': '👑',
            'among us': '🚀',
            'discord': '💬',
            'spotify': '🎵',
            'youtube': '📺',
            'twitch': '📺'
        };
        
        return gameIcons[normalizedName] || '🎮';
        
    } catch (error) {
        console.error('Error getting game icon:', error);
        return '🎮'; // Fallback emoji
    }
}

/**
 * Get user's current game activity
 * @param {Object} presence - Discord presence object
 * @returns {Object|null} - Game activity or null
 */
function getCurrentGameActivity(presence) {
    if (!presence || !presence.activities) return null;
    
    // Find the first "Playing" activity (type 0)
    return presence.activities.find(activity => activity.type === 0) || null;
}

/**
 * Check if user is playing a specific game
 * @param {Object} presence - Discord presence object
 * @param {string} gameName - Game name to check
 * @returns {boolean} - Whether user is playing the game
 */
function isUserPlayingGame(presence, gameName) {
    const gameActivity = getCurrentGameActivity(presence);
    if (!gameActivity) return false;
    
    return areGameNamesSimilar(gameActivity.name, gameName);
}

/**
 * Get play session duration in a readable format
 * @param {Date} startTime - Session start time
 * @param {Date} endTime - Session end time (optional, defaults to now)
 * @returns {string} - Formatted duration
 */
function getSessionDuration(startTime, endTime = new Date()) {
    const duration = endTime.getTime() - startTime.getTime();
    return formatDuration(duration);
}

/**
 * Parse game name from Discord activity
 * @param {Object} activity - Discord activity object
 * @returns {string} - Cleaned game name
 */
function parseGameName(activity) {
    if (!activity || !activity.name) return '';
    
    let gameName = activity.name.trim();
    
    // Remove common prefixes/suffixes
    gameName = gameName.replace(/^Playing\s+/i, '');
    gameName = gameName.replace(/\s+\(.*\)$/, ''); // Remove parentheses at end
    
    return gameName;
}

/**
 * Get game category based on name
 * @param {string} gameName - Game name
 * @returns {string} - Game category
 */
function getGameCategory(gameName) {
    const normalizedName = normalizeGameName(gameName);
    
    const categories = {
        'FPS': ['counter-strike', 'cs', 'csgo', 'valorant', 'call of duty', 'cod', 'warzone', 'apex legends', 'overwatch'],
        'MMORPG': ['world of warcraft', 'wow', 'destiny', 'final fantasy'],
        'MOBA': ['league of legends', 'lol', 'dota'],
        'Battle Royale': ['fortnite', 'apex legends', 'warzone', 'pubg'],
        'Sandbox': ['minecraft', 'roblox', 'terraria'],
        'Racing': ['rocket league', 'forza'],
        'Action': ['apb reloaded', 'apb', 'grand theft auto', 'gta'],
        'Social': ['among us', 'fall guys', 'discord'],
        'Streaming': ['spotify', 'youtube', 'twitch']
    };
    
    for (const [category, games] of Object.entries(categories)) {
        if (games.some(game => normalizedName.includes(game))) {
            return category;
        }
    }
    
    return 'Other';
}

module.exports = {
    normalizeGameName,
    areGameNamesSimilar,
    formatDuration,
    getGameIcon,
    getCurrentGameActivity,
    isUserPlayingGame,
    getSessionDuration,
    parseGameName,
    getGameCategory
};
