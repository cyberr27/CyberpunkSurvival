// neon_npc.js — Полная переработка под стиль Джона + квесты с сохранением

const NEON_NPC = {
  name: "Neon Alex",
  spriteKey: "alexNeonSprite",
  photoKey: "alexNeonFoto",
  x: 502,
  y: 2771,
  width: 70,
  height: 70,
  interactionRadius: 80,
  targetA: { x: 502, y: 2771 },
  targetB: { x: 1368, y: 1657 },
  movingToB: true,
  isWaiting: true,
  waitTimer: 0,
  waitDuration: 20000,
  isDialogOpen: false,
  isPlayerNear: false,
  isMet: false,
  showButtons: false,
};

// Квесты Neon Alex
const NEON_QUESTS = [
  {
    id: 1,
    title: "Очистка улиц",
    description: "Убей 3 мутантов в любом городе. Они угрожают жителям.",
    target: { type: "mutant", count: 3 },
    reward: { type: "balyary", amount: 5 },
  },
  // Дальше будут другие квесты
];

// Темы разговора
const NEON_TALK_TOPICS = [
  {
    title: "О Неоновом городе",
    text: "Неоновый город — центр технологий и опасностей. Здесь можно найти всё, но будь осторожен!",
  },
  {
    title: "О мутантах",
    text: "Мутанты — главная угроза в городе. Они быстрые и сильные, но за их головы дают награду.",
  },
  {
    title: "О балярах",
    text: "Баляры — местная валюта. Получить их можно за задания и торговлю.",
  },
];

let neonFrame = 0;
let neonFrameTime = 0;
const FRAME_DURATION = 100;

function initializeNeonNpc() {
  // Стили как у Джона
  if (document.getElementById("neonNpcStyles")) return;
  const style = document.createElement("style");
  style.id = "neonNpcStyles";
  style.innerHTML = `
    .neon-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(10, 15, 30, 0.95);
      border: 2px solid #00eaff;
      border-radius: 12px;
      padding: 20px;
      color: #00eaff;
      font-family: 'Orbitron', Arial, sans-serif;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 0 30px #00eaff;
      max-width: 420px;
      animation: neonGlow 2s infinite alternate;
    }
    .neon-dialog .title {
      font-size: 24px;
      margin-bottom: 15px;
      text-shadow: 0 0 10px #00eaff;
    }
    .neon-dialog .photo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid #00eaff;
      box-shadow: 0 0 20px #00eaff;
      margin: 10px auto;
    }
    .neon-dialog .text {
      font-size: 16px;
      line-height: 1.5;
      margin: 15px 0;
    }
    .neon-dialog .btn {
      background: linear-gradient(135deg, #00eaff, #0088aa);
      border: none;
      color: black;
      padding: 12px 28px;
      margin: 10px 8px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      font-size: 16px;
      box-shadow: 0 0 15px #00eaff;
      transition: all 0.2s;
    }
    .neon-dialog .btn:hover {
      transform: scale(1.05);
      box-shadow: 0 0 25px #00eaff;
    }
    .neon-buttons {
      position: absolute;
      pointer-events: none;
    }
    .neon-btn-talk, .neon-btn-quest {
      pointer-events: auto;
      background: rgba(0, 234, 255, 0.2);
      border: 2px solid #00eaff;
      color: #00eaff;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      backdrop-filter: blur(4px);
      box-shadow: 0 0 15px #00eaff;
    }
    @keyframes neonGlow {
      from { box-shadow: 0 0 20px #00eaff; }
      to { box-shadow: 0 0 35px #00eaff; }
    }
  `;
  document.head.appendChild(style);
}

let neonButtons = null;

function createNeonButtons(screenX, screenY) {
  if (neonButtons) neonButtons.remove();
  neonButtons = document.createElement("div");
  neonButtons.className = "neon-buttons";
  neonButtons.style.left = screenX + "px";
  neonButtons.style.top = screenY - 100 + "px";
  neonButtons.style.transform = "translateX(-50%)";

  const talkBtn = document.createElement("div");
  talkBtn.className = "neon-btn-talk";
  talkBtn.textContent = "Говорить";
  talkBtn.onclick = (e) => {
    e.stopPropagation();
    openNeonTalkDialog();
  };

  const questBtn = document.createElement("div");
  questBtn.className = "neon-btn-quest";
  questBtn.textContent = "Задания";
  questBtn.onclick = (e) => {
    e.stopPropagation();
    openNeonQuestDialog();
  };

  neonButtons.appendChild(talkBtn);
  neonButtons.appendChild(questBtn);
  document.body.appendChild(neonButtons);
}

function removeNeonButtons() {
  if (neonButtons) {
    neonButtons.remove();
    neonButtons = null;
  }
}

function openNeonTalkDialog() {
  if (document.getElementById("neonDialog")) return;
  initializeNeonNpc();

  const dialog = document.createElement("div");
  dialog.id = "neonDialog";
  dialog.className = "neon-dialog";

  let topicsHtml =
    "<div style='margin:15px 0'><strong>Выберите тему:</strong><br>";
  NEON_TALK_TOPICS.forEach((topic) => {
    topicsHtml += `<div style='margin:8px;cursor:pointer;color:#00eaff' onclick='
      document.querySelector("#neonDialog .text").innerHTML = "<strong>${topic.title}</strong><br>${topic.text}";
      this.parentNode.style.display="none";
    '>${topic.title}</div>`;
  });
  topicsHtml += "</div>";

  dialog.innerHTML = `
    <div class="title">${NEON_NPC.name}</div>
    <img src="alexNeonFoto.png" class="photo">
    <div class="text">Привет, сталкер. О чём поговорим?</div>
    ${topicsHtml}
    <button class="btn" onclick="this.closest('#neonDialog').remove(); NEON_NPC.isDialogOpen=false;">Закрыть</button>
  `;
  document.body.appendChild(dialog);
  NEON_NPC.isDialogOpen = true;
}

function openNeonQuestDialog() {
  if (document.getElementById("neonDialog")) return;
  initializeNeonNpc();

  const me = players.get(myId);
  if (!me || !me.alexNeonQuest)
    me.alexNeonQuest = { progress: 0, questId: 0, completed: [] };

  const quest = NEON_QUESTS[0];
  const progress = me.alexNeonQuest.progress;
  const completed = me.alexNeonQuest.completed.includes(1);

  let content = "";

  if (me.level < 1) {
    content = `<div class="text">Ты ещё слабоват, малыш. Подними уровень хотя бы до 1.</div>
      <button class="btn" onclick="this.closest('#neonDialog').remove(); NEON_NPC.isDialogOpen=false;">Понятно</button>`;
  } else if (completed) {
    content = `<div class="text">Спасибо за помощь! Скоро будут новые задания.</div>
      <button class="btn" onclick="this.closest('#neonDialog').remove(); NEON_NPC.isDialogOpen=false;">Закрыть</button>`;
  } else if (me.alexNeonQuest.questId === 1) {
    // Квест активен
    content = `<div class="text"><strong>${quest.title}</strong><br>${quest.description}<br><br>Прогресс: ${progress}/3 мутантов</div>
      <button class="btn" onclick="this.closest('#neonDialog').remove(); NEON_NPC.isDialogOpen=false;">Закрыть</button>`;
  } else {
    // Предлагаем квест
    content = `<div class="text"><strong>${quest.title}</strong><br>${quest.description}<br><br>Награда: ${quest.reward.amount} баляров</div>
      <button class="btn" style="background:#00aa00" onclick="acceptNeonQuest()">Взять задание</button>
      <button class="btn" onclick="this.closest('#neonDialog').remove(); NEON_NPC.isDialogOpen=false;">Отказаться</button>`;
  }

  const dialog = document.createElement("div");
  dialog.id = "neonDialog";
  dialog.className = "neon-dialog";
  dialog.innerHTML = `
    <div class="title">${NEON_NPC.name}</div>
    <img src="alexNeonFoto.png" class="photo">
    ${content}
  `;
  document.body.appendChild(dialog);
  NEON_NPC.isDialogOpen = true;
}

function acceptNeonQuest() {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "acceptNeonQuest", questId: 1 }));
  }
  document.getElementById("neonDialog")?.remove();
  NEON_NPC.isDialogOpen = false;
}

// === Обработка убийств мутантов ===
if (window.levelSystem?.handleEnemyKill) {
  const original = window.levelSystem.handleEnemyKill;
  window.levelSystem.handleEnemyKill = function (data) {
    original(data);

    const me = players.get(myId);
    if (
      !me ||
      !me.alexNeonQuest ||
      me.alexNeonQuest.questId !== 1 ||
      me.alexNeonQuest.completed?.includes(1)
    )
      return;

    if (data?.type === "mutant") {
      me.alexNeonQuest.progress = (me.alexNeonQuest.progress || 0) + 1;

      if (me.alexNeonQuest.progress >= 3) {
        // Квест выполнен
        me.alexNeonQuest.completed = me.alexNeonQuest.completed || [];
        if (!me.alexNeonQuest.completed.includes(1)) {
          me.alexNeonQuest.completed.push(1);
          // Награда
          const slot = me.inventory.findIndex((i) => i?.type === "balyary");
          if (slot !== -1) {
            me.inventory[slot].quantity =
              (me.inventory[slot].quantity || 0) + 5;
          } else {
            const empty = me.inventory.findIndex((i) => i === null);
            if (empty !== -1)
              me.inventory[empty] = { type: "balyary", quantity: 5 };
          }
          ws.send(JSON.stringify({ type: "neonQuestComplete", questId: 1 }));
        }
      }
      // Синхронизация с сервером
      ws.send(
        JSON.stringify({
          type: "updateNeonQuestProgress",
          progress: me.alexNeonQuest.progress,
          questId: 1,
        })
      );
    }
  };
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
        const speed = 0.05;
        NEON_NPC.x += (tdx / tdist) * speed * deltaTime;
        NEON_NPC.y += (tdy / tdist) * speed * deltaTime;

        // Анимация ходьбы
        neonFrameTime += deltaTime;
        if (neonFrameTime >= FRAME_DURATION) {
          neonFrameTime = 0;
          neonFrame = (neonFrame + 1) % 40;
        }
      } else {
        NEON_NPC.isWaiting = true;
        neonFrame = 0;
      }
    }
  } else {
    neonFrame = 0; // Стоит
  }

  // Управление кнопками
  if (near && me.level >= 1 && me.alexNeonMet !== false) {
    NEON_NPC.isPlayerNear = true;
    if (!neonButtons && !NEON_NPC.isDialogOpen) {
      const cam = window.movementSystem.getCamera();
      createNeonButtons(NEON_NPC.x - cam.x + 35, NEON_NPC.y - cam.y - 60);
    }
  } else {
    NEON_NPC.isPlayerNear = false;
    removeNeonButtons();
  }

  // Первое знакомство
  if (near && !NEON_NPC.isMet && !NEON_NPC.isDialogOpen && me.level >= 1) {
    NEON_NPC.isMet = true;
    ws.send(JSON.stringify({ type: "meetNeonAlex" }));
    setTimeout(() => {
      const dialog = document.createElement("div");
      dialog.className = "neon-dialog";
      dialog.id = "neonDialog";
      dialog.innerHTML = `
        <div class="title">Neon Alex</div>
        <img src="alexNeonFoto.png" class="photo">
        <div class="text">Эй, новичок! Я Neon Alex. Помогу с работой, если готов рисковать.</div>
        <button class="btn" onclick="this.closest('#neonDialog').remove(); NEON_NPC.isDialogOpen=false;">Понятно</button>
      `;
      document.body.appendChild(dialog);
      NEON_NPC.isDialogOpen = true;
    }, 500);
  }
}

function drawNeonNpc() {
  if (window.worldSystem.currentWorldId !== 0) return;
  const cam = window.movementSystem.getCamera();
  const screenX = NEON_NPC.x - cam.x;
  const screenY = NEON_NPC.y - cam.y - 20;

  const sprite = window.images?.[NEON_NPC.spriteKey];
  if (sprite?.complete) {
    let row = 0;
    if (NEON_NPC.movingToB && !NEON_NPC.isWaiting) row = 140; // right
    else if (!NEON_NPC.movingToB && !NEON_NPC.isWaiting) row = 210; // left
    else row = 70; // down (idle)

    ctx.drawImage(
      sprite,
      neonFrame * 70,
      row,
      70,
      70,
      screenX,
      screenY,
      70,
      70
    );
  } else {
    ctx.fillStyle = "#00eaff";
    ctx.fillRect(screenX, screenY, 70, 70);
    ctx.fillStyle = "#000";
    ctx.font = "30px Arial";
    ctx.fillText("N", screenX + 20, screenY + 50);
  }

  if (me.level >= 1 && NEON_NPC.isPlayerNear) {
    ctx.font = "bold 16px Orbitron";
    ctx.fillStyle = "#00eaff";
    ctx.textAlign = "center";
    ctx.fillText(NEON_NPC.name, screenX + 35, screenY - 30);
  }
}

// Синхронизация с сервера
if (typeof ws !== "undefined") {
  const handler = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "update" && data.player?.id === myId) {
        if (data.player.alexNeonMet !== undefined)
          NEON_NPC.isMet = data.player.alexNeonMet;
        if (data.player.alexNeonQuest) {
          const me = players.get(myId);
          if (me) me.alexNeonQuest = data.player.alexNeonQuest;
        }
      }
    } catch (e) {}
  };
  ws.addEventListener("message", handler);
}

window.neonNpcSystem = {
  update: updateNeonNpc,
  draw: drawNeonNpc,
};
