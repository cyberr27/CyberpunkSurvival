const TORESTOS = {
  x: 775,
  y: 1140,
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

// Для отката при отмене улучшения
let backupInventoryBeforeUpgrade = null;
let backupSelectedSlot = null;
let selectedMaterialQuantity = 1;
let isQuantityInputActive = false;

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
  // Всегда закрываем предыдущее окно Торестоса, если оно открыто
  closeDialog();

  isDialogOpen = true;
  document.body.classList.add("npc-dialog-active");

  dialogElement = document.createElement("div");

  const isTalk = section === "talk";
  const isUpgrade = section === "upgrade";
  const isCollection = section === "collection";

  // Правильно выбираем класс окна в зависимости от типа
  dialogElement.className = isUpgrade
    ? "torestos-upgrade-dialog open"
    : isTalk
      ? "torestos-dialog open"
      : "torestos-dialog open";

  document.body.appendChild(dialogElement);

  let closeBtn = null;

  // Общая кнопка "ОТМЕНА" / "ЗАКРЫТЬ" для upgrade и collection
  if (!isTalk) {
    closeBtn = document.createElement("button");
    closeBtn.className = "torestos-neon-btn-cancel";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "3%";
    closeBtn.style.width = "10%";
    closeBtn.textContent = "ОТМЕНА";
    closeBtn.onclick = closeDialog;
    dialogElement.appendChild(closeBtn);
  }

  const contentContainer = document.createElement("div");
  contentContainer.id = "torestosContent";
  dialogElement.appendChild(contentContainer);

  // ────────────────────────────────────────────────
  // ГОВОРИТЬ
  // ────────────────────────────────────────────────
  if (isTalk) {
    const headerDiv = document.createElement("div");
    headerDiv.className = "torestos-dialog-header";
    const title = document.createElement("h2");
    title.className = "torestos-title";
    title.textContent = "Торестос";
    headerDiv.appendChild(title);
    dialogElement.insertBefore(headerDiv, contentContainer);

    closeBtn = document.createElement("button");
    closeBtn.className = "torestos-neon-btn";
    closeBtn.textContent = "ЗАКРЫТЬ";
    closeBtn.onclick = closeDialog;
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
      // ... остальные темы (они не менялись)
    ];

    const content = document.createElement("div");
    content.className = "torestos-dialog-content";
    talkTopics.forEach((topic) => {
      const btn = document.createElement("button");
      btn.className = "torestos-topic-btn";
      btn.textContent = topic.title;
      btn.onclick = () => {
        content.innerHTML = `<p class="torestos-text">${topic.text}</p>`;
      };
      content.appendChild(btn);
    });
    contentContainer.appendChild(content);

    // ────────────────────────────────────────────────
    // УЛУЧШИТЬ
    // ────────────────────────────────────────────────
  } else if (isUpgrade) {
    // Делаем резервную копию инвентаря при первом открытии улучшений
    if (!backupInventoryBeforeUpgrade) {
      backupInventoryBeforeUpgrade = window.inventory.map((slot) =>
        slot ? { ...slot } : null,
      );
      backupSelectedSlot = window.selectedSlot;
    }

    // Блок ввода количества (как у Бездомного)
    const quantityContainer = document.createElement("div");
    quantityContainer.id = "torestosQuantityContainer";
    quantityContainer.className = "torestos-quantity-container";
    quantityContainer.style.display = "none";
    quantityContainer.innerHTML = `
      <div class="quantity-inner">
        <span id="quantityText">Сколько использовать:</span>
        <input type="number" id="torestosQuantityInput" min="1" value="1" step="1">
        <div id="quantityError" class="quantity-error"></div>
      </div>
    `;
    dialogElement.appendChild(quantityContainer);

    // Слушатель изменения количества
    const qInput = document.getElementById("torestosQuantityInput");
    if (qInput) {
      qInput.addEventListener("input", () => {
        let val = parseInt(qInput.value) || 1;
        const item = window.inventory[selectedPlayerSlot];
        if (item) {
          const max = item.quantity || 1;
          val = Math.max(1, Math.min(val, max));
          qInput.value = val;
          selectedMaterialQuantity = val;

          const errorEl = document.getElementById("quantityError");
          if (errorEl) errorEl.textContent = "";
        }
      });
    }

    function renderUpgradeUI() {
      contentContainer.innerHTML = "";

      const upgradeContent = document.createElement("div");
      upgradeContent.className = "upgrade-content";

      // Левая часть — инвентарь игрока
      const playerInvDiv = document.createElement("div");
      playerInvDiv.className = "upgrade-player-inventory";
      playerInvDiv.innerHTML = "<h3>Инвентарь</h3>";

      const playerGrid = document.createElement("div");
      playerGrid.className = "upgrade-inventory-grid";

      window.inventory.forEach((item, i) => {
        const slot = document.createElement("div");
        slot.className = "upgrade-inventory-slot";
        slot.dataset.index = i;

        if (item) {
          const img = document.createElement("img");
          img.src = ITEM_CONFIG[item.type]?.image?.src || "";
          img.alt = item.type;
          slot.appendChild(img);

          if (item.quantity > 1) {
            const qty = document.createElement("div");
            qty.className = "quantity-label";
            qty.textContent = item.quantity;
            slot.appendChild(qty);
          }
        }

        slot.onclick = () => {
          selectedPlayerSlot = i;
          useBtn.disabled = !window.inventory[i];
          updateTorestosQuantityInput(); // ← важно!
          renderUpgradeUI(); // обновляем выделение
        };

        if (selectedPlayerSlot === i) {
          slot.classList.add("selected");
        }

        playerGrid.appendChild(slot);
      });

      playerInvDiv.appendChild(playerGrid);

      // Центральный слот (улучшаемый предмет)
      const centerDiv = document.createElement("div");
      centerDiv.className = "upgrade-central-area";
      centerDiv.innerHTML = "<h3>Улучшаемый предмет</h3>";

      const centerSlot = document.createElement("div");
      centerSlot.className = "upgrade-central-slot";

      const centerIdx = window.inventory.findIndex((s) => s?.isUpgradeItem);
      if (centerIdx !== -1) {
        const item = window.inventory[centerIdx];
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[item.type]?.image?.src || "";
        centerSlot.appendChild(img);

        if (item.quantity > 1) {
          const qty = document.createElement("div");
          qty.className = "quantity-label";
          qty.textContent = item.quantity;
          centerSlot.appendChild(qty);
        }
      } else {
        centerSlot.textContent = "Пусто";
      }

      centerDiv.appendChild(centerSlot);

      // Правая часть — материалы
      const materialDiv = document.createElement("div");
      materialDiv.className = "upgrade-materials-area";
      materialDiv.innerHTML = "<h3>Материалы</h3>";

      const materialGrid = document.createElement("div");
      materialGrid.className = "upgrade-material-grid";

      // Показываем только слоты с материалами
      window.inventory.forEach((item, i) => {
        if (item?.isMaterial) {
          const slot = document.createElement("div");
          slot.className = "upgrade-material-slot";
          slot.dataset.index = i;

          const img = document.createElement("img");
          img.src = ITEM_CONFIG[item.type]?.image?.src || "";
          slot.appendChild(img);

          if (item.quantity > 1) {
            const qty = document.createElement("div");
            qty.className = "quantity-label";
            qty.textContent = item.quantity;
            slot.appendChild(qty);
          }

          slot.onclick = () => {
            selectedPlayerSlot = i;
            useBtn.disabled = false;
            updateTorestosQuantityInput();
            renderUpgradeUI();
          };

          if (selectedPlayerSlot === i) {
            slot.classList.add("selected");
          }

          materialGrid.appendChild(slot);
        }
      });

      materialDiv.appendChild(materialGrid);

      // Собираем всё вместе
      upgradeContent.appendChild(playerInvDiv);
      upgradeContent.appendChild(centerDiv);
      upgradeContent.appendChild(materialDiv);

      contentContainer.appendChild(upgradeContent);

      // Кнопки внизу
      const buttonsDiv = document.createElement("div");
      buttonsDiv.className = "upgrade-buttons";

      const useBtn = document.createElement("button");
      useBtn.className = "torestos-neon-btn-use";
      useBtn.id = "torestosUseBtn";
      useBtn.textContent = "ИСПОЛЬЗОВАТЬ >>";
      useBtn.disabled = selectedPlayerSlot === null;
      buttonsDiv.appendChild(useBtn);

      const createBtn = document.createElement("button");
      createBtn.className = "torestos-neon-btn-create";
      createBtn.textContent = "УЛУЧШИТЬ";
      buttonsDiv.appendChild(createBtn);

      dialogElement.appendChild(buttonsDiv);

      // ─── Логика кнопки ИСПОЛЬЗОВАТЬ ────────────────────────────────────────
      useBtn.onclick = () => {
        if (selectedPlayerSlot === null) return;

        const item = window.inventory[selectedPlayerSlot];
        if (!item) return;

        const cfg = ITEM_CONFIG[item.type];
        if (!cfg) return;

        const isUpgradable = !!cfg.type || !!cfg.collection || !!cfg.hands;

        let quantityToMove = 1;

        // Если активно поле количества — берём значение оттуда
        if (isQuantityInputActive) {
          const qInput = document.getElementById("torestosQuantityInput");
          if (qInput) {
            quantityToMove = parseInt(qInput.value) || 1;
            const maxQty = item.quantity || 1;
            if (quantityToMove < 1 || quantityToMove > maxQty) {
              const err = document.getElementById("quantityError");
              if (err) err.textContent = "Неверное количество";
              return;
            }
          }
        }

        if (isUpgradable) {
          // Центральный предмет
          const centerIdx = window.inventory.findIndex((s) => s?.isUpgradeItem);

          const newItem = { ...item, isUpgradeItem: true };

          if (centerIdx !== -1) {
            // SWAP
            const oldCenter = { ...window.inventory[centerIdx] };
            delete oldCenter.isUpgradeItem;
            window.inventory[selectedPlayerSlot] = oldCenter;
            window.inventory[centerIdx] = newItem;
          } else {
            window.inventory[selectedPlayerSlot] = null;
            const freeIdx = findFreeSlot();
            if (freeIdx !== -1) {
              window.inventory[freeIdx] = newItem;
            } else {
              window.inventory[selectedPlayerSlot] = { ...item };
              alert("Нет свободного места для улучшаемого предмета");
              return;
            }
          }

          selectedPlayerSlot = null;
          useBtn.disabled = true;
        } else {
          // Материал или возврат материала
          const isMaterial = !!item.isMaterial;

          if (isMaterial) {
            // Возвращаем материал в обычный инвентарь
            const existingStackIdx = window.inventory.findIndex(
              (s) =>
                s &&
                !s.isMaterial &&
                !s.isUpgradeItem &&
                s.type === item.type &&
                ITEM_CONFIG[s.type]?.stackable,
            );

            let targetSlot;

            if (existingStackIdx !== -1) {
              targetSlot = existingStackIdx;
              window.inventory[targetSlot].quantity =
                (window.inventory[targetSlot].quantity || 1) + quantityToMove;
            } else {
              targetSlot = findFreeSlot();
              if (targetSlot === -1) {
                alert("Нет места в инвентаре!");
                return;
              }
              window.inventory[targetSlot] = {
                type: item.type,
                quantity: quantityToMove,
              };
            }

            if (quantityToMove >= (item.quantity || 1)) {
              window.inventory[selectedPlayerSlot] = null;
            } else {
              item.quantity -= quantityToMove;
            }

            delete item.isMaterial;
            delete item.materialSlotIndex;

            selectedPlayerSlot = null;
            useBtn.disabled = true;
          } else {
            // Кладём как материал
            const usedMaterialSlots = new Set(
              window.inventory
                .filter((s) => s?.isMaterial)
                .map((s) => s.materialSlotIndex),
            );

            let freeMatIndex = -1;
            for (let i = 0; i < 20; i++) {
              if (!usedMaterialSlots.has(i)) {
                freeMatIndex = i;
                break;
              }
            }

            if (freeMatIndex === -1) {
              alert("Все слоты материалов заняты!");
              return;
            }

            const existingMatIdx = window.inventory.findIndex(
              (s) => s?.isMaterial && s.type === item.type,
            );

            let targetMaterialSlot;

            if (existingMatIdx !== -1) {
              targetMaterialSlot = existingMatIdx;
              window.inventory[targetMaterialSlot].quantity =
                (window.inventory[targetMaterialSlot].quantity || 1) +
                quantityToMove;
            } else {
              const freeIdx = findFreeSlot();
              if (freeIdx === -1) {
                alert("Нет свободного места в инвентаре для материала!");
                return;
              }
              targetMaterialSlot = freeIdx;

              window.inventory[targetMaterialSlot] = {
                ...item,
                quantity: quantityToMove,
                isMaterial: true,
                materialSlotIndex: freeMatIndex,
              };
            }

            if (quantityToMove >= (item.quantity || 1)) {
              window.inventory[selectedPlayerSlot] = null;
            } else {
              item.quantity -= quantityToMove;
            }

            selectedPlayerSlot = null;
            useBtn.disabled = true;
          }
        }

        selectedMaterialQuantity = 1;
        updateTorestosQuantityInput();
        renderUpgradeUI();
      };

      // ─── Логика кнопки УЛУЧШИТЬ ────────────────────────────────────────────
      createBtn.onclick = () => {
        const materialQuantities = {};

        window.inventory.forEach((item) => {
          if (item?.isMaterial) {
            materialQuantities[item.type] =
              (materialQuantities[item.type] || 0) + (item.quantity || 1);
          }
        });

        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "torestosUpgrade",
              inventory: window.inventory,
              materialQuantities,
            }),
          );
        }

        createBtn.disabled = true;
        createBtn.textContent = "ОБРАБОТКА...";
      };
    }

    renderUpgradeUI();
  }

  // ────────────────────────────────────────────────
  // КОЛЛЕКЦИЯ (пока заглушка, не меняли)
  // ────────────────────────────────────────────────
  else if (isCollection) {
    contentContainer.innerHTML =
      "<h2>КОЛЛЕКЦИЯ</h2><p>Скоро здесь будет коллекция...</p>";
  }
}

function closeDialog() {
  if (!isDialogOpen) return;
  isDialogOpen = false;
  document.body.classList.remove("npc-dialog-active");

  if (dialogElement) {
    dialogElement.remove();
    dialogElement = null;
    selectedPlayerSlot = null;
  }

  // Откат изменений, если была открыта панель улучшений
  if (backupInventoryBeforeUpgrade) {
    window.inventory = backupInventoryBeforeUpgrade.map((slot) =>
      slot ? { ...slot } : null,
    );
    window.selectedSlot = backupSelectedSlot;
    window.inventorySystem.updateInventoryDisplay();
  }

  backupInventoryBeforeUpgrade = null;
  backupSelectedSlot = null;
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

function removeButtonsTorestos() {
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
      removeButtonsTorestos();
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
    removeButtonsTorestos();
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
    else removeButtonsTorestos();
  }
}

function updateTorestosQuantityInput() {
  const container = document.getElementById("torestosQuantityContainer");
  const input = document.getElementById("torestosQuantityInput");
  const text = document.getElementById("quantityText");
  const error = document.getElementById("quantityError");

  if (!container || !input) return;

  const useBtn = document.getElementById("torestosUseBtn");
  if (!useBtn) {
    container.style.display = "none";
    return;
  }

  if (selectedPlayerSlot === null) {
    container.style.display = "none";
    isQuantityInputActive = false;
    selectedMaterialQuantity = 1;
    return;
  }

  const item = window.inventory[selectedPlayerSlot];
  if (!item) {
    container.style.display = "none";
    return;
  }

  const cfg = ITEM_CONFIG[item.type];
  const isStackable = cfg?.stackable === true;
  const qtyAvailable = item.quantity || 1;

  if (isStackable && qtyAvailable > 1) {
    // Показываем поле
    container.style.display = "flex";
    isQuantityInputActive = true;

    text.textContent = item.isMaterial
      ? "Сколько вернуть в инвентарь:"
      : "Сколько использовать как материал:";

    input.min = 1;
    input.max = qtyAvailable;
    input.value = Math.min(selectedMaterialQuantity, qtyAvailable);

    error.textContent = "";
  } else {
    // Не показываем
    container.style.display = "none";
    isQuantityInputActive = false;
    selectedMaterialQuantity = 1;
  }

  // Обновляем кнопку USE
  if (useBtn) {
    useBtn.disabled = !item;
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
