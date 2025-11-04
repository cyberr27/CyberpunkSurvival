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
  .jack-button {
    background: linear-gradient(135deg, #00ffff, #ff00ff);
    border:none;color:#000;padding:10px 20px;margin:10px;cursor:pointer;border-radius:5px;
    font-size:16px;font-weight:bold;text-shadow:0 0 5px rgba(0,0,0,0.5);
    box-shadow:0 0 10px rgba(0,255,255,0.5),0 0 15px rgba(255,0,255,0.3);
    transition:transform .2s,box-shadow .2s;
  }
  .jack-button:hover {transform:scale(1.05);box-shadow:0 0 15px rgba(0,255,255,0.7),0 0 20px rgba(255,0,255,0.5);}
  .jack-button:disabled {opacity:0.5;cursor:not-allowed;transform:none;}
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

  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(isJackMet ? JACK.name : "?", screenX + 35, screenY - 20);
}

// Проверка расстояния
function checkJackProximity() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const dx = me.x + 35 - (JACK.x + 35);
  const dy = me.y + 35 - (JACK.y + 35);
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < JACK.interactionRadius) {
    if (!isJackDialogOpen) openJackDialog();
  } else {
    if (isJackDialogOpen) closeJackDialog();
  }
}

// Открытие диалога
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

    // Переключаем на магазин
    container.classList.remove("greeting");
    container.classList.add("shop");
    showShopDialog(container);
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
    <button class="jack-button" id="buyBtn" disabled>Купить</button>
  `;

  const grid = document.getElementById("shopGrid");
  const buyBtn = document.getElementById("buyBtn");

  // ЖЁСТКАЯ ФИЛЬТРАЦИЯ: убираем всё запрещённое
  const BLACKLIST = [
    "balyary",
    "atom",
    "blood_pack",
    "blood_syringe",
    "wolf_skin",
  ];

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

  console.log(`Куплен ${type} за ${price} balyary.`);
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
