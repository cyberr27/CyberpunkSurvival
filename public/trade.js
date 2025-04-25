let tradeWindow = null;
let tradeDialog = null;
let isTradeWindowOpen = false;
let selectedPlayerId = null; // Хранит ID выбранного игрока для торговли
let tradeState = {
  initiatorId: null,
  targetId: null,
  playerAItem: null,
  playerBItem: null,
  playerAConfirmed: false,
  playerBConfirmed: false,
};
let tradeTimeout = null;

const TRADE_TIMEOUT = 30 * 1000; // 30 секунд

function initializeTrade() {
  createTradeDialog();
  createTradeWindow();
}

function createTradeDialog() {
  tradeDialog = document.createElement("div");
  tradeDialog.id = "tradeDialog";
  tradeDialog.className = "trade-dialog";
  tradeDialog.innerHTML = `
    <div class="trade-dialog-content">
      <p class="cyber-text" id="tradeMessage"></p>
      <p class="cyber-text" id="tradeTimer"></p>
      <div class="trade-dialog-buttons">
        <button id="acceptTradeBtn" class="action-btn use-btn">Принять</button>
        <button id="declineTradeBtn" class="action-btn drop-btn">Отклонить</button>
      </div>
    </div>
  `;
  document.body.appendChild(tradeDialog);

  document.getElementById("acceptTradeBtn").addEventListener("click", () => {
    sendTradeMessage({
      type: "acceptTrade",
      initiatorId: tradeState.initiatorId,
    });
    tradeDialog.style.display = "none";
    clearTradeTimeout();
  });

  document.getElementById("declineTradeBtn").addEventListener("click", () => {
    sendTradeMessage({ type: "cancelTrade", playerId: players.get(myId).id });
    tradeDialog.style.display = "none";
    clearTradeTimeout();
  });
}

function createTradeWindow() {
  tradeWindow = document.createElement("div");
  tradeWindow.id = "tradeWindow";
  tradeWindow.className = "trade-window";
  tradeWindow.innerHTML = `
    <div class="trade-section">
      <p class="cyber-text" id="playerAName"></p>
      <div class="trade-slot" id="playerASlot"></div>
    </div>
    <div class="trade-section">
      <p class="cyber-text" id="playerBName"></p>
      <div class="trade-slot" id="playerBSlot"></div>
    </div>
    <div class="trade-buttons">
      <button id="confirmTradeBtn" class="action-btn use-btn" disabled>Подтвердить</button>
      <button id="cancelTradeBtn" class="action-btn drop-btn">Отмена</button>
    </div>
  `;
  document.body.appendChild(tradeWindow);

  document.getElementById("cancelTradeBtn").addEventListener("click", () => {
    cancelTrade();
  });

  document.getElementById("confirmTradeBtn").addEventListener("click", () => {
    sendTradeMessage({
      type: "confirmTrade",
      initiatorId: tradeState.initiatorId,
      targetId: tradeState.targetId,
      tradeSlots: {
        playerA: tradeState.playerAItem,
        playerB: tradeState.playerBItem,
      },
    });
  });
}

function selectPlayer(playerId, clickX, clickY) {
  const me = players.get(myId);
  const target = players.get(playerId);
  if (!me || !target || me.health <= 0 || target.health <= 0) return;

  const dx = me.x - target.x;
  const dy = me.y - target.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > 1000) {
    console.log("Игрок слишком далеко для торговли");
    return;
  }

  selectedPlayerId = playerId;
  // Активируем кнопку "Trade"
  const tradeBtn = document.getElementById("tradeBtn");
  tradeBtn.disabled = false;
  tradeBtn.classList.add("active");
  // Добавляем визуальную подсветку выбранного игрока
  highlightSelectedPlayer(playerId);
}

function highlightSelectedPlayer(playerId) {
  // Сбрасываем подсветку для предыдущего выбранного игрока
  players.forEach((player) => {
    player.isSelected = false;
  });
  // Устанавливаем подсветку для нового выбранного игрока
  const target = players.get(playerId);
  if (target) {
    target.isSelected = true;
  }
}

function clearSelection() {
  if (selectedPlayerId) {
    // Сбрасываем подсветку
    const target = players.get(selectedPlayerId);
    if (target) {
      target.isSelected = false;
    }
    // Деактивируем кнопку "Trade"
    const tradeBtn = document.getElementById("tradeBtn");
    tradeBtn.disabled = true;
    tradeBtn.classList.remove("active");
  }
  selectedPlayerId = null;
}

function initiateTrade() {
  if (!selectedPlayerId) return;
  const me = players.get(myId);
  const target = players.get(selectedPlayerId);
  if (!me || !target || me.health <= 0 || target.health <= 0) return;

  const dx = me.x - target.x;
  const dy = me.y - target.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > 1000) {
    console.log("Игрок слишком далеко для торговли");
    return;
  }

  tradeState.initiatorId = myId;
  tradeState.targetId = selectedPlayerId;
  sendTradeMessage({ type: "initiateTrade", targetId: selectedPlayerId });
}

function sendTradeMessage(message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function handleTradeMessage(data) {
  switch (data.type) {
    case "tradeRequest":
      if (players.get(myId).id === data.initiatorId) return;
      showTradeRequest(data.initiatorId);
      break;
    case "tradeAccepted":
      if (
        players.get(myId).id === data.initiatorId ||
        players.get(myId).id === data.playerId
      ) {
        // Открываем окно торговли и инвентарь
        openTradeWindow(data.initiatorId, data.playerId);
        // Если инвентарь не открыт, открываем его
        if (!isInventoryOpen) {
          toggleInventory();
        }
        // Сбрасываем состояние кнопок инвентаря
        resetInventoryButtons();
      }
      break;
    case "tradeCancelled":
      if (
        players.get(myId).id === tradeState.initiatorId ||
        players.get(myId).id === tradeState.targetId
      ) {
        closeTradeWindow();
        clearTradeTimeout();
      }
      break;
    case "tradeItemPlaced":
      if (
        players.get(myId).id === tradeState.initiatorId ||
        players.get(myId).id === tradeState.targetId
      ) {
        updateTradeSlot(data.playerId, data.item);
      }
      break;
    case "tradeItemCancelled":
      if (
        players.get(myId).id === tradeState.initiatorId ||
        players.get(myId).id === tradeState.targetId
      ) {
        updateTradeSlot(data.playerId, null);
      }
      break;
    case "tradeCompleted":
      if (
        players.get(myId).id === tradeState.initiatorId ||
        players.get(myId).id === tradeState.targetId
      ) {
        inventory = data.inventory;
        updateInventoryDisplay();
        closeTradeWindow();
      }
      break;
  }
}

function showTradeRequest(initiatorId) {
  const initiator = players.get(initiatorId);
  if (!initiator) return;

  tradeState.initiatorId = initiatorId;
  tradeState.targetId = myId;
  document.getElementById(
    "tradeMessage"
  ).textContent = `Игрок ${initiatorId} предлагает обмен`;
  tradeDialog.style.display = "flex";

  let timeLeft = TRADE_TIMEOUT / 1000;
  document.getElementById(
    "tradeTimer"
  ).textContent = `Осталось: ${timeLeft} сек`;
  tradeTimeout = setInterval(() => {
    timeLeft--;
    document.getElementById(
      "tradeTimer"
    ).textContent = `Осталось: ${timeLeft} сек`;
    if (timeLeft <= 0) {
      clearTradeTimeout();
      tradeDialog.style.display = "none";
      sendTradeMessage({ type: "cancelTrade", playerId: myId });
    }
  }, 1000);
}

function clearTradeTimeout() {
  if (tradeTimeout) {
    clearInterval(tradeTimeout);
    tradeTimeout = null;
  }
}

function resetInventoryButtons() {
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");
  const screen = document.getElementById("inventoryScreen");
  selectedSlot = null;
  useBtn.textContent = "Использовать";
  useBtn.disabled = true;
  dropBtn.disabled = true;
  screen.innerHTML = "";
}

function showBalyaryTradeForm(slotIndex, playerId) {
  const item = inventory[slotIndex];
  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  // Создаём форму ввода количества
  screen.innerHTML = `
    <div class="balyary-trade-form">
      <p class="cyber-text">Сколько положить?</p>
      <input type="number" id="balyaryTradeAmount" class="cyber-input" min="1" max="${
        item.quantity || 1
      }" placeholder="0" value="" autofocus />
      <p id="balyaryTradeError" class="error-text"></p>
    </div>
  `;

  const input = document.getElementById("balyaryTradeAmount");
  const errorEl = document.getElementById("balyaryTradeError");

  // Фокусируемся на поле ввода
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });

  // Ограничиваем ввод только цифрами
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9]/g, "");
    if (input.value === "") input.value = "";
  });

  // Меняем текст кнопки "Использовать" на "Подтвердить"
  useBtn.textContent = "Подтвердить";
  useBtn.disabled = false;
  dropBtn.disabled = true;

  // Обработчик подтверждения
  const confirmTrade = () => {
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

    // Отправляем сообщение на сервер
    sendTradeMessage({
      type: "placeTradeItem",
      playerId: playerId,
      initiatorId: tradeState.initiatorId,
      slotIndex: slotIndex,
      item: { type: item.type, itemId: item.itemId, quantity: amount },
    });

    // Сбрасываем форму и кнопки
    useBtn.textContent = "Использовать";
    useBtn.disabled = true;
    dropBtn.disabled = true;
    screen.innerHTML = "";
    selectedSlot = null;
    updateInventoryDisplay();
  };

  // Подтверждение по Enter
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmTrade();
    }
  });

  // Подтверждение по клику на кнопку
  useBtn.onclick = (e) => {
    e.preventDefault();
    confirmTrade();
  };
}

function openTradeWindow(initiatorId, targetId) {
  tradeState.initiatorId = initiatorId;
  tradeState.targetId = targetId;
  document.getElementById("playerAName").textContent = initiatorId;
  document.getElementById("playerBName").textContent = targetId;
  tradeWindow.style.display = "flex";
  isTradeWindowOpen = true;
  updateTradeSlot(initiatorId, null);
  updateTradeSlot(targetId, null);
}

function closeTradeWindow() {
  tradeWindow.style.display = "none";
  isTradeWindowOpen = false;
  tradeState = {
    initiatorId: null,
    targetId: null,
    playerAItem: null,
    playerBItem: null,
    playerAConfirmed: false,
    playerBConfirmed: false,
  };
  document.getElementById("confirmTradeBtn").disabled = true;
  clearTradeTimeout();
  // Сбрасываем состояние кнопок инвентаря
  resetInventoryButtons();
  // Закрываем инвентарь только если он был открыт
  if (isInventoryOpen) {
    toggleInventory();
  }
  // Сбрасываем выбор игрока
  clearSelection();
}

function updateTradeSlot(playerId, item) {
  const isInitiator = playerId === tradeState.initiatorId;
  const slotId = isInitiator ? "playerASlot" : "playerBSlot";
  const slot = document.getElementById(slotId);
  slot.innerHTML = "";

  if (item) {
    const img = document.createElement("img");
    img.src = ITEM_CONFIG[item.type].image.src;
    img.style.width = "100%";
    img.style.height = "100%";
    slot.appendChild(img);

    if (item.type === "balyary" && item.quantity > 1) {
      const quantityEl = document.createElement("div");
      quantityEl.textContent = item.quantity;
      quantityEl.style.position = "absolute";
      quantityEl.style.top = "0";
      quantityEl.style.right = "0";
      quantityEl.style.color = "#00ffff";
      quantityEl.style.fontSize = "14px";
      quantityEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
      slot.appendChild(quantityEl);
    }
  }

  if (isInitiator) {
    tradeState.playerAItem = item;
  } else {
    tradeState.playerBItem = item;
  }

  const confirmBtn = document.getElementById("confirmTradeBtn");
  confirmBtn.disabled = !(tradeState.playerAItem || tradeState.playerBItem);
}

function placeItemInTradeSlot(slotIndex) {
  const item = inventory[slotIndex];
  if (!item) return;

  const playerId = players.get(myId).id;

  if (item.type === "balyary") {
    // Показываем форму для ввода количества баляр
    showBalyaryTradeForm(slotIndex, playerId);
  } else {
    // Для остальных предметов отправляем сразу
    sendTradeMessage({
      type: "placeTradeItem",
      playerId: playerId,
      initiatorId: tradeState.initiatorId,
      slotIndex: slotIndex,
      item: { type: item.type, itemId: item.itemId },
    });
  }
}

function cancelTrade() {
  const playerId = players.get(myId).id;
  const item =
    playerId === tradeState.initiatorId
      ? tradeState.playerAItem
      : tradeState.playerBItem;

  if (item) {
    if (item.type === "balyary") {
      const balyarySlot = inventory.findIndex(
        (slot) => slot && slot.type === "balyary"
      );
      if (balyarySlot !== -1) {
        inventory[balyarySlot].quantity =
          (inventory[balyarySlot].quantity || 1) + (item.quantity || 1);
      } else {
        const freeSlot = inventory.findIndex((slot) => slot === null);
        if (freeSlot !== -1) {
          inventory[freeSlot] = {
            type: "balyary",
            quantity: item.quantity || 1,
            itemId: item.itemId,
          };
        }
      }
    } else {
      const freeSlot = inventory.findIndex((slot) => slot === null);
      if (freeSlot !== -1) {
        inventory[freeSlot] = item;
      }
    }
    updateInventoryDisplay();
  }

  sendTradeMessage({
    type: "cancelTrade",
    playerId: playerId,
  });
}

window.tradeSystem = {
  initialize: initializeTrade,
  selectPlayer: selectPlayer,
  clearSelection: clearSelection,
  initiateTrade: initiateTrade,
  handleTradeMessage: handleTradeMessage,
  placeItemInTradeSlot: placeItemInTradeSlot,
  isTradeWindowOpen: false,
};
