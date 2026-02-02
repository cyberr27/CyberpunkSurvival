// homeless.js — система аренды склада у Бездомного (2025)

const HOMELESS = {
  x: 912,
  y: 2332,
  interactionRadius: 60,
  name: "Бездомный",
  worldId: 0,
};

let homelessSprite = null;
let isNearHomeless = false;
let isDialogOpen = false;

let buttonsContainer = null;
let dialogElement = null;

let homelessStorageData = null; // { endTime, items: [] }
let selectedPlayerSlot = null;
let selectedStorageSlot = null;

// Анимация (оставляем как было)
const FRAME_COUNT = 13;
const FRAME_W = 70;
const FRAME_H = 70;

const LONG_DURATION = 10000;
const SHORT_DURATION = 2000;

let animTime = 0;
let currentRow = 0;
let frame = 0;
let transitionProgress = 1;
const TRANSITION_MS = 400;

function updateHomelessAnimation(deltaTime) {
  if (!homelessSprite) return;

  if (transitionProgress > 0.01 && !isNearHomeless) {
    animTime += deltaTime;
  }

  if (isNearHomeless) {
    transitionProgress = Math.max(
      0,
      transitionProgress - deltaTime / TRANSITION_MS,
    );
  } else {
    transitionProgress = Math.min(
      1,
      transitionProgress + deltaTime / TRANSITION_MS,
    );
  }

  if (transitionProgress < 0.02) {
    frame = 0;
    currentRow = 0;
    return;
  }

  const elapsed = animTime;

  if (currentRow === 0) {
    const progress = (elapsed % LONG_DURATION) / LONG_DURATION;
    frame = Math.floor(progress * FRAME_COUNT) % FRAME_COUNT;

    if (elapsed >= LONG_DURATION && !isNearHomeless) {
      currentRow = 1;
      animTime = 0;
      frame = 0;
    }
  } else {
    const progress = elapsed / SHORT_DURATION;
    frame = Math.floor(progress * FRAME_COUNT);

    if (frame >= FRAME_COUNT) {
      currentRow = 0;
      animTime = 0;
      frame = 0;
    }
  }
}

function drawHomeless() {
  if (!homelessSprite?.complete) return;
  if (window.worldSystem?.currentWorldId !== HOMELESS.worldId) return;

  const camera = movementSystem.getCamera();
  const sx = HOMELESS.x - camera.x;
  const sy = HOMELESS.y - camera.y;

  if (
    sx < -100 ||
    sx > canvas.width + 100 ||
    sy < -100 ||
    sy > canvas.height + 100
  ) {
    return;
  }

  let drawFrame = frame;
  let drawRow = currentRow * FRAME_H;

  if (transitionProgress < 0.98) {
    drawFrame = Math.round(transitionProgress * (FRAME_COUNT - 1));
    drawRow = 0;
  }

  ctx.drawImage(
    homelessSprite,
    drawFrame * FRAME_W,
    drawRow,
    FRAME_W,
    FRAME_H,
    sx - 35,
    sy - 35,
    FRAME_W,
    FRAME_H,
  );
}

// ─── UI ────────────────────────────────────────────────

function createInteractionButtons() {
  if (buttonsContainer) return;

  buttonsContainer = document.createElement("div");
  buttonsContainer.className = "homeless-btns-container";

  const btns = [
    { text: "ГОВОРИТЬ", cls: "homeless-talk", action: "talk" },
    { text: "СКЛАД", cls: "homeless-storage", action: "storage" },
  ];

  btns.forEach((b) => {
    const el = document.createElement("div");
    el.className = `homeless-btn ${b.cls}`;
    el.textContent = b.text;
    el.onclick = () => openHomelessInterface(b.action);
    buttonsContainer.appendChild(el);
  });

  document.body.appendChild(buttonsContainer);
}

function removeInteractionButtons() {
  if (buttonsContainer) {
    buttonsContainer.remove();
    buttonsContainer = null;
  }
}

function openHomelessInterface(mode) {
  closeHomelessDialog();

  isDialogOpen = true;
  document.body.classList.add("homeless-dialog-active");

  if (mode === "talk") {
    openTalkDialog();
  } else if (mode === "storage") {
    // Запрашиваем текущее состояние аренды у сервера
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "getHomelessStorage" }));
    }
  }
}

function openTalkDialog() {
  dialogElement = document.createElement("div");
  dialogElement.className = "homeless-dialog talk open";

  dialogElement.innerHTML = `
    <div class="homeless-header">
      <h2 class="homeless-title">Бездомный</h2>
    </div>
    <div class="homeless-content">
      <p>Эй... ты принёс еду? Или просто посмотреть пришёл?</p>
      <p>У меня есть пара ячеек в подвале... могу сдать в аренду.</p>
      <p>Но не даром, сам понимаешь.</p>
    </div>
    <button class="homeless-close">ЗАКРЫТЬ</button>
  `;

  document.body.appendChild(dialogElement);

  dialogElement.querySelector(".homeless-close").onclick = closeHomelessDialog;
}

function openRentDaysDialog() {
  dialogElement = document.createElement("div");
  dialogElement.className = "homeless-dialog rent open";

  dialogElement.innerHTML = `
    <div class="homeless-header">
      <h2 class="homeless-title">Аренда склада</h2>
    </div>
    <div class="homeless-content">
      <p>На сколько дней хочешь арендовать 20 ячеек?</p>
      <p>1 день = 50 баляров</p>
      <input type="number" id="rentDays" min="1" max="90" value="7" class="homeless-input" />
      <p id="rentCost" class="homeless-cost">Итого: 350 баляров</p>
      <p id="rentError" class="homeless-error"></p>
    </div>
    <div class="homeless-buttons">
      <button class="homeless-btn ok" id="confirmRent">ОК</button>
      <button class="homeless-btn cancel">ОТМЕНА</button>
    </div>
  `;

  document.body.appendChild(dialogElement);

  const daysInput = document.getElementById("rentDays");
  const costEl = document.getElementById("rentCost");
  const errorEl = document.getElementById("rentError");

  daysInput.oninput = () => {
    let days = parseInt(daysInput.value) || 1;
    if (days < 1) days = 1;
    if (days > 90) days = 90;
    daysInput.value = days;
    costEl.textContent = `Итого: ${days * 50} баляров`;
  };

  document.getElementById("confirmRent").onclick = () => {
    const days = parseInt(daysInput.value) || 1;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "rentHomelessStorage",
          days,
        }),
      );
    }
  };

  dialogElement.querySelector(".cancel").onclick = closeHomelessDialog;
}

function openStorageInterface() {
  dialogElement = document.createElement("div");
  dialogElement.className = "homeless-storage-dialog open";

  dialogElement.innerHTML = `
    <div class="homeless-storage-header">
      <h2 class="homeless-title">Склад Бездомного</h2>
      <span id="storageTimer"></span>
    </div>

    <div class="homeless-storage-content">
      <div class="player-storage">
        <h3>Твой инвентарь</h3>
        <div class="storage-grid" id="playerStorageGrid"></div>
      </div>

      <div class="storage-controls">
        <button class="homeless-btn put" id="putToStorage" disabled>ПОЛОЖИТЬ →</button>
        <button class="homeless-btn take" id="takeFromStorage" disabled>← ЗАБРАТЬ</button>
      </div>

      <div class="homeless-storage">
        <h3>Склад (20 ячеек)</h3>
        <div class="storage-grid" id="homelessStorageGrid"></div>
      </div>
    </div>

    <button class="homeless-btn close-storage">ЗАКРЫТЬ</button>
  `;

  document.body.appendChild(dialogElement);

  dialogElement.querySelector(".close-storage").onclick = closeHomelessDialog;

  renderStorageGrids();

  document.getElementById("putToStorage").onclick = putSelectedToStorage;
  document.getElementById("takeFromStorage").onclick = takeSelectedFromStorage;
}

function renderStorageGrids() {
  const playerGrid = document.getElementById("playerStorageGrid");
  const homelessGrid = document.getElementById("homelessStorageGrid");
  if (!playerGrid || !homelessGrid) return;

  playerGrid.innerHTML = "";
  homelessGrid.innerHTML = "";

  // Инвентарь игрока (20 слотов для примера)
  for (let i = 0; i < 20; i++) {
    const slot = window.inventory?.[i] || null;
    const el = createStorageSlot(i, slot, "player", !!slot);
    playerGrid.appendChild(el);
  }

  // Склад Бездомного
  const storageItems = homelessStorageData?.items || [];
  for (let i = 0; i < 20; i++) {
    const slot = storageItems[i] || null;
    const el = createStorageSlot(i, slot, "storage", !!slot);
    homelessGrid.appendChild(el);
  }

  updateTimerDisplay();
}

function createStorageSlot(index, item, type, hasItem) {
  const el = document.createElement("div");
  el.className = `storage-slot ${hasItem ? "occupied" : ""}`;
  el.dataset.index = index;
  el.dataset.type = type;

  if (item) {
    const img = document.createElement("img");
    img.src = `images/${ITEM_CONFIG?.[item.type]?.image || item.type + ".png"}`;
    img.alt = item.type;
    img.onerror = () => (img.src = "images/unknown.png");
    el.appendChild(img);

    if (item.quantity > 1) {
      const qty = document.createElement("span");
      qty.className = "slot-quantity";
      qty.textContent = item.quantity;
      el.appendChild(qty);
    }
  }

  el.onclick = () => {
    if (type === "player") {
      selectedPlayerSlot = index;
      selectedStorageSlot = null;
    } else {
      selectedStorageSlot = index;
      selectedPlayerSlot = null;
    }

    document
      .querySelectorAll(".storage-slot.selected")
      .forEach((s) => s.classList.remove("selected"));
    el.classList.add("selected");

    document.getElementById("putToStorage").disabled =
      type !== "player" || !hasItem;
    document.getElementById("takeFromStorage").disabled =
      type !== "storage" || !hasItem;
  };

  return el;
}

function putSelectedToStorage() {
  if (selectedPlayerSlot === null) return;

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "moveToHomelessStorage",
        slotIndex: selectedPlayerSlot,
      }),
    );
  }
}

function takeSelectedFromStorage() {
  if (selectedStorageSlot === null) return;

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "moveFromHomelessStorage",
        slotIndex: selectedStorageSlot,
      }),
    );
  }
}

function updateTimerDisplay() {
  const timerEl = document.getElementById("storageTimer");
  if (!timerEl || !homelessStorageData?.endTime) return;

  const remainMs = homelessStorageData.endTime - Date.now();
  if (remainMs <= 0) {
    timerEl.textContent = "Аренда истекла";
    timerEl.style.color = "#ff4444";
    return;
  }

  const days = Math.floor(remainMs / 86400000);
  const hours = Math.floor((remainMs % 86400000) / 3600000);
  const minutes = Math.floor((remainMs % 3600000) / 60000);

  timerEl.textContent = `Осталось: ${days}д ${hours}ч ${minutes}мин`;
  timerEl.style.color = remainMs < 86400000 ? "#ffaa00" : "#88ff88";
}

function closeHomelessDialog() {
  if (!isDialogOpen) return;
  isDialogOpen = false;
  document.body.classList.remove("homeless-dialog-active");

  if (dialogElement) {
    dialogElement.remove();
    dialogElement = null;
  }

  selectedPlayerSlot = null;
  selectedStorageSlot = null;
}

function checkProximity() {
  const me = players.get(myId);
  if (!me || me.health <= 0 || me.worldId !== HOMELESS.worldId) {
    if (isNearHomeless) {
      isNearHomeless = false;
      removeInteractionButtons();
      closeHomelessDialog();
    }
    return;
  }

  const dx = me.x - HOMELESS.x;
  const dy = me.y - HOMELESS.y;
  const dist = Math.hypot(dx, dy);

  const nowNear = dist < HOMELESS.interactionRadius;

  if (nowNear !== isNearHomeless) {
    isNearHomeless = nowNear;

    if (nowNear) {
      createInteractionButtons();
    } else {
      removeInteractionButtons();
      closeHomelessDialog();
    }
  }
}

window.homelessSystem = {
  initialize(sprite) {
    homelessSprite = sprite;
    animTime = 0;
    currentRow = 0;
    frame = 0;
    transitionProgress = 1;
  },

  draw: drawHomeless,
  update: updateHomelessAnimation,
  checkProximity,

  // Вызывается из handleGameMessage
  handleHomelessStorageData(data) {
    homelessStorageData = {
      endTime: data.endTime,
      items: data.items || [],
    };

    if (!data.isRented) {
      // Нет активной аренды → показываем выбор дней
      openRentDaysDialog();
    } else {
      // Есть аренда → открываем интерфейс склада
      openStorageInterface();
    }
  },

  handleHomelessStorageMove(data) {
    if (data.success) {
      // Обновляем локальный инвентарь игрока
      if (data.playerInventory) {
        window.inventory = data.playerInventory.map((i) =>
          i ? { ...i } : null,
        );
        window.inventorySystem?.updateInventoryDisplay();
      }

      // Обновляем склад
      if (data.storageItems) {
        homelessStorageData.items = data.storageItems;
      }

      // Перерисовываем интерфейс
      if (
        isDialogOpen &&
        dialogElement?.classList.contains("homeless-storage-dialog")
      ) {
        renderStorageGrids();
      }

      showNotification(data.message || "Предмет перемещён", "#88ff88");
    } else {
      showNotification(data.error || "Не удалось переместить", "#ff4444");
    }
  },

  handleRentResult(data) {
    if (data.success) {
      homelessStorageData = {
        endTime: data.endTime,
        items: [],
      };

      showNotification(`Склад арендован на ${data.days} дней!`, "#00ff88");

      closeHomelessDialog();
      openStorageInterface();
    } else {
      const errorEl = document.getElementById("rentError");
      if (errorEl) {
        errorEl.textContent = data.error || "Недостаточно баляров";
      }
      showNotification(data.error || "Ошибка аренды", "#ff4444");
    }
  },
};
