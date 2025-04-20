const NPC = {
  x: 200,
  y: 2992,
  width: 70,
  height: 70,
  interactionRadius: 50,
  name: "John", // Имя NPC
};

// Список всех возможных заданий
const QUESTS = [
  {
    id: 1,
    title: "Принеси один орех.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "nut", quantity: 1 },
  },
  {
    id: 2,
    title: "Найди бутылку воды.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "water_bottle", quantity: 1 },
  },
  {
    id: 3,
    title: "Собери энергетик.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "energy_drink", quantity: 1 },
  },
  {
    id: 4,
    title: "Достань яблоко.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "apple", quantity: 1 },
  },
  {
    id: 5,
    title: "Принеси ягоды.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "berries", quantity: 1 },
  },
  {
    id: 6,
    title: "Найди морковь.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "carrot", quantity: 1 },
  },
  {
    id: 7,
    title: "Собери банку тушёнки.",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "canned_meat", quantity: 1 },
  },
  {
    id: 8,
    title: "Достань гриб.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "mushroom", quantity: 1 },
  },
  {
    id: 9,
    title: "Принеси колбасу.",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "sausage", quantity: 1 },
  },
  {
    id: 10,
    title: "Найди пакет крови.",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "blood_pack", quantity: 1 },
  },
];

// В начало файла npc.js, после определения QUESTS
const ITEM_RARITY = {
  blood_pack: 1,
  canned_meat: 1,
  mushroom: 1,
  dried_fish: 2,
  condensed_milk: 2,
  milk: 2,
  blood_syringe: 2,
  meat_chunk: 2,
  vodka_bottle: 2,
  bread: 2,
  sausage: 2,
  energy_drink: 2,
  balyary: 2,
  water_bottle: 3,
  nut: 3,
  apple: 3,
  berries: 3,
  carrot: 3,
};

let isNPCDialogOpen = false;
let isNPCMet = false;
let selectedQuest = null;
let dialogStage = "greeting";
let availableQuests = [];

function drawNPC() {
  const screenX = NPC.x - camera.x;
  const screenY = NPC.y - camera.y;

  // Отрисовка спрайта NPC
  if (npcSpriteImage.complete) {
    ctx.drawImage(npcSpriteImage, screenX, screenY, NPC.width, NPC.height);
  } else {
    ctx.fillStyle = "purple";
    ctx.fillRect(screenX, screenY, NPC.width, NPC.height);
  }

  // Отрисовка имени или знака вопроса над NPC
  ctx.fillStyle = isNPCMet ? "#ff00ff" : "#ffffff"; // Розовый для имени, белый для "?"
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    isNPCMet ? NPC.name : "?",
    screenX + NPC.width / 2,
    screenY - 10
  );
}

function checkNPCProximity() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const dx = me.x + 20 - (NPC.x + 35);
  const dy = me.y + 20 - (NPC.y + 35);
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < NPC.interactionRadius && !isNPCDialogOpen) {
    openNPCDialog();
  } else if (distance >= NPC.interactionRadius && isNPCDialogOpen) {
    closeNPCDialog();
  }
}

function openNPCDialog() {
  isNPCDialogOpen = true;
  const dialogContainer = document.createElement("div");
  dialogContainer.id = "npcDialog";
  dialogContainer.className = "npc-dialog";
  document.getElementById("gameContainer").appendChild(dialogContainer);

  if (!isNPCMet) {
    showGreetingDialog(dialogContainer);
  } else {
    dialogStage = "questSelection";
    showQuestSelectionDialog(dialogContainer);
  }
}

function closeNPCDialog() {
  isNPCDialogOpen = false;
  const dialogContainer = document.getElementById("npcDialog");
  if (dialogContainer) {
    dialogContainer.remove();
  }
}

function showGreetingDialog(container) {
  dialogStage = "greeting";
  container.innerHTML = `
      <div class="npc-dialog-header">
        <img src="fotoQuestNPC.png" alt="NPC Photo" class="npc-photo">
        <h2 class="npc-title">${NPC.name}</h2>
      </div>
      <p class="npc-text">Привет, ого! Ни когда еще не видел человека без модернизаций! Видимо с деньгами у тебя совсем туго... Меня зовут ${NPC.name}. Ну ничего, можешь заработать у меня немного... Мои работники только и знают, как шкериться в темных углах города. Находи предметы, если они мне нужны, я заберу. До встречи, человек!</p>
      <button id="npcAgreeBtn" class="neon-btn">Хорошо</button>
  `;
  document.getElementById("npcAgreeBtn").addEventListener("click", () => {
    isNPCMet = true;
    dialogStage = "questSelection";
    sendWhenReady(ws, JSON.stringify({ type: "meetNPC", npcMet: true }));
    showQuestSelectionDialog(container);
  });
}

function getRandomQuests(count) {
  const shuffled = [...QUESTS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function showQuestSelectionDialog(container) {
  if (availableQuests.length === 0) {
    availableQuests = getRandomQuests(5); // Инициализируем 5 случайных заданий
  }

  container.innerHTML = `
      <div class="npc-dialog-header">
        <img src="fotoQuestNPC.png" alt="NPC Photo" class="npc-photo">
        <h2 class="npc-title">${NPC.name}</h2>
      </div>
      <p class="npc-text">Что из этого ты сумеешь достать?</p>
      <div id="questList" class="quest-list"></div>
  `;
  const questList = document.getElementById("questList");
  availableQuests.forEach((quest) => {
    const questItem = document.createElement("div");
    questItem.className = "quest-item";
    questItem.innerHTML = `
      <span class="quest-marker">></span>
      <p>${quest.title} <span class="quest-reward">[Награда: ${quest.reward.quantity} баляр]</span></p>
    `;
    questItem.addEventListener("click", () => {
      selectQuest(quest);
      closeNPCDialog();
    });
    questList.appendChild(questItem);
  });
}

function selectQuest(quest) {
  selectedQuest = quest;
  console.log(`Выбрано задание: ${quest.title}`);
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "selectQuest",
      questId: quest.id,
    })
  );

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
  if (!selectedQuest) {
    console.log("Нет активного задания");
    return;
  }

  const me = players.get(myId);
  if (!me) {
    console.log("Игрок не найден");
    return;
  }

  const targetItem = selectedQuest.target;
  const requiredQuantity = targetItem.quantity;
  let currentQuantity = 0;

  inventory.forEach((slot) => {
    if (slot && slot.type === targetItem.type) {
      currentQuantity += slot.quantity || 1;
    }
  });

  console.log(
    `Проверка задания: требуется ${requiredQuantity} ${targetItem.type}, найдено ${currentQuantity}`
  );

  if (currentQuantity >= requiredQuantity) {
    console.log(`Задание "${selectedQuest.title}" готово к выполнению`);
    completeQuest();
  }
}

function completeQuest() {
  if (!selectedQuest) return;

  const me = players.get(myId);
  if (!me) return;

  // Удаляем необходимые предметы из инвентаря
  let itemsToRemove = selectedQuest.target.quantity;
  for (let i = 0; i < inventory.length && itemsToRemove > 0; i++) {
    if (inventory[i] && inventory[i].type === selectedQuest.target.type) {
      if (inventory[i].quantity && inventory[i].quantity >= 1) {
        const removeFromSlot = Math.min(itemsToRemove, inventory[i].quantity);
        inventory[i].quantity -= removeFromSlot;
        itemsToRemove -= removeFromSlot;
        if (inventory[i].quantity <= 0) {
          inventory[i] = null;
        }
      } else {
        inventory[i] = null;
        itemsToRemove--;
      }
    }
  }

  // Добавляем награду (баляры) в инвентарь
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
    } else {
      console.warn("Инвентарь полон, награда не добавлена!");
    }
  }

  // Начисляем опыт в зависимости от редкости предмета
  const targetItemType = selectedQuest.target.type;
  const rarity = ITEM_RARITY[targetItemType] || 3; // По умолчанию частый, если тип не найден
  let xpGained;
  switch (rarity) {
    case 1: // Редкий
      xpGained = 3;
      break;
    case 2: // Средний
      xpGained = 2;
      break;
    case 3: // Частый
      xpGained = 1;
      break;
    default:
      xpGained = 1;
  }
  window.levelSystem.addXP(xpGained); // Используем метод addXP для начисления опыта

  // Сохраняем ID выполненного задания
  const previousQuestId = selectedQuest.id;

  // Удаляем выполненное задание из списка доступных
  availableQuests = availableQuests.filter((q) => q.id !== previousQuestId);

  console.log(
    `Задание "${selectedQuest.title}" выполнено! Получено ${reward.quantity} баляр и ${xpGained} XP.`
  );

  // Отправляем обновление инвентаря, уровня и опыта на сервер
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "updateInventory",
      questId: selectedQuest.id,
      inventory: inventory,
      level: window.levelSystem.currentLevel,
      xp: window.levelSystem.currentXP,
      maxStats: window.levelSystem.maxStats,
      upgradePoints: window.levelSystem.upgradePoints,
    })
  );

  // Сбрасываем выбранное задание
  selectedQuest = null;

  // Обновляем отображение инвентаря с анимацией
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
}

function setSelectedQuest(questId) {
  selectedQuest = QUESTS.find((q) => q.id === questId) || null;
}

function setAvailableQuests(questIds) {
  availableQuests = questIds
    .map((id) => QUESTS.find((q) => q.id === id))
    .filter((q) => q);
}

// Стили для диалогового окна NPC
const npcStyles = `
/* Основной контейнер диалога NPC */
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
  z-index: 1000;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.5), 0 0 30px rgba(255, 0, 255, 0.3);
  animation: neonPulse 2s infinite alternate;
}

/* Заголовок диалога с фото и именем NPC */
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

/* Текст NPC */
.npc-text {
  margin: 15px 0;
  font-size: 16px;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
  line-height: 1.4;
}

/* Список квестов */
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

.quest-list::-webkit-scrollbar-thumb:hover {
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.9);
}

/* Элемент квеста */
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

/* Кнопка в стиле киберпанк */
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
}

.neon-btn:hover {
  box-shadow: 0 0 20px rgba(0, 255, 255, 1), 0 0 30px rgba(255, 0, 255, 0.7);
  transform: scale(1.05);
}

.neon-btn:active {
  transform: scale(0.95);
}

/* Анимации */
@keyframes neonPulse {
  0% {
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(255, 0, 255, 0.3);
  }
  100% {
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.8), 0 0 30px rgba(255, 0, 255, 0.5);
  }
}

@keyframes flicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
    opacity: 1;
    text-shadow: 0 0 5px #00ffff, 0 0 10px #ff00ff;
  }
  20%, 24%, 55% {
    opacity: 0.7;
    text-shadow: 0 0 2px #00ffff, 0 0 5px #ff00ff;
  }
}

/* Адаптация для мобильных устройств */
@media (max-width: 500px) {
  .npc-dialog {
    max-width: 90%;
    padding: 15px;
  }

  .npc-photo {
    width: 60px;
    height: 60px;
  }

  .npc-title {
    font-size: 20px;
  }

  .npc-text {
    font-size: 14px;
  }

  .quest-list {
    max-height: 200px;
  }

  .quest-item {
    padding: 10px;
    font-size: 12px;
  }

  .neon-btn {
    padding: 10px 20px;
    font-size: 14px;
  }
}
`;

// Динамическое добавление стилей в документ
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = npcStyles;
document.head.appendChild(styleSheet);
