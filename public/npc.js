// NPC.js
const NPC = {
  x: 590,
  y: 3150,
  width: 70, // Изменено с 40 на 70
  height: 70, // Изменено с 40 на 70
  interactionRadius: 50,
};

const QUESTS = [
  // Существующие задания (без изменений)
  {
    id: 1,
    title: "Принеси один орех.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "nut", quantity: 1 },
  },
  {
    id: 2,
    title: "Принеси 2 яблока.",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "apple", quantity: 2 },
  },
  {
    id: 3,
    title: "Принеси одну бутылку воды.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "water_bottle", quantity: 1 },
  },
  {
    id: 4,
    title: "Принеси три ягоды.",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "berries", quantity: 3 },
  },
  {
    id: 5,
    title: "Принеси одну морковь.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "carrot", quantity: 1 },
  },
  {
    id: 6,
    title: "Принеси две банки тушёнки.",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "canned_meat", quantity: 2 },
  },
  {
    id: 7,
    title: "Принеси три гриба.",
    reward: { type: "balyary", quantity: 5 },
    target: { type: "mushroom", quantity: 3 },
  },
  {
    id: 8,
    title: "Принеси одну колбасу.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "sausage", quantity: 1 },
  },
  {
    id: 9,
    title: "Принеси две бутылки водки.",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "vodka_bottle", quantity: 2 },
  },
  {
    id: 10,
    title: "Принеси два куска хлеба.",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "bread", quantity: 2 },
  },
  {
    id: 11,
    title: "Принеси одну бутылку водки.",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "vodka_bottle", quantity: 1 },
  },
  {
    id: 12,
    title: "Принеси два куска мяса.",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "meat_chunk", quantity: 2 },
  },
  {
    id: 13,
    title: "Принеси один кусок мяса.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "meat_chunk", quantity: 1 },
  },
  {
    id: 14,
    title: "Принеси две бутылки молока.",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "milk", quantity: 2 },
  },
  {
    id: 15,
    title: "Принеси одну банку сгущёнки.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "condensed_milk", quantity: 1 },
  },
  {
    id: 16,
    title: "Принеси три сушёной рыбы.",
    reward: { type: "balyary", quantity: 5 },
    target: { type: "dried_fish", quantity: 3 },
  },
  {
    id: 17,
    title: "Принеси один энергетик.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "energy_drink", quantity: 1 },
  },
  {
    id: 18,
    title: "Принеси четыре ореха.",
    reward: { type: "balyary", quantity: 5 },
    target: { type: "nut", quantity: 4 },
  },
  {
    id: 19,
    title: "Принеси два яблока.",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "apple", quantity: 2 },
  },
  {
    id: 20,
    title: "Принеси две ягоды.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "berries", quantity: 2 },
  },
  {
    id: 21,
    title: "Принеси две моркови.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "carrot", quantity: 2 },
  },
  {
    id: 22,
    title: "Принеси две бутылки воды.",
    reward: { type: "balyary", quantity: 5 },
    target: { type: "water_bottle", quantity: 2 },
  },
  {
    id: 23,
    title: "Принеси три банки тушёнки.",
    reward: { type: "balyary", quantity: 6 },
    target: { type: "canned_meat", quantity: 3 },
  },
  {
    id: 24,
    title: "Принеси одну банку тушенки.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "canned_meat", quantity: 1 },
  },
  {
    id: 25,
    title: "Принеси две колбасы.",
    reward: { type: "balyary", quantity: 5 },
    target: { type: "sausage", quantity: 2 },
  },
  {
    id: 26,
    title: "Принеси три банки тушенки.",
    reward: { type: "balyary", quantity: 10 },
    target: { type: "canned_meat", quantity: 3 },
  },
  {
    id: 27,
    title: "Принеси три куска хлеба.",
    reward: { type: "balyary", quantity: 9 },
    target: { type: "bread", quantity: 3 },
  },
  {
    id: 28,
    title: "Принеси две бутылки водки",
    reward: { type: "balyary", quantity: 5 },
    target: { type: "vodka_bottle", quantity: 2 },
  },
  {
    id: 29,
    title: "Принеси три куска мяса.",
    reward: { type: "balyary", quantity: 11 },
    target: { type: "meat_chunk", quantity: 3 },
  },
  {
    id: 30,
    title: "Принеси две бутылки молока.",
    reward: { type: "balyary", quantity: 7 },
    target: { type: "milk", quantity: 2 },
  },
  {
    id: 31,
    title: "Принеси три бутылки молока.",
    reward: { type: "balyary", quantity: 10 },
    target: { type: "milk", quantity: 3 },
  },
  {
    id: 32,
    title: "Принеси две банки сгущёнки.",
    reward: { type: "balyary", quantity: 6 },
    target: { type: "condensed_milk", quantity: 2 },
  },
  {
    id: 33,
    title: "Принеси четыре сушёной рыбы.",
    reward: { type: "balyary", quantity: 15 },
    target: { type: "dried_fish", quantity: 4 },
  },
  {
    id: 34,
    title: "Принеси два энергетика.",
    reward: { type: "balyary", quantity: 6 },
    target: { type: "energy_drink", quantity: 2 },
  },
  {
    id: 35,
    title: "Принеси пять орехов.",
    reward: { type: "balyary", quantity: 10 },
    target: { type: "nut", quantity: 5 },
  },
  {
    id: 36,
    title: "Принеси один яблоко.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "apple", quantity: 1 },
  },
  {
    id: 37,
    title: "Принеси две ягоды.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "berries", quantity: 2 },
  },
  {
    id: 38,
    title: "Принеси одну морковь.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "carrot", quantity: 1 },
  },
  {
    id: 39,
    title: "Принеси два ореха.",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "nut", quantity: 2 },
  },
  {
    id: 40,
    title: "Принеси одну бутылку воды.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "water_bottle", quantity: 1 },
  },
  {
    id: 41,
    title: "Принеси один гриб.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "mushroom", quantity: 1 },
  },
  {
    id: 42,
    title: "Принеси две банки тушёнки.",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "canned_meat", quantity: 2 },
  },
  {
    id: 43,
    title: "Принеси один кусок хлеба.",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "bread", quantity: 1 },
  },
  {
    id: 44,
    title: "Принеси одну бутылку молока.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "milk", quantity: 1 },
  },
  {
    id: 45,
    title: "Принеси один энергетик.",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "energy_drink", quantity: 1 },
  },
];

let isNPCDialogOpen = false;
let isNPCMet = false;
let selectedQuest = null;
let dialogStage = "greeting";
let availableQuests = [];

function drawNPC() {
  const screenX = NPC.x - camera.x;
  const screenY = NPC.y - camera.y;
  if (npcSpriteImage.complete) {
    ctx.drawImage(npcSpriteImage, screenX, screenY, NPC.width, NPC.height);
  } else {
    ctx.fillStyle = "purple";
    ctx.fillRect(screenX, screenY, NPC.width, NPC.height);
  }
}

function checkNPCProximity() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const dx = me.x + 20 - (NPC.x + 35); // Учитываем центр NPC (70/2 = 35)
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
        <h2 class="npc-title">Квестер</h2>
      </div>
      <p class="npc-text">Привет, ого! Ни когда еще не видел человека без модернизаций! Видимо с деньгами у тебя совсем туго... Ну ничего можещь заработать у меня не много Баляр. Мои работники только и знают как шкерится в темных углах города. Находи предметы, если они мне нужны я заберу. До встречи хм... человек!</p>
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
  const shuffled = QUESTS.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function showQuestSelectionDialog(container) {
  if (availableQuests.length === 0) {
    availableQuests = getRandomQuests(5);
  }

  container.innerHTML = `
      <div class="npc-dialog-header">
        <img src="fotoQuestNPC.png" alt="NPC Photo" class="npc-photo">
        <h2 class="npc-title">Квестер</h2>
      </div>
      <p class="npc-text">Выбери задание, братишка!</p>
      <div id="questList" class="quest-list"></div>
  `;
  const questList = document.getElementById("questList");
  availableQuests.forEach((quest) => {
    const questItem = document.createElement("div");
    questItem.className = "quest-item";
    questItem.innerHTML = `
      <span class="quest-marker">></span>
      <p>${quest.title} <span class="quest-reward">(Награда: ${quest.reward.quantity} баляр)</span></p>
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
  if (!selectedQuest) return;

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
  if (!selectedQuest) return;

  const me = players.get(myId);
  if (!me) return;

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

  sendWhenReady(
    ws,
    JSON.stringify({
      type: "updateInventory",
      questId: selectedQuest.id,
      inventory: inventory,
    })
  );

  const previousQuestId = selectedQuest.id;
  availableQuests = availableQuests.filter((q) => q.id !== previousQuestId);

  let newQuest;
  do {
    newQuest = QUESTS[Math.floor(Math.random() * QUESTS.length)];
  } while (
    newQuest.id === previousQuestId ||
    availableQuests.some((q) => q.id === newQuest.id)
  );

  availableQuests.push(newQuest);
  console.log(
    `Задание "${selectedQuest.title}" выполнено! Получено ${reward.quantity} баляр.`
  );

  selectedQuest = null;

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

// Добавление стилей для диалогового окна NPC
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
