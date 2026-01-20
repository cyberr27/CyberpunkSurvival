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
    balyarySlot !== -1 ? window.inventory[balyarySlot]?.quantity || 1 : 0;

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
        <div class="digital-reel" id="reel1"><canvas width="80" height="100"></canvas></div>
        <div class="digital-reel" id="reel2"><canvas width="80" height="100"></canvas></div>
        <div class="digital-reel" id="reel3"><canvas width="80" height="100"></canvas></div>
      </div>

      <button class="spin-button" id="twister-spin-btn">КРУТИТЬ!</button>

      <p id="twister-result" style="text-align:center; min-height:2.2em; margin-top:16px;"></p>
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

function animateDigitalReels(finalSymbols) {
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

  // Параметры замедления — ТАК ЖЕ КАК БЫЛО
  const TOTAL_DURATION = 5000;
  const SLOWDOWN_START = 3200;
  const BASE_SPEED = 0.28;

  let startTime = performance.now();

  function drawReel(ctx, progress, finalFrame, reelIndex) {
    ctx.clearRect(0, 0, 80, 100);

    let currentSpeed = BASE_SPEED;
    if (progress > SLOWDOWN_START) {
      const t = (progress - SLOWDOWN_START) / (TOTAL_DURATION - SLOWDOWN_START);
      currentSpeed = BASE_SPEED * (1 - t * 0.92);
    }

    // Разная фаза для каждого барабана (как в старых автоматах)
    const phaseOffset = reelIndex * 400;
    const virtualPosition =
      (progress * currentSpeed + phaseOffset) % SLOT_SPRITE.frameCount;
    const frame = Math.floor(virtualPosition);

    ctx.drawImage(
      slotSprite,
      frame * SLOT_SPRITE.frameWidth,
      0,
      SLOT_SPRITE.frameWidth,
      SLOT_SPRITE.frameHeight,
      0,
      0,
      80,
      100,
    );
  }

  function anim() {
    const now = performance.now();
    const elapsed = now - startTime;

    ctxs.forEach((ctx, i) => drawReel(ctx, elapsed, finalSymbols[i], i));

    if (elapsed < TOTAL_DURATION) {
      requestAnimationFrame(anim);
    } else {
      // Финальная остановка
      ctxs.forEach((ctx, i) => {
        ctx.clearRect(0, 0, 80, 100);
        ctx.drawImage(
          slotSprite,
          finalSymbols[i] * SLOT_SPRITE.frameWidth,
          0,
          SLOT_SPRITE.frameWidth,
          SLOT_SPRITE.frameHeight,
          0,
          0,
          80,
          100,
        );
      });

      isSpinning = false;
      const btn = document.getElementById("twister-spin-btn");
      if (btn) btn.disabled = false;
    }
  }

  requestAnimationFrame(anim);
}

function updateTwisterState(data) {
  if (!isMenuOpen) return;

  // Обновляем баланс
  const balanceEl = document.getElementById("twister-balance");
  if (data.balance !== undefined) {
    balanceEl.textContent = data.balance;
    balanceEl.dataset.count = data.balance;
  }

  // Обновляем бонусные лампочки
  const lights = document.querySelectorAll(".bonus-light");
  const points = Math.min(11, data.bonusPoints ?? 0);
  lights.forEach((el, i) => el.classList.toggle("active", i < points));

  const resultEl = document.getElementById("twister-result");

  if (data.error) {
    resultEl.textContent = data.error;
    resultEl.style.color = "#ff6666";
    return;
  }

  // ← ВОТ ЗДЕСЬ АНИМАЦИЯ! (ТОЧНО КАК БЫЛО)
  if (data.shouldAnimate && data.result) {
    const match = data.result.match(/(\d)\s+(\d)\s+(\d)/);
    if (match) {
      const symbols = [+match[1], +match[2], +match[3]];
      animateDigitalReels(symbols); // ← АНИМАЦИЯ СТАРТУЕТ ЗДЕСЬ!

      // Показываем результат ПОСЛЕ анимации (через 5.2 сек)
      setTimeout(() => {
        resultEl.innerHTML = data.result;
        resultEl.style.color = data.won ? "#00ff88" : "#e0e0e0";

        // Нотификация о выигрыше
        if (data.wonAmount && data.wonAmount > 0) {
          showNotification(`+${data.wonAmount} баляров!`, "#00ff88");
        }
      }, 5200);
    } else {
      // Джекпот или особый текст
      resultEl.innerHTML = data.result;
      resultEl.style.color = "#ffff00";
      showNotification("🎰 ДЖЕКПОТ! 🎰", "#ffff00");
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
