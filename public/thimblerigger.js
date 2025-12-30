// thimblerigger.js — Напёрсточник в Неоновом городе

const THIMBLERIGGER = {
  x: 228,
  y: 2882,
  width: 70,
  height: 70,
  interactionRadius: 80,
  name: "Напёрсточник",
  worldId: 0,
};

let isThimbleriggerMet = false;
let isThimbleriggerDialogOpen = false;
let thimbleriggerSprite = null;

// Анимация
let thimbleriggerFrame = 0;
let thimbleriggerFrameTime = 0;
const THIMBLERIGGER_FRAME_DURATION = 150; // ~10 FPS
const THIMBLERIGGER_TOTAL_FRAMES = 13;

// Кнопки над NPC
let thimbleriggerButtonsContainer = null;
let isPlayerNearThimblerigger = false;

// Флаг одноразового приветствия
let hasGreetingBeenShownThisSession = false;

function initializeThimbleriggerStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .thimblerigger-talk-btn {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.25), rgba(0, 150, 150, 0.35));
      color: #00ffff;
      border-color: #00ffff;
    }
    .thimblerigger-play-btn {
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(200, 150, 0, 0.35));
      color: #ffd700;
      border-color: #ffd700;
    }
    .thimblerigger-talk-btn:hover {
      background: rgba(0, 255, 255, 0.45);
      box-shadow: 0 0 25px rgba(0, 255, 255, 1);
      transform: scale(1.07);
    }
    .thimblerigger-play-btn:hover {
      background: rgba(255, 215, 0, 0.45);
      box-shadow: 0 0 25px rgba(255, 215, 0, 1);
      transform: scale(1.07);
    }
  `;
  document.head.appendChild(style);
}

function createThimbleriggerButtons() {
  if (thimbleriggerButtonsContainer) thimbleriggerButtonsContainer.remove();

  thimbleriggerButtonsContainer = document.createElement("div");
  thimbleriggerButtonsContainer.className = "npc-buttons-container";

  const talkBtn = document.createElement("div");
  talkBtn.className = "npc-button thimblerigger-talk-btn";
  talkBtn.textContent = "ГОВОРИТЬ";
  talkBtn.onclick = (e) => {
    e.stopPropagation();
    openThimbleriggerTalk();
  };

  const playBtn = document.createElement("div");
  playBtn.className = "npc-button thimblerigger-play-btn";
  playBtn.textContent = "ИГРАТЬ";
  playBtn.onclick = (e) => {
    e.stopPropagation();
    openThimbleriggerGame();
  };

  thimbleriggerButtonsContainer.appendChild(talkBtn);
  thimbleriggerButtonsContainer.appendChild(playBtn);
  document.body.appendChild(thimbleriggerButtonsContainer);
}

function removeThimbleriggerButtons() {
  if (thimbleriggerButtonsContainer) {
    thimbleriggerButtonsContainer.remove();
    thimbleriggerButtonsContainer = null;
  }
}

function updateThimbleriggerButtonsPosition(cameraX, cameraY) {
  if (!thimbleriggerButtonsContainer || !isPlayerNearThimblerigger) return;

  const screenX = THIMBLERIGGER.x - cameraX + 35;
  const screenY = THIMBLERIGGER.y - cameraY - 80;

  thimbleriggerButtonsContainer.style.left = `${screenX}px`;
  thimbleriggerButtonsContainer.style.top = `${screenY}px`;
}

function drawThimblerigger(deltaTime) {
  if (window.worldSystem.currentWorldId !== THIMBLERIGGER.worldId) return;

  const cameraX = window.movementSystem.getCamera().x;
  const cameraY = window.movementSystem.getCamera().y;
  const screenX = THIMBLERIGGER.x - cameraX;
  const screenY = THIMBLERIGGER.y - cameraY;

  // Анимация
  thimbleriggerFrameTime += deltaTime;
  if (thimbleriggerFrameTime >= THIMBLERIGGER_FRAME_DURATION) {
    thimbleriggerFrameTime -= THIMBLERIGGER_FRAME_DURATION;
    thimbleriggerFrame = (thimbleriggerFrame + 1) % THIMBLERIGGER_TOTAL_FRAMES;
  }

  if (thimbleriggerSprite?.complete) {
    ctx.drawImage(
      thimbleriggerSprite,
      thimbleriggerFrame * 70,
      0,
      70,
      70,
      screenX,
      screenY,
      70,
      70
    );
  } else {
    ctx.fillStyle = "#ff00ff";
    ctx.fillRect(screenX, screenY, 70, 70);
  }

  // Имя или "?"
  ctx.font = "bold 40px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 6;
  ctx.fillStyle = isThimbleriggerMet ? "#ffd700" : "#ffffff";
  ctx.strokeText(
    isThimbleriggerMet ? THIMBLERIGGER.name : "?",
    screenX + 35,
    screenY - 30
  );
  ctx.fillText(
    isThimbleriggerMet ? THIMBLERIGGER.name : "?",
    screenX + 35,
    screenY - 30
  );

  updateThimbleriggerButtonsPosition(cameraX, cameraY);
}

function checkThimbleriggerProximity() {
  const me = players.get(myId);
  if (!me || me.worldId !== THIMBLERIGGER.worldId || me.health <= 0) {
    if (isPlayerNearThimblerigger) {
      isPlayerNearThimblerigger = false;
      removeThimbleriggerButtons();
    }
    return;
  }

  const dx = me.x + 35 - (THIMBLERIGGER.x + 35);
  const dy = me.y + 35 - (THIMBLERIGGER.y + 35);
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < THIMBLERIGGER.interactionRadius) {
    if (!isPlayerNearThimblerigger) {
      isPlayerNearThimblerigger = true;
      if (isThimbleriggerMet) {
        createThimbleriggerButtons();
      }
    }

    // Одноразовое приветствие при первом приближении
    if (
      !isThimbleriggerMet &&
      !hasGreetingBeenShownThisSession &&
      ws?.readyState === WebSocket.OPEN
    ) {
      hasGreetingBeenShownThisSession = true;
      sendWhenReady(ws, JSON.stringify({ type: "meetThimblerigger" }));
    }
  } else {
    if (isPlayerNearThimblerigger) {
      isPlayerNearThimblerigger = false;
      removeThimbleriggerButtons();
    }
  }
}

function openThimbleriggerTalk() {
  if (isThimbleriggerDialogOpen) return;

  isThimbleriggerDialogOpen = true;
  document.body.classList.add("npc-dialog-active");

  const dialog = document.createElement("div");
  dialog.className = "npc-dialog open";
  dialog.innerHTML = `
    <div class="npc-dialog-header">
      <h2 class="npc-title">${THIMBLERIGGER.name}</h2>
    </div>
    <div class="npc-dialog-content">
      <p class="npc-text">Эй, сталкер! Хочешь рискнуть? Три напёрстка — один шарик.</p>
      <p class="npc-text">Угадаешь — удвою твою ставку. Проиграешь — баляры мои.</p>
      <p class="npc-text">Ставка от 1 до 10 баляров. Готов играть?</p>
    </div>
    <button class="neon-btn" onclick="window.thimbleriggerSystem.closeDialog()">ЗАКРЫТЬ</button>
  `;
  document.body.appendChild(dialog);
}

function openThimbleriggerGame() {
  if (isThimbleriggerDialogOpen) return;

  isThimbleriggerDialogOpen = true;
  document.body.classList.add("npc-dialog-active");

  const dialog = document.createElement("div");
  dialog.className = "npc-dialog open";
  dialog.innerHTML = `
    <div class="npc-dialog-header">
      <h2 class="npc-title">ИГРА В НАПЁРСТКИ</h2>
    </div>
    <div class="npc-dialog-content">
      <p class="npc-text">Пока в разработке...</p>
      <p class="npc-text">Но скоро ты сможешь попытать удачу!</p>
    </div>
    <button class="neon-btn" onclick="window.thimbleriggerSystem.closeDialog()">ЗАКРЫТЬ</button>
  `;
  document.body.appendChild(dialog);
}

function closeThimbleriggerDialog() {
  isThimbleriggerDialogOpen = false;
  document.body.classList.remove("npc-dialog-active");
  const dialog = document.querySelector(".npc-dialog.open");
  if (dialog) dialog.remove();
}

// ESC закрытие
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isThimbleriggerDialogOpen) {
    closeThimbleriggerDialog();
  }
});

// Серверная синхронизация
function setThimbleriggerMet(met) {
  isThimbleriggerMet = met;
  hasGreetingBeenShownThisSession = met;
  if (!met) {
    removeThimbleriggerButtons();
  }
}

// Экспорт системы
window.thimbleriggerSystem = {
  drawThimblerigger,
  checkThimbleriggerProximity,
  setThimbleriggerMet,
  closeDialog: closeThimbleriggerDialog,
  initialize: (sprite) => {
    thimbleriggerSprite = sprite;
    initializeThimbleriggerStyles();
    hasGreetingBeenShownThisSession = false;
  },
};
