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
