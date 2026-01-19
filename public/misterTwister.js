// misterTwister.js — версия без кнопки ЗАКРЫТЬ и с фоном на всё окно

const MISTER_TWISTER = {
  x: 500,
  y: 2800,
  width: 70,
  height: 100,
};

const CONFIG = {
  frameCount: 13,
  frameWidth: 70,
  frameHeight: 100,
  animationDuration: 5000,
  pauseDuration: 10000,
  interactionRadiusSq: 4900, // ~70px радиус
};

let sprite = null;
let spriteReady = false;
let animationStart = 0;
let isMenuOpen = false;
let menuElement = null;
let wasInRangeLastFrame = false;

let isSpinning = false;
let balance = 0;
let bonusPoints = 0;
let myBonusPointGiven = false;

function initializeMisterTwister() {
  sprite = new Image();
  sprite.src = "mister_twister.png";

  sprite.onload = () => {
    spriteReady = true;
  };

  animationStart = performance.now();
}

function checkMisterTwisterProximity() {
  if (window.worldSystem.currentWorldId !== 0) {
    if (isMenuOpen) hideTwisterMenu();
    wasInRangeLastFrame = false;
    return;
  }

  const me = players.get(myId);
  if (!me) return;

  const dx = me.x + 35 - (MISTER_TWISTER.x + 35);
  const dy = me.y + 50 - (MISTER_TWISTER.y + 50);

  const nowInRange = dx * dx + dy * dy < CONFIG.interactionRadiusSq;

  if (!nowInRange && !wasInRangeLastFrame) return;

  if (nowInRange && !wasInRangeLastFrame) {
    showTwisterMenu();
  } else if (!nowInRange && wasInRangeLastFrame) {
    hideTwisterMenu();
  }

  wasInRangeLastFrame = nowInRange;
}

function updateLocalBalanceDisplay() {
  if (!isMenuOpen) return;

  const balyarySlot = window.inventory.findIndex(
    (slot) => slot && slot.type === "balyary",
  );
  const count =
    balyarySlot !== -1 ? window.inventory[balyarySlot]?.quantity || 1 : 0;

  const el = document.getElementById("twister-balance");
  if (el) {
    el.textContent = count;
    el.dataset.count = count; // для моментальной проверки перед спином
  }
}

function showTwisterMenu() {
  if (isMenuOpen) return;
  isMenuOpen = true;

  menuElement = document.createElement("div");
  menuElement.className = "npc-dialog open twister-full-window";

  menuElement.innerHTML = `
    <div class="npc-dialog-content">
      <p class="npc-text" style="text-align:center; margin: 12px 0;">
        Стоимость спина — <strong>1 баляр</strong><br>
        Баланс: <span id="twister-balance">загружается...</span>
      </p>

      <div class="slot-reels">
        <div class="reel"><div class="reel-strip" id="reel1"></div></div>
        <div class="reel"><div class="reel-strip" id="reel2"></div></div>
        <div class="reel"><div class="reel-strip" id="reel3"></div></div>
      </div>

      <button class="spin-button" id="twister-spin-btn">КРУТИТЬ!</button>

      <p id="twister-result" style="text-align:center; min-height:2.2em; margin-top:16px;"></p>
    </div>

    <div class="bonus-lights" id="bonus-lights">
      ${Array(11).fill('<div class="bonus-light"></div>').join("")}
    </div>
  `;

  document.body.appendChild(menuElement);

  // Перехватываем обновление инвентаря чтобы показывать актуальный баланс
  const originalUpdate = window.inventorySystem.updateInventoryDisplay;
  window.inventorySystem.updateInventoryDisplay = function (...args) {
    originalUpdate.apply(this, args);
    if (isMenuOpen) updateLocalBalanceDisplay();
  };

  // Первичное обновление баланса из локального инвентаря
  updateLocalBalanceDisplay();

  document
    .getElementById("twister-spin-btn")
    ?.addEventListener("click", handleTwisterSpin);

  // Запрашиваем состояние бонусной шкалы и флаг myBonusPointGiven
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "twister", subtype: "getState" }));
  }
}

function hideTwisterMenu() {
  if (!isMenuOpen) return;
  isMenuOpen = false;
  if (menuElement) {
    menuElement.remove();
    menuElement = null;
  }
  isSpinning = false;
}

function handleTwisterSpin() {
  if (isSpinning) return;

  const balanceEl = document.getElementById("twister-balance");
  const currentBalance = Number(balanceEl?.dataset.count) || 0;

  if (currentBalance < 1) {
    const resultEl = document.getElementById("twister-result");
    resultEl.textContent = "Недостаточно баляров!";
    resultEl.style.color = "#ff6666";
    return;
  }

  isSpinning = true;
  const btn = document.getElementById("twister-spin-btn");
  if (btn) btn.disabled = true;

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "twister", subtype: "spin" }));
  } else {
    const resultEl = document.getElementById("twister-result");
    resultEl.textContent = "Ошибка соединения...";
    resultEl.style.color = "#ff6666";
    isSpinning = false;
    if (btn) btn.disabled = false;
  }
}

function animateReels() {
  const reels = [
    document.getElementById("reel1"),
    document.getElementById("reel2"),
    document.getElementById("reel3"),
  ];

  if (!reels[0]) return;

  // Создаём символы для анимации (простой вариант)
  reels.forEach((reel) => {
    reel.innerHTML = "";
    for (let i = 0; i < 40; i++) {
      const div = document.createElement("div");
      div.className = "reel-symbol";
      div.textContent = Math.floor(Math.random() * 10);
      reel.appendChild(div);
    }
  });

  let progress = 0;
  const duration = 2800 + Math.random() * 800;

  const anim = setInterval(() => {
    progress += 16;
    if (progress >= duration) {
      clearInterval(anim);
      isSpinning = false;
      const btn = document.getElementById("twister-spin-btn");
      if (btn) btn.disabled = false;
      return;
    }

    const offset = (progress / 1000) * 1200;
    reels.forEach((r) => {
      r.style.transform = `translateY(-${offset % (150 * 10)}px)`;
    });
  }, 16);
}

function updateTwisterState(data) {
  if (!isMenuOpen) return;

  if (data.balance !== undefined) {
    balance = data.balance;
    const el = document.getElementById("twister-balance");
    if (el) {
      el.textContent = balance;
      el.dataset.count = balance;
    }
  }

  bonusPoints = Math.min(11, data.bonusPoints ?? 0);
  myBonusPointGiven = data.myBonusPointGiven ?? false;

  const lights = document.querySelectorAll(".bonus-light");
  lights.forEach((el, i) => {
    el.classList.toggle("active", i < bonusPoints);
  });

  const resultEl = document.getElementById("twister-result");
  if (data.result) {
    resultEl.innerHTML = data.result;
    resultEl.style.color = data.won ? "#00ff88" : "#ff6666";
  } else if (data.error) {
    resultEl.textContent = data.error;
    resultEl.style.color = "#ff6666";
  }

  if (data.shouldAnimate) {
    animateReels();
  }
}

function handleTwisterMessage(data) {
  switch (data.subtype) {
    case "state":
    case "spinResult":
      updateTwisterState(data);
      break;

    case "bonusWin":
      showNotification("БОЛЬШОЙ БОНУС! 75 баляров!", "#ffff00", 6000);
      updateTwisterState(data);
      break;

    default:
      updateTwisterState(data);
  }
}

// Отрисовка автомата на карте
function drawMisterTwister() {
  if (window.worldSystem.currentWorldId !== 0) return;
  if (!spriteReady || !sprite?.complete) return;

  const camera = window.movementSystem.getCamera();
  const sx = MISTER_TWISTER.x - camera.x;
  const sy = MISTER_TWISTER.y - camera.y;

  if (
    sx + 90 < 0 ||
    sx > canvas.width + 30 ||
    sy + 130 < 0 ||
    sy > canvas.height + 30
  )
    return;

  const now = performance.now();
  const cycleTime = CONFIG.animationDuration + CONFIG.pauseDuration;
  const t = (now - animationStart) % cycleTime;

  let frame = 0;
  if (t < CONFIG.animationDuration) {
    frame = Math.floor((t * CONFIG.frameCount) / CONFIG.animationDuration);
  }

  ctx.drawImage(
    sprite,
    frame * CONFIG.frameWidth,
    0,
    CONFIG.frameWidth,
    CONFIG.frameHeight,
    sx,
    sy,
    MISTER_TWISTER.width,
    MISTER_TWISTER.height,
  );
}

window.misterTwister = {
  initialize: initializeMisterTwister,
  checkProximity: checkMisterTwisterProximity,
  draw: drawMisterTwister,
  hideMenu: hideTwisterMenu,
  handleMessage: handleTwisterMessage,
  updateState: updateTwisterState,
};
