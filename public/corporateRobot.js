// corporateRobot.js
// Робот «Воспитатель Корпорации» — ведёт игрока к доктору после принятия квеста
// Версия 2025 — новый спрайт 2×13 кадров (70×70)

window.corporateRobotSystem = (function () {
  const POINT_A = { x: 2654, y: 2314 }; // Точка у доктора
  const POINT_B = { x: 421, y: 2914 };
  const PAUSE_TIME = 30000; // 30 сек пауза на точке, если квест ещё не взят
  const MOVE_SPEED = 33; // пикселей в секунду

  const INTERACTION_RADIUS_SQ = 2500; //  // 50² — радиус взаимодействия

  let sprite = null;
  let initialized = false;

  // Реплики (когда просто говоришь)
  const DIALOGUES = [
    "Добро пожаловать, дитя корпорации.",
    "Ты — будущее. Мы следим за тобой.",
    "Не забывай пить воду. Гидратация — ключ к производительности.",
    "Слушай старших. Слушай корпорацию.",
    "Твои показатели в норме. Продолжай в том же духе.",
    "Корпорация гордится тобой.",
  ];

  // Квест
  const QUEST = {
    id: "corp_follow_1",
    title: "Сопровождение к доктору",
    description:
      "Проследуй за Воспитателем Корпорации к доктору для осмотра и оформления.",
    stage: "follow", // будем использовать только одну стадию
  };

  // Состояние
  let dialogueIndex = 0;
  let playerInRange = false;
  let isInteracting = false;
  let questAccepted = false; // Принято ли задание сопровождения

  // Движение
  let currentPos = { x: POINT_A.x, y: POINT_A.y };
  let targetPos = POINT_B;
  let isMoving = false;
  let pauseUntil = 0;
  let movingTowardsB = true; // true = A→B, false = B→A

  // UI
  let buttonsContainer = null;
  let dialogWindow = null;
  let dialogText = null;
  let acceptBtn = null;

  // === UI ===
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

  function openQuestDialogWithAccept(text, onAccept) {
    if (!dialogWindow) return;

    dialogText.innerHTML = text;

    // Удаляем старую кнопку, если есть
    if (acceptBtn && acceptBtn.parentNode) {
      acceptBtn.parentNode.removeChild(acceptBtn);
      acceptBtn = null;
    }

    acceptBtn = document.createElement("div");
    acceptBtn.className = "neon-btn";
    acceptBtn.textContent = "Хорошо";
    acceptBtn.style.marginTop = "20px";
    acceptBtn.onclick = () => {
      onAccept();
      dialogWindow.style.display = "none";
    };

    dialogWindow.insertBefore(acceptBtn, dialogWindow.lastElementChild);
    dialogWindow.style.display = "flex";
  }

  function openQuestDialog() {
    if (questAccepted) {
      openDialogWithAccept(
        "<strong>Задание активно:</strong><br>Следуй за мной к доктору для осмотра.",
        () => {}
      );
      return;
    }

    openDialogWithAccept(
      `<strong>Новое задание:</strong><br><br>
      • ${QUEST.title}<br><br>
      ${QUEST.description}`,
      acceptQuest
    );
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
    questAccepted = true;
    showNotification("Задание принято: Сопровождение к доктору", "#00ffff");

    // Принудительно ставим цель — POINT_A (к доктору)
    targetPos = POINT_A;
    movingTowardsB = false;
    isMoving = true;
    pauseUntil = 0; // сразу начинаем движение
  }

  // === ДВИЖЕНИЕ ===
  function updateMovement(deltaTime) {
    // Полная остановка при приближении игрока
    if (playerInRange) {
      isMoving = false;
      return;
    }

    const now = performance.now();

    // Если квест принят — идём строго к доктору (POINT_A), без пауз
    if (questAccepted) {
      if (Math.hypot(currentPos.x - POINT_A.x, currentPos.y - POINT_A.y) < 5) {
        isMoving = false; // пришли — стоим
        return;
      }

      const dx = POINT_A.x - currentPos.x;
      const dy = POINT_A.y - currentPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 2) {
        const moveDist = MOVE_SPEED * (deltaTime / 1000);
        const ratio = Math.min(1, moveDist / dist);
        currentPos.x += dx * ratio;
        currentPos.y += dy * ratio;
      }
      isMoving = true;
      return;
    }

    // === Классическое поведение: патруль с паузами ===
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

  // === БЛИЗОСТЬ ИГРОКА ===
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
      initialized = true;

      // Синхронизируем состояние квеста при старте
      const me = players.get(myId);
      if (me?.corporateQuest?.accepted) {
        questAccepted = true;
        targetPos = POINT_A;
        movingTowardsB = false;
      }
    },

    update: function () {
      const now = performance.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      checkProximity();
      updateMovement(deltaTime);
      updateButtonsPosition();

      isInteracting = playerInRange && dialogWindow?.style.display === "flex";
      this.isPlayerInteracting = isInteracting;
    },

    draw: function () {
      if (window.worldSystem.currentWorldId !== 0 || !sprite?.complete) return;

      const cam = window.movementSystem.getCamera();
      const sx = currentPos.x - cam.x - 35;
      const sy = currentPos.y - cam.y - 35;

      let frameRow = movingTowardsB ? 0 : 1;
      let frame = 0;

      // Если игрок рядом — первый кадр
      if (playerInRange) {
        frame = 0;
      }
      // Если стоим на точке (пауза или ждём у доктора)
      else if (!isMoving) {
        frame = 0;
      }
      // Иначе — анимация ходьбы
      else if (isMoving) {
        frame = 1 + (Math.floor(performance.now() / 100) % 12);
      }

      const sourceY = frameRow * 70;
      ctx.drawImage(sprite, frame * 70, sourceY, 70, 70, sx, sy, 70, 70);

      // Подпись
      ctx.font = "12px 'Courier New'";
      ctx.fillStyle = "#fbff00ff";
      ctx.textAlign = "center";
      ctx.fillText("Воспитатель Корпорации", sx + 35, sy - 15);
    },

    // Внешний доступ для синхронизации с сервера (если нужно)
    setQuestAccepted: function (accepted) {
      questAccepted = accepted;
      if (accepted) {
        targetPos = POINT_A;
        movingTowardsB = false;
        isMoving = true;
        pauseUntil = 0;
      }
    },
  };
})();
