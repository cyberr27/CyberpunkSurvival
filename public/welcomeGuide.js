// welcomeGuide.js — ФИНАЛЬНАЯ ВЕРСИЯ 2025 (стиль 100% как у NPC)

window.welcomeGuideSystem = (function () {
  let hasSeen = false;
  let dialog = null;

  function show() {
    if (dialog || hasSeen) return;

    dialog = document.createElement("div");
    dialog.className = "npc-dialog"; // ← ТОТ ЖЕ КЛАСС, ЧТО И У NPC — ВСЁ СТИЛИ УЖЕ ЕСТЬ

    dialog.innerHTML = `
      <div class="npc-dialog-photo">
        <img src="jackPhoto.png" alt="Проводник" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
      </div>
      <div class="npc-dialog-content">
        <h3 class="npc-title">СИГНАЛ ИЗ 8-ГО СЕКТОРА</h3>
        <div class="npc-text fullscreen">
          Ты пересёк невидимую черту.<br><br>
          Здесь нет закона. Только три правила:<br><br>
          <span style="color:#ff0088; font-weight:bold;">Корпорации лгут.</span><br>
          <span style="color:#ff0088; font-weight:bold;">Баляры — валюта.</span><br>
          <span style="color:#ff0088; font-weight:bold;">Не платишь — не живёшь.</span><br><br>
          Стой. Жди. Проводник идёт.<br>
          Через минуту он будет здесь.<br><br>
          <span style="color:#00ff44; font-size:19px; text-shadow: 0 0 10px #00ff44;">
            Не двигайся. Это не шутка.
          </span>
        </div>
        <button id="welcomeBtn" class="neon-btn">ПОНЯЛ</button>
      </div>
    `;

    document.body.appendChild(dialog);

    // Анимация появления (та же, что у NPC)
    dialog.style.opacity = "0";
    dialog.style.transform = "translate(-50%, -50%) scale(0.8)";
    setTimeout(() => {
      dialog.style.transition =
        "all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      dialog.style.opacity = "1";
      dialog.style.transform = "translate(-50%, -50%) scale(1)";
    }, 50);

    document.getElementById("welcomeBtn").onclick = () => {
      hasSeen = true;

      // Плавное исчезновение
      dialog.style.transition = "all 0.5s ease-out";
      dialog.style.opacity = "0";
      dialog.style.transform = "translate(-50%, -50%) scale(0.9)";
      setTimeout(() => dialog.remove(), 500);

      // Отправляем на сервер
      if (ws && ws.readyState === WebSocket.OPEN) {
        sendWhenReady(ws, JSON.stringify({ type: "welcomeGuideSeen" }));
      }

      // Атмосферные уведомления
      showNotification("Ожидание проводника... 60 сек", "#00ff44");
      setTimeout(() => {
        showNotification("Проводник опаздывает...", "#ff8800");
        setTimeout(() => {
          showNotification("Ты один. Выживай.", "#ff0000");
        }, 30000);
      }, 60000);
    };
  }

  function check() {
    if (hasSeen) return;
    const me = players.get(myId);
    if (me && me.distanceTraveled >= 100 && !me.hasSeenWelcomeGuide) {
      show();
    }
  }

  return {
    init: function () {
      // Проверяем каждые 1.5 сек + сразу через 3 сек после входа
      setInterval(check, 1500);
      setTimeout(check, 3000);
    },
    setSeen: function (value) {
      hasSeen = !!value;
    },
    forceShow: function () {
      hasSeen = false;
      show();
    },
  };
})();

// Автозапуск после входа в игру
setInterval(() => {
  if (myId && players.has(myId) && window.welcomeGuideSystem) {
    window.welcomeGuideSystem.init();
    clearInterval(this);
  }
}, 500);
