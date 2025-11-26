// js/update-vk-video.js
// Автоматически обновляет VK-видео на странице до самого нового из группы bipbupyoutube
// Работает прямо на твоём сайте, без Tampermonkey, без токенов

(() => {
    'use strict';

    const GROUP_URL = 'https://vk.com/bipbupyoutube';
    const CACHE_KEY = 'bipbup_latest_vk_video';
    const CACHE_TIME_KEY = 'bipbup_last_update_time';
    const UPDATE_INTERVAL_HOURS = 48; // обновлять не чаще раза в 2 дня

    // Находим именно второй iframe (VK Video) — он идёт после h1 с текстом "VK Video"
    const vkIframe = document.querySelector('h1:nth-of-type(2) ~ iframe');

    if (!vkIframe) {
        console.warn('VK iframe не найден на странице');
        return;
    }

    // Проверка кэша
    function isCacheFresh() {
        const timestamp = localStorage.getItem(CACHE_TIME_KEY);
        if (!timestamp) return false;
        const hoursPassed = (Date.now() - parseInt(timestamp, 10)) / (1000 * 60 * 60);
        return hoursPassed < UPDATE_INTERVAL_HOURS;
    }

    function saveToCache(ownerId, videoId) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ownerId, videoId }));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        console.log('VK видео закэшировано:', `${ownerId}_${videoId}`);
    }

    function getFromCache() {
        try {
            const data = localStorage.getItem(CACHE_KEY);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }

    function updateVkIframe(ownerId, videoId) {
        const newSrc = `https://vk.com/video${ownerId}_${videoId}`;
        if (vkIframe.src !== newSrc && vkIframe.src !== newSrc + '/') {
            vkIframe.src = newSrc;
            console.log('VK видео обновлено →', newSrc);
        }
    }

    async function fetchLatestVideo() {
        try {
            console.log('Ищем новое видео в группе bipbupyoutube...');
            const res = await fetch(GROUP_URL, { cache: 'no-cache' });
            if (!res.ok) throw new Error('Network error');

            const text = await res.text();

            let ownerId = null;
            let videoId = null;

            // 1. Самый надёжный способ 2025 года
            const jsonMatches = [...text.matchAll(/"video":"(-?\d+)_(\d+)"/g)];
            if (jsonMatches.length > 0) {
                ownerId = jsonMatches[0][1];
                videoId = jsonMatches[0][2];
            }

            // 2. data-video атрибут
            if (!ownerId) {
                const m = text.match(/data-video=["'](-?\d+)_(\d+)["']/);
                if (m) { ownerId = m[1]; videoId = m[2]; }
            }

            // 3. VideoCard и другие классы
            if (!ownerId) {
                const m = text.match(/VideoCard[^>]*?(-?\d+_\d+)/);
                if (m) [ownerId, videoId] = m[1].split('_');
            }

            // 4. Фолбэк
            if (!ownerId) {
                const m = text.match(/(-?\d{8,10}_\d{8,10})/);
                if (m) [ownerId, videoId] = m[1].split('_');
            }

            if (ownerId && videoId) {
                updateVkIframe(ownerId, videoId);
                saveToCache(ownerId, videoId);
            } else {
                console.log('Новое видео не найдено — оставляем старое');
            }
        } catch (err) {
            console.error('Ошибка получения нового видео VK:', err);
        }
    }

    // Основная логика
    const cached = getFromCache();
    if (cached && isCacheFresh()) {
        console.log('Используется закэшированное VK видео');
        updateVkIframe(cached.ownerId, cached.videoId);
    } else {
        fetchLatestVideo();
    }
})();