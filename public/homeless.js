// homeless.js

const HOMELESS = {
  x: 100,
  y: 3190,
  interactionRadius: 50,
  name: "Homeless",
  worldId: 0,
};

let homelessSprite = null;
let isNearHomeless = false;
let isDialogOpenHomeless = false;

let animationStartTime = 0;
let currentRow = 0; // 0 = основная (10 сек), 1 = короткая
let frameHomeless = 0;

const FRAME_COUNT = 13;
const FRAME_W = 70;
const FRAME_H = 70;
const LONG_ROW_DURATION = 10000;
const SHORT_ROW_DURATION = 2000; // чуть дольше, чтобы было видно всю анимацию

let buttonsContainerHomeless = null;
let dialogElementHomeless = null;

function showHomelessButtons() {
  if (buttonsContainerHomeless) return;
  buttonsContainerHomeless = document.createElement("div");
  buttonsContainerHomeless.className = "npc-buttons-container homeless-buttons";

  const btns = [
    { text: "ГОВОРИТЬ", cls: "homeless-talk-btn", action: "talk" },
    { text: "ЗАДАНИЯ", cls: "homeless-quests-btn", action: "quests" },
    { text: "СКЛАД", cls: "homeless-storage-btn", action: "storage" },
  ];

  btns.forEach((b) => {
    const btn = document.createElement("button");
    btn.className = `npc-button ${b.cls}`;
    btn.textContent = b.text;
    btn.dataset.action = b.action;
    btn.addEventListener("click", () => openHomelessDialog(b.action));
    buttonsContainerHomeless.appendChild(btn);
  });

  document.body.appendChild(buttonsContainerHomeless);
}

function removeButtons() {
  if (buttonsContainerHomeless) {
    buttonsContainerHomeless.remove();
    buttonsContainerHomeless = null;
  }
}

function openHomelessDialog(section) {
  closeDialog();

  isDialogOpenHomeless = true;
  document.body.classList.add("npc-dialog-active");

  dialogElementHomeless = document.createElement("div");
  dialogElementHomeless.className = "homeless-dialog open";

  dialogElementHomeless.innerHTML = `
    <div class="npc-dialog-header">
      <img src="homeless_foto.png" class="npc-photo" alt="Бездомный">
      <h2 class="npc-title">Бездомный</h2>
    </div>
    <div class="npc-dialog-content">
      <p class="npc-text">[ЗАГЛУШКА] ${section.toUpperCase()} — скоро здесь будет нормальный диалог...</p>
    </div>
    <button class="neon-btn close-homeless-dialog">ЗАКРЫТЬ</button>
  `;

  document.body.appendChild(dialogElementHomeless);

  dialogElementHomeless
    .querySelector(".close-homeless-dialog")
    .addEventListener("click", closeDialog);
}

function closeDialog() {
  if (!isDialogOpenHomeless) return;
  isDialogOpenHomeless = false;
  document.body.classList.remove("npc-dialog-active");

  if (dialogElementHomeless) {
    dialogElementHomeless.remove();
    dialogElementHomeless = null;
  }
}

function checkProximity() {
  const me = players.get(myId);
  if (!me || me.health <= 0) {
    if (isNearHomeless) {
      isNearHomeless = false;
      removeButtons();
      closeDialog();
    }
    return;
  }

  if (me.worldId !== HOMELESS.worldId) {
    if (isNearHomeless) {
      isNearHomeless = false;
      removeButtons();
      closeDialog();
    }
    return;
  }

  const dx = me.x - HOMELESS.x;
  const dy = me.y - HOMELESS.y;
  const dist = Math.hypot(dx, dy);

  const nowNear = dist < HOMELESS.interactionRadius;

  if (nowNear && !isNearHomeless) {
    isNearHomeless = true;
    showHomelessButtons();
  } else if (!nowNear && isNearHomeless) {
    isNearHomeless = false;
    removeButtons();
    closeDialog();
  }
}

function updateHomelessAnimation(deltaTime) {
  if (!homelessSprite) return;

  const elapsed = performance.now() - animationStartTime;

  if (currentRow === 0) {
    // основная анимация — 10 секунд
    const progress = elapsed % LONG_ROW_DURATION;
    frameHomeless =
      Math.floor((progress / LONG_ROW_DURATION) * FRAME_COUNT) % FRAME_COUNT;

    if (elapsed >= LONG_ROW_DURATION && !isNearHomeless) {
      // переключаемся на короткую только если НЕ взаимодействуем
      currentRow = 1;
      animationStartTime = performance.now();
      frameHomeless = 0;
    }
  } else {
    // короткая — один проход
    const progress = elapsed / SHORT_ROW_DURATION;
    frameHomeless = Math.floor(progress * FRAME_COUNT);

    if (frameHomeless >= FRAME_COUNT) {
      currentRow = 0;
      animationStartTime = performance.now();
      frameHomeless = 0;
    }
  }
}

function drawHomeless() {
  if (!homelessSprite?.complete) return;
  if (window.worldSystem.currentWorldId !== HOMELESS.worldId) return;

  const camera = movementSystem.getCamera();
  const screenX = HOMELESS.x - camera.x;
  const screenY = HOMELESS.y - camera.y;

  if (
    screenX < -100 ||
    screenX > canvas.width + 100 ||
    screenY < -100 ||
    screenY > canvas.height + 100
  )
    return;

  let drawFrame = frameHomeless;
  let rowY = currentRow * FRAME_H;

  // при взаимодействии — фиксированный кадр (первый из основной строки)
  if (isNearHomeless) {
    drawFrame = 0;
    rowY = 0;
  }

  ctx.drawImage(
    homelessSprite,
    drawFrame * FRAME_W,
    rowY,
    FRAME_W,
    FRAME_H,
    screenX - 35,
    screenY - 35,
    FRAME_W,
    FRAME_H,
  );
}

window.homelessSystem = {
  initialize(sprite) {
    homelessSprite = sprite;
    animationStartTime = performance.now();
    currentRow = 0;
    frameHomeless = 0;
    console.log("[Homeless] initialized");
  },

  checkProximity,
  draw: drawHomeless,
  update: updateHomelessAnimation,
};
