// welcomeGuide.js — ИСПРАВЛЕННАЯ ВЕРСИЯ (работает 100%)

window.welcomeGuideSystem = (function () {
  let hasSeenWelcome = false;
  let welcomeDialog = null;
  let initialized = false;

  function createWelcomeDialog() {
    if (welcomeDialog || hasSeenWelcome) return;

    welcomeDialog = document.createElement("div");
    welcomeDialog.id = "welcomeGuideDialog";
    welcomeDialog.style.cssText = `
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 90%; max-width: 620px;
      background: rgba(8, 0, 35, 0.98);
      border: 3px solid #00ffff;
      border-radius: 20px;
      box-shadow: 0 0 50px #00ffff;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      text-align: center;
      padding: 35px 25px;
      z-index: 99999;
      animation: glowPulse 2s infinite alternate;
      backdrop-filter: blur(10px);
    `;

    welcomeDialog.innerHTML = `
      <h2 style="margin:0 0 25px; color:#ff00ff; font-size:30px; text-shadow:0 0 20px #ff00ff;">
        ДОБРО ПОЖАЛОВАТЬ В 8-Й СЕКТОР
      </h2>
      <p style="line-height:1.9; font-size:19px;">
        Ты пересёк границу Неонового города.<br><br>
        Здесь правят три закона:<br>
        <span style="color:#ff0088">1. Не доверяй корпорациям.</span><br>
        <span style="color:#ff0088">2. Баляры — это власть.</span><br>
        <span style="color:#ff0088">3. Выживает только тот, кто платит.</span><br><br>
        Остановись. Подожди минуту на месте.<br>
        Скоро подойдёт проводник — он расскажет, как выжить в этом аду.<br><br>
        <span style="color:#00ff44;">Не двигайся. Жди сигнала.</span>
      </p>
      <button id="welcomeUnderstoodBtn" style="
        margin-top: 30px; padding: 16px 50px;
        font-size: 22px; font-weight: bold;
        background: linear-gradient(45deg, #ff00ff, #00ffff);
        color: black; border: none; border-radius: 50px;
        cursor: pointer; box-shadow: 0 0 40px #ff00ff;
        transition: all 0.3s;
      ">ПОНЯЛ</button>
    `;

    document.body.appendChild(welcomeDialog);

    document.getElementById("welcomeUnderstoodBtn").onclick = () => {
      hasSeenWelcome = true;
      if (welcomeDialog) welcomeDialog.remove();
      welcomeDialog = null;

      if (ws && ws.readyState === WebSocket.OPEN) {
        sendWhenReady(ws, JSON.stringify({ type: "welcomeGuideSeen" }));
      }

      showNotification("Ожидание проводника... 60 сек", "#00ff44");
      setTimeout(() => {
        showNotification("Проводник не пришёл.", "#ff0088");
        showNotification("Ты теперь сам по себе, новичок.", "#ff00ff");
      }, 60000);
    };

    // Анимация
    if (!document.getElementById("welcomeGlow")) {
      const style = document.createElement("style");
      style.id = "welcomeGlow";
      style.textContent = `
        @keyframes glowPulse {
          from { box-shadow: 0 0 50px #00ffff; }
          to { box-shadow: 0 0 80px #00ffff, 0 0 100px #ff00ff; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  function checkAndShow() {
    if (hasSeenWelcome) return;
    const me = players.get(myId);
    if (me && me.distanceTraveled >= 100) {
      createWelcomeDialog();
    }
  }

  return {
    // Вызывается после loginSuccess
    init: function () {
      if (initialized) return;
      initialized = true;

      // Проверяем каждые 2 сек — надёжно
      setInterval(checkAndShow, 2000);
      setTimeout(checkAndShow, 3000);
    },

    // Вызывается из code.js при логине
    setSeen: function (seen) {
      hasSeenWelcome = seen;
    },

    // Для теста
    forceShow: function () {
      hasSeenWelcome = false;
      createWelcomeDialog();
    },
  };
})();

// Автозапуск — только после входа в игру
document.addEventListener("DOMContentLoaded", () => {
  const check = () => {
    if (myId && players.has(myId)) {
      window.welcomeGuideSystem.init();
    } else {
      setTimeout(check, 500);
    }
  };
  check();
});
