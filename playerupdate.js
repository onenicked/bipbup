const VK_ACCESS_TOKEN = "0cd516030cd516030cd516031f0fee5e8100cd50cd5160364303a495f16f42a8bb5d240";
const VK_OWNER_ID = "-209507445";

async function getLatestVKVideo() {
  const res = await fetch(
    `https://api.vk.com/method/video.get?owner_id=${VK_OWNER_ID}&count=1&access_token=${VK_ACCESS_TOKEN}&v=5.199`
  );
  const data = await res.json();

  if (data.error) {
    console.error("VK API Error:", data.error);
    return null;
  }

  const video = data.response?.items?.[0];
  if (!video) return null;

  return `https://vkvideo.ru/video_ext.php?oid=${video.owner_id}&id=${video.id}`;
}

async function updatePlayers() {
  const vkUrl = await getLatestVKVideo();
  const player = document.getElementById("vkPlayer");

  if (player) {
    player.src = vkUrl || "https://vkvideo.ru/video_ext.php?oid=-209507445&id=456239393";
  }
}

updatePlayers();
setInterval(updatePlayers, 600000);
