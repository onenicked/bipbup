const VK_ACCESS_TOKEN = "0cd516030cd516030cd516031f0fee5e8100cd50cd5160364303a495f16f42a8bb5d240";
const VK_OWNER_ID = "-209507445";

async function loadLatestVKVideo() {
        try {
            const res = await fetch(`https://api.vk.com/method/video.get?owner_id=${VK_OWNER_ID}&count=1&access_token=${VK_ACCESS_TOKEN}&v=5.199`);
            const data = await res.json();

            if (data.error) {
                console.error("VK API Error:", data.error);
                return;
            }

            const video = data.response?.items?.[0];
            if (!video) return;

            const videoId = `${video.owner_id}_${video.id}`;

            const container = document.getElementById("vkVideoPlayer");
            container.innerHTML = "";

            VK.Widgets.Video("vkVideoPlayer", {
                width: 800,
                height: 500,
                video: videoId,
                autoplay: false
            });
        } catch (err) {
            console.error("Ошибка при загрузке видео VK:", err);
        }
    }

loadLatestVKVideo();

setInterval(loadLatestVKVideo, 600000);