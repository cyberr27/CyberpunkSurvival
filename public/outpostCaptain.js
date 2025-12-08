// ===============================================
//          КАПИТАН ЗАСТАВЫ — ФИНАЛЬНАЯ ВЕРСИЯ 2025
//  Получение печати на медсправку МД-07
// ===============================================

const OUTPOST_CAPTAIN = {
  x: 675,
  y: 1593,
  width: 70,
  height: 70,
  interactionRadius: 70, // удобный радиус
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

  // Отсечение за экраном
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

  // Спрайт
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

  // Имя над головой
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
// ПРИВЕТСТВИЕ ПРИ ПЕРВОЙ ВСТРЕЧЕ
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

// ===============================================
// ЗАКРЫТИЕ ЛЮБОГО ДИАЛОГА КАПИТАНА
// ===================================
function closeCaptainDialog() {
  const dialog = document.getElementById("captainDialog");
  if (dialog) dialog.remove();
  isCaptainDialogOpen = false;
}

// ===============================================
// ДИАЛОГ "ГОВОРИТЬ"
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
// ДИАЛОГ "ЗАДАНИЯ" + ПЕЧАТЬ НА СПРАВКУ
// ===============================================
function openCaptainQuests() {
  removeCaptainButtons();
  isCaptainDialogOpen = true;

  const me = players.get(myId);
  const hasCertificate =
    me?.medicalCertificate &&
    me?.inventory?.some((i) => i?.type === "medical_certificate");

  const dialog = document.createElement("div");
  dialog.className = "npc-dialog";
  dialog.id = "captainDialog";
  document.getElementById("gameContainer").appendChild(dialog);

  if (hasCertificate) {
    // === ДИАЛОГ ПОЛУЧЕНИЯ ПЕЧАТИ ===
    dialog.innerHTML = `
      <div class="npc-dialog-header">
        <div style="width:80px;height:80px;background:#222;border:2px solid #00ff00;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#00ff00;font-size:32px;font-weight:bold;">ПЕЧАТЬ</div>
        <h2 class="npc-title">Получение печати</h2>
      </div>
      <div class="npc-dialog-content">
        <p class="npc-text fullscreen" style="line-height:1.7;">
          Так-так... Вижу у тебя справка МД-07.<br><br>
          Отлично. Значит, ты чистый.<br>
          Сейчас поставлю печать заставы «Северный Периметр».<br><br>
          С этого момента ты официально допущен в Неоновый Город.<br><br>
          Но помни: там свои законы. Не расслабляйся.<br><br>
          Удачи, сталкер.
        </p>
      </div>
      <div style="display:flex;gap:20px;justify-content:center;margin-top:15px;">
        <button class="neon-btn" id="getStampBtn">Получить печать</button>
        <button class="neon-btn red" id="closeStampBtn">Закрыть</button>
      </div>
    `;

    dialog.querySelector("#getStampBtn").onclick = () => {
      sendWhenReady(ws, JSON.stringify({ type: "requestCaptainStamp" }));
      // Диалог закроется автоматически после ответа сервера
    };

    dialog.querySelector("#closeStampBtn").onclick = closeCaptainDialog;
  } else {
    // === ОБЫЧНЫЙ СПИСОК ЗАДАНИЙ ===
    dialog.innerHTML = `
      <div class="npc-dialog-header">
        <div style="width:80px;height:80px;background:#222;border:2px solid #ff00ff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ff00ff;font-size:36px;font-weight:bold;">C</div>
        <h2 class="npc-title">Капитан Райдер</h2>
      </div>
      <div class="npc-dialog-content">
        <p class="npc-text">Доступные задания:</p>
        <div class="quest-list">
          <div class="quest-item">
            <span class="quest-marker">Checkmark</span>
            <div><strong>Получить медсправку МД-07</strong><br><span style="font-size:14px;color:#aaa;">Поговори с роботом-врачом в бункере</span></div>
          </div>
          <div class="quest-item disabled">
            <span class="quest-marker">Cross</span>
            <div>Дальнейшие задания — после печати</div>
          </div>
        </div>
        <p class="npc-text" style="margin-top:20px;color:#ff6666;">Без справки с печатью в город не пустят.</p>
      </div>
      <button class="neon-btn" id="closeBtn">Закрыть</button>
    `;

    dialog.querySelector("#closeBtn").onclick = closeCaptainDialog;
  }
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
