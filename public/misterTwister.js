// misterTwister.js

const MISTER_TWISTER_POSITIONS = [
  { x: 210, y: 2713 },
  { x: 410, y: 2913 },
  { x: 610, y: 2213 },
];

const INTERACTION_RADIUS = 50;
const ANIMATION_FPS = 13;
const ANIMATION_DURATION_MS = 5000;
const PAUSE_DURATION_MS = 10000;
const FULL_CYCLE_MS = ANIMATION_DURATION_MS + PAUSE_DURATION_MS;

const FRAME_WIDTH = 70;
const SPRITE_HEIGHT = 100;

let dialogElement = null;
let isSpinning = false;

window.misterTwisterSystem = {
  activeMachine: null, // {x,y} ближайшего автомата или null

  initialize() {
    console.log("Инициализация Mister Twister системы");
    this.createDialog();
    // Добавляем загрузку фона, если ещё не загружен
    if (!images.misterTwisterBg) {
      const img = new Image();
      img.src = "mister_twister_bg.png";
      images.misterTwisterBg = img;
    }
  },

  createDialog() {
    if (document.getElementById("misterTwisterDialog")) {
      console.log("Диалог Mister Twister уже существует");
      return;
    }

    const div = document.createElement("div");
    div.id = "misterTwisterDialog";
    div.className = "npc-dialog mister-twister-dialog";
    div.style.display = "none";

    div.innerHTML = `
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
            <div id="jackpotDisplay">Джекпот: —</div>
            <div id="stepsDisplay">Бонус: —/10</div>
            <div id="twisterMessage" class="message"></div>
          </div>
          <button id="playTwisterBtn" class="twister-play-btn" disabled>
            ИГРАТЬ (1 баляр)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(div);
    dialogElement = div;

    console.log("Диалог Mister Twister создан и добавлен в DOM");

    // Обработчики
    div.querySelector(".close-btn").onclick = () => this.hideDialog();

    const playBtn = document.getElementById("playTwisterBtn");
    playBtn.onclick = () => {
      if (isSpinning) return;
      sendWhenReady(ws, JSON.stringify({ type: "twisterPlay" }));
      this.startSpinAnimation();
    };
  },

  showDialog() {
    if (!dialogElement) {
      console.error("Диалог Mister Twister не создан!");
      return;
    }
    dialogElement.style.display = "block";
    console.log("Диалог Mister Twister открыт (display: block)");

    // Запрашиваем актуальное состояние
    sendWhenReady(ws, JSON.stringify({ type: "requestTwisterState" }));
  },

  hideDialog() {
    if (!dialogElement) return;
    dialogElement.style.display = "none";
    isSpinning = false;
    document.getElementById("playTwisterBtn")?.removeAttribute("disabled");
    console.log("Диалог Mister Twister закрыт");
  },

  updateState(jackpot, bonusSteps) {
    document
      .getElementById("jackpotDisplay")
      ?.setTextContent(`Джекпот: ${jackpot} баляров`);
    document
      .getElementById("stepsDisplay")
      ?.setTextContent(`Бонус: ${bonusSteps}/10`);
  },

  startSpinAnimation() {
    isSpinning = true;
    const btn = document.getElementById("playTwisterBtn");
    if (btn) btn.disabled = true;

    const msgEl = document.getElementById("twisterMessage");
    if (msgEl) msgEl.textContent = "КРУТИТСЯ...";

    const reels = [1, 2, 3].map((i) => document.getElementById(`reel${i}`));

    let start = performance.now();

    const animate = (now) => {
      const elapsed = now - start;
      const progress = elapsed / 3000;

      reels.forEach((reel) => {
        const num = Math.floor(Math.random() * 40);
        reel.textContent = String(num).padStart(2, "0");
      });

      if (elapsed < 3000) {
        requestAnimationFrame(animate);
      } else {
        // Здесь будет ждать реального результата от сервера
      }
    };

    requestAnimationFrame(animate);
  },

  showResult({ reels, win, message, jackpot, bonusSteps, jackpotWon }) {
    isSpinning = false;
    const btn = document.getElementById("playTwisterBtn");
    if (btn) btn.disabled = false;

    // Останавливаем рандом и показываем финальные значения
    [1, 2, 3].forEach((i, idx) => {
      const reel = document.getElementById(`reel${i}`);
      reel.textContent = String(reels[idx]).padStart(2, "0");
    });

    document.getElementById("twisterMessage").textContent = message;

    this.updateState(jackpot, bonusSteps);

    if (win > 0) {
      showNotification(`+${win} баляров!`, "#00ff88");
      if (jackpotWon) {
        showNotification("★★★ ДЖЕКПОТ ВЗЯТ! ★★★", "#ffff00", 5000);
      }
    } else {
      showNotification("Попробуй ещё раз...", "#ff8800");
    }

    // Обновляем инвентарь
    if (window.inventorySystem) window.inventorySystem.updateInventoryDisplay();
    updateStatsDisplay();
  },

  checkProximity() {
    const me = players.get(myId);
    if (!me || window.worldSystem.currentWorldId !== 0) return;

    let closest = null;
    let minDist = Infinity;

    for (const pos of MISTER_TWISTER_POSITIONS) {
      const dx = me.x - pos.x;
      const dy = me.y - pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < minDist) {
        minDist = dist;
        closest = pos;
      }
    }

    const shouldBeOpen = minDist <= INTERACTION_RADIUS;

    if (shouldBeOpen) {
      if (this.activeMachine !== closest) {
        this.activeMachine = closest;
        this.showDialog();
        showNotification("Мистер Твистер рядом!", "#ff00aa");
      }
    } else {
      if (this.activeMachine !== null) {
        this.hideDialog();
        this.activeMachine = null;
      }
    }
  },

  update() {
    this.checkProximity();
  },

  draw() {
    const now = performance.now();
    const cycle = now % FULL_CYCLE_MS;
    let frame = 0;

    if (cycle < ANIMATION_DURATION_MS) {
      frame = Math.floor((cycle / ANIMATION_DURATION_MS) * ANIMATION_FPS);
    }

    const img = images.misterTwister;
    if (!img?.complete) return;

    const cam = window.movementSystem.getCamera();

    for (const pos of MISTER_TWISTER_POSITIONS) {
      const sx = pos.x - cam.x;
      const sy = pos.y - cam.y;

      if (
        sx < -100 ||
        sx > canvas.width + 100 ||
        sy < -150 ||
        sy > canvas.height + 50
      )
        continue;

      ctx.drawImage(
        img,
        frame * FRAME_WIDTH,
        0,
        FRAME_WIDTH,
        SPRITE_HEIGHT,
        sx - FRAME_WIDTH / 2,
        sy - 80,
        FRAME_WIDTH,
        SPRITE_HEIGHT
      );
    }
  },
};
