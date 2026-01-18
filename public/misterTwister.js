// misterTwister.js — оптимизированная версия (2025)
// Анимированный автомат "Mister Twister" в стиле киберпанк

const MISTER_TWISTER = {
  x: 500,
  y: 2800,
  width: 70,
  height: 100,
};

const CONFIG = {
  frameCount: 13,
  frameWidth: 70,
  frameHeight: 100,
  animationDuration: 5000, // мс
  pauseDuration: 10000, // мс
  interactionRadiusSq: 4900, // 70²
};

let sprite = null;
let spriteReady = false;
let animationStart = 0;
let isMenuOpen = false;
let menuElement = null;
let wasInRangeLastFrame = false;

// Одноразовая инициализация
function initializeMisterTwister() {
  sprite = new Image();
  sprite.src = "mister_twister.png";

  sprite.onload = () => {
    spriteReady = true;
    // console.log("[MisterTwister] Спрайт загружен"); // ← раскомментировать при отладке
  };

  animationStart = performance.now();
}

// Самая частая проверка — делаем максимально лёгкой
function checkMisterTwisterProximity() {
  if (window.worldSystem.currentWorldId !== 0) {
    if (isMenuOpen) hideTwisterMenu();
    wasInRangeLastFrame = false;
    return;
  }

  const me = players.get(myId);
  if (!me) return;

  const dx = me.x + 35 - (MISTER_TWISTER.x + 35);
  const dy = me.y + 50 - (MISTER_TWISTER.y + 50);

  const nowInRange = dx * dx + dy * dy < CONFIG.interactionRadiusSq;

  // Самое частое состояние — далеко и меню закрыто → выходим очень рано
  if (!nowInRange && !wasInRangeLastFrame) {
    wasInRangeLastFrame = false;
    return;
  }

  // Изменилось состояние — реагируем
  if (nowInRange && !wasInRangeLastFrame) {
    showTwisterMenu();
  } else if (!nowInRange && wasInRangeLastFrame) {
    hideTwisterMenu();
  }

  wasInRangeLastFrame = nowInRange;
}

function showTwisterMenu() {
  if (isMenuOpen) return;
  isMenuOpen = true;

  menuElement = document.createElement("div");
  menuElement.className = "npc-dialog open";

  menuElement.innerHTML = `
    <div class="npc-dialog-header">
      <h2 class="npc-title">MISTER TWISTER</h2>
    </div>
    
    <div class="npc-dialog-content">
      <p class="npc-text">
        Добро пожаловать в <strong>Mister Twister!</strong><br><br>
        Здесь ты можешь закрутить свою удачу... или остаться без штанов.<br>
        Скоро здесь будет куча всего интересного ;)
      </p>
    </div>

    <button class="neon-btn">ЗАКРЫТЬ</button>
  `;

  menuElement
    .querySelector(".neon-btn")
    .addEventListener("click", hideTwisterMenu, { once: true });

  document.body.appendChild(menuElement);
}

function hideTwisterMenu() {
  if (!isMenuOpen) return;
  isMenuOpen = false;

  if (menuElement) {
    menuElement.remove();
    menuElement = null;
  }
}

function drawMisterTwister() {
  if (window.worldSystem.currentWorldId !== 0) return;
  if (!spriteReady || !sprite?.complete) return;

  const camera = window.movementSystem.getCamera();
  const sx = MISTER_TWISTER.x - camera.x;
  const sy = MISTER_TWISTER.y - camera.y;

  // Ранняя отсечка — не рисуем, если точно вне экрана + запас
  if (
    sx + 90 < 0 ||
    sx > canvas.width + 30 ||
    sy + 130 < 0 ||
    sy > canvas.height + 30
  ) {
    return;
  }

  const now = performance.now();
  const cycleTime = CONFIG.animationDuration + CONFIG.pauseDuration;
  const t = (now - animationStart) % cycleTime;

  let frame = 0;

  if (t < CONFIG.animationDuration) {
    frame = Math.floor((t * CONFIG.frameCount) / CONFIG.animationDuration);
  }
  // else → пауза, frame остаётся 0

  ctx.drawImage(
    sprite,
    frame * CONFIG.frameWidth,
    0,
    CONFIG.frameWidth,
    CONFIG.frameHeight,
    sx,
    sy,
    MISTER_TWISTER.width,
    MISTER_TWISTER.height,
  );
}

// Экспорт — имена функций совпадают с оригиналом!
window.misterTwister = {
  initialize: initializeMisterTwister,
  checkProximity: checkMisterTwisterProximity,
  draw: drawMisterTwister,
  hideMenu: hideTwisterMenu,
};
