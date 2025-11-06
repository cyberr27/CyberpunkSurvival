// jack.js (торговец, брат John)

// Константы и переменные
const JACK = {
  x: 1030,
  y: 610,
  width: 70,
  height: 70,
  interactionRadius: 50,
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

// Кнопки над Джеком
let jackButtonsContainer = null;
let isPlayerNearJack = false;

// КРИТИЧНО: Флаг для предотвращения повторного показа приветствия
let hasJackGreetingBeenShown = false;

// Стили — динамические: приветствие как у Джона, магазин — 80vw × 70vh
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
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .jack-dialog.greeting, .jack-dialog.talk {
    max-width: 450px;
    width: 90%;
    height: 500px;
  }
  .jack-dialog.shop {
    width: 70vw;
    height: 74vh;
    overflow: auto;
  }
  .jack-dialog-header {display:flex;align-items:center;justify-content:center;margin-bottom:15px;}
  .jack-photo {width:80px;height:80px;border:2px solid #ff00ff;border-radius:50%;margin-right:15px;box-shadow:0 0 15px rgba(255,0,255,0.5);object-fit:cover;}
  .jack-title {color:#00ffff;font-size:24px;text-shadow:0 0 5px #00ffff,0 0 10px #ff00ff;animation:flicker 1.5s infinite alternate;margin:0;}
  .jack-text {margin:15px 0;font-size:16px;text-shadow:0 0 5px rgba(0,255,255,0.7);line-height:1.4;}
  .jack-text.fullscreen {
    margin: 0;
    padding: 20px;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 0, 255, 0.5);
    border-radius: 8px;
    font-size: 18px;
    min-height: 200px;
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    text-align: center;
    overflow-y: auto;
    overflow-x: hidden;
    word-wrap: break-word;
    scrollbar-width: thin;
  }
  
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
  .jack-button {
    background: linear-gradient(135deg, #00ffff, #ff00ff);
    border:none;color:#000;padding:10px 20px;margin:10px;cursor:pointer;border-radius:5px;
    font-size:16px;font-weight:bold;text-shadow:0 0 5px rgba(0,0,0,0.5);
    box-shadow:0 0 10px rgba(0,255,255,0.5),0 0 15px rgba(255,0,255,0.3);
    transition:transform .2s,box-shadow .2s;
  }
  .jack-button:hover {transform:scale(1.05);box-shadow:0 0 15px rgba(0,255,255,0.7),0 0 20px rgba(255,0,255,0.5);}
  .jack-button:disabled {opacity:0.5;cursor:not-allowed;transform:none;}

  /* Кнопки над Джеком */
  .jack-buttons-container {
    position: fixed;
    z-index: 1000;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transform-origin: center top;
  }
  .jack-button-talk, .jack-button-shop {
    pointer-events: all;
    padding: 10px 20px;
    font-size: 14px;
    font-family: "Courier New", monospace;
    font-weight: bold;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-shadow: 0 0 5px rgba(0, 255, 255, 0.8);
    transition: all 0.3s ease;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
    min-width: 100px;
    text-align: center;
    user-select: none;
  }
  .jack-button-talk {
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 150, 150, 0.3));
    color: #00ffff;
    border-color: #00ffff;
  }
  .jack-button-shop {
    background: linear-gradient(135deg, rgba(255, 0, 255, 0.2), rgba(150, 0, 150, 0.3));
    color: #ff00ff;
    border-color: #ff00ff;
  }
  .jack-button-talk:hover, .jack-button-shop:hover {
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
  }
  .jack-button-shop:hover {
    box-shadow: 0 0 20px rgba(255, 0, 255, 0.8);
  }

  /* Стили для диалога */
  .jack-dialog-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 10px;
    margin-top: 10px;
    scrollbar-width: thin;
    scrollbar-color: #ff00ff rgba(0, 0, 0, 0.5);
  }

  .jack-dialog-content::-webkit-scrollbar {
    width: 8px;
  }
  .jack-dialog-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.7);
    border-radius: 4px;
  }
  .jack-dialog-content::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #00ffff, #ff00ff);
    border-radius: 4px;
    box-shadow: 0 0 10px rgba(255, 0, 255, 0.7);
  }

  .talk-topics {
    max-height: 300px;
    overflow-y: auto;
    overflow-x: hidden;
    background: rgba(10, 10, 10, 0.9);
    border: 1px solid #00ffff;
    border-radius: 5px;
    padding: 15px;
    box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.3);
  }
  .talk-topics.hidden {
    display: none;
  }
  .talk-topic {
    background: rgba(0, 0, 0, 0.85);
    padding: 15px;
    margin: 10px 0;
    cursor: pointer;
    border: 1px solid #00ffff;
    border-radius: 5px;
    color: #00ffff;
    font-size: 14px;
    text-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
    transition: all 0.3s ease;
    text-align: center;
    word-wrap: break-word;
  }
  .talk-topic:hover {
    background: rgba(0, 255, 255, 0.15);
    border-color: #ff00ff;
    box-shadow: 0 0 15px rgba(255, 0, 255, 0.5);
    transform: translateX(5px);
  }

  @keyframes neonPulse{from{box-shadow:0 0 10px rgba(0,255,255,0.3);}to{box-shadow:0 0 20px rgba(0,255,255,0.7);}}
  @keyframes flicker{0%,100%{opacity:1;}50%{opacity:0.8;}}
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

// Создание кнопок
function createJackButtons(screenX, screenY) {
  if (jackButtonsContainer) document.body.removeChild(jackButtonsContainer);

  jackButtonsContainer = document.createElement("div");
  jackButtonsContainer.className = "jack-buttons-container";

  const totalButtonsHeight = 45 * 2 + 16;
  jackButtonsContainer.style.left = screenX + JACK.width / 2 + "px";
  jackButtonsContainer.style.top = screenY - totalButtonsHeight - 25 + "px";
  jackButtonsContainer.style.transform = "translateX(-50%)";

  const talkBtn = document.createElement("div");
  talkBtn.className = "jack-button-talk";
  talkBtn.textContent = "Говорить";
  talkBtn.addEventListener("click", openJackTalkDialog);

  const shopBtn = document.createElement("div");
  shopBtn.className = "jack-button-shop";
  shopBtn.textContent = "Магазин";
  shopBtn.addEventListener("click", () => {
    const container = document.getElementById("jackDialog");
    if (container) {
      container.classList.remove("talk");
      container.classList.add("shop");
      showShopDialog(container);
    } else {
      openJackDialog(true);
    }
  });

  jackButtonsContainer.appendChild(talkBtn);
  jackButtonsContainer.appendChild(shopBtn);
  document.body.appendChild(jackButtonsContainer);
}

function removeJackButtons() {
  if (jackButtonsContainer) {
    document.body.removeChild(jackButtonsContainer);
    jackButtonsContainer = null;
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

  // Обновляем позицию кнопок
  if (isPlayerNearJack && jackButtonsContainer) {
    const totalButtonsHeight = 45 * 2 + 16;
    jackButtonsContainer.style.left = screenX + JACK.width / 2 + "px";
    jackButtonsContainer.style.top = screenY - totalButtonsHeight - 25 + "px";
  }
}

// Проверка расстояния
function checkJackProximity() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const dx = me.x + 35 - (JACK.x + 35);
  const dy = me.y + 35 - (JACK.y + 35);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const isNear = distance < JACK.interactionRadius;

  if (isNear) {
    if (!isJackDialogOpen) {
      if (!isJackMet && !hasJackGreetingBeenShown) {
        hasJackGreetingBeenShown = true;
        openJackDialog();
      } else if (isJackMet && !isPlayerNearJack) {
        isPlayerNearJack = true;
        const camera = window.movementSystem.getCamera();
        createJackButtons(JACK.x - camera.x, JACK.y - camera.y);
      }
    }
  } else {
    if (isJackDialogOpen) closeJackDialog();
    if (isPlayerNearJack) {
      isPlayerNearJack = false;
      removeJackButtons();
    }
  }
}

// Открытие диалога
function openJackDialog(skipGreeting = false) {
  if (isJackDialogOpen) return;
  isJackDialogOpen = true;

  const container = document.createElement("div");
  container.className = "jack-dialog";
  container.id = "jackDialog";
  document.body.appendChild(container);

  if (!isJackMet && !skipGreeting) {
    container.classList.add("greeting");
    jackShowGreetingDialog(container);
  } else {
    container.classList.add("shop");
    showShopDialog(container);
  }
}

// Закрытие
function closeJackDialog() {
  const dlg = document.getElementById("jackDialog");
  if (dlg) dlg.remove();
  isJackDialogOpen = false;
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

    container.classList.remove("greeting");
    container.classList.add("shop");
    showShopDialog(container);
  });
}

// Диалог с темами
function openJackTalkDialog() {
  closeJackDialog();
  jackDialogStage = "talk";

  const container = document.createElement("div");
  container.className = "jack-dialog talk";
  container.id = "jackDialog";
  document.body.appendChild(container);

  const topics = [
    {
      title: "О торговле",
      text: "В этом городе всё продаётся. Даже воздух. Но я торгую честно — баляры за товар, без обмана.",
    },
    {
      title: "О Джоне",
      text: "Мой брат... он слишком добрый. Даёт задания, а я плачу. Без меня он бы разорился.",
    },
    {
      title: "О балярах",
      text: "Баляры — это власть. С ними ты король. Без них — мусор на помойке.",
    },
    {
      title: "О городе",
      text: "Неон светит, но не греет. Здесь выживает только тот, кто торгует, ворует или убивает.",
    },
  ];

  container.innerHTML = `
    <div class="jack-dialog-header">
      <img src="jackPhoto.png" alt="Jack Photo" class="jack-photo">
      <h2 class="jack-title">${JACK.name}</h2>
    </div>
    <div class="jack-dialog-content">
      <p class="jack-text">Слушаю тебя, покупатель...</p>
      <div id="talkTopics" class="talk-topics"></div>
    </div>
    <button id="closeTalkBtn" class="jack-button">Закрыть</button>
  `;

  const jackText = container.querySelector(".jack-text");
  const topicsContainer = document.getElementById("talkTopics");
  const closeBtn = document.getElementById("closeTalkBtn");

  topics.forEach((topic) => {
    const div = document.createElement("div");
    div.className = "talk-topic";
    div.innerHTML = `<strong>${topic.title}</strong>`;
    div.addEventListener("click", () => {
      topicsContainer.classList.add("hidden");
      jackText.classList.add("fullscreen");
      jackText.innerHTML = `<div style="flex:1;overflow-y:auto;padding-right:10px;">${topic.text}</div>`;
      closeBtn.textContent = "Понятно";
      closeBtn.onclick = showTopics;
    });
    topicsContainer.appendChild(div);
  });

  function showTopics() {
    topicsContainer.classList.remove("hidden");
    jackText.classList.remove("fullscreen");
    jackText.textContent = "Слушаю тебя, покупатель...";
    closeBtn.textContent = "Закрыть";
    closeBtn.onclick = closeJackDialog;
  }

  closeBtn.onclick = closeJackDialog;
  isJackDialogOpen = true;
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
    <button class="jack-button" id="buyBtn" disabled>Купить</button>
  `;

  const grid = document.getElementById("shopGrid");
  const buyBtn = document.getElementById("buyBtn");

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
    if (!met) {
      removeJackButtons();
      isPlayerNearJack = false;
      hasJackGreetingBeenShown = false; // Разрешаем повторное приветствие при респавне
    }
  },
  initialize: (spriteImg) => {
    jackSprite = spriteImg;
    initializeJackStyles();
    hasJackGreetingBeenShown = false; // Гарантируем чистое состояние
  },
};
