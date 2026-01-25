// torestos.js — NPC Торестос в Неоновом городе

const TORESTOS = {
  x: 229,
  y: 2411,
  width: 70,
  height: 70,
  interactionRadius: 50,
  name: "Торестос",
  worldId: 0,
};

let isTorestosMet = false;
let isTorestosDialogOpen = false;
let isPlayerNearTorestos = false;

let torestosSprite = null;
let torestosButtonsContainer = null;

// Анимация
let torestosFrame = 0;
let torestosFrameTime = 0;
const FRAME_DURATION_TORESTOS = 150;
const TOTAL_FRAMES_TORESTOS = 13;
const MAX_DELTA_TIME_TORESTOS = 1000;

let animationCycleTimeTorestos = 0;
const MAIN_PHASE_DURATION = 15000; // 15 сек — основная строка
const ACTIVE_PHASE_DURATION = 5000; // 5 сек — активная строка
let currentPhaseTorestos = "main";

let dialogElement = null;

(() => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "torestosStyle.css";
  document.head.appendChild(link);
})();

function openTorestosGreeting() {
  if (isTorestosDialogOpen) return;
  isTorestosDialogOpen = true;
  document.body.classList.add("npc-dialog-active");

  dialogElement = document.createElement("div");
  dialogElement.className = "torestos-dialog open";

  dialogElement.innerHTML = `
    <div class="torestos-dialog-header">
      <h2 class="torestos-title">Торестос</h2>
    </div>
    <div class="torestos-dialog-content">
      <p class="torestos-text">Йо, странник... Ты первый, кто не пробежал мимо.</p>
      <p class="torestos-text">Я Торестос. Слышал, ты неплохо держишься в этом неоне.</p>
      <p class="torestos-text">Хочешь поговорить? Или сразу к делу — улучшения, коллекции...</p>
    </div>
    <button class="torestos-neon-btn" id="torestos-greeting-continue">
      Понял, давай дальше
    </button>
  `;
  document.body.appendChild(dialogElement);

  document
    .getElementById("torestos-greeting-continue")
    ?.addEventListener("click", () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "meetTorestos" }));
      }
      closeTorestosDialog();
    });
}

function closeTorestosDialog() {
  if (!isTorestosDialogOpen) return;
  isTorestosDialogOpen = false;
  document.body.classList.remove("npc-dialog-active");
  if (dialogElement) {
    dialogElement.remove();
    dialogElement = null;
  }
}

function openTorestosMainDialog() {
  if (isTorestosDialogOpen) return;
  isTorestosDialogOpen = true;
  document.body.classList.add("npc-dialog-active");

  dialogElement = document.createElement("div");
  dialogElement.className = "torestos-dialog open";
  dialogElement.innerHTML = `
    <div class="torestos-dialog-header">
      <h2 class="torestos-title">Торестос</h2>
    </div>
    <div class="torestos-dialog-content">
      <p class="torestos-text">Что на этот раз, сталкер?</p>
      <div id="torestosTopics" class="torestos-topics"></div>
    </div>
    <button id="closeTorestosBtn" class="torestos-neon-btn">ЗАКРЫТЬ</button>
  `;
  document.body.appendChild(dialogElement);

  const topicsContainer = document.getElementById("torestosTopics");
  const closeBtn = document.getElementById("closeTorestosBtn");

  const topics = [
    {
      title: "ГОВОРИТЬ",
      action: () => {
        topicsContainer.innerHTML = `<p class="torestos-text">Пока я мало что знаю о тебе... Расскажи, что тебя сюда занесло?</p>`;
        closeBtn.textContent = "НАЗАД";
        closeBtn.onclick = openTorestosMainDialog;
      },
    },
    {
      title: "УЛУЧШИТЬ",
      action: () => {
        topicsContainer.innerHTML = `<p class="torestos-text">Здесь можно было бы улучшать статы или экипировку... Но пока это только заготовка.</p>`;
        closeBtn.textContent = "НАЗАД";
        closeBtn.onclick = openTorestosMainDialog;
      },
    },
    {
      title: "КОЛЛЕКЦИЯ",
      action: () => {
        topicsContainer.innerHTML = `<p class="torestos-text">Коллекции пока нет, но скоро будет — держи ушки на макушке.</p>`;
        closeBtn.textContent = "НАЗАД";
        closeBtn.onclick = openTorestosMainDialog;
      },
    },
  ];

  topics.forEach((topic) => {
    const div = document.createElement("div");
    div.className = "torestos-topic";
    div.innerHTML = `<strong>${topic.title}</strong>`;
    div.addEventListener("click", topic.action);
    topicsContainer.appendChild(div);
  });

  closeBtn.onclick = closeTorestosDialog;
}

function createTorestosButtons() {
  if (torestosButtonsContainer) return;
  torestosButtonsContainer = document.createElement("div");
  torestosButtonsContainer.className = "torestos-buttons-container";

  const talkBtn = document.createElement("div");
  talkBtn.className = "torestos-button torestos-talk-btn";
  talkBtn.textContent = "ГОВОРИТЬ";
  talkBtn.onclick = (e) => {
    e.stopPropagation();
    openTorestosMainDialog();
  };

  const upgradeBtn = document.createElement("div");
  upgradeBtn.className = "torestos-button torestos-upgrade-btn";
  upgradeBtn.textContent = "УЛУЧШИТЬ";
  upgradeBtn.onclick = (e) => {
    e.stopPropagation();
    openTorestosMainDialog();
  };

  const collectionBtn = document.createElement("div");
  collectionBtn.className = "torestos-button torestos-collection-btn";
  collectionBtn.textContent = "КОЛЛЕКЦИЯ";
  collectionBtn.onclick = (e) => {
    e.stopPropagation();
    openTorestosMainDialog();
  };

  torestosButtonsContainer.appendChild(talkBtn);
  torestosButtonsContainer.appendChild(upgradeBtn);
  torestosButtonsContainer.appendChild(collectionBtn);
  document.body.appendChild(torestosButtonsContainer);
}

function removeTorestosButtons() {
  if (torestosButtonsContainer) {
    torestosButtonsContainer.remove();
    torestosButtonsContainer = null;
  }
}

function updateTorestosButtonsPosition(cameraX, cameraY) {
  if (!torestosButtonsContainer || !isPlayerNearTorestos) return;
  const screenX = TORESTOS.x - cameraX + 35;
  const screenY = TORESTOS.y - cameraY - 110;
  torestosButtonsContainer.style.left = `${screenX}px`;
  torestosButtonsContainer.style.top = `${screenY}px`;
}

function drawTorestos(deltaTime) {
  if (window.worldSystem.currentWorldId !== TORESTOS.worldId) return;

  deltaTime = Math.min(deltaTime, MAX_DELTA_TIME_TORESTOS);

  const camera = window.movementSystem.getCamera();
  const screenX = TORESTOS.x - camera.x;
  const screenY = TORESTOS.y - camera.y;

  let sx, sy;

  if (isPlayerNearTorestos) {
    sx = 0;
    sy = 0;
    torestosFrame = 0;
    torestosFrameTime = 0;
    animationCycleTimeTorestos = 0;
    currentPhaseTorestos = "main";
  } else {
    animationCycleTimeTorestos += deltaTime;
    while (
      animationCycleTimeTorestos >=
      (currentPhaseTorestos === "main"
        ? MAIN_PHASE_DURATION
        : ACTIVE_PHASE_DURATION)
    ) {
      animationCycleTimeTorestos -=
        currentPhaseTorestos === "main"
          ? MAIN_PHASE_DURATION
          : ACTIVE_PHASE_DURATION;
      currentPhaseTorestos =
        currentPhaseTorestos === "main" ? "active" : "main";
      torestosFrame = 0;
      torestosFrameTime = 0;
    }

    torestosFrameTime += deltaTime;
    while (torestosFrameTime >= FRAME_DURATION_TORESTOS) {
      torestosFrameTime -= FRAME_DURATION_TORESTOS;
      torestosFrame = (torestosFrame + 1) % TOTAL_FRAMES_TORESTOS;
    }

    sy = currentPhaseTorestos === "main" ? 0 : 70;
    sx = torestosFrame * 70;
  }

  if (torestosSprite?.complete) {
    ctx.drawImage(torestosSprite, sx, sy, 70, 70, screenX, screenY, 70, 70);
  } else {
    ctx.fillStyle = "#ff00aa";
    ctx.fillRect(screenX, screenY, 70, 70);
  }

  ctx.fillStyle = isTorestosMet ? "#00aaff" : "#ffffff";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    isTorestosMet ? TORESTOS.name : "???",
    screenX + 35,
    screenY - 12,
  );

  updateTorestosButtonsPosition(camera.x, camera.y);
}

function checkTorestosProximity() {
  const me = players.get(myId);
  if (
    !me ||
    me.worldId !== TORESTOS.worldId ||
    me.health <= 0 ||
    window.worldSystem.currentWorldId !== TORESTOS.worldId
  ) {
    if (isPlayerNearTorestos) {
      isPlayerNearTorestos = false;
      removeTorestosButtons();
      closeTorestosDialog();
    }
    return;
  }

  const dx = me.x + 35 - (TORESTOS.x + 35);
  const dy = me.y + 35 - (TORESTOS.y + 35);
  const dist = Math.hypot(dx, dy);
  const nowNear = dist < TORESTOS.interactionRadius;

  if (nowNear && !isPlayerNearTorestos) {
    isPlayerNearTorestos = true;
    if (isTorestosMet) {
      createTorestosButtons();
    } else {
      openTorestosGreeting();
    }
  } else if (!nowNear && isPlayerNearTorestos) {
    isPlayerNearTorestos = false;
    removeTorestosButtons();
    closeTorestosDialog();
    currentPhaseTorestos = "main";
    animationCycleTimeTorestos = 0;
    torestosFrame = 0;
    torestosFrameTime = 0;
  }
}

function setTorestosMet(met) {
  isTorestosMet = met;
  if (!met && isPlayerNearTorestos) removeTorestosButtons();
  if (met && isPlayerNearTorestos) createTorestosButtons();
}

window.torestosSystem = {
  drawTorestos,
  checkTorestosProximity,
  setTorestosMet,
  initialize: (sprite) => {
    torestosSprite = sprite;
    currentPhaseTorestos = "main";
    animationCycleTimeTorestos = 0;
    torestosFrame = 0;
    torestosFrameTime = 0;
  },
};
