// thimblerigger.js — Напёрсточник в Неоновом городе (ПРОСТАЯ РАБОЧАЯ ИГРА)

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
let isPlayerNearThimblerigger = false;
let hasGreetingBeenShownThisSession = false;

let thimbleriggerSprite = null;
let thimbleriggerButtonsContainer = null;

// Анимация NPC
let thimbleriggerFrame = 0;
let thimbleriggerFrameTime = 0;
const THIMBLERIGGER_FRAME_DURATION = 150;
const THIMBLERIGGER_TOTAL_FRAMES = 13;

// Простая игра
let gameDialog = null;
let correctCup = -1; // 0, 1 или 2
let gameActive = false;

// Подключаем внешний CSS файл
(() => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "thimblerigger.css";
  document.head.appendChild(link);
})();

function openThimbleriggerGame() {
  if (isThimbleriggerDialogOpen) return;
  isThimbleriggerDialogOpen = true;
  document.body.classList.add("npc-dialog-active");
  gameActive = false;

  gameDialog = document.createElement("div");
  gameDialog.className = "npc-dialog open";
  gameDialog.innerHTML = `
    <div class="npc-dialog-header">
      <h2 class="npc-title">ИГРА В НАПЁРСТКИ</h2>
    </div>
    <div class="npc-dialog-content" style="display:flex;flex-direction:column;gap:15px;">
      <div style="text-align:center;">
        <input type="number" min="1" max="100" value="50" id="betInput" class="bet-input" style="width:80px;padding:8px;font-size:16px;text-align:center;">  
        <button class="neon-btn-neon" id="startBtn" style="margin-left:15px;padding:12px 24px;"></button>

      <div class="thimble-game-container" id="gameArea">
        <div class="game-message" id="msg"></div>
      </div>

      <button class="neon-btn-neon" onclick="window.thimbleriggerSystem.closeDialog()"></button>
    </div>
  `;
  document.body.appendChild(gameDialog);

  // Навешиваем обработчик на кнопку НАЧАТЬ
  const startBtn = gameDialog.querySelector("#startBtn");
  startBtn.onclick = () => {
    const bet = parseInt(gameDialog.querySelector("#betInput").value) || 50;
    if (bet < 1 || bet > 100) return alert("Ставка от 1 до 100 баляров!");

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "thimbleriggerBet", bet }));
    } else {
      alert("Соединение с сервером потеряно. Попробуйте позже.");
    }
  };
}

function startSimpleGame(bet) {
  const area = document.getElementById("gameArea");
  const msg = document.getElementById("msg");
  msg.textContent = "";
  area.innerHTML = '<div class="game-message" id="msg"></div>';

  correctCup = Math.floor(Math.random() * 3); // 0, 1 или 2

  const positions = [
    "calc(16.666% - 80px)",
    "calc(50% - 80px)",
    "calc(83.333% - 80px)",
  ];
  const ballPositions = [
    "calc(16.666% - 10px)",
    "calc(50% - 10px)",
    "calc(83.333% - 10px)",
  ];

  const cups = [];
  for (let i = 0; i < 3; i++) {
    const cup = document.createElement("div");
    cup.className = "thimble-cup";
    cup.style.left = positions[i];
    cup.style.transition = "left 0.25s ease-in-out";
    area.appendChild(cup);
    cups.push(cup);
  }

  const initialBall = document.createElement("div");
  initialBall.className = "thimble-ball";
  initialBall.style.left = ballPositions[correctCup];
  initialBall.style.opacity = "1";
  area.appendChild(initialBall);

  msg.textContent = "Смотри, где шарик!";

  gameActive = false;

  setTimeout(() => {
    initialBall.remove();
    msg.textContent = "Перемешиваю... быстро!";

    let swapCount = 0;
    const totalSwaps = 10 + Math.floor(Math.random() * 6);

    function performSwap() {
      let a = Math.floor(Math.random() * 3);
      let b = Math.floor(Math.random() * 3);
      if (Math.random() < 0.2) b = a;

      if (a !== b) {
        const temp = cups[a].style.left;
        cups[a].style.left = cups[b].style.left;
        cups[b].style.left = temp;

        if (correctCup === a) correctCup = b;
        else if (correctCup === b) correctCup = a;
      }

      swapCount++;
      if (swapCount >= totalSwaps) {
        msg.textContent = "Где шарик? Выбирай!";
        gameActive = true;

        console.log("Финальный correctCup после свапов:", correctCup);

        cups.forEach((cup, idx) => {
          cup.onclick = () => chooseCup(idx, bet);
        });
      } else {
        const nextDelay = 200 + Math.floor(Math.random() * 300);
        setTimeout(performSwap, nextDelay);
      }
    }

    performSwap();
  }, 2000);
}

function chooseCup(selected, bet) {
  if (!gameActive) return;
  gameActive = false;

  const area = document.getElementById("gameArea");
  const msgEl = document.getElementById("msg");

  const cups = area.querySelectorAll(".thimble-cup");
  cups.forEach((cup) => cup.classList.add("lifted"));

  const ball = document.createElement("div");
  ball.className = "thimble-ball";
  const ballPositions = [
    "calc(16.666% - 10px)",
    "calc(50% - 10px)",
    "calc(83.333% - 10px)",
  ];
  ball.style.left = cups[correctCup].style.left.replace("80px", "10px"); // Корректировка для шарика (half_width diff)
  area.appendChild(ball);

  console.log(
    "Выбранный индекс:",
    selected,
    "Правильный индекс:",
    correctCup,
    "Визуальная позиция правильного:",
    cups[correctCup].style.left
  );

  setTimeout(() => {
    const won = selected === correctCup;

    if (!won) {
      console.warn(
        "Проигрыш: возможно, несоответствие визуала и индекса — проверь свапы."
      );
    }

    if (won) {
      msgEl.textContent = "УГАДАЛ! ВЫИГРЫШ!";
      msgEl.style.color = "#00ff00";

      const balyarySlot = inventory.findIndex(
        (slot) => slot && slot.type === "balyary"
      );
      const winAmount = bet * 2;
      if (balyarySlot !== -1) {
        inventory[balyarySlot].quantity =
          (inventory[balyarySlot].quantity || 0) + winAmount;
      } else {
        const freeSlot = inventory.findIndex((slot) => slot === null);
        if (freeSlot !== -1) {
          inventory[freeSlot] = { type: "balyary", quantity: winAmount };
        }
      }
      if (window.levelSystem) {
        window.levelSystem.currentXP += bet;
      }
      updateInventoryDisplay();
      updateStatsDisplay();
    } else {
      msgEl.textContent = "НЕ ПОВЕЗЛО! ПРОИГРЫШ!";
      msgEl.style.color = "#ff0000";
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "thimbleriggerGameResult",
          won,
          bet,
          selectedCup: selected,
          correctCup,
        })
      );
    }

    setTimeout(() => {
      const input = gameDialog.querySelector("#betInput");
      if (input) input.disabled = false;
      msgEl.textContent = "";
      gameActive = false;
    }, 3000);
  }, 800);
}

function closeThimbleriggerDialog() {
  if (!isThimbleriggerDialogOpen) return;
  isThimbleriggerDialogOpen = false;
  document.body.classList.remove("npc-dialog-active");
  const dialog = document.querySelector(".npc-dialog.open");
  if (dialog) dialog.remove();
  gameDialog = null;
  gameActive = false;
}

function openThimbleriggerTalk() {
  if (isThimbleriggerDialogOpen) return;
  isThimbleriggerDialogOpen = true;
  document.body.classList.add("npc-dialog-active");

  const dialog = document.createElement("div");
  dialog.className = "npc-dialog open";
  dialog.innerHTML = `
    <div class="npc-dialog-header"><h2 class="npc-title">${THIMBLERIGGER.name}</h2></div>
    <div class="npc-dialog-content">
      <p class="npc-text">Эй, сталкер! Хочешь рискнуть? Три напёрстка — один шарик.</p>
      <p class="npc-text">Угадаешь — удвою твою ставку. Проиграешь — баляры мои.</p>
      <p class="npc-text">Ставка от 1 до 10 баляров. Готов играть?</p>
    </div>
    <button class="neon-btn" onclick="window.thimbleriggerSystem.closeDialog()">ЗАКРЫТЬ</button>
  `;
  document.body.appendChild(dialog);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isThimbleriggerDialogOpen)
    closeThimbleriggerDialog();
});

function setThimbleriggerMet(met) {
  isThimbleriggerMet = met;
  hasGreetingBeenShownThisSession = met;
  if (!met && isPlayerNearThimblerigger) removeThimbleriggerButtons();
}

function createThimbleriggerButtons() {
  if (thimbleriggerButtonsContainer) return;
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

  const camera = window.movementSystem.getCamera();
  const cameraX = camera.x;
  const cameraY = camera.y;
  const screenX = THIMBLERIGGER.x - cameraX;
  const screenY = THIMBLERIGGER.y - cameraY;

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

  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 6;
  ctx.fillStyle = isThimbleriggerMet ? "#ffd700" : "#ffffff";
  const nameText = isThimbleriggerMet ? THIMBLERIGGER.name : "?";
  ctx.strokeText(nameText, screenX + 35, screenY - 30);
  ctx.fillText(nameText, screenX + 35, screenY - 30);

  updateThimbleriggerButtonsPosition(cameraX, cameraY);
}

function checkThimbleriggerProximity() {
  const me = players.get(myId);
  if (
    !me ||
    me.worldId !== THIMBLERIGGER.worldId ||
    me.health <= 0 ||
    window.worldSystem.currentWorldId !== THIMBLERIGGER.worldId
  ) {
    if (isPlayerNearThimblerigger) {
      isPlayerNearThimblerigger = false;
      removeThimbleriggerButtons();
    }
    return;
  }

  const dx = me.x + 35 - (THIMBLERIGGER.x + 35);
  const dy = me.y + 35 - (THIMBLERIGGER.y + 35);
  const dist = Math.hypot(dx, dy);
  const nowNear = dist < THIMBLERIGGER.interactionRadius;

  if (nowNear && !isPlayerNearThimblerigger) {
    isPlayerNearThimblerigger = true;
    if (isThimbleriggerMet) createThimbleriggerButtons();
    if (
      !isThimbleriggerMet &&
      !hasGreetingBeenShownThisSession &&
      ws?.readyState === WebSocket.OPEN
    ) {
      hasGreetingBeenShownThisSession = true;
      sendWhenReady(ws, JSON.stringify({ type: "meetThimblerigger" }));
    }
  } else if (!nowNear && isPlayerNearThimblerigger) {
    isPlayerNearThimblerigger = false;
    removeThimbleriggerButtons();
  }
}

window.thimbleriggerSystem = {
  drawThimblerigger,
  checkThimbleriggerProximity,
  setThimbleriggerMet,
  closeDialog: closeThimbleriggerDialog,
  initialize: (sprite) => {
    thimbleriggerSprite = sprite;
    hasGreetingBeenShownThisSession = false;
  },
};
