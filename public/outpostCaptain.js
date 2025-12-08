// ===============================================
//          КАПИТАН ЗАСТАВЫ — ОБНОВЛЁННАЯ ВЕРСИЯ 2025
//  Новый флаг medicalCertificateStamped + упрощённые задания
// ===============================================

const OUTPOST_CAPTAIN = {
  x: 675,
  y: 1593,
  width: 70,
  height: 70,
  interactionRadius: 70,
  name: "Капитан Райдер",
  spriteSrc: "outpost_captain.png",
  totalFrames: 13,
  frameDuration: 180,
};

let isCaptainMet = false;
let isCaptainDialogOpen = false;
let hasCaptainGreetingShown = false;

let captainButtonsContainer = null;
let captainSprite = null;

let captainFrame = 0;
let captainFrameTime = 0;

const captainTopics = [
  {
    title: "О заставах",
    text: "Мы — последняя линия обороны между Неоновым Городом и Пустошами. Когда-то корпорации держали периметр, но после Отключения всё рухнуло. Теперь мы, выжившие солдаты, держим заставы на своих плечах. Патрулируем, отстреливаем мутантов, помогаем караванам. Каждый день — это война. Но пока мы стоим — город живёт.",
  },
  {
    title: "Пустоши",
    text: "За стенами — ад. Песчаные бури, радиация, мутанты размером с грузовик. Вода там — на вес золота, а баляры не котируются. Люди там либо становятся рейдерами, либо сжираются в пустыне. Говорят, раньше были целые города... теперь только кости и ржавчина.",
  },
  {
    title: "Корпорации",
    text: "Эти ублюдки в башнях думают, что могут купить всё. Даже нас. Предлагали контракт — охранять их грузы за баляры. Отказались. Потому что знаем: сегодня ты охраняешь их склад, а завтра они сбрасывают бомбу на твою заставу.",
  },
  {
    title: "Твой путь",
    text: "Вижу в тебе что-то... не как у других крыс из подвалов. Глаза горят. Слушай сюда, новичок: в этом мире выживает не сильнейший, а тот, кто не сдаётся. Докажи, что достоин войти в Неоновый Город.",
  },
];

// ===============================================
// ИНИЦИАЛИЗАЦИЯ
// ===============================================
function initializeCaptain() {
  captainSprite = new Image();
  captainSprite.src = OUTPOST_CAPTAIN.spriteSrc;
}

// ===============================================
// АНИМАЦИЯ
// ===============================================
function updateCaptain(deltaTime) {
  captainFrameTime += deltaTime;
  while (captainFrameTime >= OUTPOST_CAPTAIN.frameDuration) {
    captainFrameTime -= OUTPOST_CAPTAIN.frameDuration;
    captainFrame = (captainFrame + 1) % OUTPOST_CAPTAIN.totalFrames;
  }
}

// ===============================================
// ОТРИСОВКА + ЛОГИКА ВЗАИМОДЕЙСТВИЯ
// ===============================================
function drawCaptain(ctx, cameraX, cameraY) {
  if (window.worldSystem.currentWorldId !== 0) return;

  const screenX = OUTPOST_CAPTAIN.x - cameraX;
  const screenY = OUTPOST_CAPTAIN.y - cameraY - OUTPOST_CAPTAIN.height + 30;

  if (
    screenX < -150 ||
    screenX > canvas.width + 150 ||
    screenY < -150 ||
    screenY > canvas.height + 150
  ) {
    removeCaptainButtons();
    closeCaptainDialog();
    return;
  }

  if (captainSprite?.complete && captainSprite.naturalWidth > 0) {
    ctx.drawImage(
      captainSprite,
      captainFrame * 70,
      0,
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
    ctx.font = "12px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("CAPT", screenX + 35, screenY + 40);
  }

  ctx.font = "16px 'Courier New'";
  ctx.fillStyle = "#00ffff";
  ctx.textAlign = "center";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.strokeText(
    isCaptainMet ? OUTPOST_CAPTAIN.name : "?",
    screenX + 35,
    screenY - 10
  );
  ctx.fillText(
    isCaptainMet ? OUTPOST_CAPTAIN.name : "?",
    screenX + 35,
    screenY - 10
  );

  const me = players.get(myId);
  if (!me) return;

  const dist = Math.hypot(me.x - OUTPOST_CAPTAIN.x, me.y - OUTPOST_CAPTAIN.y);

  if (dist < OUTPOST_CAPTAIN.interactionRadius) {
    if (!isCaptainMet && !hasCaptainGreetingShown) {
      showCaptainGreeting();
    } else if (isCaptainMet) {
      createCaptainButtons(screenX, screenY);
    }
  } else {
    removeCaptainButtons();
    closeCaptainDialog();
  }
}

// ===============================================
// ПРИВЕТСТВИЕ
// ===============================================
function showCaptainGreeting() {
  if (isCaptainDialogOpen || hasCaptainGreetingShown) return;

  isCaptainDialogOpen = true;
  hasCaptainGreetingShown = true;

  const dialog = document.createElement("div");
  dialog.className = "npc-dialog";
  dialog.id = "captainDialog";
  document.getElementById("gameContainer").appendChild(dialog);

  dialog.innerHTML = `
    <div class="npc-dialog-header">
      <div style="width:80px;height:80px;background:#222;border:2px solid #ff00ff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ff00ff;font-size:36px;font-weight:bold;">C</div>
      <h2 class="npc-title">Капитан Райдер</h2>
    </div>
    <div class="npc-dialog-content">
      <p class="npc-text fullscreen">
        Назовись, сталкер.<br><br>
        Я — Райдер, капитан заставы «Северный Периметр».<br>
        Держим рубеж от мутантов и рейдеров.<br><br>
        Хочешь попасть в Неоновый Город — принеси медсправку МД-07.<br>
        Поставлю печать. Без неё — ни шагу за стену.
      </p>
    </div>
    <button class="neon-btn" id="captainGreetingOk">Понял</button>
  `;

  dialog.querySelector("#captainGreetingOk").onclick = () => {
    dialog.remove();
    isCaptainDialogOpen = false;
    isCaptainMet = true;
    sendWhenReady(
      ws,
      JSON.stringify({ type: "meetCaptain", captainMet: true })
    );
  };
}

// ===============================================
// КНОПКИ НАД ГОЛОВОЙ
// ===============================================
function createCaptainButtons(screenX, screenY) {
  if (captainButtonsContainer) return;

  captainButtonsContainer = document.createElement("div");
  captainButtonsContainer.className = "npc-buttons-container";
  captainButtonsContainer.style.left = screenX + 35 + "px";
  captainButtonsContainer.style.top = screenY - 100 + "px";
  captainButtonsContainer.style.transform = "translateX(-50%)";

  const talkBtn = document.createElement("div");
  talkBtn.className = "npc-button npc-talk-btn";
  talkBtn.textContent = "Говорить";
  talkBtn.onclick = openCaptainTalk;

  const questsBtn = document.createElement("div");
  questsBtn.className = "npc-button npc-quests-btn";
  questsBtn.textContent = "Задания";
  questsBtn.onclick = openCaptainQuests;

  captainButtonsContainer.append(talkBtn, questsBtn);
  document.body.appendChild(captainButtonsContainer);
}

function removeCaptainButtons() {
  if (captainButtonsContainer) {
    captainButtonsContainer.remove();
    captainButtonsContainer = null;
  }
}

function closeCaptainDialog() {
  const dialog = document.getElementById("captainDialog");
  if (dialog) dialog.remove();
  isCaptainDialogOpen = false;
}

// ===============================================
// ДИАЛОГ "ГОВОРИТЬ" (без изменений)
// ===============================================
function openCaptainTalk() {
  removeCaptainButtons();
  isCaptainDialogOpen = true;

  const dialog = document.createElement("div");
  dialog.className = "npc-dialog";
  dialog.id = "captainDialog";
  document.getElementById("gameContainer").appendChild(dialog);

  dialog.innerHTML = `
    <div class="npc-dialog-header">
      <div style="width:80px;height:80px;background:#222;border:2px solid #ff00ff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ff00ff;font-size:36px;font-weight:bold;">C</div>
      <h2 class="npc-title">Капитан Райдер</h2>
    </div>
    <div class="npc-dialog-content">
      <p class="npc-text">О чём поговорим, сталкер?</p>
      <div id="captainTopics" class="talk-topics"></div>
    </div>
    <button class="neon-btn" id="closeBtn">Закрыть</button>
  `;

  const container = dialog.querySelector("#captainTopics");
  captainTopics.forEach((topic) => {
    const el = document.createElement("div");
    el.className = "talk-topic";
    el.innerHTML = `<strong>${topic.title}</strong>`;
    el.onclick = () => {
      const textEl = dialog.querySelector(".npc-text");
      textEl.innerHTML = topic.text;
      textEl.classList.add("fullscreen");
      container.classList.add("hidden");
      const btn = dialog.querySelector("#closeBtn");
      btn.textContent = "Назад";
      btn.onclick = () => {
        textEl.classList.remove("fullscreen");
        textEl.innerHTML = "О чём поговорим, сталкер?";
        container.classList.remove("hidden");
        btn.textContent = "Закрыть";
        btn.onclick = () => closeCaptainDialog();
      };
    };
    container.appendChild(el);
  });

  dialog.querySelector("#closeBtn").onclick = closeCaptainDialog;
}

// ===============================================
// ДИАЛОГ "ЗАДАНИЯ" — НОВАЯ ЛОГИКА
// ===============================================
function openCaptainQuests() {
  removeCaptainButtons();
  isCaptainDialogOpen = true;

  const me = players.get(myId);
  const hasStampedCertificate = me?.medicalCertificateStamped === true;

  const dialog = document.createElement("div");
  dialog.className = "npc-dialog";
  dialog.id = "captainDialog";
  document.getElementById("gameContainer").appendChild(dialog);

  if (hasStampedCertificate) {
    // Печать уже получена
    dialog.innerHTML = `
      <div class="npc-dialog-header">
        <div style="width:80px;height:80px;background:#222;border:2px solid #00ff00;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#00ff00;font-size:32px;font-weight:bold;">✓</div>
        <h2 class="npc-title">Капитан Райдер</h2>
      </div>
      <div class="npc-dialog-content">
        <p class="npc-text fullscreen" style="line-height:1.8;">
          Печать на справке стоит.<br><br>
          Ты прошёл проверку. Допуск в Неоновый Город у тебя есть.<br><br>
          Пока новых заданий нет.<br>
          Приходи позже — возможно, что-то подвернётся.
        </p>
      </div>
      <button class="neon-btn" id="closeBtn">Закрыть</button>
    `;
  } else {
    // Печати нет
    dialog.innerHTML = `
      <div class="npc-dialog-header">
        <div style="width:80px;height:80px;background:#222;border:2px solid #ff0066;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ff0066;font-size:36px;font-weight:bold;">✗</div>
        <h2 class="npc-title">Капитан Райдер</h2>
      </div>
      <div class="npc-dialog-content">
        <p class="npc-text fullscreen" style="line-height:1.8;color:#ff8888;">
          Без медицинской справки с печатью заставы<br>
          в Неоновый Город не пустят.<br><br>
          Принеси справку МД-07 — поставлю печать.<br><br>
          Пока заданий нет.
        </p>
      </div>
      <button class="neon-btn" id="closeBtn">Закрыть</button>
    `;
  }

  dialog.querySelector("#closeBtn").onclick = closeCaptainDialog;
}

// ===============================================
// ЭКСПОРТ
// ===============================================
window.outpostCaptainSystem = {
  initialize: initializeCaptain,
  update: updateCaptain,
  drawCaptain,
  setCaptainMet: (met) => {
    isCaptainMet = met;
    if (!met) hasCaptainGreetingShown = false;
  },
  isCaptainDialogOpen: () => isCaptainDialogOpen,
};
