// misterTwister.js — версия как у vendingMachine: открывается/закрывается строго по расстоянию

const MISTER_TWISTER = {
  x: 210, // ← поменяй координаты под свою карту
  y: 2713,
  interactionRadius: 50, // радиус взаимодействия в пикселях
  name: "Мистер Твистер",
};

const ANIMATION_FPS = 13;
const ANIMATION_DURATION_MS = 5000;
const PAUSE_DURATION_MS = 10000;
const FULL_CYCLE_MS = ANIMATION_DURATION_MS + PAUSE_DURATION_MS;

const frameWidth = 70;
const halfWidth = frameWidth / 2;
const spriteHeight = 100;
const yOffset = 80;

let misterTwisterDialog = null;
let lastAnimationTime = 0;
let isSpinning = false;

const REEL_SPIN_DURATION = 3000;

window.misterTwisterSystem = {
  initialize() {
    if (!imageSources.misterTwister) {
      imageSources.misterTwister = "mister_twister.png";
    }
    if (!imageSources.misterTwisterBg) {
      imageSources.misterTwisterBg = "mister_twister_bg.png";
    }
    this.createDialog();
    lastAnimationTime = performance.now();
  },

  createDialog() {
    if (document.getElementById("misterTwisterDialog")) return;

    const dialog = document.createElement("div");
    dialog.id = "misterTwisterDialog";
    dialog.className = "npc-dialog mister-twister-dialog";
    dialog.style.display = "none";

    dialog.innerHTML = `
      <div class="npc-header">
        <span class="npc-name">Мистер Твистер</span>
        <button class="close-btn">×</button>
      </div>
      <div class="npc-content">
        <div class="twister-machine-view" id="twisterMachineView">
          <div class="reels-container">
            <div class="reel" id="reel1">00</div>
            <div class="reel" id="reel2">00</div>
            <div class="reel" id="reel3">00</div>
          </div>
          <div class="twister-info">
            <div id="jackpotDisplay">Джекпот: 0 баляров</div>
            <div id="stepsDisplay">Бонус: 0/11</div>
            <div id="twisterMessage"></div>
          </div>
          <button id="playTwisterBtn" class="twister-play-btn">ИГРАТЬ (1 баляр)</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector(".close-btn").onclick = () => {
      dialog.style.display = "none";
    };

    document.getElementById("playTwisterBtn").onclick = () => {
      if (isSpinning) return;
      sendWhenReady(ws, JSON.stringify({ type: "twisterPlay" }));
      this.spinReels([null, null, null]);
    };

    misterTwisterDialog = dialog;

    // Фон автомата
    const bgImg = images.misterTwisterBg;
    if (bgImg?.complete) {
      document.getElementById(
        "twisterMachineView"
      ).style.backgroundImage = `url(${bgImg.src})`;
    } else if (bgImg) {
      bgImg.onload = () => {
        document.getElementById(
          "twisterMachineView"
        ).style.backgroundImage = `url(${bgImg.src})`;
      };
    }
  },

  spinReels(finalReels) {
    isSpinning = true;
    const btn = document.getElementById("playTwisterBtn");
    if (btn) btn.disabled = true;

    const msg = document.getElementById("twisterMessage");
    if (msg) msg.textContent = "КРУТИТСЯ...";

    const reels = [
      document.getElementById("reel1"),
      document.getElementById("reel2"),
      document.getElementById("reel3"),
    ];

    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = elapsed / REEL_SPIN_DURATION;

      reels.forEach((reel, i) => {
        if (finalReels?.[i] != null && progress > 0.6 + i * 0.2) {
          reel.textContent = String(finalReels[i]).padStart(2, "0");
          reel.style.filter = "blur(0px)";
        } else {
          const num = Math.floor(Math.random() * 40);
          reel.textContent = String(num).padStart(2, "0");
          reel.style.filter = "blur(4px)";
        }
      });

      if (elapsed >= REEL_SPIN_DURATION + 1000) {
        clearInterval(interval);
        reels.forEach((r) => (r.style.filter = "blur(0px)"));
        isSpinning = false;
        if (btn) btn.disabled = false;
      }
    }, 80);
  },

  updateState(jackpot, bonusSteps) {
    const j = document.getElementById("jackpotDisplay");
    const s = document.getElementById("stepsDisplay");
    if (j) j.textContent = `Джекпот: ${jackpot} баляров`;
    if (s) s.textContent = `Бонус: ${bonusSteps}/11`;
  },

  showResult(message) {
    const el = document.getElementById("twisterMessage");
    if (el) el.textContent = message;
  },

  checkProximity() {
    const me = players.get(myId);
    if (!me || !misterTwisterDialog) return;

    const dx = me.x - MISTER_TWISTER.x;
    const dy = me.y - MISTER_TWISTER.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= MISTER_TWISTER.interactionRadius) {
      if (misterTwisterDialog.style.display !== "block") {
        misterTwisterDialog.style.display = "block";
        showNotification("Подошёл к Мистеру Твистеру", "#ff00aa");
        sendWhenReady(ws, JSON.stringify({ type: "requestTwisterState" }));
      }
    } else {
      if (misterTwisterDialog.style.display !== "none") {
        misterTwisterDialog.style.display = "none";
      }
    }
  },

  update(deltaTime) {
    this.checkProximity();
  },

  draw() {
    const now = performance.now();
    const cycleTime = now % FULL_CYCLE_MS;

    const img = images.misterTwister;
    if (!img || !img.complete) return;

    const cam = window.movementSystem.getCamera();
    const sx = MISTER_TWISTER.x - cam.x;
    const sy = MISTER_TWISTER.y - cam.y;

    if (
      sx < -80 ||
      sx > canvas.width + 80 ||
      sy < -180 ||
      sy > canvas.height + 50
    )
      return;

    let frame = 0;
    if (cycleTime < ANIMATION_DURATION_MS) {
      frame = Math.floor((cycleTime / ANIMATION_DURATION_MS) * ANIMATION_FPS);
    }

    ctx.drawImage(
      img,
      frame * frameWidth,
      0,
      frameWidth,
      spriteHeight,
      sx - halfWidth,
      sy - yOffset,
      frameWidth,
      spriteHeight
    );
  },

  syncTimeAfterPause() {
    lastAnimationTime = performance.now();
  },
};

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    window.misterTwisterSystem?.syncTimeAfterPause?.();
  }
});
