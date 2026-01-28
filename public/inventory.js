// inventory.js — вся логика инвентаря

// Глобальные переменные (доступны из code.js)
window.inventory = Array(20).fill(null);
let isInventoryOpen = false;
window.isInventoryOpen = false;
let selectedSlot = null;
let inventoryAtomTimer = null;

const ATOM_FRAME_DURATION_INVENTORY = 180;

// Инициализация инвентаря при старте игры
function initializeInventory() {
  const inventoryContainer = document.getElementById("inventoryContainer");
  if (!inventoryContainer) return;

  inventoryContainer.style.display = "none";

  const inventoryGrid = document.createElement("div");
  inventoryGrid.id = "inventoryGrid";
  inventoryContainer.insertBefore(
    inventoryGrid,
    document.getElementById("inventoryActions"),
  );

  // Создаём 20 слотов
  for (let i = 0; i < 20; i++) {
    const slot = document.createElement("div");
    slot.className = "inventory-slot";
    inventoryGrid.appendChild(slot);
  }

  // Кнопки действий
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  useBtn.addEventListener("click", () => {
    if (selectedSlot !== null) {
      const item = window.inventory[selectedSlot];
      if (item && ITEM_CONFIG[item.type]) {
        if (ITEM_CONFIG[item.type].type) {
          window.equipmentSystem.equipItem(selectedSlot);
        } else {
          useItem(selectedSlot);
        }
      }
    }
  });

  dropBtn.addEventListener("click", () => {
    if (selectedSlot !== null) {
      dropItem(selectedSlot);
    }
  });

  // Кнопка инвентаря
  const inventoryBtn = document.getElementById("inventoryBtn");
  inventoryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleInventory();
  });

  // Инициализируем отображение
  updateInventoryDisplay();
}

// Переключение инвентаря
function toggleInventory() {
  isInventoryOpen = !isInventoryOpen;
  window.isInventoryOpen = isInventoryOpen;

  const me = players.get(myId);
  const isMobile = window.innerWidth <= 500;

  // На мобилке закрываем экипировку, если открыта
  if (isMobile && isInventoryOpen && window.equipmentSystem?.isEquipmentOpen) {
    window.equipmentSystem.toggleEquipment();
  }

  const inventoryContainer = document.getElementById("inventoryContainer");
  inventoryContainer.style.display = isInventoryOpen ? "grid" : "none";

  const inventoryBtn = document.getElementById("inventoryBtn");
  inventoryBtn.classList.toggle("active", isInventoryOpen);

  if (isInventoryOpen) {
    // Запуск анимации атомов в инвентаре
    if (!inventoryAtomTimer) {
      inventoryAtomTimer = setInterval(() => {
        updateAtomAnimationsInInventory();
      }, ATOM_FRAME_DURATION_INVENTORY);
    }
    updateInventoryDisplay();
  } else {
    // Очистка
    if (inventoryAtomTimer) {
      clearInterval(inventoryAtomTimer);
      inventoryAtomTimer = null;
    }
    document.getElementById("inventoryScreen").innerHTML = "";
    selectedSlot = null;
    document.getElementById("useBtn").disabled = true;
    document.getElementById("dropBtn").disabled = true;
    window.atomAnimations = [];
  }
}

// Обновление анимации атомов только в инвентаре
function updateAtomAnimationsInInventory() {
  if (!window.atomAnimations) return;
  window.atomAnimations.forEach((anim) => {
    if (
      window.inventory[anim.slotIndex] &&
      window.inventory[anim.slotIndex].type === "atom"
    ) {
      anim.ctx.clearRect(0, 0, 40, 40);
      if (ITEM_CONFIG["atom"]?.image?.complete) {
        anim.ctx.drawImage(
          ITEM_CONFIG["atom"].image,
          window.atomFrame * 50,
          0,
          50,
          50,
          0,
          0,
          40,
          40,
        );
      }
    }
  });
}

// Выбор слота
function selectSlot(slotIndex, slotElement) {
  if (!window.inventory[slotIndex]) return;

  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  if (selectedSlot === slotIndex) {
    selectedSlot = null;
    screen.innerHTML = "";
    useBtn.disabled = true;
    dropBtn.disabled = true;
    return;
  }

  selectedSlot = slotIndex;
  screen.textContent =
    ITEM_CONFIG[window.inventory[slotIndex].type]?.description || "";
  useBtn.disabled = !!ITEM_CONFIG[window.inventory[slotIndex].type]?.balyary;
  dropBtn.disabled = false;
}

// Использование предмета
function useItem(slotIndex) {
  const item = window.inventory[slotIndex];
  if (!item || !ITEM_CONFIG[item.type]) return;

  const me = players.get(myId);
  if (!me) return;

  // ─── НОВОЕ: если это рецепт → показываем диалог ───
  if (item.type.startsWith("recipe_") && item.type.includes("_equipment")) {
    showRecipeDialog(item.type);
    return; // ничего больше не делаем
  } else if (window.equipmentSystem.EQUIPMENT_CONFIG[item.type]) {
    window.equipmentSystem.equipItem(slotIndex);
    selectedSlot = null;
    document.getElementById("useBtn").disabled = true;
    document.getElementById("dropBtn").disabled = true;
    document.getElementById("inventoryScreen").textContent = "";
    updateStatsDisplay();
    updateInventoryDisplay();
    return;
  }

  if (item.type === "balyary") return;

  const effect = ITEM_CONFIG[item.type].effect;
  if (effect.health)
    me.health = Math.min(me.maxStats.health, me.health + effect.health);
  if (effect.energy)
    me.energy = Math.min(me.maxStats.energy, me.energy + effect.energy);
  if (effect.food) me.food = Math.min(me.maxStats.food, me.food + effect.food);
  if (effect.water)
    me.water = Math.min(me.maxStats.water, me.water + effect.water);
  if (effect.armor)
    me.armor = Math.min(me.maxStats.armor, me.armor + effect.armor);

  if (ITEM_CONFIG[item.type].stackable) {
    if (item.quantity > 1) {
      window.inventory[slotIndex].quantity -= 1;
    } else {
      window.inventory[slotIndex] = null;
    }
  } else {
    window.inventory[slotIndex] = null;
  }

  sendWhenReady(
    ws,
    JSON.stringify({
      type: "useItem",
      slotIndex,
      stats: {
        health: me.health,
        energy: me.energy,
        food: me.food,
        water: me.water,
        armor: me.armor,
      },
      inventory: window.inventory,
    }),
  );

  selectedSlot = null;
  document.getElementById("useBtn").disabled = true;
  document.getElementById("dropBtn").disabled = true;
  document.getElementById("inventoryScreen").textContent = "";
  updateStatsDisplay();
  updateInventoryDisplay();
}

// Выброс предмета
function dropItem(slotIndex) {
  const item = window.inventory[slotIndex];
  if (!item) return;

  const me = players.get(myId);
  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  // ─── Эти две строки должны быть ПЕРЕД if ───
  const config = ITEM_CONFIG[item.type];
  const isStackable = config?.stackable === true;

  if (isStackable) {
    // Форма для всех стэкаемых (включая рецепты)
    screen.innerHTML = `
      <div class="stackable-drop-form">  
        <p class="cyber-text">Сколько выкинуть?</p>
        <input type="number" id="stackableAmount" class="cyber-input" min="1" max="${item.quantity || 1}" placeholder="0" value="" autofocus />
        <p id="stackableError" class="error-text"></p>
      </div>
    `;

    const input = document.getElementById("stackableAmount");
    const errorEl = document.getElementById("stackableError");

    // Фокус + выделение
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-9]/g, "");
    });

    useBtn.disabled = false;
    dropBtn.disabled = true;

    const confirmDrop = () => {
      const amount = parseInt(input.value) || 0;
      const currentQuantity = item.quantity || 1;

      if (amount <= 0) {
        errorEl.textContent = "Введи нормальное число, братишка!";
        return;
      }
      if (amount > currentQuantity) {
        errorEl.textContent = "Не хватает!";
        return;
      }

      sendWhenReady(
        ws,
        JSON.stringify({
          type: "dropItem",
          slotIndex,
          x: me.x,
          y: me.y,
          quantity: amount,
        }),
      );

      if (amount >= currentQuantity) {
        window.inventory[slotIndex] = null;
      } else {
        window.inventory[slotIndex].quantity = currentQuantity - amount;
      }

      useBtn.disabled = true;
      dropBtn.disabled = true;
      useBtn.onclick = () => useItem(slotIndex); // восстанавливаем оригинальный обработчик
      selectedSlot = null;
      screen.innerHTML = "";
      updateInventoryDisplay();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmDrop();
      }
    });

    useBtn.onclick = (e) => {
      e.preventDefault();
      confirmDrop();
    };
  } else {
    // Обычный (нестэкаемый) предмет
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "dropItem",
        slotIndex,
        x: me.x,
        y: me.y,
        quantity: 1,
      }),
    );

    window.inventory[slotIndex] = null;
    selectedSlot = null;
    useBtn.disabled = true;
    dropBtn.disabled = true;
    screen.innerHTML = "";
    updateInventoryDisplay();
  }
}

// Обновление отображения инвентаря
function updateInventoryDisplay() {
  const inventoryGrid = document.getElementById("inventoryGrid");
  const inventoryScreen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  if (!inventoryGrid || !inventoryScreen) return;

  const me = players.get(myId);
  if (me?.inventory) {
    window.inventory = me.inventory.map((slot) => (slot ? { ...slot } : null));
  }

  const isStackableFormActive =
    selectedSlot !== null &&
    window.inventory[selectedSlot] &&
    ITEM_CONFIG[window.inventory[selectedSlot].type]?.stackable &&
    inventoryScreen.querySelector(".balyary-drop-form");

  if (!isStackableFormActive) {
    inventoryScreen.innerHTML = "";
    if (selectedSlot !== null && window.inventory[selectedSlot]) {
      inventoryScreen.textContent =
        ITEM_CONFIG[window.inventory[selectedSlot].type]?.description || "";
    }
  }

  inventoryGrid.innerHTML = "";
  window.atomAnimations = [];

  window.inventory.forEach((item, i) => {
    const slot = document.createElement("div");
    slot.className = "inventory-slot";
    slot.dataset.index = i;
    inventoryGrid.appendChild(slot);

    if (item) {
      if (item.type === "atom") {
        const canvas = document.createElement("canvas");
        canvas.width = 40;
        canvas.height = 40;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        const ctx = canvas.getContext("2d");
        slot.appendChild(canvas);

        window.atomAnimations.push({ ctx, slotIndex: i });

        if (ITEM_CONFIG["atom"]?.image?.complete) {
          ctx.drawImage(
            ITEM_CONFIG["atom"].image,
            window.atomFrame * 50,
            0,
            50,
            50,
            0,
            0,
            40,
            40,
          );
        }

        if (item.quantity > 1) {
          const q = document.createElement("div");
          q.textContent = item.quantity;
          q.style.position = "absolute";
          q.style.top = "0";
          q.style.right = "0";
          q.style.color = "#00ffff";
          q.style.fontSize = "14px";
          q.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
          slot.appendChild(q);
        }
      } else {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[item.type]?.image?.src || "";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.pointerEvents = "none";
        slot.appendChild(img);

        if (ITEM_CONFIG[item.type]?.stackable && item.quantity > 1) {
          const q = document.createElement("div");
          q.textContent = item.quantity;
          q.style.position = "absolute";
          q.style.top = "0";
          q.style.right = "0";
          q.style.color = "#00ffff";
          q.style.fontSize = "14px";
          q.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
          slot.appendChild(q);
        }
      }

      slot.onmouseover = () => {
        if (
          window.inventory[i] &&
          selectedSlot !== i &&
          !isStackableFormActive
        ) {
          inventoryScreen.textContent =
            ITEM_CONFIG[window.inventory[i].type]?.description || "";
        }
      };

      slot.onmouseout = () => {
        if (selectedSlot === null || isStackableFormActive) return;
        inventoryScreen.textContent = window.inventory[selectedSlot]
          ? ITEM_CONFIG[window.inventory[selectedSlot].type]?.description || ""
          : "";
      };

      slot.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectSlot(i, slot);
      };
    }
  });

  if (useBtn && dropBtn) {
    useBtn.disabled = selectedSlot === null || !window.inventory[selectedSlot];
    dropBtn.disabled = selectedSlot === null || !window.inventory[selectedSlot];
  }
}

// Экспортируем функции для использования в code.js
window.inventorySystem = {
  initialize: initializeInventory,
  toggleInventory,
  updateInventoryDisplay,
  useItem,
  dropItem,
  selectSlot,
};
