// toremidos.js

const TOREMIDOS_CONFIG = {
  x: 575,
  y: 1140,
  width: 70,
  height: 70,
  interactionRadius: 80,
  name: "Мастер Торемидос",
  worldId: 0,
};

const TOREMIDOS_MAIN_PHASE_DURATION = 14000;
const TOREMIDOS_ACTIVE_PHASE_DURATION = 5000;
const TOREMIDOS_FRAME_DURATION = 180;
const TOREMIDOS_TOTAL_FRAMES = 13;
const TOREMIDOS_MAX_DELTA = 1000;

let toremidosIsMet = false;
let toremidosIsNear = false;
let toremidosIsDialogOpen = false;

let toremidosSprite = null;
let toremidosButtonsContainer = null;
let toremidosDialogElement = null;

let toremidosFrame = 0;
let toremidosFrameTime = 0;
let toremidosCycleTime = 0;
let toremidosCurrentPhase = "main";

function toremidosOpenGreeting() {
  if (toremidosIsDialogOpen) return;
  toremidosIsDialogOpen = true;
  document.body.classList.add("toremidos-dialog-active");

  toremidosDialogElement = document.createElement("div");
  toremidosDialogElement.className = "toremidos-dialog open";
  toremidosDialogElement.innerHTML = `
    <div class="toremidos-dialog-header">
      <h2 class="toremidos-title">Торемидос</h2>
    </div>
    <div class="toremidos-dialog-content">
      <p class="toremidos-text">Эй, ты... Первый раз вижу тебя здесь.</p>
      <p class="toremidos-text">Я Торемидос. Не люблю незнакомцев, но ты не похож на корпоративную шавку.</p>
      <p class="toremidos-text">Говори, чего хотел, или вали отсюда.</p>
    </div>
    <button class="toremidos-neon-btn" id="toremidos-greeting-continue">
      Понял, давай знакомиться
    </button>
  `;
  document.body.appendChild(toremidosDialogElement);

  const continueBtn = document.getElementById("toremidos-greeting-continue");
  if (continueBtn) {
    continueBtn.onclick = () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "meetToremidos" }));
      }
      toremidosCloseDialog();
    };
  }
}

function toremidosOpenDialog(section = "talk") {
  toremidosCloseDialog();

  toremidosIsDialogOpen = true;
  document.body.classList.add("toremidos-dialog-active");

  toremidosDialogElement = document.createElement("div");
  toremidosDialogElement.className = "toremidos-dialog open";

  let content = "";

  if (section === "talk") {
    content = `
      <div class="toremidos-dialog-header">
        <h2 class="toremidos-title">Торемидос</h2>
      </div>
      <div class="toremidos-dialog-content">
        <p class="toremidos-text">Чё хотел, сталкер?</p>
        <p class="toremidos-text">Могу рассказать пару историй... или продать кое-что интересное.</p>
      </div>
      <div class="toremidos-dialog-buttons">
        <button class="toremidos-neon-btn" id="toremidos-btn-skills">Умения</button>
        <button class="toremidos-neon-btn" id="toremidos-btn-talk">Поговорить</button>
        <button class="toremidos-neon-btn" id="toremidos-btn-close">Вали отсюда</button>
      </div>
    `;
  } else if (section === "skills") {
    content = `
      <div class="toremidos-dialog-header">
        <h2 class="toremidos-title">Умения Торемидоса</h2>
      </div>
      <div class="toremidos-dialog-content skills-shop">
        <div id="toremidos-skills-grid"></div>
        <div id="toremidos-skill-description" class="skill-desc"></div>
      </div>
      <button class="toremidos-neon-btn back-btn" id="toremidos-back-to-talk">Назад</button>
    `;
  }

  toremidosDialogElement.innerHTML = content;
  document.body.appendChild(toremidosDialogElement);

  // Обработчики
  if (section === "talk") {
    document
      .getElementById("toremidos-btn-skills")
      ?.addEventListener("click", () => {
        toremidosOpenDialog("skills");
        renderToremidosSkillsShop();
      });

    document
      .getElementById("toremidos-btn-talk")
      ?.addEventListener("click", () => {
        // можно расширить позже
        alert("Поговорить — пока заглушка");
      });

    document
      .getElementById("toremidos-btn-close")
      ?.addEventListener("click", () => {
        toremidosCloseDialog();
      });
  }

  if (section === "skills") {
    document
      .getElementById("toremidos-back-to-talk")
      ?.addEventListener("click", () => {
        toremidosOpenDialog("talk");
      });
  }
}

function toremidosCloseDialog() {
  if (!toremidosDialogElement) return;
  toremidosIsDialogOpen = false;
  document.body.classList.remove("toremidos-dialog-active");
  toremidosDialogElement.remove();
  toremidosDialogElement = null;
}

function toremidosCreateButtons() {
  if (toremidosButtonsContainer) return;

  toremidosButtonsContainer = document.createElement("div");
  toremidosButtonsContainer.className = "toremidos-buttons-container";

  const talkBtn = document.createElement("div");
  talkBtn.className = "toremidos-button toremidos-talk-btn";
  talkBtn.textContent = "ГОВОРИТЬ";
  talkBtn.onclick = () => toremidosOpenDialog("talk");

  const skillsBtn = document.createElement("div");
  skillsBtn.className = "toremidos-button toremidos-skills-btn";
  skillsBtn.textContent = "УМЕНИЯ";
  skillsBtn.onclick = () => toremidosOpenDialog("skills");

  toremidosButtonsContainer.append(talkBtn, skillsBtn);
  document.body.appendChild(toremidosButtonsContainer);
}

function toremidosRemoveButtons() {
  if (toremidosButtonsContainer) {
    toremidosButtonsContainer.remove();
    toremidosButtonsContainer = null;
  }
}

function toremidosUpdateButtonsPosition(cameraX, cameraY) {
  if (!toremidosButtonsContainer || !toremidosIsNear) return;
  const screenX = TOREMIDOS_CONFIG.x - cameraX + 35;
  const screenY = TOREMIDOS_CONFIG.y - cameraY - 110;
  toremidosButtonsContainer.style.left = `${screenX}px`;
  toremidosButtonsContainer.style.top = `${screenY}px`;
}

function toremidosDraw(deltaTime) {
  if (window.worldSystem.currentWorldId !== TOREMIDOS_CONFIG.worldId) return;

  deltaTime = Math.min(deltaTime, TOREMIDOS_MAX_DELTA);

  const camera = window.movementSystem.getCamera();
  const screenX = TOREMIDOS_CONFIG.x - camera.x;
  const screenY = TOREMIDOS_CONFIG.y - camera.y;

  let sx, sy;

  if (toremidosIsNear) {
    sx = 0;
    sy = 0;
    toremidosFrame = 0;
    toremidosFrameTime = 0;
    toremidosCycleTime = 0;
    toremidosCurrentPhase = "main";
  } else {
    toremidosCycleTime += deltaTime;
    const phaseDuration =
      toremidosCurrentPhase === "main"
        ? TOREMIDOS_MAIN_PHASE_DURATION
        : TOREMIDOS_ACTIVE_PHASE_DURATION;

    while (toremidosCycleTime >= phaseDuration) {
      toremidosCycleTime -= phaseDuration;
      toremidosCurrentPhase =
        toremidosCurrentPhase === "main" ? "active" : "main";
      toremidosFrame = 0;
      toremidosFrameTime = 0;
    }

    toremidosFrameTime += deltaTime;
    while (toremidosFrameTime >= TOREMIDOS_FRAME_DURATION) {
      toremidosFrameTime -= TOREMIDOS_FRAME_DURATION;
      toremidosFrame = (toremidosFrame + 1) % TOREMIDOS_TOTAL_FRAMES;
    }

    sy = toremidosCurrentPhase === "main" ? 70 : 0;
    sx = toremidosFrame * 70;
  }

  if (toremidosSprite?.complete) {
    ctx.drawImage(toremidosSprite, sx, sy, 70, 70, screenX, screenY, 70, 70);
  } else {
    ctx.fillStyle = "#00aaff";
    ctx.fillRect(screenX, screenY, 70, 70);
  }

  // Имя или ?
  ctx.fillStyle = toremidosIsMet ? "#fbff00" : "#ffffff";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    toremidosIsMet ? TOREMIDOS_CONFIG.name : "?",
    screenX + 35,
    screenY - 12,
  );

  toremidosUpdateButtonsPosition(camera.x, camera.y);
}

function toremidosCheckProximity() {
  const player = players.get(myId);
  if (
    !player ||
    player.worldId !== TOREMIDOS_CONFIG.worldId ||
    player.health <= 0
  ) {
    if (toremidosIsNear) {
      toremidosIsNear = false;
      toremidosRemoveButtons();
      toremidosCloseDialog();
    }
    return;
  }

  const dx = player.x + 35 - (TOREMIDOS_CONFIG.x + 35);
  const dy = player.y + 35 - (TOREMIDOS_CONFIG.y + 35);
  const dist = Math.hypot(dx, dy);

  const nowNear = dist < TOREMIDOS_CONFIG.interactionRadius;

  if (nowNear && !toremidosIsNear) {
    toremidosIsNear = true;
    if (toremidosIsMet) {
      toremidosCreateButtons();
    } else {
      toremidosOpenGreeting();
    }
  } else if (!nowNear && toremidosIsNear) {
    toremidosIsNear = false;
    toremidosRemoveButtons();
    toremidosCloseDialog();
    toremidosCurrentPhase = "main";
    toremidosCycleTime = 0;
    toremidosFrame = 0;
    toremidosFrameTime = 0;
  }
}

function toremidosSetMet(met) {
  toremidosIsMet = !!met;
  if (toremidosIsNear) {
    if (toremidosIsMet) {
      toremidosCreateButtons();
    } else {
      toremidosRemoveButtons();
    }
  }
}

function renderToremidosSkillsShop() {
  const grid = document.getElementById("toremidos-skills-grid");
  if (!grid) return;

  grid.innerHTML = "";

  TOREMIDOS_SKILLS_SHOP.forEach((skill, index) => {
    const slot = document.createElement("div");
    slot.className = "toremidos-skill-slot";
    slot.dataset.skillType = skill.type;

    slot.innerHTML = `
      <img src="images/skills/${skill.icon}" alt="${skill.name}" />
      <div class="skill-name">${skill.name}</div>
    `;

    slot.addEventListener("click", () => {
      showToremidosSkillDescription(skill);
    });

    grid.appendChild(slot);
  });
}

function showToremidosSkillDescription(skill) {
  const desc = document.getElementById("toremidos-skill-description");
  if (!desc) return;

  let priceText = "";
  for (const [itemType, count] of Object.entries(skill.price)) {
    priceText += `<div>${ITEM_CONFIG[itemType]?.name || itemType}: ${count}</div>`;
  }

  desc.innerHTML = `
    <h3>${skill.name}</h3>
    <p>${skill.description}</p>
    <div class="price-block">
      <strong>Стоимость:</strong><br>
      ${priceText}
    </div>
    <button class="toremidos-buy-btn" data-skill-type="${skill.type}">
      Купить
    </button>
  `;

  // Обработчик покупки
  desc.querySelector(".toremidos-buy-btn")?.addEventListener("click", () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "buyToremidosSkill",
          skillType: skill.type,
        }),
      );
    }
  });
}

window.toremidosSystem = {
  initialize: (img) => {
    toremidosSprite = img;
    toremidosCurrentPhase = "main";
    toremidosCycleTime = 0;
    toremidosFrame = 0;
    toremidosFrameTime = 0;
  },
  draw: toremidosDraw,
  checkProximity: toremidosCheckProximity,
  setMet: toremidosSetMet,
};
