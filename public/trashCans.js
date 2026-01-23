// trashCans.js — ультра-лёгкая версия, как bonfire

const TRASH_POSITIONS = [
  { x: 30, y: 3265 },
  { x: 4, y: 544 },
  { x: 760, y: 252 },
  { x: 1989, y: 1531 },
  { x: 2928, y: 3083 },
];

const TRASH_CONFIG = {
  FRAME_COUNT: 13,
  FRAME_SIZE: 70,
  FRAME_DURATION: 250, // ms на кадр — плавно и не нагружает
  INTERACTION_RADIUS_SQ: 2500, // 50²
};

let trashSprite = null;
let trashSpriteReady = false;

// Один глобальный таймер
let globalTrashTime = 0;

let currentOpenTrashIndex = -1;

function initializeTrashCans(sprite) {
  trashSprite = sprite;
  trashSpriteReady = !!sprite?.complete;
  if (trashSpriteReady) {
    console.log(
      "[Trash] спрайт готов, размер:",
      trashSprite.width,
      "×",
      trashSprite.height,
    );
  } else {
    console.warn("[Trash] спрайт ещё не готов при инициализации");
  }
}

function updateTrashCans(deltaTime) {
  if (!trashSpriteReady) return;

  globalTrashTime += deltaTime;

  const me = players.get(myId);
  if (!me || window.worldSystem.currentWorldId !== 0) {
    if (currentOpenTrashIndex !== -1) closeTrashDialog();
    return;
  }

  let anyNearby = false;
  let closestDistSq = Infinity;
  let closestIdx = -1;

  TRASH_POSITIONS.forEach((pos, idx) => {
    const dx = me.x - pos.x;
    const dy = me.y - pos.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < closestDistSq) {
      closestDistSq = distSq;
      closestIdx = idx;
    }

    if (distSq <= TRASH_CONFIG.INTERACTION_RADIUS_SQ) {
      anyNearby = true;
      if (currentOpenTrashIndex === -1) {
        openTrashDialog(idx);
      }
    }
  });

  // Если отошли от всех — закрываем
  if (!anyNearby && currentOpenTrashIndex !== -1) {
    closeTrashDialog();
  }
}

function openTrashDialog(index) {
  if (currentOpenTrashIndex !== -1) return;
  currentOpenTrashIndex = index;

  const dialog = document.createElement("div");
  dialog.id = "trashCanDialog";
  dialog.className = "trash-dialog open";

  dialog.innerHTML = `
    <div class="trash-dialog-header">
      <div class="trash-photo"></div>
      <h2 class="trash-title">Мусорный бак #${index + 1}</h2>
    </div>
    <div class="trash-dialog-content">
      <p class="trash-text">
        Пока тут пусто...<br>
        Может кто-то выбросит что-то ценное позже?
      </p>
    </div>
    <button class="trash-close-btn neon-btn">Закрыть</button>
  `;

  document.body.appendChild(dialog);

  dialog.querySelector(".trash-close-btn").onclick = closeTrashDialog;

  document.body.classList.add("trash-dialog-active");
}

function closeTrashDialog() {
  const d = document.getElementById("trashCanDialog");
  if (d) {
    d.remove();
    document.body.classList.remove("trash-dialog-active");
  }
  currentOpenTrashIndex = -1;
}

function drawTrashCans(ctx) {
  if (!trashSpriteReady || !trashSprite?.complete) return;

  const cam = window.movementSystem.getCamera();
  const camX = cam.x;
  const camY = cam.y;
  const cw = canvas.width;
  const ch = canvas.height;

  // Быстрая отсечка по всему полю + буфер
  const left = camX - 100;
  const right = camX + cw + 100;
  const top = camY - 100;
  const bottom = camY + ch + 100;

  const time = globalTrashTime;

  TRASH_POSITIONS.forEach((pos, i) => {
    const x = pos.x;
    const y = pos.y;

    // Быстрый отсев
    if (x < left || x > right || y < top || y > bottom) return;

    const screenX = (x - camX) | 0;
    const screenY = (y - camY) | 0;

    // Фазовый сдвиг — красиво и почти бесплатно
    const frame =
      Math.floor((time + i * 987.654) / TRASH_CONFIG.FRAME_DURATION) %
      TRASH_CONFIG.FRAME_COUNT;

    ctx.drawImage(
      trashSprite,
      frame * TRASH_CONFIG.FRAME_SIZE,
      0,
      TRASH_CONFIG.FRAME_SIZE,
      TRASH_CONFIG.FRAME_SIZE,
      screenX - 35,
      screenY - 35,
      TRASH_CONFIG.FRAME_SIZE,
      TRASH_CONFIG.FRAME_SIZE,
    );
  });
}

window.trashCansSystem = {
  initialize: initializeTrashCans,
  update: updateTrashCans,
  draw: drawTrashCans,
};
