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

(() => {
  const style = document.createElement("style");
  style.textContent = `
    .thimblerigger-talk-btn {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.25), rgba(0, 150, 150, 0.35));
      color: #00ffff;
      border-color: #00ffff;
    }
    .thimblerigger-play-btn {
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(200, 150, 0, 0.35));
      color: #ffd700;
      border-color: #ffd700;
    }
    .thimblerigger-talk-btn:hover, .thimblerigger-play-btn:hover {
      transform: scale(1.07);
      box-shadow: 0 0 25px rgba(255, 215, 0, 1);
    }

    .thimble-game-container {
      position: relative;
      width: 100%;
      height: 320px;
      margin: 15px 0;
      background: linear-gradient(135deg, rgba(10,0,30,0.95), rgba(0,20,40,0.95));
      border: 2px solid #ff00ff;
      border-radius: 12px;
      overflow: hidden; /* ← ДОБАВЛЕНО: убрать прокрутку */
      box-shadow: 0 0 20px rgba(255,0,255,0.6);
    }

    .thimble-cup {
      position: absolute;
      width: 90px;
      height: 120px;
      bottom: 40px;
      background: radial-gradient(circle at top, #00ffff, #006666);
      border: 3px solid #00ffff;
      border-radius: 12px 12px 60px 60px;
      box-shadow: 0 8px 20px rgba(0,255,255,0.6), inset 0 -15px 30px rgba(0,0,0,0.7);
      cursor: pointer;
      transition: left 0.25s ease-in-out;
      user-select: none;
    }
    .thimble-cup:hover {
      transform: translateY(-10px);
      box-shadow: 0 15px 30px rgba(0,255,255,0.8);
    }
    .thimble-cup.lifted {
      transform: translateY(-100px) !important;
      box-shadow: 0 0 50px #ffd700 !important;
    }

    .thimble-ball {
      position: absolute;
      width: 40px;
      height: 40px;
      bottom: 60px;
      background: radial-gradient(circle at 30% 30%, #ffff00, #ffaa00);
      border-radius: 50%;
      box-shadow: 0 0 25px #ffff00, 0 8px 15px rgba(0,0,0,0.6);
      z-index: 5;
    }

    .game-message {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 28px;
      font-weight: bold;
      color: #ffd700;
      text-shadow: 0 0 15px #ff00ff;
      z-index: 30;
    }

    /* ← ДОБАВЛЕНО: стили из npc-styles.css для кнопок — .neon-btn и hover эффекты */
    .neon-btn {
      padding: 14px 28px;
      font-size: 17px;
      font-family: "Courier New", monospace;
      background: linear-gradient(135deg, #00ffff, #ff00ff);
      border: none;
      color: #000;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 0 15px rgba(0, 255, 255, 0.8), 0 0 25px rgba(255, 0, 255, 0.6);
      transition: all 0.3s;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      flex-shrink: 0;
      margin-top: 12px;
    }

    .neon-btn:hover {
      box-shadow: 0 0 25px rgba(0, 255, 255, 1), 0 0 40px rgba(255, 0, 255, 0.8);
      transform: scale(1.06);
    }

    /* Для диалога — overflow hidden, чтобы убрать прокрутку */
    .npc-dialog-content {
      flex: 1;
      overflow: hidden; /* ← ДОБАВЛЕНО: полностью убрать прокрутку (содержимое влезает) */
      padding-right: 10px;
      margin-top: 10px;
    }
  `;
  document.head.appendChild(style);
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
        <button class="neon-btn" id="startBtn" style="margin-left:15px;padding:12px 24px;">НАЧАТЬ ИГРУ</button>

      <div class="thimble-game-container" id="gameArea">
        <div class="game-message" id="msg"></div>
      </div>

      <button class="neon-btn" onclick="window.thimbleriggerSystem.closeDialog()">ЗАКРЫТЬ</button>
    </div>
  `;
  document.body.appendChild(gameDialog);

  // Навешиваем обработчик на кнопку НАЧАТЬ
  const startBtn = gameDialog.querySelector("#startBtn");
  startBtn.onclick = () => {
    const bet = parseInt(gameDialog.querySelector("#betInput").value) || 50;
    if (bet < 1 || bet > 100)
      return alert("Ставка от 1 до 100 баляров!"); /* ← ИЗМЕНИЛ: 1-100 */

    // ← ДОБАВЛЕНО: отправка ставки на сервер (пункт 3)
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "thimbleriggerBet", bet }));
    } else {
      alert("Соединение с сервером потеряно. Попробуйте позже.");
    }
  };
}

function startSimpleGame(bet) {
  /* ← ДОБАВЛЕНО: принимаем bet как параметр (после серверного ок) */
  const area = document.getElementById("gameArea");
  const msg = document.getElementById("msg");
  msg.textContent = "";
  area.innerHTML = '<div class="game-message" id="msg"></div>';

  // Шарик начинается под центральным напёрстком (индекс 1)
  correctCup = 1; // Фиксируем стартовую позицию — игрок увидит!

  // Создаём шарик в центре
  const ball = document.createElement("div");
  ball.className = "thimble-ball";
  ball.style.left = "calc(50% - 20px)";
  area.appendChild(ball);

  // Позиции напёрстков
  const positions = [
    "calc(20% - 45px)",
    "calc(50% - 45px)",
    "calc(80% - 45px)",
  ];

  // Создаём напёрстки
  const cups = [];
  for (let i = 0; i < 3; i++) {
    const cup = document.createElement("div");
    cup.className = "thimble-cup";
    cup.style.left = positions[i];
    cup.style.transition = "left 0.25s ease-in-out"; // Быстрая анимация
    area.appendChild(cup);
    cups.push(cup);
  }

  gameActive = false;

  // 1. Шарик виден → напёрстки накрывают
  setTimeout(() => {
    ball.remove();
    msg.textContent = "Перемешиваю... быстро!";

    // 2. Случайные свапы — в 2 раза быстрее
    let swapCount = 0;
    const totalSwaps = 9 + Math.floor(Math.random() * 4); // 9–12 свапов

    const swapInterval = setInterval(() => {
      // Случайная пара разных напёрстков
      let a = Math.floor(Math.random() * 3);
      let b = Math.floor(Math.random() * 3);
      while (b === a) b = Math.floor(Math.random() * 3);

      // Меняем позиции
      const temp = cups[a].style.left;
      cups[a].style.left = cups[b].style.left;
      cups[b].style.left = temp;

      // Реально отслеживаем шарик!
      if (correctCup === a) correctCup = b;
      else if (correctCup === b) correctCup = a;

      swapCount++;
      if (swapCount >= totalSwaps) {
        clearInterval(swapInterval);
        msg.textContent = "Где шарик? Выбирай!";
        gameActive = true;

        // ← ДОБАВЛЕНО: дебажный лог после всех свапов (пункт 1, убери после теста)
        console.log("Финальный correctCup после свапов:", correctCup);

        // Навешиваем обработчики на текущие позиции
        cups.forEach((cup, idx) => {
          cup.onclick = () =>
            chooseCup(idx, bet); /* ← ДОБАВЛЕНО: передаём bet в chooseCup */
        });
      }
    }, 350); // В 2 раза быстрее (было 650)
  }, 1200);
}

function chooseCup(selected, bet) {
  /* ← ДОБАВЛЕНО: принимаем bet */
  if (!gameActive) return;
  gameActive = false;

  const area = document.getElementById("gameArea");
  const msgEl = document.getElementById("msg");

  // Поднимаем все напёрстки
  const cups = area.querySelectorAll(".thimble-cup");
  cups.forEach((cup) => cup.classList.add("lifted"));

  // Показываем шарик под правильным
  const ball = document.createElement("div");
  ball.className = "thimble-ball";
  const ballPositions = [
    "calc(20% - 20px)",
    "calc(50% - 20px)",
    "calc(80% - 20px)",
  ];
  ball.style.left = ballPositions[correctCup];
  area.appendChild(ball);

  // ← ДОБАВЛЕНО: дебажный лог для проверки (пункт 1, убери после теста)
  console.log("Выбран:", selected, "Правильный:", correctCup);

  // Результат
  setTimeout(() => {
    const won =
      selected === correctCup; /* ← УТОЧНЕНО: строгий === для фикса бага */
    if (won) {
      msgEl.textContent = "УГАДАЛ! ВЫИГРЫШ!";
      msgEl.style.color = "#00ff00";

      // ← ДОБАВЛЕНО: локальное зачисление (пункт 2), но финально синхронизируем с сервером ниже
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
      // Локально добавляем XP (но сервер перезапишет)
      if (window.levelSystem) {
        window.levelSystem.currentXP += bet;
      }
      updateInventoryDisplay();
      updateStatsDisplay();
    } else {
      msgEl.textContent = "НЕ ПОВЕЗЛО! ПРОИГРЫШ!";
      msgEl.style.color = "#ff0000";
    }

    // ← ДОБАВЛЕНО: отправка результата на сервер (пункт 3)
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "thimbleriggerGameResult",
          won,
          bet,
          selectedCup: selected,
          correctCup, // для серверной валидации
        })
      );
    }

    // Через 3 секунды — готовность к новой игре
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

// === Остальной код NPC (без изменений) ===

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
