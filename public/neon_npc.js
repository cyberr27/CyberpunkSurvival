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
// Список заданий Neon Alex
const NEON_QUESTS = [
  {
    id: 1,
    title: "Убей 3 мутантов в Неоновом городе",
    target: { type: "mutant", quantity: 3 },
    reward: { balyary: 5, xp: 5 },
  },
  {
    id: 2,
    title: "Принеси 2 банки энергетика",
    target: { type: "energy_drink", quantity: 2 },
    reward: { balyary: 3, xp: 3 },
  },
  {
    id: 3,
    title: "Собери 5 орехов",
    target: { type: "nut", quantity: 5 },
    reward: { balyary: 4, xp: 4 },
  },
  {
    id: 4,
    title: "Найди 2 бутылки воды",
    target: { type: "water_bottle", quantity: 2 },
    reward: { balyary: 2, xp: 2 },
  },
  {
    id: 5,
    title: "Принеси 3 яблока",
    target: { type: "apple", quantity: 3 },
    reward: { balyary: 3, xp: 3 },
  },
  {
    id: 6,
    title: "Собери 4 ягоды",
    target: { type: "berries", quantity: 4 },
    reward: { balyary: 3, xp: 3 },
  },
  {
    id: 7,
    title: "Принеси 2 банки сгущенки",
    target: { type: "condensed_milk", quantity: 2 },
    reward: { balyary: 4, xp: 4 },
  },
  {
    id: 8,
    title: "Убей 2 скорпионов",
    target: { type: "scorpion", quantity: 2 },
    reward: { balyary: 6, xp: 6 },
  },
  {
    id: 9,
    title: "Принеси 2 куска мяса",
    target: { type: "meat_chunk", quantity: 2 },
    reward: { balyary: 2, xp: 2 },
  },
  {
    id: 10,
    title: "Собери 3 гриба",
    target: { type: "mushroom", quantity: 3 },
    reward: { balyary: 3, xp: 3 },
  },
  {
    id: 11,
    title: "Принеси 2 банки тушёнки",
    target: { type: "canned_meat", quantity: 2 },
    reward: { balyary: 4, xp: 4 },
  },
];

let neonQuestState = {
  activeId: null,
  progress: 0,
  completed: false,
};
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

// Для анимации как у Джона
function updateNeonNpcAnimation(deltaTime) {
  neonNpcFrameTime += deltaTime;
  while (neonNpcFrameTime >= NEON_NPC_FRAME_DURATION) {
    neonNpcFrameTime -= NEON_NPC_FRAME_DURATION;
    neonNpcFrame = (neonNpcFrame + 1) % NEON_NPC_TOTAL_FRAMES;
  }
}

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
        border: 2px solid #00ffff;
        border-radius: 10px;
        padding: 20px;
        color: #00ffff;
        font-family: "Courier New", monospace;
        text-align: center;
        z-index: 1000;
        box-shadow: 0 0 20px rgba(0,255,255,0.5), 0 0 30px rgba(255,0,255,0.3);
        animation: neonPulse 2s infinite alternate;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .neon-npc-dialog.greeting, .neon-npc-dialog.talk {
        max-width: 450px;
        width: 90%;
        height: 500px;
      }
      .neon-npc-dialog.quest {
        width: 70vw;
        height: 74vh;
        overflow: auto;
      }
      .neon-npc-dialog-header {display:flex;align-items:center;justify-content:center;margin-bottom:15px;}
      .neon-npc-photo {width:80px;height:80px;border:2px solid #ff00ff;border-radius:50%;margin-right:15px;box-shadow:0 0 15px rgba(255,0,255,0.5);object-fit:cover;}
      .neon-npc-title {color:#00ffff;font-size:24px;text-shadow:0 0 5px #00ffff,0 0 10px #ff00ff;animation:flicker 1.5s infinite alternate;margin:0;}
      .neon-npc-text {margin:15px 0;font-size:16px;text-shadow:0 0 5px rgba(0,255,255,0.7);line-height:1.4;}
      .neon-npc-text.fullscreen {
        margin: 0;
        padding: 20px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(255, 0, 255, 0.5);
        border-radius: 8px;
        font-size: 18px;
        min-height: 200px;
        flex: 1;
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        text-align: center;
        overflow-y: auto;
        overflow-x: hidden;
        word-wrap: break-word;
        scrollbar-width: thin;
      }
      .neon-npc-dialog-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 10px;
        margin-top: 10px;
        scrollbar-width: thin;
        scrollbar-color: #ff00ff rgba(0, 0, 0, 0.5);
      }
      .neon-npc-dialog-content::-webkit-scrollbar {
        width: 8px;
      }
      .neon-npc-dialog-content::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.7);
        border-radius: 4px;
      }
      .neon-npc-dialog-content::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #00ffff, #ff00ff);
        border-radius: 4px;
        box-shadow: 0 0 10px rgba(255, 0, 255, 0.7);
      }
      .neon-talk-topics {
        max-height: 300px;
        overflow-y: auto;
        overflow-x: hidden;
        background: rgba(10, 10, 10, 0.9);
        border: 1px solid #00ffff;
        border-radius: 5px;
        padding: 15px;
        box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.3);
      }
      .neon-talk-topics.hidden {display: none;}
      .talk-topic {
        background: rgba(0, 0, 0, 0.85);
        padding: 15px;
        margin: 10px 0;
        cursor: pointer;
        border: 1px solid #00ffff;
        border-radius: 5px;
        color: #00ffff;
        font-size: 14px;
        text-shadow: 0 0 5px rgba(0,255,255,0.7);
        transition: all 0.3s ease;
        text-align: center;
        word-wrap: break-word;
      }
      .talk-topic:hover {
        background: rgba(0,255,255,0.15);
        border-color: #ff00ff;
        box-shadow: 0 0 15px rgba(255,0,255,0.5);
        transform: translateX(5px);
      }
      .jack-buttons-container {
        position: fixed;
        z-index: 1000;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transform-origin: center top;
      }
      .jack-button-talk, .jack-button-shop {
        pointer-events: all;
        padding: 10px 20px;
        font-size: 14px;
        font-family: "Courier New", monospace;
        font-weight: bold;
        border: 2px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 1px;
        text-shadow: 0 0 5px rgba(0, 255, 255, 0.8);
        transition: all 0.3s ease;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
        min-width: 100px;
        text-align: center;
        user-select: none;
      }
      .jack-button-talk {
        background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 150, 150, 0.3));
        color: #00ffff;
        border-color: #00ffff;
      }
      .jack-button-shop {
        background: linear-gradient(135deg, rgba(255, 0, 255, 0.2), rgba(150, 0, 150, 0.3));
        color: #ff00ff;
        border-color: #ff00ff;
      }
      .jack-button-talk:hover, .jack-button-shop:hover {
        transform: scale(1.05);
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
      }
      .jack-button-shop:hover {
        box-shadow: 0 0 20px rgba(255, 0, 255, 0.8);
      }
      @keyframes neonPulse{from{box-shadow:0 0 10px rgba(0,255,255,0.3);}to{box-shadow:0 0 20px rgba(0,255,255,0.7);}}
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
  dialog.innerHTML = `
    <div class="neon-npc-dialog-header">
      <img src="alexNeonFoto.png" alt="Neon Alex" class="neon-npc-photo">
      <h2 class="neon-npc-title">${NEON_NPC.name}</h2>
    </div>
    <div class="neon-npc-dialog-content">
      <p class="neon-npc-text">Слушаю тебя, человек...</p>
      <div id="neonTalkTopics" class="neon-talk-topics"></div>
    </div>
    <button id="closeNeonTalkBtn" class="jack-button">Закрыть</button>
  `;
  document.body.appendChild(dialog);
  const neonText = dialog.querySelector(".neon-npc-text");
  const topicsContainer = document.getElementById("neonTalkTopics");
  const closeBtn = document.getElementById("closeNeonTalkBtn");
  // 8 тем для разговоров, как у Jack
  const topics = [
    {
      title: "О Неоновом городе",
      text: "Неоновый город — центр технологий и опасностей. Здесь можно найти всё, но будь осторожен!",
    },
    {
      title: "О мутантах",
      text: "Мутанты — главная угроза в городе. Они быстрые и сильные, но за их головы дают награду.",
    },
    {
      title: "О Балярах",
      text: "Баляры — местная валюта. Получить их можно за выполнение заданий и торговлю.",
    },
    {
      title: "Корпорации и интриги",
      text: "Корпорации плетут интриги, тестируют импланты и устраивают саботаж. Будь осторожен с ними!",
    },
    {
      title: "Ночные улицы",
      text: "Ночные улицы Неонового города опасны: банды, мутанты, патрули корпораций. Выживает хитрый.",
    },
    {
      title: "Банды и альянсы",
      text: "Банды заключают альянсы, дерутся за контроль, но доверие — редкость. Не верь никому!",
    },
    {
      title: "Пустоши и контрабанда",
      text: "Пустоши за городом полны артефактов и опасностей. Контрабанда процветает, но риск велик.",
    },
    {
      title: "Семья и братья",
      text: "Семья — редкость, но сила. Мой брат Джон помогает новичкам, я — выжившим. Держись близких!",
    },
  ];
  topics.forEach((topic) => {
    const div = document.createElement("div");
    div.className = "talk-topic";
    div.innerHTML = `<strong>${topic.title}</strong>`;
    div.addEventListener("click", () => {
      topicsContainer.classList.add("hidden");
      neonText.classList.add("fullscreen");
      neonText.innerHTML = `<div style='flex:1;overflow-y:auto;padding-right:10px;'>${topic.text}</div>`;
      closeBtn.textContent = "Понятно";
      closeBtn.onclick = showTopics;
    });
    topicsContainer.appendChild(div);
  });
  function showTopics() {
    topicsContainer.classList.remove("hidden");
    neonText.classList.remove("fullscreen");
    neonText.textContent = "Слушаю тебя, человек...";
    closeBtn.textContent = "Закрыть";
    closeBtn.onclick = closeDialog;
  }
  function closeDialog() {
    dialog.remove();
    NEON_NPC.isDialogOpen = false;
  }
  closeBtn.onclick = closeDialog;
  NEON_NPC.isDialogOpen = true;
}

// Открытие диалога с квестом
function openNeonQuestDialog() {
  if (document.getElementById("neonNpcDialog")) return;
  initializeNeonNpcStyles();
  const dialog = document.createElement("div");
  dialog.id = "neonNpcDialog";
  dialog.className = "neon-npc-dialog";
  let questHtml = "";
  // Если нет активного квеста — выбор
  if (!neonQuestState.activeId) {
    questHtml = `<div class='neon-npc-text'><b>Выбери задание:</b><br><div id='neonQuestList'></div></div>`;
  } else {
    const q = NEON_QUESTS.find((q) => q.id === neonQuestState.activeId);
    if (!neonQuestState.completed) {
      questHtml = `<div class='neon-npc-text'><b>${q.title}</b><br>Прогресс: ${neonQuestState.progress}/${q.target.quantity} (${q.target.type})<br>Награда: ${q.reward.balyary} баляров, ${q.reward.xp} XP</div>`;
    } else {
      questHtml = `<div class='neon-npc-text'>Задание выполнено! Получено ${q.reward.balyary} баляров и ${q.reward.xp} XP.</div>`;
    }
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
  // Если нет активного — выбор
  if (!neonQuestState.activeId) {
    const list = document.getElementById("neonQuestList");
    NEON_QUESTS.forEach((q) => {
      const btn = document.createElement("button");
      btn.className = "neon-npc-btn";
      btn.textContent = q.title;
      btn.onclick = () => {
        neonQuestState.activeId = q.id;
        neonQuestState.progress = 0;
        neonQuestState.completed = false;
        // Отправляем только при изменении (выбор нового квеста)
        if (typeof ws !== "undefined") {
          ws.send(JSON.stringify({ type: "neonQuestStart", questId: q.id }));
        }
        dialog.remove();
        openNeonQuestDialog();
      };
      list.appendChild(btn);
    });
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

  // Анимация спрайта Neon Alex
  updateNeonNpcAnimation(deltaTime);

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
      const speed = 0.05;
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
    // Логика знакомства: если не знакомы, отправляем на сервер и сохраняем
    if (!NEON_NPC.isMet) {
      NEON_NPC.isMet = true;
      NEON_NPC.showQuestButton = true;
      if (typeof ws !== "undefined") {
        ws.send(
          JSON.stringify({
            type: "meetNeonAlex",
            alexNeonMet: true,
          })
        );
      }
    }
  }

  // Оптимизация: отправляем прогресс квеста только при изменении
  if (neonQuestState.activeId && !neonQuestState.completed) {
    // Проверяем, изменился ли прогресс (например, убийство врага или сбор предмета)
    if (
      window.levelSystem &&
      typeof window.levelSystem.handleEnemyKill === "function"
    ) {
      // Кэшируем предыдущее значение
      if (!NEON_NPC._lastQuestProgress)
        NEON_NPC._lastQuestProgress = neonQuestState.progress;
      if (neonQuestState.progress !== NEON_NPC._lastQuestProgress) {
        NEON_NPC._lastQuestProgress = neonQuestState.progress;
        if (typeof ws !== "undefined") {
          ws.send(
            JSON.stringify({
              type: "neonQuestProgress",
              questId: neonQuestState.activeId,
              progress: neonQuestState.progress,
            })
          );
        }
      }
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
  // Определяем направление движения NPC
  let direction = "down";
  if (NEON_NPC.movingToB) {
    const tdx = NEON_NPC.targetB.x - NEON_NPC.x;
    const tdy = NEON_NPC.targetB.y - NEON_NPC.y;
    if (Math.abs(tdx) > Math.abs(tdy)) {
      direction = tdx > 0 ? "right" : "left";
    } else {
      direction = tdy > 0 ? "down" : "up";
    }
  } else {
    const tdx = NEON_NPC.targetA.x - NEON_NPC.x;
    const tdy = NEON_NPC.targetA.y - NEON_NPC.y;
    if (Math.abs(tdx) > Math.abs(tdy)) {
      direction = tdx > 0 ? "right" : "left";
    } else {
      direction = tdy > 0 ? "down" : "up";
    }
  }
  // Выбор строки спрайта по направлению
  let spriteY = 0;
  if (direction === "up") spriteY = 0;
  else if (direction === "down") spriteY = 70;
  else if (direction === "right") spriteY = 140;
  else if (direction === "left") spriteY = 210;
  if (sprite && sprite.complete && sprite.width >= 70) {
    ctx.drawImage(
      sprite,
      neonNpcFrame * 70,
      spriteY,
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
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = NEON_NPC.isMet ? "#00eaff" : "#ffffff";
  ctx.fillText(
    NEON_NPC.isMet ? NEON_NPC.name : "?",
    screenX + NEON_NPC.width / 2,
    screenY - 10
  );
  // Кнопки только при взаимодействии
  if (NEON_NPC.isMet && NEON_NPC.isPlayerNear) {
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
        // Квесты
        if (data.player.neonQuestState) {
          neonQuestState = data.player.neonQuestState;
        }
      }
      if (
        data.type === "neonQuestStart" &&
        typeof data.questId !== "undefined"
      ) {
        neonQuestState.activeId = data.questId;
        neonQuestState.progress = 0;
        neonQuestState.completed = false;
      }
      if (
        data.type === "neonQuestProgress" &&
        typeof data.progress !== "undefined"
      ) {
        neonQuestState.progress = data.progress;
      }
      if (
        data.type === "neonQuestComplete" &&
        typeof data.questId !== "undefined"
      ) {
        neonQuestState.completed = true;
        // Начисление баляров и XP
        const q = NEON_QUESTS.find((q) => q.id === data.questId);
        if (q) {
          const me = players.get(myId);
          if (me) {
            // Баляры
            let balSlot = inventory.findIndex((s) => s && s.type === "balyary");
            if (balSlot !== -1) {
              inventory[balSlot].quantity =
                (inventory[balSlot].quantity || 0) + q.reward.balyary;
            } else {
              let free = inventory.findIndex((s) => s === null);
              if (free !== -1)
                inventory[free] = {
                  type: "balyary",
                  quantity: q.reward.balyary,
                };
            }
            // XP
            if (
              window.levelSystem &&
              typeof window.levelSystem.handleQuestCompletion === "function"
            ) {
              window.levelSystem.handleQuestCompletion(q.reward.xp);
            }
          }
        }
      }
    } catch (e) {}
  });
}

window.neonNpcSystem = {
  update: updateNeonNpc,
  draw: drawNeonNpc,
};
