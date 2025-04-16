// Данные NPC
const NPC = {
  x: 590, // Позиция NPC на карте (можно настроить)
  y: 3150,
  width: 40,
  height: 40,
  interactionRadius: 50, // Радиус взаимодействия (50 пикселей)
};

// Список заданий
const QUESTS = [
  {
    id: 1,
    title: "Собери 1 орех",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "nut", quantity: 1 },
  },
  {
    id: 2,
    title: "Собери 2 яблока",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "apple", quantity: 2 },
  },
  {
    id: 3,
    title: "Собери 1 бутылку воды",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "water_bottle", quantity: 1 },
  },
  {
    id: 4,
    title: "Собери 3 ягоды",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "berries", quantity: 3 },
  },
  {
    id: 5,
    title: "Собери 1 морковь",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "carrot", quantity: 1 },
  },
];

// Текущее состояние NPC
let isNPCDialogOpen = false;
let isNPCMet = false; // Флаг знакомства (будет синхронизироваться с сервером)
let selectedQuest = null; // Выбранное задание
let dialogStage = "greeting"; // Этапы диалога: greeting, questSelection

// Отрисовка NPC на карте
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

// Проверка расстояния до NPC
function checkNPCProximity() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const dx = me.x + 20 - (NPC.x + 20);
  const dy = me.y + 20 - (NPC.y + 20);
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < NPC.interactionRadius && !isNPCDialogOpen) {
    openNPCDialog();
  } else if (distance >= NPC.interactionRadius && isNPCDialogOpen) {
    closeNPCDialog();
  }
}

// Открытие диалогового окна
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

// Закрытие диалогового окна
function closeNPCDialog() {
  isNPCDialogOpen = false;
  const dialogContainer = document.getElementById("npcDialog");
  if (dialogContainer) {
    dialogContainer.remove();
  }
}

// Диалог знакомства
function showGreetingDialog(container) {
  dialogStage = "greeting";
  container.innerHTML = `
      <img src="fotoQuestNPC.png" alt="NPC Photo" class="npc-photo">
      <p class="npc-text">Привет, я Квестер! Хочешь заработать баляры? Я дам тебе задания!</p>
      <button id="npcAgreeBtn" class="cyber-btn">Хорошо</button>
  `;
  document.getElementById("npcAgreeBtn").addEventListener("click", () => {
    isNPCMet = true;
    dialogStage = "questSelection";
    sendWhenReady(ws, JSON.stringify({ type: "meetNPC", npcMet: true }));
    showQuestSelectionDialog(container);
  });
}

// Диалог выбора задания
function showQuestSelectionDialog(container) {
  container.innerHTML = `
      <img src="fotoQuestNPC.png" alt="NPC Photo" class="npc-photo">
      <p class="npc-text">Квестер: Выбери задание, братишка!</p>
      <div id="questList" class="quest-list"></div>
  `;
  const questList = document.getElementById("questList");
  QUESTS.forEach((quest) => {
    const questItem = document.createElement("div");
    questItem.className = "quest-item";
    questItem.innerHTML = `<p>${quest.title} (Награда: ${quest.reward.quantity} баляр)</p>`;
    questItem.addEventListener("click", () => {
      selectQuest(quest);
      closeNPCDialog();
    });
    questList.appendChild(questItem);
  });
}

// Выбор задания
function selectQuest(quest) {
  selectedQuest = quest;
  console.log(`Выбрано задание: ${quest.title}`);
}

// Проверка выполнения задания
function checkQuestCompletion() {
  if (!selectedQuest) return;

  const me = players.get(myId);
  if (!me) return;

  const targetItem = selectedQuest.target;
  const requiredQuantity = targetItem.quantity;
  let currentQuantity = 0;

  // Проверяем инвентарь на наличие нужных предметов
  inventory.forEach((slot) => {
    if (slot && slot.type === targetItem.type) {
      currentQuantity += slot.quantity || 1;
    }
  });

  if (currentQuantity >= requiredQuantity) {
    completeQuest();
  }
}

// Выполнение задания
function completeQuest() {
  if (!selectedQuest) return;

  const me = players.get(myId);
  if (!me) return;

  // Удаляем требуемые предметы из инвентаря
  let itemsToRemove = selectedQuest.target.quantity;
  for (let i = 0; i < inventory.length && itemsToRemove > 0; i++) {
    if (inventory[i] && inventory[i].type === selectedQuest.target.type) {
      inventory[i] = null;
      itemsToRemove--;
    }
  }

  // Добавляем награду
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

  // Отправляем обновление инвентаря на сервер
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "updateInventory",
      inventory: inventory,
    })
  );

  console.log(
    `Задание "${selectedQuest.title}" выполнено! Получено ${reward.quantity} баляр.`
  );
  selectedQuest = null;
  updateInventoryDisplay();
}

// Функция для установки флага знакомства
function setNPCMet(met) {
  isNPCMet = met;
}
