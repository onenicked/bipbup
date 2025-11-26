// ==UserScript==
// Update VK Video iframe to the latest video from a group (max once every 2 days)
// ==/UserScript==

(function () {
    'use strict';

    // === CONFIGURATION ===
    const GROUP_ID = -209507445; // Change to your VK group ID (with minus if it's a group)
    const VK_IFRAME_SELECTOR = 'iframe[src*="vkvideo.ru"], iframe[src*="vk.com/video_ext"]';
    const CACHE_KEY = 'latest_vk_video_data';
    const CACHE_TIMESTAMP_KEY = 'latest_vk_video_timestamp';
    const UPDATE_INTERVAL_HOURS = 48; // 2 days = 48 hours

    // VK API endpoint
    const API_URL = 'https://api.vk.com/method/wall.get';
    const API_VERSION = '5.199';

    // Find the VK iframe
    const vkIframe = document.querySelector(VK_IFRAME_SELECTOR);
    if (!vkIframe) {
        console.warn('VK Video iframe not found on this page.');
        return;
    }

    // Check if we have cached data and if it's still fresh
    function isCacheValid() {
        const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        if (!timestamp) return false;

        const lastUpdate = parseInt(timestamp, 10);
        const now = Date.now();
        const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60);

        return hoursPassed < UPDATE_INTERVAL_HOURS;
    }

    // Save video data to cache
    function cacheVideoData(ownerId, videoId) {
        const data = { ownerId, videoId };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        console.log('VK video cached:', data, 'Next update in 48 hours.');
    }

    // Load cached video data
    function getCachedVideoData() {
        try {
            const data = localStorage.getItem(CACHE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to parse cached VK video data', e);
            return null;
        }
    }

    // Update iframe src
    function updateIframe(ownerId, videoId) {
        const newSrc = `https://vkvideo.ru/video_ext.php?oid=${ownerId}&id=${videoId}`;
        if (vkIframe.src !== newSrc) {
            vkIframe.src = newSrc;
            console.log('VK video updated to:', newSrc);
        }
    }

    // Fetch latest video from VK group
    async function fetchLatestVideo() {
        try {
            const params = new URLSearchParams({
                owner_id: GROUP_ID,
                count: 10,              // Get last 10 posts to be safe
                filter: 'owner',        // Only posts from the group
                extended: 0,
                v: API_VERSION,
                access_token: '',       // Works without token for public groups
            });

            const response = await fetch(API_URL + '?' + params, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit'
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.error_msg || 'VK API Error');
            }

            const posts = data.response?.items || [];
            for (const post of posts) {
                if (post.attachments) {
                    for (const att of post.attachments) {
                        if (att.type === 'video' && att.video) {
                            const video = att.video;
                            const ownerId = video.owner_id;
                            const videoId = video.id;

                            // Update iframe and cache
                            updateIframe(ownerId, videoId);
                            cacheVideoData(ownerId, videoId);
                            return;
                        }
                    }
                }
            }

            console.log('No video found in recent posts.');
        } catch (err) {
            console.error('Failed to fetch latest VK video:', err);
            // Don't update cache on error — keep old one
        }
    }

    // Main logic
    function init() {
        const cached = getCachedVideoData();

        if (cached && isCacheValid()) {
            // Use cached video
            updateIframe(cached.ownerId, cached.videoId);
            console.log('Using cached VK video (updated less than 48h ago)');
        } else {
            // Fetch new one
            console.log('Fetching latest VK video... (will update cache)');
            fetchLatestVideo();
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();