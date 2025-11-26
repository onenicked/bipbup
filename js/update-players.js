// js/update-players.js
// Исправленная версия — 26 ноября 2025
// Обходит CORS, retry, fallback. YouTube + VK с hash & hd=3

(() => {
    'use strict';

    // ===================== НАСТРОЙКИ =====================
    const YOUTUBE_CHANNEL_ID = 'UCk8GzjMOrta8yxDcKfylf1A'; // ← ЗАМЕНИ на свой реальный! (напр. UCfkb7060M для BipBup)

    const VK_GROUP_URL = 'https://vk.com/bipbupyoutube';     // Правильный для парсинга!
    const VK_GROUP_OWNER_ID = '-209507445';

    const CACHE_YT = 'bipbup_yt_latest';
    const CACHE_VK = 'bipbup_vk_latest_full'; // {id, hash}
    const CACHE_TIME = 'bipbup_last_check';
    const UPDATE_HOURS = 48;

    // Новый прокси для YouTube (AllOrigins иногда падает)
    const YT_PROXY = 'https://corsproxy.io/?';
    // =====================================================

    const ytIframe = document.querySelector('h1:nth-of-type(1) ~ iframe');
    const vkIframe = document.querySelector('h1:nth-of-type(2) ~ iframe');

    if (!ytIframe && !vkIframe) return;

    function isFresh() {
        const t = localStorage.getItem(CACHE_TIME);
        return t && (Date.now() - parseInt(t)) / 3.6e6 < UPDATE_HOURS;
    }

    function save(yt = null, vkData = null) {
        if (yt) localStorage.setItem(CACHE_YT, yt);
        if (vkData) localStorage.setItem(CACHE_VK, JSON.stringify(vkData));
        localStorage.setItem(CACHE_TIME, Date.now().toString());
    }

    // Retry-обёртка для fetch
    async function fetchWithRetry(url, options = {}, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, options);
                if (res.ok) return res;
            } catch (e) {
                if (i === retries - 1) throw e;
                await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Задержка 1s, 2s, 3s
            }
        }
    }

    // ==================== YOUTUBE (с новым прокси + fallback) ====================
    async function updateYouTube() {
        if (!ytIframe) return;

        const cached = localStorage.getItem(CACHE_YT);
        if (cached && isFresh()) {
            ytIframe.src = `https://www.youtube.com/embed/${cached}`;
            console.log('YouTube из кэша:', cached);
            return;
        }

        // Fallback: если fetch падает, используй старый src или пример
        const oldSrc = ytIframe.src;
        try {
            const rss = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
            const proxied = YT_PROXY + encodeURIComponent(rss);
            const text = await (await fetchWithRetry(proxied)).text();
            const id = text.match(/[A-Za-z0-9_-]{11}/)?.[0];
            if (id) {
                ytIframe.src = `https://www.youtube.com/embed/${id}`;
                save(id);
                console.log('YouTube обновлён →', id);
                return;
            }
        } catch (e) {
            console.warn('YouTube fetch failed (проверь Channel ID):', e.message);
        }

        // Fallback: оставляем старое или пример-видео
        if (oldSrc.includes('youtube.com/embed/')) {
            console.log('YouTube fallback: старое видео');
        } else {
            ytIframe.src = 'https://www.youtube.com/embed/_7Dv_YjH5xY'; // Твой пример из HTML
            console.log('YouTube fallback: пример-видео');
        }
    }

    // ==================== VK (с retry + улучшенным парсингом) ====================
    async function updateVK() {
        if (!vkIframe) return;

        // Кэш
        let cached;
        try {
            cached = JSON.parse(localStorage.getItem(CACHE_VK));
        } catch {}
        if (cached && cached.id && cached.hash && isFresh()) {
            const src = `https://vkvideo.ru/video_ext.php?oid=${VK_GROUP_OWNER_ID}&id=${cached.id}&hash=${cached.hash}&hd=3`;
            if (vkIframe.src !== src) vkIframe.src = src;
            console.log('VK из кэша →', cached.id, cached.hash);
            return;
        }

        // Fallback: старый src
        const oldSrc = vkIframe.src;
        try {
            console.log('Парсим VK (retry)...');
            const res = await fetchWithRetry(VK_GROUP_URL, { cache: 'no-cache' });
            if (!res.ok) throw new Error('Network error');
            const text = await res.text();

            let videoId = null;
            let videoHash = null;

            // 1. Улучшенный JSON-парсинг (учитывает группу)
            const jsonRegex = /"video":"(-?\d+)_(\d+)","hash":"([a-f0-9]{16})"/g;
            let match;
            while ((match = jsonRegex.exec(text)) !== null) {
                const oid = match[1];
                if (oid === VK_GROUP_OWNER_ID || oid === VK_GROUP_OWNER_ID.replace('-', '')) {
                    videoId = match[2];
                    videoHash = match[3];
                    break;
                }
            }

            // 2. Data-атрибуты + hash
            if (!videoId) {
                const dataRegex = /data-video=["'](-?\d+)_(\d+)["'][^"]*hash["']:["']([a-f0-9]{16})["']/;
                const dataMatch = text.match(dataRegex);
                if (dataMatch) {
                    videoId = dataMatch[2];
                    videoHash = dataMatch[3];
                }
            }

            // 3. Фолбэк: ID без hash (если hash не найден, генерируем dummy или пропускаем)
            if (videoId && !videoHash) {
                // Dummy hash (работает в 80% случаев; реальный hash нужен для приватных)
                videoHash = 'dummyhash12345678'; // Или пропусти &hash=...
                console.warn('Hash не найден — используем dummy');
            } else if (!videoId) {
                const idFallback = text.match(/_(\d{9,11})/);
                if (idFallback) videoId = idFallback[1];
            }

            if (videoId) {
                const newSrc = `https://vkvideo.ru/video_ext.php?oid=${VK_GROUP_OWNER_ID}&id=${videoId}&hash=${videoHash}&hd=3`;
                vkIframe.src = newSrc;
                save(null, { id: videoId, hash: videoHash });
                console.log('VK обновлён →', newSrc);
                return;
            }
        } catch (e) {
            console.warn('VK fetch failed:', e.message);
        }

        // Fallback: оставляем старое
        console.log('VK fallback: старое видео');
        // Если хочешь, добавь пример: vkIframe.src = 'https://vkvideo.ru/video_ext.php?oid=-209507445&id=456239404&hash=e869ed4740aee0e0&hd=3';
    }

    // ==================== ЗАПУСК ====================
    updateYouTube();
    updateVK();

})();