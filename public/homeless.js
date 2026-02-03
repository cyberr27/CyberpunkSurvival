// homeless.js — полностью переписан под новую логику склада

const HOMELESS = {
  x: 912,
  y: 2332,
  interactionRadius: 50,
  name: "Бездомный",
  worldId: 0,
};

let homelessSprite = null;
let isNearHomeless = false;
let isDialogOpenHomeless = false;
let isStorageOpenHomeless = false;

let buttonsContainerHomeless = null;
let dialogElementHomeless = null;
let storageDialogHomeless = null;

// ─── Анимация (оставляем как было) ────────────────────────────────────────────────
const FRAME_COUNT = 13;
const FRAME_W = 70;
const FRAME_H = 70;

const LONG_ROW_DURATION = 10000;
const SHORT_ROW_DURATION = 2000;

let animationTime = 0;
let currentRow = 0;
let frameHomeless = 0;
let transitionProgress = 1;
const TRANSITION_DURATION = 400;

function updateHomelessAnimation(deltaTime) {
  if (!homelessSprite) return;

  if (transitionProgress > 0.01 && !isNearHomeless) {
    animationTime += deltaTime;
  }

  if (isNearHomeless) {
    if (transitionProgress > 0) {
      transitionProgress = Math.max(
        0,
        transitionProgress - deltaTime / TRANSITION_DURATION,
      );
    }
  } else {
    if (transitionProgress < 1) {
      transitionProgress = Math.min(
        1,
        transitionProgress + deltaTime / TRANSITION_DURATION,
      );
    }
  }

  if (transitionProgress < 0.02) {
    frameHomeless = 0;
    currentRow = 0;
    return;
  }

  const elapsed = animationTime;

  if (currentRow === 0) {
    const progress = (elapsed % LONG_ROW_DURATION) / LONG_ROW_DURATION;
    frameHomeless = Math.floor(progress * FRAME_COUNT) % FRAME_COUNT;

    if (elapsed >= LONG_ROW_DURATION && !isNearHomeless) {
      currentRow = 1;
      animationTime = 0;
      frameHomeless = 0;
    }
  } else {
    const progress = elapsed / SHORT_ROW_DURATION;
    frameHomeless = Math.floor(progress * FRAME_COUNT);

    if (frameHomeless >= FRAME_COUNT) {
      currentRow = 0;
      animationTime = 0;
      frameHomeless = 0;
    }
  }
}

function drawHomeless() {
  if (!homelessSprite?.complete) return;
  if (window.worldSystem?.currentWorldId !== HOMELESS.worldId) return;

  const camera = movementSystem.getCamera();
  const screenX = HOMELESS.x - camera.x;
  const screenY = HOMELESS.y - camera.y;

  if (
    screenX < -100 ||
    screenX > canvas.width + 100 ||
    screenY < -100 ||
    screenY > canvas.height + 100
  ) {
    return;
  }

  let drawFrame = frameHomeless;
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
    screenX - 35,
    screenY - 35,
    FRAME_W,
    FRAME_H,
  );
}

// ─── Кнопки и диалоги ──────────────────────────────────────────

function showHomelessButtons() {
  if (buttonsContainerHomeless) return;

  buttonsContainerHomeless = document.createElement("div");
  buttonsContainerHomeless.className = "homeless-buttons-container";

  const btns = [
    { text: "ГОВОРИТЬ", cls: "homeless-talk-btn", action: "talk" },
    { text: "ЗАДАНИЯ", cls: "homeless-quests-btn", action: "quests" },
    { text: "СКЛАД", cls: "homeless-storage-btn", action: "storage" },
  ];

  btns.forEach((b) => {
    const btn = document.createElement("button");
    btn.className = `homeless-button ${b.cls}`;
    btn.textContent = b.text;
    btn.dataset.action = b.action;
    btn.addEventListener("click", () => openHomelessDialog(b.action));
    buttonsContainerHomeless.appendChild(btn);
  });

  document.body.appendChild(buttonsContainerHomeless);
}

function removeButtons() {
  if (buttonsContainerHomeless) {
    buttonsContainerHomeless.remove();
    buttonsContainerHomeless = null;
  }
}

function closeHomelessDialog() {
  if (dialogElementHomeless) {
    dialogElementHomeless.remove();
    dialogElementHomeless = null;
  }
  if (storageDialogHomeless) {
    storageDialogHomeless.remove();
    storageDialogHomeless = null;
    isStorageOpenHomeless = false;
  }
  isDialogOpenHomeless = false;
  document.body.classList.remove(
    "npc-dialog-active",
    "homeless-storage-active",
  );
}

function openHomelessDialog(section) {
  closeHomelessDialog();

  isDialogOpenHomeless = true;
  document.body.classList.add("npc-dialog-active");

  if (section === "storage") {
    // Запрашиваем статус у сервера
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "homelessOpenStorage" }));
    }
    return;
  }

  // Обычные заглушки для talk и quests
  dialogElementHomeless = document.createElement("div");
  dialogElementHomeless.className = "homeless-main-dialog open";

  dialogElementHomeless.innerHTML = `
    <div class="homeless-dialog-header">
      <img src="homeless_foto.png" class="homeless-photo" alt="Бездомный">
      <h2 class="homeless-title">Бездомный</h2>
    </div>
    <div class="homeless-dialog-content">
      <p class="homeless-text">[ЗАГЛУШКА] ${section.toUpperCase()} — скоро здесь будет нормальный диалог...</p>
    </div>
    <button class="homeless-close-btn">ЗАКРЫТЬ</button>
  `;

  document.body.appendChild(dialogElementHomeless);

  dialogElementHomeless
    .querySelector(".homeless-close-btn")
    .addEventListener("click", closeHomelessDialog);
}

// ─── Обработка сообщений от сервера ────────────────────────────────────────────────

function handleHomelessServerMessage(data) {
  if (data.type === "homelessStorageStatus") {
    if (!data.rented) {
      showHomelessRentDialog();
    } else {
      showHomelessStorageInterface(data.storageItems);
    }
  } else if (data.type === "homelessRentSuccess") {
    showNotification(
      `Склад арендован до ${new Date(data.rentUntil).toLocaleString()}`,
      "#00ff88",
    );
    showHomelessStorageInterface(data.storageItems);
  } else if (data.type === "homelessStorageUpdate") {
    if (storageDialogHomeless) {
      updateHomelessStorageUI(data.inventory, data.storageItems);
    }
  } else if (data.type === "homelessError") {
    showNotification(data.message, "#ff4444");
  }
}

// ─── Диалог аренды ────────────────────────────────────────────────

function showHomelessRentDialog() {
  closeHomelessDialog();

  dialogElementHomeless = document.createElement("div");
  dialogElementHomeless.className =
    "homeless-main-dialog open homeless-rent-dialog";

  dialogElementHomeless.innerHTML = `
    <div class="homeless-dialog-header">
      <img src="homeless_foto.png" class="homeless-photo" alt="Бездомный">
      <h2 class="homeless-title">Аренда склада</h2>
    </div>
    <div class="homeless-dialog-content">
      <p class="homeless-text">На сколько дней сохранить вещи?</p>
      <p class="homeless-text-cost">2 баляра за сутки</p>
      <input type="number" id="homelessRentDays" min="1" value="1" class="homeless-rent-input">
      <div class="homeless-rent-buttons">
        <button class="homeless-rent-ok">ОК</button>
        <button class="homeless-close-btn">Закрыть</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialogElementHomeless);

  dialogElementHomeless
    .querySelector(".homeless-close-btn")
    .addEventListener("click", closeHomelessDialog);

  dialogElementHomeless
    .querySelector(".homeless-rent-ok")
    .addEventListener("click", () => {
      const days = parseInt(document.getElementById("homelessRentDays").value);
      if (days >= 1) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "homelessRentConfirm",
              days,
            }),
          );
        }
      } else {
        showNotification("Введите корректное количество дней", "#ff4444");
      }
    });
}

// ─── Интерфейс хранилища ────────────────────────────────────────────────

function showHomelessStorageInterface(storageItems) {
  closeHomelessDialog();

  isStorageOpenHomeless = true;
  document.body.classList.add("homeless-storage-active");

  storageDialogHomeless = document.createElement("div");
  storageDialogHomeless.className = "homeless-storage-dialog open";

  storageDialogHomeless.innerHTML = `
    <div class="homeless-storage-header">
      <h2>Склад Бездомного</h2>
      <button class="homeless-close-btn">Закрыть</button>
    </div>
    <div class="homeless-storage-content">
      <div class="homeless-player-inventory">
        <h3>Твой инвентарь</h3>
        <div class="homeless-grid" id="homelessPlayerGrid"></div>
      </div>
      <div class="homeless-storage-buttons">
        <button id="homelessPutBtn" disabled>Положить</button>
        <button id="homelessTakeBtn" disabled>Забрать</button>
      </div>
      <div class="homeless-storage-inventory">
        <h3>Хранилище</h3>
        <div class="homeless-grid" id="homelessStorageGrid"></div>
      </div>
    </div>
  `;

  document.body.appendChild(storageDialogHomeless);

  storageDialogHomeless
    .querySelector(".homeless-close-btn")
    .addEventListener("click", closeHomelessDialog);

  updateHomelessStorageUI(window.inventory, storageItems);

  // Обработчики кнопок
  document
    .getElementById("homelessPutBtn")
    .addEventListener("click", putSelectedItem);
  document
    .getElementById("homelessTakeBtn")
    .addEventListener("click", takeSelectedItem);
}

let selectedPlayerSlotHomeless = null;
let selectedStorageSlotHomeless = null;

function updateHomelessStorageUI(playerInv, storageInv) {
  const playerGrid = document.getElementById("homelessPlayerGrid");
  const storageGrid = document.getElementById("homelessStorageGrid");

  if (!playerGrid || !storageGrid) return;

  playerGrid.innerHTML = "";
  storageGrid.innerHTML = "";

  // Игрок
  playerInv.forEach((item, i) => {
    const slot = document.createElement("div");
    slot.className = "homeless-slot";
    slot.dataset.index = i;

    if (item) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[item.type]?.image?.src || "";
      slot.appendChild(img);

      if (item.quantity > 1) {
        const q = document.createElement("div");
        q.className = "homeless-quantity";
        q.textContent = item.quantity;
        slot.appendChild(q);
      }
    }

    slot.addEventListener("click", () => {
      selectedPlayerSlotHomeless = i;
      selectedStorageSlotHomeless = null;
      updateHomelessSelection();
    });

    playerGrid.appendChild(slot);
  });

  // Хранилище
  storageInv.forEach((item, i) => {
    const slot = document.createElement("div");
    slot.className = "homeless-slot";
    slot.dataset.index = i;

    if (item) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[item.type]?.image?.src || "";
      slot.appendChild(img);

      if (item.quantity > 1) {
        const q = document.createElement("div");
        q.className = "homeless-quantity";
        q.textContent = item.quantity;
        slot.appendChild(q);
      }
    }

    slot.addEventListener("click", () => {
      selectedStorageSlotHomeless = i;
      selectedPlayerSlotHomeless = null;
      updateHomelessSelection();
    });

    storageGrid.appendChild(slot);
  });

  updateHomelessSelection();
}

function updateHomelessSelection() {
  document
    .querySelectorAll(".homeless-slot")
    .forEach((el) => el.classList.remove("selected"));

  if (selectedPlayerSlotHomeless !== null) {
    const el = document.querySelector(
      `#homelessPlayerGrid .homeless-slot[data-index="${selectedPlayerSlotHomeless}"]`,
    );
    if (el) el.classList.add("selected");
    document.getElementById("homelessPutBtn").disabled =
      !window.inventory[selectedPlayerSlotHomeless];
    document.getElementById("homelessTakeBtn").disabled = true;
  } else if (selectedStorageSlotHomeless !== null) {
    const el = document.querySelector(
      `#homelessStorageGrid .homeless-slot[data-index="${selectedStorageSlotHomeless}"]`,
    );
    if (el) el.classList.add("selected");
    document.getElementById("homelessTakeBtn").disabled =
      !storageDialogHomeless.dataset.storageItems?.[
        selectedStorageSlotHomeless
      ];
    document.getElementById("homelessPutBtn").disabled = true;
  } else {
    document.getElementById("homelessPutBtn").disabled = true;
    document.getElementById("homelessTakeBtn").disabled = true;
  }
}

function putSelectedItem() {
  if (selectedPlayerSlotHomeless === null) return;

  const freeStorageSlot = Array.from(
    document.querySelectorAll("#homelessStorageGrid .homeless-slot"),
  ).findIndex((slot) => !slot.hasChildNodes() || !slot.querySelector("img"));

  if (freeStorageSlot === -1) {
    showNotification("Хранилище заполнено!", "#ff4444");
    return;
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "homelessPutItem",
        playerSlot: selectedPlayerSlotHomeless,
        storageSlot: freeStorageSlot,
      }),
    );
  }

  selectedPlayerSlotHomeless = null;
  updateHomelessSelection();
}

function takeSelectedItem() {
  if (selectedStorageSlotHomeless === null) return;

  const freePlayerSlot = window.inventory.findIndex((slot) => !slot);

  if (freePlayerSlot === -1) {
    showNotification("Инвентарь заполнен!", "#ff4444");
    return;
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "homelessTakeItem",
        playerSlot: freePlayerSlot,
        storageSlot: selectedStorageSlotHomeless,
      }),
    );
  }

  selectedStorageSlotHomeless = null;
  updateHomelessSelection();
}

// ─── Инициализация и экспорт ─────────────────────────────────

window.homelessSystem = {
  initialize(sprite) {
    homelessSprite = sprite;
    animationTime = 0;
    currentRow = 0;
    frameHomeless = 0;
    transitionProgress = 1;
    console.log("[Homeless] initialized");
  },

  checkProximity() {
    const me = players.get(myId);
    if (!me || me.health <= 0 || me.worldId !== HOMELESS.worldId) {
      if (isNearHomeless) {
        isNearHomeless = false;
        removeButtons();
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
        showHomelessButtons();
      } else {
        removeButtons();
        closeHomelessDialog();
      }
    }
  },

  draw: drawHomeless,
  update: updateHomelessAnimation,
  handleMessage: handleHomelessServerMessage,
};
