(() => {
    'use strict';

    const YOUTUBE_CHANNEL_ID = 'UCjrmposCYp6sJsT2VybjH9A';
    const CHANNEL_URL = `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}/videos`;
    const CACHE_KEY_YT = 'bipbup_latest_yt';
    const CACHE_TIME_KEY = 'bipbup_last_update';
    const UPDATE_INTERVAL_HOURS = 48;

    const VK_GROUP_ID = 'bipbupyoutube';
    const VK_VIDEOS_URL = `https://vk.com/${VK_GROUP_ID}/videos`;
    const CACHE_KEY_VK = 'bipbup_latest_vk';
    const CACHE_TIME_KEY_VK = 'bipbup_last_update_vk';

    const ytIframe = document.querySelector('h1:nth-of-type(1) ~ iframe');
    const vkIframe = document.querySelector('h1:nth-of-type(2) ~ iframe');

    function isCacheFresh() {
        const ts = localStorage.getItem(CACHE_TIME_KEY);
        if (!ts) return false;
        return (Date.now() - parseInt(ts)) / (3.6e6) < UPDATE_INTERVAL_HOURS;
    }

    function saveCache(ytId) {
        if (ytId) localStorage.setItem(CACHE_KEY_YT, ytId);
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    }

    function isCacheFreshVK() {
        const ts = localStorage.getItem(CACHE_TIME_KEY_VK);
        if (!ts) return false;
        return (Date.now() - parseInt(ts)) / (3.6e6) < UPDATE_INTERVAL_HOURS;
    }

    function saveCacheVK(vkData) {
        if (vkData) localStorage.setItem(CACHE_KEY_VK, JSON.stringify(vkData));
        localStorage.setItem(CACHE_TIME_KEY_VK, Date.now().toString());
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

                if (text && (text.includes('ytInitialData') || text.includes('youtube.com') || text.includes('vk.com') || text.includes('video'))) {
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

    async function updateVK() {
        if (!vkIframe) {
            console.log('VK iframe не найден на странице');
            return;
        }

        const currentSrc = vkIframe.src;
        let fallbackHash = null;
        const currentHashMatch = currentSrc.match(/hash=([a-f0-9]+)/i);
        if (currentHashMatch) {
            fallbackHash = currentHashMatch[1];
        }

        const cached = localStorage.getItem(CACHE_KEY_VK);
        if (cached && isCacheFreshVK()) {
            try {
                const vkData = JSON.parse(cached);
                const hashToUse = vkData.hash || fallbackHash || 'default';
                vkIframe.src = `https://vkvideo.ru/video_ext.php?oid=${vkData.oid}&id=${vkData.id}&hash=${hashToUse}&hd=3`;
                console.log('VK из кэша:', vkData);
                return;
            } catch (e) {
                console.warn('Ошибка чтения кэша VK:', e);
            }
        }

        try {
            console.log('Парсим страницу видео VK:', VK_VIDEOS_URL);
            const html = await fetchWithRetry(VK_VIDEOS_URL);

            let vkData = null;
            
            const embedMatch = html.match(/vkvideo\.ru\/video_ext\.php\?oid=(-?\d+)&id=(\d+)&hash=([a-f0-9]+)/i);
            if (embedMatch) {
                vkData = {
                    oid: embedMatch[1],
                    id: embedMatch[2],
                    hash: embedMatch[3]
                };
                console.log('Найдено VK видео через embed URL:', vkData);
            }
            
            if (!vkData) {
                const videoMatch = html.match(/\/video(-?\d+_\d+)/);
                if (videoMatch) {
                    const videoId = videoMatch[1];
                    const [oid, id] = videoId.split('_');
                    console.log('Найдено видео VK:', { oid, id });
                    
                    let hash = null;
                    
                    const hashPatterns = [
                        /hash[":=]\s*['"]?([a-f0-9]{16})['"]?/i,
                        /"hash"\s*:\s*"([a-f0-9]{16})"/i,
                        /hash=([a-f0-9]{16})/i,
                        /video_ext\.php[^"']*hash=([a-f0-9]{16})/i
                    ];
                    
                    for (const pattern of hashPatterns) {
                        const match = html.match(pattern);
                        if (match) {
                            hash = match[1];
                            break;
                        }
                    }
                    
                    if (oid && id) {
                        if (!hash) {
                            try {
                                const videoPageUrl = `https://vk.com/video${oid}_${id}`;
                                console.log('Пробуем получить hash со страницы видео:', videoPageUrl);
                                const videoHtml = await fetchWithRetry(videoPageUrl);
                                
                                for (const pattern of hashPatterns) {
                                    const match = videoHtml.match(pattern);
                                    if (match) {
                                        hash = match[1];
                                        break;
                                    }
                                }
                                
                                const videoEmbedMatch = videoHtml.match(/vkvideo\.ru\/video_ext\.php\?oid=(-?\d+)&id=(\d+)&hash=([a-f0-9]+)/i);
                                if (videoEmbedMatch) {
                                    hash = videoEmbedMatch[3];
                                }
                            } catch (e) {
                                console.warn('Не удалось получить hash со страницы видео:', e);
                            }
                        }
                        
                        vkData = { oid, id, hash: hash || fallbackHash || null };
                    }
                }
            }

            if (!vkData) {
                const dataMatch = html.match(/window\.__DATA__\s*=\s*({.+?});/s);
                if (dataMatch) {
                    try {
                        const data = JSON.parse(dataMatch[1]);
                        const videoIdMatch = JSON.stringify(data).match(/"video"(-?\d+_\d+)/);
                        if (videoIdMatch) {
                            const [oid, id] = videoIdMatch[1].split('_');
                            vkData = { oid, id, hash: 'default' };
                        }
                    } catch (e) {
                        console.warn('Ошибка парсинга JSON данных VK:', e);
                    }
                }
            }

            if (!vkData) {
                const allVideoMatches = html.matchAll(/video(-?\d+_\d+)/g);
                const videos = Array.from(allVideoMatches).map(m => m[1]);
                if (videos.length > 0) {
                    const latestVideo = videos[0];
                    const [oid, id] = latestVideo.split('_');
                    vkData = { oid, id, hash: fallbackHash || null };
                    console.log('Найдено VK видео через поиск всех видео:', vkData);
                }
            }

            if (vkData && vkData.oid && vkData.id) {
                const hashToUse = vkData.hash || fallbackHash || 'default';
                const vkUrl = `https://vkvideo.ru/video_ext.php?oid=${vkData.oid}&id=${vkData.id}&hash=${hashToUse}&hd=3`;
                vkIframe.src = vkUrl;
                
                if (!vkData.hash && !fallbackHash) {
                    console.warn('⚠️ Hash не найден, используется fallback. Видео может не работать. Попробуй обновить страницу позже.');
                } else {
                    console.log('🎉 VK успешно обновлён →', vkData, '| Ссылка:', `https://vk.com/video${vkData.oid}_${vkData.id}`);
                }
                
                saveCacheVK({ ...vkData, hash: hashToUse });
            } else {
                console.log('VK видео не найдено. Попробуй проверить страницу вручную:', VK_VIDEOS_URL);
            }
        } catch (e) {
            console.error('Критическая ошибка VK update:', e);
        }
    }

    setTimeout(() => {
        updateYouTube();
        updateVK();
    }, 2000);

})();