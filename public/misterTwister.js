// misterTwister.js — версия с полноценным слот-автоматом

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
  interactionRadiusSq: 4900,
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

// Функция отрисовки автомата на карте (старая, не трогаем)
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
  ) {
    return;
  }

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

function showTwisterMenu() {
  if (isMenuOpen) return;
  isMenuOpen = true;

  menuElement = document.createElement("div");
  menuElement.className = "npc-dialog open";

  menuElement.innerHTML = `
    <div class="npc-dialog-header">
      <h2 class="npc-title">MISTER TWISTER</h2>
    </div>
    
    <div class="npc-dialog-content">
      <p class="npc-text" style="text-align:center; margin-bottom:8px;">
        Стоимость спина — <strong>1 баляр</strong><br>
        Баланс: <span id="twister-balance">?</span>
      </p>

      <div class="twister-machine-container">
        <div class="bonus-lights" id="bonus-lights">
          ${Array(11).fill('<div class="bonus-light"></div>').join("")}
        </div>

        <div class="slot-reels">
          <div class="reel"><div class="reel-strip" id="reel1"></div></div>
          <div class="reel"><div class="reel-strip" id="reel2"></div></div>
          <div class="reel"><div class="reel-strip" id="reel3"></div></div>
        </div>

        <button class="spin-button" id="twister-spin-btn">КРУТИТЬ!</button>
      </div>

      <p id="twister-result" style="text-align:center; min-height:2.2em; margin-top:12px;"></p>
    </div>

    <button class="neon-btn">ЗАКРЫТЬ</button>
  `;

  document.body.appendChild(menuElement);

  // События
  document
    .getElementById("twister-spin-btn")
    ?.addEventListener("click", handleTwisterSpin);

  menuElement
    .querySelector(".neon-btn")
    .addEventListener("click", hideTwisterMenu, { once: true });

  // Запрашиваем текущее состояние
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "twisterGetState" }));
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
  if (balance < 1) {
    document.getElementById("twister-result").textContent =
      "Недостаточно баляров!";
    return;
  }

  isSpinning = true;
  document.getElementById("twister-spin-btn").disabled = true;
  document.getElementById("twister-result").textContent = "Крутим...";

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "twisterSpin" }));
  }
}

// Анимация вращения (визуальная)
function animateReels() {
  if (!isMenuOpen || !document.getElementById("reel1")) return;

  const symbols = "0123456789".split("");
  const reelHeight = 138 * 10; // высота одной ленты из 10 символов

  const reels = [1, 2, 3].map((n) => document.getElementById(`reel${n}`));

  // Заполняем длинную ленту для эффекта прокрутки
  reels.forEach((reel) => {
    reel.innerHTML = "";
    for (let i = 0; i < 40; i++) {
      // достаточно для плавной анимации
      const sym = symbols[Math.floor(Math.random() * 10)];
      const div = document.createElement("div");
      div.className = `reel-symbol ${sym === "7" ? "seven" : sym === "3" ? "three" : ""}`;
      div.textContent = sym;
      reel.appendChild(div);
    }
  });

  let progress = 0;
  const duration = 2800 + Math.random() * 800; // 2.8–3.6 сек

  const anim = setInterval(() => {
    progress += 16;
    if (progress >= duration) {
      clearInterval(anim);
      isSpinning = false;
      const btn = document.getElementById("twister-spin-btn");
      if (btn) btn.disabled = false;
      return;
    }

    const offset = (progress / 1000) * 1200; // скорость прокрутки
    reels.forEach((r) => {
      r.style.transform = `translateY(-${offset % reelHeight}px)`;
    });
  }, 16);
}

// Обновляем состояние после ответа сервера
function updateTwisterState(data) {
  if (!isMenuOpen) return;

  balance = data.balance ?? 0;
  bonusPoints = Math.min(11, data.bonusPoints ?? 0);
  myBonusPointGiven = data.myBonusPointGiven ?? false;

  document.getElementById("twister-balance").textContent = balance;

  // Обновляем огоньки бонуса
  const lights = document.querySelectorAll(".bonus-light");
  lights.forEach((el, i) => {
    el.classList.toggle("active", i < bonusPoints);
  });

  if (data.result) {
    document.getElementById("twister-result").innerHTML = data.result;
    if (data.won) {
      document.getElementById("twister-result").style.color = "#00ff88";
    } else {
      document.getElementById("twister-result").style.color = "#ff6666";
    }
  }

  // Запускаем красивую анимацию вращения
  if (data.shouldAnimate) {
    animateReels();
  }
}

function handleTwisterMessage(data) {
  switch (data.subtype) {
    case "state":
      updateTwisterState(data);
      break;
    case "spinResult":
      updateTwisterState(data);
      break;
    case "jackpot":
      showNotification("ДЖЕКПОТ! 7-7-7 ×100!", "#ffff00", 5000);
      updateTwisterState(data);
      break;
    case "bonusWin":
      showNotification("БОНУСНЫЙ ВЫИГРЫШ! ×3 к комбинации!", "#ffaa00", 5000);
      updateTwisterState(data);
      break;
  }
}

window.misterTwister = {
  initialize: initializeMisterTwister,
  checkProximity: checkMisterTwisterProximity,
  draw: drawMisterTwister, // ← важно! это для карты
  hideMenu: hideTwisterMenu,
  handleMessage: handleTwisterMessage,
  updateState: updateTwisterState,
};
