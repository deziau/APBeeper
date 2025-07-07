
const axios = require('axios');
const { getAllTwitchStreamers, updateStreamerLiveStatus, getServerSettings } = require('../database');
const { createTwitchEmbed } = require('../utils/embedStyles');
const logger = require('../utils/logger');

let twitchAccessToken = null;
let tokenExpiresAt = null;

/**
 * Get Twitch OAuth token
 */
async function getTwitchAccessToken() {
    if (twitchAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
        return twitchAccessToken;
    }
    
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
        logger.warn('Twitch API credentials not configured');
        return null;
    }
    
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', {
            client_id: process.env.TWITCH_CLIENT_ID,
            client_secret: process.env.TWITCH_CLIENT_SECRET,
            grant_type: 'client_credentials'
        });
        
        twitchAccessToken = response.data.access_token;
        tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer
        
        return twitchAccessToken;
        
    } catch (error) {
        logger.error('Error getting Twitch access token:', error.message);
        return null;
    }
}

/**
 * Extract Twitch username from URL
 */
function extractTwitchUsername(url) {
    const patterns = [
        /twitch\.tv\/([a-zA-Z0-9_]+)/,
        /twitch\.tv\/([a-zA-Z0-9_]+)\//,
        /^([a-zA-Z0-9_]+)$/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1].toLowerCase();
        }
    }
    
    return null;
}

/**
 * Validate Twitch URL format
 */
function isValidTwitchUrl(url) {
    const twitchUrlPattern = /^https?:\/\/(www\.)?twitch\.tv\/[a-zA-Z0-9_]+\/?$/;
    return twitchUrlPattern.test(url) || /^[a-zA-Z0-9_]+$/.test(url);
}

/**
 * Get stream information from Twitch API
 */
async function getStreamInfo(username) {
    const token = await getTwitchAccessToken();
    if (!token) return null;
    
    try {
        // Get user info first
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: {
                login: username
            }
        });
        
        if (!userResponse.data.data || userResponse.data.data.length === 0) {
            return null;
        }
        
        const userId = userResponse.data.data[0].id;
        
        // Get stream info
        const streamResponse = await axios.get('https://api.twitch.tv/helix/streams', {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: {
                user_id: userId
            }
        });
        
        if (!streamResponse.data.data || streamResponse.data.data.length === 0) {
            return { isLive: false };
        }
        
        const stream = streamResponse.data.data[0];
        
        return {
            isLive: true,
            title: stream.title,
            game: stream.game_name,
            viewers: stream.viewer_count,
            thumbnail: stream.thumbnail_url.replace('{width}', '320').replace('{height}', '180'),
            startedAt: stream.started_at
        };
        
    } catch (error) {
        logger.error(`Error getting stream info for ${username}:`, error.message);
        return null;
    }
}

/**
 * Check all Twitch streams and send notifications
 */
async function checkTwitchStreams(client) {
    try {
        const streamers = await getAllTwitchStreamers();
        
        for (const streamer of streamers) {
            await checkSingleStreamer(client, streamer);
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        logger.debug(`Checked ${streamers.length} Twitch streamers`);
        
    } catch (error) {
        logger.error('Error checking Twitch streams:', error);
    }
}

/**
 * Check a single streamer and send notification if needed
 */
async function checkSingleStreamer(client, streamer) {
    try {
        const guild = client.guilds.cache.get(streamer.guild_id);
        if (!guild) return;
        
        const settings = await getServerSettings(streamer.guild_id);
        if (!settings.twitch_enabled) return;
        
        const username = extractTwitchUsername(streamer.twitch_url);
        if (!username) return;
        
        const streamInfo = await getStreamInfo(username);
        if (!streamInfo) return;
        
        const wasLive = streamer.is_live;
        const isNowLive = streamInfo.isLive;
        
        // Update database
        await updateStreamerLiveStatus(
            streamer.guild_id,
            streamer.user_id,
            isNowLive,
            isNowLive && !wasLive ? new Date().toISOString() : null
        );
        
        // Send notification if stream just went live
        if (isNowLive && !wasLive) {
            await sendStreamNotification(guild, streamer, streamInfo, settings);
        }
        
    } catch (error) {
        logger.error(`Error checking streamer ${streamer.username}:`, error);
    }
}

/**
 * Send stream notification to the appropriate channel
 */
async function sendStreamNotification(guild, streamer, streamInfo, settings) {
    try {
        let channelId = settings.twitch_channel_id;
        
        // Fallback to general channel if no specific channel set
        if (!channelId) {
            const generalChannel = guild.channels.cache.find(channel => 
                channel.name.includes('general') || 
                channel.name.includes('chat') ||
                channel.type === 0 // Text channel
            );
            channelId = generalChannel?.id;
        }
        
        if (!channelId) {
            logger.warn(`No suitable channel found for stream notification in guild ${guild.id}`);
            return;
        }
        
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;
        
        const embed = createTwitchEmbed(streamer, streamInfo);
        
        await channel.send({ embeds: [embed] });
        
        logger.info(`Sent stream notification for ${streamer.username} in guild ${guild.name}`);
        
    } catch (error) {
        logger.error('Error sending stream notification:', error);
    }
}

/**
 * Test if a Twitch channel exists and is valid
 */
async function validateTwitchChannel(url) {
    const username = extractTwitchUsername(url);
    if (!username) return false;
    
    const token = await getTwitchAccessToken();
    if (!token) return false;
    
    try {
        const response = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            params: {
                login: username
            }
        });
        
        return response.data.data && response.data.data.length > 0;
        
    } catch (error) {
        logger.error(`Error validating Twitch channel ${username}:`, error.message);
        return false;
    }
}

module.exports = {
    getTwitchAccessToken,
    extractTwitchUsername,
    isValidTwitchUrl,
    getStreamInfo,
    checkTwitchStreams,
    checkSingleStreamer,
    sendStreamNotification,
    validateTwitchChannel
};
