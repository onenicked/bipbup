// js/update-players.js
// Рабочая версия — ноябрь 2025
// YouTube + VK с hash (vkvideo.ru/video_ext.php?...&hash=...&hd=3)

(() => {
    'use strict';

    // ===================== НАСТРОЙКИ =====================
    const YOUTUBE_CHANNEL_ID = 'UCk8GzjMOrta8yxDcKfylf1A'; // ← замени на свой настоящий ID канала!

    const VK_GROUP_URL       = 'https://vk.com/bipbupyoutube';
    const VK_GROUP_OWNER_ID  = '-209507445';                 // с минусом

    const CACHE_YT    = 'bipbup_yt_latest';
    const CACHE_VK    = 'bipbup_vk_latest_full'; // {id, hash}
    const CACHE_TIME  = 'bipbup_last_check';
    const UPDATE_HOURS = 48;
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

    // ==================== YOUTUBE ====================
    async function updateYouTube() {
        if (!ytIframe) return;

        const cached = localStorage.getItem(CACHE_YT);
        if (cached && isFresh()) {
            ytIframe.src = `https://www.youtube.com/embed/${cached}`;
            return;
        }

        try {
            const rss = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
            const text = await (await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(rss))).text();
            const id = text.match(/[A-Za-z0-9_-]{11}/)?.[0];
            if (id) {
                ytIframe.src = `https://www.youtube.com/embed/${id}`;
                save(id);
                console.log('YouTube обновлён →', id);
            }
        } catch (e) {
            console.error('YouTube ошибка:', e);
        }
    }

    // ==================== VK с hash ====================
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

        try {
            console.log('Ищем новое видео VK…');
            const res = await fetch(VK_GROUP_URL, { cache: 'no-cache' });
            if (!res.ok) throw new Error('Network error');
            const text = await res.text();

            let videoId = null;
            let videoHash = null;

            // 1. Самый надёжный способ 2025 года — JSON в JSON
            const jsonRegex = /"video":"-?\d+_(\d+)","hash":"([a-f0-9]{16})"/g;
            let match;
            while ((match = jsonRegex.exec(text)) !== null) {
                videoId = match[1];
                videoHash = match[2];
                break; // берём первое (самое новое)
            }

            // 2. Запасной вариант — data-video + hash рядом
            if (!videoId) {
                const fallback = text.match(/data-video=["']-?\d+_(\d+)["'][^>]*?]*["']hash["']:["']([a-f0-9]{16})["']/);
                if (fallback) {
                    videoId = fallback[1];
                    videoHash = fallback[2];
                }
            }

            // 3. Совсем крайний фолбэк
            if (!videoId) {
                const idMatch = text.match(/_(\d{9,11})/);
                if (idMatch) videoId = idMatch[1];
                const hashMatch = text.match(/([a-f0-9]{16})/);
                if (hashMatch) videoHash = hashMatch[1];
            }

            if (videoId && videoHash) {
                const newSrc = `https://vkvideo.ru/video_ext.php?oid=${VK_GROUP_OWNER_ID}&id=${videoId}&hash=${videoHash}&hd=3`;
                vkIframe.src = newSrc;
                save(null, { id: videoId, hash: videoHash });
                console.log('VK обновлён →', newSrc);
            } else {
                console.warn('Не удалось найти id+hash. Оставляем старое видео.');
            }
        } catch (e) {
            console.error('Ошибка VK:', e);
        }
    }

    // ==================== ЗАПУСК ====================
    updateYouTube();
    updateVK();

})();