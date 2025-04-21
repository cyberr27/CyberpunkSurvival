// vendingMachine.js

// Загрузка изображения автомата
const vendingMachineImage = new Image();
vendingMachineImage.src = "vending_machine.png"; // Укажи путь к своему изображению

// Координаты и размеры автомата
const vendingMachine = {
  x: 1500, // Пример координат, можешь настроить
  y: 1500,
  width: 170,
  height: 100,
};

// Состояние меню
let isVendingMenuOpen = false;
let vendingMenu = null;

// Конфигурация напитков
const DRINK_CONFIG = {
  big_water: {
    name: "Большой стакан воды",
    cost: 2, // Баляры
    effect: { water: 50 },
    description: "Большой стакан воды: +50 воды",
  },
  small_water: {
    name: "Маленький стакан воды",
    cost: 1,
    effect: { water: 20 },
    description: "Маленький стакан воды: +20 воды",
  },
};

// Внешние зависимости (доступ через window для минимизации изменений)
const ctx = document.getElementById("gameCanvas").getContext("2d");
let ws, myId, players, camera;

// Инициализация автомата
function initializeVendingMachine() {
  // Получаем доступ к глобальным переменным из code.js
  ws = window.ws;
  myId = window.myId;
  players = window.players;
  camera = window.camera;

  // Стили для меню автомата
  const vendingStyles = `
    .vending-menu {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(10, 10, 10, 0.95), rgba(20, 20, 20, 0.9));
      border: 2px solid #00ffff;
      border-radius: 10px;
      padding: 20px;
      color: #00ffff;
      font-family: "Courier New", monospace;
      text-align: center;
      z-index: 1000;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.5), 0 0 30px rgba(255, 0, 255, 0.3);
      animation: neonPulse 2s infinite alternate;
    }
    .vending-title {
      color: #00ffff;
      font-size: 24px;
      text-shadow: 0 0 5px #00ffff, 0 0 10px #ff00ff;
      margin-bottom: 15px;
    }
    .vending-item {
      background: rgba(0, 0, 0, 0.85);
      padding: 12px;
      margin: 8px 0;
      cursor: pointer;
      border: 1px solid #00ffff;
      border-radius: 5px;
      color: #00ffff;
      font-size: 14px;
      text-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
      box-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
      transition: all 0.3s ease;
    }
    .vending-item:hover {
      background: rgba(0, 255, 255, 0.15);
      border-color: #ff00ff;
      box-shadow: 0 0 15px rgba(255, 0, 255, 0.7);
      transform: translateX(5px);
    }
    .vending-error {
      color: #ff00ff;
      font-size: 12px;
      margin-top: 10px;
    }
    @media (max-width: 500px) {
      .vending-menu { max-width: 90%; padding: 15px; }
      .vending-title { font-size: 20px; }
      .vending-item { font-size: 12px; padding: 10px; }
    }
  `;
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = vendingStyles;
  document.head.appendChild(styleSheet);

  // Обработчик клавиши Escape для закрытия меню
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isVendingMenuOpen) {
      closeVendingMenu();
    }
  });
}

// Отрисовка автомата
function drawVendingMachine() {
  if (!vendingMachineImage.complete) return;
  const screenX = vendingMachine.x - camera.x;
  const screenY = vendingMachine.y - camera.y;
  // Проверяем, находится ли автомат в пределах видимости
  if (
    screenX + vendingMachine.width > 0 &&
    screenX < canvas.width &&
    screenY + vendingMachine.height > 0 &&
    screenY < canvas.height
  ) {
    ctx.drawImage(
      vendingMachineImage,
      screenX,
      screenY,
      vendingMachine.width,
      vendingMachine.height
    );
  }
}

// Проверка близости к автомату
function checkVendingMachineProximity() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const dx = me.x + 20 - (vendingMachine.x + vendingMachine.width / 2);
  const dy = me.y + 20 - (vendingMachine.y + vendingMachine.height / 2);
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 50 && !isVendingMenuOpen) {
    openVendingMenu();
  } else if (distance >= 50 && isVendingMenuOpen) {
    closeVendingMenu();
  }
}

// Открытие меню автомата
function openVendingMenu() {
  isVendingMenuOpen = true;
  vendingMenu = document.createElement("div");
  vendingMenu.className = "vending-menu";
  vendingMenu.innerHTML = `
    <h2 class="vending-title">Автомат с газировкой</h2>
    <div class="vending-item" data-drink="big_water">Большой стакан воды - 2 баляра [+50 воды]</div>
    <div class="vending-item" data-drink="small_water">Маленький стакан воды - 1 баляр [+20 воды]</div>
    <p id="vendingError" class="vending-error"></p>
  `;
  document.body.appendChild(vendingMenu);

  // Обработчики выбора напитков
  vendingMenu.querySelectorAll(".vending-item").forEach((item) => {
    item.addEventListener("click", () => {
      const drinkType = item.getAttribute("data-drink");
      buyDrink(drinkType);
    });
  });
}

// Закрытие меню автомата
function closeVendingMenu() {
  if (vendingMenu) {
    vendingMenu.remove();
    vendingMenu = null;
  }
  isVendingMenuOpen = false;
}

// Покупка напитка
function buyDrink(drinkType) {
  const me = players.get(myId);
  if (!me) return;

  const drink = DRINK_CONFIG[drinkType];
  const errorEl = document.getElementById("vendingError");

  // Проверяем наличие баляров
  const balyarySlot = me.inventory.findIndex(
    (slot) =>
      slot && slot.type === "balyary" && (slot.quantity || 1) >= drink.cost
  );
  if (balyarySlot === -1) {
    errorEl.textContent = "Недостаточно баляров!";
    return;
  }

  // Отправляем запрос на сервер
  if (ws.readyState === WebSocket.OPEN) {
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "buyDrink",
        drinkType,
        slotIndex: balyarySlot,
      })
    );
  } else {
    errorEl.textContent = "Нет соединения с сервером";
  }
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

// Обработка сообщений от сервера
function handleVendingMessage(data) {
  if (data.type === "buyDrinkSuccess") {
    const me = players.get(myId);
    if (!me) return;

    me.water = Math.min(
      me.water + data.effect.water,
      levelSystem.maxStats.water
    );
    if (data.quantity === 0) {
      me.inventory[data.slotIndex] = null;
    } else {
      me.inventory[data.slotIndex].quantity = data.quantity;
    }

    closeVendingMenu();
    updateStatsDisplay();
    updateInventoryDisplay();
  } else if (data.type === "buyDrinkFail") {
    const errorEl = document.getElementById("vendingError");
    errorEl.textContent = data.message;
  }
}

// Экспортируем функции для использования в code.js
window.vendingMachineSystem = {
  initialize: initializeVendingMachine,
  draw: drawVendingMachine,
  checkProximity: checkVendingMachineProximity,
  handleMessage: handleVendingMessage,
};
