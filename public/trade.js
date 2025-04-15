// trade.js
// Контейнер для окна обмена
let tradeContainer = null;
let tradeRequestContainer = null;
let isTradeWindowOpen = false;
let currentTradePartner = null;
let partnerTradeOffer = [];
let tradeAccepted = false;

// Создаём интерфейс обмена
function createTradeInterface() {
  // Контейнер для входящих запросов на обмен
  tradeRequestContainer = document.createElement("div");
  tradeRequestContainer.id = "tradeRequestContainer";
  tradeRequestContainer.style.display = "none";
  tradeRequestContainer.style.position = "fixed";
  tradeRequestContainer.style.top = "10px";
  tradeRequestContainer.style.right = "10px";
  tradeRequestContainer.style.background = "rgba(0, 0, 0, 0.8)";
  tradeRequestContainer.style.border = "2px solid #00ffff";
  tradeRequestContainer.style.padding = "10px";
  tradeRequestContainer.style.zIndex = "1000";
  tradeRequestContainer.style.color = "#ffffff";
  tradeRequestContainer.style.fontFamily = "'Courier New', monospace";
  document.body.appendChild(tradeRequestContainer);

  // Основной контейнер обмена
  tradeContainer = document.createElement("div");
  tradeContainer.id = "tradeContainer";
  tradeContainer.style.display = "none";
  tradeContainer.style.position = "fixed";
  tradeContainer.style.top = "50%";
  tradeContainer.style.left = "50%";
  tradeContainer.style.transform = "translate(-50%, -50%)";
  tradeContainer.style.width = "600px";
  tradeContainer.style.background = "rgba(0, 0, 0, 0.9)";
  tradeContainer.style.border = "2px solid #00ffff";
  tradeContainer.style.padding = "20px";
  tradeContainer.style.zIndex = "1000";
  tradeContainer.style.color = "#ffffff";
  tradeContainer.style.fontFamily = "'Courier New', monospace";
  document.body.appendChild(tradeContainer);

  tradeContainer.innerHTML = `
        <h2 style="text-align: center; color: #00ffff;">Обмен</h2>
        <div style="display: flex; justify-content: space-between;">
            <div style="width: 45%;">
                <h3 style="color: #00ff00;">Ваш инвентарь</h3>
                <div id="myInventoryGrid" style="display: grid; grid-template-columns: repeat(5, 50px); gap: 5px;"></div>
                <h3 style="color: #00ff00; margin-top: 20px;">Ваше предложение</h3>
                <div id="myTradeOffer" style="display: grid; grid-template-columns: repeat(5, 50px); gap: 5px;"></div>
            </div>
            <div style="width: 45%;">
                <h3 style="color: #ff0000;">Инвентарь партнёра</h3>
                <div id="partnerInventoryGrid" style="display: grid; grid-template-columns: repeat(5, 50px); gap: 5px;"></div>
                <h3 style="color: #ff0000; margin-top: 20px;">Предложение партнёра</h3>
                <div id="partnerTradeOffer" style="display: grid; grid-template-columns: repeat(5, 50px); gap: 5px;"></div>
            </div>
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button id="acceptTradeBtn" class="action-btn" disabled>Принять</button>
            <button id="cancelTradeBtn" class="action-btn">Отменить</button>
        </div>
        <p id="tradeStatus" style="text-align: center; color: #ffffff;"></p>
    `;

  // Стили для кнопок
  const style = document.createElement("style");
  style.textContent = `
        .action-btn {
            background: #333;
            color: #00ffff;
            border: 1px solid #00ffff;
            padding: 5px 10px;
            margin: 5px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
        }
        .action-btn:hover {
            background: #00ffff;
            color: #000;
        }
        .action-btn:disabled {
            background: #555;
            color: #888;
            border: 1px solid #888;
            cursor: not-allowed;
        }
        .trade-slot {
            width: 50px;
            height: 50px;
            border: 1px solid #00ffff;
            background: rgba(0, 0, 0, 0.5);
            position: relative;
        }
        .trade-slot img {
            width: 100%;
            height: 100%;
        }
        .trade-slot .quantity {
            position: absolute;
            top: 0;
            right: 0;
            color: #00ffff;
            font-size: 12px;
            text-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
        }
    `;
  document.head.appendChild(style);

  // Обработчики кнопок
  document.getElementById("acceptTradeBtn").addEventListener("click", () => {
    sendWhenReady(
      ws,
      JSON.stringify({ type: "acceptTrade", partnerId: currentTradePartner })
    );
    tradeAccepted = true;
    updateTradeInterface();
  });

  document.getElementById("cancelTradeBtn").addEventListener("click", () => {
    sendWhenReady(
      ws,
      JSON.stringify({ type: "cancelTrade", partnerId: currentTradePartner })
    );
    closeTradeWindow();
  });
}

// Инициализация интерфейса обмена
function initTrade() {
  createTradeInterface();

  // Обработчик клавиши для открытия запроса обмена
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "t" &&
      !isInventoryOpen &&
      chatContainer.style.display !== "flex"
    ) {
      const me = players.get(myId);
      if (!me || me.health <= 0) return;
      // Находим ближайшего игрока
      let closestPlayer = null;
      let minDistance = Infinity;
      players.forEach((player, id) => {
        if (id !== myId && player.health > 0) {
          const dx = player.x - me.x;
          const dy = player.y - me.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minDistance && distance < 100) {
            // Радиус 100 пикселей
            minDistance = distance;
            closestPlayer = id;
          }
        }
      });
      if (closestPlayer) {
        sendWhenReady(
          ws,
          JSON.stringify({ type: "requestTrade", targetId: closestPlayer })
        );
      }
    }
  });
}

// Обновление интерфейса обмена
function updateTradeInterface() {
  const myInventoryGrid = document.getElementById("myInventoryGrid");
  const myTradeOffer = document.getElementById("myTradeOffer");
  const partnerInventoryGrid = document.getElementById("partnerInventoryGrid");
  const partnerTradeOffer = document.getElementById("partnerTradeOffer");
  const tradeStatus = document.getElementById("tradeStatus");
  const acceptBtn = document.getElementById("acceptTradeBtn");

  // Мой инвентарь
  myInventoryGrid.innerHTML = "";
  inventory.forEach((item, index) => {
    const slot = document.createElement("div");
    slot.className = "trade-slot";
    if (item) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[item.type].image.src;
      slot.appendChild(img);
      if (item.type === "balyary" && item.quantity > 1) {
        const quantityEl = document.createElement("div");
        quantityEl.className = "quantity";
        quantityEl.textContent = item.quantity;
        slot.appendChild(quantityEl);
      }
      slot.onclick = () => addToTradeOffer(index);
    }
    myInventoryGrid.appendChild(slot);
  });

  // Мое предложение
  myTradeOffer.innerHTML = "";
  myTradeOfferItems.forEach((item, index) => {
    const slot = document.createElement("div");
    slot.className = "trade-slot";
    if (item) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[item.type].image.src;
      slot.appendChild(img);
      if (item.type === "balyary" && item.quantity > 1) {
        const quantityEl = document.createElement("div");
        quantityEl.className = "quantity";
        quantityEl.textContent = item.quantity;
        slot.appendChild(quantityEl);
      }
      slot.onclick = () => removeFromTradeOffer(index);
    }
    myTradeOffer.appendChild(slot);
  });

  // Инвентарь партнёра (только для отображения, без кликов)
  partnerInventoryGrid.innerHTML = "";
  const partner = players.get(currentTradePartner);
  if (partner && partner.inventory) {
    partner.inventory.forEach((item) => {
      const slot = document.createElement("div");
      slot.className = "trade-slot";
      if (item) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[item.type].image.src;
        slot.appendChild(img);
        if (item.type === "balyary" && item.quantity > 1) {
          const quantityEl = document.createElement("div");
          quantityEl.className = "quantity";
          quantityEl.textContent = item.quantity;
          slot.appendChild(quantityEl);
        }
      }
      partnerInventoryGrid.appendChild(slot);
    });
  }

  // Предложение партнёра
  partnerTradeOffer.innerHTML = "";
  partnerTradeOffer.forEach((item) => {
    const slot = document.createElement("div");
    slot.className = "trade-slot";
    if (item) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[item.type].image.src;
      slot.appendChild(img);
      if (item.type === "balyary" && item.quantity > 1) {
        const quantityEl = document.createElement("div");
        quantityEl.className = "quantity";
        quantityEl.textContent = item.quantity;
        slot.appendChild(quantityEl);
      }
    }
    partnerTradeOffer.appendChild(slot);
  });

  // Статус и кнопка принятия
  acceptBtn.disabled = !partnerTradeOffer.length || tradeAccepted;
  tradeStatus.textContent = tradeAccepted
    ? "Ожидание подтверждения партнёра..."
    : "";
}

// Добавление предмета в предложение
function addToTradeOffer(slotIndex) {
  const item = inventory[slotIndex];
  if (!item) return;

  if (item.type === "balyary") {
    // Показываем форму для ввода количества
    const screen = document.createElement("div");
    screen.innerHTML = `
            <div class="balyary-trade-form">
                <p class="cyber-text">Сколько предложить?</p>
                <input type="number" id="balyaryTradeAmount" class="cyber-input" min="1" max="${
                  item.quantity || 1
                }" placeholder="0" value="" autofocus />
                <p id="balyaryTradeError" class="error-text"></p>
                <button id="confirmBalyaryTrade" class="action-btn">Подтвердить</button>
            </div>
        `;
    tradeContainer.appendChild(screen);

    const input = screen.querySelector("#balyaryTradeAmount");
    const errorEl = screen.querySelector("#balyaryTradeError");
    const confirmBtn = screen.querySelector("#confirmBalyaryTrade");

    input.focus();
    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-9]/g, "");
      if (input.value === "") input.value = "";
    });

    confirmBtn.onclick = () => {
      const amount = parseInt(input.value) || 0;
      if (amount <= 0) {
        errorEl.textContent = "Введи нормальное число, братишка!";
        return;
      }
      if (amount > (item.quantity || 1)) {
        errorEl.textContent = "Не хватает Баляр!";
        return;
      }

      myTradeOffer.push({ type: item.type, quantity: amount, slotIndex });
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "updateTradeOffer",
          partnerId: currentTradePartner,
          offer: myTradeOffer,
        })
      );
      screen.remove();
      updateTradeInterface();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        confirmBtn.click();
      }
    });
  } else {
    myTradeOffer.push({ type: item.type, slotIndex });
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "updateTradeOffer",
        partnerId: currentTradePartner,
        offer: myTradeOffer,
      })
    );
    updateTradeInterface();
  }
}

// Удаление предмета из предложения
function removeFromTradeOffer(offerIndex) {
  myTradeOffer.splice(offerIndex, 1);
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "updateTradeOffer",
      partnerId: currentTradePartner,
      offer: myTradeOffer,
    })
  );
  updateTradeInterface();
}

// Открытие окна обмена
function openTradeWindow(partnerId) {
  isTradeWindowOpen = true;
  currentTradePartner = partnerId;
  myTradeOffer = [];
  partnerTradeOffer = [];
  tradeAccepted = false;
  tradeContainer.style.display = "block";
  updateTradeInterface();
}

// Закрытие окна обмена
function closeTradeWindow() {
  isTradeWindowOpen = false;
  currentTradePartner = null;
  myTradeOffer = [];
  partnerTradeOffer = [];
  tradeAccepted = false;
  tradeContainer.style.display = "none";
}

// Обработка входящих запросов на обмен
function showTradeRequest(requesterId) {
  tradeRequestContainer.innerHTML = `
        <p>Игрок ${requesterId} предлагает обмен</p>
        <button id="acceptRequestBtn" class="action-btn">Принять</button>
        <button id="declineRequestBtn" class="action-btn">Отклонить</button>
    `;
  tradeRequestContainer.style.display = "block";

  document.getElementById("acceptRequestBtn").onclick = () => {
    sendWhenReady(
      ws,
      JSON.stringify({ type: "acceptTradeRequest", requesterId })
    );
    tradeRequestContainer.style.display = "none";
  };

  document.getElementById("declineRequestBtn").onclick = () => {
    sendWhenReady(
      ws,
      JSON.stringify({ type: "declineTradeRequest", requesterId })
    );
    tradeRequestContainer.style.display = "none";
  };
}
