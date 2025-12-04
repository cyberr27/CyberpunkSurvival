// welcomeGuide.js — ФИНАЛЬНАЯ ВЕРСИЯ (стиль как у NPC)

window.welcomeGuideSystem = (function () {
  let hasSeen = false;
  let dialog = null;

  function show() {
    if (dialog || hasSeen) return;

    dialog = document.createElement("div");
    dialog.className = "npc-dialog"; // ← используем тот же класс, что и у NPC
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 650px;
      z-index: 99999;
      animation: dialogAppear 0.6s ease-out;
    `;

    dialog.innerHTML = `
      <div class="npc-dialog-photo">
        <img src="jackPhoto.png" alt="Проводник" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <div class="npc-dialog-content">
        <h3>СИГНАЛ ИЗ 8-ГО СЕКТОРА</h3>
        <p>
          Ты пересёк невидимую черту.<br><br>
          Здесь нет закона. Только три правила:<br><br>
          <span style="color:#ff0088">Корпорации лгут.</span><br>
          <span style="color:#ff0088">Баляры — валюта.</span><br>
          <span style="color:#ff0088">Не платишь — не живёшь.</span><br><br>
          Стой. Жди. Проводник идёт.<br>
          Через минуту он будет здесь.<br><br>
          <span style="color:#00ff44; font-size:18px;">Не двигайся. Это не шутка.</span>
        </p>
        <button id="welcomeBtn" class="npc-dialog-btn">ПОНЯЛ</button>
      </div>
    `;

    document.body.appendChild(dialog);

    document.getElementById("welcomeBtn").onclick = () => {
      hasSeen = true;
      if (dialog) dialog.remove();

      if (ws && ws.readyState === WebSocket.OPEN) {
        sendWhenReady(ws, JSON.stringify({ type: "welcomeGuideSeen" }));
      }

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
    if (me && me.distanceTraveled >= 100) {
      show();
    }
  }

  return {
    init: function () {
      setInterval(check, 1500);
      setTimeout(check, 3000);
    },
    setSeen: function (value) {
      hasSeen = value;
    },
    forceShow: function () {
      hasSeen = false;
      show();
    },
  };
})();

// Автозапуск — только после входа
setInterval(() => {
  if (myId && players.has(myId) && window.welcomeGuideSystem) {
    window.welcomeGuideSystem.init();
    clearInterval(this);
  }
}, 500);
