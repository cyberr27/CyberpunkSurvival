// corporateRobot.js
// Робот «Воспитатель Корпорации» — координаты 2120×1800, мир 0
// Оптимизированная версия — минимум аллокаций, минимум проверок, максимум производительности

window.corporateRobotSystem = (function () {
  const ROBOT_X = 2120;
  const ROBOT_Y = 1800;
  const INTERACTION_RADIUS_SQ = 2500; // 50² — избегаем Math.hypot

  let sprite = null;
  let initialized = false;

  // Данные робота (не меняются — вынесли в константы)
  const DIALOGUES = [
    "Добро пожаловать, дитя корпорации.",
    "Ты — будущее. Мы следим за тобой.",
    "Не забывай пить воду. Гидратация — ключ к производительности.",
    "Слушай старших. Слушай корпорацию.",
    "Твои показатели в норме. Продолжай в том же духе.",
    "Корпорация гордится тобой.",
  ];

  const QUEST = {
    id: "corp_tutorial_1",
    title: "Первое задание воспитателя",
    description: "Принеси 5 баляров — докажи свою преданность.",
    reward: { xp: 50, balyary: 10 },
  };

  // Состояние
  let dialogueIndex = 0;
  let playerInRange = false;
  let isInteracting = false;

  // Кэшируем DOM-элементы один раз
  let dialogContainer = null;
  let textEl = null;
  let buttonsContainer = null;
  let acceptBtn = null;

  // UI создание — один раз
  function createUI() {
    if (dialogContainer) return;

    dialogContainer = document.createElement("div");
    dialogContainer.className = "npc-dialog";
    dialogContainer.style.display = "none";
    document.body.appendChild(dialogContainer);

    // Имя
    const nameEl = document.createElement("div");
    nameEl.className = "npc-name";
    nameEl.textContent = "Воспитатель Корпорации";
    dialogContainer.appendChild(nameEl);

    // Фото
    const photoEl = document.createElement("img");
    photoEl.className = "npc-photo";
    photoEl.src = "fotoQuestNPC.png";
    dialogContainer.appendChild(photoEl);

    // Текст
    textEl = document.createElement("div");
    textEl.className = "npc-text";
    dialogContainer.appendChild(textEl);

    // Кнопки
    buttonsContainer = document.createElement("div");
    buttonsContainer.className = "npc-buttons";
    dialogContainer.appendChild(buttonsContainer);

    // Кнопка "Говорить"
    const talkBtn = document.createElement("button");
    talkBtn.className = "cyber-btn";
    talkBtn.textContent = "Говорить";
    talkBtn.onclick = () => {
      textEl.textContent = DIALOGUES[dialogueIndex];
      dialogueIndex = (dialogueIndex + 1) % DIALOGUES.length;
    };
    buttonsContainer.appendChild(talkBtn);

    // Кнопка "Задания"
    const questBtn = document.createElement("button");
    questBtn.className = "cyber-btn";
    questBtn.textContent = "Задания";
    questBtn.onclick = showQuest;
    buttonsContainer.appendChild(questBtn);

    // Кнопка закрытия
    const closeBtn = document.createElement("button");
    closeBtn.className = "cyber-btn close";
    closeBtn.textContent = "×";
    closeBtn.onclick = hideDialog;
    dialogContainer.appendChild(closeBtn);
  }

  function showQuest() {
    textEl.innerHTML = `
      <strong>Доступное задание:</strong><br><br>
      ${QUEST.title}<br>
      ${QUEST.description}<br><br>
      Награда: ${QUEST.reward.xp} XP + ${QUEST.reward.balyary} баляров
    `;

    // Добавляем кнопку "Взять" только один раз
    if (!acceptBtn) {
      acceptBtn = document.createElement("button");
      acceptBtn.className = "cyber-btn accept";
      acceptBtn.textContent = "Взять задание";
      acceptBtn.onclick = acceptQuest;
      buttonsContainer.appendChild(acceptBtn);
    }
  }

  function acceptQuest() {
    if (ws?.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "acceptCorporateQuest",
          questId: QUEST.id,
        })
      );
    }
    showNotification("Задание принято: Принеси 5 баляров", "#00ffff");
    hideDialog();
  }

  function showDialog() {
    if (!dialogContainer) return;
    dialogContainer.style.display = "block";
    dialogueIndex = 0;
    textEl.textContent = DIALOGUES[0];
  }

  function hideDialog() {
    if (dialogContainer) dialogContainer.style.display = "none";
    if (acceptBtn && buttonsContainer.children.length > 3) {
      buttonsContainer.removeChild(acceptBtn);
      acceptBtn = null;
    }
  }

  // Быстрая проверка дистанции без Math.hypot
  function checkProximity() {
    const me = players.get(myId);
    if (!me || window.worldSystem.currentWorldId !== 0) {
      if (playerInRange) {
        playerInRange = false;
        hideDialog();
      }
      return;
    }

    const dx = me.x + 35 - ROBOT_X;
    const dy = me.y + 35 - ROBOT_Y;
    const inRange = dx * dx + dy * dy <= INTERACTION_RADIUS_SQ;

    if (inRange && !playerInRange) {
      playerInRange = true;
      showDialog();
    } else if (!inRange && playerInRange) {
      playerInRange = false;
      hideDialog();
    }
  }

  return {
    initialize: function (robotSprite) {
      if (initialized) return;
      sprite = robotSprite;
      createUI();
      initialized = true;
      this.isPlayerInteracting = false;
    },

    update: function () {
      checkProximity();
      isInteracting =
        playerInRange && dialogContainer?.style.display === "block";
      this.isPlayerInteracting = isInteracting;
    },

    draw: function () {
      if (window.worldSystem.currentWorldId !== 0 || !sprite?.complete) return;

      const cam = window.movementSystem.getCamera();
      const sx = ROBOT_X - cam.x - 35;
      const sy = ROBOT_Y - cam.y - 35;

      // Анимация: если игрок рядом и диалог открыт — замираем на кадре 0
      const frame = isInteracting
        ? 0
        : Math.floor(performance.now() / 120) % 13;

      ctx.drawImage(sprite, frame * 70, 0, 70, 70, sx, sy, 70, 70);

      // Подпись — без лишних вычислений
      ctx.font = "12px 'Courier New'";
      ctx.fillStyle = "#fbff00ff";
      ctx.textAlign = "center";
      ctx.fillText("Воспитатель", sx + 35, sy - 15);
    },
  };
})();
