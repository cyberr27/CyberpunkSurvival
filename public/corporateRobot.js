// corporateRobot.js
// Робот «Воспитатель Корпорации» — патруль между двумя точками, мир 0
// Версия 2025 — фикс кнопок + оптимизация памяти/CPU + ИСПРАВЛЕНА проверка мед. справки
// + Добавлена прокрутка в диалоговом окне с использованием .npc-dialog-content для красивого скроллбара
// + Оптимизация: Адаптивное позиционирование кнопок/диалога для предотвращения выхода за экран и прокрутки страницы

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

  // Состояние (группируем для лучшей кэшируемости)
  let state = {
    dialogueIndex: 0,
    playerInRange: false,
    isMoving: false,
    pauseUntil: 0,
    movingTowardsB: true,
    currentPos: { x: POINT_A.x, y: POINT_A.y },
    targetPos: POINT_B,
  };

  // UI элементы (кэшируем все)
  let ui = {
    buttonsContainer: null,
    dialogWindow: null,
    dialogContent: null,
    dialogText: null,
    acceptBtn: null,
  };

  function createUI() {
    if (ui.buttonsContainer) return;

    // === Кнопки ===
    ui.buttonsContainer = document.createElement("div");
    ui.buttonsContainer.className = "npc-buttons-container";
    ui.buttonsContainer.style.cssText =
      "position:absolute; pointer-events:auto; display:none; z-index:1000;";
    document.body.appendChild(ui.buttonsContainer);

    const talkBtn = document.createElement("div");
    talkBtn.className = "npc-button npc-talk-btn";
    talkBtn.textContent = "Говорить";
    talkBtn.onclick = openTalkDialog;
    ui.buttonsContainer.appendChild(talkBtn);

    const questBtn = document.createElement("div");
    questBtn.className = "npc-button npc-quests-btn";
    questBtn.textContent = "Задания";
    questBtn.onclick = openQuestDialog;
    ui.buttonsContainer.appendChild(questBtn);

    // === Диалог ===
    ui.dialogWindow = document.createElement("div");
    ui.dialogWindow.className = "npc-dialog";
    ui.dialogWindow.style.display = "none";
    document.body.appendChild(ui.dialogWindow);

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
    ui.dialogWindow.appendChild(header);

    // Контейнер для прокрутки
    ui.dialogContent = document.createElement("div");
    ui.dialogContent.className = "npc-dialog-content";
    // Добавляем max-height для fit в экран (80% viewport height минус header/closeBtn)
    ui.dialogContent.style.maxHeight = `calc(80vh - 150px)`; // Предполагаем header ~100px, closeBtn ~50px; корректируй по CSS
    ui.dialogWindow.appendChild(ui.dialogContent);

    ui.dialogText = document.createElement("div");
    ui.dialogText.className = "npc-text";
    ui.dialogContent.appendChild(ui.dialogText);

    const closeBtn = document.createElement("div");
    closeBtn.className = "neon-btn";
    closeBtn.textContent = "Закрыть";
    closeBtn.onclick = closeDialog;
    ui.dialogWindow.appendChild(closeBtn);
  }

  function openDialog() {
    ui.dialogWindow.style.display = "flex";
    document.body.style.overflow = "hidden";
    // Дополнительно: фиксируем позицию, чтобы избежать сдвига (anti-scroll-jump)
    document.documentElement.style.overflow = "hidden";
  }

  function closeDialog() {
    ui.dialogWindow.style.display = "none";
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }

  function openTalkDialog() {
    ui.dialogText.innerHTML = DIALOGUES[state.dialogueIndex];
    state.dialogueIndex = (state.dialogueIndex + 1) % DIALOGUES.length;
    openDialog();
  }

  // === ИСПРАВЛЕННЫЕ функции проверки справки ===
  function hasMedicalCertificate() {
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
    В NeoCorp мы инвестируем в тебя, как в ценный актив, предоставляя доступ к технологиям.<br> <span style="color:#FFD700;">Правило №2: Полная прозрачность.</span> Твои действия, здоровье и продуктивность мониторятся круглосуточно для твоей же безопасности. Ежедневно отчитывайся о прогрессе — это ключ к продвижению и бонусам, которые можно с умом потратить на необходимые предметы. С отрицательными отчётами ты рискуешь <span style="color:#FF4500;">штрафами...</span>`,

    // 3. Гидратация: Здоровье как ресурс, правила самоконтроля
    `<strong><span style="color:#00FF00;">Не забывай о показателях :<br><span style="color:#FF0000;">Здоровье, </span><span style="color:#00FF00;">Энергия,</span> <span style="color:#FFFF00;">Еда</span> и <span style="color:#0000FF;">Вода</span>.</span></strong><br><br>
    <span style="color:#FFD700;">Правило №3: Самоконтроль ресурсов.</span> Правильное потребление еды и воды каждый день. Восстановление энергии. Держи показатели ближе к максимуму - это улучшит отчет и повысит качество получаемого ежедневного провианта. Недостаток одного из ресурсов из твоих показателей (падение отметки показателя до 0 / 100) влияет на твое здоровье при движении.`,

    // 4. Послушание: Иерархия, правила подчинения
    `<strong><span style="color:#00FF00;">Слушай старших. Слушай корпорацию.</span></strong><br><br>
    NeoCorp построена на строгой иерархии: от новичков вроде тебя до элиты в Неоновом Городе, где доступны продвинутые системы. Каждое успешное выполненное задание будет открывать новые возможности. <span style="color:#FFD700;">Правило №4: Безусловное подчинение.</span> Приказы старших — закон, даже если они кажутся странными.`,

    // 5. Показатели: Мотивация через контроль, правила улучшения
    `<strong><span style="color:#00FF00;">Твои показатели в норме. Продолжай в том же духе.</span></strong><br><br>
    Мы анализируем твои данные в реальном времени: здоровье, энергия, вклад в задания, включая maxStats для health и energy из экипировки вроде torn_health_gloves. <span style="color:#FFD700;">Правило №5: Постоянное улучшение.</span> Стремитесь к 100% эффективности — еженедельные аудиты выявят слабости, как низкий food от отсутствия sausage или water от dried_fish. Если показатели падают, корпорация назначит коррекционные меры, как дополнительные тренировки в combatSystem или ограничения на ресурсы, чтобы подготовить тебя к боям с mutantSprite. Ты справишься — мы верим в тебя, особенно после регистрации с medical_certificate и доступа к bonfireSystem для отдыха.`,

    // 6. Гордость: Поощрение, правила вклада и лояльности
    `<strong><span style="color:#00FF00;">Корпорация гордится тобой.</span></strong><br><br>
    Твой вклад укрепляет NeoCorp в этом мире мутантов и хаоса, где enemySystem полон угроз вроде vacuumRobotSprite или corporateRobotSystem для патруля. <span style="color:#FFD700;">Правило №6: Вклад в общее благо.</span> Делись ресурсами с коллегами, выполняй корпоративные квесты — и получишь доступ к элитным зонам и технологиям, вроде speed_boots для движения или knuckles для ближнего боя. Гордость корпорации — твоя гордость: собирай balyary, улучшай inventory с atom, и после сдачи документов станешь частью элиты Неонового Города. Продолжай, и скоро ты экипируешься в cyber_pants, защищаясь от дронов и тараканов в наших мирах.`,
  ];

  function openQuestDialog() {
    if (ui.acceptBtn) ui.acceptBtn.style.display = "none";

    if (!hasMedicalCertificate()) {
      ui.dialogText.innerHTML = `
        <strong><span style="color:#FF0000;">Воспитатель Корпорации внимательно сканирует тебя... Документ <span style="color:#FFD700;">(МН-69)</span> не обнаружен ...</span></strong><br><br>
        Сначала тебе нужно :<br><span style="color:#00FF00;">Посетить мед.бота и пройти обследование.</span><br> Он находится около здания больницы NeoCorp - ярко зеленое здание на координатах<br><span style="color:#FFD700;">Х : 2772, Y: 2332.</span><br><br>
        Если все будет хорошо и у тебя не обнаружится мутаций, возвращайся ко мне с докуметном, я скажу что делать дальше.<br><strong><span style="color:#FFFF00;">По окончнии всей процедуры регистрации NeoCorp выдаст :</span></strong><br> <span style="color:#FF00FF;">"Базовый набор резидента"!</span>
      `;
      openDialog();
      return;
    }

    if (hasMedicalCertificate() && !hasStampedCertificate()) {
      ui.dialogText.innerHTML = `
        <strong><span style="color:#00FF00;">Справка обнаружена! Проверка печати...</span></strong><br><br>
        <span style="color:#FF0000;"><strong>Печать охранной службы отсутствует!</span></strong><br><br>
        Отнеси документ <span style="color:#FFD700;">Капитану Райдеру</span> на охранную заставу — там тебе поставят официальную печать корпорации NeoCorp. Сможешь найти его на координатах <span style="color:#FFD700;"> X : 675, Y : 1593.</span><br><br>
        <strong><span style="color:#FF0000;">Без печати доступ к услугам корпорации NeoCorp закрыт!</strong></span><br>
        Я занесу документы в базу и вы сможете ощутить все преимущества жизни в нашем анклаве <span style="color:#00FF00;">NeoCorp.</span>
      `;
      openDialog();
      return;
    }

    const me = players.get(myId);
    if (me?.corporateDocumentsSubmitted) {
      ui.dialogText.innerHTML = `
        <strong>Добро пожаловать, служащий корпорации.</strong><br><br>
        Ваши документы уже приняты и зарегистрированы в системе.<br><br>
        Продолжайте выполнять свои обязанности. Корпорация следит за вами.
      `;
      openDialog();
      return;
    }

    ui.dialogText.innerHTML = `
      <strong><span style="color:#00FF00;">Медицинская справка <span style="color:#FFFF00;">(МН-69)</span> с печатью охранной службы обнаружена!</span></strong><br><br>
      Ваши биометрические данные загружены в корпоративную базу. Вы готовы к службе в корпорации!<br><br>
      <span style="color:#FFD700;">Подтвердите сдачу документов для получения допуска к корпоративным заданиям и получение</span> <span style="color:#FF00FF;">"Базового набора резидента".</span>
    `;

    if (!ui.acceptBtn) {
      ui.acceptBtn = document.createElement("div");
      ui.acceptBtn.className = "neon-btn";
      ui.acceptBtn.textContent = "Сдать документы";
      ui.acceptBtn.onclick = submitDocuments;
      ui.dialogWindow.insertBefore(
        ui.acceptBtn,
        ui.dialogWindow.lastElementChild
      );
    } else {
      ui.acceptBtn.textContent = "Сдать документы";
      ui.acceptBtn.onclick = submitDocuments;
    }
    ui.acceptBtn.style.display = "block";

    openDialog();
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
    closeDialog();
  }

  // === Движение (оптимизировано: кэшируем dist, минимизируем Math)
  function updateMovement(deltaTime) {
    if (state.playerInRange) {
      state.isMoving = false;
      return;
    }

    const now = performance.now();
    if (now < state.pauseUntil) {
      state.isMoving = false;
      return;
    }

    if (!state.isMoving) state.isMoving = true;

    const dx = state.targetPos.x - state.currentPos.x;
    const dy = state.targetPos.y - state.currentPos.y;
    const distSq = dx * dx + dy * dy;

    const moveDist = MOVE_SPEED * (deltaTime / 1000);
    const moveDistSq = moveDist * moveDist;

    if (distSq <= moveDistSq) {
      state.currentPos.x = state.targetPos.x;
      state.currentPos.y = state.targetPos.y;
      state.isMoving = false;
      state.pauseUntil = now + PAUSE_TIME;
      state.movingTowardsB = !state.movingTowardsB;
      state.targetPos = state.movingTowardsB ? POINT_B : POINT_A;
    } else {
      const dist = Math.sqrt(distSq);
      const ratio = moveDist / dist;
      state.currentPos.x += dx * ratio;
      state.currentPos.y += dy * ratio;
    }
  }

  // === Проверка близости (оптимизировано: ранний return)
  function checkProximity() {
    if (window.worldSystem.currentWorldId !== 0) {
      if (state.playerInRange) {
        state.playerInRange = false;
        if (ui.buttonsContainer) ui.buttonsContainer.style.display = "none";
      }
      return;
    }

    const me = players.get(myId);
    if (!me) return;

    const dx = me.x + 35 - state.currentPos.x;
    const dy = me.y + 35 - state.currentPos.y;
    const inRange = dx * dx + dy * dy <= INTERACTION_RADIUS_SQ;

    if (inRange !== state.playerInRange) {
      state.playerInRange = inRange;
      if (ui.buttonsContainer) {
        ui.buttonsContainer.style.display = inRange ? "flex" : "none";
      }
      if (!inRange && ui.dialogWindow) {
        closeDialog();
      }
    }
  }

  // === Позиция кнопок (адаптивно: clamp к экрану)
  function updateButtonsPosition() {
    if (!state.playerInRange || !ui.buttonsContainer) return;

    const cam = window.movementSystem.getCamera();
    let screenX = state.currentPos.x - cam.x;
    let screenY = state.currentPos.y - cam.y - 80;

    // Clamp позиции: не даём уйти за край (предполагаем ширину контейнера ~200px, высоту ~50px; корректируй)
    const containerWidth = ui.buttonsContainer.offsetWidth || 200;
    const containerHeight = ui.buttonsContainer.offsetHeight || 50;
    screenX = Math.max(
      0,
      Math.min(screenX, window.innerWidth - containerWidth)
    );
    screenY = Math.max(
      0,
      Math.min(screenY, window.innerHeight - containerHeight)
    );

    ui.buttonsContainer.style.left = `${screenX}px`;
    ui.buttonsContainer.style.top = `${screenY}px`;
  }

  let lastTime = performance.now();

  return {
    initialize: function (robotSprite) {
      if (initialized) return;
      sprite = robotSprite;
      state.currentPos = { x: POINT_A.x, y: POINT_A.y };
      state.targetPos = POINT_B;
      state.movingTowardsB = true;
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
      const sx = state.currentPos.x - cam.x - 35;
      const sy = state.currentPos.y - cam.y - 35;

      let frame = 0;
      let frameRow = 0;

      if (state.playerInRange || performance.now() < state.pauseUntil) {
        frame = 0;
        frameRow = 0;
      } else if (state.isMoving) {
        frame = 1 + (Math.floor(performance.now() / 100) % 12);
        frameRow = state.movingTowardsB ? 0 : 1;
      }

      const sourceY = frameRow * 70;
      ctx.drawImage(sprite, frame * 70, sourceY, 70, 70, sx, sy, 70, 70);

      // Подпись (оптимизировано: только если visible)
      ctx.font = "12px 'Courier New'";
      ctx.fillStyle = "#fbff00";
      ctx.textAlign = "center";
      ctx.fillText("Robot Corporations", sx + 35, sy - 15);
    },

    isPlayerInteracting: () =>
      state.playerInRange && ui.dialogWindow?.style.display === "flex",
  };
})();
