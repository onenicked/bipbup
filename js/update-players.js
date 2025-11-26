// js/update-players.js
// Автоматически обновляет YouTube и VK плееры до самых свежих видео с твоих каналов
// Работает на чистом фронтенде, без серверов, без API-ключей

(() => {
    'use strict';

    // ===================== НАСТРОЙКИ =====================
    const YOUTUBE_CHANNEL_ID = 'UCjrmposCYp6sJsT2VybjH9A' // ← ВСТАВЬ СВОЙ ID КАНАЛА (пример: UCxxxxxxxxxxxx)
    // Как узнать свой ID: открой свой канал → смотри URL: https://www.youtube.com/channel/UCfkb7060M... ← вот это и есть ID

    const VK_GROUP_URL = 'https://vk.com/bipbupyoutube';

    const CACHE = {
        yt_key: 'bipbup_latest_yt',
        vk_key: 'bipbup_latest_vk',
        time_key: 'bipbup_last_check',
    };
    const UPDATE_INTERVAL_HOURS = 48; // раз в 2 дня
    // =====================================================

    // Находим оба iframe
    const ytIframe = document.querySelector('h1:nth-of-type(1) ~ iframe'); // под "Youtube"
    const vkIframe = document.querySelector('h1:nth-of-type(2) ~ iframe'); // под "VK Video"

    if (!ytIframe && !vkIframe) {
        console.warn('Ни один плеер не найден');
        return;
    }

    function isCacheFresh() {
        const ts = localStorage.getItem(CACHE.time_key);
        if (!ts) return false;
        return (Date.now() - parseInt(ts)) / (1000 * 60 * 60) < UPDATE_INTERVAL_HOURS;
    }

    function saveCache(ytId = null, vkOwner = null, vkVideo = null) {
        if (ytId) localStorage.setItem(CACHE.yt_key, ytId);
        if (vkOwner && vkVideo) localStorage.setItem(CACHE.vk_key, JSON.stringify({ ownerId: vkOwner, videoId: vkVideo }));
        localStorage.setItem(CACHE.time_key, Date.now().toString());
    }

    // ==================== YOUTUBE ====================
    async function updateYouTube() {
        if (!ytIframe) return;

        const cachedId = localStorage.getItem(CACHE.yt_key);
        if (cachedId && isCacheFresh()) {
            ytIframe.src = `https://www.youtube.com/embed/${cachedId}?autoplay=0`;
            console.log('YouTube из кэша:', cachedId);
            return;
        }

        try {
            // Бесплатный способ без API-ключа через RSS (работает в 2025!)
            const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
            const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(rssUrl); // обходим CORS

            const res = await fetch(proxy);
            const text = await res.text();

            const videoId = text.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/) ||
                            text.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/) ||
                            text.match(/videoId=([a-zA-Z0-9_-]{11})/);

            if (videoId && videoId[1]) {
                const newId = videoId[1];
                ytIframe.src = `https://www.youtube.com/embed/${newId}`;
                saveCache(newId);
                console.log('YouTube обновлён →', newId);
            }
        } catch (err) {
            console.error('Не удалось обновить YouTube:', err);
        }
    }

    // ==================== VK ====================
    async function updateVK() {
        if (!vkIframe) return;

        const cached = (() => {
            try { return JSON.parse(localStorage.getItem(CACHE.vk_key)); } catch { return null; }
        })();

        if (cached && isCacheFresh()) {
            vkIframe.src = `https://vk.com/video${cached.ownerId}_${cached.videoId}`;
            console.log('VK из кэша:', `${cached.ownerId}_${cached.videoId}`);
            return;
        }

        try {
            const res = await fetch(VK_GROUP_URL, { cache: 'no-cache' });
            const text = await res.text();

            let ownerId = null, videoId = null;

            const json = [...text.matchAll(/"video":"(-?\d+)_(\d+)"/g)];
            if (json.length > 0) { ownerId = json[0][1]; videoId = json[0][2]; }

            if (!ownerId) {
                const m = text.match(/data-video=["'](-?\d+)_(\d+)["']/);
                if (m) { ownerId = m[1]; videoId = m[2]; }
            }

            if (!ownerId) {
                const m = text.match(/(-?\d{8,10}_\d{8,10})/);
                if (m) [ownerId, videoId] = m[1].split('_');
            }

            if (ownerId && videoId) {
                vkIframe.src = `https://vk.com/video${ownerId}_${videoId}`;
                saveCache(null, ownerId, videoId);
                console.log('VK обновлён →', `${ownerId}_${videoId}`);
            }
        } catch (err) {
            console.error('Не удалось обновить VK:', err);
        }
    }

    // ==================== ЗАПУСК ====================
    updateYouTube();
    updateVK();

})();