// jack.js (торговец, брат John)

// Определяем константы и переменные
const JACK = {
  x: 1550,
  y: 500,
  width: 70,
  height: 70,
  interactionRadius: 50,
  name: "Jack",
};

let isJackDialogOpen = false;
let isJackMet = false;
let jackSprite = null; // Переменная для хранения изображения Jack (спрайт)

// Новые переменные для анимации (копия из npc.js)
let jackFrame = 0; // Текущий кадр (0-39)
let jackFrameTime = 0; // Накопленное время для смены кадра
const JACK_FRAME_DURATION = 100; // мс на кадр (~10 fps)
const JACK_TOTAL_FRAMES = 40; // Количество кадров в спрайте

// Стили (копия из npc.js, но с заменой npc на jack для уникальности)
const jackStyles = `
  .jack-dialog {
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
    max-width: 450px;
    width: 90%;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.5), 0 0 30px rgba(255, 0, 255, 0.3);
    animation: neonPulse 2s infinite alternate;
  }
  .jack-dialog-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 15px;
  }
  .jack-photo {
    width: 80px;
    height: 80px;
    border: 2px solid #ff00ff;
    border-radius: 50%;
    margin-right: 15px;
    box-shadow: 0 0 15px rgba(255, 0, 255, 0.5);
    object-fit: cover;
  }
  .jack-title {
    color: #00ffff;
    font-size: 24px;
    text-shadow: 0 0 5px #00ffff, 0 0 10px #ff00ff;
    animation: flicker 1.5s infinite alternate;
    margin: 0;
  }
  .jack-text {
    margin: 15px 0;
    font-size: 16px;
    text-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
    line-height: 1.4;
  }
  .shop-list {
    max-height: 250px;
    overflow-y: auto;
    margin-top: 15px;
    background: rgba(10, 10, 10, 0.9);
    border: 1px solid #ff00ff;
    border-radius: 5px;
    padding: 10px;
    box-shadow: inset 0 0 10px rgba(255, 0, 255, 0.3);
    scrollbar-width: thin;
    scrollbar-color: #ff00ff rgba(0, 0, 0, 0.5);
  }
  .shop-list::-webkit-scrollbar {
    width: 8px;
  }
  .shop-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.7);
    border-radius: 4px;
  }
  .shop-list::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #00ffff, #ff00ff);
    border-radius: 4px;
    box-shadow: 0 0 10px rgba(255, 0, 255, 0.7);
  }
  .shop-item {
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
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .shop-item:hover {
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.7), 0 0 20px rgba(255, 0, 255, 0.5);
  }
  .shop-reward {
    color: #ff00ff;
    font-weight: bold;
    text-shadow: 0 0 5px rgba(255, 0, 255, 0.7);
  }
  .jack-button {
    background: linear-gradient(135deg, #00ffff, #ff00ff);
    border: none;
    color: #000;
    padding: 10px 20px;
    margin: 10px;
    cursor: pointer;
    border-radius: 5px;
    font-size: 16px;
    font-weight: bold;
    text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 0 0 15px rgba(255, 0, 255, 0.3);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .jack-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.7), 0 0 20px rgba(255, 0, 255, 0.5);
  }
  @keyframes neonPulse {
    from { box-shadow: 0 0 10px rgba(0, 255, 255, 0.3); }
    to { box-shadow: 0 0 20px rgba(0, 255, 255, 0.7); }
  }
  @keyframes flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
`;

// Инициализация стилей (копия из npc.js)
function initializeJackStyles() {
  let styleSheet = document.getElementById("jackStyles");
  if (!styleSheet) {
    styleSheet = document.createElement("style");
    styleSheet.id = "jackStyles";
    styleSheet.innerHTML = jackStyles;
    document.head.appendChild(styleSheet);
  }
}

// Отрисовка Jack (копия drawNPC из npc.js, с адаптацией)
function drawJack(deltaTime) {
  const camera = window.movementSystem.getCamera();
  const screenX = JACK.x - camera.x;
  const screenY = JACK.y - camera.y;

  // Анимация (периодическая, как у NPC)
  if (!isAnimating) {
    animationCooldownTimer += deltaTime;
    if (animationCooldownTimer >= ANIMATION_COOLDOWN) {
      isAnimating = true;
      jackFrame = 0;
      jackFrameTime = 0;
      animationCooldownTimer = 0;
    }
  } else {
    jackFrameTime += deltaTime;
    if (jackFrameTime >= JACK_FRAME_DURATION) {
      jackFrameTime -= JACK_FRAME_DURATION;
      jackFrame = (jackFrame + 1) % JACK_TOTAL_FRAMES;
      if (jackFrame === 0) {
        // Завершение цикла
        isAnimating = false;
      }
    }
  }

  // Отрисовка спрайта (предполагаем jackSprite как images.johnSprite, но свой)
  if (jackSprite && jackSprite.complete) {
    ctx.drawImage(
      jackSprite,
      jackFrame * 70, // Кадры по 70px
      0, // Строка down или idle
      70,
      70,
      screenX,
      screenY,
      70,
      70
    );
  } else {
    // Заглушка, если спрайт не загружен
    ctx.fillStyle = "purple";
    ctx.fillRect(screenX, screenY, 70, 70);
  }
}

// Проверка близости к Jack (копия checkNPCProximity из npc.js)
function checkJackProximity() {
  const me = players.get(myId);
  if (!me || me.health <= 0 || isJackDialogOpen) return;

  const dx = me.x + 35 - (JACK.x + 35); // Центр игрока и NPC
  const dy = me.y + 35 - (JACK.y + 35);
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < JACK.interactionRadius) {
    openJackDialog();
  }
}

// Открытие диалога Jack (адаптация из npc.js)
function openJackDialog() {
  if (isJackDialogOpen) return;
  isJackDialogOpen = true;

  const dialogContainer = document.createElement("div");
  dialogContainer.className = "jack-dialog";
  dialogContainer.id = "jackDialog";
  document.body.appendChild(dialogContainer);

  if (!isJackMet) {
    showGreetingDialog(dialogContainer);
  } else {
    showShopDialog(dialogContainer);
  }
}

// Закрытие диалога (копия из npc.js)
function closeJackDialog() {
  const dialog = document.getElementById("jackDialog");
  if (dialog) {
    dialog.remove();
    isJackDialogOpen = false;
  }
}

// Приветствие при первом знакомстве (копия showGreetingDialog из npc.js)
function showGreetingDialog(container) {
  container.innerHTML = `
    <div class="jack-dialog-header">
      <img src="jackPhoto.png" alt="Jack Photo" class="jack-photo"> <!-- Если нет фото, замени на fotoQuestNPC.png -->
      <h2 class="jack-title">${JACK.name}</h2>
    </div>
    <p class="jack-text">Привет, я Jack, торговец. Я брат Джона. Давай познакомимся и поторгуем?</p>
    <button class="jack-button" id="meetJackBtn">Познакомиться</button>
  `;

  document.getElementById("meetJackBtn").addEventListener("click", () => {
    isJackMet = true;
    sendWhenReady(ws, JSON.stringify({ type: "meetJack" })); // Отправка на сервер для сохранения jackMet
    showShopDialog(container); // Переход к магазину после знакомства
  });
}

// Окно магазина (новая логика вместо квестов)
function showShopDialog(container) {
  container.innerHTML = `
    <div class="jack-dialog-header">
      <img src="jackPhoto.png" alt="Jack Photo" class="jack-photo">
      <h2 class="jack-title">${JACK.name}</h2>
    </div>
    <p class="jack-text">Что хочешь купить? Цены в balyary.</p>
    <div id="shopList" class="shop-list"></div>
    <button class="jack-button" id="closeShopBtn">Закрыть</button>
  `;

  const shopList = document.getElementById("shopList");
  // Фильтруем товары: rarity 1,2,3 из ITEM_CONFIG (из items.js или глобально)
  const availableItems = Object.entries(ITEM_CONFIG).filter(
    ([_, config]) => config.rarity >= 1 && config.rarity <= 3
  );

  availableItems.forEach(([type, config]) => {
    const shopItem = document.createElement("div");
    shopItem.className = "shop-item";
    const price = config.rarity; // Цена = rarity
    shopItem.innerHTML = `
      <span class="shop-marker">></span>
      <p>${type} <span class="shop-reward">[Цена: ${price} balyary]</span></p>
    `;
    shopItem.addEventListener("click", () => {
      buyItem(type, price);
    });
    shopList.appendChild(shopItem);
  });

  document
    .getElementById("closeShopBtn")
    .addEventListener("click", closeJackDialog);
}

// Логика покупки (новая)
function buyItem(type, price) {
  const me = players.get(myId);
  if (!me) return;

  // Находим balyary в инвентаре
  let balyaryQuantity = 0;
  const balyarySlot = inventory.findIndex(
    (slot) => slot && slot.type === "balyary"
  );
  if (balyarySlot !== -1) {
    balyaryQuantity = inventory[balyarySlot].quantity || 0;
  }

  if (balyaryQuantity < price) {
    alert("Не хватает balyary!"); // Или кастомный попап
    return;
  }

  // Снимаем цену
  inventory[balyarySlot].quantity -= price;
  if (inventory[balyarySlot].quantity <= 0) {
    inventory[balyarySlot] = null;
  }

  // Добавляем предмет в свободный слот
  const freeSlot = inventory.findIndex((slot) => slot === null);
  if (freeSlot === -1) {
    alert("Инвентарь полон!");
    return;
  }
  inventory[freeSlot] = { type, quantity: 1, itemId: `${type}_${Date.now()}` }; // Как в pickup

  // Обновляем инвентарь на сервере
  sendWhenReady(ws, JSON.stringify({ type: "updateInventory", inventory }));

  // Обновляем UI
  updateInventoryDisplay();
  console.log(`Куплен ${type} за ${price} balyary.`);
}

// Экспортируем функции (аналогично npc.js)
window.jackSystem = {
  drawJack,
  checkJackProximity,
  setJackMet: (met) => {
    isJackMet = met;
  },
  initialize: (spriteImage) => {
    jackSprite = spriteImage; // images.jackSprite
    initializeJackStyles();
  },
};
