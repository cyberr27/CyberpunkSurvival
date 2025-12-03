// corporateRobot.js
// Робот «Воспитатель Корпорации» — координаты 2120×1800, мир 0
// Версия 2025 — кнопки над головой, как у всех NPC

window.corporateRobotSystem = (function () {
  const ROBOT_X = 2120;
  const ROBOT_Y = 1800;
  const INTERACTION_RADIUS_SQ = 2500; // 50²

  let sprite = null;
  let initialized = false;

  // Реплики робота
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

  // Элементы UI
  let buttonsContainer = null; // плавающие кнопки над NPC
  let dialogWindow = null; // модальное окно диалога
  let dialogText = null;
  let acceptBtn = null;

  // Создаём плавающие кнопки один раз
  function createFloatingButtons() {
    if (buttonsContainer) return;

    buttonsContainer = document.createElement("div");
    buttonsContainer.className = "npc-buttons-container";
    buttonsContainer.style.display = "none";
    document.body.appendChild(buttonsContainer);

    // Кнопка «Говорить»
    const talkBtn = document.createElement("div");
    talkBtn.className = "npc-button npc-talk-btn";
    talkBtn.textContent = "Говорить";
    talkBtn.onclick = openTalkDialog;
    buttonsContainer.appendChild(talkBtn);

    // Кнопка «Задания»
    const questBtn = document.createElement("div");
    questBtn.className = "npc-button npc-quests-btn";
    questBtn.textContent = "Задания";
    questBtn.onclick = openQuestDialog;
    buttonsContainer.appendChild(questBtn);
  }

  // Создаём модальное окно диалога (один раз)
  function createDialogWindow() {
    if (dialogWindow) return;

    dialogWindow = document.createElement("div");
    dialogWindow.className = "npc-dialog";
    dialogWindow.style.display = "none";
    document.body.appendChild(dialogWindow);

    // Заголовок
    const header = document.createElement("div");
    header.className = "npc-dialog-header";

    const photo = document.createElement("img");
    photo.className = "npc-photo";
    photo.src = "fotoQuestNPC.png";

    const title = document.createElement("h2");
    title.className = "npc-title";
    title.textContent = "Воспитатель Корпорации";

    header.appendChild(photo);
    header.appendChild(title);
    dialogWindow.appendChild(header);

    // Текст
    dialogText = document.createElement("div");
    dialogText.className = "npc-text";
    dialogWindow.appendChild(dialogText);

    // Кнопка закрытия
    const closeBtn = document.createElement("div");
    closeBtn.className = "neon-btn";
    closeBtn.textContent = "Закрыть";
    closeBtn.style.marginTop = "auto";
    closeBtn.onclick = () => {
      dialogWindow.style.display = "none";
    };
    dialogWindow.appendChild(closeBtn);
  }

  // Открытие диалога с репликами
  function openTalkDialog() {
    if (!dialogWindow) return;
    dialogText.textContent = DIALOGUES[dialogueIndex];
    dialogueIndex = (dialogueIndex + 1) % DIALOGUES.length;
    dialogWindow.style.display = "flex";
  }

  // Открытие диалога с квестом
  function openQuestDialog() {
    if (!dialogWindow) return;

    dialogText.innerHTML = `
      <strong>Доступное задание:</strong><br><br>
      <div style="text-align:left; margin:15px 0;">
        • ${QUEST.title}<br>
        • ${QUEST.description}<br><br>
        <strong style="color:#ff00ff">Награда:</strong> ${QUEST.reward.xp} XP + ${QUEST.reward.balyary} баляров
      </div>
    `;

    // Кнопка принятия квеста (добавляем только один раз)
    if (!acceptBtn) {
      acceptBtn = document.createElement("div");
      acceptBtn.className = "neon-btn";
      acceptBtn.textContent = "Взять задание";
      acceptBtn.onclick = acceptQuest;
      acceptBtn.style.marginTop = "15px";
      dialogWindow.insertBefore(acceptBtn, dialogWindow.lastElementChild);
    }

    dialogWindow.style.display = "flex";
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
    dialogWindow.style.display = "none";
  }

  // Проверка дистанции до игрока
  function checkProximity() {
    const me = players.get(myId);
    if (!me || window.worldSystem.currentWorldId !== 0) {
      if (playerInRange) {
        playerInRange = false;
        if (buttonsContainer) buttonsContainer.style.display = "none";
      }
      return;
    }

    const dx = me.x + 35 - ROBOT_X;
    const dy = me.y + 35 - ROBOT_Y;
    const inRange = dx * dx + dy * dy <= INTERACTION_RADIUS_SQ;

    if (inRange && !playerInRange) {
      playerInRange = true;
      if (buttonsContainer) buttonsContainer.style.display = "flex";
    } else if (!inRange && playerInRange) {
      playerInRange = false;
      if (buttonsContainer) buttonsContainer.style.display = "none";
      if (dialogWindow) dialogWindow.style.display = "none";
    }
  }

  // Обновление позиции плавающих кнопок
  function updateButtonsPosition() {
    if (!buttonsContainer || !playerInRange) return;

    const cam = window.movementSystem.getCamera();
    const screenX = ROBOT_X - cam.x;
    const screenY = ROBOT_Y - cam.y - 80; // чуть выше головы

    buttonsContainer.style.left = `${screenX}px`;
    buttonsContainer.style.top = `${screenY}px`;
    buttonsContainer.style.transform = "translateX(-50%)";
  }

  return {
    initialize: function (robotSprite) {
      if (initialized) return;
      sprite = robotSprite;
      createFloatingButtons();
      createDialogWindow();
      initialized = true;
    },

    update: function () {
      checkProximity();
      updateButtonsPosition();

      isInteracting = playerInRange && dialogWindow?.style.display === "flex";
      this.isPlayerInteracting = isInteracting;
    },

    draw: function () {
      if (window.worldSystem.currentWorldId !== 0 || !sprite?.complete) return;

      const cam = window.movementSystem.getCamera();
      const sx = ROBOT_X - cam.x - 35;
      const sy = ROBOT_Y - cam.y - 35;

      const frame = isInteracting
        ? 0
        : Math.floor(performance.now() / 120) % 13;

      ctx.drawImage(sprite, frame * 70, 0, 70, 70, sx, sy, 70, 70);

      // Подпись
      ctx.font = "12px 'Courier New'";
      ctx.fillStyle = "#fbff00ff";
      ctx.textAlign = "center";
      ctx.fillText("Воспитатель", sx + 35, sy - 15);
    },
  };
})();
