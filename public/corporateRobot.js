// corporateRobot.js
// Робот «Воспитатель Корпорации» — патрулирует, но замирает при приближении игрока
// Версия 2025 — кнопки над головой, как у всех NPC

window.corporateRobotSystem = (function () {
  const INTERACTION_RADIUS_SQ = 2500; // 50²

  // Точки патрулирования
  const WAYPOINTS = [
    { x: 2630, y: 2222 },
    { x: 457, y: 2953 },
  ];

  const MOVE_SPEED = 3.0; // Увеличена в 2 раза (было 0.5)

  let sprite = null;
  let initialized = false;

  // Текущее положение робота
  let robotX = WAYPOINTS[0].x;
  let robotY = WAYPOINTS[0].y;
  let currentWaypointIndex = 0;

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

  // UI
  let buttonsContainer = null;
  let dialogWindow = null;
  let dialogText = null;
  let acceptBtn = null;

  // Создаём кнопки и окно диалога (без изменений)
  function createFloatingButtons() {
    if (buttonsContainer) return;

    buttonsContainer = document.createElement("div");
    buttonsContainer.className = "npc-buttons-container";
    buttonsContainer.style.display = "none";
    document.body.appendChild(buttonsContainer);

    const talkBtn = document.createElement("div");
    talkBtn.className = "npc-button npc-talk-btn";
    talkBtn.textContent = "Говорить";
    talkBtn.onclick = openTalkDialog;
    buttonsContainer.appendChild(talkBtn);

    const questBtn = document.createElement("div");
    questBtn.className = "npc-button npc-quests-btn";
    questBtn.textContent = "Задания";
    questBtn.onclick = openQuestDialog;
    buttonsContainer.appendChild(questBtn);
  }

  function createDialogWindow() {
    if (dialogWindow) return;

    dialogWindow = document.createElement("div");
    dialogWindow.className = "npc-dialog";
    dialogWindow.style.display = "none";
    document.body.appendChild(dialogWindow);

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

    dialogText = document.createElement("div");
    dialogText.className = "npc-text";
    dialogWindow.appendChild(dialogText);

    const closeBtn = document.createElement("div");
    closeBtn.className = "neon-btn";
    closeBtn.textContent = "Закрыть";
    closeBtn.style.marginTop = "auto";
    closeBtn.onclick = () => {
      dialogWindow.style.display = "none";
    };
    dialogWindow.appendChild(closeBtn);
  }

  function openTalkDialog() {
    if (!dialogWindow) return;
    dialogText.textContent = DIALOGUES[dialogueIndex];
    dialogueIndex = (dialogueIndex + 1) % DIALOGUES.length;
    dialogWindow.style.display = "flex";
  }

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

  // Движение (только если игрок НЕ в радиусе)
  function moveToWaypoint() {
    if (playerInRange) return; // Главное: замираем при приближении игрока

    const target = WAYPOINTS[currentWaypointIndex];
    const dx = target.x - robotX;
    const dy = target.y - robotY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MOVE_SPEED) {
      robotX = target.x;
      robotY = target.y;
      currentWaypointIndex = (currentWaypointIndex + 1) % WAYPOINTS.length;
    } else {
      robotX += (dx / dist) * MOVE_SPEED;
      robotY += (dy / dist) * MOVE_SPEED;
    }
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

    const dx = me.x + 35 - robotX;
    const dy = me.y + 35 - robotY;
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

  function updateButtonsPosition() {
    if (!buttonsContainer || !playerInRange) return;

    const cam = window.movementSystem.getCamera();
    const screenX = robotX - cam.x;
    const screenY = robotY - cam.y - 80;

    buttonsContainer.style.left = `${screenX}px`;
    buttonsContainer.style.top = `${screenY}px`;
    buttonsContainer.style.transform = "translateX(-50%)";
  }

  return {
    initialize: function (robotSprite) {
      if (initialized) return;
      sprite = robotSprite;
      robotX = WAYPOINTS[0].x;
      robotY = WAYPOINTS[0].y;
      createFloatingButtons();
      createDialogWindow();
      initialized = true;
    },

    update: function () {
      if (window.worldSystem.currentWorldId !== 0) return;

      checkProximity(); // сначала проверяем дистанцию
      moveToWaypoint(); // двигаемся только если игрок далеко
      updateButtonsPosition();

      isInteracting = playerInRange && dialogWindow?.style.display === "flex";
      this.isPlayerInteracting = isInteracting;
    },

    draw: function () {
      if (window.worldSystem.currentWorldId !== 0 || !sprite?.complete) return;

      const cam = window.movementSystem.getCamera();
      const sx = robotX - cam.x - 35;
      const sy = robotY - cam.y - 35;

      // Анимация ходьбы только если НЕ в радиусе и НЕ в диалоге
      const shouldAnimate = !playerInRange && !isInteracting;

      const frame = isInteracting
        ? 0
        : shouldAnimate
        ? Math.floor(performance.now() / 120) % 13
        : 0;

      ctx.drawImage(sprite, frame * 70, 0, 70, 70, sx, sy, 70, 70);

      // Подпись
      ctx.font = "12px 'Courier New'";
      ctx.fillStyle = "#fbff00ff";
      ctx.textAlign = "center";
      ctx.fillText("Воспитатель", sx + 35, sy - 15);
    },
  };
})();
