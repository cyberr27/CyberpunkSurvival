// misterTwister.js — цифровая версия с тремя табло и замедлением

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

const SLOT_SPRITE = {
  src: "mister_twister_slot_sprite.png",
  frameWidth: 80,
  frameHeight: 100,
  frameCount: 10, // 0..9
};

let sprite = null;
let slotSprite = null;
let spriteReady = false;
let slotSpriteReady = false;
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

  slotSprite = new Image();
  slotSprite.src = SLOT_SPRITE.src;
  slotSprite.onload = () => {
    slotSpriteReady = true;
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

  if (nowInRange !== wasInRangeLastFrame) {
    nowInRange ? showTwisterMenu() : hideTwisterMenu();
  }

  wasInRangeLastFrame = nowInRange;
}

function updateLocalBalanceDisplay() {
  if (!isMenuOpen) return;

  const balyarySlot = window.inventory.findIndex((s) => s?.type === "balyary");
  const count =
    balyarySlot !== -1 ? window.inventory[balyarySlot]?.quantity || 0 : 0;

  const el = document.getElementById("twister-balance");
  if (el) {
    el.textContent = count;
    el.dataset.count = count;
  }
}

function showTwisterMenu() {
  if (isMenuOpen) return;
  isMenuOpen = true;

  menuElement = document.createElement("div");
  menuElement.className = "npc-dialog open twister-full-window";

  menuElement.innerHTML = `
    <div class="npc-dialog-content">
      <p class="npc-text" style="text-align:center; margin:12px 0;">
        Стоимость спина — <strong>1 баляр</strong><br>
        Баланс: <span id="twister-balance">загружается...</span>
      </p>

      <div class="digital-slots">
        <div class="digital-reel" id="reel1"><canvas width="84" height="108"></canvas></div>
        <div class="digital-reel" id="reel2"><canvas width="84" height="108"></canvas></div>
        <div class="digital-reel" id="reel3"><canvas width="84" height="108"></canvas></div>
      </div>

      <button class="spin-button" id="twister-spin-btn">КРУТИТЬ!</button>

      <p id="twister-result"></p>
    </div>

    <div class="bonus-lights" id="bonus-lights">
  <div class="bonus-light bonus-light-0"></div>
  <div class="bonus-light bonus-light-1"></div>
  <div class="bonus-light bonus-light-2"></div>
  <div class="bonus-light bonus-light-3"></div>
  <div class="bonus-light bonus-light-4"></div>
  <div class="bonus-light bonus-light-5"></div>
  <div class="bonus-light bonus-light-6"></div>
  <div class="bonus-light bonus-light-7"></div>
  <div class="bonus-light bonus-light-8"></div>
  <div class="bonus-light bonus-light-9"></div>
  <div class="bonus-light bonus-light-10"></div>
</div>
  `;

  document.body.appendChild(menuElement);

  const originalUpdate = window.inventorySystem.updateInventoryDisplay;
  window.inventorySystem.updateInventoryDisplay = function (...args) {
    originalUpdate.apply(this, args);
    if (isMenuOpen) updateLocalBalanceDisplay();
  };

  updateLocalBalanceDisplay();

  document
    .getElementById("twister-spin-btn")
    ?.addEventListener("click", handleTwisterSpin);

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

  document.getElementById("twister-result").textContent = "";

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "twister", subtype: "spin" }));
  } else {
    showError("Ошибка соединения...");
  }
}

function showError(msg) {
  const resultEl = document.getElementById("twister-result");
  if (resultEl) {
    resultEl.textContent = msg;
    resultEl.style.color = "#ff6666";
  }
  isSpinning = false;
  const btn = document.getElementById("twister-spin-btn");
  if (btn) btn.disabled = false;
}

function animateDigitalReels(finalSymbols, winAmount, resultText) {
  if (!slotSpriteReady) {
    showError("Спрайт цифр не загрузился...");
    return;
  }

  const canvases = [
    document.querySelector("#reel1 canvas"),
    document.querySelector("#reel2 canvas"),
    document.querySelector("#reel3 canvas"),
  ];

  if (!canvases[0]) return;

  const ctxs = canvases.map((c) => c.getContext("2d"));

  const TOTAL_DURATION = 5200;
  const SLOWDOWN_START = 3400;
  const BASE_SPEED = 0.3;

  let startTime = performance.now();

  function drawReel(ctx, progress, finalFrame) {
    ctx.clearRect(0, 0, 84, 108);

    let currentSpeed = BASE_SPEED;
    if (progress > SLOWDOWN_START) {
      const t = (progress - SLOWDOWN_START) / (TOTAL_DURATION - SLOWDOWN_START);
      currentSpeed = BASE_SPEED * (1 - t * 0.94);
    }

    const virtualPosition = (progress * currentSpeed) % SLOT_SPRITE.frameCount;
    let frame = Math.floor(virtualPosition);

    ctx.drawImage(
      slotSprite,
      frame * SLOT_SPRITE.frameWidth,
      0,
      SLOT_SPRITE.frameWidth,
      SLOT_SPRITE.frameHeight,
      0,
      0,
      84,
      108,
    );
  }

  function anim() {
    const now = performance.now();
    const elapsed = now - startTime;

    ctxs.forEach((ctx, i) => drawReel(ctx, elapsed, finalSymbols[i]));

    if (elapsed < TOTAL_DURATION) {
      requestAnimationFrame(anim);
    } else {
      // Окончательная отрисовка
      ctxs.forEach((ctx, i) => {
        ctx.clearRect(0, 0, 84, 108);
        ctx.drawImage(
          slotSprite,
          finalSymbols[i] * SLOT_SPRITE.frameWidth,
          0,
          SLOT_SPRITE.frameWidth,
          SLOT_SPRITE.frameHeight,
          0,
          0,
          84,
          108,
        );
      });

      // Показываем результат ПОСЛЕ остановки
      const resultEl = document.getElementById("twister-result");
      if (resultEl) {
        let html = resultText || `${finalSymbols.join(" ")}`;
        if (winAmount > 0) {
          html += `<span class="win-amount">+${winAmount} баляров!</span>`;
          resultEl.classList.add("win");
        } else {
          resultEl.classList.remove("win");
        }
        resultEl.innerHTML = html;
      }

      isSpinning = false;
      const btn = document.getElementById("twister-spin-btn");
      if (btn) btn.disabled = false;
    }
  }

  requestAnimationFrame(anim);
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

  document.querySelectorAll(".bonus-light").forEach((el, i) => {
    el.classList.toggle("active", i < bonusPoints);
  });

  const resultEl = document.getElementById("twister-result");

  if (data.error) {
    resultEl.textContent = data.error;
    resultEl.style.color = "#ff6666";
    resultEl.classList.remove("win");
  }

  if (data.shouldAnimate && data.result && data.finalSymbols) {
    const symbols = data.finalSymbols;
    const winAmount = data.winAmount || 0;
    let resultText = data.result;

    animateDigitalReels(symbols, winAmount, resultText);

    if (data.jackpot) {
      showNotification("БОЛЬШОЙ ДЖЕКПОТ! 75 баляров сорван!", "#ffff00");
    } else if (winAmount > 0) {
      showNotification(`Выигрыш: +${winAmount} баляров!`, "#00ff88");
    }
  }
}

function handleTwisterMessage(data) {
  switch (data.subtype) {
    case "state":
    case "spinResult":
    case "bonusWin":
      updateTwisterState(data);
      break;
    default:
      console.warn("Неизвестный подтип twister:", data.subtype);
  }
}

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
};
