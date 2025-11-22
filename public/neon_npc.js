// neon_npc.js — Полноценный NPC Neon Alex с анимацией и квестами

const NEON_NPC = {
  name: "Neon Alex",
  spriteKey: "alexNeonSprite", // Должен быть в папке со спрайтами, как playerSprite.png
  photoKey: "alexNeonFoto", // Фото для диалога (как у Джона)
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

// Темы разговора
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

// Квесты (цепочка)
const NEON_QUESTS = [
  {
    id: 1,
    title: "Очистка улиц",
    description: "Убей 3 мутантов в любом мире. Они угрожают выжившим.",
    target: { type: "mutant", quantity: 3 },
    reward: { type: "balyary", quantity: 10 },
  },
  // Дальше будешь добавлять новые
];

// Текущий прогресс квеста (будет синхронизироваться с сервером)
let neonQuestProgress = { currentQuestId: null, progress: 0, completed: [] };

function initializeNeonNpc() {
  // Синхронизация с сервером при старте
  if (typeof ws !== "undefined" && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "requestNeonQuestSync" }));
  }
}

// Стили неонового диалога (как у Джона, но круче)
function initializeNeonStyles() {
  if (document.getElementById("neonNpcStyles")) return;
  const style = document.createElement("style");
  style.id = "neonNpcStyles";
  style.innerHTML = `
    .neon-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 420px;
      background: linear-gradient(135deg, rgba(10,10,30,0.98), rgba(0,20,40,0.95));
      border: 2px solid #00ffff;
      border-radius: 16px;
      padding: 20px;
      color: #00ffff;
      font-family: 'Orbitron', monospace;
      z-index: 10000;
      box-shadow: 0 0 30px #00ffff, inset 0 0 20px rgba(0,255,255,0.3);
      animation: neonPulse 3s infinite alternate;
    }
    .neon-dialog .npc-photo {
      width: 120px;
      height: 120px;
      border: 3px solid #00ffff;
      border-radius: 50%;
      box-shadow: 0 0 20px #00ffff;
      margin: 0 auto 15px;
      display: block;
    }
    .neon-dialog .npc-name {
      text-align: center;
      font-size: 26px;
      margin: 10px 0;
      text-shadow: 0 0 10px #00ffff;
    }
    .neon-dialog .npc-text {
      background: rgba(0,30,50,0.7);
      padding: 15px;
      border-radius: 10px;
      margin: 15px 0;
      line-height: 1.5;
      text-shadow: 0 0 5px #00ffff;
      border: 1px solid #00ffff;
    }
    .neon-dialog .btn-container {
      text-align: center;
      margin-top: 20px;
    }
    .neon-dialog .neon-btn {
      background: linear-gradient(45deg, #00ffff, #0088ff);
      color: black;
      border: none;
      padding: 12px 28px;
      margin: 0 10px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 0 15px #00ffff;
      transition: all 0.3s;
    }
    .neon-dialog .neon-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 0 25px #00ffff;
    }
    @keyframes neonPulse {
      from { box-shadow: 0 0 20px #00ffff; }
      to { box-shadow: 0 0 40px #00ffff, 0 0 60px rgba(0,255,255,0.5); }
    }
    .talk-topic-btn {
      display: block;
      width: 100%;
      padding: 12px;
      margin: 8px 0;
      background: rgba(0,255,255,0.1);
      border: 1px solid #00ffff;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    }
    .talk-topic-btn:hover {
      background: rgba(0,255,255,0.3);
      transform: translateX(10px);
    }
  `;
  document.head.appendChild(style);
}

// Кнопки над NPC
let neonButtonsContainer = null;
function createNeonButtons(screenX, screenY) {
  if (neonButtonsContainer) return;
  neonButtonsContainer = document.createElement("div");
  neonButtonsContainer.style.cssText = `
    position: absolute;
    left: ${screenX + 35}px;
    top: ${screenY - 80(px)}px;
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 999;
  `;
  const talkBtn = document.createElement("div");
  talkBtn.textContent = "Говорить";
  talkBtn.className = "jack-button-talk";
  talkBtn.style.pointerEvents = "auto";
  talkBtn.onclick = (e) => {
    e.stopPropagation();
    openNeonTalkDialog();
  };

  const questBtn = document.createElement("div");
  questBtn.textContent = "Задания";
  questBtn.className = "jack-button-shop";
  questBtn.style.pointerEvents = "auto";
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

// Диалог разговора
function openNeonTalkDialog() {
  if (document.getElementById("neonDialog")) return;
  initializeNeonStyles();
  const dialog = document.createElement("div");
  dialog.id = "neonDialog";
  dialog.className = "neon-dialog";
  dialog.innerHTML = `
    <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
    <div class="npc-name">${NEON_NPC.name}</div>
    <div class="npc-text">О чём поговорим?</div>
    <div style="margin:20px 0;">
      ${NEON_TALK_TOPICS.map(
        (t) => `<div class="talk-topic-btn" data-id="${t.id}">${t.title}</div>`
      ).join("")}
    </div>
    <div class="btn-container">
      <button class="neon-btn" onclick="this.closest('.neon-dialog').remove(); NEON_NPC.isDialogOpen=false;">Закрыть</button>
    </div>
  `;
  document.body.appendChild(dialog);
  NEON_NPC.isDialogOpen = true;

  dialog.querySelectorAll(".talk-topic-btn").forEach((btn) => {
    btn.onclick = () => {
      const topic = NEON_TALK_TOPICS.find((t) => t.id == btn.dataset.id);
      dialog.querySelector(
        ".npc-text"
      ).innerHTML = `<b>${topic.title}</b><br><br>${topic.text}`;
    };
  });
}

// Диалог квеста
function openNeonQuestDialog() {
  if (document.getElementById("neonDialog")) return;
  initializeNeonStyles();
  const dialog = document.createElement("div");
  dialog.id = "neonDialog";
  dialog.className = "neon-dialog";

  const currentQuest = NEON_QUESTS.find(
    (q) => q.id === neonQuestProgress.currentQuestId
  );
  const nextQuest = NEON_QUESTS.find(
    (q) => !neonQuestProgress.completed.includes(q.id)
  );

  let content = "";

  if (!NEON_NPC.isMet) {
    content = `
      <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
      <div class="npc-name">${NEON_NPC.name}</div>
      <div class="npc-text">
        Эй, выживший! Ты выглядишь крепким. Помоги очистить улицы от мутантов.<br><br>
        Убей 3 мутантов — где угодно. Я заплачу.<br><br>
        Примешь задание?
      </div>
      <div class="btn-container">
        <button class="neon-btn" id="acceptFirstQuest">Принять</button>
        <button class="neon-btn" onclick="this.closest('.neon-dialog').remove(); NEON_NPC.isDialogOpen=false;">Отказаться</button>
      </div>
    `;
  } else if (
    currentQuest &&
    neonQuestProgress.progress < currentQuest.target.quantity
  ) {
    content = `
      <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
      <div class="npc-name">${NEON_NPC.name}</div>
      <div class="npc-text">
        <b>${currentQuest.title}</b><br><br>
        ${currentQuest.description}<br><br>
        Прогресс: ${neonQuestProgress.progress}/${
      currentQuest.target.quantity
    } мутантов убито<br><br>
        Награда: ${currentQuest.reward.quantity} баляров
      </div>
      <div class="btn-container">
        <button class="neon-btn" onclick="this.closest('.neon-dialog').remove(); NEON_NPC.isDialogOpen=false;">Закрыть</button>
      </div>
    `;
  } else if (nextQuest && currentQuest) {
    // Квест выполнен — выдаём награду и предлагаем следующий
    content = `
      <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
      <div class="npc-name">${NEON_NPC.name}</div>
      <div class="npc-text">
        Отличная работа! Вот твои ${
          currentQuest.reward.quantity
        } баляров.<br><br>
        Готов к новому заданию?
      </div>
      <div class="btn-container">
        <button class="neon-btn" id="claimReward">Забрать награду</button>
      </div>
    `;
  } else {
    content = `<div class="npc-text">Пока новых заданий нет. Возвращайся позже.</div>`;
  }

  dialog.innerHTML = content;
  document.body.appendChild(dialog);
  NEON_NPC.isDialogOpen = true;

  // Принятие первого квеста
  const acceptBtn = dialog.querySelector("#acceptFirstQuest");
  if (acceptBtn) {
    acceptBtn.onclick = () => {
      neonQuestProgress.currentQuestId = 1;
      neonQuestProgress.progress = 0;
      ws.send(JSON.stringify({ type: "neonQuestAccept", questId: 1 }));
      NEON_NPC.isMet = true;
      dialog.remove();
      openNeonQuestDialog();
    };
  }

  // Забрать награду и перейти к следующему
  const claimBtn = dialog.querySelector("#claimReward");
  if (claimBtn) {
    claimBtn.onclick = () => {
      const completedQuest = NEON_QUESTS.find(
        (q) => q.id === neonQuestProgress.currentQuestId
      );
      if (completedQuest) {
        neonQuestProgress.completed.push(completedQuest.id);
        neonQuestProgress.currentQuestId = null;
        neonQuestProgress.progress = 0;
        ws.send(
          JSON.stringify({
            type: "neonQuestComplete",
            questId: completedQuest.id,
            reward: completedQuest.reward,
          })
        );
      }
      dialog.remove();
    };
  }
}

// Обновление NPC
function updateNeonNpc(deltaTime) {
  if (window.worldSystem.currentWorldId !== 0) return;
  const me = players.get(myId);
  if (!me) return;

  const dx = me.x - NEON_NPC.x;
  const dy = me.y - NEON_NPC.y;
  const dist = Math.hypot(dx, dy);
  const near = dist < NEON_NPC.interactionRadius;

  // Движение
  if (!near && !NEON_NPC.isDialogOpen) {
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

  // Анимация кадров
  if (NEON_NPC.state === "walking") {
    NEON_NPC.frameTime += deltaTime;
    if (NEON_NPC.frameTime >= 100) {
      NEON_NPC.frameTime -= 100;
      NEON_NPC.frame = (NEON_NPC.frame + 1) % 40;
    }
  } else {
    NEON_NPC.frame = 0;
  }

  // Близость игрока
  NEON_NPC.isPlayerNear = near;
}

// Отрисовка
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

  if (NEON_NPC.isPlayerNear && (me?.level || 0) >= 1) {
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 16px Orbitron";
    ctx.textAlign = "center";
    ctx.fillText(NEON_NPC.name, screenX + 35, screenY - 30);
    createNeonButtons(screenX, screenY);
  } else {
    removeNeonButtons();
  }
}

// Перехват убийств мутантов
if (window.levelSystem?.handleEnemyKill) {
  const old = window.levelSystem.handleEnemyKill;
  window.levelSystem.handleEnemyKill = function (data) {
    old(data);
    if (neonQuestProgress.currentQuestId === 1 && data?.type === "mutant") {
      neonQuestProgress.progress++;
      if (neonQuestProgress.progress >= 3) {
        // Квест выполнен — сервер сам начислит награду при следующем открытии
      }
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

// Синхронизация с сервером
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

// Инициализация
initializeNeonNpc();

window.neonNpcSystem = {
  update: updateNeonNpc,
  draw: drawNeonNpc,
};
