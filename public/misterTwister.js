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
  }
}

function animateDigitalReels(finalSymbols) {
  if (!slotSpriteReady) return;

  const canvases = [
    document.querySelector("#reel1 canvas"),
    document.querySelector("#reel2 canvas"),
    document.querySelector("#reel3 canvas"),
  ];

  if (!canvases[0]) return;

  const ctxs = canvases.map((c) => c.getContext("2d"));

  const TOTAL_DURATION = 5200;
  const SLOWDOWN_START = 3400;
  const BASE_SPEED = 0.32;

  let startTime = performance.now();

  function drawReel(ctx, progress, finalFrame, reelIndex) {
    ctx.clearRect(0, 0, 80, 100);

    let speed = BASE_SPEED;
    if (progress > SLOWDOWN_START) {
      const t = (progress - SLOWDOWN_START) / (TOTAL_DURATION - SLOWDOWN_START);
      speed *= 1 - t * 0.96;
    }

    // разная скорость для каждого барабана (эффект)
    const phase = reelIndex * 400;
    const virtualPos = (progress * speed + phase) % SLOT_SPRITE.frameCount;
    const frame = Math.floor(virtualPos);

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
      // финальная отрисовка
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

      // Запрос результата после остановки анимации
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({ type: "twister", subtype: "getResultAfterAnim" }),
        );
      }
    }
  }

  requestAnimationFrame(anim);
}

function updateTwisterState(data) {
  if (!isMenuOpen) return;

  const balanceEl = document.getElementById("twister-balance");
  if (data.balance !== undefined) {
    balanceEl.textContent = data.balance;
    balanceEl.dataset.count = data.balance;
  }

  const lights = document.querySelectorAll(".bonus-light");
  const points = Math.min(11, data.bonusPoints ?? 0);
  lights.forEach((el, i) => {
    el.classList.toggle("active", i < points);
  });

  const resultEl = document.getElementById("twister-result");

  if (data.error) {
    resultEl.textContent = data.error;
    resultEl.style.color = "#ff6666";
    isSpinning = false;
    document.getElementById("twister-spin-btn").disabled = false;
  }

  if (
    data.shouldShowResult &&
    data.resultText &&
    data.wonAmount !== undefined
  ) {
    let text = data.resultText;
    if (data.wonAmount > 0) {
      text += `<br><span style="font-size:1.5em;color:#ffd700;">+${data.wonAmount} баляров!</span>`;
    }
    resultEl.innerHTML = text;
    resultEl.style.color = data.wonAmount > 0 ? "#00ff88" : "#e0e0e0";

    if (data.isJackpot) {
      showNotification("БОЛЬШОЙ ДЖЕКПОТ! 75 баляров сорваны!", "#ffff00", 6000);
    } else if (data.wonAmount >= 100) {
      showNotification(
        `Крупный выигрыш: ${data.wonAmount} баляров!`,
        "#ffcc00",
        4000,
      );
    } else if (data.wonAmount >= 30) {
      showNotification(`Выигрыш: ${data.wonAmount} баляров`, "#00ff88", 3000);
    }
  }
}

function handleTwisterMessage(data) {
  switch (data.subtype) {
    case "state":
    case "spinResult":
    case "bonusWin":
    case "finalResult":
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
