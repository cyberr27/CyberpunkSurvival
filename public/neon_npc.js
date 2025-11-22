// neon_npc.js — NPC Neon Alex (аналогично John NPC)

const NEON_NPC = {
  name: "Neon Alex",
  spriteKey: "alexNeonSprite",
  photoKey: "alexNeonFoto",
  x: 502,
  y: 2771,
  width: 70,
  height: 70,
  interactionRadius: 80,
  isMet: false,
  isDialogOpen: false,
  isPlayerNear: false,
  showButtons: false,
};

// Квесты Neon Alex
const NEON_QUESTS = [
  {
    id: 1,
    title: "Очистка улиц",
    description: "Убей 3 мутантов в любом мире. Они угрожают выжившим.",
    target: { type: "mutant", count: 3 },
    reward: { type: "balyary", amount: 10 },
    progress: 0,
    completed: false,
  },
  // Вторую миссию добавишь потом сюда же
];

// Текущий активный квест (индекс в массиве)
let currentNeonQuestIndex = 0;

let neonButtonsContainer = null;

function createNeonNpcButtons(screenX, screenY) {
  if (neonButtonsContainer) return;

  neonButtonsContainer = document.createElement("div");
  neonButtonsContainer.className = "jack-buttons-container";
  neonButtonsContainer.style.pointerEvents = "none";

  const totalHeight = 45 * 2 + 16;
  neonButtonsContainer.style.left = screenX + 35 + "px";
  neonButtonsContainer.style.top = screenY - totalHeight - 30 + "px";
  neonButtonsContainer.style.transform = "translateX(-50%)";

  const talkBtn = document.createElement("div");
  talkBtn.className = "jack-button-talk";
  talkBtn.textContent = "Говорить";
  talkBtn.style.pointerEvents = "auto";
  talkBtn.onclick = (e) => {
    e.stopPropagation();
    openNeonTalkDialog();
  };

  const questBtn = document.createElement("div");
  questBtn.className = "jack-button-shop";
  questBtn.textContent = "Задания";
  questBtn.style.pointerEvents = "auto";
  questBtn.onclick = (e) => {
    e.stopPropagation();
    openNeonQuestDialog();
  };

  neonButtonsContainer.append(talkBtn, questBtn);
  document.body.appendChild(neonButtonsContainer);
}

function removeNeonNpcButtons() {
  if (neonButtonsContainer && neonButtonsContainer.parentNode) {
    neonButtonsContainer.parentNode.removeChild(neonButtonsContainer);
    neonButtonsContainer = null;
  }
}

// Диалог "Говорить" — как у Джона
function openNeonTalkDialog() {
  if (document.getElementById("neonDialog")) return;

  const dialog = document.createElement("div");
  dialog.id = "neonDialog";
  dialog.className = "jack-dialog";
  dialog.innerHTML = `
    <div class="jack-photo">
      <img src="${images.alexNeonFoto.src}" alt="Neon Alex">
    </div>
    <div class="jack-text">
      <p>Привет, сталкер. Я Neon Alex. Следи за неоном — он светит, но может и ослепить.</p>
      <p>Город полон опасностей... но и возможностей тоже. Готов к делу?</p>
    </div>
    <button class="jack-close-btn" id="closeNeonClose">Закрыть</button>
  `;
  document.body.appendChild(dialog);

  document.getElementById("closeNeonClose").onclick = () => {
    dialog.remove();
  };
}

// Диалог "Задания" — с квестами
function openNeonQuestDialog() {
  if (document.getElementById("neonDialog")) return;

  const quest = NEON_QUESTS[currentNeonQuestIndex];

  const dialog = document.createElement("div");
  dialog.id = "neonDialog";
  dialog.className = "jack-dialog";

  let content = "";

  if (!quest.completed && quest.progress < quest.target.count) {
    // Квест активен, но не выполнен
    content = `
      <div class="jack-photo">
        <img src="${images.alexNeonFoto.src}" alt="Neon Alex">
      </div>
      <div class="jack-text">
        <p><strong>${quest.title}</strong></p>
        <p>${quest.description}</p>
        <p>Прогресс: ${quest.progress}/${quest.target.count} мутантов</p>
        <p><em>Награда: ${quest.reward.amount} баляров</em></p>
      </div>
    `;
  } else if (quest.completed) {
    // Квест выполнен — показываем следующее или "нет заданий"
    if (currentNeonQuestIndex < NEON_QUESTS.length - 1) {
      currentNeonQuestIndex++;
      NEON_QUESTS[currentNeonQuestIndex].progress = 0;
      quest.completed = true;
      // Сохраняем прогресс
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "neonQuestUpdate",
            questId: currentNeonQuestIndex,
            progress: 0,
            completed: false,
          })
        );
      }
      content = `
        <div class="jack-photo">
          <img src="${images.alexNeonFoto.src}" alt="Neon Alex">
        </div>
        <div class="jack-text">
          <p>Отличная работа! Вот твои баляры.</p>
          <p>Есть новое задание, когда будешь готов — возвращайся.</p>
        </div>
      `;
    } else {
      content = `
        <div class="jack-photo">
          <img src="${images.alexNeonFoto.src}" alt="Neon Alex">
        </div>
        <div class="jack-text">
          <p>Пока новых заданий нет. Возвращайся позже.</p>
        </div>
      `;
    }
  } else {
    // Первый раз — предлагаем взять квест
    content = `
      <div class="jack-photo">
        <img src="${images.alexNeonFoto.src}" alt="Neon Alex">
      </div>
      <div class="jack-text">
        <p><strong>${quest.title}</strong></p>
        <p>${quest.description}</p>
        <p><em>Награда: ${quest.reward.amount} баляров</em></p>
        <button id="acceptNeonQuest" class="jack-accept-btn">Взять задание</button>
      </div>
    `;
  }

  dialog.innerHTML =
    content +
    '<button class="jack-close-btn" id="closeNeonQuest">Закрыть</button>';
  document.body.appendChild(dialog);

  // Кнопка принятия квеста
  const acceptBtn = document.getElementById("acceptNeonQuest");
  if (acceptBtn) {
    acceptBtn.onclick = () => {
      // Просто закрываем — прогресс начнётся при убийстве мутантов
      dialog.remove();
    };
  }

  document.getElementById("closeNeonQuest").onclick = () => dialog.remove();
}

// Обновление прогресса убийства мутантов
function handleMutantKill() {
  const quest = NEON_QUESTS[currentNeonQuestIndex];
  if (quest.completed || quest.progress >= quest.target.count) return;

  quest.progress++;

  // Сохраняем на сервер
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "neonQuestUpdate",
        questId: currentNeonQuestIndex,
        progress: quest.progress,
        completed: false,
      })
    );
  }

  // Если выполнен — начисляем награду
  if (quest.progress >= quest.target.count) {
    quest.completed = true;
    addBalyaryToPlayer(quest.reward.amount);

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "neonQuestUpdate",
          questId: currentNeonQuestIndex,
          progress: quest.progress,
          completed: true,
        })
      );
    }
  }
}

function addBalyaryToPlayer(amount) {
  const me = players.get(myId);
  if (!me) return;

  let slot = me.inventory.findIndex((i) => i?.type === "balyary");
  if (slot === -1) {
    slot = me.inventory.findIndex((i) => i === null);
    if (slot !== -1) {
      me.inventory[slot] = { type: "balyary", quantity: amount };
    }
  } else {
    me.inventory[slot].quantity = (me.inventory[slot].quantity || 0) + amount;
  }

  // Отправляем на сервер (опционально — сервер может и сам начислить)
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "addBalyary",
        amount,
      })
    );
  }
  updateInventoryDisplay();
}

// Основной апдейт
function updateNeonNpc(deltaTime) {
  if (window.worldSystem.currentWorldId !== 0) return;
  const me = players.get(myId);
  if (!me) return;

  const dx = me.x - NEON_NPC.x;
  const dy = me.y - NEON_NPC.y;
  const dist = Math.hypot(dx, dy);
  const near = dist < NEON_NPC.interactionRadius;

  if (near && !NEON_NPC.isPlayerNear) {
    NEON_NPC.isPlayerNear = true;
    if (!NEON_NPC.isMet && (me.level || 0) >= 1) {
      NEON_NPC.isMet = true;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "meetNeonAlex" }));
      }
    }
  } else if (!near && NEON_NPC.isPlayerNear) {
    NEON_NPC.isPlayerNear = false;
    removeNeonNpcButtons();
  }
}

function drawNeonNpc() {
  if (window.worldSystem.currentWorldId !== 0) return;

  const cam = window.movementSystem.getCamera();
  const screenX = NEON_NPC.x - cam.x;
  const screenY = NEON_NPC.y - cam.y - 20;

  // Куллинг
  if (
    screenX < -100 ||
    screenX > canvas.width + 100 ||
    screenY < -100 ||
    screenY > canvas.height + 100
  ) {
    removeNeonNpcButtons();
    return;
  }

  const sprite = images[NEON_NPC.spriteKey];
  if (sprite?.complete) {
    ctx.drawImage(sprite, 0, 0, 70, 70, screenX, screenY, 70, 70);
  } else {
    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(screenX, screenY, 70, 70);
    ctx.fillStyle = "#000";
    ctx.font = "30px Arial";
    ctx.fillText("N", screenX + 20, screenY + 50);
  }

  // Имя и кнопки только после знакомства
  if (NEON_NPC.isMet && NEON_NPC.isPlayerNear) {
    ctx.font = "bold 16px Orbitron";
    ctx.fillStyle = "#00ffcc";
    ctx.textAlign = "center";
    ctx.fillText(NEON_NPC.name, screenX + 35, screenY - 30);

    if (!neonButtonsContainer) {
      createNeonNpcButtons(screenX, screenY);
    }
  } else {
    removeNeonNpcButtons();
  }
}

// Синхронизация с сервера
ws?.addEventListener("message", (e) => {
  try {
    const data = JSON.parse(e.data);
    if (data.type === "update" && data.player?.id === myId) {
      if (data.player.alexNeonMet !== undefined) {
        NEON_NPC.isMet = data.player.alexNeonMet;
      }
      if (data.player.neonQuestProgress !== undefined) {
        NEON_QUESTS[0].progress = data.player.neonQuestProgress || 0;
      }
      if (data.player.neonQuestCompleted !== undefined) {
        NEON_QUESTS[0].completed = data.player.neonQuestCompleted || false;
        if (NEON_QUESTS[0].completed) currentNeonQuestIndex = 1;
      }
    }
  } catch (err) {}
});

// Перехват убийства мутантов
const originalHandleEnemyKill = window.levelSystem?.handleEnemyKill;
if (originalHandleEnemyKill) {
  window.levelSystem.handleEnemyKill = function (data) {
    originalHandleEnemyKill.call(this, data);
    if (data?.type === "mutant") {
      handleMutantKill();
    }
  };
}

// Система
window.neonNpcSystem = {
  update: updateNeonNpc,
  draw: drawNeonNpc,
};
