// Конфигурация NPC
const NPC_CONFIG = {
  id: "questGiver1",
  x: 590,
  y: 3100,
  sprite: new Image(),
  portrait: new Image(),
  name: "John",
  quests: [
    // Существующие задания
    {
      id: "quest1",
      title: "Собери 2 ореха",
      description: "Найди и подбери 2 ореха в мире.",
      reward: { type: "balyary", quantity: 5 },
      condition: () => {
        const nuts = inventory.filter(
          (item) => item && item.type === "nut"
        ).length;
        return nuts >= 2;
      },
      onComplete: () => {
        let nutsToRemove = 2;
        for (let i = 0; i < inventory.length && nutsToRemove > 0; i++) {
          if (inventory[i] && inventory[i].type === "nut") {
            inventory[i] = null;
            nutsToRemove--;
          }
        }
      },
    },
    {
      id: "quest2",
      title: "Путешественник",
      description: "Пройди 100000 пикселей по миру.",
      reward: { type: "balyary", quantity: 10 },
      condition: () => {
        const me = players.get(myId);
        return me.distanceTraveled >= 100000;
      },
      onComplete: () => {
        // Ничего не удаляем, просто проверяем дистанцию
      },
    },
    {
      id: "quest3",
      title: "Охотник за водой",
      description: "Собери 3 бутылки воды (water_bottle).",
      reward: { type: "balyary", quantity: 9 },
      condition: () => {
        const waterBottles = inventory.filter(
          (item) => item && item.type === "water_bottle"
        ).length;
        return waterBottles >= 3;
      },
      onComplete: () => {
        let bottlesToRemove = 3;
        for (let i = 0; i < inventory.length && bottlesToRemove > 0; i++) {
          if (inventory[i] && inventory[i].type === "water_bottle") {
            inventory[i] = null;
            bottlesToRemove--;
          }
        }
      },
    },
    // Новые задания
    {
      id: "quest4",
      title: "Найти бутылку воды",
      description: "Найди и подбери 1 бутылку воды (water_bottle).",
      reward: { type: "balyary", quantity: 1 },
      condition: () => {
        return inventory.some((item) => item && item.type === "water_bottle");
      },
      onComplete: () => {
        for (let i = 0; i < inventory.length; i++) {
          if (inventory[i] && inventory[i].type === "water_bottle") {
            inventory[i] = null;
            break;
          }
        }
      },
    },
    {
      id: "quest5",
      title: "Найти молоко",
      description: "Найди и подбери 1 молоко (milk).",
      reward: { type: "balyary", quantity: 2 },
      condition: () => {
        return inventory.some((item) => item && item.type === "milk");
      },
      onComplete: () => {
        for (let i = 0; i < inventory.length; i++) {
          if (inventory[i] && inventory[i].type === "milk") {
            inventory[i] = null;
            break;
          }
        }
      },
    },
    {
      id: "quest6",
      title: "Найти колбасу",
      description: "Найди и подбери 1 колбасу (sausage).",
      reward: { type: "balyary", quantity: 1 },
      condition: () => {
        return inventory.some((item) => item && item.type === "sausage");
      },
      onComplete: () => {
        for (let i = 0; i < inventory.length; i++) {
          if (inventory[i] && inventory[i].type === "sausage") {
            inventory[i] = null;
            break;
          }
        }
      },
    },
    {
      id: "quest7",
      title: "Найти энергетик",
      description: "Найди и подбери 1 энергетик (energy_drink).",
      reward: { type: "balyary", quantity: 1 },
      condition: () => {
        return inventory.some((item) => item && item.type === "energy_drink");
      },
      onComplete: () => {
        for (let i = 0; i < inventory.length; i++) {
          if (inventory[i] && inventory[i].type === "energy_drink") {
            inventory[i] = null;
            break;
          }
        }
      },
    },
    {
      id: "quest8",
      title: "Найти сушёную рыбу",
      description: "Найди и подбери 1 сушёную рыбу (dried_fish).",
      reward: { type: "balyary", quantity: 1 },
      condition: () => {
        return inventory.some((item) => item && item.type === "dried_fish");
      },
      onComplete: () => {
        for (let i = 0; i < inventory.length; i++) {
          if (inventory[i] && inventory[i].type === "dried_fish") {
            inventory[i] = null;
            break;
          }
        }
      },
    },
    {
      id: "quest9",
      title: "Найти кусок мяса",
      description: "Найди и подбери 1 кусок мяса (meat_chunk).",
      reward: { type: "balyary", quantity: 2 },
      condition: () => {
        return inventory.some((item) => item && item.type === "meat_chunk");
      },
      onComplete: () => {
        for (let i = 0; i < inventory.length; i++) {
          if (inventory[i] && inventory[i].type === "meat_chunk") {
            inventory[i] = null;
            break;
          }
        }
      },
    },
  ],
};

// Пул всех возможных заданий для замены
const QUEST_POOL = NPC_CONFIG.quests;

// Загрузка спрайта и портрета NPC
NPC_CONFIG.sprite.src = "questNPC.png";
NPC_CONFIG.portrait.src = "fotoQuestNPC.png";

// Состояние квестов
let activeQuest = null;
let questDialogOpen = false;
let questDialogEl = null;
let currentQuests = []; // Текущие 5 заданий для отображения
let hasInteracted = false; // Флаг первого взаимодействия (будет загружаться с сервера)

// Инициализация текущих заданий (выбираем 5 случайных)
function initializeQuests() {
  currentQuests = [];
  const availableQuests = [...QUEST_POOL];
  for (let i = 0; i < 5; i++) {
    if (availableQuests.length === 0) break;
    const randomIndex = Math.floor(Math.random() * availableQuests.length);
    currentQuests.push(availableQuests[randomIndex]);
    availableQuests.splice(randomIndex, 1);
  }
}

// Создание диалогового окна
function createQuestDialog() {
  if (questDialogEl) return;
  questDialogEl = document.createElement("div");
  questDialogEl.id = "questDialog";
  questDialogEl.style.position = "absolute";
  questDialogEl.style.top = "50%";
  questDialogEl.style.left = "50%";
  questDialogEl.style.transform = "translate(-50%, -50%)";
  questDialogEl.style.width = "300px";
  questDialogEl.style.background = "rgba(26, 26, 26, 0.9)";
  questDialogEl.style.border = "2px solid #00ffff";
  questDialogEl.style.borderRadius = "10px";
  questDialogEl.style.padding = "20px";
  questDialogEl.style.color = "#00ffff";
  questDialogEl.style.fontFamily = '"Courier New", monospace';
  questDialogEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
  questDialogEl.style.zIndex = "200";
  questDialogEl.style.display = "none";
  document.getElementById("gameContainer").appendChild(questDialogEl);
}

// Запрос состояния взаимодействия с сервера
function fetchInteractionStatus() {
  if (ws.readyState === WebSocket.OPEN) {
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "fetchInteraction",
        playerId: myId,
        npcId: NPC_CONFIG.id,
      })
    );
  }
}

// Обновление диалогового окна
function updateQuestDialog() {
  if (!questDialogEl) return;
  if (!questDialogOpen) {
    questDialogEl.style.display = "none";
    return;
  }
  questDialogEl.style.display = "block";

  let content = `<h2>${NPC_CONFIG.name}</h2>`;

  // Добавляем портрет NPC
  content += `
    <div class="npc-portrait">
      <img src="${NPC_CONFIG.portrait.src}" alt="${NPC_CONFIG.name}" style="width: 60px; height: 60px; border: 2px solid #00ffff; border-radius: 5px;" />
    </div>
  `;

  // Проверяем первое взаимодействие
  if (!hasInteracted) {
    content += `<p id="JohnText">Привет, ого! Никогда в жизни не видел человека на котором было бы столько мяса! Видимо с деньгами у тебя совсем туго раз не можешь позволить себе модернизацию... Ну ничего можешь подзаработать у меня пару - тройку Баляр. Я поставляю продукты в местный магазин - можешь попробовать достать их для меня, мои работники только и знают как шкерится. Если условия устраивают, бери задание, выполняй и возвращайся за наградой!</p>`;
    content += `<button id="continueBtn" class="action-btn use-btn">Продолжить</button>`;
  } else {
    // Стандартная логика
    if (activeQuest) {
      const quest = currentQuests.find((q) => q.id === activeQuest);
      if (!quest) {
        activeQuest = null; // Сбрасываем, если квест больше не в списке
        updateQuestDialog();
        return;
      }
      content += `<p><strong>${quest.title}</strong></p>`;
      content += `<p>${quest.description}</p>`;
      if (quest.condition()) {
        content += `<button id="claimReward" class="action-btn use-btn">Забрать награду</button>`;
      } else {
        content += `<p>Задание ещё не выполнено.</p>`;
      }
      content += `<button id="abandonQuest" class="action-btn drop-btn">Отказаться</button>`;
    } else {
      content += `<p>Выбери задание:</p>`;
      currentQuests.forEach((quest) => {
        content += `<button class="quest-btn" data-quest-id="${quest.id}">${quest.title}</button>`;
      });
    }
  }

  questDialogEl.innerHTML = content;

  // Обработчики кнопок
  if (!hasInteracted) {
    const continueBtn = questDialogEl.querySelector("#continueBtn");
    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        hasInteracted = true;
        // Отправляем серверу информацию о первом взаимодействии
        if (ws.readyState === WebSocket.OPEN) {
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "setInteraction",
              playerId: myId,
              npcId: NPC_CONFIG.id,
              hasInteracted: true,
            })
          );
        }
        updateQuestDialog();
      });
    }
  } else {
    const claimBtn = questDialogEl.querySelector("#claimReward");
    if (claimBtn) {
      claimBtn.addEventListener("click", () => {
        claimQuestReward();
      });
    }
    const abandonBtn = questDialogEl.querySelector("#abandonQuest");
    if (abandonBtn) {
      abandonBtn.addEventListener("click", () => {
        activeQuest = null;
        updateQuestDialog();
      });
    }
    const questButtons = questDialogEl.querySelectorAll(".quest-btn");
    questButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        activeQuest = btn.dataset.questId;
        updateQuestDialog();
      });
    });
  }
}

// Получение награды и замена задания
function claimQuestReward() {
  const quest = currentQuests.find((q) => q.id === activeQuest);
  if (!quest || !quest.condition()) return;

  // Выполняем логику завершения
  quest.onComplete();

  // Добавляем награду
  const reward = quest.reward;
  if (reward.type === "balyary") {
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
      }
    }
  }

  // Заменяем выполненное задание на новое
  const availableQuests = QUEST_POOL.filter(
    (q) => !currentQuests.some((cq) => cq.id === q.id)
  );
  if (availableQuests.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableQuests.length);
    const newQuest = availableQuests[randomIndex];
    const questIndex = currentQuests.findIndex((q) => q.id === activeQuest);
    currentQuests[questIndex] = newQuest;
  } else {
    // Если нет доступных заданий, просто удаляем текущее
    const questIndex = currentQuests.findIndex((q) => q.id === activeQuest);
    currentQuests.splice(questIndex, 1);
  }

  // Обновляем инвентарь
  updateInventoryDisplay();

  // Отправляем обновление на сервер
  const me = players.get(myId);
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "update",
      player: {
        id: myId,
        x: me.x,
        y: me.y,
        health: me.health,
        energy: me.energy,
        food: me.food,
        water: me.water,
        armor: me.armor,
        distanceTraveled: me.distanceTraveled,
        direction: me.direction,
        state: me.state,
        frame: me.frame,
        inventory: inventory,
      },
    })
  );

  activeQuest = null;
  updateQuestDialog();
}

// Проверка близости к NPC
function checkNPCCollision() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const dx = me.x + 20 - NPC_CONFIG.x;
  const dy = me.y + 20 - NPC_CONFIG.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 50 && !questDialogOpen) {
    questDialogOpen = true;
    updateQuestDialog();
  } else if (distance >= 50 && questDialogOpen) {
    questDialogOpen = false;
    updateQuestDialog();
  }
}

// Отрисовка NPC
function drawNPC() {
  const screenX = NPC_CONFIG.x - camera.x;
  const screenY = NPC_CONFIG.y - camera.y;
  if (
    screenX >= -40 &&
    screenX <= canvas.width &&
    screenY >= -40 &&
    screenY <= canvas.height
  ) {
    if (NPC_CONFIG.sprite.complete) {
      ctx.drawImage(NPC_CONFIG.sprite, screenX, screenY, 40, 40);
    } else {
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(screenX, screenY, 40, 40);
    }
    ctx.fillStyle = "#00ffff";
    ctx.font = "12px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(NPC_CONFIG.name, screenX + 20, screenY - 10);
  }
}

// Инициализация NPC
function initNPC() {
  createQuestDialog();
  initializeQuests();
  fetchInteractionStatus();
}

// Обработка ответа от сервера о состоянии взаимодействия
function handleInteractionResponse(data) {
  if (data.playerId === myId && data.npcId === NPC_CONFIG.id) {
    hasInteracted = data.hasInteracted || false;
    updateQuestDialog();
  }
}

// Экспортируем функции
window.initNPC = initNPC;
window.checkNPCCollision = checkNPCCollision;
window.drawNPC = drawNPC;
window.handleInteractionResponse = handleInteractionResponse;
