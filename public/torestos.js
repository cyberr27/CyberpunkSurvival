// torestos.js — центральный слот и материалы полностью независимы, стеки работают корректно

const TORESTOS = {
  x: 775,
  y: 1140,
  width: 70,
  height: 70,
  interactionRadius: 60,
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

// Для отката
let backupInventoryBeforeUpgrade = null;
let backupSelectedSlot = null;

// Выбранные слоты
let selectedPlayerSlot = null;
let selectedMaterialSlotTorestos = null;

// Запоминаем, откуда взяли улучшаемый предмет
let originalUpgradeItemSlotIndex = null;

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
      <p class="torestos-text">Хочешь поговорить? Или сразу к делу — улучшения...</p>
    </div>
    <button class="torestos-neon-btn" id="torestos-greeting-continue">
      Понял, давай дальше
    </button>
  `;
  document.body.appendChild(dialogElement);

  document.getElementById("torestos-greeting-continue").onclick = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "meetTorestos" }));
    }
    closeDialog();
  };
}

function openTorestosDialog(section = "talk") {
  closeDialog();

  isDialogOpen = true;
  document.body.classList.add("npc-dialog-active");

  if (section !== "upgrade") {
    dialogElement = document.createElement("div");
    dialogElement.className = "torestos-dialog open";
    dialogElement.innerHTML = `
      <div class="torestos-dialog-header">
        <h2 class="torestos-title">Торестос — ${section === "talk" ? "Разговор" : "Коллекция"}</h2>
      </div>
      <div class="torestos-dialog-content">
        <p class="torestos-text">[ЗАГЛУШКА]</p>
        <p class="torestos-text">Этот раздел пока в разработке. Скоро здесь будет интересно!</p>
      </div>
      <button class="torestos-neon-btn torestos-close-btn">ЗАКРЫТЬ</button>
    `;
    document.body.appendChild(dialogElement);

    dialogElement.querySelector(".torestos-close-btn").onclick = closeDialog;
    return;
  }

  // Окно улучшений
  dialogElement = document.createElement("div");
  dialogElement.className = "torestos-upgrade-dialog open";
  dialogElement.innerHTML = `
    <div class="torestos-upgrade-header">
      <h2 class="torestos-title">Улучшение экипировки</h2>
      <button class="torestos-close-btn">ОТМЕНА</button>
    </div>

    <div class="torestos-upgrade-content">
      <div class="torestos-player-inventory">
        <h3>Инвентарь</h3>
        <div class="torestos-grid" id="torestosPlayerGrid"></div>
      </div>

      <div class="torestos-central-area">
        <div class="torestos-central-slot" id="torestosCentralSlot">
          <div class="torestos-central-placeholder">Предмет для улучшения</div>
        </div>

        <div class="upgrade-use-container">
          <button class="torestos-neon-btn upgrade-use-btn" id="torestosUseBtn">
            USE >>
          </button>
        </div>

        <div class="torestos-upgrade-buttons">
          <button class="torestos-neon-btn" id="torestosUpgradeConfirmBtn" disabled>
            УЛУЧШИТЬ
          </button>
        </div>
      </div>

      <div class="torestos-material-area">
        <h3>Материалы</h3>
        <div class="torestos-grid" id="torestosMaterialGrid"></div>
      </div>
    </div>

    <div class="torestos-stack-form" id="torestosStackForm" style="display:none;">
      <span class="torestos-cyber-text" id="torestosStackText">Сколько переместить:</span>
      <input type="number" class="torestos-cyber-input" id="torestosStackInput" min="1" value="1">
      <div class="torestos-error-text" id="torestosStackError"></div>
      <div style="margin-top:8px;">
        <button class="torestos-neon-btn small" id="torestosConfirmMoveBtn">Переместить</button>
        <button class="torestos-neon-btn small cancel" id="torestosCancelMoveBtn">Отмена</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialogElement);

  dialogElement.querySelector(".torestos-close-btn").onclick = closeDialog;

  backupInventoryBeforeUpgrade = window.inventory.map((slot) =>
    slot ? { ...slot } : null,
  );
  backupSelectedSlot = window.selectedSlot;

  renderTorestosUpgradeUI();

  document.getElementById("torestosUpgradeConfirmBtn").onclick = () => {
    const btn = document.getElementById("torestosUpgradeConfirmBtn");
    if (btn.disabled) return;

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "torestosUpgrade",
          inventory: window.inventory.map((s) => (s ? { ...s } : null)),
        }),
      );
      btn.disabled = true;
      btn.textContent = "ОБРАБОТКА...";
    }
  };

  document.getElementById("torestosUseBtn").onclick = handleUseButton;
}

function isUpgradeableItem(item) {
  if (!item) return false;
  const cfg = ITEM_CONFIG[item.type];
  if (!cfg) return false;
  return (
    cfg.type === "weapon" ||
    ["headgear", "armor", "gloves", "belt", "pants", "boots"].includes(cfg.type)
  );
}

function isMaterialItem(item) {
  if (!item) return false;
  const cfg = ITEM_CONFIG[item.type];
  return cfg && cfg.materials === true;
}

function renderTorestosUpgradeUI() {
  const playerGrid = document.getElementById("torestosPlayerGrid");
  const materialGrid = document.getElementById("torestosMaterialGrid");
  const centralSlot = document.getElementById("torestosCentralSlot");
  const useBtn = document.getElementById("torestosUseBtn");

  if (!playerGrid || !materialGrid || !centralSlot) return;

  playerGrid.innerHTML = "";
  materialGrid.innerHTML = "";
  centralSlot.innerHTML = "";

  // Инвентарь игрока (5×5)
  for (let i = 0; i < 25; i++) {
    const slot = document.createElement("div");
    slot.className = "torestos-slot";
    slot.dataset.index = i;
    slot.dataset.type = "player";

    const item = window.inventory[i];
    if (item && !item.isUpgradeItem && !item.isMaterial) {
      const cfg = ITEM_CONFIG[item.type];
      if (cfg) {
        const imgSrc = cfg.image?.src || "";
        if (imgSrc) {
          const img = document.createElement("img");
          img.src = imgSrc;
          img.alt = item.type;
          img.style.width = "90%";
          img.style.height = "90%";
          img.style.objectFit = "contain";
          slot.appendChild(img);
        } else {
          slot.style.backgroundColor = "#1a3344";
          slot.innerHTML = `<div style="color:#88ccff;font-size:11px;padding:4px;text-align:center;">${item.type.slice(0, 10)}</div>`;
        }

        if ((item.quantity || 1) > 1) {
          const qty = document.createElement("div");
          qty.className = "torestos-quantity";
          qty.textContent = item.quantity;
          slot.appendChild(qty);
        }
      }

      slot.onclick = () => {
        selectedPlayerSlot = i;
        document
          .querySelectorAll(".torestos-slot")
          .forEach((el) => el.classList.remove("selected"));
        slot.classList.add("selected");
        useBtn.disabled = false;
      };

      if (selectedPlayerSlot === i) {
        slot.classList.add("selected");
      }
    }

    playerGrid.appendChild(slot);
  }

  // Центральный слот
  const centerItem = window.inventory.find((s) => s?.isUpgradeItem);
  centralSlot.innerHTML = "";

  if (centerItem && ITEM_CONFIG[centerItem.type]) {
    const cfg = ITEM_CONFIG[centerItem.type];
    const imgSrc = cfg.image?.src || "";
    if (imgSrc) {
      const img = document.createElement("img");
      img.src = imgSrc;
      img.alt = centerItem.type;
      img.style.width = "82%";
      img.style.height = "82%";
      img.style.objectFit = "contain";
      centralSlot.appendChild(img);
    } else {
      centralSlot.innerHTML = `<div style="color:#ff8800;font-size:14px;padding:8px;text-align:center;">${centerItem.type}</div>`;
    }

    if ((centerItem.quantity || 1) > 1) {
      const qty = document.createElement("div");
      qty.className = "torestos-quantity large";
      qty.textContent = centerItem.quantity;
      centralSlot.appendChild(qty);
    }

    centralSlot.ondblclick = () => {
      const idx = window.inventory.findIndex((s) => s === centerItem);
      if (idx !== -1) {
        let targetSlot = originalUpgradeItemSlotIndex;

        if (
          targetSlot !== null &&
          targetSlot >= 0 &&
          targetSlot < 25 &&
          !window.inventory[targetSlot]
        ) {
          window.inventory[targetSlot] = { ...centerItem };
          delete window.inventory[targetSlot].isUpgradeItem;
        } else {
          const freeIdx = window.inventory.findIndex((s) => !s);
          if (freeIdx !== -1) {
            window.inventory[freeIdx] = { ...centerItem };
            delete window.inventory[freeIdx].isUpgradeItem;
          } else {
            showNotification("Нет места в инвентаре!", "#ff4444");
            return;
          }
        }

        window.inventory[idx] = null;
        originalUpgradeItemSlotIndex = null;
        renderTorestosUpgradeUI();
        document.getElementById("torestosUpgradeConfirmBtn").disabled = true;
      }
    };

    document.getElementById("torestosUpgradeConfirmBtn").disabled = false;
  } else {
    centralSlot.innerHTML =
      '<div class="torestos-central-placeholder">Предмет для улучшения</div>';
    document.getElementById("torestosUpgradeConfirmBtn").disabled = true;
    originalUpgradeItemSlotIndex = null;
  }

  // Материалы (5×4 = 20 слотов)
  for (let i = 0; i < 20; i++) {
    const slot = document.createElement("div");
    slot.className = "torestos-slot torestos-material-slot";
    slot.dataset.index = i;

    const matItem = window.inventory.find(
      (s) => s && s.isMaterial && s.materialSlotIndex === i,
    );

    if (matItem && ITEM_CONFIG[matItem.type]) {
      const cfg = ITEM_CONFIG[matItem.type];
      const imgSrc = cfg.image?.src || "";
      if (imgSrc) {
        const img = document.createElement("img");
        img.src = imgSrc;
        img.alt = matItem.type;
        img.style.width = "86%";
        img.style.height = "86%";
        img.style.objectFit = "contain";
        slot.appendChild(img);
      } else {
        slot.style.backgroundColor = "#332200";
        slot.innerHTML = `<div style="color:#ffcc66;font-size:10px;padding:4px;text-align:center;">${matItem.type.slice(0, 10)}</div>`;
      }

      if ((matItem.quantity || 1) > 1) {
        const qty = document.createElement("div");
        qty.className = "torestos-quantity";
        qty.textContent = matItem.quantity;
        slot.appendChild(qty);
      }

      slot.ondblclick = () => {
        if (matItem) {
          selectedMaterialSlotTorestos = i;
          showTorestosMoveForm(matItem, "materialToPlayer");
        }
      };
    }

    materialGrid.appendChild(slot);
  }

  useBtn.disabled = selectedPlayerSlot === null;
}

function handleUseButton() {
  if (selectedPlayerSlot === null) return;

  const item = window.inventory[selectedPlayerSlot];
  if (!item) return;

  const cfg = ITEM_CONFIG[item.type];
  if (!cfg) return;

  // Экипировка / оружие → только в центральный слот
  if (isUpgradeableItem(item)) {
    if (item.isUpgradeItem) return; // уже в центре

    originalUpgradeItemSlotIndex = selectedPlayerSlot;

    const takenItem = { ...item };
    takenItem.isUpgradeItem = true;
    delete takenItem.isMaterial;
    delete takenItem.materialSlotIndex;

    window.inventory[selectedPlayerSlot] = null;

    // Если центр занят — возвращаем старый предмет в инвентарь
    const existingCenterIdx = window.inventory.findIndex(
      (s) => s?.isUpgradeItem,
    );
    if (existingCenterIdx !== -1) {
      const oldCenter = { ...window.inventory[existingCenterIdx] };
      delete oldCenter.isUpgradeItem;

      const freeIdx = window.inventory.findIndex((s) => !s);
      if (freeIdx !== -1) {
        window.inventory[freeIdx] = oldCenter;
      } else {
        showNotification(
          "Нет места для возврата предыдущего предмета!",
          "#ff4444",
        );
        return;
      }
    }

    // Кладём новый в центр
    const targetIdx =
      existingCenterIdx !== -1
        ? existingCenterIdx
        : window.inventory.findIndex((s) => !s);
    if (targetIdx === -1) {
      showNotification("Нет места в инвентаре!", "#ff4444");
      return;
    }
    window.inventory[targetIdx] = takenItem;

    renderTorestosUpgradeUI();
    document.getElementById("torestosUpgradeConfirmBtn").disabled = false;
    return;
  }

  // Материал → только в слоты материалов
  if (isMaterialItem(item)) {
    if (item.isMaterial) return; // уже в материалах

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
      showNotification("Все слоты материалов заняты!", "#ff4444");
      return;
    }

    if (cfg.stackable) {
      // Стекуемый → форма количества
      showTorestosMoveForm(item, "playerToMaterial");
    } else {
      // Нестекуемый → кладём один
      const matItem = {
        ...item,
        isMaterial: true,
        materialSlotIndex: freeMatIndex,
        isUpgradeItem: false,
      };

      const freeIdx = window.inventory.findIndex((s) => !s);
      if (freeIdx === -1) {
        showNotification("Нет места в инвентаре!", "#ff4444");
        return;
      }

      window.inventory[freeIdx] = matItem;
      window.inventory[selectedPlayerSlot] = null;
      renderTorestosUpgradeUI();
    }
    return;
  }

  // Обычный предмет — ничего не делаем
}

function showTorestosMoveForm(item, direction) {
  const form = document.getElementById("torestosStackForm");
  const input = document.getElementById("torestosStackInput");
  const text = document.getElementById("torestosStackText");
  const error = document.getElementById("torestosStackError");

  if (!form || !input || !text || !error) return;

  text.textContent =
    direction === "playerToMaterial"
      ? "Сколько положить в материалы:"
      : "Сколько вернуть в инвентарь:";

  input.max = item.quantity || 1;
  input.value = "1";
  error.textContent = "";
  form.style.display = "flex";

  const rect = document
    .querySelector(".torestos-upgrade-content")
    ?.getBoundingClientRect();
  if (rect) {
    form.style.left = `${rect.left + rect.width / 2 - 140}px`;
    form.style.top = `${rect.top + rect.height / 2 - 100}px`;
  }

  const confirmBtn = document.getElementById("torestosConfirmMoveBtn");
  const cancelBtn = document.getElementById("torestosCancelMoveBtn");

  const confirmHandler = () => {
    let qty = parseInt(input.value) || 1;
    if (qty < 1) qty = 1;
    if (qty > (item.quantity || 1)) qty = item.quantity || 1;

    if (direction === "playerToMaterial") {
      if (!isMaterialItem(item)) {
        showNotification(
          "Этот предмет нельзя использовать как материал",
          "#ff4444",
        );
        form.style.display = "none";
        return;
      }

      const slotIndex = selectedPlayerSlot;
      if (
        !window.inventory[slotIndex] ||
        window.inventory[slotIndex].type !== item.type
      ) {
        form.style.display = "none";
        return;
      }

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
        showNotification("Все слоты материалов заняты!", "#ff4444");
        form.style.display = "none";
        return;
      }

      const existingMat = window.inventory.find(
        (s) => s?.isMaterial && s.type === item.type,
      );

      if (existingMat && ITEM_CONFIG[item.type]?.stackable) {
        existingMat.quantity = (existingMat.quantity || 1) + qty;
      } else {
        const matItem = {
          ...item,
          quantity: qty,
          isMaterial: true,
          materialSlotIndex: freeMatIndex,
          isUpgradeItem: false,
        };

        const freeIdx = window.inventory.findIndex((s) => !s);
        if (freeIdx === -1) {
          showNotification("Нет места в инвентаре!", "#ff4444");
          form.style.display = "none";
          return;
        }
        window.inventory[freeIdx] = matItem;
      }

      if ((item.quantity || 1) > qty) {
        item.quantity = (item.quantity || 1) - qty;
      } else {
        window.inventory[slotIndex] = null;
        selectedPlayerSlot = null;
      }

      renderTorestosUpgradeUI();
    } else if (direction === "materialToPlayer") {
      const matItem = window.inventory.find(
        (s) =>
          s?.isMaterial && s.materialSlotIndex === selectedMaterialSlotTorestos,
      );
      if (!matItem) return;

      const existingStackIdx = window.inventory.findIndex(
        (s) =>
          s &&
          !s.isMaterial &&
          !s.isUpgradeItem &&
          s.type === matItem.type &&
          ITEM_CONFIG[s.type]?.stackable,
      );

      if (existingStackIdx !== -1) {
        window.inventory[existingStackIdx].quantity =
          (window.inventory[existingStackIdx].quantity || 1) + qty;
      } else {
        const freeIdx = window.inventory.findIndex((s) => !s);
        if (freeIdx === -1) {
          showNotification("Инвентарь переполнен!", "#ff4444");
          form.style.display = "none";
          return;
        }
        window.inventory[freeIdx] = {
          ...matItem,
          quantity: qty,
          isMaterial: false,
          materialSlotIndex: undefined,
        };
      }

      if (qty >= (matItem.quantity || 1)) {
        const idx = window.inventory.indexOf(matItem);
        if (idx !== -1) window.inventory[idx] = null;
      } else {
        matItem.quantity = (matItem.quantity || 1) - qty;
      }

      renderTorestosUpgradeUI();
    }

    form.style.display = "none";
    window.inventorySystem?.updateInventoryDisplay();
  };

  const cancelHandler = () => {
    form.style.display = "none";
  };

  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));

  document.getElementById("torestosConfirmMoveBtn").onclick = confirmHandler;
  document.getElementById("torestosCancelMoveBtn").onclick = cancelHandler;
}

function closeDialog() {
  if (!isDialogOpen) return;
  isDialogOpen = false;
  document.body.classList.remove("npc-dialog-active");

  if (dialogElement) {
    dialogElement.remove();
    dialogElement = null;
    selectedPlayerSlot = null;
    selectedMaterialSlotTorestos = null;
    originalUpgradeItemSlotIndex = null;
  }

  if (backupInventoryBeforeUpgrade) {
    window.inventory = backupInventoryBeforeUpgrade.map((slot) =>
      slot ? { ...slot } : null,
    );
    window.selectedSlot = backupSelectedSlot;
    window.inventorySystem?.updateInventoryDisplay();
  }

  backupInventoryBeforeUpgrade = null;
  backupSelectedSlot = null;
}

// ─────────────────────────────────────────────
// Остальные функции без изменений
// ─────────────────────────────────────────────

function createButtons() {
  if (buttonsContainer) return;
  buttonsContainer = document.createElement("div");
  buttonsContainer.className = "torestos-buttons-container";

  const btns = [
    { text: "ГОВОРИТЬ", cls: "torestos-talk-btn", section: "talk" },
    { text: "УЛУЧШИТЬ", cls: "torestos-upgrade-btn", section: "upgrade" },
    {
      text: "КОЛЛЕКЦИЯ",
      cls: "torestos-collection-btn",
      section: "collection",
    },
  ];

  btns.forEach((b) => {
    const btn = document.createElement("div");
    btn.className = `torestos-button ${b.cls}`;
    btn.textContent = b.text;
    btn.onclick = (e) => {
      e.stopPropagation();
      openTorestosDialog(b.section);
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
  if (window.worldSystem?.currentWorldId !== TORESTOS.worldId) return;

  deltaTime = Math.min(deltaTime, MAX_DELTA);

  const camera = window.movementSystem.getCamera();
  const screenX = TORESTOS.x - camera.x;
  const screenY = TORESTOS.y - camera.y;

  let sx = 0,
    sy = 0;

  if (isNear) {
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
  if (!me || me.health <= 0 || me.worldId !== TORESTOS.worldId) {
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
    if (isMet) createButtons();
    else openGreeting();
  } else if (!nowNear && isNear) {
    isNear = false;
    removeButtonsTorestos();
    closeDialog();
  }
}

function setMet(met) {
  isMet = met;
  if (isNear) {
    if (met) createButtons();
    else removeButtonsTorestos();
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
