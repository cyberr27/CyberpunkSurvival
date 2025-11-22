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
      const speed = 0.1;
      if (tdist > 2) {
        NEON_NPC.x += (tdx / tdist) * speed * deltaTime;
        NEON_NPC.y += (tdy / tdist) * speed * deltaTime;
      } else {
        NEON_NPC.isWaiting = true;
        NEON_NPC.waitTimer = 0;
      }
    }
  }

  NEON_NPC.isPlayerNear = playerNear;

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
  const dialog = document.createElement("div");
  dialog.className = "npc-dialog neon-npc-dialog";
  dialog.innerHTML = `<div class="neon-npc-title">${NEON_NPC.name}</div><div class="neon-npc-text">${text}</div><button id="neonNpcDialogBtn" class="neon-npc-btn">Понятно</button>`;
  document.body.appendChild(dialog);
  document.getElementById("neonNpcDialogBtn").onclick = () => {
    dialog.remove();
    NEON_NPC.isDialogOpen = false;
    if (showQuest) {
      NEON_NPC.isMet = true;
      NEON_NPC.showQuestButton = true;
      if (typeof sendWhenReady === "function" && typeof ws !== "undefined") {
        sendWhenReady(
          ws,
          JSON.stringify({ type: "meetNeonAlex", alexNeonMet: true })
        );
      }
    } else {
      NEON_NPC.showQuestButton = false;
    }
  };
}

// Кнопки над NPC
let neonNpcButtonsContainer = null;
function createNeonNpcButtons(screenX, screenY) {
  if (neonNpcButtonsContainer)
    document.body.removeChild(neonNpcButtonsContainer);
  neonNpcButtonsContainer = document.createElement("div");
  neonNpcButtonsContainer.className = "jack-buttons-container";
  const totalButtonsHeight = 45 * 2 + 16;
  neonNpcButtonsContainer.style.left = screenX + NEON_NPC.width / 2 + "px";
  neonNpcButtonsContainer.style.top = screenY - totalButtonsHeight - 25 + "px";
  neonNpcButtonsContainer.style.transform = "translateX(-50%)";
  const talkBtn = document.createElement("div");
  talkBtn.className = "jack-button-talk";
  talkBtn.textContent = "Говорить";
  talkBtn.addEventListener("click", () => {
    showNeonNpcDialog(
      "Я — Алекс, местный неоновый информатор. Если хочешь узнать о городе или получить задание — спрашивай!",
      true
    );
  });
  const questBtn = document.createElement("div");
  questBtn.className = "jack-button-shop";
  questBtn.textContent = "Задания";
  questBtn.addEventListener("click", () => {
    showNeonNpcDialog("Пока доступных заданий нет. Возвращайся позже!", false);
  });
  neonNpcButtonsContainer.appendChild(talkBtn);
  neonNpcButtonsContainer.appendChild(questBtn);
  document.body.appendChild(neonNpcButtonsContainer);
}
function removeNeonNpcButtons() {
  if (neonNpcButtonsContainer) {
    document.body.removeChild(neonNpcButtonsContainer);
    neonNpcButtonsContainer = null;
  }
}

function drawNeonNpc() {
  if (window.worldSystem.currentWorldId !== 0) return;
  const camera = window.movementSystem.getCamera();
  const screenX = NEON_NPC.x - camera.x;
  const screenY = NEON_NPC.y - camera.y - 20;
  const sprite = window.images?.[NEON_NPC.spriteKey];
  // Куллинг
  if (
    screenX < -NEON_NPC.width - 100 ||
    screenX > canvas.width + NEON_NPC.width + 100 ||
    screenY < -NEON_NPC.height - 100 ||
    screenY > canvas.height + NEON_NPC.height + 100
  ) {
    return;
  }
  if (sprite?.complete && sprite.width >= 2800) {
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
  if (NEON_NPC.isMet) {
    ctx.font = "bold 16px Orbitron, Arial";
    ctx.fillStyle = "#00eaff";
    ctx.textAlign = "center";
    ctx.fillText(NEON_NPC.name, screenX + 35, screenY - 25);
    createNeonNpcButtons(screenX, screenY);
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
