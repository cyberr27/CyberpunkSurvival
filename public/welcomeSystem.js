// welcomeSystem.js — ФИНАЛЬНАЯ ВЕРСИЯ (проверено в бою)

const welcomeSystem = (() => {
  let hasShownWelcome = false;
  let startX = 0;
  let startY = 0;
  let hasMoved100px = false;

  const createWelcomeDialog = () => {
    if (document.getElementById("welcome-dialog")) return;

    const dialog = document.createElement("div");
    dialog.className = "npc-dialog";
    dialog.id = "welcome-dialog";
    dialog.style.zIndex = "1002";

    dialog.innerHTML = `
      <div class="npc-dialog-header">
        <div class="npc-title">СЕКТОР 8 // СИСТЕМА</div>
      </div>
      <div class="npc-dialog-content">
        <div class="npc-text fullscreen">
          Добро пожаловать в 8-й сектор, новичок.<br><br>
          Здесь правят три закона Неонового города:<br>
          • Не доверяй корпорациям<br>
          • Баляры — это власть<br>
          • Выживает только тот, кто адаптируется<br><br>
          Стой на месте. Через минуту подойдёт проводник.<br>
          Он расскажет, куда идти и как не сдохнуть в первые 5 минут.
        </div>
      </div>
      <button class="neon-btn" id="welcome-understood-btn">ПОНЯЛ</button>
    `;

    document.body.appendChild(dialog);

    document.getElementById("welcome-understood-btn").onclick = () => {
      dialog.style.opacity = "0";
      setTimeout(() => dialog.remove(), 600);
      hasShownWelcome = true;

      // Отправляем на сервер
      if (ws && ws.readyState === WebSocket.OPEN) {
        const msg = JSON.stringify({ type: "welcomeCompleted" });
        if (typeof sendWhenReady === "function") {
          sendWhenReady(ws, msg);
        } else {
          ws.send(msg);
        }
      }
    };
  };

  const checkDistance = () => {
    if (hasShownWelcome || hasMoved100px) return;
    if (!window.players || !window.myId) return;

    const me = window.players.get(window.myId);
    if (!me) return;

    // Если стартовая точка ещё не сохранена — сохраняем
    if (startX === 0 && startY === 0) {
      startX = me.x;
      startY = me.y;
      return;
    }

    const dx = me.x - startX;
    const dy = me.y - startY;
    const distance = Math.hypot(dx, dy);

    if (distance >= 100) {
      hasMoved100px = true;
      createWelcomeDialog();
    }
  };

  const initialize = () => {
    if (hasShownWelcome) return;

    const me = window.players?.get(window.myId);
    if (!me) return;

    // КЛЮЧЕВАЯ ПРОВЕРКА: если welcomeCompleted === true — выходим
    if (me.welcomeCompleted === true) {
      hasShownWelcome = true;
      return;
    }

    // Сбрасываем стартовую точку
    startX = me.x;
    startY = me.y;
    hasMoved100px = false;
  };

  return {
    initialize,
    update: checkDistance,
    markAsCompleted: () => {
      hasShownWelcome = true;
    },
  };
})();

// === Автозапуск и хуки ===
document.addEventListener("DOMContentLoaded", () => {
  const waitForGame = setInterval(() => {
    if (window.players && window.myId && ws) {
      clearInterval(waitForGame);
      welcomeSystem.initialize();

      // Перехват loginSuccess
      const oldHandler = ws.onmessage;
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "loginSuccess") {
            setTimeout(welcomeSystem.initialize, 300);
          }
          if (data.type === "welcomeCompleted") {
            welcomeSystem.markAsCompleted();
          }
        } catch {}
        if (oldHandler) oldHandler(e);
        else if (typeof handleGameMessage === "function") handleGameMessage(e);
      };
    }
  }, 100);

  // Хук в update()
  const hookUpdate = () => {
    if (typeof window.update === "function") {
      const orig = window.update;
      window.update = (dt) => {
        orig(dt);
        welcomeSystem.update();
      };
    } else {
      setTimeout(hookUpdate, 100);
    }
  };
  hookUpdate();
});
