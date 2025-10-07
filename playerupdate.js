const VK_ACCESS_TOKEN = "0cd516030cd516030cd516031f0fee5e8100cd50cd5160364303a495f16f42a8bb5d240";
const VK_OWNER_ID = "-209507445";
const UPDATE_INTERVAL = 10 * 60 * 1000; // 10 минут

async function loadLatestVKVideo() {
    try {
        // Запрос к VK API
        const response = await fetch(
            `https://api.vk.com/method/video.get?owner_id=${VK_OWNER_ID}&count=1&access_token=${VK_ACCESS_TOKEN}&v=5.199`
        );

        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const data = await response.json();

        if (data.error) {
            console.error("VK API Error:", data.error.error_msg);
            return;
        }

        const video = data.response?.items?.[0];
        if (!video) {
            console.warn("Видео не найдено");
            return;
        }

        const videoId = `${video.owner_id}_${video.id}`;

        const container = document.getElementById("vkVideoPlayer");
        if (!container) {
            console.error("Контейнер #vkVideoPlayer не найден");
            return;
        }

        // Очищаем контейнер перед вставкой нового виджета
        container.innerHTML = "";

        // Вставляем виджет VK Video
        if (typeof VK !== "undefined" && VK.Widgets && VK.Widgets.Video) {
            VK.Widgets.Video("vkVideoPlayer", {
                width: 800,
                height: 500,
                video: videoId,
                autoplay: false
            });
        } else {
            console.error("VK.Widgets.Video недоступен. Проверьте подключение VK SDK.");
        }

    } catch (err) {
        console.error("Ошибка при загрузке видео VK:", err);
    }
}

// Первичная загрузка видео
loadLatestVKVideo();

// Автообновление каждые 10 минут
setInterval(loadLatestVKVideo, UPDATE_INTERVAL);
