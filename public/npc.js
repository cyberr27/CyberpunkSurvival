// Хранилище NPC
const npcs = new Map();
let activeNPC = null; // Текущий активный NPC
let currentQuest = null; // Текущий активный квест
let isQuestDialogOpen = false; // Флаг открытого диалогового окна

// Загрузка спрайта NPC
const npcSprite = new Image();
npcSprite.src = "npc_sprite.png";

// Список квестов
const QUESTS = [
  {
    id: 1,
    description: "Найди 1 орех",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "nut", quantity: 1 },
  },
  {
    id: 2,
    description: "Собери 2 бутылки воды",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "water_bottle", quantity: 2 },
  },
  {
    id: 3,
    description: "Найди 1 энергетик",
    reward: { type: "balyary", quantity: 1 },
    target: { type: "energy_drink", quantity: 1 },
  },
  {
    id: 4,
    description: "Собери 3 ягоды",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "berries", quantity: 3 },
  },
  {
    id: 5,
    description: "Найди 1 банку тушёнки",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "canned_meat", quantity: 1 },
  },
  {
    id: 6,
    description: "Собери 2 яблока",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "apple", quantity: 2 },
  },
  {
    id: 7,
    description: "Найди 1 кусок мяса",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "meat_chunk", quantity: 1 },
  },
  {
    id: 8,
    description: "Собери 2 моркови",
    reward: { type: "balyary", quantity: 2 },
    target: { type: "carrot", quantity: 2 },
  },
  {
    id: 9,
    description: "Найди 1 пакет крови",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "blood_pack", quantity: 1 },
  },
  {
    id: 10,
    description: "Собери 3 гриба",
    reward: { type: "balyary", quantity: 3 },
    target: { type: "mushroom", quantity: 3 },
  },
];

// Создание NPC
function createNPC(id, x, y, name) {
  npcs.set(id, {
    id,
    x,
    y,
    name,
    hasInteracted: false, // Флаг знакомства (синхронизируется с сервером)
    currentQuestId: null, // ID текущего квеста (локально)
    collectedItems: {}, // Прогресс собранных предметов (локально)
  });
}

function syncNPCInteraction(npc) {
  if (ws.readyState === WebSocket.OPEN) {
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "npcInteraction",
        npcId: npc.id,
        hasInteracted: npc.hasInteracted,
      })
    );
  } else {
    console.error("WebSocket не готов, статус NPC не отправлен");
  }
}

// Проверка близости к NPC
function checkNPCProximity() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  let closestNPC = null;
  let minDistance = Infinity;

  npcs.forEach((npc) => {
    const dx = me.x + 20 - (npc.x + 20);
    const dy = me.y + 20 - (npc.y + 20);
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 50 && distance < minDistance) {
      closestNPC = npc;
      minDistance = distance;
    }
  });

  if (closestNPC) {
    if (!isQuestDialogOpen) {
      openQuestDialog(closestNPC); // Открываем диалог
    }
  } else if (isQuestDialogOpen) {
    closeQuestDialog(); // Закрываем, если отошли
  }
}

// Открытие диалогового окна
function openQuestDialog(npc) {
  activeNPC = npc;
  isQuestDialogOpen = true;

  const dialogContainer = document.createElement("div");
  dialogContainer.id = "questDialog";
  dialogContainer.className = "quest-dialog";

  if (!npc.hasInteracted) {
    // Первое взаимодействие
    dialogContainer.innerHTML = `
            <div class="npc-photo">
                <img src="fotoQuestNPC.png" alt="${npc.name}">
            </div>
            <h3>${npc.name}</h3>
            <p class="cyber-text">Эй, сталкер! Я ${npc.name}. Есть работёнка: собирай шмотки, а я тебе за это Баляры подгоню. Готов вкалывать?</p>
            <p class="cyber-text">☑</p>
            <button id="acceptQuestBtn" class="cyber-btn">Хорошо</button>
        `;
    document.body.appendChild(dialogContainer);

    document.getElementById("acceptQuestBtn").addEventListener("click", () => {
      npc.hasInteracted = true;
      syncNPCInteraction(npc); // Синхронизируем с сервером
      showQuestList(npc);
    });
  } else {
    // Повторное взаимодействие — сразу показываем список квестов
    showQuestList(npc);
  }
}

// Показ списка квестов
function showQuestList(npc) {
    const dialogContainer = document.getElementById("questDialog");
    if (!dialogContainer) return;

    // Если квеста нет, выбираем случайный
    if (!npc.currentQuestId) {
        const availableQuests = QUESTS.filter(
            (quest) => quest.id !== npc.currentQuestId
        );
        const newQuest = availableQuests[Math.floor(Math.random() * availableQuests.length)];
        npc.currentQuestId = newQuest.id;
        npc.collectedItems = {};
        currentQuest = newQuest;
    } else {
        currentQuest = QUESTS.find((quest) => quest.id === npc.currentQuestId);
    }

    // Формируем список квестов (текущий + 4 случайных)
    const questList = [currentQuest];
    const otherQuests = QUESTS.filter((quest) => quest.id !== currentQuest.id);
    for (let i = 0; i < 4; i++) {
        const randomQuest = otherQuests[Math.floor(Math.random() * otherQuests.length)];
        questList.push(randomQuest);
        otherQuests.splice(otherQuests.indexOf(randomQuest), 1);
    }

    // Получаем текущий прогресс
    const currentProgress = npc.collectedItems[currentQuest.target.type] || 0;
    const targetQuantity = currentQuest.target.quantity;

    dialogContainer.innerHTML = `
        <div class="npc-photo">
            <img src="fotoQuestNPC.png" alt="${npc.name}">
        </div>
        <h3>${npc.name}</h3>
        <p class="cyber-text">Выбери задание, сталкер:</p>
        <ul id="questList" class="quest-list">
            ${questList
                .map(
                    (quest) => `
                <li class="${quest.id === currentQuest.id ? 'active' : ''}" data-quest-id="${quest.id}">
                    ${quest.description} — Награда: ${quest.reward.quantity} Баляр
                    ${
                        quest.id === currentQuest.id
                            ? `<span class="quest-progress"> (Прогресс: ${currentProgress}/${targetQuantity})</span>`
                            : ''
                    }
                </li>
            `
                )
                .join("")}
        </ul>
    `;

    // Добавляем обработчик кликов для выбора квеста
    document.querySelectorAll("#questList li").forEach((li) => {
        li.addEventListener("click", () => {
            const questId = parseInt(li.getAttribute("data-quest-id"));
            if (questId !== npc.currentQuestId) {
                npc.currentQuestId = questId;
                npc.collectedItems = {};
                currentQuest = QUESTS.find((quest) => quest.id === questId);
                showQuestList(npc); // Обновляем список
            }
        });
    });
}

// Закрытие диалогового окна
function closeQuestDialog() {
  const dialogContainer = document.getElementById("questDialog");
  if (dialogContainer) {
    dialogContainer.remove();
  }
  activeNPC = null;
  isQuestDialogOpen = false;
}

// Проверка прогресса квеста при поднятии предмета
function checkQuestProgress(item) {
  if (!activeNPC || !currentQuest) return;

  const targetType = currentQuest.target.type;
  if (item.type === targetType) {
    activeNPC.collectedItems[targetType] =
      (activeNPC.collectedItems[targetType] || 0) + 1;
    console.log(
      `Собран предмет ${targetType}, прогресс: ${activeNPC.collectedItems[targetType]}/${currentQuest.target.quantity}`
    );

    if (activeNPC.collectedItems[targetType] >= currentQuest.target.quantity) {
      completeQuest();
    }
  }
}

// Завершение квеста
function completeQuest() {
  const reward = currentQuest.reward;
  const me = players.get(myId);

  // Добавляем награду (Баляры) в инвентарь
  const balyarySlot = inventory.findIndex(
    (slot) => slot && slot.type === "balyary"
  );
  if (balyarySlot !== -1) {
    inventory[balyarySlot].quantity =
      (inventory[balyarySlot].quantity || 1) + reward.quantity;
  } else {
    const freeSlot = inventory.findIndex((slot) => slot === null);
    if (freeSlot !== -1) {
      inventory[freeSlot] = {
        type: "balyary",
        quantity: reward.quantity,
        itemId: `balyary_${Date.now()}`,
      };
    } else {
      console.log("Инвентарь полон, награда не добавлена");
      return;
    }
  }

  // Отправляем серверу обновление инвентаря
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "update",
      player: {
        id: myId,
        inventory,
      },
    })
  );

  // Обновляем квест локально
  const availableQuests = QUESTS.filter(
    (quest) => quest.id !== currentQuest.id
  );
  const newQuest =
    availableQuests[Math.floor(Math.random() * availableQuests.length)];
  activeNPC.currentQuestId = newQuest.id;
  activeNPC.collectedItems = {};
  currentQuest = newQuest;

  updateInventoryDisplay();
  showQuestList(activeNPC); // Обновляем диалоговое окно
}

// Отрисовка NPC
function drawNPCs(deltaTime) {
  npcs.forEach((npc) => {
    const screenX = npc.x - camera.x;
    const screenY = npc.y - camera.y;
    if (
      screenX >= -40 &&
      screenX <= canvas.width + 40 &&
      screenY >= -40 &&
      screenY <= canvas.height + 40
    ) {
      ctx.drawImage(npcSprite, screenX, screenY, 40, 40);
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(npc.name, screenX + 20, screenY - 10);
    }
  });
}
