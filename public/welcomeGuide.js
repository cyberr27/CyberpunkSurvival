// welcomeGuide.js — УЛЬТРА-ОПТИМИЗИРОВАННАЯ ВЕРСИЯ 2025+ | СЕКТОР 8
// Текст теперь горизонтальный, как у обычных NPC

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
      <div class="npc-dialog-header">
        <img src="section8.png" alt="СЕКТОР 8" class="npc-photo" loading="lazy">
        <h3 class="npc-title">WELCOME TO SECTOR 8</h3>
      </div>

      <div class="npc-dialog-content">
        <div class="npc-text" style="line-height:1.5;">
          Добро пожаловать, резидент!<br><br>

          Вы успешно прошли процедуру первичной регистрации и получили статус<br>
          <span style="color:#00ffff;">«Гражданский актив класса Δ»</span> в Секторе-8 — самом безопасном и прогрессивном анклаве Восточного побережья.<br><br>

          Здесь всё работает по чётким правилам:<br><br>
          • Порядок и порядочность во всем. Соблюдать закон.<br>
          • Корпорация заботится о вас: патрульные дроны, медицинские автоматы, круглосуточный контроль.<br>
          • Нарушение регламента снижает рейтинг. Нулевой рейтинг — автоматическая утилизация активов.<br><br>

          Ваш личный проводник-куратор уже назначен и направляется к вам.<br>
          Ожидаемое время прибытия: <span style="color:#00ff44;">00:01:27</span><br><br>

          При его появления рекомендуем:<br>
          - Нажать кнопку задания и выполнять инструкции проводника.<br>

          До его появления рекомендуем:<br>
          — Не покидать зону первичного спавна<br>
          — Изучить кнопки управления, инвентарь, экипировка и тд...<br>
          — Делать все что Вам скажут представители корпорации<br><br>

          <span style="color:#ff00ff;font-size:18px;">
            Помните: в Секторе-8 каждый день — это возможность стать лучше.<br>
            Или исчезнуть.
          </span><br><br>

          <span style="color:#00ffff;font-size:16px;">
            С уважением и заботой,<br>
            Администрация NeoCorp.<br>
            «Твои мечты. Твоя жизнь. Наша забота.»
          </span>
        </div>
      </div>

      <button id="wg-btn" class="neon-btn">ПОНЯЛ</button>
    `;

    document.body.appendChild(dialog);

    // Плавное появление
    dialog.style.opacity = "0";
    requestAnimationFrame(() => {
      dialog.style.transition =
        "opacity 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      dialog.style.opacity = "1";
    });

    // Кнопка "ПОНЯЛ"
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

  // Автозапуск проверки после загрузки игрока
  const startCheck = setInterval(() => {
    if (myId && players.has(myId) && window.welcomeGuideSystem) {
      window.welcomeGuideSystem.init();
      clearInterval(startCheck);
    }
  }, 300);
})();
