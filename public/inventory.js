// inventory.js
// Глобальные переменные инвентаря
let inventory = Array(20).fill(null);
let isInventoryOpen = false;
let selectedSlot = null;
let selectedPlayerId = null;
let tradeSession = null;
let tradeRequestTimeout = null;
const TRADE_REQUEST_TIMEOUT = 30000;
const pendingPickups = new Set();

// Конфигурация предметов (переносим из code.js)
const ITEM_CONFIG = {
  energy_drink: {
    effect: { energy: 20, water: 5 },
    image: new Image(),
    description: "Энергетик: +20 эн. +5 воды.",
  },
  nut: {
    effect: { food: 7 },
    image: new Image(),
    description: "Орех: +7 еды.",
  },
  water_bottle: {
    effect: { water: 30 },
    image: new Image(),
    description: "Вода: +30 воды.",
  },
  apple: {
    effect: { food: 8, water: 5 },
    image: new Image(),
    description: "Яблоко: +8 еды, +5 воды.",
    rarity: 3,
  },
  berries: {
    effect: { food: 6, water: 6 },
    image: new Image(),
    description: "Ягоды: +6 еды, +6 воды.",
    rarity: 3,
  },
  carrot: {
    effect: { food: 5, energy: 3 },
    image: new Image(),
    description: "Морковь: +5 еды, +3 энергии.",
    rarity: 3,
  },
  canned_meat: {
    effect: { food: 20 },
    image: new Image(),
    description: "Банка тушёнки: +20 еды.",
  },
  mushroom: {
    effect: { food: 5, energy: 15 },
    image: new Image(),
    description: "Гриб прущий: +15 энергии. +5 еды.",
  },
  sausage: {
    effect: { food: 16, energy: 3 },
    image: new Image(),
    description: "Колбаса: +16 еды, +3 энергии.",
  },
  blood_pack: {
    effect: { health: 40 },
    image: new Image(),
    description: "Пакет крови: +40 здоровья.",
  },
  bread: {
    effect: { food: 13, water: -2 },
    image: new Image(),
    description: "Хлеб: +13 еды, -2 воды.",
  },
  vodka_bottle: {
    effect: { health: 5, energy: -2, water: 1, food: 2 },
    image: new Image(),
    description: "Водка: +5 здоровья, -2 эн. +1 воды, +2 еды.",
  },
  meat_chunk: {
    effect: { food: 20, energy: 5, water: -2 },
    image: new Image(),
    description: "Кусок мяса: +20 еды, +5 эн. -2 воды.",
  },
  blood_syringe: {
    effect: { health: 10 },
    image: new Image(),
    description: "Шприц с кровью: +10 здоровья.",
  },
  milk: {
    effect: { water: 15, food: 5 },
    image: new Image(),
    description: "Молоко: +15 воды, +5 еды.",
  },
  condensed_milk: {
    effect: { water: 5, food: 11, energy: 2 },
    image: new Image(),
    description: "Сгущёнка: +11 еды, +5 воды, +2 эн.",
  },
  dried_fish: {
    effect: { food: 10, water: -3 },
    image: new Image(),
    description: "Сушёная рыба: +10 еды, -3 воды.",
  },
  balyary: {
    effect: {},
    image: new Image(),
    description: "Баляр: игровая валюта.",
    stackable: true,
    rarity: 2,
  },
};

// Устанавливаем пути к изображениям
ITEM_CONFIG.energy_drink.image.src = "energy_drink.png";
ITEM_CONFIG.nut.image.src = "nut.png";
ITEM_CONFIG.water_bottle.image.src = "water_bottle.png";
ITEM_CONFIG.apple.image.src = "apple.png";
ITEM_CONFIG.berries.image.src = "berry.png";
ITEM_CONFIG.carrot.image.src = "carrot.png";
ITEM_CONFIG.canned_meat.image.src = "canned_meat.png";
ITEM_CONFIG.mushroom.image.src = "mushroom.png";
ITEM_CONFIG.sausage.image.src = "sausage.png";
ITEM_CONFIG.blood_pack.image.src = "blood_pack.png";
ITEM_CONFIG.bread.image.src = "bread.png";
ITEM_CONFIG.vodka_bottle.image.src = "vodka_bottle.png";
ITEM_CONFIG.meat_chunk.image.src = "meat_chunk.png";
ITEM_CONFIG.blood_syringe.image.src = "blood_syringe.png";
ITEM_CONFIG.milk.image.src = "milk.png";
ITEM_CONFIG.condensed_milk.image.src = "condensed_milk.png";
ITEM_CONFIG.dried_fish.image.src = "dried_fish.png";
ITEM_CONFIG.balyary.image.src = "balyary.png";

// Инициализация инвентаря и UI
function initInventory(ws, myId, players) {
  const inventoryContainer = document.getElementById("inventoryContainer");
  inventoryContainer.style.display = "none";

  const inventoryGrid = document.createElement("div");
  inventoryGrid.id = "inventoryGrid";
  inventoryContainer.insertBefore(
    inventoryGrid,
    document.getElementById("inventoryActions")
  );

  for (let i = 0; i < 20; i++) {
    const slot = document.createElement("div");
    slot.className = "inventory-slot";
    inventoryGrid.appendChild(slot);
  }

  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");
  const tradeBtn = document.getElementById("tradeBtn");

  useBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (selectedSlot !== null) useItem(selectedSlot);
    else if (tradeSession && tradeSession.myItem) useItem(null);
  });

  dropBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (selectedSlot !== null) dropItem(selectedSlot);
    else dropItem(null);
  });

  tradeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!selectedPlayerId || tradeSession) return;
    const me = players.get(myId);
    if (!me || me.health <= 0) return;
    sendWhenReady(
      ws,
      JSON.stringify({ type: "tradeRequest", targetId: selectedPlayerId })
    );
    tradeBtn.disabled = true;
  });

  const inventoryBtn = document.getElementById("inventoryBtn");
  inventoryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleInventory();
  });

  const tradeContainer = document.createElement("div");
  tradeContainer.id = "tradeContainer";
  tradeContainer.style.position = "absolute";
  tradeContainer.style.top = "50%";
  tradeContainer.style.left = "50%";
  tradeContainer.style.transform = "translate(-50%, -50%)";
  tradeContainer.style.display = "none";
  tradeContainer.style.zIndex = "200";
  document.body.appendChild(tradeContainer);

  const tradeSlot = document.createElement("div");
  tradeSlot.id = "tradeSlot";
  tradeSlot.className = "inventory-slot trade-slot";
  tradeSlot.style.width = "60px";
  tradeSlot.style.height = "60px";
  tradeSlot.style.background = "rgba(0, 255, 255, 0.2)";
  tradeSlot.style.border = "2px solid #00ffff";
  tradeSlot.style.marginRight = "20px";
  tradeContainer.appendChild(tradeSlot);

  const partnerTradeSlot = document.createElement("div");
  partnerTradeSlot.id = "partnerTradeSlot";
  partnerTradeSlot.className = "inventory-slot trade-slot";
  partnerTradeSlot.style.width = "60px";
  partnerTradeSlot.style.height = "60px";
  partnerTradeSlot.style.background = "rgba(255, 0, 255, 0.2)";
  partnerTradeSlot.style.border = "2px solid #ff00ff";
  tradeContainer.appendChild(partnerTradeSlot);
}

// Функции инвентаря и обмена (переносим из code.js)
function toggleInventory() {
  if (tradeSession) cancelTrade();
  isInventoryOpen = !isInventoryOpen;
  const inventoryContainer = document.getElementById("inventoryContainer");
  inventoryContainer.style.display = isInventoryOpen ? "grid" : "none";
  document
    .getElementById("inventoryBtn")
    .classList.toggle("active", isInventoryOpen);
  if (isInventoryOpen) updateInventoryDisplay();
  if (!isInventoryOpen) {
    const screen = document.getElementById("inventoryScreen");
    screen.innerHTML = "";
    selectedSlot = null;
    const useBtn = document.getElementById("useBtn");
    const dropBtn = document.getElementById("dropBtn");
    useBtn.textContent = "Использовать";
    useBtn.disabled = true;
    dropBtn.disabled = true;
  }
}

function selectSlot(slotIndex, slotElement) {
  if (!inventory[slotIndex]) return;
  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  if (tradeSession && !tradeSession.myItem) {
    if (!inventory[slotIndex].itemId) {
      inventory[slotIndex].itemId = `${
        inventory[slotIndex].type
      }_${Date.now()}_${slotIndex}`;
    }
    for (let i = 0; i < inventory.length; i++) {
      if (
        i !== slotIndex &&
        inventory[i] &&
        inventory[i].itemId === inventory[slotIndex].itemId
      ) {
        inventory[i] = null;
      }
    }
    tradeSession.myItem = { ...inventory[slotIndex], slotIndex };
    inventory[slotIndex] = null;
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "tradeItemPlaced",
        targetId: tradeSession.partnerId,
        item: tradeSession.myItem,
      })
    );
    updateTradeInventory();
    selectedSlot = null;
    screen.innerHTML = "";
    useBtn.textContent = "Обмен";
    useBtn.disabled = tradeSession.myConfirmed;
    dropBtn.textContent = "Отмена";
    dropBtn.disabled = false;
  } else {
    if (selectedSlot === slotIndex) {
      selectedSlot = null;
      screen.innerHTML = "";
      useBtn.textContent = tradeSession ? "Обмен" : "Использовать";
      useBtn.disabled = true;
      dropBtn.disabled = tradeSession ? false : true;
      return;
    }
    selectedSlot = slotIndex;
    screen.textContent = ITEM_CONFIG[inventory[slotIndex].type].description;
    useBtn.textContent = tradeSession ? "Обмен" : "Использовать";
    useBtn.disabled = inventory[slotIndex].type === "balyary" && !tradeSession;
    dropBtn.disabled = tradeSession ? false : true;
  }
}

function useItem(slotIndex) {
  if (tradeSession) {
    if (!tradeSession.myConfirmed) {
      tradeSession.myConfirmed = true;
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "tradeConfirmed",
          targetId: tradeSession.partnerId,
        })
      );
      document.getElementById("useBtn").disabled = true;
    }
  } else {
    const item = inventory[slotIndex];
    if (!item || item.type === "balyary") return;
    const me = players.get(myId);
    const effect = ITEM_CONFIG[item.type].effect;
    if (effect.health)
      me.health = Math.min(100, Math.max(0, me.health + effect.health));
    if (effect.energy)
      me.energy = Math.min(100, Math.max(0, me.energy + effect.energy));
    if (effect.food)
      me.food = Math.min(100, Math.max(0, me.food + effect.food));
    if (effect.water)
      me.water = Math.min(100, Math.max(0, me.water + effect.water));
    inventory[slotIndex] = null;
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "useItem",
        slotIndex,
        health: me.health,
        energy: me.energy,
        food: me.food,
        water: me.water,
      })
    );
    selectedSlot = null;
    document.getElementById("useBtn").disabled = true;
    document.getElementById("dropBtn").disabled = true;
    document.getElementById("inventoryScreen").textContent = "";
    updateStatsDisplay();
    updateInventoryDisplay();
  }
}

function dropItem(slotIndex) {
  if (!tradeSession) {
    const item = inventory[slotIndex];
    if (!item) return;
    const me = players.get(myId);
    const screen = document.getElementById("inventoryScreen");
    const useBtn = document.getElementById("useBtn");
    const dropBtn = document.getElementById("dropBtn");

    if (item.type === "balyary") {
      screen.innerHTML = `
        <div class="balyary-drop-form">
          <p class="cyber-text">Сколько выкинуть?</p>
          <input type="number" id="balyaryAmount" class="cyber-input" min="1" max="${
            item.quantity || 1
          }" placeholder="0" value="" autofocus />
          <p id="balyaryError" class="error-text"></p>
        </div>
      `;
      const input = document.getElementById("balyaryAmount");
      const errorEl = document.getElementById("balyaryError");
      requestAnimationFrame(() => input.focus());
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^0-9]/g, "");
        if (input.value === "") input.value = "";
      });
      useBtn.textContent = "Подтвердить";
      useBtn.disabled = false;
      dropBtn.disabled = true;
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

      function confirmDrop() {
        const amount = parseInt(input.value) || 0;
        const currentQuantity = item.quantity || 1;
        if (amount <= 0) {
          errorEl.textContent = "Введи нормальное число, братишка!";
          return;
        }
        if (amount > currentQuantity) {
          errorEl.textContent = "Не хватает Баляр!";
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
          })
        );
        if (amount === currentQuantity) {
          inventory[slotIndex] = null;
        } else {
          inventory[slotIndex].quantity -= amount;
        }
        useBtn.textContent = "Использовать";
        useBtn.disabled = true;
        dropBtn.disabled = true;
        useBtn.onclick = () => useItem(slotIndex);
        selectedSlot = null;
        screen.innerHTML = "";
        updateInventoryDisplay();
      }
    } else {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "dropItem",
          slotIndex,
          x: me.x,
          y: me.y,
          quantity: 1,
        })
      );
      inventory[slotIndex] = null;
      selectedSlot = null;
      useBtn.disabled = true;
      dropBtn.disabled = true;
      screen.innerHTML = "";
      updateInventoryDisplay();
    }
  } else {
    if (tradeSession.myItem) {
      const freeSlot = inventory.findIndex((slot) => slot === null);
      if (freeSlot !== -1) {
        inventory[freeSlot] = { ...tradeSession.myItem };
        tradeSession.myItem = null;
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "tradeItemPlaced",
            targetId: tradeSession.partnerId,
            item: null,
          })
        );
        updateTradeInventory();
        selectedSlot = null;
        document.getElementById("inventoryScreen").textContent = "";
      } else {
        document.getElementById("inventoryScreen").textContent =
          "Инвентарь полон, освободите слот!";
      }
    } else {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "tradeCancelled",
          targetId: tradeSession.partnerId,
        })
      );
      tradeSession = null;
      selectedPlayerId = null;
      document.getElementById("tradeBtn").disabled = true;
      const tradeContainer = document.getElementById("tradeContainer");
      tradeContainer.style.display = "none";
      isInventoryOpen = false;
      const inventoryContainer = document.getElementById("inventoryContainer");
      inventoryContainer.style.display = "none";
      document.getElementById("inventoryBtn").classList.remove("active");
      selectedSlot = null;
      document.getElementById("inventoryScreen").innerHTML = "";
      const useBtn = document.getElementById("useBtn");
      const dropBtn = document.getElementById("dropBtn");
      useBtn.textContent = "Использовать";
      useBtn.disabled = true;
      dropBtn.textContent = "Выкинуть";
      dropBtn.disabled = true;
      updateInventoryDisplay();
    }
  }
}

function updateInventoryDisplay() {
  if (!isInventoryOpen) return;
  const inventoryGrid = document.getElementById("inventoryGrid");
  const slots = inventoryGrid.children;
  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  const isBalyaryFormActive =
    selectedSlot !== null &&
    inventory[selectedSlot] &&
    inventory[selectedSlot].type === "balyary" &&
    screen.querySelector(".balyary-drop-form");

  if (isBalyaryFormActive) {
  } else if (selectedSlot === null) {
    screen.innerHTML = "";
  } else if (inventory[selectedSlot]) {
    screen.textContent = ITEM_CONFIG[inventory[selectedSlot].type].description;
  }

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    slot.innerHTML = "";
    if (inventory[i]) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[inventory[i].type].image.src;
      img.style.width = "100%";
      img.style.height = "100%";
      slot.appendChild(img);

      if (inventory[i].type === "balyary" && inventory[i].quantity > 1) {
        const quantityEl = document.createElement("div");
        quantityEl.textContent = inventory[i].quantity;
        quantityEl.style.position = "absolute";
        quantityEl.style.top = "0";
        quantityEl.style.right = "0";
        quantityEl.style.color = "#00ffff";
        quantityEl.style.fontSize = "14px";
        quantityEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
        slot.appendChild(quantityEl);
      }

      slot.onmouseover = () => {
        if (inventory[i] && selectedSlot !== i) {
          if (
            inventory[selectedSlot] &&
            inventory[selectedSlot].type === "balyary" &&
            screen.querySelector(".balyary-drop-form")
          ) {
            return;
          }
          screen.textContent = ITEM_CONFIG[inventory[i].type].description;
        }
      };
      slot.onmouseout = () => {
        if (
          selectedSlot === null ||
          (inventory[selectedSlot] &&
            inventory[selectedSlot].type === "balyary" &&
            screen.querySelector(".balyary-drop-form"))
        ) {
          return;
        }
        screen.textContent =
          inventory[selectedSlot] && selectedSlot !== null
            ? ITEM_CONFIG[inventory[selectedSlot].type].description
            : "";
      };
      slot.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectSlot(i, slot);
      };
      img.style.pointerEvents = "none";
    } else {
      slot.onmouseover = null;
      slot.onmouseout = null;
      slot.onclick = null;
    }
  }
}

function showTradeRequest(fromId) {
  const tradeRequestDiv = document.createElement("div");
  tradeRequestDiv.id = "tradeRequest";
  tradeRequestDiv.style.position = "absolute";
  tradeRequestDiv.style.top = "50%";
  tradeRequestDiv.style.left = "50%";
  tradeRequestDiv.style.transform = "translate(-50%, -50%)";
  tradeRequestDiv.style.background = "rgba(26, 26, 26, 0.9)";
  tradeRequestDiv.style.border = "2px solid #00ffff";
  tradeRequestDiv.style.borderRadius = "10px";
  tradeRequestDiv.style.padding = "20px";
  tradeRequestDiv.style.color = "#00ffff";
  tradeRequestDiv.style.fontFamily = '"Courier New", monospace';
  tradeRequestDiv.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
  tradeRequestDiv.style.zIndex = "200";
  tradeRequestDiv.innerHTML = `
    <p>Пользователь ${fromId} предлагает обмен</p>
    <div style="display: flex; justify-content: center; gap: 10px; margin-top: 10px;">
      <button id="acceptTradeBtn" class="action-btn use-btn">Да</button>
      <button id="declineTradeBtn" class="action-btn drop-btn">Нет</button>
    </div>
  `;
  document.body.appendChild(tradeRequestDiv);

  document.getElementById("acceptTradeBtn").addEventListener("click", () => {
    sendWhenReady(
      ws,
      JSON.stringify({ type: "tradeAccepted", targetId: fromId })
    );
    tradeSession = {
      partnerId: fromId,
      myItem: null,
      partnerItem: null,
      myConfirmed: false,
      partnerConfirmed: false,
    };
    openTradeInventory();
    tradeRequestDiv.remove();
    clearTimeout(tradeRequestTimeout);
  });

  document.getElementById("declineTradeBtn").addEventListener("click", () => {
    sendWhenReady(
      ws,
      JSON.stringify({ type: "tradeDeclined", targetId: fromId })
    );
    tradeRequestDiv.remove();
    clearTimeout(tradeRequestTimeout);
  });

  tradeRequestTimeout = setTimeout(() => {
    sendWhenReady(
      ws,
      JSON.stringify({ type: "tradeDeclined", targetId: fromId })
    );
    tradeRequestDiv.remove();
  }, TRADE_REQUEST_TIMEOUT);
}

function openTradeInventory() {
  isInventoryOpen = true;
  const inventoryContainer = document.getElementById("inventoryContainer");
  inventoryContainer.style.display = "grid";
  document.getElementById("inventoryBtn").classList.add("active");
  const tradeContainer = document.getElementById("tradeContainer");
  tradeContainer.style.display = "flex";
  selectedSlot = null;
  document.getElementById("inventoryScreen").innerHTML = "";
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");
  useBtn.textContent = "Обмен";
  useBtn.disabled = true;
  dropBtn.textContent = "Отмена";
  dropBtn.disabled = false;
  updateTradeInventory();
}

function updateTradeInventory() {
  if (!tradeSession) return;
  const tradeSlot = document.getElementById("tradeSlot");
  const partnerTradeSlot = document.getElementById("partnerTradeSlot");
  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  tradeSlot.innerHTML = "";
  partnerTradeSlot.innerHTML = "";

  if (tradeSession.myItem) {
    const img = document.createElement("img");
    img.src = ITEM_CONFIG[tradeSession.myItem.type].image.src;
    img.style.width = "100%";
    img.style.height = "100%";
    tradeSlot.appendChild(img);
    if (
      tradeSession.myItem.type === "balyary" &&
      tradeSession.myItem.quantity > 1
    ) {
      const quantityEl = document.createElement("div");
      quantityEl.className = "quantity";
      quantityEl.textContent = tradeSession.myItem.quantity;
      tradeSlot.appendChild(quantityEl);
    }
    tradeSlot.onmouseover = () => {
      screen.textContent = ITEM_CONFIG[tradeSession.myItem.type].description;
    };
    tradeSlot.onmouseout = () => {
      screen.textContent = "";
    };
  } else {
    tradeSlot.onmouseover = null;
    tradeSlot.onmouseout = null;
  }

  if (tradeSession.partnerItem) {
    const img = document.createElement("img");
    img.src = ITEM_CONFIG[tradeSession.partnerItem.type].image.src;
    img.style.width = "100%";
    img.style.height = "100%";
    partnerTradeSlot.appendChild(img);
    if (
      tradeSession.partnerItem.type === "balyary" &&
      tradeSession.partnerItem.quantity > 1
    ) {
      const quantityEl = document.createElement("div");
      quantityEl.className = "quantity";
      quantityEl.textContent = tradeSession.partnerItem.quantity;
      partnerTradeSlot.appendChild(quantityEl);
    }
    partnerTradeSlot.onmouseover = () => {
      screen.textContent =
        ITEM_CONFIG[tradeSession.partnerItem.type].description;
    };
    partnerTradeSlot.onmouseout = () => {
      screen.textContent = "";
    };
  } else {
    partnerTradeSlot.onmouseover = null;
    partnerTradeSlot.onmouseout = null;
  }

  useBtn.textContent = "Обмен";
  useBtn.disabled =
    !tradeSession.myItem ||
    tradeSession.myConfirmed ||
    !tradeSession.partnerItem;
  dropBtn.textContent = "Отмена";
  dropBtn.disabled = false;
  updateInventoryDisplay();
}

function finalizeTrade() {
  if (!tradeSession) return;
  if (tradeSession.partnerItem) {
    for (let i = 0; i < inventory.length; i++) {
      if (
        inventory[i] &&
        (inventory[i].itemId === tradeSession.partnerItem.itemId ||
          (inventory[i].type === tradeSession.partnerItem.type &&
            !ITEM_CONFIG[inventory[i].type].stackable))
      ) {
        inventory[i] = null;
      }
    }
    const freeSlot = inventory.findIndex((slot) => slot === null);
    if (freeSlot !== -1) {
      inventory[freeSlot] = { ...tradeSession.partnerItem };
    } else {
      document.getElementById("inventoryScreen").textContent =
        "Инвентарь полон, освободите слот!";
    }
  }
  tradeSession.myItem = null;
  tradeSession.partnerItem = null;
  tradeSession.myConfirmed = false;
  tradeSession.partnerConfirmed = false;
  const tradeContainer = document.getElementById("tradeContainer");
  tradeContainer.style.display = "none";
  const tradeSlot = document.getElementById("tradeSlot");
  const partnerTradeSlot = document.getElementById("partnerTradeSlot");
  tradeSlot.innerHTML = "";
  partnerTradeSlot.innerHTML = "";
  if (isInventoryOpen) {
    isInventoryOpen = false;
    const inventoryContainer = document.getElementById("inventoryContainer");
    inventoryContainer.style.display = "none";
    document.getElementById("inventoryBtn").classList.remove("active");
  }
  selectedSlot = null;
  document.getElementById("inventoryScreen").innerHTML = "";
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");
  useBtn.textContent = "Использовать";
  useBtn.disabled = true;
  dropBtn.textContent = "Выкинуть";
  dropBtn.disabled = true;
  selectedPlayerId = null;
  document.getElementById("tradeBtn").disabled = true;
  tradeSession = null;
  updateInventoryDisplay();
}

function cancelTrade() {
  if (tradeSession) {
    if (tradeSession.myItem) {
      if (
        !inventory.some(
          (slot) => slot && slot.itemId === tradeSession.myItem.itemId
        )
      ) {
        const freeSlot = inventory.findIndex((slot) => slot === null);
        if (freeSlot !== -1) {
          inventory[freeSlot] = { ...tradeSession.myItem };
        } else {
          document.getElementById("inventoryScreen").textContent =
            "Инвентарь полон, освободите слот!";
        }
      }
    }
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "tradeCancelled",
        targetId: tradeSession.partnerId,
      })
    );
  }
  const tradeContainer = document.getElementById("tradeContainer");
  tradeContainer.style.display = "none";
  const tradeSlot = document.getElementById("tradeSlot");
  const partnerTradeSlot = document.getElementById("partnerTradeSlot");
  tradeSlot.innerHTML = "";
  partnerTradeSlot.innerHTML = "";
  if (isInventoryOpen) {
    isInventoryOpen = false;
    const inventoryContainer = document.getElementById("inventoryContainer");
    inventoryContainer.style.display = "none";
    document.getElementById("inventoryBtn").classList.remove("active");
  }
  tradeSession = null;
  selectedPlayerId = null;
  document.getElementById("tradeBtn").disabled = true;
  selectedSlot = null;
  document.getElementById("inventoryScreen").innerHTML = "";
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");
  useBtn.textContent = "Использовать";
  useBtn.disabled = true;
  dropBtn.textContent = "Выкинуть";
  dropBtn.disabled = true;
  updateInventoryDisplay();
}

// Обработка WebSocket-сообщений для инвентаря и обмена
function handleInventoryMessages(data, ws, myId, players, items) {
  switch (data.type) {
    case "syncItems":
      items.clear();
      data.items.forEach((item) =>
        items.set(item.itemId, {
          x: item.x,
          y: item.y,
          type: item.type,
          spawnTime: item.spawnTime,
        })
      );
      data.items.forEach((item) => {
        if (pendingPickups.has(item.itemId)) {
          pendingPickups.delete(item.itemId);
        }
      });
      break;
    case "itemPicked":
      items.delete(data.itemId);
      pendingPickups.delete(data.itemId);
      if (data.playerId === myId && data.item) {
        if (data.item.type === "balyary") {
          const balyarySlot = inventory.findIndex(
            (slot) => slot && slot.type === "balyary"
          );
          if (balyarySlot !== -1) {
            inventory[balyarySlot].quantity =
              (inventory[balyarySlot].quantity || 1) + 1;
          } else {
            const freeSlot = inventory.findIndex((slot) => slot === null);
            if (freeSlot !== -1) {
              inventory[freeSlot] = {
                type: "balyary",
                quantity: 1,
                itemId:
                  data.itemId || `${data.item.type}_${Date.now()}_${freeSlot}`,
              };
            }
          }
        } else {
          const freeSlot = inventory.findIndex((slot) => slot === null);
          if (freeSlot !== -1) {
            inventory[freeSlot] = {
              type: data.item.type,
              itemId:
                data.item.itemId ||
                `${data.item.type}_${Date.now()}_${freeSlot}`,
            };
          }
        }
        updateInventoryDisplay();
      }
      break;
    case "itemNotFound":
      items.delete(data.itemId);
      pendingPickups.delete(data.itemId);
      break;
    case "inventoryFull":
      pendingPickups.delete(data.itemId);
      break;
    case "update":
      if (data.player.id === myId) {
        inventory = data.player.inventory || inventory;
        updateInventoryDisplay();
      }
      break;
    case "itemDropped":
      items.set(data.itemId, {
        x: data.x,
        y: data.y,
        type: data.type,
        spawnTime: data.spawnTime,
      });
      updateInventoryDisplay();
      break;
    case "tradeCompleted":
      if (tradeSession && tradeSession.partnerId === data.partnerId) {
        finalizeTrade();
      }
      break;
    case "tradeRequest":
      showTradeRequest(data.fromId);
      break;
    case "tradeDeclined":
      if (data.fromId === selectedPlayerId) {
        document.getElementById("tradeBtn").disabled = false;
        selectedPlayerId = null;
      }
      break;
    case "tradeAccepted":
      if (data.fromId === selectedPlayerId) {
        tradeSession = {
          partnerId: data.fromId,
          myItem: null,
          partnerItem: null,
          myConfirmed: false,
          partnerConfirmed: false,
        };
        openTradeInventory();
        document.getElementById("tradeBtn").disabled = true;
      }
      break;
    case "tradeItemPlaced":
      if (tradeSession && tradeSession.partnerId === data.fromId) {
        tradeSession.partnerItem = data.item;
        updateTradeInventory();
      }
      break;
    case "tradeConfirmed":
      if (tradeSession && tradeSession.partnerId === data.fromId) {
        tradeSession.partnerConfirmed = true;
        const useBtn = document.getElementById("useBtn");
        const dropBtn = document.getElementById("dropBtn");
        useBtn.textContent = "Обмен";
        useBtn.disabled = tradeSession.myConfirmed;
        dropBtn.textContent = "Отмена";
        dropBtn.disabled = false;
        updateTradeInventory();
        if (tradeSession.myConfirmed) finalizeTrade();
      }
      break;
    case "tradeCancelled":
      if (tradeSession && tradeSession.partnerId === data.fromId) {
        cancelTrade();
      }
      break;
  }
}

// Экспортируем необходимые функции и переменные
export {
  inventory,
  isInventoryOpen,
  selectedSlot,
  selectedPlayerId,
  tradeSession,
  pendingPickups,
  ITEM_CONFIG,
  initInventory,
  toggleInventory,
  selectSlot,
  useItem,
  dropItem,
  updateInventoryDisplay,
  showTradeRequest,
  openTradeInventory,
  updateTradeInventory,
  finalizeTrade,
  cancelTrade,
  handleInventoryMessages,
};
