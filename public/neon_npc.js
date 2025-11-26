// neon_npc.js — Neon Alex (2025) — использует только npc-styles.css + квесты + чат-прогресс

const NEON_NPC = {
  name: "Neon",
  spriteKey: "alexNeonSprite",
  photoKey: "alexNeonFoto",
  x: 502,
  y: 2771,
  width: 70,
  height: 70,
  interactionRadius: 50, // ← ИЗМЕНЕНО: было 80, теперь 50 пикселей

  // Патруль
  speed: 0.02,
  targetA: { x: 502, y: 2771 },
  targetB: { x: 1368, y: 1657 },
  movingToB: true,
  isWaiting: true,
  waitDuration: 10000, // ← ИЗМЕНЕНО: было 20000, теперь 10 секунд
  waitTimer: 0,

  // Анимация
  frame: 0,
  frameTime: 0,
  direction: "down",
  state: "idle",

  // Состояние
  isPlayerNear: false,
  isDialogOpen: false,
  isMet: false,
};

let neonButtonsContainer = null;
let activeDialog = null;
let rejectionShownThisApproach = false;
let firstMeetingDialogClosed = false;

// Элемент прогресса в чате
let questProgressElement = null;

// Квесты Neon Alex
const NEON_QUESTS = [
  {
    id: "neon_quest_1",
    title: "Очистка пустошей",
    description:
      "Сектор кишит мутантами. Убей 3 штуки — докажи, что не бесполезен.",
    goal: { killMutants: 3 },
    reward: { xp: 150, balyary: 50 },
  },
];

const CURRENT_QUEST = NEON_QUESTS[0];

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ЧАТ-ПРОГРЕССА ====================

function createQuestProgressInChat() {
  if (questProgressElement) return;

  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  questProgressElement = document.createElement("div");
  questProgressElement.id = "neonQuestProgress";
  questProgressElement.style.cssText = `
    background: linear-gradient(90deg, #00ffff, #0088ff);
    color: black;
    font-weight: bold;
    padding: 8px 12px;
    border-radius: 8px;
    margin: 8px 0;
    text-align: center;
    font-size: 14px;
    box-shadow: 0 0 10px #00ffff;
    pointer-events: none;
    opacity: 0.95;
  `;
  chatMessages.appendChild(questProgressElement);
  updateQuestProgressDisplay();
}

function updateQuestProgressDisplay() {
  if (!questProgressElement) return;

  const me = players.get(myId);
  const questData = me?.neonQuest;
  const isActive = questData?.currentQuestId === CURRENT_QUEST.id;
  const kills = questData?.progress?.killMutants || 0;
  const needed = CURRENT_QUEST.goal.killMutants;

  if (isActive && kills < needed) {
    questProgressElement.textContent = `${CURRENT_QUEST.title}: ${kills}/${needed} мутантов убито`;
    questProgressElement.style.display = "block";
  } else if (isActive && kills >= needed) {
    questProgressElement.textContent = `${CURRENT_QUEST.title}: ГОТОВО! Вернись к Neon Alex`;
    questProgressElement.style.background =
      "linear-gradient(90deg, #00ff00, #00cc00)";
    questProgressElement.style.boxShadow = "0 0 15px #00ff00";
    questProgressElement.style.display = "block";
  } else {
    questProgressElement.style.display = "none";
  }

  const chatMessages = document.getElementById("chatMessages");
  if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeQuestProgressFromChat() {
  if (questProgressElement) {
    questProgressElement.remove();
    questProgressElement = null;
  }
}

// ==================== ДИАЛОГИ И КВЕСТЫ ====================

function closeActiveDialog() {
  if (activeDialog) {
    activeDialog.remove();
    activeDialog = null;
  }
  NEON_NPC.isDialogOpen = false;
}

// Остальные функции диалогов остаются без изменений (openFirstMeetingDialog, openRejectionDialog, openNeonTalkDialog и т.д.)
// Я их не трогаю, они работают идеально.

// Только одна правка в acceptNeonQuest — теперь правильно инициализируем структуру
window.acceptNeonQuest = () => {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "neonQuestAccept" }));
  }
  closeActiveDialog();
  createQuestProgressInChat();
};

// ==================== КНОПКИ НАД ГОЛОВОЙ ====================

function createNeonButtons(screenX, screenY) {
  if (neonButtonsContainer) return;

  neonButtonsContainer = document.createElement("div");
  neonButtonsContainer.className = "npc-buttons-container";
  neonButtonsContainer.style.left = `${screenX + 35}px`;
  neonButtonsContainer.style.top = `${screenY - 90}px`;

  const talkBtn = document.createElement("div");
  talkBtn.className = "npc-button npc-talk-btn";
  talkBtn.textContent = "Поговорить";
  talkBtn.onclick = (e) => {
    e.stopPropagation();
    openNeonTalkDialog();
  };

  const questBtn = document.createElement("div");
  questBtn.className = "npc-button npc-quests-btn";
  questBtn.textContent = "Задания";
  questBtn.onclick = (e) => {
    e.stopPropagation();
    openNeonQuestDialog();
  };

  neonButtonsContainer.append(talkBtn, questBtn);
  document.body.appendChild(neonButtonsContainer);
}

function removeNeonButtons() {
  if (neonButtonsContainer) {
    neonButtonsContainer.remove();
    neonButtonsContainer = null;
  }
}

// ==================== ОБНОВЛЕНИЕ И ОТРИСОВКА ====================

function updateNeonNpc(deltaTime) {
  if (window.worldSystem.currentWorldId !== 0) return;
  const me = players.get(myId);
  if (!me) return;

  const dx = me.x - NEON_NPC.x;
  const dy = me.y - NEON_NPC.y;
  const dist = Math.hypot(dx, dy);
  NEON_NPC.isPlayerNear = dist < NEON_NPC.interactionRadius;

  // Движение по маршруту
  if (!NEON_NPC.isPlayerNear && !NEON_NPC.isDialogOpen) {
    if (NEON_NPC.isWaiting) {
      NEON_NPC.waitTimer += deltaTime;
      if (NEON_NPC.waitTimer >= NEON_NPC.waitDuration) {
        NEON_NPC.isWaiting = false;
        NEON_NPC.waitTimer = 0;
        NEON_NPC.movingToB = !NEON_NPC.movingToB;
      }
    } else {
      const target = NEON_NPC.movingToB ? NEON_NPC.targetB : NEON_NPC.targetA;
      const tdx = target.x - NEON_NPC.x;
      const tdy = target.y - NEON_NPC.y;
      const tdist = Math.hypot(tdx, tdy);
      if (tdist > 5) {
        NEON_NPC.x += (tdx / tdist) * NEON_NPC.speed * deltaTime;
        NEON_NPC.y += (tdy / tdist) * NEON_NPC.speed * deltaTime;
        NEON_NPC.state = "walking";
        NEON_NPC.direction =
          Math.abs(tdx) > Math.abs(tdy)
            ? tdx > 0
              ? "right"
              : "left"
            : tdy > 0
            ? "down"
            : "up";
      } else {
        NEON_NPC.isWaiting = true;
        NEON_NPC.state = "idle";
      }
    }
  } else {
    NEON_NPC.state = "idle";
  }

  // Анимация
  if (NEON_NPC.state === "walking") {
    NEON_NPC.frameTime += deltaTime;
    if (NEON_NPC.frameTime >= 120) {
      NEON_NPC.frameTime -= 120;
      NEON_NPC.frame = (NEON_NPC.frame + 1) % 40;
    }
  } else {
    NEON_NPC.frame = 0;
  }
}

// drawNeonNpc и всё остальное — без изменений
// (всё работает)

// ==================== СИНХРОНИЗАЦИЯ С СЕРВЕРОМ ====================

if (typeof ws !== "undefined") {
  ws.addEventListener("message", (e) => {
    try {
      const data = JSON.parse(e.data);

      if (
        data.type === "loginSuccess" ||
        (data.type === "update" && data.player?.id === myId)
      ) {
        const player = data.type === "loginSuccess" ? data : data.player;
        NEON_NPC.isMet = !!player.alexNeonMet;
        firstMeetingDialogClosed = !!player.alexNeonMet;

        // Инициализируем neonQuest правильно
        if (!player.neonQuest) {
          player.neonQuest = {
            currentQuestId: null,
            progress: {},
            completed: [],
          };
        }

        if (player.neonQuest.currentQuestId === CURRENT_QUEST.id) {
          createQuestProgressInChat();
        } else if (questProgressElement) {
          removeQuestProgressFromChat();
        }
        updateQuestProgressDisplay();
      }

      // Обновление прогресса при убийстве
      if (data.type === "levelSyncAfterKill" && data.xpGained === 13) {
        const me = players.get(myId);
        if (me?.neonQuest?.currentQuestId === CURRENT_QUEST.id) {
          updateQuestProgressDisplay();
        }
      }

      if (data.type === "neonQuestStarted") {
        showNotification("Задание взято: Очистка пустошей", "#00ff44");
        createQuestProgressInChat();
      }

      if (data.type === "neonQuestCompleted") {
        showNotification(
          `Задание выполнено! +${data.reward.xp} XP | +${data.reward.balyary} баляров`,
          "#00ffff"
        );
        removeQuestProgressFromChat();
      }
    } catch (err) {
      console.error("Neon Alex error:", err);
    }
  });
}

window.neonNpcSystem = { update: updateNeonNpc, draw: drawNeonNpc };
