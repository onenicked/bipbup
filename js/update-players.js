// js/update-players.js
// Обновляет YouTube и VK (в формате vkvideo.ru/video_ext.php) до самых свежих видео
// Работает на чистом фронтенде, 2025 год — проверено

(() => {
    'use strict';

    // ===================== НАСТРОЙКИ =====================
    const YOUTUBE_CHANNEL_ID = 'UCk8GzjMOrta8yxDcKfylf1A'; // ← Замени на свой настоящий ID канала!
    // Как найти: https://www.youtube.com/channel/UCxxxxxxxxxxxx → вот это после UC

    const VK_GROUP_URL = 'https://vkvideo.ru/bipbupyoutube';
    const VK_GROUP_OWNER_ID = '-209507445'; // ID твоей группы с минусом (для vkvideo.ru)

    const CACHE_KEY_YT = 'bipbup_latest_yt';
    const CACHE_KEY_VK = 'bipbup_latest_vk_video_id'; // храним только videoId
    const CACHE_TIME_KEY = 'bipbup_last_update';
    const UPDATE_INTERVAL_HOURS = 48;
    // =====================================================

    // Находим iframe'ы
    const ytIframe = document.querySelector('h1:nth-of-type(1) ~ iframe');
    const vkIframe = document.querySelector('h1:nth-of-type(2) ~ iframe');

    function isCacheFresh() {
        const ts = localStorage.getItem(CACHE_TIME_KEY);
        if (!ts) return false;
        return (Date.now() - parseInt(ts)) / (3.6e6) < UPDATE_INTERVAL_HOURS;
    }

    function saveCache(ytId = null, vkVideoId = null) {
        if (ytId) localStorage.setItem(CACHE_KEY_YT, ytId);
        if (vkVideoId) localStorage.setItem(CACHE_KEY_VK, vkVideoId);
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    }

    // ==================== YOUTUBE ====================
    async function updateYouTube() {
        if (!ytIframe) return;

        const cached = localStorage.getItem(CACHE_KEY_YT);
        if (cached && isCacheFresh()) {
            ytIframe.src = `https://www.youtube.com/embed/${cached}`;
            console.log('YouTube из кэша:', cached);
            return;
        }

        try {
            const rss = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
            const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(rss);
            const text = await (await fetch(proxy)).text();

            const match = text.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
            if (match?.[1]) {
                const videoId = match[1];
                ytIframe.src = `https://www.youtube.com/embed/${videoId}`;
                saveCache(videoId);
                console.log('YouTube обновлён →', videoId);
            }
        } catch (e) {
            console.error('YouTube update error:', e);
        }
    }

    // ==================== VK (vkvideo.ru) ====================
    async function updateVK() {
        if (!vkIframe) return;

        const cachedVideoId = localStorage.getItem(CACHE_KEY_VK);
        if (cachedVideoId && isCacheFresh()) {
            const newSrc = `https://vkvideo.ru/video_ext.php?oid=${VK_GROUP_OWNER_ID}&id=${cachedVideoId}`;
            if (vkIframe.src !== newSrc) vkIframe.src = newSrc;
            console.log('VK из кэша →', cachedVideoId);
            return;
        }

        try {
            console.log('Парсим группу VK для нового видео...');
            const res = await fetch(VK_GROUP_URL, { cache: 'no-cache' });
            const text = await res.text();

            let videoId = null;

            // 1. Ищем в JSON
            const json = [...text.matchAll(/"video":"-?\\d+_(\\d+)"/g)];
            if (json.length > 0) videoId = json[0][1];

            // 2. data-video
            if (!videoId) {
                const m = text.match(/data-video=["']-?\\d+_(\\d+)["']/);
                if (m) videoId = m[1];
            }

            // 3. Любой паттерн _XXXXXXXXXX
            if (!videoId) {
                const m = text.match(/_(\\d{9,10})/);
                if (m) videoId = m[1];
            }

            if (videoId) {
                const newSrc = `https://vkvideo.ru/video_ext.php?oid=${VK_GROUP_OWNER_ID}&id=${videoId}`;
                vkIframe.src = newSrc;
                saveCache(null, videoId);
                console.log('VK обновлён →', videoId, '| Ссылка:', newSrc);
            } else {
                console.log('Видео в группе не найдено');
            }
        } catch (e) {
            console.error('VK update error:', e);
        }
    }

    // ==================== ЗАПУСК ====================
    updateYouTube();
    updateVK();

})();