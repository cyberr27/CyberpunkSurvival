const NPC = {
  x: 590,
  y: 3150,
  width: 40,
  height: 40,
  interactionRadius: 50,
};

const QUESTS = [
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
    title: "Принеси дву бутылки водки.",
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
    id: 24,
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
    id: 31,
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

  const dx = me.x + 20 - (NPC.x + 20);
  const dy = me.y + 20 - (NPC.y + 20);
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
      <img src="fotoQuestNPC.png" alt="NPC Photo" class="npc-photo">
      <p class="npc-text">Привет, ого! Ни когда еще не видел человека без модернизаций! Видимо с деньгами у тебя совсем туго... Ну ничего можещь заработать у меня не много Баляр. Мои работники только и знают как шкерится в темных углах города. Находи предметы, если они мне нужны я заберу. До встречи хм... человек!</p>
      <button id="npcAgreeBtn" class="cyber-btn">Хорошо</button>
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
      <img src="fotoQuestNPC.png" alt="NPC Photo" class="npc-photo">
      <p class="npc-text">Квестер: Выбери задание, братишка!</p>
      <div id="questList" class="quest-list"></div>
  `;
  const questList = document.getElementById("questList");
  availableQuests.forEach((quest) => {
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

  // Удаляем ровно то количество предметов, которое указано в задании
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

  // Отправляем обновлённый инвентарь на сервер
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "updateInventory",
      inventory: inventory,
    })
  );

  // Удаляем выполненное задание из доступных и добавляем новое
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

  // Сбрасываем выбранное задание
  selectedQuest = null;

  // Немедленно обновляем отображение инвентаря
  updateInventoryDisplay();

  // Обновляем отображение статистики
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
