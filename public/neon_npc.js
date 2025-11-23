// neon_npc.js — финальная версия: отказ каждый раз + закрытие при выходе из зоны + стиль как у Джона

const NEON_NPC = {
  name: "Neon Alex",
  spriteKey: "alexNeonSprite",
  photoKey: "alexNeonFoto",
  x: 502,
  y: 2771,
  width: 70,
  height: 70,
  interactionRadius: 80,
  speed: 0.06,
  targetA: { x: 502, y: 2771 },
  targetB: { x: 1368, y: 1657 },
  movingToB: true,
  isWaiting: true,
  waitDuration: 20000,
  waitTimer: 0,
  frame: 0,
  frameTime: 0,
  direction: "down",
  state: "idle",
  isPlayerNear: false,
  isDialogOpen: false,
  isMet: false,
};

const NEON_TALK_TOPICS = [
  {
    id: 1,
    title: "О Неоновом городе",
    text: "Неоновый город — центр технологий и опасностей. Здесь можно найти всё, но будь осторожен!",
  },
  {
    id: 2,
    title: "О мутантах",
    text: "Мутанты — главная угроза в городе. Они быстрые и сильные, но за их головы дают награду.",
  },
  {
    id: 3,
    title: "О Балярах",
    text: "Баляры — местная валюта. Получить их можно за выполнение заданий и торговлю.",
  },
];

const NEON_QUESTS = [
  {
    id: 1,
    title: "Очистка улиц",
    description: "Убей 3 мутантов в любом мире. Они угрожают выжившим.",
    target: { type: "mutant", quantity: 3 },
    reward: { type: "balyary", quantity: 10 },
  },
];

let neonQuestProgress = { currentQuestId: null, progress: 0, completed: [] };
let neonButtonsContainer = null;
let rejectionDialog = null; // ссылка на открытый диалог отказа

function initializeNeonNpc() {
  if (typeof ws !== "undefined" && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "requestNeonQuestSync" }));
  }
}

// === Стили как у Джона (точно как в npc.js) ===
function initializeJohnStyles() {
  if (document.getElementById("johnNeonStyles")) return;
  const style = document.createElement("style");
  style.id = "johnNeonStyles";
  style.innerHTML = `
    .john-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 420px;
      background: linear-gradient(135deg, rgba(10,10,10,0.95), rgba(20,20,20,0.9));
      border: 2px solid #00ff00;
      border-radius: 12px;
      padding: 20px;
      color: #ccffcc;
      font-family: 'Courier New', monospace;
      z-index: 10000;
      box-shadow: 0 0 25px rgba(0,255,0,0.7);
    }
    .john-dialog .npc-photo {
      width: 120px;
      height: 120px;
      border: 3px solid #00ff00;
      border-radius: 50%;
      box-shadow: 0 0 20px #00ff00;
      margin: 0 auto 15px;
      display: block;
    }
    .john-dialog .npc-name {
      text-align: center;
      font-size: 26px;
      margin: 10px 0;
      color: #00ff00;
      text-shadow: 0 0 10px #00ff00;
    }
    .john-dialog .npc-text {
      background: rgba(0,40,0,0.8);
      padding: 18px;
      border-radius: 10px;
      margin: 15px 0;
      line-height: 1.6;
      border: 1px solid #00ff00;
      color: #ccffcc;
      font-size: 16px;
    }
    .john-dialog .btn-container {
      text-align: center;
      margin-top: 20px;
    }
    .john-dialog .john-btn {
      background: linear-gradient(45deg, #00ff00, #008800);
      color: black;
      border: none;
      padding: 14px 32px;
      margin: 0 10px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 0 20px #00ff00;
      transition: all 0.3s;
    }
    .john-dialog .john-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 0 30px #00ff00;
    }
  `;
  document.head.appendChild(style);
}

// === Диалог отказа (до 1 уровня) ===
function openRejectionDialog() {
  if (rejectionDialog) return; // уже открыт
  initializeJohnStyles();

  rejectionDialog = document.createElement("div");
  rejectionDialog.className = "john-dialog";
  rejectionDialog.innerHTML = `
    <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
    <div class="npc-name">${NEON_NPC.name}</div>
    <div class="npc-text">
      Мне нужен тот, кто умеет правильно держать нож.<br>
      Я не вижу в тебе того, кто может мне помочь.
    </div>
    <div class="btn-container">
      <button class="john-btn">Понятно</button>
    </div>
  `;

  document.body.appendChild(rejectionDialog);
  NEON_NPC.isDialogOpen = true;

  const btn = rejectionDialog.querySelector(".john-btn");
  btn.onclick = closeRejectionDialog;
}

function closeRejectionDialog() {
  if (rejectionDialog) {
    rejectionDialog.remove();
    rejectionDialog = null;
    NEON_NPC.isDialogOpen = false;
  }
}

// === Диалог знакомства (1+ уровень) ===
function openFirstMeetingDialog() {
  if (document.getElementById("johnDialog")) return;
  initializeJohnStyles();

  const dialog = document.createElement("div");
  dialog.id = "johnDialog";
  dialog.className = "john-dialog";

  dialog.innerHTML = `
    <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
    <div class="npc-name">${NEON_NPC.name}</div>
    <div class="npc-text">
      Прости, что был груб... Этот город выматывает.<br>
      Меня зовут Neon Alex. Может, ты поможешь мне с одной проблемой?
    </div>
    <div class="btn-container">
      <button class="john-btn">Конечно помогу</button>
    </div>
  `;

  document.body.appendChild(dialog);
  NEON_NPC.isDialogOpen = true;

  dialog.querySelector(".john-btn").onclick = () => {
    dialog.remove();
    NEON_NPC.isDialogOpen = false;
    NEON_NPC.isMet = true;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "meetNeonAlex" }));
    }
  };
}

// === Кнопки "Говорить" и "Задания" ===
function createNeonButtons(screenX, screenY) {
  if (neonButtonsContainer || !NEON_NPC.isMet) return;
  neonButtonsContainer = document.createElement("div");
  neonButtonsContainer.style.cssText = `
    position:absolute;
    left:${screenX + 35}px;
    top:${screenY - 80}px;
    transform:translateX(-50%);
    pointer-events:none;
    z-index:999;
  `;

  const talkBtn = document.createElement("div");
  talkBtn.textContent = "Говорить";
  talkBtn.style.cssText =
    "pointer-events:auto;cursor:pointer;background:rgba(0,255,0,0.4);padding:10px 20px;border-radius:8px;margin:5px;font-weight:bold;";
  talkBtn.onclick = (e) => {
    e.stopPropagation();
    openNeonTalkDialog();
  };

  const questBtn = document.createElement("div");
  questBtn.textContent = "Задания";
  questBtn.style.cssText =
    "pointer-events:auto;cursor:pointer;background:rgba(0,255,0,0.4);padding:10px 20px;border-radius:8px;margin:5px;font-weight:bold;";
  questBtn.onclick = (e) => {
    e.stopPropagation();
    openNeonQuestDialog();
  };

  neonButtonsContainer.append(talkBtn, questBtn);
  document.body.appendChild(neonButtonsContainer);
}

function removeNeonButtons() {
  if (neonButtonsContainer) {
    neonButtonsContainer.remove();
    neonButtonsContainer = null;
  }
}

// === Заглушки диалогов (пока) ===
function openNeonTalkDialog() {
  if (document.getElementById("johnDialog")) return;
  initializeJohnStyles();
  const d = document.createElement("div");
  d.id = "johnDialog";
  d.className = "john-dialog";
  d.innerHTML = `<div class="npc-name">${NEON_NPC.name}</div><div class="npc-text">Поговорим позже...</div><div class="btn-container"><button class="john-btn">Закрыть</button></div>`;
  document.body.appendChild(d);
  d.querySelector(".john-btn").onclick = () => d.remove();
}

function openNeonQuestDialog() {
  if (document.getElementById("johnDialog")) return;
  initializeJohnStyles();
  const d = document.createElement("div");
  d.id = "johnDialog";
  d.className = "john-dialog";
  d.innerHTML = `<div class="npc-name">${NEON_NPC.name}</div><div class="npc-text">Задания в разработке!</div><div class="btn-container"><button class="john-btn">Закрыть</button></div>`;
  document.body.appendChild(d);
  d.querySelector(".john-btn").onclick = () => d.remove();
}

// === Основной апдейт ===
function updateNeonNpc(deltaTime) {
  if (window.worldSystem.currentWorldId !== 0) return;
  const me = players.get(myId);
  if (!me) return;

  const dx = me.x - NEON_NPC.x;
  const dy = me.y - NEON_NPC.y;
  const dist = Math.hypot(dx, dy);
  const near = dist < NEON_NPC.interactionRadius;
  NEON_NPC.isPlayerNear = near;

  // Движение NPC
  if (!near && !NEON_NPC.isDialogOpen) {
    // ... твой старый код движения (оставляем без изменений)
    if (NEON_NPC.isWaiting) {
      NEON_NPC.waitTimer += deltaTime;
      if (NEON_NPC.waitTimer >= NEON_NPC.waitDuration) {
        NEON_NPC.isWaiting = false;
        NEON_NPC.waitTimer = 0;
        NEON_NPC.movingToB = !NEON_NPC.movingToB;
      }
    } else {
      const target = NEON_NPC.movingToB ? NEON_NPC.targetB : NEON_NPC.targetA;
      const tdx = target.x - NEON_NPC.x;
      const tdy = target.y - NEON_NPC.y;
      const tdist = Math.hypot(tdx, tdy);
      if (tdist > 5) {
        NEON_NPC.x += (tdx / tdist) * NEON_NPC.speed * deltaTime;
        NEON_NPC.y += (tdy / tdist) * NEON_NPC.speed * deltaTime;
        NEON_NPC.state = "walking";
        NEON_NPC.direction =
          Math.abs(tdx) > Math.abs(tdy)
            ? tdx > 0
              ? "right"
              : "left"
            : tdy > 0
            ? "down"
            : "up";
      } else {
        NEON_NPC.isWaiting = true;
        NEON_NPC.state = "idle";
      }
    }
  } else {
    NEON_NPC.state = "idle";
  }

  // Анимация
  if (NEON_NPC.state === "walking") {
    NEON_NPC.frameTime += deltaTime;
    if (NEON_NPC.frameTime >= 100) {
      NEON_NPC.frameTime -= 100;
      NEON_NPC.frame = (NEON_NPC.frame + 1) % 40;
    }
  } else {
    NEON_NPC.frame = 0;
  }
}

function drawNeonNpc() {
  if (window.worldSystem.currentWorldId !== 0) return;
  const camera = window.movementSystem.getCamera();
  const screenX = NEON_NPC.x - camera.x;
  const screenY = NEON_NPC.y - camera.y - 30;

  if (
    screenX < -100 ||
    screenX > canvas.width + 100 ||
    screenY < -100 ||
    screenY > canvas.height + 100
  )
    return;

  // Спрайт
  const sprite = images[NEON_NPC.spriteKey];
  if (sprite?.complete) {
    const spriteY =
      { up: 0, down: 70, left: 210, right: 140 }[NEON_NPC.direction] || 70;
    ctx.drawImage(
      sprite,
      NEON_NPC.frame * 70,
      spriteY,
      70,
      70,
      screenX,
      screenY,
      70,
      70
    );
  } else {
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(screenX, screenY, 70, 70);
    ctx.fillStyle = "#000";
    ctx.font = "30px Arial";
    ctx.fillText("NA", screenX + 10, screenY + 50);
  }

  const player = players.get(myId);
  const level = player?.level || 0;

  // Над головой
  ctx.fillStyle = "#00ffff";
  ctx.font = "bold 16px Orbitron";
  ctx.textAlign = "center";
  if (!NEON_NPC.isMet) {
    ctx.fillText("?", screenX + 35, screenY - 40);
  } else {
    ctx.fillText(NEON_NPC.name, screenX + 35, screenY - 30);
  }

  // === Логика взаимодействия ===
  if (NEON_NPC.isPlayerNear && level >= 1) {
    if (!NEON_NPC.isMet && !NEON_NPC.isDialogOpen) {
      openFirstMeetingDialog();
    } else if (NEON_NPC.isMet) {
      createNeonButtons(screenX, screenY);
    }
    closeRejectionDialog(); // на всякий случай
  } else if (NEON_NPC.isPlayerNear && level < 1) {
    if (!rejectionDialog && !NEON_NPC.isDialogOpen) {
      openRejectionDialog();
    }
    removeNeonButtons();
  } else {
    // Игрок вышел из зоны — закрываем отказ
    closeRejectionDialog();
    removeNeonButtons();
  }
}

// === Квесты и синхронизация (без изменений) ===
if (window.levelSystem?.handleEnemyKill) {
  const old = window.levelSystem.handleEnemyKill;
  window.levelSystem.handleEnemyKill = function (data) {
    old(data);
    if (neonQuestProgress.currentQuestId === 1 && data?.type === "mutant") {
      neonQuestProgress.progress++;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "neonQuestProgress",
            progress: neonQuestProgress.progress,
          })
        );
      }
    }
  };
}

if (typeof ws !== "undefined") {
  ws.addEventListener("message", (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === "neonQuestSync") {
        neonQuestProgress = data.progress;
        NEON_NPC.isMet = data.isMet || false;
      }
      if (data.type === "update" && data.player?.alexNeonMet !== undefined) {
        NEON_NPC.isMet = !!data.player.alexNeonMet;
      }
    } catch {}
  });
}

initializeNeonNpc();

window.neonNpcSystem = {
  update: updateNeonNpc,
  draw: drawNeonNpc,
};
