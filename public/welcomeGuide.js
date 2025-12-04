// welcomeGuide.js
// Система приветственного гида для новых игроков (после 100 пикселей)

window.welcomeGuideSystem = (function () {
  let hasSeenWelcome = false;
  let welcomeDialog = null;
  let isWaitingForGuide = false;
  let guideTimer = null;

  // Создаём диалог
  function createWelcomeDialog() {
    if (welcomeDialog) return;

    welcomeDialog = document.createElement("div");
    welcomeDialog.id = "welcomeGuideDialog";
    welcomeDialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 600px;
      background: rgba(10, 0, 30, 0.97);
      border: 3px solid #00ffff;
      border-radius: 20px;
      box-shadow: 0 0 40px #00ffff, inset 0 0 20px rgba(0, 255, 255, 0.3);
      color: #00ffff;
      font-family: 'Courier New', monospace;
      font-size: 18px;
      text-align: center;
      padding: 30px 20px;
      z-index: 10000;
      animation: glowPulse 3s infinite alternate;
      backdrop-filter: blur(8px);
    `;

    const title = document.createElement("h2");
    title.textContent = "ДОБРО ПОЖАЛОВАТЬ В 8-Й СЕКТОР";
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 28px;
      color: #ff00ff;
      text-shadow: 0 0 20px #ff00ff;
      letter-spacing: 3px;
    `;

    const text = document.createElement("p");
    text.innerHTML = `
      Ты пересёк границу Неонового города.<br><br>
      Здесь правят три закона:<br>
      <span style="color:#ff0088">1. Не доверяй корпорациям.</span><br>
      <span style="color:#ff0088">2. Баляры — это власть.</span><br>
      <span style="color:#ff0088">3. Выживает только тот, кто платит.</span><br><br>
      Остановись. Подожди минуту на месте.<br>
      Скоро подойдёт проводник — он расскажет, как выжить в этом аду.<br><br>
      <span style="color:#00ff44; font-size:16px;">Не двигайся. Жди сигнала.</span>
    `;
    text.style.lineHeight = "1.8";

    const button = document.createElement("button");
    button.textContent = "ПОНЯЛ";
    button.style.cssText = `
      margin-top: 30px;
      padding: 14px 40px;
      font-size: 20px;
      font-weight: bold;
      background: linear-gradient(45deg, #ff00ff, #00ffff);
      color: black;
      border: none;
      border-radius: 50px;
      cursor: pointer;
      box-shadow: 0 0 30px #ff00ff;
      transition: all 0.3s;
    `;

    button.onmouseover = () => {
      button.style.transform = "scale(1.1)";
      button.style.boxShadow = "0 0 50px #ff00ff";
    };
    button.onmouseout = () => {
      button.style.transform = "scale(1)";
      button.style.boxShadow = "0 0 30px #ff00ff";
    };

    button.onclick = () => {
      hasSeenWelcome = true;
      if (welcomeDialog && welcomeDialog.parentNode) {
        welcomeDialog.parentNode.removeChild(welcomeDialog);
      }
      welcomeDialog = null;

      // Сохраняем на сервере
      if (ws && ws.readyState === WebSocket.OPEN) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "welcomeGuideSeen",
            seen: true,
          })
        );
      }

      // Запускаем таймер ожидания проводника (60 сек)
      startGuideTimer();
    };

    welcomeDialog.appendChild(title);
    welcomeDialog.appendChild(text);
    welcomeDialog.appendChild(button);
    document.body.appendChild(welcomeDialog);

    // Добавляем глобальную анимацию свечения
    if (!document.getElementById("globalGlowAnimation")) {
      const style = document.createElement("style");
      style.id = "globalGlowAnimation";
      style.textContent = `
        @keyframes glowPulse {
          from { box-shadow: 0 0 40px #00ffff, inset 0 0 20px rgba(0, 255, 255, 0.3); }
          to { box-shadow: 0 0 60px #00ffff, inset 0 0 30px rgba(0, 255, 255, 0.5); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  function startGuideTimer() {
    if (isWaitingForGuide) return;
    isWaitingForGuide = true;

    showNotification("Ожидание проводника... 60 сек", "#00ff44");

    guideTimer = setTimeout(() => {
      isWaitingForGuide = false;
      showNotification(
        "Проводник не пришёл. Ты теперь сам по себе.",
        "#ff0088"
      );
      showNotification("Добро пожаловать в ад, новичок.", "#ff00ff");
    }, 60000);
  }

  // Проверка расстояния
  function checkDistance() {
    const me = players.get(myId);
    if (!me || hasSeenWelcome) return;

    // Показываем только если прошёл 100+ пикселей и ещё не видел
    if (me.distanceTraveled >= 100 && !hasSeenWelcome) {
      createWelcomeDialog();
    }
  }

  // Публичные методы
  return {
    initialize: function () {
      // При логине проверяем, видел ли уже
      const me = players.get(myId);
      if (me && me.hasSeenWelcomeGuide) {
        hasSeenWelcome = true;
      }

      // Подписываемся на обновления
      const originalHandleGameMessage = handleGameMessage;
      handleGameMessage = function (event) {
        const data = JSON.parse(event.data);

        if (data.type === "update" && data.player && data.player.id === myId) {
          // Обновляем расстояние и проверяем
          setTimeout(checkDistance, 100);
        }

        if (data.type === "welcomeGuideSeenConfirm") {
          const me = players.get(myId);
          if (me) me.hasSeenWelcomeGuide = true;
        }

        // Не забываем вызвать старую функцию
        return originalHandleGameMessage(event);
      };

      // Первая проверка
      setTimeout(checkDistance, 2000);
    },

    // Для вызова извне (если нужно)
    forceShow: function () {
      hasSeenWelcome = false;
      createWelcomeDialog();
    },
  };
})();

// Автозапуск после загрузки
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (window.welcomeGuideSystem && myId) {
      window.welcomeGuideSystem.initialize();
    }
  }, 3000);
});
