/**
 * Get game icon URL or emoji
 * @param {string} gameName - Name of the game
 * @returns {Promise<string>} - Game icon URL or emoji
 */
async function getGameIcon(gameName) {
    const normalizedName = normalizeGameName(gameName);
    
    // Game-specific icons (using Discord CDN or emojis)
    const gameIcons = {
        'apb reloaded': '🚔',
        'apb': '🚔',
        'valorant': '🎯',
        'counter-strike': '🔫',
        'cs': '🔫',
        'csgo': '🔫',
        'league of legends': '⚔️',
        'lol': '⚔️',
        'minecraft': '🧱',
        'world of warcraft': '🗡️',
        'wow': '🗡️',
        'fortnite': '🏗️',
        'call of duty': '💥',
        'cod': '💥',
        'warzone': '💥',
        'grand theft auto': '🚗',
        'gta': '🚗',
        'rocket league': '🚀',
        'overwatch': '🎮',
        'apex legends': '🎯',
        'destiny': '🌌',
        'rainbow six siege': '🏠',
        'pubg': '🎯',
        'fall guys': '👑',
        'among us': '🚀'
    };
    
    return gameIcons[normalizedName] || '🎮';
}
