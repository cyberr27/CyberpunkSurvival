const NPC = {
  id: "fixer_neon",
  x: 591,
  y: 3150,
  name: "Neon Fixer",
  sprite: new Image(),
  photo: new Image(),
  firstInteraction: true,
  dialogOpen: false,
  currentQuests: [],
  completedQuests: [],
  acceptedQuests: [],
};

// Загрузка изображений
NPC.sprite.src = "npc_sprite.png"; // Спрайт 40x40 для поля
NPC.photo.src = "fotoQuestNPC.png"; // Фото для диалога

// Список из 30 заданий
const QUESTS = [
  {
    id: 1,
    text: "Собери 1 бутылку воды",
    item: "water_bottle",
    quantity: 1,
    reward: 1,
  },
  {
    id: 2,
    text: "Найди 2 банки тушёнки",
    item: "canned_meat",
    quantity: 2,
    reward: 3,
  },
  {
    id: 3,
    text: "Достань 1 энергетик",
    item: "energy_drink",
    quantity: 1,
    reward: 2,
  },
  { id: 4, text: "Принеси 3 ореха", item: "nut", quantity: 3, reward: 2 },
  { id: 5, text: "Собери 1 гриб", item: "mushroom", quantity: 1, reward: 2 },
  { id: 6, text: "Найди 2 колбасы", item: "sausage", quantity: 2, reward: 3 },
  {
    id: 7,
    text: "Достань 1 пакет крови",
    item: "blood_pack",
    quantity: 1,
    reward: 4,
  },
  { id: 8, text: "Принеси 2 хлеба", item: "bread", quantity: 2, reward: 2 },
  {
    id: 9,
    text: "Собери 1 бутылку водки",
    item: "vodka_bottle",
    quantity: 1,
    reward: 2,
  },
  {
    id: 10,
    text: "Найди 1 кусок мяса",
    item: "meat_chunk",
    quantity: 1,
    reward: 3,
  },
  {
    id: 11,
    text: "Достань 2 шприца с кровью",
    item: "blood_syringe",
    quantity: 2,
    reward: 3,
  },
  { id: 12, text: "Принеси 1 молоко", item: "milk", quantity: 1, reward: 2 },
  {
    id: 13,
    text: "Собери 1 банку сгущёнки",
    item: "condensed_milk",
    quantity: 1,
    reward: 2,
  },
  {
    id: 14,
    text: "Найди 2 сушёные рыбы",
    item: "dried_fish",
    quantity: 2,
    reward: 3,
  },
  { id: 15, text: "Достань 3 яблока", item: "apple", quantity: 3, reward: 2 },
  { id: 16, text: "Принеси 4 ягоды", item: "berries", quantity: 4, reward: 2 },
  { id: 17, text: "Собери 2 моркови", item: "carrot", quantity: 2, reward: 2 },
  { id: 18, text: "Найди 5 баляров", item: "balyary", quantity: 5, reward: 1 },
  {
    id: 19,
    text: "Достань 1 бутылку воды и 1 орех",
    item: ["water_bottle", "nut"],
    quantity: [1, 1],
    reward: 3,
  },
  {
    id: 20,
    text: "Принеси 2 энергетика",
    item: "energy_drink",
    quantity: 2,
    reward: 4,
  },
  {
    id: 21,
    text: "Собери 1 пакет крови и 1 водку",
    item: ["blood_pack", "vodka_bottle"],
    quantity: [1, 1],
    reward: 5,
  },
  {
    id: 22,
    text: "Найди 3 банки тушёнки",
    item: "canned_meat",
    quantity: 3,
    reward: 4,
  },
  { id: 23, text: "Достань 2 гриба", item: "mushroom", quantity: 2, reward: 3 },
  {
    id: 24,
    text: "Принеси 1 колбасу и 1 хлеб",
    item: ["sausage", "bread"],
    quantity: [1, 1],
    reward: 3,
  },
  { id: 25, text: "Собери 2 молока", item: "milk", quantity: 2, reward: 3 },
  {
    id: 26,
    text: "Найди 1 сгущёнку и 1 рыбу",
    item: ["condensed_milk", "dried_fish"],
    quantity: [1, 1],
    reward: 3,
  },
  { id: 27, text: "Достань 4 ореха", item: "nut", quantity: 4, reward: 2 },
  {
    id: 28,
    text: "Принеси 3 ягоды и 1 яблоко",
    item: ["berries", "apple"],
    quantity: [3, 1],
    reward: 3,
  },
  {
    id: 29,
    text: "Собери 2 шприца и 1 пакет крови",
    item: ["blood_syringe", "blood_pack"],
    quantity: [2, 1],
    reward: 5,
  },
  {
    id: 30,
    text: "Найди 10 баляров",
    item: "balyary",
    quantity: 10,
    reward: 2,
  },
];

// Инициализация NPC
function initializeNPC() {
  // Выбираем начальные 5 заданий
  NPC.currentQuests = getRandomQuests(5);
  createDialogWindow();
}

// Создание диалогового окна
function createDialogWindow() {
  const dialog = document.createElement("div");
  dialog.id = "npcDialog";
  dialog.className = "npc-dialog";
  dialog.style.display = "none";
  document.getElementById("gameContainer").appendChild(dialog);
}

// Обновление диалогового окна
function updateDialog() {
  const dialog = document.getElementById("npcDialog");
  if (!NPC.dialogOpen) {
    dialog.style.display = "none";
    return;
  }
  dialog.style.display = "flex";

  if (NPC.firstInteraction) {
    dialog.innerHTML = `
        <div class="npc-photo-frame">
          <img src="${NPC.photo.src}" alt="NPC Photo" class="npc-photo">
        </div>
        <div class="npc-dialog-content">
          <h3 class="npc-name">${NPC.name}</h3>
          <p class="npc-text">
            <!-- Замени этот текст на свой -->
            Эй, чумба, добро пожаловать в мою нейро-дыру! Я Neon Fixer, знаю все тёмные углы этого города. Хочешь заработать баляры? У меня есть работёнка для таких, как ты.
          </p>
          <button class="npc-btn" onclick="showQuestMenu()">Хорошо</button>
        </div>
      `;
  } else {
    showQuestMenu();
  }
}

// Показать меню заданий
function showQuestMenu() {
  NPC.firstInteraction = false;
  const dialog = document.getElementById("npcDialog");
  let questList = NPC.currentQuests
    .map(
      (q) => `
      <li class="quest-item" onclick="acceptQuest(${q.id})">${q.text} (Награда: ${q.reward} баляров)</li>
    `
    )
    .join("");
  dialog.innerHTML = `
      <div class="npc-photo-frame">
        <img src="${NPC.photo.src}" alt="NPC Photo" class="npc-photo">
      </div>
      <div class="npc-dialog-content">
        <h3 class="npc-name">${NPC.name}</h3>
        <p class="npc-text">Выбери работу, чумба:</p>
        <ul class="quest-list">${questList}</ul>
        <button class="npc-btn" onclick="closeDialog()">Закрыть</button>
      </div>
    `;
}

// Закрыть диалог
function closeDialog() {
  NPC.dialogOpen = false;
  updateDialog();
}

// Принять задание
function acceptQuest(questId) {
  const quest = QUESTS.find((q) => q.id === questId);
  if (quest && !NPC.acceptedQuests.some((q) => q.id === questId)) {
    NPC.acceptedQuests.push({
      ...quest,
      progress: Array.isArray(quest.quantity) ? quest.quantity.map(() => 0) : 0,
    });
    sendQuestUpdate();
    closeDialog();
  }
}

// Проверка выполнения заданий
function checkQuests() {
  const me = players.get(myId);
  if (!me || !inventory) return;

  NPC.acceptedQuests.forEach((quest, index) => {
    if (Array.isArray(quest.item)) {
      // Сложное задание (несколько предметов)
      let completed = true;
      quest.item.forEach((itemType, i) => {
        const required = quest.quantity[i];
        const count = countItem(itemType);
        quest.progress[i] = Math.min(count, required);
        if (quest.progress[i] < required) completed = false;
      });
      if (completed) {
        completeQuest(index);
      }
    } else {
      // Простое задание (один предмет)
      const count = countItem(quest.item);
      quest.progress = Math.min(count, quest.quantity);
      if (quest.progress >= quest.quantity) {
        completeQuest(index);
      }
    }
  });
}

// Подсчёт предметов в инвентаре
function countItem(itemType) {
  return inventory.reduce((count, slot) => {
    if (slot && slot.type === itemType) {
      return count + (slot.quantity || 1);
    }
    return count;
  }, 0);
}

// Выполнение задания
function completeQuest(questIndex) {
  const quest = NPC.acceptedQuests[questIndex];
  if (!quest) return;

  // Удаляем предметы из инвентаря
  if (Array.isArray(quest.item)) {
    quest.item.forEach((itemType, i) => {
      let remaining = quest.quantity[i];
      for (let j = 0; j < inventory.length && remaining > 0; j++) {
        if (inventory[j] && inventory[j].type === itemType) {
          const slotQuantity = inventory[j].quantity || 1;
          if (slotQuantity <= remaining) {
            inventory[j] = null;
            remaining -= slotQuantity;
          } else {
            inventory[j].quantity -= remaining;
            remaining = 0;
          }
          sendWhenReady(
            ws,
            JSON.stringify({ type: "updateInventory", slotIndex: j })
          );
        }
      }
    });
  } else {
    let remaining = quest.quantity;
    for (let i = 0; i < inventory.length && remaining > 0; i++) {
      if (inventory[i] && inventory[i].type === quest.item) {
        const slotQuantity = inventory[i].quantity || 1;
        if (slotQuantity <= remaining) {
          inventory[i] = null;
          remaining -= slotQuantity;
        } else {
          inventory[i].quantity -= remaining;
          remaining = 0;
        }
        sendWhenReady(
          ws,
          JSON.stringify({ type: "updateInventory", slotIndex: i })
        );
      }
    }
  }

  // Начисляем награду
  let balyarySlot = inventory.findIndex(
    (slot) => slot && slot.type === "balyary"
  );
  if (balyarySlot !== -1) {
    inventory[balyarySlot].quantity =
      (inventory[balyarySlot].quantity || 1) + quest.reward;
  } else {
    const freeSlot = inventory.findIndex((slot) => slot === null);
    if (freeSlot !== -1) {
      inventory[freeSlot] = { type: "balyary", quantity: quest.reward };
    }
  }
  sendWhenReady(ws, JSON.stringify({ type: "updateInventory", inventory }));

  // Обновляем списки
  NPC.completedQuests.push(quest.id);
  NPC.acceptedQuests.splice(questIndex, 1);
  const questIndexInCurrent = NPC.currentQuests.findIndex(
    (q) => q.id === quest.id
  );
  if (questIndexInCurrent !== -1) {
    NPC.currentQuests[questIndexInCurrent] = getRandomQuest();
  }
  sendQuestUpdate();
  updateInventoryDisplay();
}

// Получить случайное задание
function getRandomQuest() {
  const availableQuests = QUESTS.filter(
    (q) =>
      !NPC.completedQuests.includes(q.id) &&
      !NPC.currentQuests.some((cq) => cq.id === q.id)
  );
  if (availableQuests.length === 0) {
    NPC.completedQuests = [];
    return QUESTS[Math.floor(Math.random() * QUESTS.length)];
  }
  return availableQuests[Math.floor(Math.random() * availableQuests.length)];
}

// Получить 5 случайных заданий
function getRandomQuests(count) {
  const quests = [];
  for (let i = 0; i < count; i++) {
    quests.push(getRandomQuest());
  }
  return quests;
}

// Отправка обновления заданий на сервер
function sendQuestUpdate() {
  if (ws.readyState === WebSocket.OPEN) {
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "updateQuests",
        npcId: NPC.id,
        currentQuests: NPC.currentQuests,
        completedQuests: NPC.completedQuests,
        acceptedQuests: NPC.acceptedQuests,
      })
    );
  }
}

// Проверка расстояния до NPC
function checkNPCDistance() {
  const me = players.get(myId);
  if (!me) return;

  const dx = me.x + 20 - (NPC.x + 20);
  const dy = me.y + 20 - (NPC.y + 20);
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 50 && !NPC.dialogOpen) {
    NPC.dialogOpen = true;
    updateDialog();
  } else if (distance >= 50 && NPC.dialogOpen) {
    NPC.dialogOpen = false;
    updateDialog();
  }
}

// Отрисовка NPC
function drawNPC() {
  const screenX = NPC.x - camera.x;
  const screenY = NPC.y - camera.y;
  if (
    NPC.sprite.complete &&
    screenX >= -40 &&
    screenX <= canvas.width &&
    screenY >= -40 &&
    screenY <= canvas.height
  ) {
    ctx.drawImage(NPC.sprite, screenX, screenY, 40, 40);
    // Имя над NPC
    ctx.fillStyle = "#00ffff";
    ctx.font = "12px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(NPC.name, screenX + 20, screenY - 10);
  }
}

// Инициализация при загрузке
NPC.sprite.onload = () => {
  initializeNPC();
};
