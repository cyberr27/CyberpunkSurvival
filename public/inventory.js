// inventory.js

// Загрузка изображений
const backgroundImage = new Image();
backgroundImage.src = "backgr.png";
const vegetationImage = new Image();
vegetationImage.src = "vegetation.png";
const rocksImage = new Image();
rocksImage.src = "rocks.png";
const cloudsImage = new Image();
cloudsImage.src = "clouds.png";
const playerSprite = new Image();
playerSprite.src = "playerSprite.png";
const wolfSprite = new Image();
wolfSprite.src = "wolfSprite.png";
const energyDrinkImage = new Image();
energyDrinkImage.src = "energy_drink.png";
const nutImage = new Image();
nutImage.src = "nut.png";
const waterBottleImage = new Image();
waterBottleImage.src = "water_bottle.png";
const cannedMeatImage = new Image();
cannedMeatImage.src = "canned_meat.png";
const mushroomImage = new Image();
mushroomImage.src = "mushroom.png";
const sausageImage = new Image();
sausageImage.src = "sausage.png";
const bloodPackImage = new Image();
bloodPackImage.src = "blood_pack.png";
const breadImage = new Image();
breadImage.src = "bread.png";
const vodkaBottleImage = new Image();
vodkaBottleImage.src = "vodka_bottle.png";
const meatChunkImage = new Image();
meatChunkImage.src = "meat_chunk.png";
const bloodSyringeImage = new Image();
bloodSyringeImage.src = "blood_syringe.png";
const milkImage = new Image();
milkImage.src = "milk.png";
const condensedMilkImage = new Image();
condensedMilkImage.src = "condensed_milk.png";
const driedFishImage = new Image();
driedFishImage.src = "dried_fish.png";
const balyaryImage = new Image();
balyaryImage.src = "balyary.png";
const appleImage = new Image();
appleImage.src = "apple.png";
const berriesImage = new Image();
berriesImage.src = "berry.png";
const carrotImage = new Image();
carrotImage.src = "carrot.png";
// Конфигурация предметов
const ITEM_CONFIG = {
  energy_drink: {
    effect: { energy: 20, water: 5 },
    image: energyDrinkImage,
    description: "Энергетик: +20 эн. +5 воды.",
    stackable: false,
    rarity: 2,
  },
  nut: {
    effect: { food: 7 },
    image: nutImage,
    description: "Орех: +7 еды.",
    stackable: false,
    rarity: 3,
  },
  water_bottle: {
    effect: { water: 30 },
    image: waterBottleImage,
    description: "Вода: +30 воды.",
    stackable: false,
    rarity: 3,
  },
  apple: {
    effect: { food: 8, water: 5 },
    image: appleImage,
    description: "Яблоко: +8 еды, +5 воды.",
    stackable: false,
    rarity: 3,
  },
  berries: {
    effect: { food: 6, water: 6 },
    image: berriesImage,
    description: "Ягоды: +6 еды, +6 воды.",
    stackable: false,
    rarity: 3,
  },
  carrot: {
    effect: { food: 5, energy: 3 },
    image: carrotImage,
    description: "Морковь: +5 еды, +3 энергии.",
    stackable: false,
    rarity: 3,
  },
  canned_meat: {
    effect: { food: 20 },
    image: cannedMeatImage,
    description: "Банка тушёнки: +20 еды.",
    stackable: false,
    rarity: 2,
  },
  mushroom: {
    effect: { food: 5, energy: 15 },
    image: mushroomImage,
    description: "Гриб прущий: +15 энергии. +5 еды.",
    stackable: false,
    rarity: 2,
  },
  sausage: {
    effect: { food: 16, energy: 3 },
    image: sausageImage,
    description: "Колбаса: +16 еды, +3 энергии.",
    stackable: false,
    rarity: 2,
  },
  blood_pack: {
    effect: { health: 40 },
    image: bloodPackImage,
    description: "Пакет крови: +40 здоровья.",
    stackable: false,
    rarity: 1,
  },
  bread: {
    effect: { food: 13, water: -2 },
    image: breadImage,
    description: "Хлеб: +13 еды, -2 воды.",
    stackable: false,
    rarity: 2,
  },
  vodka_bottle: {
    effect: { health: 5, energy: -2, water: 1, food: 2 },
    image: vodkaBottleImage,
    description: "Водка: +5 здоровья, -2 эн. +1 воды, +2 еды.",
    stackable: false,
    rarity: 2,
  },
  meat_chunk: {
    effect: { food: 20, energy: 5, water: -2 },
    image: meatChunkImage,
    description: "Кусок мяса: +20 еды, +5 эн. -2 воды.",
    stackable: false,
    rarity: 1,
  },
  blood_syringe: {
    effect: { health: 10 },
    image: bloodSyringeImage,
    description: "Шприц с кровью: +10 здоровья.",
    stackable: false,
    rarity: 2,
  },
  milk: {
    effect: { water: 15, food: 5 },
    image: milkImage,
    description: "Молоко: +15 воды, +5 еды.",
    stackable: false,
    rarity: 2,
  },
  condensed_milk: {
    effect: { water: 5, food: 11, energy: 2 },
    image: condensedMilkImage,
    description: "Сгущёнка: +11 еды, +5 воды, +2 эн.",
    stackable: false,
    rarity: 1,
  },
  dried_fish: {
    effect: { food: 10, water: -3 },
    image: driedFishImage,
    description: "Сушёная рыба: +10 еды, -3 воды.",
    stackable: false,
    rarity: 2,
  },
  balyary: {
    effect: {},
    image: balyaryImage,
    description: "Баляр: игровая валюта.",
    stackable: true,
    rarity: 2,
  },
};

// Инвентарь игрока
let inventory = Array(20).fill(null);
let isInventoryOpen = false;
let tooltip = null;
let selectedSlot = null;
let selectedPlayerId = null;
let tradeSession = null;
let tradeRequestTimeout = null;
const TRADE_REQUEST_TIMEOUT = 30000; // 30 секунд

// Инициализация инвентаря и торговли
function initializeInventory(ws, myId, players) {
  // Создаём контейнер для ячеек инвентаря
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

  // Создаём контейнер для ячеек обмена
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

  // Настройка кнопок
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");
  const tradeBtn = document.getElementById("tradeBtn");
  const inventoryBtn = document.getElementById("inventoryBtn");

  inventoryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleInventory();
  });

  useBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (selectedSlot !== null) {
      useItem(selectedSlot);
    } else if (tradeSession && tradeSession.myItem) {
      useItem(null);
    }
  });

  dropBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (selectedSlot !== null) {
      dropItem(selectedSlot);
    } else {
      dropItem(null);
    }
  });

  tradeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!selectedPlayerId || tradeSession) return;
    const me = players.get(myId);
    if (!me || me.health <= 0) return;
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "tradeRequest",
        targetId: selectedPlayerId,
      })
    );
    console.log(`Отправлено приглашение на обмен игроку ${selectedPlayerId}`);
    tradeBtn.disabled = true;
  });
}

// Функция для отправки данных, когда WebSocket готов
function sendWhenReady(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message);
  } else if (ws.readyState === WebSocket.CONNECTING) {
    const checkInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        clearInterval(checkInterval);
      }
    }, 100);
    setTimeout(() => clearInterval(checkInterval), 5000);
  } else {
    console.error("WebSocket не готов для отправки:", ws.readyState);
  }
}

// Переключение инвентаря
function toggleInventory() {
  if (tradeSession) {
    cancelTrade();
  }
  isInventoryOpen = !isInventoryOpen;
  const inventoryContainer = document.getElementById("inventoryContainer");
  inventoryContainer.style.display = isInventoryOpen ? "grid" : "none";
  if (isInventoryOpen) updateInventoryDisplay();
  const inventoryBtn = document.getElementById("inventoryBtn");
  inventoryBtn.classList.toggle("active", isInventoryOpen);

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

// Выбор слота
function selectSlot(slotIndex, slotElement) {
  if (!inventory[slotIndex]) return;
  console.log(
    `Выбран слот ${slotIndex}, предмет: ${inventory[slotIndex].type}, ID: ${inventory[slotIndex].itemId}`
  );
  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  if (tradeSession && !tradeSession.myItem) {
    if (!inventory[slotIndex].itemId) {
      inventory[slotIndex].itemId = `${
        inventory[slotIndex].type
      }_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    for (let i = 0; i < inventory.length; i++) {
      if (
        i !== slotIndex &&
        inventory[i] &&
        inventory[i].itemId === inventory[slotIndex].itemId
      ) {
        console.log(
          `Удалён дубликат предмета ${inventory[i].type} с itemId ${inventory[i].itemId} из слота ${i}`
        );
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

// Использование предмета
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
      console.log("Обмен подтверждён");
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

// Выброс предмета
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

      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });

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
        console.log("Предмет возвращён в инвентарь");
      } else {
        console.log("Нет свободных слотов для возврата предмета");
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
      console.log("Торговля завершена");
    }
  }
}

// Обновление характеристик
function updateStatsDisplay() {
  const me = players.get(myId);
  if (!me) return;
  const statsEl = document.getElementById("stats");
  statsEl.innerHTML = `
      <span class="health">Здоровье: ${me.health}</span><br>
      <span class="energy">Энергия: ${me.energy}</span><br>
      <span class="food">Еда: ${me.food}</span><br>
      <span class="water">Вода: ${me.water}</span><br>
      <span class="armor">Броня: ${me.armor}</span>
    `;
  document.getElementById("coords").innerHTML = `X: ${Math.floor(
    me.x
  )}<br>Y: ${Math.floor(me.y)}`;
}

// Обновление инвентаря
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
        console.log(`Клик по слоту ${i}, предмет: ${inventory[i].type}`);
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

// Показ приглашения на обмен
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
      JSON.stringify({
        type: "tradeAccepted",
        targetId: fromId,
      })
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
      JSON.stringify({
        type: "tradeDeclined",
        targetId: fromId,
      })
    );
    tradeRequestDiv.remove();
    clearTimeout(tradeRequestTimeout);
  });

  tradeRequestTimeout = setTimeout(() => {
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "tradeDeclined",
        targetId: fromId,
      })
    );
    tradeRequestDiv.remove();
  }, TRADE_REQUEST_TIMEOUT);
}

// Открытие инвентаря для торговли
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

// Обновление интерфейса торговли
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
  console.log(
    `Интерфейс обмена обновлён: мой предмет=${
      tradeSession.myItem?.type || "нет"
    }, предмет партнёра=${tradeSession.partnerItem?.type || "нет"}`
  );
}

// Завершение обмена
function finalizeTrade() {
  if (!tradeSession) return;

  if (tradeSession.partnerItem) {
    const freeSlot = inventory.findIndex((slot) => slot === null);
    if (freeSlot !== -1) {
      for (let i = 0; i < inventory.length; i++) {
        if (
          inventory[i] &&
          inventory[i].itemId === tradeSession.partnerItem.itemId
        ) {
          console.log(
            `Предмет с itemId ${tradeSession.partnerItem.itemId} уже есть в слоте ${i}, пропускаем`
          );
          return;
        }
      }
      inventory[freeSlot] = { ...tradeSession.partnerItem };
      console.log(
        `Получен предмет ${tradeSession.partnerItem.type} (ID: ${tradeSession.partnerItem.itemId}) в слот ${freeSlot}`
      );
    } else {
      console.warn("Инвентарь полон, предмет партнёра не добавлен!");
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
  console.log("Обмен успешно завершён, ячейки очищены");
}

// Отмена обмена
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
          console.log(
            `Предмет ${tradeSession.myItem.type} (ID: ${tradeSession.myItem.itemId}) возвращён в слот ${freeSlot}`
          );
        } else {
          console.warn("Инвентарь полон, предмет не возвращён!");
          document.getElementById("inventoryScreen").textContent =
            "Инвентарь полон, освободите слот!";
        }
      } else {
        console.warn(
          `Предмет с itemId ${tradeSession.myItem.itemId} уже есть в инвентаре, пропускаем возврат`
        );
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
  console.log("Обмен отменён, интерфейс и ячейки очищены");
}

// Экспортируем функции и переменные
window.inventoryModule = {
  inventory,
  isInventoryOpen,
  selectedSlot,
  selectedPlayerId,
  tradeSession,
  initializeInventory,
  toggleInventory,
  selectSlot,
  useItem,
  dropItem,
  updateStatsDisplay,
  updateInventoryDisplay,
  showTradeRequest,
  openTradeInventory,
  updateTradeInventory,
  finalizeTrade,
  cancelTrade,
};
