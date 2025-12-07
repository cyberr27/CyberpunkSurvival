// ===============================================
//          КАПИТАН ЗАСТАВЫ — ВЕРСИЯ С КНОПКОЙ "ЗАДАНИЯ"
//  Координаты: X=675, Y=1593 | Мир 0
//  Спрайт: outpost_captain.png (13 кадров по горизонтали, 70×70)
// ===============================================

const OUTPOST_CAPTAIN = {
  x: 675,
  y: 1593,
  width: 70,
  height: 70,
  interactionRadius: 50,
  name: "Капитан Райдер",
  spriteSrc: "outpost_captain.png",
  totalFrames: 13,
  frameDuration: 180, // ms на кадр
};

let isCaptainMet = false;
let isCaptainDialogOpen = false;
let hasCaptainGreetingShown = false;
let captainButtonsContainer = null;
let captainSprite = null;

// Анимация
let captainFrame = 0;
let captainFrameTime = 0;

// Темы разговора (без изменений)
const captainTopics = [
  {
    title: "О заставах",
    text: "Мы — последняя линия обороны между Неоновым Городом и Пустошами. Когда-то корпорации держали периметр, но после Отключения всё рухнуло. Теперь мы, выжившие солдаты, держим заставы на своих плечах. Патрулируем, отстреливаем мутантов, помогаем караванам. Каждый день — это война. Но пока мы стоим — город живёт.",
  },
  {
    title: "Пустоши",
    text: "За стенами — ад. Песчаные бури, радиация, мутанты размером с грузовик. Вода там — на вес золота, а баляры не котируются. Люди там либо становятся рейдерами, либо сжираются в пустыне. Говорят, раньше были целые города... теперь только кости и ржавчина. Если пойдёшь туда — бери с собой много воды и крепкий ствол.",
  },
  {
    title: "Корпорации",
    text: "Эти ублюдки в башнях думают, что могут купить всё. Даже нас. Предлагали контракт — охранять их грузы за баляры. Отказались. Потому что знаем: сегодня ты охраняешь их склад, а завтра они сбрасывают бомбу на твою заставу, чтобы 'очистить зону'. Мы не наёмники. Мы — стена.",
  },
  {
    title: "Твой путь",
    text: "Вижу в тебе что-то... не как у других крыс из подвалов. Глаза горят. Слушай сюда, новичок: в этом мире выживает не сильнейший, а тот, кто не сдаётся. Бери оружие, учись, строй связи. Когда-нибудь ты можешь стать одним из нас. А может... даже больше. Но пока — докажи, что не сдохнешь в первой же стычке.",
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
// ОБНОВЛЕНИЕ АНИМАЦИИ
// ===============================================
function updateCaptain(deltaTime) {
  captainFrameTime += deltaTime;
  while (captainFrameTime >= OUTPOST_CAPTAIN.frameDuration) {
    captainFrameTime -= OUTPOST_CAPTAIN.frameDuration;
    captainFrame = (captainFrame + 1) % OUTPOST_CAPTAIN.totalFrames;
  }
}

// ===============================================
// ОТРИСОВКА
// ===============================================
function drawCaptain(ctx, cameraX, cameraY) {
  if (window.worldSystem.currentWorldId !== 0) return;

  const screenX = OUTPOST_CAPTAIN.x - cameraX;
  const screenY = OUTPOST_CAPTAIN.y - cameraY - OUTPOST_CAPTAIN.height + 30;

  // Отсечение
  if (
    screenX < -100 ||
    screenX > canvas.width + 100 ||
    screenY < -100 ||
    screenY > canvas.height + 100
  )
    return;

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
  const displayText = isCaptainMet ? OUTPOST_CAPTAIN.name : "?";
  ctx.strokeText(displayText, screenX + 35, screenY - 10);
  ctx.fillText(displayText, screenX + 35, screenY - 10);

  // Проверка дистанции
  const me = players.get(myId);
  if (!me) return;

  const dx = me.x - OUTPOST_CAPTAIN.x;
  const dy = me.y - OUTPOST_CAPTAIN.y;
  const dist = Math.hypot(dx, dy);

  if (dist < OUTPOST_CAPTAIN.interactionRadius) {
    if (!isCaptainMet && !hasCaptainGreetingShown) {
      showCaptainGreeting();
    } else if (isCaptainMet) {
      createCaptainButtons(screenX, screenY);
    }
  } else {
    removeCaptainButtons();
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
        Назовись, сталкер. Ты из города?<br><br>
        Я — Райдер, капитан заставы «Северный Периметр».<br>
        Мы держим рубеж от мутантов и рейдеров.<br><br>
        Если хочешь выжить в Пустошах — слушай внимательно.<br>
        А если хочешь стать одним из нас — докажи делом.
      </p>
    </div>
    <button class="neon-btn" id="captainOkBtn">Хорошо</button>
  `;

  document.getElementById("captainOkBtn").onclick = () => {
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
// КНОПКИ НАД ГОЛОВОЙ — ГОВОРИТЬ + ЗАДАНИЯ
// ===============================================
function createCaptainButtons(screenX, screenY) {
  if (captainButtonsContainer) return;

  captainButtonsContainer = document.createElement("div");
  captainButtonsContainer.className = "npc-buttons-container";
  captainButtonsContainer.style.left = screenX + 35 + "px";
  captainButtonsContainer.style.top = screenY - 100 + "px";
  captainButtonsContainer.style.transform = "translateX(-50%)";

  // Кнопка "Говорить"
  const talkBtn = document.createElement("div");
  talkBtn.className = "npc-button npc-talk-btn";
  talkBtn.textContent = "Говорить";
  talkBtn.onclick = openCaptainTalk;

  // Кнопка "Задания
  const questsBtn = document.createElement("div");
  questsBtn.className = "npc-button npc-quests-btn";
  questsBtn.textContent = "Задания";
  questsBtn.onclick = openCaptainQuests;

  captainButtonsContainer.appendChild(talkBtn);
  captainButtonsContainer.appendChild(questsBtn);

  document.body.appendChild(captainButtonsContainer);
}

function removeCaptainButtons() {
  if (captainButtonsContainer) {
    captainButtonsContainer.remove();
    captainButtonsContainer = null;
  }
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
    <button class="neon-btn" id="closeCaptainBtn">Закрыть</button>
  `;

  const container = document.getElementById("captainTopics");
  captainTopics.forEach((t) => {
    const el = document.createElement("div");
    el.className = "talk-topic";
    el.innerHTML = `<strong>${t.title}</strong>`;
    el.onclick = () => {
      const textEl = dialog.querySelector(".npc-text");
      textEl.innerHTML = t.text;
      textEl.classList.add("fullscreen");
      container.classList.add("hidden");
      const btn = document.getElementById("closeCaptainBtn");
      btn.textContent = "Назад";
      btn.onclick = () => {
        textEl.classList.remove("fullscreen");
        textEl.innerHTML = "О чём поговорим, сталкер?";
        container.classList.remove("hidden");
        btn.textContent = "Закрыть";
        btn.onclick = closeCaptainDialog;
      };
    };
    container.appendChild(el);
  });

  document.getElementById("closeCaptainBtn").onclick = closeCaptainDialog;
}

// ===============================================
// ДИАЛОГ "ЗАДАНИЯ" — заглушка (можно будет наполнить квестами позже)
// ===============================================
function openCaptainQuests() {
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
      <p class="npc-text">Доступные задания:</p>
      <div class="quest-list">
        <div class="quest-item">
          <span class="quest-marker">▶</span>
          <div>
            <strong>Очистить периметр</strong><br>
            <span style="font-size:14px;color:#aaa;">Уничтожьте 10 мутантов в радиусе заставы</span>
          </div>
          <div class="quest-reward">+500 баляров</div>
        </div>
        <div class="quest-item">
          <span class="quest-marker">▶</span>
          <div>
            <strong>Доставка припасов</strong><br>
            <span style="font-size:14px;color:#aaa;">Отнесите ящик в лагерь выживших</span>
          </div>
          <div class="quest-reward">+800 баляров + репутация</div>
        </div>
      </div>
      <p class="npc-text" style="margin-top:20px;font-size:15px;color:#ff6666;">Новые задания появятся после выполнения текущих.</p>
    </div>
    <button class="neon-btn" id="closeCaptainBtn">Закрыть</button>
  `;

  document.getElementById("closeCaptainBtn").onclick = closeCaptainDialog;
}

function closeCaptainDialog() {
  isCaptainDialogOpen = false;
  const d = document.getElementById("captainDialog");
  if (d) d.remove();
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
};
