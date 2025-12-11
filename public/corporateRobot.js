// corporateRobot.js
// Робот «Воспитатель Корпорации» — патруль между двумя точками, мир 0
// Версия 2025 — фикс кнопок + оптимизация памяти/CPU + ИСПРАВЛЕНА проверка мед. справки
// + Добавлена прокрутка в диалоговом окне с использованием .npc-dialog-content для красивого скроллбара

window.corporateRobotSystem = (function () {
  const POINT_A = { x: 2654, y: 2314 };
  const POINT_B = { x: 421, y: 2914 };
  const PAUSE_TIME = 30000; // 30 сек пауза
  const MOVE_SPEED = 33; // px/s
  const INTERACTION_RADIUS_SQ = 2500; // 50px радиус

  let sprite = null;
  let initialized = false;

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
  let dialogContent = null; // Новый контейнер для прокрутки
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

    // Добавляем контейнер для прокрутки (используем существующий стиль .npc-dialog-content)
    dialogContent = document.createElement("div");
    dialogContent.className = "npc-dialog-content";
    dialogWindow.appendChild(dialogContent);

    dialogText = document.createElement("div");
    dialogText.className = "npc-text";
    dialogContent.appendChild(dialogText); // Теперь текст внутри контейнера с прокруткой

    const closeBtn = document.createElement("div");
    closeBtn.className = "neon-btn";
    closeBtn.textContent = "Закрыть";
    closeBtn.onclick = () => (dialogWindow.style.display = "none");
    dialogWindow.appendChild(closeBtn);
  }

  function openTalkDialog() {
    dialogText.innerHTML = DIALOGUES[dialogueIndex];
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

  const DIALOGUES = [
    // 1. Приветствие: Введение в корпорацию как семью, правила лояльности
    `<strong><span style="color:#00FF00;">Добро пожаловать, дитя корпорации.</span></strong><br><br>
    NeoCorp — твоя семья, как и при твоем воспитании мы мы будем следить за твоими показателями в этом мире,  в котором выживание зависит от ресурсов и монеты. Здесь каждый сотрудник следует <br><span style="color:#FFD700;">Правилу №1: Абсолютная лояльность.</span> Ты должен ставить интересы корпорации выше своих — только так мы процветаем вместе. <span style="color:#FF4500;">Помни, предательство строго карается штрафом, заключением под стражу и даже изгнанием.</span> Чтобы присоединиться, к анклаву (Сектра - 8) - выйди из диалога и нажми кнопку <span style="color:#FF00FF;">(Задания)</span>, затем пройди регистрацию и получи базовый набор резидента для старта в NeoCorp.`,

    // 2. Будущее: Мониторинг для "защиты", правила отчетности
    `<strong><span style="color:#00FF00;">Ты — будущее. Мы следим за тобой.</span></strong><br><br>
    В NeoCorp мы инвестируем в тебя, как в ценный актив, предоставляя доступ к технологиям.<br> <span style="color:#FFD700;">Правило №2: Полная прозрачность.</span> Твои действия, здоровье и продуктивность мониторятся круглосуточно для твоей же безопасности. Ежедневно отчитывайся о прогрессе — это ключ к продвижению и бонусам, которые можно с умом потратить на необходимые вещи. С отрицательными отчётами ты рискуешь <span style="color:#FF4500;">штрафами...</span>`,

    // 3. Гидратация: Здоровье как ресурс, правила самоконтроля
    `<strong><span style="color:#00FF00;">Не забывай о показателях :<br><span style="color:#FF0000;">Здоровье, </span><span style="color:#00FF00;">Энергия,</span> <span style="color:#FFFF00;">Еда</span> и <span style="color:#0000FF;">Вода</span>.</span></strong><br><br>
    <span style="color:#FFD700;">Правило №3: Самоконтроль ресурсов.</span> Правильное потребление еды и воды каждый день. Восстановление энергии. Недостаток одного из ресурсов из твоих показателей (падение отметки показателя до 0 / 100) влияет на здоровье игрока при передвижении.`,

    // 4. Послушание: Иерархия, правила подчинения
    `<strong><span style="color:#00FF00;">Слушай старших. Слушай корпорацию.</span></strong><br><br>
    NeoCorp построена на строгой иерархии: от новичков вроде тебя до элиты в Неоновом Городе, где доступны продвинутые системы вроде robotDoctorSystem для лечения. <span style="color:#FFD700;">Правило №4: Безусловное подчинение.</span> Приказы старших — закон, даже если они кажутся странными, как патруль в зонах с cockroachSystem или сбор ресурсов для inventory. Вопросы? Только через официальные каналы, иначе штраф в balyary или демоушен, что заблокирует переход в worldSystem. Нарушение может привести к изгнанию, где без torn_energy_cap ты не выживешь против врагов, и потеряешь шанс на эндгейм-экипировку вроде nano_armor.`,

    // 5. Показатели: Мотивация через контроль, правила улучшения
    `<strong><span style="color:#00FF00;">Твои показатели в норме. Продолжай в том же духе.</span></strong><br><br>
    Мы анализируем твои данные в реальном времени: здоровье, энергия, вклад в задания, включая maxStats для health и energy из экипировки вроде torn_health_gloves. <span style="color:#FFD700;">Правило №5: Постоянное улучшение.</span> Стремитесь к 100% эффективности — еженедельные аудиты выявят слабости, как низкий food от отсутствия sausage или water от dried_fish. Если показатели падают, корпорация назначит коррекционные меры, как дополнительные тренировки в combatSystem или ограничения на ресурсы, чтобы подготовить тебя к боям с mutantSprite. Ты справишься — мы верим в тебя, особенно после регистрации с medical_certificate и доступа к bonfireSystem для отдыха.`,

    // 6. Гордость: Поощрение, правила вклада и лояльности
    `<strong><span style="color:#00FF00;">Корпорация гордится тобой.</span></strong><br><br>
    Твой вклад укрепляет NeoCorp в этом мире мутантов и хаоса, где enemySystem полон угроз вроде vacuumRobotSprite или corporateRobotSystem для патруля. <span style="color:#FFD700;">Правило №6: Вклад в общее благо.</span> Делись ресурсами с коллегами, выполняй корпоративные квесты — и получишь доступ к элитным зонам и технологиям, вроде speed_boots для движения или knuckles для ближнего боя. Гордость корпорации — твоя гордость: собирай balyary, улучшай inventory с atom, и после сдачи документов станешь частью элиты Неонового Города. Продолжай, и скоро ты экипируешься в cyber_pants, защищаясь от дронов и тараканов в наших мирах.`,
  ];

  function openQuestDialog() {
    // Скрываем кнопку принятия задания по умолчанию
    if (acceptBtn) acceptBtn.style.display = "none";

    // 1. Нет справки вообще
    if (!hasMedicalCertificate()) {
      dialogText.innerHTML = `
        <strong><span style="color:#FF0000;">Воспитатель Корпорации внимательно сканирует тебя... Документ <span style="color:#FFD700;">(МН-69)</span> не обнаружен ...</span></strong><br><br>
        Сначала тебе нужно :<br><span style="color:#00FF00;">Посетить мед.бота и пройти обследование.</span><br> Он находится около здания больницы NeoCorp - ярко зеленое здание на координатах<br><span style="color:#FFD700;">Х : 2772, Y: 2332.</span><br><br>
        Если все будет хорошо и у тебя не обнаружится мутаций, возвращайся ко мне с докуметном, я скажу что делать дальше.<br><strong><span style="color:#FFFF00;">По окончнии всей процедуры регистрации NeoCorp выдаст :</span></strong><br> <span style="color:#FF00FF;">"Базовый набор резидента"!</span>
      `;
      dialogWindow.style.display = "flex";
      return;
    }

    // 2. Есть справка, но без печати нет
    if (hasMedicalCertificate() && !hasStampedCertificate()) {
      dialogText.innerHTML = `
        <strong><span style="color:#00FF00;">Справка обнаружена! Проверка печати...</span></strong><br><br>
        <span style="color:#FF0000;"><strong>Печать охранной службы отсутствует!</span></strong><br><br>
        Отнеси документ <span style="color:#FFD700;">Капитану Райдеру</span> на охранную заставу — там тебе поставят официальную печать корпорации NeoCorp. Сможешь найти его на координатах <span style="color:#FFD700;"> X : 675, Y : 1593.</span><br><br>
        <strong><span style="color:#FF0000;">Без печати доступ к услугам корпорации NeoCorp закрыт!</strong></span><br>
        Я занесу документы в базу и вы сможете ощутить все преимущества жизни в нашем анклаве <span style="color:#00FF00;">NeoCorp.</span>
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
      <strong><span style="color:#00FF00;">Медицинская справка <span style="color:#FFFF00;">(МН-69)</span> с печатью охранной службы обнаружена!</span></strong><br><br>
      Ваши биометрические данные загружены в корпоративную базу. Вы готовы к службе в корпорации!<br><br>
      <span style="color:#FFD700;">Подтвердите сдачу документов для получения допуска к корпоративным заданиям и получение</span> <span style="color:#FF00FF;">"Базового набора резидента".</span>
    `;

    // Кнопка "Сдать документы"
    if (!acceptBtn) {
      acceptBtn = document.createElement("div");
      acceptBtn.className = "neon-btn";
      acceptBtn.textContent = "Сдать документы";
      acceptBtn.onclick = submitDocuments;
      dialogWindow.insertBefore(acceptBtn, dialogWindow.lastElementChild); // Вставляем перед closeBtn
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
    dialogWindow.style.display = "none"; // закрываем окно
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
