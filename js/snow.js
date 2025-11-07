document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleSnow");
  if (!toggleBtn) return;

  let snowEnabled = localStorage.getItem("snowEnabled") === "true";
  let snowInterval;
  let snowflakes = [];

  function createSnowflake() {
    const snowflake = document.createElement("div");
    snowflake.classList.add("snowflake");
    snowflake.textContent = "❄";
    snowflake.style.left = Math.random() * 100 + "vw";
    snowflake.style.fontSize = Math.random() * 10 + 10 + "px";
    snowflake.style.opacity = 0;
    snowflake.style.animationDuration = 5 + Math.random() * 5 + "s";
    document.body.appendChild(snowflake);
    snowflakes.push(snowflake);

    setTimeout(() => {
      snowflake.remove();
      snowflakes = snowflakes.filter(f => f !== snowflake);
    }, 10000);
  }

  function startSnow() {
    if (!snowInterval) {
      snowInterval = setInterval(createSnowflake, 200);
      toggleBtn.textContent = "❄ Snow Off";
    }
  }

  function fadeOutSnowflakes() {
    snowflakes.forEach(flake => {
      flake.style.animation = "fadeOut 1.5s forwards";
      setTimeout(() => flake.remove(), 1500);
    });
    snowflakes = [];
  }

  function stopSnow() {
    clearInterval(snowInterval);
    snowInterval = null;
    toggleBtn.textContent = "❄ Snow On";
    fadeOutSnowflakes();
  }

  toggleBtn.addEventListener("click", () => {
    snowEnabled = !snowEnabled;
    localStorage.setItem("snowEnabled", snowEnabled);
    snowEnabled ? startSnow() : stopSnow();
  });

  if (snowEnabled) startSnow();
});
