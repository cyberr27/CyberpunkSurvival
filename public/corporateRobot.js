// corporateRobot.js
// Робот «Воспитатель Корпорации» — гид по городу, мир 0
// Версия 2025 — с квестом, возвращением в точку A после принятия задания

window.corporateRobotSystem = (function () {
  const POINT_A = { x: 2654, y: 2314 };
  const POINT_B = { x: 421, y: 2914 };
  const PAUSE_TIME = 30000; // 30 секунд пауза на точке (только если квест не взят)
  const MOVE_SPEED = 33; // пикселей в секунду

  const INTERACTION_RADIUS_SQ = 2500; // 50² — радиус для кнопок и остановки

  let sprite = null;
  let initialized = false;

  // Реплики и квест
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

  // Движение
  let currentPos = { x: POINT_A.x, y: POINT_A.y };
  let targetPos = POINT_B;
  let isMoving = false;
  let pauseUntil = 0;
  let movingTowardsB = true; // true = A→B, false = B→A

  // КЛЮЧЕВОЙ ФЛАГ: взят ли квест у робота
  let corporateQuestAccepted = false;

  // UI элементы
  let buttonsContainer = null;
  let dialogWindow = null;
  let dialogText = null;
  let acceptBtn = null;

  // === UI СОЗДАНИЕ ===
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

    if (corporateQuestAccepted) {
      dialogText.innerHTML = `<strong>Задание уже взято.</strong><br><br>Возвращаюсь на пост. Следуй за мной, дитя корпорации.`;
      if (acceptBtn) acceptBtn.remove();
    } else {
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

    // КРИТИЧЕСКИ ВАЖНО: сразу запускаем движение обратно в точку A
    corporateQuestAccepted = true;
    targetPos = POINT_A;
    movingTowardsB = false;
    isMoving = true;
    pauseUntil = 0;

    dialogWindow.style.display = "none";
  }

  // === ЛОГИКА ДВИЖЕНИЯ (с поведением гида) ===
  function updateMovement(deltaTime) {
    const now = performance.now();

    // Если игрок рядом — полная остановка
    if (playerInRange) {
      isMoving = false;
      return;
    }

    // Если квест взят — робот идёт в точку A и больше не возвращается
    if (corporateQuestAccepted) {
      if (movingTowardsB) {
        // Если вдруг был в пути к B — разворачиваемся
        targetPos = POINT_A;
        movingTowardsB = false;
      }

      // Движемся только к точке A
      const dx = targetPos.x - currentPos.x;
      const dy = targetPos.y - currentPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 5) {
        // Прибыли в точку A — окончательная остановка
        currentPos.x = POINT_A.x;
        currentPos.y = POINT_A.y;
        isMoving = false;
        pauseUntil = 0; // больше никогда не двигаемся
        return;
      }

      // Движемся к точке A
      const moveDist = MOVE_SPEED * (deltaTime / 1000);
      const ratio = moveDist / dist;
      currentPos.x += dx * ratio;
      currentPos.y += dy * ratio;
      isMoving = true;
      return;
    }

    // === СТАРАЯ ЛОГИКА ПАТРУЛЯ (только если квест НЕ взят) ===
    if (now < pauseUntil) {
      isMoving = false;
      return;
    }

    if (!isMoving) {
      isMoving = true;
    }

    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 2) {
      currentPos.x = targetPos.x;
      currentPos.y = targetPos.y;
      isMoving = false;
      pauseUntil = now + PAUSE_TIME;

      // Меняем направление
      if (movingTowardsB) {
        targetPos = POINT_A;
        movingTowardsB = false;
      } else {
        targetPos = POINT_B;
        movingTowardsB = true;
      }
    } else {
      const moveDist = MOVE_SPEED * (deltaTime / 1000);
      const ratio = moveDist / dist;
      currentPos.x += dx * ratio;
      currentPos.y += dy * ratio;
    }
  }

  // === ПРОВЕРКА БЛИЗОСТИ ИГРОКА ===
  function checkProximity() {
    const me = players.get(myId);
    if (!me || window.worldSystem.currentWorldId !== 0) {
      if (playerInRange) {
        playerInRange = false;
        if (buttonsContainer) buttonsContainer.style.display = "none";
      }
      return;
    }

    const dx = me.x + 35 - currentPos.x;
    const dy = me.y + 35 - currentPos.y;
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
    const screenX = currentPos.x - cam.x;
    const screenY = currentPos.y - cam.y - 80;

    buttonsContainer.style.left = `${screenX}px`;
    buttonsContainer.style.top = `${screenY}px`;
    buttonsContainer.style.transform = "translateX(-50%)";
  }

  let lastTime = performance.now();

  return {
    initialize: function (robotSprite) {
      if (initialized) return;
      sprite = robotSprite;
      currentPos = { x: POINT_A.x, y: POINT_A.y };
      targetPos = POINT_B;
      movingTowardsB = true;
      createFloatingButtons();
      createDialogWindow();

      // Полная синхронизация с сервером
      const me = players.get(myId);
      if (me?.corporateQuestAccepted === true) {
        corporateQuestAccepted = true;
        currentPos = { x: POINT_A.x, y: POINT_A.y };
        targetPos = POINT_A;
        movingTowardsB = false;
        isMoving = false;
        pauseUntil = 0;
      }

      initialized = true;
    },

    update: function (deltaTime) {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      checkProximity();
      updateMovement(delta);
      updateButtonsPosition();

      isInteracting = playerInRange && dialogWindow?.style.display === "flex";
      this.isPlayerInteracting = isInteracting;
    },

    draw: function () {
      if (window.worldSystem.currentWorldId !== 0 || !sprite?.complete) return;

      const cam = window.movementSystem.getCamera();
      const sx = currentPos.x - cam.x - 35;
      const sy = currentPos.y - cam.y - 35;

      let frameRow = 0;
      let frame = 0;

      if (playerInRange) {
        frame = 0;
        frameRow = movingTowardsB ? 0 : 1;
      } else if (!isMoving && performance.now() < pauseUntil) {
        frame = 0;
        frameRow = 0; // всегда лицом вперёд на паузе
      } else if (isMoving) {
        frame = 1 + (Math.floor(performance.now() / 100) % 12);
        frameRow = movingTowardsB ? 0 : 1;
      }

      const sourceY = frameRow * 70;
      ctx.drawImage(sprite, frame * 70, sourceY, 70, 70, sx, sy, 70, 70);

      ctx.font = "12px 'Courier New'";
      ctx.fillStyle = "#fbff00ff";
      ctx.textAlign = "center";
      ctx.fillText("Robot Corporations", sx + 35, sy - 15);
    },

    // Внешний доступ: сервер может сообщить, что квест принят
    setQuestAccepted: function (accepted) {
      corporateQuestAccepted = accepted;
      if (accepted) {
        targetPos = POINT_A;
        movingTowardsB = false;
        isMoving = true;
        pauseUntil = 0;
      }
    },
  };
})();
