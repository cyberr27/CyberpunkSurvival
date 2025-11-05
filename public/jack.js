// jack.js (торговец, брат John)

// Константы и переменные
const JACK = {
  x: 1030,
  y: 610,
  width: 70,
  height: 70,
  interactionRadius: 100,
  name: "Jack",
};

let isJackDialogOpen = false;
let jackDialogStage = "greeting";
let isJackMet = false;
let jackSprite = null;

// Анимация
let jackFrame = 0;
let jackFrameTime = 0;
const JACK_FRAME_DURATION = 100;
const JACK_TOTAL_FRAMES = 40;

let jackIsAnimating = false;
let jackAnimationCooldownTimer = 0;
const JACK_ANIMATION_COOLDOWN = 20000;

// Флаг и контейнер для кнопок взаимодействия
let isButtonsShown = false;
let jackButtonsContainer = null;

// Темы для разговора
const TALK_TOPICS = {
  "О погоде":
    "Сегодня отличная погода для торговли! Небо ясное, никаких помех.",
  "О твоем брате John":
    "Мой брат John? Он всегда был авантюристом. Сейчас где-то в городе, ищет приключений.",
  "О торговле":
    "У меня лучшие товары в округе. Только редкие вещи, никаких подделок!",
  Прощай: "",
};

// Стили
const jackStyles = `
  .jack-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, rgba(10,10,10,0.95), rgba(20,20,20,0.9));
    border: 2px solid #00ffff;
    border-radius: 10px;
    padding: 20px;
    color: #00ffff;
    font-family: "Courier New", monospace;
    text-align: center;
    z-index: 1000;
    box-shadow: 0 0 20px rgba(0,255,255,0.5), 0 0 30px rgba(255,0,255,0.3);
    animation: neonPulse 2s infinite alternate;
    overflow: auto;
  }
  .jack-dialog.greeting {
    max-width: 450px;
    width: 90%;
  }
  .jack-dialog.shop {
    width: 70vw;
    height: 74vh;
  }
  .jack-dialog.talk {
    max-width: 450px;
    width: 90%;
  }
  .jack-dialog-header {display:flex;align-items:center;justify-content:center;margin-bottom:15px;}
  .jack-photo {width:80px;height:80px;border:2px solid #ff00ff;border-radius:50%;margin-right:15px;box-shadow:0 0 15px rgba(255,0,255,0.5);object-fit:cover;}
  .jack-title {color:#00ffff;font-size:24px;text-shadow:0 0 5px #00ffff,0 0 10px #ff00ff;animation:flicker 1.5s infinite alternate;margin:0;}
  .jack-text {margin:15px 0;font-size:16px;text-shadow:0 0 5px rgba(0,255,255,0.7);line-height:1.4;}
  
  .shop-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-top: 15px;
    overflow: visible;
  }
  .shop-item {
    background: rgba(0,0,0,0.85);
    padding: 12px;
    cursor: pointer;
    border: 1px solid #00ffff;
    border-radius: 5px;
    color: #00ffff;
    font-size: 14px;
    text-shadow: 0 0 5px rgba(0,255,255,0.7);
    box-shadow: 0 0 8px rgba(0,255,255,0.3);
    transition: transform .2s, box-shadow .2s;
    display: flex;
    align-items: center;
    position: relative;
  }
  .shop-item:hover {transform:scale(1.05);box-shadow:0 0 15px rgba(0,255,255,0.7),0 0 20px rgba(255,0,255,0.5);}
  .shop-item.selected {border:2px solid #ff00ff;box-shadow:0 0 12px rgba(255,0,255,0.8);}
  .shop-reward {color:#ff00ff;font-weight:bold;text-shadow:0 0 5px rgba(255,0,255,0.7);}
  
  .shop-buttons {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 15px;
  }
  .jack-button {
    border: none;
    color: #000;
    padding: 10px 20px;
    margin: 10px;
    cursor: pointer;
    border-radius: 5px;
    font-size: 16px;
    font-weight: bold;
    text-shadow: 0 0 5px rgba(0,0,0,0.5);
    transition: transform .2s, box-shadow .2s;
  }
  .jack-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(0,255,255,0.7), 0 0 20px rgba(255,0,255,0.5);
  }
  .jack-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  .jack-button.buy {
    background: linear-gradient(135deg, #00ff00, #00ffff);
    box-shadow: 0 0 10px rgba(0,255,0,0.5), 0 0 15px rgba(0,255,255,0.3);
  }
  .jack-button.buy:hover {
    box-shadow: 0 0 15px rgba(0,255,0,0.7), 0 0 20px rgba(0,255,255,0.5);
  }
  .jack-button.exit {
    background: linear-gradient(135deg, #ff0000, #ff00ff);
    box-shadow: 0 0 10px rgba(255,0,0,0.5), 0 0 15px rgba(255,0,255,0.3);
  }
  .jack-button.exit:hover {
    box-shadow: 0 0 15px rgba(255,0,0,0.7), 0 0 20px rgba(255,0,255,0.5);
  }
  .jack-button.interaction.trade {
    background: linear-gradient(135deg, #00ffff, #00ccff);
    box-shadow: 0 0 10px rgba(0,255,255,0.5), 0 0 15px rgba(0,204,255,0.3);
    width: 70px;
    height: 30px;
    padding: 5px;
    font-size: 12px;
    border-radius: 3px;
    margin: 3px 0;
  }
  .jack-button.interaction.trade:hover {
    box-shadow: 0 0 15px rgba(0,255,255,0.7), 0 0 20px rgba(0,204,255,0.5);
  }
  .jack-button.interaction.talk {
    background: linear-gradient(135deg, #ff00ff, #cc00cc);
    box-shadow: 0 0 10px rgba(255,0,255,0.5), 0 0 15px rgba(204,0,204,0.3);
    width: 70px;
    height: 30px;
    padding: 5px;
    font-size: 12px;
    border-radius: 3px;
    margin: 3px 0;
  }
  .jack-button.interaction.talk:hover {
    box-shadow: 0 0 15px rgba(255,0,255,0.7), 0 0 20px rgba(204,0,204,0.5);
  }
  @keyframes neonPulse {
    from { box-shadow: 0 0 10px rgba(0,255,255,0.3); }
    to { box-shadow: 0 0 20px rgba(0,255,255,0.7); }
  }
  @keyframes flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  .jack-interaction-buttons {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 999;
  }
  .topic-list {
    list-style: none;
    padding: 0;
    margin: 15px 0;
  }
  .topic-item {
    cursor: pointer;
    margin: 10px 0;
    color: #ff00ff;
    text-shadow: 0 0 5px rgba(255,0,255,0.7);
    transition: color 0.2s;
  }
  .topic-item:hover {
    color: #00ffff;
  }
`;

// Инициализация стилей
function initializeJackStyles() {
  if (!document.getElementById("jackStyles")) {
    const style = document.createElement("style");
    style.id = "jackStyles";
    style.innerHTML = jackStyles;
    document.head.appendChild(style);
  }
}

// Отрисовка Jack
function drawJack(deltaTime) {
  const camera = window.movementSystem.getCamera();
  const screenX = JACK.x - camera.x;
  const screenY = JACK.y - camera.y;

  // Периодическая анимация
  if (!jackIsAnimating) {
    jackAnimationCooldownTimer += deltaTime;
    if (jackAnimationCooldownTimer >= JACK_ANIMATION_COOLDOWN) {
      jackIsAnimating = true;
      jackFrame = 0;
      jackFrameTime = 0;
      jackAnimationCooldownTimer = 0;
    }
  } else {
    jackFrameTime += deltaTime;
    if (jackFrameTime >= JACK_FRAME_DURATION) {
      jackFrameTime -= JACK_FRAME_DURATION;
      jackFrame = (jackFrame + 1) % JACK_TOTAL_FRAMES;
      if (jackFrame === 0) jackIsAnimating = false;
    }
  }

  if (jackSprite && jackSprite.complete) {
    ctx.drawImage(
      jackSprite,
      jackFrame * 70,
      0,
      70,
      70,
      screenX,
      screenY,
      70,
      70
    );
  } else {
    ctx.fillStyle = "purple";
    ctx.fillRect(screenX, screenY, 70, 70);
  }

  // Рисуем имя
  ctx.fillStyle = isJackMet ? "#15ce00ff" : "#ffffff";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    isJackMet ? JACK.name : "?",
    screenX + JACK.width / 2,
    screenY - 10
  );

  // Обновляем позицию кнопок, если они показаны
  if (isButtonsShown) {
    updateButtonsPosition(screenX, screenY);
  }
}

// Обновление позиции кнопок
function updateButtonsPosition(screenX, screenY) {
  if (jackButtonsContainer) {
    jackButtonsContainer.style.left = `${screenX + JACK.width / 2 - 50}px`;
    jackButtonsContainer.style.top = `${screenY - 80}px`;
  }
}

// Проверка расстояния
function checkJackProximity() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const dx = me.x + 35 - (JACK.x + 35);
  const dy = me.y + 35 - (JACK.y + 35);
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < JACK.interactionRadius) {
    if (!isJackMet) {
      if (!isJackDialogOpen) openJackDialog();
    } else {
      // Показываем кнопки, если диалог закрыт и кнопки еще не отображаются
      if (!isJackDialogOpen && !isButtonsShown) {
        showInteractionButtons();
      }
    }
  } else {
    if (isJackDialogOpen) closeJackDialog();
    if (isButtonsShown) hideInteractionButtons();
  }
}

// Показать кнопки взаимодействия над Jack
function showInteractionButtons() {
  if (isButtonsShown || jackButtonsContainer) return;

  const camera = window.movementSystem.getCamera();
  const screenX = JACK.x - camera.x;
  const screenY = JACK.y - camera.y;

  jackButtonsContainer = document.createElement("div");
  jackButtonsContainer.className = "jack-interaction-buttons";
  jackButtonsContainer.style.left = `${screenX + JACK.width / 2 - 35}px`; // Adjusted for button width
  jackButtonsContainer.style.top = `${screenY - 80}px`;

  const tradeBtn = document.createElement("button");
  tradeBtn.className = "jack-button interaction trade";
  tradeBtn.textContent = "Торг";
  tradeBtn.addEventListener("click", () => {
    hideInteractionButtons();
    openJackShop();
  });

  const talkBtn = document.createElement("button");
  talkBtn.className = "jack-button interaction talk";
  talkBtn.textContent = "Говорить";
  talkBtn.addEventListener("click", () => {
    hideInteractionButtons();
    openJackTalk();
  });

  jackButtonsContainer.appendChild(tradeBtn);
  jackButtonsContainer.appendChild(talkBtn);
  document.body.appendChild(jackButtonsContainer);
  isButtonsShown = true;
}

// Скрыть кнопки
function hideInteractionButtons() {
  if (jackButtonsContainer) {
    jackButtonsContainer.remove();
    jackButtonsContainer = null;
  }
  isButtonsShown = false;
}

// Открыть магазин
function openJackShop() {
  if (isJackDialogOpen) return;
  isJackDialogOpen = true;
  jackDialogStage = "shop";

  const container = document.createElement("div");
  container.className = "jack-dialog shop";
  container.id = "jackDialog";
  document.body.appendChild(container);

  showShopDialog(container);
}

// Открыть диалог разговора
function openJackTalk() {
  if (isJackDialogOpen) return;
  isJackDialogOpen = true;
  jackDialogStage = "talk";

  const container = document.createElement("div");
  container.className = "jack-dialog talk";
  container.id = "jackDialog";
  document.body.appendChild(container);

  showTalkDialog(container);
}

// Показать список тем для разговора
function showTalkDialog(container) {
  container.innerHTML = `
    <div class="jack-dialog-header">
      <img src="jackPhoto.png" alt="Jack Photo" class="jack-photo">
      <h2 class="jack-title">${JACK.name}</h2>
    </div>
    <p class="jack-text">О чем хочешь поговорить?</p>
    <ul class="topic-list" id="topicList"></ul>
  `;

  const topicList = document.getElementById("topicList");
  Object.keys(TALK_TOPICS).forEach((topic) => {
    const li = document.createElement("li");
    li.className = "topic-item";
    li.textContent = topic;
    li.addEventListener("click", () => {
      if (topic === "Прощай") {
        closeJackDialog();
      } else {
        showTopicResponse(container, topic);
      }
    });
    topicList.appendChild(li);
  });
}

// Показать ответ на тему
function showTopicResponse(container, topic) {
  container.innerHTML = `
    <div class="jack-dialog-header">
      <img src="jackPhoto.png" alt="Jack Photo" class="jack-photo">
      <h2 class="jack-title">${JACK.name}</h2>
    </div>
    <p class="jack-text">${TALK_TOPICS[topic]}</p>
    <button class="jack-button" id="backBtn">Назад</button>
  `;

  document.getElementById("backBtn").addEventListener("click", () => {
    showTalkDialog(container);
  });
}

// Открытие диалога (для greeting)
function openJackDialog() {
  if (isJackDialogOpen) return;
  isJackDialogOpen = true;

  const container = document.createElement("div");
  container.className = "jack-dialog";
  container.id = "jackDialog";
  document.body.appendChild(container);

  if (!isJackMet) {
    container.classList.add("greeting");
    jackShowGreetingDialog(container);
  }
}

// Закрытие
function closeJackDialog() {
  const dlg = document.getElementById("jackDialog");
  if (dlg) dlg.remove();
  isJackDialogOpen = false;
  jackDialogStage = "greeting";
}

// Приветствие
function jackShowGreetingDialog(container) {
  container.innerHTML = `
    <div class="jack-dialog-header">
      <img src="jackPhoto.png" alt="Jack Photo" class="jack-photo">
      <h2 class="jack-title">${JACK.name}</h2>
    </div>
    <p class="jack-text">Привет, я Jack, торговец. Я брат Джона. Давай познакомимся и поторгуем?</p>
    <button class="jack-button" id="meetJackBtn">Познакомиться</button>
  `;

  document.getElementById("meetJackBtn").addEventListener("click", () => {
    isJackMet = true;
    sendWhenReady(ws, JSON.stringify({ type: "meetJack" }));
    closeJackDialog();
  });
}

// Магазин
let selectedItemType = null;
let selectedPrice = 0;

function showShopDialog(container) {
  container.innerHTML = `
    <div class="jack-dialog-header">
      <img src="jackPhoto.png" alt="Jack Photo" class="jack-photo">
      <h2 class="jack-title">${JACK.name}</h2>
    </div>
    <p class="jack-text">Что хочешь купить? Цены в balyary.</p>
    <div id="shopGrid" class="shop-grid"></div>
    <div class="shop-buttons">
      <button class="jack-button buy" id="buyBtn" disabled>Купить</button>
      <button class="jack-button exit" id="exitBtn">Выход</button>
    </div>
  `;

  const grid = document.getElementById("shopGrid");
  const buyBtn = document.getElementById("buyBtn");
  const exitBtn = document.getElementById("exitBtn");

  const BLACKLIST = ["balyary", "atom", "blood_pack", "blood_syringe"];

  const availableItems = Object.entries(ITEM_CONFIG).filter(([type, cfg]) => {
    const isBlacklisted = BLACKLIST.includes(type);
    const isWeapon = cfg.category === "weapon";
    const isRarityValid = cfg.rarity >= 1 && cfg.rarity <= 3;

    return isRarityValid && !isBlacklisted && !isWeapon;
  });

  availableItems.forEach(([type, cfg]) => {
    const price = cfg.rarity;
    const itemEl = document.createElement("div");
    itemEl.className = "shop-item";
    itemEl.innerHTML = `
      <img src="${cfg.image.src}" alt="${type}" width="40" height="40" style="margin-right:10px;">
      <div>
        <p>${cfg.description} <span class="shop-reward">[Цена: ${price} balyary]</span></p>
      </div>
    `;

    itemEl.addEventListener("click", () => {
      document
        .querySelectorAll(".shop-item")
        .forEach((el) => el.classList.remove("selected"));
      itemEl.classList.add("selected");
      selectedItemType = type;
      selectedPrice = price;
      buyBtn.disabled = false;
    });

    grid.appendChild(itemEl);
  });

  buyBtn.addEventListener("click", () => {
    if (selectedItemType) buyItem(selectedItemType, selectedPrice);
  });

  exitBtn.addEventListener("click", () => {
    closeJackDialog();
  });
}

// Покупка
function buyItem(type, price) {
  const me = players.get(myId);
  if (!me) return;

  const balyarySlot = inventory.findIndex((s) => s && s.type === "balyary");
  const balyaryQty =
    balyarySlot !== -1 ? inventory[balyarySlot].quantity || 0 : 0;

  if (balyaryQty < price) {
    alert("Не хватает balyary!");
    return;
  }

  inventory[balyarySlot].quantity -= price;
  if (inventory[balyarySlot].quantity <= 0) inventory[balyarySlot] = null;

  const freeSlot = inventory.findIndex((s) => s === null);
  if (freeSlot === -1) {
    alert("Инвентарь полон!");
    return;
  }
  inventory[freeSlot] = { type, quantity: 1, itemId: `${type}_${Date.now()}` };

  sendWhenReady(ws, JSON.stringify({ type: "updateInventory", inventory }));
  updateInventoryDisplay();

  selectedItemType = null;
  selectedPrice = 0;
  document
    .querySelectorAll(".shop-item")
    .forEach((el) => el.classList.remove("selected"));
  document.getElementById("buyBtn").disabled = true;
}

// Экспорт
window.jackSystem = {
  drawJack,
  checkJackProximity,
  setJackMet: (met) => {
    isJackMet = met;
  },
  initialize: (spriteImg) => {
    jackSprite = spriteImg;
    initializeJackStyles();
  },
};
