// welcomeGuide.js — УЛЬТРА-ОПТИМИЗИРОВАННАЯ ВЕРСИЯ 2025+ | СЕКТОР 8

(() => {
  let hasSeen = false;
  let dialog = null;
  let checkInterval = null;
  let initTimeout = null;

  const show = () => {
    if (dialog || hasSeen) return;

    dialog = document.createElement("div");
    dialog.className = "npc-dialog";
    dialog.innerHTML = `
      <div class="npc-dialog-photo">
        <img src="section8.png" alt="СЕКТОР 8" loading="lazy">
      </div>
      <div class="npc-dialog-content">
        <h3 class="npc-title">СИГНАЛ ИЗ 8-ГО СЕКТОРА</h3>
        <div class="npc-text fullscreen">
          Ты пересёк невидимую черту.<br><br>
          Здесь нет закона. Только три правила:<br><br>
          <span style="color:#ff0088;font-weight:bold">Корпорации лгут.</span><br>
          <span style="color:#ff0088;font-weight:bold">Баляры — валюта.</span><br>
          <span style="color:#ff0088;font-weight:bold">Не платишь — не живёшь.</span><br><br>
          Стой. Жди. Проводник идёт.<br>
          Через минуту он будет здесь.<br><br>
          <span style="color:#00ff44;font-size:19px;text-shadow:0 0 10px #00ff44">
            Не двигайся. Это не шутка.
          </span>
        </div>
        <button id="wg-btn" class="neon-btn">ПОНЯЛ</button>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.style.opacity = "0";
    requestAnimationFrame(() => {
      dialog.style.transition =
        "opacity 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      dialog.style.opacity = "1";
    });

    dialog.querySelector("#wg-btn").onclick = () => {
      hasSeen = true;

      dialog.style.opacity = "0";
      dialog.addEventListener("transitionend", () => dialog.remove(), {
        once: true,
      });

      if (ws?.readyState === WebSocket.OPEN) {
        sendWhenReady(ws, JSON.stringify({ type: "welcomeGuideSeen" }));
      }

      showNotification("Ожидание проводника... 60 сек", "#00ff44");
      setTimeout(() => {
        showNotification("Проводник опаздывает...", "#ff8800");
        setTimeout(
          () => showNotification("Ты один. Выживай.", "#ff0000"),
          30000
        );
      }, 60000);
    };
  };

  const check = () => {
    if (hasSeen || !myId) return;
    const me = players.get(myId);
    if (me && me.distanceTraveled >= 100 && !me.hasSeenWelcomeGuide) {
      show();
      if (checkInterval) clearInterval(checkInterval);
    }
  };

  window.welcomeGuideSystem = {
    init: () => {
      if (checkInterval || initTimeout) return;

      initTimeout = setTimeout(check, 3000);
      checkInterval = setInterval(check, 2000);
    },

    setSeen: (value) => {
      hasSeen = !!value;
      if (hasSeen && checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
        if (initTimeout) clearTimeout(initTimeout);
      }
    },

    forceShow: () => {
      hasSeen = false;
      show();
    },
  };

  const startCheck = setInterval(() => {
    if (myId && players.has(myId) && window.welcomeGuideSystem) {
      window.welcomeGuideSystem.init();
      clearInterval(startCheck);
    }
  }, 300);
})();
