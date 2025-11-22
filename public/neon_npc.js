// Темы для разговора Neon Alex
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

// Квест Neon Alex: убить 3 мутантов
const NEON_QUEST = {
  id: 1,
  title: "Убей 3 мутантов в Неоновом городе",
  target: { type: "mutant", quantity: 3 },
  reward: { type: "balyary", quantity: 5 },
  active: false,
  completed: false,
};

let neonQuestActive = false;
let neonQuestProgress = 0;
let neonQuestCompleted = false;
// neon_npc.js — Новый NPC для Неонового города

const NEON_NPC = {
  name: "Neon Alex",
  spriteKey: "alexNeonSprite", // Имя для спрайта
  x: 502,
  y: 2771,
  width: 70,
  height: 70,
  interactionRadius: 50,
  targetA: { x: 502, y: 2771 },
  targetB: { x: 1368, y: 1657 },
  movingToB: true,
  isDialogOpen: false,
  isPlayerNear: false,
  isMet: false,
  showQuestButton: false,
  waitTimer: 0,
  isWaiting: true,
  waitDuration: 20000, // 20 секунд
};

let neonNpcFrame = 0;
let neonNpcFrameTime = 0;
const NEON_NPC_FRAME_DURATION = 100;
const NEON_NPC_TOTAL_FRAMES = 40;

function initializeNeonNpcStyles() {
  if (!document.getElementById("neonNpcStyles")) {
    const style = document.createElement("style");
    style.id = "neonNpcStyles";
    style.innerHTML = `
      .neon-npc-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(10,10,10,0.95), rgba(20,20,20,0.9));
        border: 2px solid #00eaff;
        border-radius: 10px;
        padding: 24px;
        color: #00eaff;
        font-family: Orbitron, Arial, monospace;
        text-align: center;
        z-index: 1000;
        box-shadow: 0 0 20px #00eaff, 0 0 30px #222;
        animation: neonPulse 2s infinite alternate;
        min-width: 320px;
        max-width: 420px;
      }
      .neon-npc-dialog .neon-npc-title {
        color: #00eaff;
        font-size: 22px;
        text-shadow: 0 0 5px #00eaff,0 0 10px #222;
        margin-bottom: 12px;
        animation: flicker 1.5s infinite alternate;
      }
      .neon-npc-dialog .neon-npc-text {
        margin: 15px 0;
        font-size: 16px;
        text-shadow: 0 0 5px rgba(0,255,255,0.7);
        line-height: 1.4;
      }
      .neon-npc-dialog .neon-npc-btn {
        background: linear-gradient(135deg, #00eaff, #222);
        border: none;
        color: #000;
        padding: 10px 24px;
        margin: 18px auto 0 auto;
        cursor: pointer;
        border-radius: 7px;
        font-size: 16px;
        font-weight: bold;
        text-shadow: 0 0 5px rgba(0,0,0,0.5);
        box-shadow: 0 0 10px #00eaff, 0 0 15px #222;
        transition: transform .2s, box-shadow .2s;
        min-width: 120px;
      }
      .neon-npc-dialog .neon-npc-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 0 20px #00eaff, 0 0 30px #222;
      }
      @keyframes neonPulse{from{box-shadow:0 0 10px #00eaff;}to{box-shadow:0 0 20px #00eaff;}}
      @keyframes flicker{0%,100%{opacity:1;}50%{opacity:0.8;}}
    `;
    document.head.appendChild(style);
  }
}

let neonNpcButtonsContainer = null;
let neonNpcButtonsVisible = false;

function createNeonNpcButtons(screenX, screenY) {
  if (neonNpcButtonsContainer) return; // Уже есть, не пересоздаём
  neonNpcButtonsContainer = document.createElement("div");
  neonNpcButtonsContainer.className = "jack-buttons-container";
  neonNpcButtonsContainer.style.pointerEvents = "none";
  const totalButtonsHeight = 45 * 2 + 16;
  neonNpcButtonsContainer.style.left = screenX + NEON_NPC.width / 2 + "px";
  neonNpcButtonsContainer.style.top = screenY - totalButtonsHeight - 25 + "px";
  neonNpcButtonsContainer.style.transform = "translateX(-50%)";
  const talkBtn = document.createElement("div");
  talkBtn.className = "jack-button-talk";
  talkBtn.textContent = "Говорить";
  talkBtn.style.pointerEvents = "auto";
  talkBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openNeonTalkDialog();
  });
  const questBtn = document.createElement("div");
  questBtn.className = "jack-button-shop";
  questBtn.textContent = "Задания";
  questBtn.style.pointerEvents = "auto";
  questBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openNeonQuestDialog();
  });
  neonNpcButtonsContainer.appendChild(talkBtn);
  neonNpcButtonsContainer.appendChild(questBtn);
  document.body.appendChild(neonNpcButtonsContainer);
  neonNpcButtonsVisible = true;
}
// Открытие диалога с темами для разговора
function openNeonTalkDialog() {
  if (document.getElementById("neonNpcDialog")) return;
  initializeNeonNpcStyles();
  const dialog = document.createElement("div");
  dialog.id = "neonNpcDialog";
  dialog.className = "neon-npc-dialog";
  let topicsHtml =
    '<div style="margin-bottom:10px;font-weight:bold;">Темы для разговора:</div>';
  topicsHtml += '<div id="neonTalkTopics">';
  NEON_TALK_TOPICS.forEach((topic) => {
    topicsHtml += `<div class='talk-topic' data-id='${topic.id}'>${topic.title}</div>`;
  });
  topicsHtml += "</div>";
  dialog.innerHTML = `
    <div class="neon-npc-title">${NEON_NPC.name}</div>
    <div class="neon-npc-text">Выберите тему для разговора:</div>
    ${topicsHtml}
    <button class="neon-npc-btn" id="closeNeonTalkBtn">Закрыть</button>
  `;
  document.body.appendChild(dialog);
  NEON_NPC.isDialogOpen = true;
  document.getElementById("closeNeonTalkBtn").onclick = () => {
    NEON_NPC.isDialogOpen = false;
    dialog.remove();
  };
  // Обработчик выбора темы
  document.querySelectorAll(".talk-topic").forEach((el) => {
    el.onclick = function () {
      const topicId = parseInt(this.getAttribute("data-id"));
      const topic = NEON_TALK_TOPICS.find((t) => t.id === topicId);
      if (topic) {
        dialog.querySelector(
          ".neon-npc-text"
        ).innerHTML = `<b>${topic.title}</b><br>${topic.text}`;
        document.getElementById("neonTalkTopics").style.display = "none";
      }
    };
  });
}

// Открытие диалога с квестом
function openNeonQuestDialog() {
  if (document.getElementById("neonNpcDialog")) return;
  initializeNeonNpcStyles();
  const dialog = document.createElement("div");
  dialog.id = "neonNpcDialog";
  dialog.className = "neon-npc-dialog";
  let questHtml = "";
  if (!neonQuestActive && !neonQuestCompleted) {
    questHtml = `<div class='neon-npc-text'><b>${NEON_QUEST.title}</b><br>Награда: ${NEON_QUEST.reward.quantity} баляров<br><button class='neon-npc-btn' id='acceptNeonQuestBtn'>Взять задание</button></div>`;
  } else if (neonQuestActive && !neonQuestCompleted) {
    questHtml = `<div class='neon-npc-text'><b>${NEON_QUEST.title}</b><br>Прогресс: ${neonQuestProgress}/3 мутантов<br>Награда: ${NEON_QUEST.reward.quantity} баляров</div>`;
  } else if (neonQuestCompleted) {
    questHtml = `<div class='neon-npc-text'>Задание выполнено! Получено ${NEON_QUEST.reward.quantity} баляров.</div>`;
  }
  dialog.innerHTML = `
    <div class="neon-npc-title">${NEON_NPC.name}</div>
    ${questHtml}
    <button class="neon-npc-btn" id="closeNeonQuestBtn">Закрыть</button>
  `;
  document.body.appendChild(dialog);
  NEON_NPC.isDialogOpen = true;
  document.getElementById("closeNeonQuestBtn").onclick = () => {
    NEON_NPC.isDialogOpen = false;
    dialog.remove();
  };
  if (!neonQuestActive && !neonQuestCompleted) {
    document.getElementById("acceptNeonQuestBtn").onclick = () => {
      neonQuestActive = true;
      neonQuestProgress = 0;
      dialog.querySelector(
        ".neon-npc-text"
      ).innerHTML = `<b>${NEON_QUEST.title}</b><br>Прогресс: 0/3 мутантов<br>Награда: ${NEON_QUEST.reward.quantity} баляров`;
    };
  }
}

function removeNeonNpcButtons() {
  if (neonNpcButtonsContainer) {
    document.body.removeChild(neonNpcButtonsContainer);
    neonNpcButtonsContainer = null;
    neonNpcButtonsVisible = false;
  }
}

function updateNeonNpc(deltaTime) {
  if (window.worldSystem.currentWorldId !== 0) return;
  const me = typeof players !== "undefined" ? players.get(myId) : null;
  if (!me) return;

  // Движение между точками (двигается, если игрок не рядом)
  let dx = me.x - NEON_NPC.x;
  let dy = me.y - NEON_NPC.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  const playerNear = dist < NEON_NPC.interactionRadius;

  if (!playerNear) {
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
      const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
      const speed = 0.05; // Было 0.1, теперь в 2 раза медленнее
      if (tdist > 2) {
        NEON_NPC.x += (tdx / tdist) * speed * deltaTime;
        NEON_NPC.y += (tdy / tdist) * speed * deltaTime;
      } else {
        NEON_NPC.isWaiting = true;
        NEON_NPC.waitTimer = 0;
      }
    }
  }

  // Управление флагом близости
  if (playerNear && !NEON_NPC.isPlayerNear) {
    NEON_NPC.isPlayerNear = true;
  } else if (!playerNear && NEON_NPC.isPlayerNear) {
    NEON_NPC.isPlayerNear = false;
    NEON_NPC.isDialogOpen = false;
    removeNeonNpcButtons();
  }

  // Остановка при взаимодействии
  if (playerNear && !NEON_NPC.isDialogOpen) {
    NEON_NPC.isDialogOpen = true;
    if ((me.level || 0) < 1) {
      showNeonNpcDialog(
        "Привет! Ты ещё не достиг уровня 1. Возвращайся, когда станешь опытнее.",
        false
      );
    } else {
      showNeonNpcDialog(
        "Ты уже достаточно опытен! Я могу дать тебе задание.",
        true
      );
    }
  }
}

function showNeonNpcDialog(text, showQuest) {
  initializeNeonNpcStyles();
  if (NEON_NPC.isMet) return; // После знакомства окно больше не появляется
  if (document.getElementById("neonNpcDialog")) return;
  const dialog = document.createElement("div");
  dialog.id = "neonNpcDialog";
  dialog.className = "neon-npc-dialog";
  dialog.innerHTML = `
    <div class="neon-npc-title">${NEON_NPC.name}</div>
    <div class="neon-npc-text">${text}</div>
    <button class="neon-npc-btn" id="neonNpcDialogBtn">${
      showQuest ? "Задания" : "Поздороваться"
    }</button>
  `;
  document.body.appendChild(dialog);
  NEON_NPC.isDialogOpen = true;
  // Кнопка диалога
  const dialogBtn = document.getElementById("neonNpcDialogBtn");
  dialogBtn.addEventListener("click", () => {
    const me = typeof players !== "undefined" ? players.get(myId) : null;
    if (!NEON_NPC.isMet && window.levelSystem) {
      if (me && me.level >= 1) {
        NEON_NPC.isMet = true;
        NEON_NPC.showQuestButton = true;
        if (typeof ws !== "undefined") {
          ws.send(JSON.stringify({ type: "meetNeonAlex" }));
        }
        NEON_NPC.isDialogOpen = false;
        if (document.body.contains(dialog)) document.body.removeChild(dialog);
      } else {
        NEON_NPC.isDialogOpen = false;
        if (document.body.contains(dialog)) document.body.removeChild(dialog);
      }
    } else {
      NEON_NPC.isDialogOpen = false;
      if (document.body.contains(dialog)) document.body.removeChild(dialog);
    }
  });
  // Слушаем убийства мутантов для квеста
  if (
    window.levelSystem &&
    typeof window.levelSystem.handleEnemyKill === "function"
  ) {
    const origHandleEnemyKill = window.levelSystem.handleEnemyKill;
    window.levelSystem.handleEnemyKill = function (data) {
      origHandleEnemyKill(data);
      if (
        neonQuestActive &&
        !neonQuestCompleted &&
        data &&
        data.type === "mutant"
      ) {
        neonQuestProgress++;
        if (neonQuestProgress >= 3) {
          neonQuestCompleted = true;
          neonQuestActive = false;
          // TODO: начислить баляры игроку
          // Можно добавить: players.get(myId).balyary += NEON_QUEST.reward.quantity;
        }
      }
    };
  }
}

// Кнопки над NPC
function drawNeonNpc() {
  if (window.worldSystem.currentWorldId !== 0) return;
  const camera = window.movementSystem.getCamera();
  const screenX = NEON_NPC.x - camera.x;
  const screenY = NEON_NPC.y - camera.y - 20;
  let sprite = window.images?.[NEON_NPC.spriteKey];
  // Попробуем явно получить через document, если window.images не сработал
  if (!sprite) sprite = document.getElementById("alexNeonSprite");
  // Куллинг
  if (
    screenX < -NEON_NPC.width - 100 ||
    screenX > canvas.width + NEON_NPC.width + 100 ||
    screenY < -NEON_NPC.height - 100 ||
    screenY > canvas.height + NEON_NPC.height + 100
  ) {
    return;
  }
  if (sprite && sprite.complete && sprite.width >= 70) {
    ctx.drawImage(
      sprite,
      neonNpcFrame * 70,
      0,
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
    ctx.fillStyle = "#003344";
    ctx.font = "30px Arial";
    ctx.fillText("A", screenX + 20, screenY + 50);
  }
  // Имя и кнопки
  if (NEON_NPC.isMet && NEON_NPC.isPlayerNear) {
    ctx.font = "bold 16px Orbitron, Arial";
    ctx.fillStyle = "#00eaff";
    ctx.textAlign = "center";
    ctx.fillText(NEON_NPC.name, screenX + 35, screenY - 25);
    if (!neonNpcButtonsVisible) {
      createNeonNpcButtons(screenX, screenY);
    }
  } else {
    removeNeonNpcButtons();
  }
}

// Синхронизация состояния знакомства с сервера
if (typeof ws !== "undefined") {
  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "update" && data.player) {
        NEON_NPC.isMet = !!data.player.alexNeonMet;
        NEON_NPC.showQuestButton = !!data.player.alexNeonMet;
      }
    } catch (e) {}
  });
}

window.neonNpcSystem = {
  update: updateNeonNpc,
  draw: drawNeonNpc,
};
