// neon_npc.js — КИБЕР-ВЕРСИЯ + 9 тем + НЕОНОВАЯ ПРОКРУТКА + КВЕСТЫ

const NEON_NPC = {
  name: "Neon Alex",
  spriteKey: "alexNeonSprite",
  photoKey: "alexNeonFoto",
  x: 502,
  y: 2771,
  width: 70,
  height: 70,
  interactionRadius: 80,
  speed: 0.02,
  targetA: { x: 502, y: 2771 },
  targetB: { x: 1368, y: 1657 },
  movingToB: true,
  isWaiting: true,
  waitDuration: 20000,
  waitTimer: 0,
  frame: 0,
  frameTime: 0,
  direction: "down",
  state: "idle",
  isPlayerNear: false,
  isDialogOpen: false,
  isMet: false,
};

// === ДАННЫЕ КВЕСТОВ (теперь локально, чтобы не было ReferenceError) ===
const NEON_QUESTS = [
  {
    id: "neon_quest_1",
    title: "Очистка пустошей",
    description: "Убей 3 мутанта в секторе 7. Они мешают моим датчикам.",
    goal: { killMutants: 3 },
    reward: { xp: 80, balyary: 10 },
  },
];

let neonButtonsContainer = null;
let activeDialog = null;
let rejectionShownThisApproach = false;

const NEON_TOPICS = [
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
    text: "Заброшенный сектор 7. Корпорации бросили его лет 15 назад. Теперь здесь только мы и мутанты.",
  },
  {
    title: "Что с корпорациями?",
    text: "Они всё ещё наверху, в небоскрёбах. Сюда спускаются только за редкими ресурсами… или за нами.",
  },
  {
    title: "Как выживать?",
    text: "Не доверяй никому. Держи нож за спиной, а глаза открытыми. И никогда не пей воду из открытых источников.",
  },
  {
    title: "Есть ли выход?",
    text: "Говорят, в старом метро есть туннель на поверхность. Но туда никто не возвращался.",
  },
  {
    title: "Твоя история",
    text: "Я украл у них данные, которые стоили миллиарды. Теперь я в розыске. А ты… ты тоже беглец?",
  },
  {
    title: "О мутантах",
    text: "Радиация, эксперименты, химия… всё вместе. Некоторые ещё помнят, что были людьми.",
  },
  {
    title: "Зачем ты здесь?",
    text: "Жду человека, который сможет вытащить меня отсюда. Может, это ты?",
  },
];

function initializeCyberStyles() {
  if (document.getElementById("cyberNeonStyles")) return;
  const style = document.createElement("style");
  style.id = "cyberNeonStyles";
  style.innerHTML = `
    .cyber-dialog{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      width:480px;max-width:94vw;background:linear-gradient(135deg,rgba(10,10,20,0.97),rgba(20,20,40,0.93));
      border:2px solid #00ffff;border-radius:12px;padding:20px;color:#ccffff;font-family:'Courier New',monospace;
      z-index:10000;box-shadow:0 0 30px rgba(0,255,255,0.7),inset 0 0 20px rgba(0,255,255,0.1);
      animation:neonPulse 3s infinite alternate;}

    .cyber-dialog .npc-photo{width:120px;height:120px;border:3px solid #00ffff;border-radius:50%;
      box-shadow:0 0 25px #00ffff;margin:0 auto 15px;display:block;object-fit:cover;}
    .cyber-dialog .npc-name{text-align:center;font-size:28px;margin:10px 0;color:#00ffff;
      text-shadow:0 0 15px #00ffff;letter-spacing:2px;}
    .cyber-dialog .npc-text{background:rgba(0,30,60,0.7);padding:18px;border-radius:10px;margin:15px 0;
      line-height:1.7;border:1px solid #00ffff;color:#ccffff;font-size:17px;
      text-shadow:0 0 8px rgba(0,255,255,0.6);min-height:80px;}

    .cyber-dialog .topic-container{
      max-height:320px;overflow-y:auto;margin:15px 0;padding-right:10px;
      border:1px solid rgba(0,255,255,0.3);border-radius:8px;background:rgba(0,20,40,0.4);
    }
    .cyber-dialog .topic-btn{display:block;width:100%;margin:8px 12px;padding:14px;
      background:rgba(0,255,255,0.08);border:1px solid #00ffff;color:#00ffff;
      border-radius:8px;cursor:pointer;transition:all .3s;text-align:left;font-size:16px;
      box-shadow:0 0 10px rgba(0,255,255,0.2);}
    .cyber-dialog .topic-btn:hover{
      background:rgba(0,255,255,0.25);transform:translateX(8px);
      box-shadow:0 0 20px #00ffff, inset 0 0 15px rgba(0,255,255,0.3);
    }
    .topic-container::-webkit-scrollbar{width:12px;}
    .topic-container::-webkit-scrollbar-track{
      background:rgba(0,20,40,0.6);border-radius:10px;
      box-shadow:inset 0 0 10px rgba(0,255,255,0.2);
    }
    .topic-container::-webkit-scrollbar-thumb{
      background:linear-gradient(0deg,#00ffff,#ff00ff);
      border-radius:10px;border:2px solid rgba(0,0,0,0.5);
      box-shadow:0 0 15px #00ffff;
    }
    .cyber-close-btn{
      background:rgba(0,255,255,0.15);border:1px solid #00ffff;color:#00ffff;
      padding:12px 24px;border-radius:8px;cursor:pointer;font-size:16px;
      box-shadow:0 0 15px rgba(0,255,255,0.4);transition:all .3s;
    }
    .cyber-close-btn:hover{
      background:rgba(0,255,255,0.4);box-shadow:0 0 25px #00ffff;
    }
    .btn-container{text-align:center;margin-top:20px;}
  `;
  document.head.appendChild(style);
}

function closeActiveDialog() {
  if (activeDialog) {
    activeDialog.remove();
    activeDialog = null;
  }
  NEON_NPC.isDialogOpen = false;
}

// === ОКНО ЗАДАНИЙ ===
function openNeonQuestDialog() {
  closeActiveDialog();
  initializeCyberStyles();

  const player = players.get(myId);
  const neonQuest = player?.neonQuest || {};
  const currentQuestId = neonQuest.currentQuestId;
  const completed = neonQuest.completed || [];
  const progress = neonQuest.progress || {};

  const quest = NEON_QUESTS.find((q) => q.id === "neon_quest_1");

  let title = "Новый заказ";
  let description = `<b>${quest.title}</b><br>${quest.description}<br><br>Награда: 80 XP + 10 баляров`;
  let progressText = "";
  let mainButtonText = "Взять заказ";
  let mainButtonAction = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({ type: "neonQuestAccept", questId: "neon_quest_1" })
      );
    }
    closeActiveDialog();
  };

  if (currentQuestId === "neon_quest_1") {
    const killed = progress.killMutants || 0;
    const needed = quest.goal.killMutants;
    title = "Текущий заказ";
    description = `<b>${quest.title}</b><br>${quest.description}`;
    progressText = `<br><br><b>Прогресс: ${killed}/${needed} мутантов уничтожено</b>`;

    if (killed >= needed) {
      mainButtonText = "Сдать заказ";
      mainButtonAction = () => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "neonQuestComplete",
              questId: "neon_quest_1",
            })
          );
        }
        closeActiveDialog();
      };
    } else {
      mainButtonText = "Понял";
      mainButtonAction = closeActiveDialog;
    }
  } else if (completed.includes("neon_quest_1")) {
    title = "Заказ выполнен";
    description =
      "Отличная работа. Скоро будет новый заказ.<br>(вторая миссия — в разработке)";
    mainButtonText = "Закрыть";
    mainButtonAction = closeActiveDialog;
  }

  activeDialog = document.createElement("div");
  activeDialog.className = "cyber-dialog";
  activeDialog.innerHTML = `
    <img src="${images[NEON_NPC.photoKey].src}" class="npc-photo">
    <div class="npc-name">${NEON_NPC.name} — Заказы</div>
    <div class="npc-text" style="font-size:18px;line-height:1.8;">
      <b>${title}</b><br><br>
      ${description}${progressText}
    </div>
    <div class="btn-container">
      <button class="cyber-close-btn" id="questMainBtn">${mainButtonText}</button>
      ${
        mainButtonText !== "Закрыть"
          ? '<button class="cyber-close-btn" style="margin-top:10px;background:rgba(255,0,100,0.3);border-color:#ff0080;" onclick="(function(){if(activeDialog)activeDialog.remove();NEON_NPC.isDialogOpen=false;})()">Отмена</button>'
          : ""
      }
    </div>
  `;

  document.body.appendChild(activeDialog);
  NEON_NPC.isDialogOpen = true;

  document.getElementById("questMainBtn").onclick = mainButtonAction;
}

// Остальные функции без изменений (openNeonTalkDialog, createNeonButtons и т.д.)
function createNeonButtons(screenX, screenY) {
  if (neonButtonsContainer) return;

  neonButtonsContainer = document.createElement("div");
  neonButtonsContainer.style.position = "absolute";
  neonButtonsContainer.style.left = screenX + 10 + "px";
  neonButtonsContainer.style.top = screenY - 70 + "px";
  neonButtonsContainer.style.display = "flex";
  neonButtonsContainer.style.gap = "12px";
  neonButtonsContainer.style.zIndex = "9999";

  const talkBtn = document.createElement("div");
  talkBtn.textContent = "Поговорить";
  talkBtn.className = "cyber-btn";
  talkBtn.onclick = (e) => {
    e.stopPropagation();
    openNeonTalkDialog();
  };

  const questBtn = document.createElement("div");
  questBtn.textContent = "Задания";
  questBtn.className = "cyber-btn cyber-quest-btn";
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

function updateNeonNpc(deltaTime) {
  if (window.worldSystem.currentWorldId !== 0) return;
  const me = players.get(myId);
  if (!me) return;

  const dx = me.x - NEON_NPC.x;
  const dy = me.y - NEON_NPC.y;
  const dist = Math.hypot(dx, dy);
  const near = dist < NEON_NPC.interactionRadius;
  NEON_NPC.isPlayerNear = near;

  if (!near && !NEON_NPC.isDialogOpen) {
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

  ctx.fillStyle = "#00ffff";
  ctx.font = "bold 18px 'Orbitron', Courier New";
  ctx.textAlign = "center";
  ctx.fillText(
    NEON_NPC.isMet ? NEON_NPC.name : "?",
    screenX + 35,
    screenY - 35
  );

  const player = players.get(myId);
  const level = player?.level || 0;

  if (NEON_NPC.isPlayerNear) {
    if (level < 1) {
      if (!rejectionShownThisApproach && !NEON_NPC.isDialogOpen) {
        openRejectionDialog?.();
        rejectionShownThisApproach = true;
      }
      removeNeonButtons();
    } else {
      if (!NEON_NPC.isMet && !NEON_NPC.isDialogOpen) {
        openFirstMeetingDialog?.();
      } else if (NEON_NPC.isMet && !NEON_NPC.isDialogOpen) {
        createNeonButtons(screenX, screenY);
      }
    }
  } else {
    closeActiveDialog();
    removeNeonButtons();
    rejectionShownThisApproach = false;
  }
}

if (typeof ws !== "undefined") {
  ws.addEventListener("message", (e) => {
    try {
      const data = JSON.parse(e.data);
      if (
        data.type === "neonQuestSync" ||
        (data.type === "update" && data.player?.alexNeonMet !== undefined)
      ) {
        NEON_NPC.isMet = !!data.player?.alexNeonMet || data.isMet || false;
      }
    } catch {}
  });
}

window.neonNpcSystem = {
  update: updateNeonNpc,
  draw: drawNeonNpc,
};
