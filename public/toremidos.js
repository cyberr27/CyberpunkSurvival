// toremidos.js

const TOREMIDOS = {
  x: 575,
  y: 1140,
  width: 70,
  height: 70,
  interactionRadius: 80,
  name: "Торемидос",
  worldId: 0,
};

const MAIN_PHASE_DURATION_TOREMIDOS = 14000;
const ACTIVE_PHASE_DURATION_TOREMIDOS = 5000;
const FRAME_DURATION_TOREMIDOS = 180;
const TOTAL_FRAMES_TOREMIDOS = 13;

let isMetToremidos = false;
let isNearToremidos = false;
let isDialogOpenToremidos = false;

let spriteToremidos = null;
let buttonsContainerToremidos = null;
let dialogElementToremidos = null;

let frameToremidos = 0;
let frameTimeToremidos = 0;
let cycleTimeToremidos = 0;
let currentPhaseToremidos = "main";

function openGreeting() {
  if (isDialogOpenToremidos) return;
  isDialogOpenToremidos = true;
  document.body.classList.add("npc-dialog-active");

  dialogElementToremidos = document.createElement("div");
  dialogElementToremidos.className = "toremidos-dialog open";
  dialogElementToremidos.innerHTML = `
    <div class="toremidos-dialog-header">
      <h2 class="toremidos-title">Торемидос</h2>
    </div>
    <div class="toremidos-dialog-content">
      <p class="toremidos-text">Эй, ты... Первый раз вижу тебя здесь.</p>
      <p class="toremidos-text">Я Торемидос. Не люблю незнакомцев.</p>
      <p class="toremidos-text">Говори, чего хотел, или вали.</p>
    </div>
    <button class="toremidos-neon-btn" id="toremidos-greeting-continue">
      Давай знакомиться
    </button>
  `;
  document.body.appendChild(dialogElementToremidos);

  document.getElementById("toremidos-greeting-continue").onclick = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "meetToremidos" }));
    }
    closeDialog();
  };
}

function openToremidosDialog(section = "talk") {
  closeDialog();

  isDialogOpenToremidos = true;
  document.body.classList.add("npc-dialog-active");

  dialogElementToremidos = document.createElement("div");
  dialogElementToremidos.className = "toremidos-dialog open";

  if (section === "talk") {
    dialogElementToremidos.innerHTML = `
      <div class="toremidos-dialog-header">
        <h2 class="toremidos-title">Торемидос</h2>
      </div>
      <div class="toremidos-dialog-content">
        <p class="toremidos-text">Говори, что хотел. Без воды.</p>
        <p class="toremidos-text">(тут будет основной диалог)</p>
      </div>
      <button class="toremidos-neon-btn close-btn">ЗАКРЫТЬ</button>
    `;
  } else {
    dialogElementToremidos.innerHTML = `
      <div class="toremidos-dialog-header">
        <h2 class="toremidos-title">Умения</h2>
      </div>
      <div class="toremidos-dialog-content">
        <p class="toremidos-text">Пока ничего нет.</p>
        <p class="toremidos-text">Заглушка под будущие умения / улучшения.</p>
      </div>
      <button class="toremidos-neon-btn close-btn">ЗАКРЫТЬ</button>
    `;
  }

  document.body.appendChild(dialogElementToremidos);
  dialogElementToremidos.querySelector(".close-btn").onclick = closeDialog;
}

function closeDialog() {
  if (dialogElementToremidos) {
    dialogElementToremidos.remove();
    dialogElementToremidos = null;
  }
  isDialogOpenToremidos = false;
  document.body.classList.remove("npc-dialog-active");
}

function createButtons() {
  if (buttonsContainerToremidos) return;

  buttonsContainerToremidos = document.createElement("div");
  buttonsContainerToremidos.className = "toremidos-buttons-container";

  const btnTalk = document.createElement("div");
  btnTalk.className = "toremidos-button toremidos-talk-btn";
  btnTalk.textContent = "ГОВОРИТЬ";
  btnTalk.onclick = () => openToremidosDialog("talk");

  const btnSkills = document.createElement("div");
  btnSkills.className = "toremidos-button toremidos-skills-btn";
  btnSkills.textContent = "УМЕНИЯ";
  btnSkills.onclick = () => openToremidosDialog("skills");

  buttonsContainerToremidos.append(btnTalk, btnSkills);
  document.body.appendChild(buttonsContainerToremidos);
}

function removeButtons() {
  if (buttonsContainerToremidos) {
    buttonsContainerToremidos.remove();
    buttonsContainerToremidos = null;
  }
}

function updateButtonsPosition(cameraX, cameraY) {
  if (!buttonsContainerToremidos || !isNearToremidos) return;
  const screenX = TOREMIDOS.x - cameraX + 35;
  const screenY = TOREMIDOS.y - cameraY - 110;
  buttonsContainerToremidos.style.left = `${screenX}px`;
  buttonsContainerToremidos.style.top = `${screenY}px`;
}

function drawToremidos(deltaTime) {
  if (window.worldSystem.currentWorldId !== TOREMIDOS.worldId) return;

  deltaTime = Math.min(deltaTime, 1000);

  const camera = window.movementSystem.getCamera();
  const screenX = TOREMIDOS.x - camera.x;
  const screenY = TOREMIDOS.y - camera.y;

  let sx = 0;
  let sy = 0;

  if (!isNearToremidos) {
    cycleTimeToremidos += deltaTime;
    const phaseDuration =
      currentPhaseToremidos === "main"
        ? MAIN_PHASE_DURATION_TOREMIDOS
        : ACTIVE_PHASE_DURATION_TOREMIDOS;

    while (cycleTimeToremidos >= phaseDuration) {
      cycleTimeToremidos -= phaseDuration;
      currentPhaseToremidos =
        currentPhaseToremidos === "main" ? "active" : "main";
      frameToremidos = 0;
      frameTimeToremidos = 0;
    }

    frameTimeToremidos += deltaTime;
    while (frameTimeToremidos >= FRAME_DURATION_TOREMIDOS) {
      frameTimeToremidos -= FRAME_DURATION_TOREMIDOS;
      frameToremidos = (frameToremidos + 1) % TOTAL_FRAMES_TOREMIDOS;
    }

    sy = currentPhaseToremidos === "main" ? 70 : 0;
    sx = frameToremidos * 70;
  }
  // если isNear → остаётся sx=0, sy=0 (первый кадр)

  if (spriteToremidos?.complete) {
    ctx.drawImage(spriteToremidos, sx, sy, 70, 70, screenX, screenY, 70, 70);
  } else {
    ctx.fillStyle = "#00aaff";
    ctx.fillRect(screenX, screenY, 70, 70);
  }

  // Имя или ?
  ctx.fillStyle = isMetToremidos ? "#00ff88" : "#ffffff";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    isMetToremidos ? TOREMIDOS.name : "?",
    screenX + 35,
    screenY - 12,
  );

  updateButtonsPosition(camera.x, camera.y);
}

function checkProximity() {
  const me = players.get(myId);
  if (!me || me.worldId !== TOREMIDOS.worldId || me.health <= 0) {
    if (isNearToremidos) {
      isNearToremidos = false;
      removeButtons();
      closeDialog();
    }
    return;
  }

  const dx = me.x + 35 - (TOREMIDOS.x + 35);
  const dy = me.y + 35 - (TOREMIDOS.y + 35);
  const dist = Math.hypot(dx, dy);

  const nowNear = dist < TOREMIDOS.interactionRadius;

  if (nowNear && !isNearToremidos) {
    isNearToremidos = true;
    if (isMetToremidos) {
      createButtons();
    } else {
      openGreeting();
    }
  } else if (!nowNear && isNearToremidos) {
    isNearToremidos = false;
    removeButtons();
    closeDialog();
    currentPhaseToremidos = "main";
    cycleTimeToremidos = 0;
    frameToremidos = 0;
    frameTimeToremidos = 0;
  }
}

function setMet(met) {
  isMetToremidos = !!met;
  if (isNearToremidos && isMetToremidos) {
    createButtons();
  } else if (isNearToremidos && !isMetToremidos) {
    removeButtons();
  }
}

window.toremidosSystem = {
  initialize: (img) => {
    spriteToremidos = img;
    currentPhaseToremidos = "main";
    cycleTimeToremidos = 0;
    frameToremidos = 0;
    frameTimeToremidos = 0;
  },
  draw: drawToremidos,
  checkProximity,
  setMet,
};
