(() => {
    'use strict';

    const YOUTUBE_CHANNEL_ID = 'UCk8GzjMOrta8yxDcKfylf1A';

    const CACHE_KEY_YT = 'bipbup_latest_yt';
    const CACHE_TIME_KEY = 'bipbup_last_update';
    const UPDATE_INTERVAL_HOURS = 48;
    // =====================================================

    const ytIframe = document.querySelector('h1:nth-of-type(1) ~ iframe');

    function isCacheFresh() {
        const ts = localStorage.getItem(CACHE_TIME_KEY);
        if (!ts) return false;
        return (Date.now() - parseInt(ts)) / (3.6e6) < UPDATE_INTERVAL_HOURS;
    }

    function saveCache(ytId) {
        if (ytId) localStorage.setItem(CACHE_KEY_YT, ytId);
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    }

    async function updateYouTube() {
        if (!ytIframe) {
            console.log('YouTube iframe не найден на странице');
            return;
        }

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
            } else {
                console.log('Не удалось найти видео в RSS-фиде YouTube');
            }
        } catch (e) {
            console.error('YouTube update error:', e);
        }
    }

    updateYouTube();

})();