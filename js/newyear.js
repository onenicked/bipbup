let snowActive = true;
        const snowContainer = document.getElementById('snow-container');
        const toggleSnowBtn = document.getElementById('toggle-snow');

        function createSnowflake() {
            const snowflake = document.createElement('div');
            snowflake.classList.add('snowflake');
            snowflake.style.width = `${Math.random() * 5 + 5}px`;
            snowflake.style.height = snowflake.style.width;
            snowflake.style.left = `${Math.random() * 100}vw`;
            snowflake.style.top = `-${Math.random() * 100}px`;
            snowflake.style.animationDuration = `${Math.random() * 5 + 5}s`;
            snowflake.style.animationDelay = `${Math.random() * 5}s`;
            snowContainer.appendChild(snowflake);

            setTimeout(() => {
                snowflake.remove();
            }, 10000);
        }

        let snowInterval;
        function startSnow() {
            snowInterval = setInterval(createSnowflake, 100);
        }

        function stopSnow() {
            clearInterval(snowInterval);
            snowContainer.innerHTML = '';
        }

        toggleSnowBtn.addEventListener('click', () => {
            snowActive = !snowActive;
            if (snowActive) {
                startSnow();
                toggleSnowBtn.textContent = 'Выключить снег';
            } else {
                stopSnow();
                toggleSnowBtn.textContent = 'Включить снег';
            }
        });

        startSnow();

