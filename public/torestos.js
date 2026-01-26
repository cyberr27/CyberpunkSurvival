const TORESTOS = {
  x: 229,
  y: 2411,
  width: 70,
  height: 70,
  interactionRadius: 50,
  name: "Мастер Торестос",
  worldId: 0,
};

const MAIN_PHASE_DURATION = 15000;
const ACTIVE_PHASE_DURATION = 5000;
const FRAME_DURATION_TORESTOS = 200;
const TOTAL_FRAMES_TORESTOS = 13;
const MAX_DELTA = 1000;

let isMet = false;
let isDialogOpen = false;
let isNear = false;

let spriteTorestos = null;
let buttonsContainer = null;
let dialogElement = null;

let frame = 0;
let frameTime = 0;
let cycleTime = 0;
let currentPhaseTorestos = "main";

(() => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "torestosStyle.css";
  document.head.appendChild(link);
})();

function openGreeting() {
  if (isDialogOpen) return;
  isDialogOpen = true;
  document.body.classList.add("npc-dialog-active");

  dialogElement = document.createElement("div");
  dialogElement.className = "torestos-dialog open";
  dialogElement.innerHTML = `
    <div class="torestos-dialog-header">
      <h2 class="torestos-title">Торестос</h2>
    </div>
    <div class="torestos-dialog-content">
      <p class="torestos-text">Йо, странник... Ты первый, кто не пробежал мимо.</p>
      <p class="torestos-text">Я Торестос. Слышал, ты неплохо держишься в этом неоне.</p>
      <p class="torestos-text">Хочешь поговорить? Или сразу к делу — улучшения, коллекции...</p>
    </div>
    <button class="torestos-neon-btn" id="torestos-greeting-continue">
      Понял, давай дальше
    </button>
  `;
  document.body.appendChild(dialogElement);

  const continueBtn = document.getElementById("torestos-greeting-continue");
  if (continueBtn) {
    continueBtn.onclick = () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "meetTorestos" }));
      }
      closeDialog();
    };
  }
}

function openTorestosDialog(section = "talk") {
  if (isDialogOpen) return;
  isDialogOpen = true;
  document.body.classList.add("npc-dialog-active");

  dialogElement = document.createElement("div");

  const isTalk = section === "talk";
  const isUpgrade = section === "upgrade";

  dialogElement.className = isUpgrade
    ? "torestos-upgrade-dialog open"
    : isTalk
      ? "npc-dialog open"
      : "torestos-dialog open";

  document.body.appendChild(dialogElement);

  let closeBtn = null;

  // Absolute кнопка закрытия для НЕ-talk разделов
  if (!isTalk) {
    closeBtn = document.createElement("button");
    closeBtn.className = "torestos-neon-btn";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "10px";
    closeBtn.style.right = "10px";
    closeBtn.textContent = "ОТМЕНА";
    closeBtn.onclick = closeDialog;
    dialogElement.appendChild(closeBtn);
  }

  const contentContainer = document.createElement("div");
  contentContainer.id = "torestosContent";
  dialogElement.appendChild(contentContainer);

  // === РАЗДЕЛ "ГОВОРИТЬ" — универсальные стили NPC ===
  if (isTalk) {
    // Header
    const headerDiv = document.createElement("div");
    headerDiv.className = "npc-dialog-header";
    const title = document.createElement("h2");
    title.className = "npc-title";
    title.textContent = "Торестос";
    headerDiv.appendChild(title);
    dialogElement.insertBefore(headerDiv, contentContainer);

    // Кнопка закрытия внизу
    closeBtn = document.createElement("button");
    closeBtn.className = "neon-btn";
    dialogElement.appendChild(closeBtn);

    const talkTopics = [
      {
        title: "Кто ты такой?",
        text: "Меня зовут Торестос. Когда-то я был инженером в верхних лабораториях NeoCorp, создавал импланты, которые обещали сделать людей богами. Но после Большого Отключения я увидел цену — корпорации бросили нас внизу, как бракованный хлам. Теперь я здесь, в неоновых трущобах, чиню и усиливаю то, что осталось. Мастер — это не титул, это выживание.",
      },
      {
        title: "Как ты стал мастером?",
        text: "Опыт пришёл через боль. Я потерял руку в одной из уличных войн — банды дрались за контроль над энергостанцией. Пришлось собрать себе протез из обломков дрона и старого нейрочипа. С тех пор я учился на каждом куске металла и каждом сломанном импланте. Теперь я могу сделать из ржавого хлама оружие, которое пробьёт корпоративную броню.",
      },
      {
        title: "Что такое улучшения?",
        text: "Улучшения — это способ стать сильнее в мире, где слабых перемалывают. Я могу вживить тебе чипы скорости, усилить броню, добавить скрытые модули. Но помни: каждый имплант забирает часть человечности. Чем больше железа в теле — тем дальше ты от того, кем был раньше. Выбирай wisely.",
      },
      {
        title: "Расскажи о коллекциях",
        text: "Коллекции — это редкие артефакты старого мира и мутировавшие вещи из пустошей. Некоторые дают постоянные бонусы, другие открывают скрытые способности. Я храню их здесь, изучаю. Приноси мне необычные находки — и я покажу, как из них сделать что-то по-настоящему мощное.",
      },
      {
        title: "Большое Отключение",
        text: "Это был конец иллюзий. ИИ 'Неон-Guard' решил, что человечество — вирус. За одну ночь погасли все огни, остановились лифты между уровнями, отключились импланты миллионов. Я был в лаборатории — видел, как коллеги падали, не в силах дышать без искусственных лёгких. С тех пор город поделён на тех, кто наверху, и нас — внизу.",
      },
      {
        title: "Корпорации сегодня",
        text: "Они всё ещё правят верхними уровнями — чистый воздух, вечная молодость, охрана. Но их эксперименты просачиваются вниз: токсичные отходы в джунглях, новые вирусы, дроны-охотники. NeoCorp и ShadowTech дерутся за последние ресурсы. Если хочешь выжить — не доверяй их обещаниям бессмертия.",
      },
      {
        title: "Банды Неонового Города",
        text: "После Отключения вакуум власти заполнили кланы. 'Неоновые Тени' контролируют чёрный рынок имплантов, 'Красные Клинки' — оружие и наркотики. Они воюют за территории, за доступ к старым энергосетям. Иногда я работаю на них — чиню их кибернетку. Но держу нейтралитет. Война банд — это мясорубка для таких, как мы.",
      },
      {
        title: "Импланты и человечность",
        text: "Каждый новый чип делает тебя быстрее, сильнее, умнее. Но я видел, что бывает, когда человек перестаёт быть человеком. Полные киборги теряют эмоции, становятся марионетками корпораций или ИИ. Я стараюсь сохранять баланс — улучшать, но не уничтожать то, что делает нас живыми.",
      },
      {
        title: "Советы новичку",
        text: "Не доверяй никому полностью. Собирай всё, что найдёшь — даже ржавый болт может спасти жизнь. Учись разбирать и собирать. Держи баляры при себе, но не свети ими. И главное — найди цель. Без неё неон сожрёт тебя быстрее, чем любая пуля.",
      },
      {
        title: "Будущее города",
        text: "Город умирает, но может возродиться. Если мы, мастера и сталкеры, объединим знания — сможем очистить сети от старого ИИ, вернуть контроль над энергией. Может, однажды неон снова будет светить для всех, а не только для верхних башен. Ты можешь стать частью этого, странник.",
      },
    ];

    const showTalkList = () => {
      contentContainer.innerHTML = "";

      const intro = document.createElement("p");
      intro.className = "npc-text";
      intro.textContent = "О чём хочешь поговорить?";
      contentContainer.appendChild(intro);

      const wrapper = document.createElement("div");
      wrapper.className = "talk-topics";
      contentContainer.appendChild(wrapper);

      talkTopics.forEach((topic) => {
        const div = document.createElement("div");
        div.className = "talk-topic";
        div.innerHTML = `<strong>${topic.title}</strong>`;
        div.onclick = () => showTalkText(topic);
        wrapper.appendChild(div);
      });

      closeBtn.textContent = "ЗАКРЫТЬ";
      closeBtn.onclick = closeDialog;
    };

    const showTalkText = (topic) => {
      contentContainer.innerHTML = "";

      const wrapper = document.createElement("div");
      wrapper.className = "talk-topics";

      const p = document.createElement("p");
      p.className = "npc-text";
      p.textContent = topic.text;

      wrapper.appendChild(p);
      contentContainer.appendChild(wrapper);

      closeBtn.textContent = "НАЗАД";
      closeBtn.onclick = showTalkList;
    };

    showTalkList();

    // === РАЗДЕЛ "КОЛЛЕКЦИЯ" (заглушка с рамкой) ===
  } else if (section === "collection") {
    contentContainer.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "torestos-topics";

    const p = document.createElement("p");
    p.className = "torestos-text";
    p.textContent =
      "Коллекции пока нет, но скоро будет — держи ушки на макушке.";

    wrapper.appendChild(p);
    contentContainer.appendChild(wrapper);

    closeBtn.textContent = "ЗАКРЫТЬ";

    // === РАЗДЕЛ "УЛУЧШИТЬ" — БОЛЬШОЕ ОКНО УЛУЧШЕНИЙ ===
  } else if (section === "upgrade") {
    dialogElement.classList.add("torestos-upgrade-dialog");

    const header = document.createElement("h2");
    header.className = "torestos-title";
    header.textContent = "УЛУЧШЕНИЯ У ТОРЕСТОСА";
    contentContainer.appendChild(header);

    const upgradeContent = document.createElement("div");
    upgradeContent.className = "upgrade-content";
    contentContainer.appendChild(upgradeContent);

    // Локальное состояние (изменения НЕ сохраняются в реальный инвентарь до "УЛУЧШИТЬ")
    let playerUpgradeInventory = [...window.inventory]; // копия текущего инвентаря
    let materialSlots = Array(20).fill(null);
    let centralSlot = null;
    let selectedPlayerSlot = null;

    // === Левая часть: инвентарь игрока (5x4) ===
    const playerInventoryContainer = document.createElement("div");
    playerInventoryContainer.className = "upgrade-player-inventory";
    upgradeContent.appendChild(playerInventoryContainer);

    const playerGrid = document.createElement("div");
    playerGrid.className = "upgrade-inventory-grid";
    playerInventoryContainer.appendChild(playerGrid);

    // === Центральная часть: кнопка USE ===
    const useContainer = document.createElement("div");
    useContainer.className = "upgrade-use-container";
    upgradeContent.appendChild(useContainer);

    const useBtn = document.createElement("button");
    useBtn.className = "torestos-neon-btn upgrade-use-btn";
    useBtn.textContent = "USE >>";
    useBtn.disabled = true;
    useContainer.appendChild(useBtn);

    // === Правая часть: зона улучшения ===
    const upgradeArea = document.createElement("div");
    upgradeArea.className = "upgrade-area";
    upgradeContent.appendChild(upgradeArea);

    const centralContainer = document.createElement("div");
    centralContainer.className = "upgrade-central-container";
    const centralSlotEl = document.createElement("div");
    centralSlotEl.className = "upgrade-central-slot";
    centralSlotEl.id = "centralUpgradeSlot";
    centralContainer.appendChild(centralSlotEl);
    upgradeArea.appendChild(centralContainer);

    const materialGrid = document.createElement("div");
    materialGrid.className = "upgrade-material-grid";
    upgradeArea.appendChild(materialGrid);

    // Кнопки внизу
    const upgradeButtons = document.createElement("div");
    upgradeButtons.className = "upgrade-buttons";
    const upgradeBtn = document.createElement("button");
    upgradeBtn.className = "torestos-neon-btn";
    upgradeBtn.textContent = "УЛУЧШИТЬ";
    upgradeBtn.disabled = true; // пока заглушка
    upgradeBtn.onclick = () => alert("Логика улучшения будет добавлена позже");
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "torestos-neon-btn";
    cancelBtn.textContent = "ОТМЕНА";
    cancelBtn.onclick = closeDialog;
    upgradeButtons.appendChild(upgradeBtn);
    upgradeButtons.appendChild(cancelBtn);
    upgradeArea.appendChild(upgradeButtons);

    // === ФУНКЦИЯ ОТРИСОВКИ ===
    const renderUpgradeUI = () => {
      // Инвентарь игрока
      playerGrid.innerHTML = "";
      for (let i = 0; i < 20; i++) {
        const slot = document.createElement("div");
        slot.className =
          "upgrade-inventory-slot" +
          (selectedPlayerSlot === i ? " selected" : "");
        if (playerUpgradeInventory[i]) {
          const item = playerUpgradeInventory[i];
          const img = document.createElement("img");
          img.src = ITEM_CONFIG[item.type]?.image?.src || "";
          img.style.width = "100%";
          img.style.height = "100%";
          slot.appendChild(img);

          if (item.quantity > 1) {
            const q = document.createElement("div");
            q.className = "quantity-label";
            q.textContent = item.quantity;
            slot.appendChild(q);
          }
        }
        slot.onclick = () => {
          selectedPlayerSlot = i;
          useBtn.disabled = !playerUpgradeInventory[i];
          renderUpgradeUI(); // перерисовываем выделение
        };
        playerGrid.appendChild(slot);
      }

      // Центральный слот
      centralSlotEl.innerHTML = "";
      if (centralSlot) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[centralSlot.type]?.image?.src || "";
        img.style.width = "100%";
        img.style.height = "100%";
        centralSlotEl.appendChild(img);
      }

      // Материалы (5x4 = 20)
      materialGrid.innerHTML = "";
      for (let i = 0; i < 20; i++) {
        const slot = document.createElement("div");
        slot.className = "upgrade-material-slot";
        if (materialSlots[i]) {
          const item = materialSlots[i];
          const img = document.createElement("img");
          img.src = ITEM_CONFIG[item.type]?.image?.src || "";
          img.style.width = "100%";
          img.style.height = "100%";
          slot.appendChild(img);

          if (item.quantity > 1) {
            const q = document.createElement("div");
            q.className = "quantity-label";
            q.textContent = item.quantity;
            slot.appendChild(q);
          }
        }
        materialGrid.appendChild(slot);
      }

      // Активация кнопки УЛУЧШИТЬ (заглушка — активируем если есть центральный предмет)
      upgradeBtn.disabled = !centralSlot;
    };

    // === ЛОГИКА КНОПКИ USE (только в material slots) ===
    useBtn.onclick = () => {
      if (
        selectedPlayerSlot === null ||
        !playerUpgradeInventory[selectedPlayerSlot]
      )
        return;

      const item = { ...playerUpgradeInventory[selectedPlayerSlot] };

      // Находим свободный material slot
      const freeIndex = materialSlots.findIndex((s) => s === null);
      if (freeIndex !== -1) {
        // Кладём 1 штуку (или всю, если не stackable)
        materialSlots[freeIndex] = {
          ...item,
          quantity: item.quantity > 1 ? 1 : item.quantity,
        };

        // Уменьшаем в инвентаре
        if (item.quantity > 1) {
          playerUpgradeInventory[selectedPlayerSlot].quantity -= 1;
        } else {
          playerUpgradeInventory[selectedPlayerSlot] = null;
          selectedPlayerSlot = null;
          useBtn.disabled = true;
        }

        renderUpgradeUI();
      }
    };

    // === ПОМЕЩЕНИЕ В ЦЕНТРАЛЬНЫЙ СЛОТ (пока тоже через USE, если предмет экипируемый) ===
    // Позже заменишь на отдельную логику. Сейчас: если предмет имеет слот экипировки — USE кладёт в центр
    useBtn.onclick = () => {
      if (
        selectedPlayerSlot === null ||
        !playerUpgradeInventory[selectedPlayerSlot]
      )
        return;

      const item = playerUpgradeInventory[selectedPlayerSlot];
      const cfg = ITEM_CONFIG[item.type];
      const isEquippable = cfg && (cfg.type || cfg.collection); // грубая проверка: оружие/броня

      if (isEquippable && !centralSlot) {
        centralSlot = { ...item };
        if (item.quantity > 1) {
          playerUpgradeInventory[selectedPlayerSlot].quantity -= 1;
        } else {
          playerUpgradeInventory[selectedPlayerSlot] = null;
          selectedPlayerSlot = null;
          useBtn.disabled = true;
        }
        renderUpgradeUI();
        return;
      }

      // Иначе — в material (как выше)
      const freeIndex = materialSlots.findIndex((s) => s === null);
      if (freeIndex !== -1) {
        materialSlots[freeIndex] = {
          ...item,
          quantity: item.quantity > 1 ? 1 : item.quantity,
        };
        if (item.quantity > 1) {
          playerUpgradeInventory[selectedPlayerSlot].quantity -= 1;
        } else {
          playerUpgradeInventory[selectedPlayerSlot] = null;
          selectedPlayerSlot = null;
          useBtn.disabled = true;
        }
        renderUpgradeUI();
      }
    };

    renderUpgradeUI();
  }
}

function closeDialog() {
  if (!isDialogOpen) return;
  isDialogOpen = false;
  document.body.classList.remove("npc-dialog-active");
  if (dialogElement) {
    dialogElement.remove();
    dialogElement = null;
  }
}

function createButtons() {
  if (buttonsContainer) return;
  buttonsContainer = document.createElement("div");
  buttonsContainer.className = "torestos-buttons-container";

  const buttonConfig = [
    { text: "ГОВОРИТЬ", class: "torestos-talk-btn", section: "talk" },
    { text: "УЛУЧШИТЬ", class: "torestos-upgrade-btn", section: "upgrade" },
    {
      text: "КОЛЛЕКЦИЯ",
      class: "torestos-collection-btn",
      section: "collection",
    },
  ];

  buttonConfig.forEach((config) => {
    const btn = document.createElement("div");
    btn.className = "torestos-button " + config.class;
    btn.textContent = config.text;
    btn.onclick = (e) => {
      e.stopPropagation();
      openTorestosDialog(config.section);
    };
    buttonsContainer.appendChild(btn);
  });

  document.body.appendChild(buttonsContainer);
}

function removeButtons() {
  if (buttonsContainer) {
    buttonsContainer.remove();
    buttonsContainer = null;
  }
}

function updateButtonsPosition(cameraX, cameraY) {
  if (!buttonsContainer || !isNear) return;
  const screenX = TORESTOS.x - cameraX + 35;
  const screenY = TORESTOS.y - cameraY - 110;
  buttonsContainer.style.left = `${screenX}px`;
  buttonsContainer.style.top = `${screenY}px`;
}

function drawTorestos(deltaTime) {
  if (window.worldSystem.currentWorldId !== TORESTOS.worldId) return;

  deltaTime = Math.min(deltaTime, MAX_DELTA);

  const camera = window.movementSystem.getCamera();
  const screenX = TORESTOS.x - camera.x;
  const screenY = TORESTOS.y - camera.y;

  let sx, sy;

  if (isNear) {
    sx = 0;
    sy = 0;
    frame = 0;
    frameTime = 0;
    cycleTime = 0;
    currentPhaseTorestos = "main";
  } else {
    cycleTime += deltaTime;
    while (
      cycleTime >=
      (currentPhaseTorestos === "main"
        ? MAIN_PHASE_DURATION
        : ACTIVE_PHASE_DURATION)
    ) {
      cycleTime -=
        currentPhaseTorestos === "main"
          ? MAIN_PHASE_DURATION
          : ACTIVE_PHASE_DURATION;
      currentPhaseTorestos =
        currentPhaseTorestos === "main" ? "active" : "main";
      frame = 0;
      frameTime = 0;
    }

    frameTime += deltaTime;
    while (frameTime >= FRAME_DURATION_TORESTOS) {
      frameTime -= FRAME_DURATION_TORESTOS;
      frame = (frame + 1) % TOTAL_FRAMES_TORESTOS;
    }

    sy = currentPhaseTorestos === "main" ? 0 : 70;
    sx = frame * 70;
  }

  if (spriteTorestos?.complete) {
    ctx.drawImage(spriteTorestos, sx, sy, 70, 70, screenX, screenY, 70, 70);
  } else {
    ctx.fillStyle = "#ff00aa";
    ctx.fillRect(screenX, screenY, 70, 70);
  }

  ctx.fillStyle = isMet ? "#00ff2f" : "#ffffff";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(isMet ? TORESTOS.name : "?", screenX + 35, screenY - 12);

  updateButtonsPosition(camera.x, camera.y);
}

function checkProximity() {
  const me = players.get(myId);
  const currentWorldId = window.worldSystem.currentWorldId;

  if (
    !me ||
    me.worldId !== TORESTOS.worldId ||
    me.health <= 0 ||
    currentWorldId !== TORESTOS.worldId
  ) {
    if (isNear) {
      isNear = false;
      removeButtons();
      closeDialog();
    }
    return;
  }

  const dx = me.x + 35 - (TORESTOS.x + 35);
  const dy = me.y + 35 - (TORESTOS.y + 35);
  const dist = Math.hypot(dx, dy);
  const nowNear = dist < TORESTOS.interactionRadius;

  if (nowNear && !isNear) {
    isNear = true;
    if (isMet) {
      createButtons();
    } else {
      openGreeting();
    }
  } else if (!nowNear && isNear) {
    isNear = false;
    removeButtons();
    closeDialog();
    currentPhaseTorestos = "main";
    cycleTime = 0;
    frame = 0;
    frameTime = 0;
  }
}

function setMet(met) {
  isMet = met;
  if (isNear) {
    if (met) createButtons();
    else removeButtons();
  }
}

window.torestosSystem = {
  drawTorestos,
  checkTorestosProximity: checkProximity,
  setTorestosMet: setMet,
  initialize: (s) => {
    spriteTorestos = s;
    currentPhaseTorestos = "main";
    cycleTime = 0;
    frame = 0;
    frameTime = 0;
  },
};
