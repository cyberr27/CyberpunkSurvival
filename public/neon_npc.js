// neon_npc.js — Neon Alex (2025) — использует только npc-styles.css

const NEON_NPC = {
  name: "Neon Alex",
  spriteKey: "alexNeonSprite",
  photoKey: "alexNeonFoto",
  x: 502,
  y: 2771,
  width: 70,
  height: 70,
  interactionRadius: 80,

  // Патруль
  speed: 0.02,
  targetA: { x: 502, y: 2771 },
  targetB: { x: 1368, y: 1657 },
  movingToB: true,
  isWaiting: true,
  waitDuration: 20000,
  waitTimer: 0,

  // Анимация
  frame: 0,
  frameTime: 0,
  direction: "down",
  state: "idle",

  // Состояние
  isPlayerNear: false,
  isDialogOpen: false,
  isMet: false,
};

let neonButtonsContainer = null;
let activeDialog = null;
let rejectionShownThisApproach = false;
let firstMeetingDialogClosed = false;

// 9 тем разговора
const NEON_TOPICS = [
  {
    title: "О городе",
    text: "Этот город никогда не спит. Здесь либо ты ешь, либо тебя едят.",
  },
  {
    title: "Кто ты такой?",
    text: "Я — Neon Alex. Был когда-то хакером высшего звена, теперь просто пытаюсь выжить.",
  },
  {
    title: "Где мы?",
    text: "Заброшенный сектор 7. Корпорации бросили его лет 15 назад. Теперь здесь только мы и мутанты.",
  },
  {
    title: "Что с корпорациями?",
    text: "Они всё ещё наверху, в небоскрёбах. Сюда спускаются только за редкими ресурсами… или за нами.",
  },
  {
    title: "Как выживать?",
    text: "Не доверяй никому. Держи нож за спиной, а глаза открытыми. И никогда не пей воду из открытых источников.",
  },
  {
    title: "Есть ли выход?",
    text: "Говорят, в старом метро есть туннель на поверхность. Но туда никто не возвращался.",
  },
  {
    title: "Твоя история",
    text: "Я украл у них данные, которые стоили миллиарды. Теперь я в розыске. А ты… ты тоже беглец?",
  },
  {
    title: "О мутантах",
    text: "Радиация, эксперименты, химия… всё вместе. Некоторые ещё помнят, что были людьми.",
  },
  {
    title: "Зачем ты здесь?",
    text: "Жду человека, который сможет вытащить меня отсюда. Может, это ты?",
  },
];

// ==================== ДИАЛОГИ ====================

function closeActiveDialog() {
  if (activeDialog) {
    activeDialog.remove();
    activeDialog = null;
  }
  NEON_NPC.isDialogOpen = false;
}

// Первая встреча
function openFirstMeetingDialog() {
  closeActiveDialog();

  activeDialog = document.createElement("div");
  activeDialog.className = "npc-dialog";

  activeDialog.innerHTML = `
    <div class="npc-dialog-header">
      <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
      <h2 class="npc-title">${NEON_NPC.name}</h2>
    </div>
    <div class="npc-dialog-content">
      <div class="npc-text">
        Новое лицо в секторе 7? Редкость...<br><br>
        Меня зовут Neon Alex. Если выживешь — поговорим.
      </div>
    </div>
    <button class="neon-btn" onclick="closeFirstMeetingAndEnableButtons()">Понял</button>
  `;

  document.body.appendChild(activeDialog);
  NEON_NPC.isDialogOpen = true;
  // НЕ ставим isMet = true сразу! Ставим только после нажатия кнопки
}

// Новая функция — закрывает первый диалог и разблокирует кнопки
window.closeFirstMeetingAndEnableButtons = () => {
  closeActiveDialog();
  NEON_NPC.isMet = true;
  firstMeetingDialogClosed = true; // теперь можно показывать кнопки

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "meetNeonAlex" }));
  }
};

// Отказ (если уровень < 5 — можно поменять)
function openRejectionDialog() {
  closeActiveDialog();

  activeDialog = document.createElement("div");
  activeDialog.className = "npc-dialog";

  activeDialog.innerHTML = `
    <div class="npc-dialog-header">
      <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
      <h2 class="npc-title">${NEON_NPC.name}</h2>
    </div>
    <div class="npc-dialog-content">
      <div class="npc-text">
        Слабак... Возвращайся, когда прокачаешься хотя бы до 5 уровня.
      </div>
    </div>
    <button class="neon-btn" onclick="closeActiveDialog()">Уйти</button>
  `;

  document.body.appendChild(activeDialog);
  NEON_NPC.isDialogOpen = true;
}

// Диалог «Поговорить»
function openNeonTalkDialog() {
  closeActiveDialog();

  activeDialog = document.createElement("div");
  activeDialog.className = "npc-dialog";

  let topicsHTML = "";
  NEON_TOPICS.forEach((topic) => {
    topicsHTML += `
      <div class="talk-topic" onclick="showTopicText('${topic.title}', \`${topic.text}\`)">
        ${topic.title}
      </div>`;
  });

  activeDialog.innerHTML = `
    <div class="npc-dialog-header">
      <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
      <h2 class="npc-title">${NEON_NPC.name}</h2>
    </div>
    <div class="npc-dialog-content">
      <div class="talk-topics" id="neonTopicsList">${topicsHTML}</div>
      <div class="npc-text fullscreen" id="neonTopicText" style="display:none;"></div>
    </div>
    <button class="neon-btn" onclick="closeActiveDialog()">Закрыть</button>
  `;

  document.body.appendChild(activeDialog);
  NEON_NPC.isDialogOpen = true;
}

// Показ текста выбранной темы
window.showTopicText = (title, text) => {
  document.getElementById("neonTopicsList").classList.add("hidden");
  const textEl = document.getElementById("neonTopicText");
  textEl.style.display = "flex";
  textEl.innerHTML = `<b>${title}</b><br><br>${text}`;
};

// ==================== КНОПКИ НАД ГОЛОВОЙ ====================

function createNeonButtons(screenX, screenY) {
  if (neonButtonsContainer) return;

  neonButtonsContainer = document.createElement("div");
  neonButtonsContainer.className = "npc-buttons-container";
  neonButtonsContainer.style.left = `${screenX + 35}px`;
  neonButtonsContainer.style.top = `${screenY - 90}px`;

  const talkBtn = document.createElement("div");
  talkBtn.className = "npc-button npc-talk-btn";
  talkBtn.textContent = "Поговорить";
  talkBtn.onclick = (e) => {
    e.stopPropagation();
    openNeonTalkDialog();
  };

  const questBtn = document.createElement("div");
  questBtn.className = "npc-button npc-quests-btn";
  questBtn.textContent = "Задания";
  questBtn.onclick = (e) => {
    e.stopPropagation();
    alert("Квесты Neon Alex пока в разработке");
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

// ==================== ОБНОВЛЕНИЕ И ОТРИСОВКА ====================

function updateNeonNpc(deltaTime) {
  if (window.worldSystem.currentWorldId !== 0) return;
  const me = players.get(myId);
  if (!me) return;

  const dx = me.x - NEON_NPC.x;
  const dy = me.y - NEON_NPC.y;
  const dist = Math.hypot(dx, dy);
  NEON_NPC.isPlayerNear = dist < NEON_NPC.interactionRadius;

  // Движение по маршруту, когда игрок далеко
  if (!NEON_NPC.isPlayerNear && !NEON_NPC.isDialogOpen) {
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

  // Анимация ходьбы
  if (NEON_NPC.state === "walking") {
    NEON_NPC.frameTime += deltaTime;
    if (NEON_NPC.frameTime >= 120) {
      NEON_NPC.frameTime -= 120;
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

  // Куллинг
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

  // Имя или «?» до знакомства
  ctx.fillStyle = NEON_NPC.isMet ? "#066f00ff" : "#ffffff";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    NEON_NPC.isMet ? NEON_NPC.name : "?",
    screenX + 35,
    screenY - 35
  );

  // Логика кнопок и диалогов
  const player = players.get(myId);
  const level = player?.level || 0;

  if (NEON_NPC.isPlayerNear) {
    if (level < 1) {
      if (!rejectionShownThisApproach && !NEON_NPC.isDialogOpen) {
        openRejectionDialog();
        rejectionShownThisApproach = true;
      }
      removeNeonButtons();
    } else {
      // Если ещё не было первой встречи вообще
      if (!NEON_NPC.isMet && !NEON_NPC.isDialogOpen) {
        openFirstMeetingDialog();
        removeNeonButtons(); // на всякий случай, чтобы не было глюков
      }
      // Если уже встречались И игрок закрыл первое приветствие → показываем кнопки
      else if (
        NEON_NPC.isMet &&
        firstMeetingDialogClosed &&
        !NEON_NPC.isDialogOpen
      ) {
        createNeonButtons(screenX, screenY);
      }
      // Если диалог открыт (любой) → убираем кнопки
      if (NEON_NPC.isDialogOpen) {
        removeNeonButtons();
      }
    }
  } else {
    closeActiveDialog();
    removeNeonButtons();
    rejectionShownThisApproach = false;
    // firstMeetingDialogClosed не сбрасываем — встреча уже произошла навсегда
  }
}

// Синхронизация с сервером
if (typeof ws !== "undefined") {
  ws.addEventListener("message", (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === "update" && data.player?.alexNeonMet !== undefined) {
        NEON_NPC.isMet = !!data.player.alexNeonMet;
      }
    } catch {}
  });
}

// Экспорт
window.neonNpcSystem = {
  update: updateNeonNpc,
  draw: drawNeonNpc,
};
