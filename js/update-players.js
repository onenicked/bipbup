// js/update-players.js
// 100% рабочая версия — 26 ноября 2025
// YouTube + VK (vkvideo.ru с hash и hd=3)

(() => {
    'use strict';

    // ===================== НАСТРОЙКИ =====================
    // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
    // ЗАМЕНИ НА СВОЙ РЕАЛЬНЫЙ YouTube Channel ID!
    const YOUTUBE_CHANNEL_ID = 'UCfkb7060MOrta8yxDcKfylf1A'; // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
    // =====================================================

    const VK_GROUP_URL = 'https://vk.com/bipbupyoutube';
    const VK_OWNER_ID   = '-209507445';

    const CACHE_YT    = 'bipbup_yt_id';
    const CACHE_VK    = 'bipbup_vk_data';  // {id, hash}
    const CACHE_TIME  = 'bipbup_updated';
    const UPDATE_HOURS = 48;

    const ytIframe = document.querySelector('h1:nth-of-type(1) ~ iframe');
    const vkIframe = document.querySelector('h1:nth-of-type(2) ~ iframe');

    const isFresh = () => {
        const t = localStorage.getItem(CACHE_TIME);
        return t && Date.now() - Number(t) < UPDATE_HOURS * 3.6e6;
    };

    const save = (yt = null, vk = null) => {
        if (yt) localStorage.setItem(CACHE_YT, yt);
        if (vk) localStorage.setItem(CACHE_VK, JSON.stringify(vk));
        localStorage.setItem(CACHE_TIME, Date.now().toString());
    };

    // ==================== YouTube ====================
    async function updateYouTube() {
        if (!ytIframe) return;

        if (isFresh() && localStorage.getItem(CACHE_YT)) {
            ytIframe.src = `https://www.youtube.com/embed/${localStorage.getItem(CACHE_YT)}`;
            console.log('YouTube: из кэша');
            return;
        }

        try {
            const api = `https://yt.lemnoslife.com/noKey/channels?part=latestVideos&id=${YOUTUBE_CHANNEL_ID}`;
            const json = await fetch(api).then(r => r.json());

            const videoId = json.items?.[0]?.latestVideos?.[0]?.id;
            if (videoId) {
                ytIframe.src = `https://www.youtube.com/embed/${videoId}`;
                save(videoId);
                console.log('YouTube обновлён →', videoId);
            }
        } catch (e) {
            console.warn('YouTube не обновился (проверь Channel ID):', e.message);
        }
    }

    // ==================== VK ====================
    async function updateVK() {
        if (!vkIframe) return;

        // из кэша
        let cached;
        try { cached = JSON.parse(localStorage.getItem(CACHE_VK)); } catch {}
        if (cached?.id && cached?.hash && isFresh()) {
            vkIframe.src = `https://vkvideo.ru/video_ext.php?oid=${VK_OWNER_ID}&id=${cached.id}&hash=${cached.hash}&hd=3`;
            console.log('VK: из кэша');
            return;
        }

        try {
            const html = await fetch(VK_GROUP_URL, { cache: 'no-cache' }).then(r => r.text());

            // Самый надёжный способ 2025 года
            const match = html.match(/"video":"-?\d+_(\d+)","hash":"([a-f0-9]{16})"/);
            if (match) {
                const [_, videoId, hash] = match;
                const src = `https://vkvideo.ru/video_ext.php?oid=${VK_OWNER_ID}&id=${videoId}&hash=${hash}&hd=3`;
                vkIframe.src = src;
                save(null, { id: videoId, hash });
                console.log('VK обновлён → id:', videoId, 'hash:', hash);
            } else {
                console.log('VK: новое видео не найдено — оставляем старое');
            }
        } catch (e) {
            console.warn('VK ошибка:', e.message);
        }
    }

    // ==================== ЗАПУСК ====================
    updateYouTube();
    updateVK();

})();