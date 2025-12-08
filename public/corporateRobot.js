// corporateRobot.js
// Робот «Воспитатель Корпорации» — патруль между двумя точками, мир 0
// Версия 2025 — фикс кнопок + оптимизация памяти/CPU + ИСПРАВЛЕНА проверка мед. справки

window.corporateRobotSystem = (function () {
  const POINT_A = { x: 2654, y: 2314 };
  const POINT_B = { x: 421, y: 2914 };
  const PAUSE_TIME = 30000; // 30 сек пауза
  const MOVE_SPEED = 33; // px/s
  const INTERACTION_RADIUS_SQ = 2500; // 50px радиус

  let sprite = null;
  let initialized = false;

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
  let isMoving = false;
  let pauseUntil = 0;
  let movingTowardsB = true;

  let currentPos = { x: POINT_A.x, y: POINT_A.y };
  let targetPos = POINT_B;

  // UI элементы
  let buttonsContainer = null;
  let dialogWindow = null;
  let dialogText = null;
  let acceptBtn = null;

  function createUI() {
    if (buttonsContainer) return;

    // === Кнопки ===
    buttonsContainer = document.createElement("div");
    buttonsContainer.className = "npc-buttons-container";
    buttonsContainer.style.cssText =
      "position:absolute; pointer-events:auto; display:none; z-index:1000;";
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

    // === Диалог ===
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
    closeBtn.onclick = () => (dialogWindow.style.display = "none");
    dialogWindow.appendChild(closeBtn);
  }

  function openTalkDialog() {
    dialogText.textContent = DIALOGUES[dialogueIndex];
    dialogueIndex = (dialogueIndex + 1) % DIALOGUES.length;
    dialogWindow.style.display = "flex";
  }

  // === ИСПРАВЛЕННЫЕ функции проверки справки ===
  function hasMedicalCertificate() {
    // Теперь ищем в настоящем клиентском инвентаре
    return inventory.some(
      (item) =>
        item &&
        (item.type === "medical_certificate" ||
          item.type === "medical_certificate_stamped")
    );
  }

  function hasStampedCertificate() {
    return inventory.some(
      (item) => item && item.type === "medical_certificate_stamped"
    );
  }

  function openQuestDialog() {
    // Скрываем кнопку принятия задания по умолчанию
    if (acceptBtn) acceptBtn.style.display = "none";

    // 1. Нет справки вообще
    if (!hasMedicalCertificate()) {
      dialogText.innerHTML = `
        <strong>Воспитатель Корпорации внимательно сканирует тебя...</strong><br><br>
        Тебе нужно сначала сходить к врачу и пройти медицинское обследование.<br><br>
        Он выдаст тебе <span style="color:#00ffff">медицинскую справку</span> — только с ней ты сможешь получить доступ к заданиям корпорации.<br><br>
        Возвращайся, когда будет справка.
      `;
      dialogWindow.style.display = "flex";
      return;
    }

    // 2. Есть справка, но без печати нет
    if (hasMedicalCertificate() && !hasStampedCertificate()) {
      dialogText.innerHTML = `
        <strong>Справка обнаружена. Проверка печати...</strong><br><br>
        Печать охранной службы отсутствует.<br><br>
        Теперь отнеси медицинскую справку на <span style="color:#ff00ff">охранную заставу</span> — там тебе поставят официальную печать корпорации.<br><br>
        Без печати доступ к заданиям закрыт. Возвращайся с пропечатанной справкой.
      `;
      dialogWindow.style.display = "flex";
      return;
    }

    // 3. Всё есть — проверяем, сдавал ли уже документы
    const me = players.get(myId);
    if (me?.corporateDocumentsSubmitted) {
      dialogText.innerHTML = `
        <strong>Добро пожаловать, служащий корпорации.</strong><br><br>
        Ваши документы уже приняты и зарегистрированы в системе.<br><br>
        Продолжайте выполнять свои обязанности. Корпорация следит за вами.
      `;
      dialogWindow.style.display = "flex";
      return;
    }

    // 4. Все условия выполнены — можно сдать документы!
    dialogText.innerHTML = `
      <strong>Все документы в порядке.</strong><br><br>
      Вы готовы к службе в корпорации.<br><br>
      Подтвердите сдачу документов для получения допуска к корпоративным заданиям.
    `;

    // Кнопка "Сдать документы"
    if (!acceptBtn) {
      acceptBtn = document.createElement("div");
      acceptBtn.className = "neon-btn";
      acceptBtn.textContent = "Сдать документы";
      acceptBtn.onclick = submitDocuments;
      dialogWindow.insertBefore(acceptBtn, dialogWindow.lastElementChild);
    } else {
      acceptBtn.textContent = "Сдать документы";
      acceptBtn.onclick = submitDocuments;
    }
    acceptBtn.style.display = "block";

    dialogWindow.style.display = "flex";
  }

  function submitDocuments() {
    if (ws?.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "submitCorporateDocuments",
        })
      );
    }
    dialogWindow.style.display = "none";
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

  // === Движение ===
  function updateMovement(deltaTime) {
    if (playerInRange) {
      isMoving = false;
      return;
    }

    const now = performance.now();
    if (now < pauseUntil) {
      isMoving = false;
      return;
    }

    if (!isMoving) isMoving = true;

    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 2) {
      currentPos.x = targetPos.x;
      currentPos.y = targetPos.y;
      isMoving = false;
      pauseUntil = now + PAUSE_TIME;
      movingTowardsB = !movingTowardsB;
      targetPos = movingTowardsB ? POINT_B : POINT_A;
    } else {
      const moveDist = MOVE_SPEED * (deltaTime / 1000);
      const ratio = Math.min(1, moveDist / dist);
      currentPos.x += dx * ratio;
      currentPos.y += dy * ratio;
    }
  }

  // === Проверка близости ===
  function checkProximity() {
    if (window.worldSystem.currentWorldId !== 0) {
      if (playerInRange) {
        playerInRange = false;
        if (buttonsContainer) buttonsContainer.style.display = "none";
      }
      return;
    }

    const me = players.get(myId);
    if (!me) return;

    const dx = me.x + 35 - currentPos.x;
    const dy = me.y + 35 - currentPos.y;
    const inRange = dx * dx + dy * dy <= INTERACTION_RADIUS_SQ;

    if (inRange !== playerInRange) {
      playerInRange = inRange;
      if (buttonsContainer) {
        buttonsContainer.style.display = inRange ? "flex" : "none";
      }
      if (!inRange && dialogWindow) {
        dialogWindow.style.display = "none";
      }
    }
  }

  // === Позиция кнопок ===
  function updateButtonsPosition() {
    if (!playerInRange || !buttonsContainer) return;

    const cam = window.movementSystem.getCamera();
    const screenX = currentPos.x - cam.x;
    const screenY = currentPos.y - cam.y - 80;

    buttonsContainer.style.left = screenX + "px";
    buttonsContainer.style.top = screenY + "px";
  }

  let lastTime = performance.now();

  return {
    initialize: function (robotSprite) {
      if (initialized) return;
      sprite = robotSprite;
      currentPos = { x: POINT_A.x, y: POINT_A.y };
      targetPos = POINT_B;
      movingTowardsB = true;
      createUI();
      initialized = true;
    },

    update: function () {
      const now = performance.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      checkProximity();
      updateMovement(deltaTime);
      updateButtonsPosition();
    },

    draw: function () {
      if (window.worldSystem.currentWorldId !== 0 || !sprite?.complete) return;

      const cam = window.movementSystem.getCamera();
      const sx = currentPos.x - cam.x - 35;
      const sy = currentPos.y - cam.y - 35;

      let frame = 0;
      let frameRow = 0;

      if (playerInRange || performance.now() < pauseUntil) {
        frame = 0;
        frameRow = 0;
      } else if (isMoving) {
        frame = 1 + (Math.floor(performance.now() / 100) % 12);
        frameRow = movingTowardsB ? 0 : 1;
      }

      const sourceY = frameRow * 70;
      ctx.drawImage(sprite, frame * 70, sourceY, 70, 70, sx, sy, 70, 70);

      // Подпись
      ctx.font = "12px 'Courier New'";
      ctx.fillStyle = "#fbff00";
      ctx.textAlign = "center";
      ctx.fillText("Robot Corporations", sx + 35, sy - 15);
    },

    isPlayerInteracting: () =>
      playerInRange && dialogWindow?.style.display === "flex",
  };
})();
