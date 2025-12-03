// corporateRobot.js
// Робот «Воспитатель Корпорации» — координаты 2120×1800, мир 0
// Оптимизированная версия 2025 — экономия CPU & RAM

window.corporateRobotSystem = (function () {
  const ROBOT_X = 2120;
  const ROBOT_Y = 1800;
  const INTERACTION_RADIUS_SQ = 50 * 50; // квадрат радиуса — избегаем Math.hypot

  let sprite = null;
  let isInitialized = false;

  const robotData = {
    name: "Воспитатель Корпорации",
    dialogues: [
      "Добро пожаловать, дитя корпорации.",
      "Ты — будущее. Мы следим за тобой.",
      "Не забывай пить воду. Гидратация — ключ к производительности.",
      "Слушай старших. Слушай корпорацию.",
      "Твои показатели в норме. Продолжай в том же духе.",
      "Корпорация гордится тобой.",
    ],
    quest: {
      id: "corp_tutorial_1",
      title: "Первое задание воспитателя",
      description: "Принеси 5 баляров — докажи свою преданность.",
      reward: { xp: 50, balyary: 10 },
    },
  };

  let currentDialogueIndex = 0;
  let playerInRange = false;
  let dialogVisible = false;

  // Кэшируем DOM-элементы один раз
  let dialogContainer = null;
  let textEl = null;
  let buttonsContainer = null;
  let acceptBtn = null;

  // Анимация робота
  let animTime = 0;
  const ANIM_FRAME_DURATION = 120; // ms на кадр (~8.3 FPS)

  function lazyCreateUI() {
    if (dialogContainer) return;

    dialogContainer = document.createElement("div");
    dialogContainer.className = "npc-dialog";
    dialogContainer.style.display = "none";
    document.body.appendChild(dialogContainer);

    // Название
    const nameEl = document.createElement("div");
    nameEl.className = "npc-name";
    nameEl.textContent = robotData.name;
    dialogContainer.appendChild(nameEl);

    // Фото
    const photoEl = document.createElement("img");
    photoEl.className = "npc-photo";
    photoEl.src = "fotoQuestNPC.png";
    photoEl.loading = "lazy";
    dialogContainer.appendChild(photoEl);

    // Текст
    textEl = document.createElement("div");
    textEl.className = "npc-text";
    textEl.id = "corporateRobotText";
    dialogContainer.appendChild(textEl);

    // Кнопки
    buttonsContainer = document.createElement("div");
    buttonsContainer.className = "npc-buttons";
    dialogContainer.appendChild(buttonsContainer);

    // Говорить
    const talkBtn = document.createElement("button");
    talkBtn.className = "cyber-btn";
    talkBtn.textContent = "Говорить";
    talkBtn.onclick = () => {
      currentDialogueIndex =
        (currentDialogueIndex + 1) % robotData.dialogues.length;
      textEl.textContent = robotData.dialogues[currentDialogueIndex];
    };
    buttonsContainer.appendChild(talkBtn);

    // Задания
    const questBtn = document.createElement("button");
    questBtn.className = "cyber-btn";
    questBtn.textContent = "Задания";
    questBtn.onclick = showQuest;
    buttonsContainer.appendChild(questBtn);

    // Кнопка принять (создаём скрытой, покажем при необходимости)
    acceptBtn = document.createElement("button");
    acceptBtn.className = "cyber-btn accept";
    acceptBtn.textContent = "Взять задание";
    acceptBtn.style.display = "none";
    acceptBtn.onclick = acceptQuest;
    buttonsContainer.appendChild(acceptBtn);

    // Закрыть
    const closeBtn = document.createElement("button");
    closeBtn.className = "cyber-btn close";
    closeBtn.textContent = "×";
    closeBtn.onclick = hideDialog;
    dialogContainer.appendChild(closeBtn);
  }

  function showQuest() {
    const q = robotData.quest;
    textEl.innerHTML = `
      <strong>Доступное задание:</strong><br><br>
      ${q.title}<br>
      ${q.description}<br><br>
      Награда: ${q.reward.xp} XP + ${q.reward.balyary} баляров
    `;
    acceptBtn.style.display = "block";
  }

  function acceptQuest() {
    if (ws?.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "acceptCorporateQuest",
          questId: robotData.quest.id,
        })
      );
      showNotification("Задание принято: Принеси 5 баляров", "#00ffff");
      hideDialog();
    }
  }

  function showDialog() {
    if (!dialogContainer) lazyCreateUI();
    dialogContainer.style.display = "block";
    dialogVisible = true;
    currentDialogueIndex = 0;
    textEl.textContent = robotData.dialogues[0];
    acceptBtn.style.display = "none";
  }

  function hideDialog() {
    if (dialogContainer) dialogContainer.style.display = "none";
    dialogVisible = false;
    if (acceptBtn) acceptBtn.style.display = "none";
  }

  function checkProximity() {
    if (window.worldSystem.currentWorldId !== 0) {
      if (playerInRange) {
        playerInRange = false;
        hideDialog();
      }
      return;
    }

    const me = players.get(myId);
    if (!me) return;

    const dx = me.x + 35 - ROBOT_X;
    const dy = me.y + 35 - ROBOT_Y;
    const distSq = dx * dx + dy * dy;

    const nowInRange = distSq <= INTERACTION_RADIUS_SQ;

    if (nowInRange && !playerInRange) {
      playerInRange = true;
      showDialog();
    } else if (!nowInRange && playerInRange) {
      playerInRange = false;
      hideDialog();
    }
  }

  return {
    initialize: function (robotSprite) {
      if (isInitialized) return;
      sprite = robotSprite;
      // Отложенная инициализация UI — не блокируем основной поток
      if ("requestIdleCallback" in window) {
        requestIdleCallback(lazyCreateUI);
      } else {
        setTimeout(lazyCreateUI, 1000);
      }
      isInitialized = true;
      this.isPlayerInteracting = false;
    },

    update: function (deltaTime) {
      animTime += deltaTime;
      checkProximity();

      this.isPlayerInteracting = playerInRange && dialogVisible;
    },

    draw: function () {
      if (window.worldSystem.currentWorldId !== 0 || !sprite?.complete) return;

      const cam = window.movementSystem.getCamera();
      const sx = ROBOT_X - cam.x - 35;
      const sy = ROBOT_Y - cam.y - 35;

      let frame;

      if (this.isPlayerInteracting) {
        frame = 0; // замираем на первом кадре
      } else {
        // 13 кадров, одна строка, ~8.3 FPS
        frame = Math.floor(animTime / ANIM_FRAME_DURATION) % 13;
      }

      ctx.drawImage(sprite, frame * 70, 0, 70, 70, sx, sy, 70, 70);

      // Подпись — рисуем один раз, без пересоздания шрифта
      ctx.font = "12px Arial";
      ctx.fillStyle = "#a6ff00ff";
      ctx.textAlign = "center";
      ctx.fillText("Воспитатель", sx + 35, sy - 15);
    },
  };
})();
