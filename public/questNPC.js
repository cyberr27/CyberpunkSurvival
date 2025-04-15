// questNPC.js

// Конфигурация NPC
const NPC_CONFIG = {
  id: "questGiver1",
  x: 590,
  y: 3100,
  sprite: new Image(),
  name: "John",
  quests: [
    {
      id: "quest1",
      title: "Собери 2 ореха",
      description: "Найди и подбери 2 орехов в мире.",
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
            _inventory[i] = null;
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
  ],
};

// Загрузка спрайта NPC
NPC_CONFIG.sprite.src = "questNPC.png"; // Убедись, что у тебя есть этот спрайт в папке public

// Состояние квестов
let activeQuest = null;
let questDialogOpen = false;
let questDialogEl = null;

// Отслеживание первого взаимодействия для каждого игрока
const firstInteraction = {};

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

// Обновление диалогового окна
function updateQuestDialog() {
  if (!questDialogEl) return;
  if (!questDialogOpen) {
    questDialogEl.style.display = "none";
    return;
  }
  questDialogEl.style.display = "block";

  let content = `<h2>${NPC_CONFIG.name}</h2>`;

  // Проверяем, первое ли это взаимодействие
  if (firstInteraction[myId] === undefined) {
    // МЕСТО ДЛЯ ВАШЕГО ТЕКСТА
    // Вставьте ваш начальный текст здесь, например:
    // content += `<p>Привет, я Джон! Впервые здесь? Давай я расскажу тебе, что к чему...</p>`;
    content += `<p>Привет, как зовут? Что то не видал тебя здесь раньше...</p>`;
    content += `<button id="continueBtn" class="action-btn use-btn">Продолжить</button>`;
  } else {
    // Стандартная логика для последующих взаимодействий
    if (activeQuest) {
      const quest = NPC_CONFIG.quests.find((q) => q.id === activeQuest);
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
      NPC_CONFIG.quests.forEach((quest) => {
        content += `<button class="quest-btn" data-quest-id="${quest.id}">${quest.title}</button>`;
      });
    }
  }

  questDialogEl.innerHTML = content;

  // Обработчики кнопок
  if (firstInteraction[myId] === undefined) {
    const continueBtn = questDialogEl.querySelector("#continueBtn");
    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        firstInteraction[myId] = true; // Отмечаем, что первое взаимодействие завершено
        updateQuestDialog(); // Переключаемся на стандартное окно заданий
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

// Получение награды
function claimQuestReward() {
  const quest = NPC_CONFIG.quests.find((q) => q.id === activeQuest);
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
}

// Экспортируем функции для использования в code.js
window.initNPC = initNPC;
window.checkNPCCollision = checkNPCCollision;
window.drawNPC = drawNPC;
