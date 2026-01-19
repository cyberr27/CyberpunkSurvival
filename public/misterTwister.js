// misterTwister.js — цифровий автомат, горизонтальні 70x70 екрани, вертикальна анімація

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

const SLOT_SPRITE = {
  src: "mister_twister_slot_sprite.png",
  frameWidth: 70,
  frameHeight: 70,
  frameCount: 10, // 0..9 зверху вниз
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
        Вартість спіна — <strong>1 баляр</strong><br>
        Баланс: <span id="twister-balance">завантажується...</span>
      </p>

      <div class="digital-slots">
        <div class="digital-reel" id="reel1"><canvas width="70" height="70"></canvas></div>
        <div class="digital-reel" id="reel2"><canvas width="70" height="70"></canvas></div>
        <div class="digital-reel" id="reel3"><canvas width="70" height="70"></canvas></div>
      </div>

      <button class="spin-button" id="twister-spin-btn">КРУТИТИ!</button>

      <p id="twister-result" style="text-align:center; min-height:2.2em; margin-top:16px;"></p>
    </div>

    <div class="bonus-lights" id="bonus-lights">
      ${Array(11).fill('<div class="bonus-light"></div>').join("")}
    </div>
  `;

  document.body.appendChild(menuElement);

  updateLocalBalanceDisplay();

  document.getElementById("twister-spin-btn")?.addEventListener("click", () => {
    if (isSpinning) return;

    const balanceEl = document.getElementById("twister-balance");
    if (Number(balanceEl?.dataset.count) < 1) {
      document.getElementById("twister-result").textContent =
        "Недостатньо балярів!";
      return;
    }

    isSpinning = true;
    document.getElementById("twister-spin-btn").disabled = true;

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "twister", subtype: "spin" }));
    }
  });
}

function hideTwisterMenu() {
  if (!isMenuOpen) return;
  isMenuOpen = false;
  menuElement?.remove();
  menuElement = null;
  isSpinning = false;
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
  const TOTAL_DURATION = 5000;
  const SLOWDOWN_START = 3200;
  const BASE_SPEED = 0.32;

  let startTime = performance.now();

  function drawReel(ctx, progress, finalFrame) {
    ctx.clearRect(0, 0, 70, 70);

    let speed = BASE_SPEED;
    if (progress > SLOWDOWN_START) {
      const t = (progress - SLOWDOWN_START) / (TOTAL_DURATION - SLOWDOWN_START);
      speed *= 1 - t * 0.94;
    }

    const pos = (progress * speed) % SLOT_SPRITE.frameCount;
    const frame = Math.floor(pos);

    ctx.drawImage(
      slotSprite,
      0,
      frame * SLOT_SPRITE.frameHeight,
      SLOT_SPRITE.frameWidth,
      SLOT_SPRITE.frameHeight,
      0,
      0,
      70,
      70,
    );
  }

  function loop() {
    const elapsed = performance.now() - startTime;

    ctxs.forEach((ctx, i) => drawReel(ctx, elapsed, finalSymbols[i]));

    if (elapsed < TOTAL_DURATION) {
      requestAnimationFrame(loop);
    } else {
      // фінальна зупинка
      ctxs.forEach((ctx, i) => {
        ctx.clearRect(0, 0, 70, 70);
        ctx.drawImage(
          slotSprite,
          0,
          finalSymbols[i] * SLOT_SPRITE.frameHeight,
          SLOT_SPRITE.frameWidth,
          SLOT_SPRITE.frameHeight,
          0,
          0,
          70,
          70,
        );
      });

      isSpinning = false;
      document.getElementById("twister-spin-btn")?.removeAttribute("disabled");
    }
  }

  requestAnimationFrame(loop);
}

function updateTwisterState(data) {
  if (!isMenuOpen) return;

  // Оновлюємо баланс завжди, коли приходить відповідь
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

  document
    .querySelectorAll(".bonus-light")
    .forEach((el, i) => el.classList.toggle("active", i < bonusPoints));

  const resultEl = document.getElementById("twister-result");

  if (data.error) {
    resultEl.textContent = data.error;
    resultEl.style.color = "#ff6666";
    isSpinning = false;
    document.getElementById("twister-spin-btn")?.removeAttribute("disabled");
    return;
  }

  if (data.shouldAnimate && data.result) {
    const match = data.result.match(/(\d)\s+(\d)\s+(\d)/);
    let notificationText = "";
    let color = "#e0e0e0";

    if (match) {
      const symbols = [+match[1], +match[2], +match[3]];
      animateDigitalReels(symbols);

      notificationText = `Випало: ${symbols.join(" ")}`;

      if (data.won) {
        const winText = data.result.includes("БОЛЬШОЙ БОНУС")
          ? "75 балярів! ДЖЕКПОТ!"
          : `+${data.balance || "?"} балярів`;
        notificationText += ` — ВИГРАШ! ${winText}`;
        color = "#00ff88";
      }

      showNotification(notificationText, color, 5000);

      resultEl.innerHTML = data.result;
      resultEl.style.color = data.won ? "#00ff88" : "#e0e0e0";
    } else {
      resultEl.innerHTML = data.result;
      resultEl.style.color = "#ffff00";
      showNotification(data.result, "#ffff00", 6000);
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
      console.warn("Невідомий підтип twister:", data.subtype);
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
