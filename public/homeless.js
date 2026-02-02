// homeless.js — оптимизированная версия с сохранением двух строк анимации

const HOMELESS = {
  x: 912,
  y: 2332,
  interactionRadius: 50,
  name: "Бездомный",
  worldId: 0,
};

let homelessSprite = null;
let isNearHomeless = false;
let isDialogOpenHomeless = false;

let buttonsContainerHomeless = null;
let dialogElementHomeless = null;

// ─── Анимация ────────────────────────────────────────────────
const FRAME_COUNT = 13;
const FRAME_W = 70;
const FRAME_H = 70;

const LONG_ROW_DURATION = 10000; // 10 секунд — основная анимация
const SHORT_ROW_DURATION = 2000; // ~2 секунды — короткая анимация один раз

let animationTime = 0; // накопленное время
let currentRow = 0; // 0 = длинная, 1 = короткая
let frameHomeless = 0;

let transitionProgress = 1; // 0 = покой (кадр 0, row 0), 1 = обычная анимация
const TRANSITION_DURATION = 400; // мс плавного перехода

function updateHomelessAnimation(deltaTime) {
  if (!homelessSprite) return;

  // Обновляем время анимации только когда не в покое
  if (transitionProgress > 0.01 && !isNearHomeless) {
    animationTime += deltaTime;
  }

  // Плавный переход между покоем и анимацией
  if (isNearHomeless) {
    // → к покою
    if (transitionProgress > 0) {
      transitionProgress = Math.max(
        0,
        transitionProgress - deltaTime / TRANSITION_DURATION,
      );
    }
  } else {
    // → к нормальной анимации
    if (transitionProgress < 1) {
      transitionProgress = Math.min(
        1,
        transitionProgress + deltaTime / TRANSITION_DURATION,
      );
    }
  }

  // Логика выбора строки и кадра
  if (transitionProgress < 0.02) {
    // почти в покое → фиксируем кадр 0, первую строку
    frameHomeless = 0;
    currentRow = 0;
    return;
  }

  // нормальная анимация (когда не в покое)
  const elapsed = animationTime;

  if (currentRow === 0) {
    // длинная анимация (10 сек)
    const progress = (elapsed % LONG_ROW_DURATION) / LONG_ROW_DURATION;
    frameHomeless = Math.floor(progress * FRAME_COUNT) % FRAME_COUNT;

    // если длинная закончилась и игрок далеко → запускаем короткую один раз
    if (elapsed >= LONG_ROW_DURATION && !isNearHomeless) {
      currentRow = 1;
      animationTime = 0; // сбрасываем время для короткой
      frameHomeless = 0;
    }
  } else {
    // короткая анимация (~2 сек)
    const progress = elapsed / SHORT_ROW_DURATION;
    frameHomeless = Math.floor(progress * FRAME_COUNT);

    // короткая закончилась → возвращаемся к длинной
    if (frameHomeless >= FRAME_COUNT) {
      currentRow = 0;
      animationTime = 0; // начинаем длинную заново
      frameHomeless = 0;
    }
  }
}

function drawHomeless() {
  if (!homelessSprite?.complete) return;
  if (window.worldSystem?.currentWorldId !== HOMELESS.worldId) return;

  const camera = movementSystem.getCamera();
  const screenX = HOMELESS.x - camera.x;
  const screenY = HOMELESS.y - camera.y;

  // cull если далеко за экраном
  if (
    screenX < -100 ||
    screenX > canvas.width + 100 ||
    screenY < -100 ||
    screenY > canvas.height + 100
  ) {
    return;
  }

  let drawFrame = frameHomeless;
  let drawRow = currentRow * FRAME_H;

  // во время перехода к покою плавно идём к кадру 0 первой строки
  if (transitionProgress < 0.98) {
    drawFrame = Math.round(transitionProgress * (FRAME_COUNT - 1));
    drawRow = 0; // всегда первая строка при покое/переходе
  }

  ctx.drawImage(
    homelessSprite,
    drawFrame * FRAME_W,
    drawRow,
    FRAME_W,
    FRAME_H,
    screenX - 35,
    screenY - 35,
    FRAME_W,
    FRAME_H,
  );
}

// ─── Взаимодействие ──────────────────────────────────────────

function showHomelessButtons() {
  if (buttonsContainerHomeless) return;

  buttonsContainerHomeless = document.createElement("div");
  buttonsContainerHomeless.className = "homeless-buttons-container";

  const btns = [
    { text: "ГОВОРИТЬ", cls: "homeless-talk-btn", action: "talk" },
    { text: "ЗАДАНИЯ", cls: "homeless-quests-btn", action: "quests" },
    { text: "СКЛАД", cls: "homeless-storage-btn", action: "storage" },
  ];

  btns.forEach((b) => {
    const btn = document.createElement("button");
    btn.className = `homeless-button ${b.cls}`;
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
  closeHomelessDialog();

  isDialogOpenHomeless = true;
  document.body.classList.add("npc-dialog-active");

  dialogElementHomeless = document.createElement("div");
  dialogElementHomeless.className = "homeless-main-dialog open";

  dialogElementHomeless.innerHTML = `
    <div class="homeless-dialog-header">
      <img src="homeless_foto.png" class="homeless-photo" alt="Бездомный">
      <h2 class="homeless-title">Бездомный</h2>
    </div>
    <div class="homeless-dialog-content">
      <p class="homeless-text">[ЗАГЛУШКА] ${section.toUpperCase()} — скоро здесь будет нормальный диалог...</p>
    </div>
    <button class="homeless-close-btn">ЗАКРЫТЬ</button>
  `;

  document.body.appendChild(dialogElementHomeless);

  dialogElementHomeless
    .querySelector(".homeless-close-btn")
    .addEventListener("click", closeHomelessDialog);
}

function closeHomelessDialog() {
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
  if (!me || me.health <= 0 || me.worldId !== HOMELESS.worldId) {
    if (isNearHomeless) {
      isNearHomeless = false;
      removeButtons();
      closeHomelessDialog();
    }
    return;
  }

  const dx = me.x - HOMELESS.x;
  const dy = me.y - HOMELESS.y;
  const dist = Math.hypot(dx, dy);

  const nowNear = dist < HOMELESS.interactionRadius;

  if (nowNear !== isNearHomeless) {
    isNearHomeless = nowNear;

    if (nowNear) {
      showHomelessButtons();
    } else {
      removeButtons();
      closeHomelessDialog();
    }
  }
}

// ─── Инициализация и экспорт ─────────────────────────────────

window.homelessSystem = {
  initialize(sprite) {
    homelessSprite = sprite;
    animationTime = 0;
    currentRow = 0;
    frameHomeless = 0;
    transitionProgress = 1;
    console.log("[Homeless] initialized");
  },

  checkProximity,
  draw: drawHomeless,
  update: updateHomelessAnimation,
};
