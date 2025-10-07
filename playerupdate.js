 VK.init({ apiId: 0 }); // apiId нужен только для некоторых функций

  const VK_OWNER_ID = -209507445; // ID группы/пользователя

  function loadLatestVKVideo() {
    VK.Api.call('video.get', { owner_id: VK_OWNER_ID, count: 1 }, function(r) {
      if(r.response && r.response.items && r.response.items.length) {
        const video = r.response.items[0];
        const videoId = `${video.owner_id}_${video.id}`;
        
        const container = document.getElementById("vkVideoPlayer");
        container.innerHTML = ""; // очистка контейнера

        VK.Widgets.Video("vkVideoPlayer", {
          width: 800,
          height: 500,
          video: videoId,
          autoplay: false
        });
      } else {
        console.warn("Видео не найдено или ошибка VK API", r);
      }
    });
  }

  // Первичная загрузка
  loadLatestVKVideo();

  // Автообновление каждые 10 минут
  setInterval(loadLatestVKVideo, 10 * 60 * 1000);