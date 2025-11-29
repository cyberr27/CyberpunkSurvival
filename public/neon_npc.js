// neon_npc.js — Neon Alex (2025) — исправлено двойное начисление убийств

const NEON_NPC = {
  name: "Neon",
  spriteKey: "alexNeonSprite",
  photoKey: "alexNeonFoto",
  x: 502,
  y: 2771,
  width: 70,
  height: 70,
  interactionRadius: 50,

  speed: 0.02,
  targetA: { x: 502, y: 2771 },
  targetB: { x: 1368, y: 1657 },
  movingToB: true,
  isWaiting: true,
  waitDuration: 10000,
  waitTimer: 0,

  frame: 0,
  frameTime: 0,
  direction: "down",
  state: "idle",

  isPlayerNear: false,
  isDialogOpen: false,
  isMet: false,
};

let neonButtonsContainer = null;
let activeDialog = null;
let rejectionShownThisApproach = false;
let firstMeetingDialogClosed = false;
let questProgressElement = null;

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

// ==================== ПРОГРЕСС В ЧАТЕ ====================

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
    questProgressElement.style.background =
      "linear-gradient(90deg, #00ffff, #0088ff)";
    questProgressElement.style.boxShadow = "0 0 10px #00ffff";
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

// ==================== ДИАЛОГИ ====================

function closeActiveDialog() {
  if (activeDialog) {
    activeDialog.remove();
    activeDialog = null;
  }
  NEON_NPC.isDialogOpen = false;
}

function openFirstMeetingDialog() {
  closeActiveDialog();
  activeDialog = document.createElement("div");
  activeDialog.className = "npc-dialog";
  activeDialog.innerHTML = `
    <div class="npc-dialog-header">
      <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
      <h2 class="npc-title">${NEON_NPC.name}</h2>
    </div>
    <div class="npc-dialog-content">
      <div class="npc-text">
        Новое лицо в секторе 7? Редкость...<br><br>
        Меня зовут Neon Alex. Если выживешь — поговорим.
      </div>
    </div>
    <button class="neon-btn" onclick="closeFirstMeetingAndEnableButtons()">Понял</button>
  `;
  document.body.appendChild(activeDialog);
  NEON_NPC.isDialogOpen = true;
}

window.closeFirstMeetingAndEnableButtons = () => {
  closeActiveDialog();
  NEON_NPC.isMet = true;
  firstMeetingDialogClosed = true;
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "meetNeonAlex" }));
  }
};

function openRejectionDialog() {
  closeActiveDialog();
  activeDialog = document.createElement("div");
  activeDialog.className = "npc-dialog";
  activeDialog.innerHTML = `
    <div class="npc-dialog-header">
      <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
      <h2 class="npc-title">${NEON_NPC.name}</h2>
    </div>
    <div class="npc-dialog-content">
      <div class="npc-text">
        Слабак... Возвращайся, когда прокачаешься хотя бы до 5 уровня.
      </div>
    </div>
    <button class="neon-btn" onclick="closeActiveDialog()">Уйти</button>
  `;
  document.body.appendChild(activeDialog);
  NEON_NPC.isDialogOpen = true;
}

function openNeonTalkDialog() {
  closeActiveDialog();
  activeDialog = document.createElement("div");
  activeDialog.className = "npc-dialog";

  const topics = [
    {
      title: "О городе",
      text: "Этот город никогда не спит. Здесь либо ты ешь, либо тебя едят.",
    },
    {
      title: "Кто ты такой?",
      text: "Я — Neon Alex. Был когда-то хакером высшего звена, теперь просто пытаюсь выжить.",
    },
    {
      title: "Где мы?",
      text: "Заброшенный сектор 7. Корпорации бросили его лет 15 назад.",
    },
    {
      title: "Что с корпорациями?",
      text: "Они всё ещё наверху, в небоскрёбах. Сюда спускаются только за редкими ресурсами… или за нами.",
    },
    {
      title: "Как выживать?",
      text: "Не доверяй никому. Держи нож за спиной, а глаза открытыми.",
    },
    {
      title: "Есть ли выход?",
      text: "Говорят, в старом метро есть туннель на поверхность. Но туда никто не возвращался.",
    },
    {
      title: "Твоя история",
      text: "Я украл у них данные, которые стоили миллиарды. Теперь я в розыске.",
    },
    { title: "О мутантах", text: "Радиация, эксперименты, химия… всё вместе." },
    {
      title: "Зачем ты здесь?",
      text: "Жду человека, который сможет вытащить меня отсюда. Может, это ты?",
    },
  ];

  let topicsHTML = topics
    .map(
      (t) =>
        `<div class="talk-topic" onclick="showTopicText('${t.title}', \`${t.text}\`)">${t.title}</div>`
    )
    .join("");

  activeDialog.innerHTML = `
    <div class="npc-dialog-header">
      <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
      <h2 class="npc-title">${NEON_NPC.name}</h2>
    </div>
    <div class="npc-dialog-content">
      <div class="talk-topics" id="neonTopicsList">${topicsHTML}</div>
      <div class="npc-text fullscreen" id="neonTopicText" style="display:none;"></div>
    </div>
    <button class="neon-btn" onclick="closeActiveDialog()">Закрыть</button>
  `;
  document.body.appendChild(activeDialog);
  NEON_NPC.isDialogOpen = true;
}

window.showTopicText = (title, text) => {
  document.getElementById("neonTopicsList").classList.add("hidden");
  const textEl = document.getElementById("neonTopicText");
  textEl.style.display = "flex";
  textEl.innerHTML = `<b>${title}</b><br><br>${text}`;
};

function openNeonQuestDialog() {
  closeActiveDialog();

  const me = players.get(myId);
  const questData = me?.neonQuest || {};
  const isActive = questData.currentQuestId === CURRENT_QUEST.id;
  const currentKills = questData.progress?.killMutants || 0;
  const isCompleted = currentKills >= CURRENT_QUEST.goal.killMutants;

  activeDialog = document.createElement("div");
  activeDialog.className = "npc-dialog";

  let buttonsHTML = "";
  if (!isActive) {
    buttonsHTML = `
      <button class="neon-btn" onclick="acceptNeonQuest()">Взять задание</button>
      <button class="neon-btn secondary" onclick="closeActiveDialog()">Отмена</button>
    `;
  } else if (isCompleted) {
    buttonsHTML = `
      <button class="neon-btn" onclick="completeNeonQuest()">Сдать задание</button>
      <button class="neon-btn secondary" onclick="closeActiveDialog()">Отмена</button>
    `;
  } else {
    buttonsHTML = `<button class="neon-btn secondary" onclick="closeActiveDialog()">Отмена</button>`;
  }

  activeDialog.innerHTML = `
    <div class="npc-dialog-header">
      <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
      <h2 class="npc-title">${NEON_NPC.name} — Задания</h2>
    </div>
    <div class="npc-dialog-content">
      <div class="npc-text quest">
        <b>${CURRENT_QUEST.title}</b><br><br>
        ${CURRENT_QUEST.description}<br><br>
        Прогресс: <b>${currentKills}/${
    CURRENT_QUEST.goal.killMutants
  }</b> мутантов убито
        ${
          isCompleted
            ? "<br><span style='color:#00ff00'>Задание выполнено!</span>"
            : ""
        }
      </div>
    </div>
    <div class="quest-buttons">${buttonsHTML}</div>
  `;

  document.body.appendChild(activeDialog);
  NEON_NPC.isDialogOpen = true;
}

window.acceptNeonQuest = () => {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "neonQuestAccept" }));
  }
  closeActiveDialog();
  createQuestProgressInChat();
};

window.completeNeonQuest = () => {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "neonQuestComplete" }));
  }
  closeActiveDialog();
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

function drawNeonNpc() {
  if (window.worldSystem.currentWorldId !== 0) return;

  const camera = window.movementSystem.getCamera();
  const screenX = NEON_NPC.x - camera.x;
  const screenY = NEON_NPC.y - camera.y - 30;

  if (
    screenX < -100 ||
    screenX > canvas.width + 100 ||
    screenY < -100 ||
    screenY > canvas.height + 100
  )
    return;

  const sprite = images[NEON_NPC.spriteKey];
  if (sprite?.complete) {
    const spriteY =
      { up: 0, down: 70, left: 210, right: 140 }[NEON_NPC.direction] || 70;
    ctx.drawImage(
      sprite,
      NEON_NPC.frame * 70,
      spriteY,
      70,
      70,
      screenX,
      screenY,
      70,
      70
    );
  } else {
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(screenX, screenY, 70, 70);
    ctx.fillStyle = "#000";
    ctx.font = "30px Arial";
    ctx.fillText("NA", screenX + 10, screenY + 50);
  }

  ctx.fillStyle = NEON_NPC.isMet ? "#00ffff" : "#ffffff";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    NEON_NPC.isMet ? NEON_NPC.name : "?",
    screenX + 35,
    screenY - 35
  );

  const player = players.get(myId);
  const level = player?.level || 0;

  if (NEON_NPC.isPlayerNear) {
    if (level < 5) {
      if (!rejectionShownThisApproach && !NEON_NPC.isDialogOpen) {
        openRejectionDialog();
        rejectionShownThisApproach = true;
      }
      removeNeonButtons();
    } else {
      if (!NEON_NPC.isMet && !NEON_NPC.isDialogOpen) {
        openFirstMeetingDialog();
        removeNeonButtons();
      } else if (NEON_NPC.isMet && !NEON_NPC.isDialogOpen) {
        createNeonButtons(screenX, screenY);
      }
      if (NEON_NPC.isDialogOpen) removeNeonButtons();
    }
  } else {
    closeActiveDialog();
    removeNeonButtons();
    rejectionShownThisApproach = false;
  }
}

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

        if (!player.neonQuest) {
          player.neonQuest = {
            currentQuestId: null,
            progress: {},
            completed: [],
          };
        }

        if (player.neonQuest.currentQuestId === CURRENT_QUEST.id) {
          createQuestProgressInChat();
          updateQuestProgressDisplay();
        } else if (questProgressElement) {
          removeQuestProgressFromChat();
        }
      }

      // Прогресс квеста обновляется только с сервера!
      if (data.type === "neonQuestProgress") {
        const me = players.get(myId);
        if (me) {
          me.neonQuest = me.neonQuest || {};
          me.neonQuest.progress = data.progress;
          updateQuestProgressDisplay();
        }
      }

      if (data.type === "neonQuestStarted") {
        showNotification("Задание взято: Очистка пустошей", "#00ff44");
        createQuestProgressInChat();
        updateQuestProgressDisplay();
      }

      if (data.type === "neonQuestCompleted") {
        showNotification(
          `Задание выполнено! +${data.reward.xp} XP | +${data.reward.balyary} баляров`,
          "#00ffff"
        );
        removeQuestProgressFromChat();
        if (window.levelSystem) {
          window.levelSystem.setLevelData(
            data.level,
            data.xp,
            data.xpToNextLevel,
            data.upgradePoints
          );
          window.levelSystem.showXPEffect(data.reward.xp);
        }
        updateInventoryDisplay();
      }
    } catch (err) {
      console.error("Neon Alex error:", err);
    }
  });
}

window.neonNpcSystem = { update: updateNeonNpc, draw: drawNeonNpc };
