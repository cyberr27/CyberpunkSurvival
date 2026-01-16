// misterTwister.js — полностью исправленная версия (готов к копипасте)

const MISTER_TWISTER_POSITIONS = [
  { x: 210, y: 2713 },
  { x: 410, y: 2913 },
  { x: 610, y: 2213 },
];

const INTERACTION_DISTANCE_SQ = 50 * 50;
const ANIMATION_FPS = 13;
const ANIMATION_DURATION_MS = 5000;
const PAUSE_DURATION_MS = 10000;
const FULL_CYCLE_MS = ANIMATION_DURATION_MS + PAUSE_DURATION_MS;

// Кэшируем часто используемые значения для draw (были удалены по ошибке — возвращаем)
const frameWidth = 70;
const halfWidth = frameWidth / 2;
const spriteHeight = 100;
const yOffset = 80;

let misterTwisterDialog = null;
let currentClosestTwister = null;
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
    this.createDialogElementOnce();
    lastAnimationTime = performance.now();
  },

  createDialogElementOnce() {
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

    dialog.querySelector(".close-btn").onclick = () => this.closeDialog();
    document.getElementById("playTwisterBtn").onclick = () => this.startSpin();

    misterTwisterDialog = dialog;

    // Устанавливаем фон после загрузки изображения
    const bgImg = images.misterTwisterBg;
    if (bgImg && bgImg.complete) {
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

  startSpin() {
    if (isSpinning) return;
    sendWhenReady(ws, JSON.stringify({ type: "twisterPlay" }));
    // Клиент сразу начинает анимацию (результат придёт позже)
    this.spinReels([null, null, null]);
  },

  spinReels(finalReels) {
    isSpinning = true;
    document.getElementById("playTwisterBtn").disabled = true;
    document.getElementById("twisterMessage").textContent = "КРУТИТСЯ...";

    const reels = [
      document.getElementById("reel1"),
      document.getElementById("reel2"),
      document.getElementById("reel3"),
    ];

    const startTime = Date.now();
    const spinInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / REEL_SPIN_DURATION;

      reels.forEach((reel, i) => {
        if (finalReels && finalReels[i] !== null && progress > 0.6 + i * 0.2) {
          // Финальное значение с задержкой по барабанам
          reel.textContent = String(finalReels[i]).padStart(2, "0");
          reel.style.filter = "blur(0px)";
        } else {
          const randomNum = Math.floor(Math.random() * 40);
          reel.textContent = String(randomNum).padStart(2, "0");
          reel.style.filter = "blur(4px)";
        }
      });

      if (elapsed >= REEL_SPIN_DURATION + 1000) {
        clearInterval(spinInterval);
        reels.forEach((reel) => (reel.style.filter = "blur(0px)"));
        isSpinning = false;
        document.getElementById("playTwisterBtn").disabled = false;
      }
    }, 80);
  },

  updateState(jackpot, bonusSteps) {
    document.getElementById(
      "jackpotDisplay"
    ).textContent = `Джекпот: ${jackpot} баляров`;
    document.getElementById(
      "stepsDisplay"
    ).textContent = `Бонус: ${bonusSteps}/11`;
  },

  showResult(message) {
    document.getElementById("twisterMessage").textContent = message;
  },

  update(deltaTime) {
    const me = players.get(myId);
    if (!me) return;

    // Оптимизация: считаем только если мы в нужном мире
    if (me.worldId !== 0) {
      if (currentClosestTwister) this.closeDialog();
      return;
    }

    let closest = null;
    let minDistSq = Infinity;

    for (const pos of MISTER_TWISTER_POSITIONS) {
      const dx = me.x - pos.x;
      const dy = me.y - pos.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = pos;
      }
    }

    const nowInRange = minDistSq <= INTERACTION_DISTANCE_SQ;

    if (nowInRange !== !!currentClosestTwister) {
      if (nowInRange) {
        this.openDialog();
        currentClosestTwister = closest;
      } else {
        this.closeDialog();
      }
    }
  },

  openDialog() {
    if (!misterTwisterDialog || misterTwisterDialog.style.display === "block")
      return;
    misterTwisterDialog.style.display = "block";
    showNotification("Подошёл к Мистеру Твистеру", "#ff00aa");

    // Запрашиваем текущее состояние
    sendWhenReady(ws, JSON.stringify({ type: "requestTwisterState" }));
  },

  closeDialog() {
    if (!misterTwisterDialog || misterTwisterDialog.style.display === "none")
      return;
    misterTwisterDialog.style.display = "none";
    currentClosestTwister = null;
    document.getElementById("twisterMessage").textContent = "";
  },

  draw() {
    // Самый дешёвый способ получить текущее время
    const now = performance.now();
    const cycleTime = now % FULL_CYCLE_MS;

    const img = images.misterTwister;
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const camera = window.movementSystem.getCamera();

    for (const pos of MISTER_TWISTER_POSITIONS) {
      const screenX = pos.x - camera.x;
      const screenY = pos.y - camera.y;

      // Очень быстрая отсечка по экрану
      if (
        screenX < -80 ||
        screenX > canvas.width + 80 ||
        screenY < -180 ||
        screenY > canvas.height + 50
      )
        continue;

      let frame = 0;

      if (cycleTime < ANIMATION_DURATION_MS) {
        const progress = cycleTime / ANIMATION_DURATION_MS;
        frame = Math.floor(progress * ANIMATION_FPS);
      }
      // else → frame = 0 (пауза на первом кадре)

      ctx.drawImage(
        img,
        frame * frameWidth,
        0,
        frameWidth,
        spriteHeight,
        screenX - halfWidth,
        screenY - yOffset,
        frameWidth,
        spriteHeight
      );
    }
  },

  // Вызывается при сворачивании/разворачивании вкладки для коррекции времени
  syncTimeAfterPause() {
    lastAnimationTime = performance.now();
  },
};

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    window.misterTwisterSystem?.syncTimeAfterPause?.();
  }
});
