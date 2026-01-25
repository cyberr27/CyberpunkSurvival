// misterTwister.js — поддержка нескольких автоматов

const TWISTER_LOCATIONS = [
  { id: "twister_0", x: 219, y: 2656, width: 70, height: 100 },
  { id: "twister_1", x: 391, y: 159, width: 70, height: 100 },
  { id: "twister_2", x: 1684, y: 421, width: 70, height: 100 },
];

const CONFIG = {
  frameCount: 13,
  frameWidth: 70,
  frameHeight: 100,
  animationDuration: 5000,
  pauseDuration: 10000,
  interactionRadiusSq: 4900, // ~70 px радиус
};

const SLOT_SPRITE = {
  src: "mister_twister_slot_sprite.png",
  frameWidth: 70,
  frameHeight: 70,
  frameCount: 10,
};

let sprites = {};
let slotSprite = null;
let slotSpriteReady = false;

const state = {}; // { "twister_0": { menuOpen: false, menuEl: null, ... }, ... }

function initializeMisterTwister() {
  slotSprite = new Image();
  slotSprite.src = SLOT_SPRITE.src;
  slotSprite.onload = () => {
    slotSpriteReady = true;
  };

  TWISTER_LOCATIONS.forEach((loc) => {
    const img = new Image();
    img.src = "mister_twister.png";
    img.onload = () => {
      sprites[loc.id] = img;
    };
    state[loc.id] = {
      animationStart: performance.now(),
      isMenuOpen: false,
      menuElement: null,
      wasInRangeLastFrame: false,
      isSpinning: false,
    };
  });
}

function checkMisterTwisterProximity() {
  const me = players.get(myId);
  if (!me || window.worldSystem.currentWorldId !== 0) {
    Object.values(state).forEach((s) => {
      if (s.isMenuOpen) hideTwisterMenu(s);
    });
    return;
  }

  TWISTER_LOCATIONS.forEach((loc) => {
    const s = state[loc.id];
    const dx = me.x + 35 - (loc.x + 35);
    const dy = me.y + 50 - (loc.y + 50);
    const nowInRange = dx * dx + dy * dy < CONFIG.interactionRadiusSq;

    if (nowInRange !== s.wasInRangeLastFrame) {
      nowInRange ? showTwisterMenu(loc.id) : hideTwisterMenu(s);
    }
    s.wasInRangeLastFrame = nowInRange;
  });
}

function updateLocalBalanceDisplay(twisterId, count = null) {
  const s = state[twisterId];
  if (!s.isMenuOpen || !s.menuElement) return;

  const el = s.menuElement.querySelector("#twister-balance");
  if (!el) return;

  if (count !== null) {
    el.textContent = count;
    el.dataset.count = count;
  } else {
    const invCount =
      window.inventory?.find((s) => s?.type === "balyary")?.quantity || 0;
    el.textContent = invCount;
    el.dataset.count = invCount;
  }
}

function showTwisterMenu(twisterId) {
  const s = state[twisterId];
  if (s.isMenuOpen) return;
  s.isMenuOpen = true;

  const loc = TWISTER_LOCATIONS.find((l) => l.id === twisterId);
  const title = loc ? loc.name : "Mister Twister";

  s.menuElement = document.createElement("div");
  s.menuElement.className = "npc-dialog open twister-full-window";
  s.menuElement.dataset.twisterId = twisterId;

  s.menuElement.innerHTML = `
    <div class="npc-dialog-content-mt" style="overflow: hidden;">
      <p class="npc-text-mt" style="text-align:center;">
        ${title}<br>
        Стоимость спина — <strong>1 баляр</strong><br>
        Баланс: <span id="twister-balance">…</span>
      </p>

      <div class="digital-slots">
        <div class="digital-reel" id="reel1"><canvas width="70" height="70"></canvas></div>
        <div class="digital-reel" id="reel2"><canvas width="70" height="70"></canvas></div>
        <div class="digital-reel" id="reel3"><canvas width="70" height="70"></canvas></div>
      </div>

      <button class="spin-button-mt" id="twister-spin-btn">1$</button>

      <p id="twister-result"></p>
    </div>

    <div class="bonus-lights" id="bonus-lights">
      ${Array.from({ length: 11 }, (_, i) => `<div class="bonus-light bonus-light-${i}"></div>`).join("")}
    </div>
  `;

  document.body.appendChild(s.menuElement);

  const original = window.inventorySystem.updateInventoryDisplay;
  window.inventorySystem.updateInventoryDisplay = function (...args) {
    original.apply(this, args);
    if (s.isMenuOpen) updateLocalBalanceDisplay(twisterId);
  };

  updateLocalBalanceDisplay(twisterId);

  s.menuElement
    .querySelector("#twister-spin-btn")
    ?.addEventListener("click", () => handleTwisterSpin(twisterId));

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "twister",
        subtype: "getState",
        twisterId,
      }),
    );
  }
}

function hideTwisterMenu(s) {
  if (!s.isMenuOpen) return;
  s.isMenuOpen = false;
  s.menuElement?.remove();
  s.menuElement = null;
  s.isSpinning = false;
}

function handleTwisterSpin(twisterId) {
  const s = state[twisterId];
  if (s.isSpinning) return;

  const balance =
    Number(s.menuElement?.querySelector("#twister-balance")?.dataset.count) ||
    0;
  if (balance < 1) {
    const resultEl = s.menuElement.querySelector("#twister-result");
    resultEl.textContent = "Недостаточно баляров!";
    resultEl.style.color = "#ff6666";
    return;
  }

  s.isSpinning = true;
  const btn = s.menuElement.querySelector("#twister-spin-btn");
  btn.disabled = true;

  const resultEl = s.menuElement.querySelector("#twister-result");
  resultEl.textContent = "";
  resultEl.style.color = "#e0e0e0";

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "twister",
        subtype: "spin",
        twisterId,
      }),
    );
  }
}

function animateReels(
  twisterId,
  finalFrames,
  winAmount = 0,
  isBonusWin = false,
) {
  const s = state[twisterId];
  if (!slotSpriteReady || !s.menuElement) {
    s.isSpinning = false;
    s.menuElement.querySelector("#twister-spin-btn").disabled = false;
    return;
  }

  const canvases = s.menuElement.querySelectorAll(".digital-reel canvas");
  const ctxs = Array.from(canvases).map((c) => c.getContext("2d"));

  const TOTAL_DURATION = 5000;
  const SLOWDOWN_FROM = 3200;
  const BASE_SPEED = 0.32;

  let start = performance.now();

  function drawOneReel(ctx, elapsed) {
    ctx.clearRect(0, 0, 70, 70);
    let speed = BASE_SPEED;
    if (elapsed > SLOWDOWN_FROM) {
      const t = (elapsed - SLOWDOWN_FROM) / (TOTAL_DURATION - SLOWDOWN_FROM);
      speed *= 1 - t * 0.94;
    }
    const pos = (elapsed * speed) % SLOT_SPRITE.frameCount;
    const frame = Math.floor(pos);
    ctx.drawImage(slotSprite, frame * 70, 0, 70, 70, 0, 0, 70, 70);
  }

  function loop() {
    const elapsed = performance.now() - start;
    ctxs.forEach((ctx) => drawOneReel(ctx, elapsed));

    if (elapsed < TOTAL_DURATION) {
      requestAnimationFrame(loop);
    } else {
      ctxs.forEach((ctx, i) => {
        ctx.clearRect(0, 0, 70, 70);
        ctx.drawImage(slotSprite, finalFrames[i] * 70, 0, 70, 70, 0, 0, 70, 70);
      });

      const resultEl = s.menuElement.querySelector("#twister-result");
      if (winAmount > 0) {
        let msg = winAmount;
        if (isBonusWin) msg = `БОЛЬШОЙ ДЖЕКПОТ! +${winAmount}`;
        resultEl.textContent = msg;
        resultEl.style.color = "#ff0000";
        window.showNotification?.(msg + " баляров!", "#ffff00");
      } else {
        resultEl.textContent = "0";
        resultEl.style.color = "#ff0000";
      }

      s.isSpinning = false;
      s.menuElement.querySelector("#twister-spin-btn").disabled = false;
      updateLocalBalanceDisplay(twisterId);
    }
  }

  requestAnimationFrame(loop);
}

function updateTwisterState(data) {
  const twisterId = data.twisterId;
  const s = state[twisterId];
  if (!s?.isMenuOpen || !s.menuElement) return;

  if (data.balance !== undefined) {
    const el = s.menuElement.querySelector("#twister-balance");
    if (el) {
      el.textContent = data.balance;
      el.dataset.count = data.balance;
    }
  }

  // Лампочки
  const points = Math.min(11, data.bonusPoints ?? 0);
  for (let i = 0; i < 11; i++) {
    const el = s.menuElement.querySelector(`.bonus-light-${i}`);
    el?.classList.toggle("active", i < points);
  }

  const resultEl = s.menuElement.querySelector("#twister-result");

  if (data.error) {
    resultEl.textContent = data.error;
    resultEl.style.color = "#ff6666";
    s.isSpinning = false;
    s.menuElement.querySelector("#twister-spin-btn").disabled = false;
    return;
  }

  if (data.shouldAnimate && data.symbols) {
    const match = data.symbols.match(/^(\d)\s+(\d)\s+(\d)$/);
    if (match) {
      const frames = [Number(match[1]), Number(match[2]), Number(match[3])];
      const win = Number(data.winAmount) || 0;
      const isBonus = data.subtype === "bonusWin";
      animateReels(twisterId, frames, win, isBonus);
    }
  } else if (!data.shouldAnimate) {
    resultEl.textContent = "";
  }
}

function handleTwisterMessage(data) {
  if (["state", "spinResult", "bonusWin"].includes(data.subtype)) {
    updateTwisterState(data);
  }
}

function drawMisterTwister() {
  if (window.worldSystem.currentWorldId !== 0) return;

  const cam = window.movementSystem.getCamera();

  TWISTER_LOCATIONS.forEach((loc) => {
    const img = sprites[loc.id];
    if (!img?.complete) return;

    const s = state[loc.id];
    const sx = loc.x - cam.x;
    const sy = loc.y - cam.y;

    if (
      sx + 100 < 0 ||
      sx > canvas.width + 40 ||
      sy + 140 < 0 ||
      sy > canvas.height + 40
    )
      return;

    const now = performance.now();
    const cycle = CONFIG.animationDuration + CONFIG.pauseDuration;
    const t = (now - s.animationStart) % cycle;

    let frame = 0;
    if (t < CONFIG.animationDuration) {
      frame = Math.floor((t * CONFIG.frameCount) / CONFIG.animationDuration);
    }

    ctx.drawImage(
      img,
      frame * CONFIG.frameWidth,
      0,
      CONFIG.frameWidth,
      CONFIG.frameHeight,
      sx,
      sy,
      loc.width,
      loc.height,
    );
  });
}

window.misterTwister = {
  initialize: initializeMisterTwister,
  checkProximity: checkMisterTwisterProximity,
  draw: drawMisterTwister,
  handleMessage: handleTwisterMessage,
};
