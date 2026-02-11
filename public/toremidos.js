// toremidos.js

const TOREMIDOS_CONFIG = {
  x: 575,
  y: 1140,
  width: 70,
  height: 70,
  interactionRadius: 80,
  name: "Мастер Торемидос",
  worldId: 0,
};

const TOREMIDOS_MAIN_PHASE_DURATION = 14000;
const TOREMIDOS_ACTIVE_PHASE_DURATION = 5000;
const TOREMIDOS_FRAME_DURATION = 180;
const TOREMIDOS_TOTAL_FRAMES = 13;
const TOREMIDOS_MAX_DELTA = 1000;

let toremidosIsMet = false;
let toremidosIsNear = false;
let toremidosIsDialogOpen = false;

let toremidosSprite = null;
let toremidosButtonsContainer = null;
let toremidosDialogElement = null;

let toremidosFrame = 0;
let toremidosFrameTime = 0;
let toremidosCycleTime = 0;
let toremidosCurrentPhase = "main";

function toremidosOpenGreeting() {
  if (toremidosIsDialogOpen) return;
  toremidosIsDialogOpen = true;
  document.body.classList.add("toremidos-dialog-active");

  toremidosDialogElement = document.createElement("div");
  toremidosDialogElement.className = "toremidos-dialog open";
  toremidosDialogElement.innerHTML = `
    <div class="toremidos-dialog-header">
      <h2 class="toremidos-title">Торемидос</h2>
    </div>
    <div class="toremidos-dialog-content">
      <p class="toremidos-text">Эй, ты... Первый раз вижу тебя здесь.</p>
      <p class="toremidos-text">Я Торемидос. Не люблю незнакомцев, но ты не похож на корпоративную шавку.</p>
      <p class="toremidos-text">Говори, чего хотел, или вали отсюда.</p>
    </div>
    <button class="toremidos-neon-btn" id="toremidos-greeting-continue">
      Понял, давай знакомиться
    </button>
  `;
  document.body.appendChild(toremidosDialogElement);

  const continueBtn = document.getElementById("toremidos-greeting-continue");
  if (continueBtn) {
    continueBtn.onclick = () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "meetToremidos" }));
      }
      toremidosCloseDialog();
    };
  }
}

function toremidosOpenDialog(section = "talk") {
  toremidosCloseDialog();

  toremidosIsDialogOpen = true;
  document.body.classList.add("toremidos-dialog-active");

  toremidosDialogElement = document.createElement("div");
  toremidosDialogElement.className = "toremidos-dialog open";

  if (section === "talk") {
    toremidosDialogElement.innerHTML = `
      <div class="toremidos-dialog-header">
        <h2 class="toremidos-title">Торемидос</h2>
      </div>
      <div class="toremidos-dialog-content">
        <p class="toremidos-text">Ну, говори уже. Только без воды — у меня времени мало.</p>
        <p class="toremidos-text">(здесь будет большой диалог / ветвление разговора)</p>
      </div>
      <button class="toremidos-neon-btn toremidos-close-btn">ЗАКРЫТЬ</button>
    `;
  } else {
    toremidosDialogElement.innerHTML = `
      <div class="toremidos-dialog-header">
        <h2 class="toremidos-title">Умения Торемидоса</h2>
      </div>
      <div class="toremidos-dialog-content">
        <p class="toremidos-text">Пока никаких умений не реализовано.</p>
        <p class="toremidos-text">Это заглушка — позже здесь будет система прокачки / имплантов.</p>
      </div>
      <button class="toremidos-neon-btn toremidos-close-btn">ЗАКРЫТЬ</button>
    `;
  }

  document.body.appendChild(toremidosDialogElement);
  toremidosDialogElement.querySelector(".toremidos-close-btn").onclick =
    toremidosCloseDialog;
}

function toremidosCloseDialog() {
  if (!toremidosDialogElement) return;
  toremidosIsDialogOpen = false;
  document.body.classList.remove("toremidos-dialog-active");
  toremidosDialogElement.remove();
  toremidosDialogElement = null;
}

function toremidosCreateButtons() {
  if (toremidosButtonsContainer) return;

  toremidosButtonsContainer = document.createElement("div");
  toremidosButtonsContainer.className = "toremidos-buttons-container";

  const talkBtn = document.createElement("div");
  talkBtn.className = "toremidos-button toremidos-talk-btn";
  talkBtn.textContent = "ГОВОРИТЬ";
  talkBtn.onclick = () => toremidosOpenDialog("talk");

  const skillsBtn = document.createElement("div");
  skillsBtn.className = "toremidos-button toremidos-skills-btn";
  skillsBtn.textContent = "УМЕНИЯ";
  skillsBtn.onclick = () => toremidosOpenDialog("skills");

  toremidosButtonsContainer.append(talkBtn, skillsBtn);
  document.body.appendChild(toremidosButtonsContainer);
}

function toremidosRemoveButtons() {
  if (toremidosButtonsContainer) {
    toremidosButtonsContainer.remove();
    toremidosButtonsContainer = null;
  }
}

function toremidosUpdateButtonsPosition(cameraX, cameraY) {
  if (!toremidosButtonsContainer || !toremidosIsNear) return;
  const screenX = TOREMIDOS_CONFIG.x - cameraX + 35;
  const screenY = TOREMIDOS_CONFIG.y - cameraY - 110;
  toremidosButtonsContainer.style.left = `${screenX}px`;
  toremidosButtonsContainer.style.top = `${screenY}px`;
}

function toremidosDraw(deltaTime) {
  if (window.worldSystem.currentWorldId !== TOREMIDOS_CONFIG.worldId) return;

  deltaTime = Math.min(deltaTime, TOREMIDOS_MAX_DELTA);

  const camera = window.movementSystem.getCamera();
  const screenX = TOREMIDOS_CONFIG.x - camera.x;
  const screenY = TOREMIDOS_CONFIG.y - camera.y;

  let sx, sy;

  if (toremidosIsNear) {
    sx = 0;
    sy = 0;
    toremidosFrame = 0;
    toremidosFrameTime = 0;
    toremidosCycleTime = 0;
    toremidosCurrentPhase = "main";
  } else {
    toremidosCycleTime += deltaTime;
    const phaseDuration =
      toremidosCurrentPhase === "main"
        ? TOREMIDOS_MAIN_PHASE_DURATION
        : TOREMIDOS_ACTIVE_PHASE_DURATION;

    while (toremidosCycleTime >= phaseDuration) {
      toremidosCycleTime -= phaseDuration;
      toremidosCurrentPhase =
        toremidosCurrentPhase === "main" ? "active" : "main";
      toremidosFrame = 0;
      toremidosFrameTime = 0;
    }

    toremidosFrameTime += deltaTime;
    while (toremidosFrameTime >= TOREMIDOS_FRAME_DURATION) {
      toremidosFrameTime -= TOREMIDOS_FRAME_DURATION;
      toremidosFrame = (toremidosFrame + 1) % TOREMIDOS_TOTAL_FRAMES;
    }

    sy = toremidosCurrentPhase === "main" ? 70 : 0;
    sx = toremidosFrame * 70;
  }

  if (toremidosSprite?.complete) {
    ctx.drawImage(toremidosSprite, sx, sy, 70, 70, screenX, screenY, 70, 70);
  } else {
    ctx.fillStyle = "#00aaff";
    ctx.fillRect(screenX, screenY, 70, 70);
  }

  // Имя или ?
  ctx.fillStyle = toremidosIsMet ? "#00ff88" : "#ffffff";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    toremidosIsMet ? TOREMIDOS_CONFIG.name : "?",
    screenX + 35,
    screenY - 12,
  );

  toremidosUpdateButtonsPosition(camera.x, camera.y);
}

function toremidosCheckProximity() {
  const player = players.get(myId);
  if (
    !player ||
    player.worldId !== TOREMIDOS_CONFIG.worldId ||
    player.health <= 0
  ) {
    if (toremidosIsNear) {
      toremidosIsNear = false;
      toremidosRemoveButtons();
      toremidosCloseDialog();
    }
    return;
  }

  const dx = player.x + 35 - (TOREMIDOS_CONFIG.x + 35);
  const dy = player.y + 35 - (TOREMIDOS_CONFIG.y + 35);
  const dist = Math.hypot(dx, dy);

  const nowNear = dist < TOREMIDOS_CONFIG.interactionRadius;

  if (nowNear && !toremidosIsNear) {
    toremidosIsNear = true;
    if (toremidosIsMet) {
      toremidosCreateButtons();
    } else {
      toremidosOpenGreeting();
    }
  } else if (!nowNear && toremidosIsNear) {
    toremidosIsNear = false;
    toremidosRemoveButtons();
    toremidosCloseDialog();
    toremidosCurrentPhase = "main";
    toremidosCycleTime = 0;
    toremidosFrame = 0;
    toremidosFrameTime = 0;
  }
}

function toremidosSetMet(met) {
  toremidosIsMet = !!met;
  if (toremidosIsNear) {
    if (toremidosIsMet) {
      toremidosCreateButtons();
    } else {
      toremidosRemoveButtons();
    }
  }
}

window.toremidosSystem = {
  initialize: (img) => {
    toremidosSprite = img;
    toremidosCurrentPhase = "main";
    toremidosCycleTime = 0;
    toremidosFrame = 0;
    toremidosFrameTime = 0;
  },
  draw: toremidosDraw,
  checkProximity: toremidosCheckProximity,
  setMet: toremidosSetMet,
};
