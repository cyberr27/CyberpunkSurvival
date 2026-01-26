// torestos.js — NPC Торестос в Неоновом городе (оптимизированная версия)

const TORESTOS = {
  x: 229,
  y: 2411,
  width: 70,
  height: 70,
  interactionRadius: 50,
  name: "Мастер:Торестос",
  worldId: 0,
};

const MAIN_PHASE_DURATION = 15000; // 15 сек основная анимация
const ACTIVE_PHASE_DURATION = 5000; // 5 сек активная анимация
const FRAME_DURATION_TORESTOS = 200; // 200 мс на кадр (по твоему запросу)
const TOTAL_FRAMES_TORESTOS = 13;
const MAX_DELTA = 1000; // ограничение deltaTime

let isMet = false;
let isDialogOpen = false;
let isNear = false;

let spriteTorestos = null;
let buttonsContainer = null;
let dialogElement = null;

let frame = 0;
let frameTime = 0;
let cycleTime = 0;
let currentPhaseTorestos = "main"; // "main" или "active"

(() => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "torestosStyle.css";
  document.head.appendChild(link);
})();

function openGreeting() {
  if (isDialogOpen) return;
  isDialogOpen = true;
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

  const continueBtn = document.getElementById("torestos-greeting-continue");
  if (continueBtn) {
    continueBtn.onclick = () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "meetTorestos" }));
      }
      closeDialog();
    };
  }
}

function openMainDialog() {
  if (isDialogOpen) return;
  isDialogOpen = true;
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
        closeBtn.onclick = openMainDialog;
      },
    },
    {
      title: "УЛУЧШИТЬ",
      action: () => {
        topicsContainer.innerHTML = `<p class="torestos-text">Здесь можно было бы улучшать статы или экипировку... Но пока это только заготовка.</p>`;
        closeBtn.textContent = "НАЗАД";
        closeBtn.onclick = openMainDialog;
      },
    },
    {
      title: "КОЛЛЕКЦИЯ",
      action: () => {
        topicsContainer.innerHTML = `<p class="torestos-text">Коллекции пока нет, но скоро будет — держи ушки на макушке.</p>`;
        closeBtn.textContent = "НАЗАД";
        closeBtn.onclick = openMainDialog;
      },
    },
  ];

  topics.forEach((topic) => {
    const div = document.createElement("div");
    div.className = "torestos-topic";
    div.innerHTML = `<strong>${topic.title}</strong>`;
    div.onclick = topic.action;
    topicsContainer.appendChild(div);
  });

  closeBtn.onclick = closeDialog;
}

function closeDialog() {
  if (!isDialogOpen) return;
  isDialogOpen = false;
  document.body.classList.remove("npc-dialog-active");
  if (dialogElement) {
    dialogElement.remove();
    dialogElement = null;
  }
}

function createButtons() {
  if (buttonsContainer) return;
  buttonsContainer = document.createElement("div");
  buttonsContainer.className = "torestos-buttons-container";

  ["ГОВОРИТЬ", "УЛУЧШИТЬ", "КОЛЛЕКЦИЯ"].forEach((text) => {
    const btn = document.createElement("div");
    btn.className =
      "torestos-button " +
      (text === "ГОВОРИТЬ"
        ? "torestos-talk-btn"
        : text === "УЛУЧШИТЬ"
          ? "torestos-upgrade-btn"
          : "torestos-collection-btn");
    btn.textContent = text;
    btn.onclick = (e) => {
      e.stopPropagation();
      openMainDialog();
    };
    buttonsContainer.appendChild(btn);
  });

  document.body.appendChild(buttonsContainer);
}

function removeButtons() {
  if (buttonsContainer) {
    buttonsContainer.remove();
    buttonsContainer = null;
  }
}

function updateButtonsPosition(cameraX, cameraY) {
  if (!buttonsContainer || !isNear) return;
  const screenX = TORESTOS.x - cameraX + 35;
  const screenY = TORESTOS.y - cameraY - 110;
  buttonsContainer.style.left = `${screenX}px`;
  buttonsContainer.style.top = `${screenY}px`;
}

function drawTorestos(deltaTime) {
  if (window.worldSystem.currentWorldId !== TORESTOS.worldId) return;

  deltaTime = Math.min(deltaTime, MAX_DELTA);

  const camera = window.movementSystem.getCamera();
  const screenX = TORESTOS.x - camera.x;
  const screenY = TORESTOS.y - camera.y;

  let sx, sy;

  if (isNear) {
    // Игрок рядом — статичный кадр
    sx = 0;
    sy = 0;
    frame = 0;
    frameTime = 0;
    cycleTime = 0;
    currentPhaseTorestos = "main";
  } else {
    // Анимация вдали
    cycleTime += deltaTime;
    while (
      cycleTime >=
      (currentPhaseTorestos === "main"
        ? MAIN_PHASE_DURATION
        : ACTIVE_PHASE_DURATION)
    ) {
      cycleTime -=
        currentPhaseTorestos === "main"
          ? MAIN_PHASE_DURATION
          : ACTIVE_PHASE_DURATION;
      currentPhaseTorestos =
        currentPhaseTorestos === "main" ? "active" : "main";
      frame = 0;
      frameTime = 0;
    }

    frameTime += deltaTime;
    while (frameTime >= FRAME_DURATION_TORESTOS) {
      frameTime -= FRAME_DURATION_TORESTOS;
      frame = (frame + 1) % TOTAL_FRAMES_TORESTOS;
    }

    sy = currentPhaseTorestos === "main" ? 0 : 70;
    sx = frame * 70;
  }

  if (spriteTorestos?.complete) {
    ctx.drawImage(spriteTorestos, sx, sy, 70, 70, screenX, screenY, 70, 70);
  } else {
    ctx.fillStyle = "#ff00aa";
    ctx.fillRect(screenX, screenY, 70, 70);
  }

  // Имя
  ctx.fillStyle = isMet ? "#00ff2f" : "#ffffff";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(isMet ? TORESTOS.name : "?", screenX + 35, screenY - 12);

  updateButtonsPosition(camera.x, camera.y);
}

function checkProximity() {
  const me = players.get(myId);
  const currentWorldId = window.worldSystem.currentWorldId;

  if (
    !me ||
    me.worldId !== TORESTOS.worldId ||
    me.health <= 0 ||
    currentWorldId !== TORESTOS.worldId
  ) {
    if (isNear) {
      isNear = false;
      removeButtons();
      closeDialog();
    }
    return;
  }

  const dx = me.x + 35 - (TORESTOS.x + 35);
  const dy = me.y + 35 - (TORESTOS.y + 35);
  const dist = Math.hypot(dx, dy);
  const nowNear = dist < TORESTOS.interactionRadius;

  if (nowNear && !isNear) {
    isNear = true;
    if (isMet) {
      createButtons();
    } else {
      openGreeting();
    }
  } else if (!nowNear && isNear) {
    isNear = false;
    removeButtons();
    closeDialog();
    // Сброс анимации при уходе
    currentPhaseTorestos = "main";
    cycleTime = 0;
    frame = 0;
    frameTime = 0;
  }
}

function setMet(met) {
  isMet = met;
  if (isNear) {
    if (met) createButtons();
    else removeButtons();
  }
}

window.torestosSystem = {
  drawTorestos,
  checkTorestosProximity: checkProximity,
  setTorestosMet: setMet,
  initialize: (s) => {
    spriteTorestos = s;
    // Сброс состояния при инициализации
    currentPhaseTorestos = "main";
    cycleTime = 0;
    frame = 0;
    frameTime = 0;
  },
};
