// corporateRobot.js
// Оптимизированная версия «Воспитатель Корпорации» — патрулирует между двумя точками, мир 0
// Квест: медосмотр → справка → сдача. Без утечек памяти и дублирования DOM-элементов.

window.corporateRobotSystem = (function () {
  const POINT_A = { x: 2654, y: 2314 };
  const POINT_B = { x: 421, y: 2914 };
  const PAUSE_TIME = 30000;
  const MOVE_SPEED = 33;
  const INTERACTION_RADIUS_SQ = 2500;

  const CORP_QUEST_ID = "corp_medical_check";
  const QUEST = {
    id: CORP_QUEST_ID,
    title: "Медосмотр у Робота-Доктора",
    description:
      "Пройди медосмотр у Робота-Доктора и принеси медицинскую справку.",
    reward: { xp: 100, balyary: 15 },
  };

  const DIALOGUES = [
    "Добро пожаловать, дитя корпорации.",
    "Ты — будущее. Мы следим за тобой.",
    "Не забывай пить воду. Гидратация — ключ к производительности.",
    "Слушай старших. Слушай корпорацию.",
    "Твои показатели в норме. Продолжай в том же духе.",
    "Корпорация гордится тобой.",
  ];

  let sprite = null;
  let initialized = false;

  // Состояние
  let dialogueIndex = 0;
  let playerInRange = false;

  // Движение
  let currentPos = { x: POINT_A.x, y: POINT_A.y };
  let targetPos = POINT_B;
  let isMoving = false;
  let pauseUntil = 0;
  let movingTowardsB = true;

  // DOM-элементы (создаются один раз)
  let buttonsContainer = null;
  let dialogWindow = null;
  let dialogText = null;
  let acceptBtn = null;
  let completeBtn = null;

  let lastTime = performance.now();

  // === Вспомогательные функции состояния игрока ===
  const getMe = () => players.get(myId);

  const hasActiveQuest = () =>
    getMe()?.corporateQuest?.currentQuestId === CORP_QUEST_ID;
  const hasMedicalCertificate = () =>
    getMe()?.inventory?.some((i) => i?.type === "medical_certificate");
  const isQuestCompleted = () =>
    getMe()?.corporateQuest?.completed?.includes(CORP_QUEST_ID);

  // === Создание UI (один раз) ===
  function createUI() {
    if (buttonsContainer) return; // уже создано

    // Контейнер кнопок над NPC
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

    // Диалоговое окно
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

    // Кнопки "Взять" и "Сдать" — создаём один раз
    acceptBtn = document.createElement("div");
    acceptBtn.className = "neon-btn";
    acceptBtn.textContent = "Взять задание";
    acceptBtn.onclick = acceptQuest;
    acceptBtn.style.display = "none";

    completeBtn = document.createElement("div");
    completeBtn.className = "neon-btn";
    completeBtn.textContent = "Сдать квест";
    completeBtn.style.background = "#00ff44";
    completeBtn.onclick = completeQuest;
    completeBtn.style.display = "none";

    dialogWindow.appendChild(acceptBtn);
    dialogWindow.appendChild(completeBtn);

    // Кнопка закрытия
    const closeBtn = document.createElement("div");
    closeBtn.className = "neon-btn";
    closeBtn.textContent = "Закрыть";
    closeBtn.style.marginTop = "auto";
    closeBtn.onclick = () => {
      dialogWindow.style.display = "none";
      acceptBtn.style.display = completeBtn.style.display = "none";
    };
    dialogWindow.appendChild(closeBtn);
  }

  // === Диалоги ===
  function openTalkDialog() {
    if (!dialogWindow) return;
    dialogText.textContent = DIALOGUES[dialogueIndex];
    dialogueIndex = (dialogueIndex + 1) % DIALOGUES.length;
    dialogWindow.style.display = "flex";
  }

  function openQuestDialog() {
    if (!dialogWindow) return;

    acceptBtn.style.display = completeBtn.style.display = "none";

    if (isQuestCompleted()) {
      dialogText.innerHTML = `<strong style="color:#00ff00">Задание уже выполнено.</strong><br>Корпорация довольна твоей дисциплиной.`;
    } else if (hasActiveQuest() && hasMedicalCertificate()) {
      dialogText.innerHTML = `
        <strong>Задание активно:</strong><br><br>
        • ${QUEST.title}<br>
        • ${QUEST.description}<br><br>
        <strong style="color:#00ff00">У тебя есть медицинская справка!</strong><br>
        Ты можешь сдать задание.
      `;
      completeBtn.style.display = "block";
    } else if (hasActiveQuest()) {
      dialogText.innerHTML = `
        <strong>Задание активно:</strong><br><br>
        • ${QUEST.title}<br>
        • ${QUEST.description}<br><br>
        <span style="color:#ffff00">Иди к Роботу-Доктору и пройди медосмотр.</span>
      `;
    } else {
      dialogText.innerHTML = `
        <strong>Новое задание:</strong><br><br>
        • ${QUEST.title}<br>
        • ${QUEST.description}<br><br>
        <strong style="color:#ff00ff">Награда:</strong> ${QUEST.reward.xp} XP + ${QUEST.reward.balyary} баляров
      `;
      acceptBtn.style.display = "block";
    }

    dialogWindow.style.display = "flex";
  }

  function acceptQuest() {
    if (ws?.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "acceptCorporateQuest",
          questId: CORP_QUEST_ID,
        })
      );
      showNotification(
        "Задание принято: Пройди медосмотр у Робота-Доктора",
        "#00ffff"
      );
      dialogWindow.style.display = "none";
    }
  }

  function completeQuest() {
    if (ws?.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "completeCorporateQuest",
          questId: CORP_QUEST_ID,
        })
      );
      dialogWindow.style.display = "none";
    }
  }

  // === Движение ===
  function updateMovement(deltaTime) {
    if (playerInRange || performance.now() < pauseUntil) {
      isMoving = false;
      return;
    }

    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 2) {
      currentPos.x = targetPos.x;
      currentPos.y = targetPos.y;
      isMoving = false;
      pauseUntil = performance.now() + PAUSE_TIME;
      movingTowardsB = !movingTowardsB;
      targetPos = movingTowardsB ? POINT_B : POINT_A;
      return;
    }

    isMoving = true;
    const moveDist = MOVE_SPEED * (deltaTime / 1000);
    const ratio = Math.min(moveDist / dist, 1); // защита от перескока
    currentPos.x += dx * ratio;
    currentPos.y += dy * ratio;
  }

  function checkProximity() {
    const me = getMe();
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

    if (inRange !== playerInRange) {
      playerInRange = inRange;
      buttonsContainer.style.display = inRange ? "flex" : "none";
      if (!inRange && dialogWindow) dialogWindow.style.display = "none";
    }
  }

  function updateButtonsPosition() {
    if (!buttonsContainer || !playerInRange) return;

    const cam = window.movementSystem.getCamera();
    const screenX = currentPos.x - cam.x;
    const screenY = currentPos.y - cam.y - 80;

    buttonsContainer.style.left = `${screenX}px`;
    buttonsContainer.style.top = `${screenY}px`;
  }

  // === Публичный API ===
  return {
    initialize(robotSprite) {
      if (initialized) return;
      sprite = robotSprite;
      currentPos = { x: POINT_A.x, y: POINT_A.y };
      targetPos = POINT_B;
      movingTowardsB = true;
      createUI();
      initialized = true;
    },

    update() {
      const now = performance.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      checkProximity();
      updateMovement(deltaTime);
      updateButtonsPosition();
    },

    draw() {
      if (window.worldSystem.currentWorldId !== 0 || !sprite?.complete) return;

      const cam = window.movementSystem.getCamera();
      const sx = currentPos.x - cam.x - 35;
      const sy = currentPos.y - cam.y - 35;

      let frame = 0;
      let frameRow = 0;

      if (playerInRange || performance.now() < pauseUntil) {
        frame = 0;
      } else if (isMoving) {
        frame = 1 + (Math.floor(performance.now() / 100) % 12);
        frameRow = movingTowardsB ? 0 : 1;
      }

      ctx.drawImage(sprite, frame * 70, frameRow * 70, 70, 70, sx, sy, 70, 70);

      ctx.font = "12px 'Courier New'";
      ctx.fillStyle = "#fbff00";
      ctx.textAlign = "center";
      ctx.fillText("Воспитатель Корпорации", sx + 35, sy - 15);
    },
  };
})();
