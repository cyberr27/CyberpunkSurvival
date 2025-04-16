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
  {
    id: 6,
    title: "Собери 2 банки тушёнки",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "canned_meat", quantity: 2 },
  },
  {
    id: 7,
    title: "Собери 3 гриба",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "mushroom", quantity: 3 },
  },
  {
    id: 8,
    title: "Собери 1 колбасу",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "sausage", quantity: 1 },
  },
  {
    id: 9,
    title: "Собери 1 пакет крови",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "blood_pack", quantity: 1 },
  },
  {
    id: 10,
    title: "Собери 2 куска хлеба",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "bread", quantity: 2 },
  },
  {
    id: 11,
    title: "Собери 1 бутылку водки",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "vodka_bottle", quantity: 1 },
  },
  {
    id: 12,
    title: "Собери 2 куска мяса",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "meat_chunk", quantity: 2 },
  },
  {
    id: 13,
    title: "Собери 3 шприца с кровью",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "blood_syringe", quantity: 3 },
  },
  {
    id: 14,
    title: "Собери 2 бутылки молока",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "milk", quantity: 2 },
  },
  {
    id: 15,
    title: "Собери 1 банку сгущёнки",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "condensed_milk", quantity: 1 },
  },
  {
    id: 16,
    title: "Собери 3 сушёной рыбы",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "dried_fish", quantity: 3 },
  },
  {
    id: 17,
    title: "Собери 1 энергетик",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "energy_drink", quantity: 1 },
  },
  {
    id: 18,
    title: "Собери 4 ореха",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "nut", quantity: 4 },
  },
  {
    id: 19,
    title: "Собери 3 яблока",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "apple", quantity: 3 },
  },
  {
    id: 20,
    title: "Собери 5 ягод",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "berries", quantity: 5 },
  },
  {
    id: 21,
    title: "Собери 2 моркови",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "carrot", quantity: 2 },
  },
  {
    id: 22,
    title: "Собери 2 бутылки воды",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "water_bottle", quantity: 2 },
  },
  {
    id: 23,
    title: "Собери 3 банки тушёнки",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "canned_meat", quantity: 3 },
  },
  {
    id: 24,
    title: "Собери 4 гриба",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "mushroom", quantity: 4 },
  },
  {
    id: 25,
    title: "Собери 2 колбасы",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "sausage", quantity: 2 },
  },
  {
    id: 26,
    title: "Собери 2 пакета крови",
    reward: { type: "balyary", quantity: 5 },
    target: { type: "blood_pack", quantity: 2 },
  },
  {
    id: 27,
    title: "Собери 3 куска хлеба",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "bread", quantity: 3 },
  },
  {
    id: 28,
    title: "Собери 2 бутылки водки",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "vodka_bottle", quantity: 2 },
  },
  {
    id: 29,
    title: "Собери 3 куска мяса",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "meat_chunk", quantity: 3 },
  },
  {
    id: 30,
    title: "Собери 4 шприца с кровью",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "blood_syringe", quantity: 4 },
  },
  {
    id: 31,
    title: "Собери 3 бутылки молока",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "milk", quantity: 3 },
  },
  {
    id: 32,
    title: "Собери 2 банки сгущёнки",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "condensed_milk", quantity: 2 },
  },
  {
    id: 33,
    title: "Собери 4 сушёной рыбы",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "dried_fish", quantity: 4 },
  },
  {
    id: 34,
    title: "Собери 2 энергетика",
    reward: { type: "balyary", quantity: 4 },
    target: { type: "energy_drink", quantity: 2 },
  },
  {
    id: 35,
    title: "Собери 5 орехов",
    reward: { type: "balyary", quantity: 4 },
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

  let itemsToRemove = selectedQuest.target.quantity;
  for (let i = 0; i < inventory.length && itemsToRemove > 0; i++) {
    if (inventory[i] && inventory[i].type === selectedQuest.target.type) {
      if (inventory[i].quantity && inventory[i].quantity > 1) {
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
    }
  }

  sendWhenReady(
    ws,
    JSON.stringify({
      type: "updateInventory",
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
  updateInventoryDisplay();
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
