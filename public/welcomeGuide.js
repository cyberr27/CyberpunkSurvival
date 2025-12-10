// welcomeGuide.js — УЛЬТРА-ОПТИМИЗИРОВАННАЯ ВЕРСИЯ 2025 | СЕКТОР 8
// Только один интервал, минимум замыканий, мгновенное удаление после показа

(() => {
  let hasSeen = false;
  let dialog = null;
  let checkInterval = null;

  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  // Защита от отсутствия showNotification (бывает при ранней загрузке скрипта)
  const safeNotify = (text, color = "#00ff44") => {
    if (typeof window.showNotification === "function") {
      window.showNotification(text, color);
    } else {
      // fallback – простое консольное сообщение + временный оверлей
      console.log(
        "%c[WelcomeGuide] " + text,
        `color:${color};font-weight:bold;`
      );
      // Если совсем нет системы уведомлений – создаём минимальный оверлей
      toast(text, color);
    }
  };

  const toast = (msg, color) => {
    const div = document.createElement("div");
    div.textContent = msg;
    div.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      padding:12px 24px;background:#000c;border:2px solid ${color};
      color:${color};font-family:monospace;font-size:16px;
      border-radius:8px;z-index:999999;box-shadow:0 0 20px ${color};
      pointer-events:none;opacity:0;animation:fade 4s forwards;
    `;
    document.body.appendChild(div);
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fade{0%{opacity:0;transform:translateX(-50%) translateY(-20px)}
      15%,85%{opacity:1;transform:translateX(-50%)}
      100%{opacity:0;transform:translateX(-50%) translateY(-30px)}}
    `;
    document.head.appendChild(style);
    setTimeout(() => {
      div.remove();
      style.remove();
    }, 4000);
  };
  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

  const HTML = `
    <div class="npc-dialog">
      <div class="npc-dialog-header">
        <img src="section8.png" alt="СЕКТОР 8" class="npc-photo" loading="lazy">
        <h3 class="npc-title">WELCOME TO SECTOR 8</h3>
      </div>
      <div class="npc-dialog-content">
        <div class="npc-text" style="line-height:1.5;">
          Уважаемый резидент!<br><br>
Поздравляем с прибытием в (Сектор-8) флагманский анклав безопасности,<br>
стабильности и прогрессивного развития управляемый корпорацией NeoCorp.<br>
Вы официально получили статус «Гражданский актив класса Δ»,<br>
что подтверждает ваше право на проживание, защиту и доступ к базовым ресурсам Сектора.<br> 
Отныне ваша жизнь находится под надёжной опекой Корпорации.<br><br>
В (Секторе-8) действуют единые и неизменные принципы:<br><br>

Абсолютный порядок и соблюдение всех установленных норм и правил.<br>
Любое отклонение от установленных норм фиксируется и влечёт немедленные корректирующие меры.<br><br>

<span style="color:#FFD700;">В ближайшие минуты к вам прибудет назначенный личный куратор-проводник.<br>
Он проведёт первичный инструктаж, расскажет что вы должны сделать и поможет адаптироваться к жизни в Секторе.</span><br><br>
До его прибытия настоятельно рекомендуется:<br><br>

<span style="color:#00FF00;">Оставаться в зоне первичного спавна.<br>
Ознакомиться с интерфейсом.<br>
Безусловно выполнять все указания представителей Корпорации.</span><br><br>

            С уважением и заботой,<br>
            Администрация NeoCorp.<br>
            «Твои мечты. Твоя жизнь. Наша забота.»
          </span>
        </div>
      </div>
      <button id="wg-btn" class="neon-btn">ПОНЯЛ</button>
    </div>`;

  const show = () => {
    if (hasSeen || dialog) return;

    dialog = document.createElement("div");
    dialog.innerHTML = HTML;
    document.body.appendChild(dialog);

    // Плавное появление одной анимацией
    requestAnimationFrame(() => {
      dialog.style.opacity = "0";
      dialog.style.transition =
        "opacity 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      dialog.offsetHeight; // force reflow
      dialog.style.opacity = "1";
    });

    dialog.querySelector("#wg-btn").onclick = () => {
      hasSeen = true;
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }

      dialog.style.opacity = "0";
      dialog.addEventListener("transitionend", () => dialog.remove(), {
        once: true,
      });

      if (ws?.readyState === WebSocket.OPEN) {
        sendWhenReady(ws, JSON.stringify({ type: "welcomeGuideSeen" }));
      }

      // ← ИСПРАВЛЕНО: теперь используем безопасную функцию
      safeNotify("Ожидание проводника... 60 сек", "#00ff44");
      setTimeout(() => {
        safeNotify("Проводник опаздывает...", "#ff8800");
        setTimeout(() => safeNotify("Ты один. Выживай.", "#ff0000"), 30000);
      }, 60000);
    };
  };

  const checkCondition = () => {
    if (hasSeen || !myId) return false;
    const me = players.get(myId);
    return me && me.distanceTraveled >= 100 && !me.hasSeenWelcomeGuide;
  };

  // Основная проверка — один лёгкий интервал
  const startChecking = () => {
    if (checkInterval) return;
    checkInterval = setInterval(() => {
      if (checkCondition()) {
        show();
        clearInterval(checkInterval);
        checkInterval = null;
      }
    }, 1800); // 1.8 сек — оптимально
  };

  // Экспорт системы
  window.welcomeGuideSystem = {
    init: () => !hasSeen && !checkInterval && startChecking(),
    setSeen: (value) => {
      hasSeen = !!value;
      if (hasSeen && checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    },
    forceShow: () => {
      hasSeen = false;
      show();
    },
  };

  // Автозапуск: ждём только myId и players
  const initWatcher = setInterval(() => {
    if (myId && players.has(myId)) {
      clearInterval(initWatcher);
      window.welcomeGuideSystem.init();
    }
  }, 500);
})();
