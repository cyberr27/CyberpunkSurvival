// npc.js

// Определяем константы и переменные
const NPC = {
  x: 200,
  y: 2992,
  width: 70,
  height: 70,
  interactionRadius: 50,
  name: "John",
};

const QUESTS = [
  {
    id: 1,
    title: "Принеси орех.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "nut", quantity: 1 },
    rarity: 3,
  },
  {
    id: 2,
    title: "Найди бутылку воды.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "water_bottle", quantity: 1 },
    rarity: 3,
  },
  {
    id: 3,
    title: "Собери энергетик.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "energy_drink", quantity: 1 },
    rarity: 2,
  },
  {
    id: 4,
    title: "Достань яблоко.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "apple", quantity: 1 },
    rarity: 3,
  },
  {
    id: 5,
    title: "Принеси ягоды.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "berries", quantity: 1 },
    rarity: 3,
  },
  {
    id: 6,
    title: "Принеси морковь.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "carrot", quantity: 1 },
    rarity: 3,
  },
  {
    id: 7,
    title: "Достань банку тушёнки.",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "canned_meat", quantity: 1 },
    rarity: 1,
  },
  {
    id: 8,
    title: "Достань гриб.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "mushroom", quantity: 1 },
    rarity: 1,
  },
  {
    id: 9,
    title: "Принеси колбасу.",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "sausage", quantity: 1 },
    rarity: 2,
  },
  {
    id: 10,
    title: "Принеси банку сгущенки.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "condensed_milk", quantity: 1 },
    rarity: 2,
  },
  {
    id: 11,
    title: "Достань хлеб.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "bread", quantity: 1 },
    rarity: 2,
  },
  {
    id: 12,
    title: "Достань бутылку водки.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "vodka_bottle", quantity: 1 },
    rarity: 2,
  },
  {
    id: 13,
    title: "Достань бутылку водки.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "vodka_bottle", quantity: 1 },
    rarity: 2,
  },
  {
    id: 14,
    title: "Принеси пакет молока.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "milk", quantity: 1 },
    rarity: 2,
  },
  {
    id: 15,
    title: "Принеси два пакета молока.",
    reward: { type: "balyary", quantity: 6 },
    target: { type: "milk", quantity: 2 },
    rarity: 2,
  },
  {
    id: 16,
    title: "Принеси два ореха.",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "nut", quantity: 2 },
    rarity: 3,
  },
  {
    id: 17,
    title: "Собери два энергетика.",
    reward: { type: "balyary", quantity: 7 },
    target: { type: "energy_drink", quantity: 2 },
    rarity: 2,
  },
  {
    id: 18,
    title: "Принеси две ягоды.",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "berries", quantity: 2 },
    rarity: 3,
  },
  {
    id: 19,
    title: "Достань два яблока.",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "apple", quantity: 2 },
    rarity: 3,
  },
  {
    id: 20,
    title: "Принеси две моркови.",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "carrot", quantity: 2 },
    rarity: 3,
  },
];

let isNPCDialogOpen = false;
let isNPCMet = false;
let selectedQuest = null;
let dialogStage = "greeting";
let availableQuests = [];
let isQuestActive = false;
let npcSprite = null;

// Новые переменные для кнопок
let npcButtonsContainer = null;
let isPlayerNearNPC = false;

// Новые переменные для анимации
let npcFrame = 0;
let npcFrameTime = 0;
const NPC_FRAME_DURATION = 100;
const NPC_TOTAL_FRAMES = 40;

let animationCooldownTimer = 0;
let isAnimating = false;
const ANIMATION_COOLDOWN = 20000;

const npcStyles = `
  .npc-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, rgba(10, 10, 10, 0.95), rgba(20, 20, 20, 0.9));
    border: 2px solid #00ffff;
    border-radius: 10px;
    padding: 20px;
    color: #00ffff;
    font-family: "Courier New", monospace;
    text-align: center;
    z-index: 1001;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.5), 0 0 30px rgba(255, 0, 255, 0.3);
    animation: neonPulse 2s infinite alternate;
  }
  
  .npc-buttons-container {
    position: fixed;
    z-index: 1000;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transform-origin: center top;
  }
  
  .npc-button {
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
  
  .npc-talk-btn {
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 150, 150, 0.3));
    color: #00ffff;
    border-color: #00ffff;
  }
  
  .npc-quests-btn {
    background: linear-gradient(135deg, rgba(255, 0, 255, 0.2), rgba(150, 0, 150, 0.3));
    color: #ff00ff;
    border-color: #ff00ff;
  }
  
  .npc-talk-btn:hover,
  .npc-quests-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
    background: rgba(0, 255, 255, 0.4);
  }
  
  .npc-quests-btn:hover {
    box-shadow: 0 0 20px rgba(255, 0, 255, 0.8);
    background: rgba(255, 0, 255, 0.4);
  }
  
  .npc-dialog-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 15px;
  }
  .npc-photo {
    width: 80px;
    height: 80px;
    border: 2px solid #ff00ff;
    border-radius: 50%;
    margin-right: 15px;
    box-shadow: 0 0 15px rgba(255, 0, 255, 0.5);
    object-fit: cover;
  }
  .npc-title {
    color: #00ffff;
    font-size: 24px;
    text-shadow: 0 0 5px #00ffff, 0 0 10px #ff00ff;
    animation: flicker 1.5s infinite alternate;
    margin: 0;
  }
  .npc-text {
    margin: 15px 0;
    font-size: 16px;
    text-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
    line-height: 1.6;
    transition: all 0.3s ease;
  }
  .npc-text.fullscreen {
    margin: 10px 0;
    font-size: 18px;
    padding: 30px 20px;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 0, 255, 0.5);
    border-radius: 8px;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .talk-topics {
    max-height: 300px;
    overflow-y: auto;
    margin-top: 15px;
    background: rgba(10, 10, 10, 0.9);
    border: 1px solid #00ffff;
    border-radius: 5px;
    padding: 15px;
    box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.3);
    transition: opacity 0.3s ease;
  }
  .talk-topics.hidden {
    display: none;
  }
  .talk-topic {
    background: rgba(0, 0, 0, 0.85);
    padding: 15px;
    margin: 10px 0;
    cursor: pointer;
    border: 1px solid #00ffff;
    border-radius: 5px;
    color: #00ffff;
    font-size: 14px;
    text-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
    transition: all 0.3s ease;
    position: relative;
  }
  .talk-topic:hover {
    background: rgba(0, 255, 255, 0.15);
    border-color: #ff00ff;
    box-shadow: 0 0 15px rgba(255, 0, 255, 0.5);
    transform: translateX(5px);
  }
  .quest-list {
    max-height: 250px;
    overflow-y: auto;
    margin-top: 15px;
    background: rgba(10, 10, 10, 0.9);
    border: 1px solid #ff00ff;
    border-radius: 5px;
    padding: 10px;
    box-shadow: inset 0 0 10px rgba(255, 0, 255, 0.3);
    scrollbar-width: thin;
    scrollbar-color: #ff00ff rgba(0, 0, 0, 0.5);
  }
  .quest-list::-webkit-scrollbar {
    width: 8px;
  }
  .quest-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.7);
    border-radius: 4px;
  }
  .quest-list::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #00ffff, #ff00ff);
    border-radius: 4px;
    box-shadow: 0 0 10px rgba(255, 0, 255, 0.7);
  }
  .quest-item {
    background: rgba(0, 0, 0, 0.85);
    padding: 12px;
    margin: 8px 0;
    cursor: pointer;
    border: 1px solid #00ffff;
    border-radius: 5px;
    color: #00ffff;
    font-size: 14px;
    text-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
    box-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
    transition: all 0.3s ease;
    position: relative;
    display: flex;
    align-items: center;
  }
  .quest-item:hover {
    background: rgba(0, 255, 255, 0.15);
    border-color: #ff00ff;
    box-shadow: 0 0 15px rgba(255, 0, 255, 0.7);
    transform: translateX(5px);
  }
  .quest-marker {
    color: #ff00ff;
    font-weight: bold;
    margin-right: 10px;
    font-size: 16px;
  }
  .quest-reward {
    color: #ff00ff;
    font-size: 12px;
    margin-left: 10px;
  }
  .neon-btn {
    padding: 12px 24px;
    font-size: 16px;
    font-family: "Courier New", monospace;
    background: linear-gradient(135deg, #00ffff, #ff00ff);
    border: none;
    color: #000;
    border-radius: 5px;
    cursor: pointer;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.7), 0 0 20px rgba(255, 0, 255, 0.5);
    transition: all 0.3s;
    text-transform: uppercase;
    margin-top: 15px;
  }
  .neon-btn:hover {
    box-shadow: 0 0 20px rgba(0, 255, 255, 1), 0 0 30px rgba(255, 0, 255, 0.7);
    transform: scale(1.05);
  }
  @keyframes neonPulse {
    0% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(255, 0, 255, 0.3); }
    100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.8), 0 0 30px rgba(255, 0, 255, 0.5); }
  }
  @keyframes flicker {
    0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; text-shadow: 0 0 5px #00ffff, 0 0 10px #ff00ff; }
    20%, 24%, 55% { opacity: 0.7; text-shadow: 0 0 2px #00ffff, 0 0 5px #ff00ff; }
  }
  @media (max-width: 768px) {
    .npc-button {
      padding: 12px 24px;
      font-size: 16px;
      min-width: 120px;
    }
    .npc-buttons-container {
      gap: 10px;
    }
  }
  @media (max-width: 500px) {
    .npc-button {
      padding: 14px 28px;
      font-size: 18px;
      min-width: 140px;
    }
    .npc-dialog { max-width: 90%; padding: 15px; }
    .npc-photo { width: 60px; height: 60px; }
    .npc-title { font-size: 20px; }
    .npc-text { font-size: 14px; }
    .npc-text.fullscreen { font-size: 16px; padding: 25px 15px; min-height: 180px; }
    .quest-list { max-height: 200px; }
    .quest-item { padding: 10px; font-size: 12px; }
    .neon-btn { padding: 10px 20px; font-size: 14px; }
  }
`;

function initializeNPCStyles() {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = npcStyles;
  document.head.appendChild(styleSheet);
}

function createNPCButtons(screenX, screenY) {
  if (npcButtonsContainer) {
    document.body.removeChild(npcButtonsContainer);
  }

  npcButtonsContainer = document.createElement("div");
  npcButtonsContainer.className = "npc-buttons-container";

  const buttonHeight = 45;
  const totalButtonsHeight = buttonHeight * 2 + 16;

  npcButtonsContainer.style.left = screenX + NPC.width / 2 + "px";
  npcButtonsContainer.style.top = screenY - totalButtonsHeight - 25 + "px";
  npcButtonsContainer.style.transform = "translateX(-50%)";

  const talkBtn = document.createElement("div");
  talkBtn.className = "npc-button npc-talk-btn";
  talkBtn.textContent = "Говорить";
  talkBtn.addEventListener("click", () => openTalkDialog());

  const questsBtn = document.createElement("div");
  questsBtn.className = "npc-button npc-quests-btn";
  questsBtn.textContent = "Задания";
  questsBtn.addEventListener("click", () => openQuestDialog());

  npcButtonsContainer.appendChild(talkBtn);
  npcButtonsContainer.appendChild(questsBtn);

  document.body.appendChild(npcButtonsContainer);
}

function removeNPCButtons() {
  if (npcButtonsContainer) {
    document.body.removeChild(npcButtonsContainer);
    npcButtonsContainer = null;
  }
}

function drawNPC(deltaTime) {
  if (window.worldSystem.currentWorldId !== 0) return;

  const camera = window.movementSystem.getCamera();
  const screenX = NPC.x - camera.x;
  const screenY = NPC.y - camera.y;

  const me = players.get(myId);
  let isPlayerNear = false;
  if (me && me.health > 0) {
    const dx = me.x + 20 - (NPC.x + 35);
    const dy = me.y + 20 - (NPC.y + 35);
    const distance = Math.sqrt(dx * dx + dy * dy);
    isPlayerNear = distance < NPC.interactionRadius;
  }

  if (isNPCMet && isPlayerNear && !isPlayerNearNPC) {
    isPlayerNearNPC = true;
    createNPCButtons(screenX, screenY);
  } else if (isNPCMet && !isPlayerNear && isPlayerNearNPC) {
    isPlayerNearNPC = false;
    removeNPCButtons();
  } else if (isPlayerNearNPC && npcButtonsContainer) {
    npcButtonsContainer.style.left = screenX + NPC.width / 2 + "px";
    npcButtonsContainer.style.top = screenY - 115 + "px";
  }

  if (isPlayerNear) {
    npcFrame = 0;
    isAnimating = false;
    animationCooldownTimer = 0;
  } else {
    if (!isAnimating) {
      animationCooldownTimer += deltaTime;
      if (animationCooldownTimer >= ANIMATION_COOLDOWN) {
        isAnimating = true;
        npcFrameTime = 0;
        npcFrame = 0;
        animationCooldownTimer = 0;
      } else {
        npcFrame = 0;
      }
    } else {
      npcFrameTime += deltaTime;
      if (npcFrameTime >= NPC_FRAME_DURATION) {
        npcFrameTime = 0;
        npcFrame++;
        if (npcFrame >= NPC_TOTAL_FRAMES) {
          npcFrame = 0;
          isAnimating = false;
          animationCooldownTimer = 0;
        }
      }
    }
  }

  if (npcSprite && npcSprite.complete) {
    ctx.drawImage(
      npcSprite,
      npcFrame * NPC.width,
      0,
      NPC.width,
      NPC.height,
      screenX,
      screenY,
      NPC.width,
      NPC.height
    );
  } else {
    ctx.fillStyle = "purple";
    ctx.fillRect(screenX, screenY, NPC.width, NPC.height);
  }

  ctx.fillStyle = isNPCMet ? "#ff00ff" : "#ffffff";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    isNPCMet ? NPC.name : "?",
    screenX + NPC.width / 2,
    screenY - 10
  );
}

function checkNPCProximity() {
  if (window.worldSystem.currentWorldId !== 0) return;
}

function openTalkDialog() {
  closeNPCDialog();
  const dialogContainer = document.createElement("div");
  dialogContainer.id = "npcDialog";
  dialogContainer.className = "npc-dialog";
  document.getElementById("gameContainer").appendChild(dialogContainer);

  const topics = [
    {
      title: "О Неоновом городе",
      text: "Этот город... он жрёт людей. Киборги везде, баляры решают всё. Без бабок ты никто.",
    },
    {
      title: "О балярах",
      text: "Баляры - кровь этого города. Без них даже воздух не продают. Собирай всё, что блестит.",
    },
    {
      title: "О киборгах",
      text: "Они думают, что лучше нас. Но железо ржавеет, а человек выживает. Помни это.",
    },
    {
      title: "О твоей работе",
      text: "Ты молодец, что не сдался. Продолжай собирать хабар - скоро станешь королём помойки!",
    },
  ];

  dialogContainer.innerHTML = `
    <div class="npc-dialog-header">
      <img src="fotoQuestNPC.png" alt="NPC Photo" class="npc-photo">
      <h2 class="npc-title">${NPC.name}</h2>
    </div>
    <p class="npc-text">Слушаю тебя, человек...</p>
    <div id="talkTopics" class="talk-topics"></div>
    <button id="closeTalkBtn" class="neon-btn">Закрыть</button>
  `;

  const npcText = dialogContainer.querySelector(".npc-text");
  const topicsContainer = document.getElementById("talkTopics");
  const closeBtn = document.getElementById("closeTalkBtn");

  topics.forEach((topic) => {
    const topicDiv = document.createElement("div");
    topicDiv.className = "talk-topic";
    topicDiv.innerHTML = `<strong>${topic.title}</strong>`;

    topicDiv.addEventListener("click", () => {
      // Скрываем темы
      topicsContainer.classList.add("hidden");
      // Показываем большой текст
      npcText.classList.add("fullscreen");
      npcText.textContent = topic.text;
      // Меняем кнопку на "Понятно"
      closeBtn.textContent = "Понятно";
      closeBtn.onclick = () => showTopics();
    });

    topicsContainer.appendChild(topicDiv);
  });

  function showTopics() {
    // Показываем темы
    topicsContainer.classList.remove("hidden");
    // Убираем fullscreen
    npcText.classList.remove("fullscreen");
    npcText.textContent = "Слушаю тебя, человек...";
    // Возвращаем кнопку "Закрыть"
    closeBtn.textContent = "Закрыть";
    closeBtn.onclick = closeNPCDialog;
  }

  closeBtn.onclick = closeNPCDialog;
  isNPCDialogOpen = true;
}

function openQuestDialog() {
  closeNPCDialog();
  const dialogContainer = document.createElement("div");
  dialogContainer.id = "npcDialog";
  dialogContainer.className = "npc-dialog";
  document.getElementById("gameContainer").appendChild(dialogContainer);

  if (availableQuests.length < 5) {
    const questsToAdd = 5 - availableQuests.length;
    const newQuests = getRandomQuests(
      questsToAdd,
      availableQuests.map((q) => q.id)
    );
    availableQuests = [...availableQuests, ...newQuests];
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "updateQuests",
        availableQuests: availableQuests.map((q) => q.id),
      })
    );
  }

  showQuestSelectionDialog(dialogContainer);
}

function openNPCDialog() {
  isNPCDialogOpen = true;
  const dialogContainer = document.createElement("div");
  dialogContainer.id = "npcDialog";
  dialogContainer.className = "npc-dialog";
  document.getElementById("gameContainer").appendChild(dialogContainer);

  if (!isNPCMet) {
    showGreetingDialog(dialogContainer);
  }
}

function closeNPCDialog() {
  isNPCDialogOpen = false;
  const dialogContainer = document.getElementById("npcDialog");
  if (dialogContainer) dialogContainer.remove();
}

function showGreetingDialog(container) {
  dialogStage = "greeting";
  container.innerHTML = `
    <div class="npc-dialog-header">
      <img src="fotoQuestNPC.png" alt="NPC Photo" class="npc-photo">
      <h2 class="npc-title">${NPC.name}</h2>
    </div>
    <p class="npc-text">Привет, ого! Никогда еще не видел человека без модернизаций! Видимо с деньгами у тебя совсем туго... Меня зовут ${NPC.name}. Ели нужны деньги, можешь поработать на меня... Мои работники только и знают, как шкериться в темных углах города. Находи предметы, если они мне нужны, я заберу их. До встречи хм... человек!</p>
    <button id="npcAgreeBtn" class="neon-btn">Хорошо</button>
  `;
  document.getElementById("npcAgreeBtn").addEventListener("click", () => {
    isNPCMet = true;
    dialogStage = "questSelection";
    availableQuests = getRandomQuests(5);
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "meetNPC",
        npcMet: true,
        availableQuests: availableQuests.map((q) => q.id),
      })
    );
    closeNPCDialog();
  });
}

function getRandomQuests(count, excludeIds = []) {
  const filteredQuests = QUESTS.filter((q) => !excludeIds.includes(q.id));
  const shuffled = filteredQuests.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function showQuestSelectionDialog(container) {
  container.innerHTML = `
    <div class="npc-dialog-header">
      <img src="fotoQuestNPC.png" alt="NPC Photo" class="npc-photo">
      <h2 class="npc-title">${NPC.name}</h2>
    </div>
    <p class="npc-text">Что из этого ты сумеешь достать?</p>
    <div id="questList" class="quest-list"></div>
    <button id="closeQuestsBtn" class="neon-btn">Закрыть</button>
  `;

  const questList = document.getElementById("questList");
  availableQuests.forEach((quest) => {
    const questItem = document.createElement("div");
    questItem.className = "quest-item";
    const xpReward = quest.rarity === 1 ? 3 : quest.rarity === 2 ? 2 : 1;
    questItem.innerHTML = `
      <span class="quest-marker">></span>
      <p>${quest.title} <span class="quest-reward">[Награда: ${quest.reward.quantity} баляр + ${xpReward} хр.]</span></p>
    `;
    questItem.addEventListener("click", () => {
      selectQuest(quest);
      closeNPCDialog();
    });
    questList.appendChild(questItem);
  });

  document
    .getElementById("closeQuestsBtn")
    .addEventListener("click", closeNPCDialog);
}

function selectQuest(quest) {
  selectedQuest = quest;
  isQuestActive = true;
  sendWhenReady(ws, JSON.stringify({ type: "selectQuest", questId: quest.id }));

  const me = players.get(myId);
  if (!me) return;

  const targetItem = quest.target;
  const requiredQuantity = targetItem.quantity;
  let currentQuantity = 0;

  inventory.forEach((slot) => {
    if (slot && slot.type === targetItem.type) {
      currentQuantity += slot.quantity || 1;
    }
  });

  if (currentQuantity >= requiredQuantity) {
    completeQuest();
  }
}

function checkQuestCompletion() {
  if (!selectedQuest || !isQuestActive) return;

  const me = players.get(myId);
  if (!me) return;

  const targetItem = selectedQuest.target;
  const requiredQuantity = targetItem.quantity;
  let currentQuantity = 0;

  inventory.forEach((slot) => {
    if (slot && slot.type === targetItem.type) {
      currentQuantity += slot.quantity || 1;
    }
  });

  if (currentQuantity >= requiredQuantity) {
    completeQuest();
  }
}

function completeQuest() {
  if (!selectedQuest || !isQuestActive) return;

  const me = players.get(myId);
  if (!me) return;

  let itemsToRemove = selectedQuest.target.quantity;
  for (let i = 0; i < inventory.length && itemsToRemove > 0; i++) {
    if (inventory[i] && inventory[i].type === selectedQuest.target.type) {
      if (inventory[i].quantity && inventory[i].quantity >= 1) {
        const removeFromSlot = Math.min(itemsToRemove, inventory[i].quantity);
        inventory[i].quantity -= removeFromSlot;
        itemsToRemove -= removeFromSlot;
        if (inventory[i].quantity <= 0) inventory[i] = null;
      } else {
        inventory[i] = null;
        itemsToRemove--;
      }
    }
  }

  const reward = selectedQuest.reward;
  const balyarySlot = inventory.findIndex(
    (slot) => slot && slot.type === "balyary"
  );
  if (balyarySlot !== -1) {
    inventory[balyarySlot].quantity =
      (inventory[balyarySlot].quantity || 1) + reward.quantity;
  } else {
    const freeSlot = inventory.findIndex((slot) => slot === null);
    if (freeSlot !== -1) {
      inventory[freeSlot] = { type: "balyary", quantity: reward.quantity };
    }
  }

  const previousQuestId = selectedQuest.id;
  availableQuests = availableQuests.filter((q) => q.id !== previousQuestId);

  const questsToAdd = 5 - availableQuests.length;
  if (questsToAdd > 0) {
    const newQuests = getRandomQuests(
      questsToAdd,
      availableQuests.map((q) => q.id)
    );
    availableQuests = [...availableQuests, ...newQuests];
  }

  sendWhenReady(
    ws,
    JSON.stringify({
      type: "updateInventory",
      questId: selectedQuest.id,
      inventory: inventory,
      availableQuests: availableQuests.map((q) => q.id),
    })
  );

  const rarity = selectedQuest.rarity || 3;
  window.levelSystem.handleQuestCompletion(rarity);

  selectedQuest = null;
  isQuestActive = false;

  sendWhenReady(ws, JSON.stringify({ type: "selectQuest", questId: null }));

  if (isInventoryOpen) {
    requestAnimationFrame(() => {
      updateInventoryDisplay();
      const inventoryGrid = document.getElementById("inventoryGrid");
      if (inventoryGrid) {
        inventoryGrid.style.opacity = "0";
        inventoryGrid.offsetHeight;
        inventoryGrid.style.opacity = "1";
        updateInventoryDisplay();
      }
    });
  }

  updateStatsDisplay();
}

function setNPCMet(met) {
  isNPCMet = met;
  if (!met) {
    removeNPCButtons();
  }
}

function setSelectedQuest(questId) {
  selectedQuest = QUESTS.find((q) => q.id === questId) || null;
  isQuestActive = false;
}

function setAvailableQuests(questIds) {
  availableQuests =
    questIds.map((id) => QUESTS.find((q) => q.id === id)).filter((q) => q) ||
    [];
  const questsToAdd = 5 - availableQuests.length;
  if (questsToAdd > 0) {
    const newQuests = getRandomQuests(
      questsToAdd,
      availableQuests.map((q) => q.id)
    );
    availableQuests = [...availableQuests, ...newQuests];
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "updateQuests",
        availableQuests: availableQuests.map((q) => q.id),
      })
    );
  }
}

window.npcSystem = {
  drawNPC,
  checkNPCProximity,
  setNPCMet,
  setSelectedQuest,
  setAvailableQuests,
  checkQuestCompletion,
  updateQuests: (questIds) => {
    setAvailableQuests(questIds);
  },
  initialize: (spriteImage) => {
    npcSprite = spriteImage;
    initializeNPCStyles();
  },
};
