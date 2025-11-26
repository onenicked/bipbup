(() => {
    'use strict';

    const YOUTUBE_CHANNEL_ID = 'UCjrmposCYp6sJsT2VybjH9A';
    const CHANNEL_URL = `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}/videos`;
    const CACHE_KEY_YT = 'bipbup_latest_yt';
    const CACHE_TIME_KEY = 'bipbup_last_update';
    const UPDATE_INTERVAL_HOURS = 48;

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

    async function fetchWithRetry(url, maxRetries = 3) {
        const proxies = [
            { name: 'corsproxy.io', build: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}` },
            { name: 'codetabs', build: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` },
            { name: 'thingproxy', build: (u) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(u)}` },
            { name: 'allorigins-alt', build: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}` }
        ];

        for (let i = 0; i < maxRetries; i++) {
            const proxy = proxies[i % proxies.length];
            try {
                const proxyUrl = proxy.build(url);
                console.log(`Пробуем прокси ${i + 1}/${maxRetries}: ${proxy.name} для ${url}`);
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                let text;
                if (proxy.name === 'allorigins-alt') {
                    const data = await response.json();
                    text = data.contents;
                } else {
                    text = await response.text();
                }

                if (text && (text.includes('ytInitialData') || text.includes('youtube.com'))) {
                    console.log(`✅ Прокси ${proxy.name} сработал! (длина: ${text.length} символов)`);
                    return text;
                }
            } catch (e) {
                console.warn(`❌ Прокси ${proxy.name} фейил:`, e.message);
            }
        }
        throw new Error('Все прокси отвалились — попробуй VPN или подожди час');
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
            console.log('Парсим страницу канала:', CHANNEL_URL);
            const html = await fetchWithRetry(CHANNEL_URL);

            const dataMatch = html.match(/var\s+ytInitialData\s*=\s*({.+?});/s);
            if (!dataMatch) {
                console.log('ytInitialData не найден в HTML. Snippet для дебага:', html.substring(0, 1000));
                return;
            }

            const dataStr = dataMatch[1];
            const data = JSON.parse(dataStr);

            let videoId = null;
            try {
                const contents = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[1]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0];
                if (contents && contents.videoRenderer) {
                    videoId = contents.videoRenderer.videoId;
                } else {
                    const allVideos = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.find(t => t.tabRenderer?.endpoint?.browseEndpoint?.params?.includes('video_type'))?.tabRenderer?.content;
                    if (allVideos?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.videoRenderer) {
                        videoId = allVideos.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].videoRenderer.videoId;
                    }
                }
            } catch (parseErr) {
                console.warn('Ошибка парсинга JSON:', parseErr);
            }

            if (videoId) {
                ytIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
                saveCache(videoId);
                console.log('🎉 YouTube успешно обновлён →', videoId, '| Ссылка: https://www.youtube.com/watch?v=' + videoId);
            } else {
                console.log('Видео ID не найден в ytInitialData. Структура изменилась? Проверь вручную в исходнике страницы.');
                const fallbackMatch = html.match(/"\/watch\?v=([a-zA-Z0-9_-]{11})"/);
                if (fallbackMatch) {
                    videoId = fallbackMatch[1];
                    ytIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
                    saveCache(videoId);
                    console.log('🎉 Fallback: YouTube обновлён →', videoId);
                } else {
                    console.log('Fallback тоже не сработал. Snippet HTML для дебага:', html.substring(html.indexOf('videoId') - 200, html.indexOf('videoId') + 200) || 'videoId не найден');
                }
            }
        } catch (e) {
            console.error('Критическая ошибка YouTube update:', e);
        }
    }

    setTimeout(() => {
        updateYouTube();
    }, 2000);

})();