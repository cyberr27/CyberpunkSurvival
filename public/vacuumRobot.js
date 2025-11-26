// vacuumRobot.js — Робот-пылесос в Неоновом городе (2025)

window.vacuumRobotSystem = (function () {
  const VACUUM = {
    x: 3069,
    y: 1602,
    worldId: 1,
    width: 70,
    height: 70,
    speed: 0.1, // пикселей в миллисекунду
    frame: 0,
    frameTime: 0,
    frameDuration: 100, // ms на кадр (10 FPS)
    sprite: null,
    photo: null,
    path: [
      { x: 3069, y: 1602 }, // A
      { x: 1420, y: 2556 }, // B
      { x: 559, y: 954 }, // C
      { x: 1114, y: 490 }, // D
      { x: 3069, y: 1602 }, // обратно в A
    ],
    currentTargetIndex: 1,
    state: "moving", // moving, waiting
    waitTimer: 0,
    waitDuration: 10000, // 10 секунд на точке
    dialogShown: false,
    dialogElement: null,
  };

  const DIALOG_RANGE = 50; // пикселей

  // Создаём диалог один раз
  function createDialog() {
    if (VACUUM.dialogElement) return;

    const dialog = document.createElement("div");
    dialog.className = "npc-dialog";
    dialog.style.display = "none";
    dialog.innerHTML = `
      <div class="npc-dialog-header">
        <img src="vacuum_photo.png" class="npc-photo" alt="Робот-пылесос">
        <h2 class="npc-title">ВАКУУМ-9000</h2>
      </div>
      <div class="npc-dialog-content">
        <div class="npc-text fullscreen">
          *жужжит и мигает лампочками*<br><br>
          «ЧИСТОТА — ОСНОВА ПОРЯДКА.<br>
          Я УБИРАЮ МУСОР. ФИЗИЧЕСКИЙ. И НЕ ТОЛЬКО.<br><br>
          НЕ МЕШАЙ МНЕ РАБОТАТЬ, ПАНК.<br>
          ИЛИ СТАНЕШЬ ЧАСТЬЮ МОЕЙ КОЛЛЕКЦИИ ПЫЛИ.»
        </div>
      </div>
      <button class="neon-btn" onclick="window.vacuumRobotSystem.hideDialog()">ПОНЯЛ, УХОЖУ</button>
    `;
    document.body.appendChild(dialog);
    VACUUM.dialogElement = dialog;
  }

  function showDialog() {
    if (VACUUM.dialogShown) return;
    createDialog();
    VACUUM.dialogElement.style.display = "flex";
    VACUUM.dialogShown = true;
  }

  function hideDialog() {
    if (VACUUM.dialogElement) {
      VACUUM.dialogElement.style.display = "none";
    }
    VACUUM.dialogShown = false;
  }

  function isPlayerNear() {
    const me = players.get(myId);
    if (!me || me.worldId !== VACUUM.worldId) return false;

    const dx = me.x + 35 - (VACUUM.x + 35);
    const dy = me.y + 35 - (VACUUM.y + 35);
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= DIALOG_RANGE;
  }

  function moveTowards(targetX, targetY, deltaTime) {
    const dx = targetX - VACUUM.x;
    const dy = targetY - VACUUM.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) {
      VACUUM.x = targetX;
      VACUUM.y = targetY;
      VACUUM.state = "waiting";
      VACUUM.waitTimer = 0;
      return;
    }

    const moveX = (dx / distance) * VACUUM.speed * deltaTime;
    const moveY = (dy / distance) * VACUUM.speed * deltaTime;

    VACUUM.x += moveX;
    VACUUM.y += moveY;
  }

  function update(deltaTime) {
    if (window.worldSystem.currentWorldId !== VACUUM.worldId) {
      hideDialog();
      return;
    }

    // Анимация кадров
    VACUUM.frameTime += deltaTime;
    if (VACUUM.frameTime >= VACUUM.frameDuration) {
      VACUUM.frameTime -= VACUUM.frameDuration;
      VACUUM.frame = (VACUUM.frame + 1) % 13; // 13 кадров
    }

    // Логика движения
    if (VACUUM.state === "waiting") {
      VACUUM.waitTimer += deltaTime;
      if (VACUUM.waitTimer >= VACUUM.waitDuration) {
        VACUUM.currentTargetIndex =
          (VACUUM.currentTargetIndex + 1) % VACUUM.path.length;
        VACUUM.state = "moving";
      }
    } else if (VACUUM.state === "moving") {
      const target = VACUUM.path[VACUUM.currentTargetIndex];
      moveTowards(target.x, target.y, deltaTime);
    }

    // Проверка на приближение игрока
    if (isPlayerNear()) {
      showDialog();
    } else {
      hideDialog();
    }
  }

  function draw() {
    if (window.worldSystem.currentWorldId !== VACUUM.worldId) return;

    const camera = window.movementSystem.getCamera();
    const screenX = VACUUM.x - camera.x;
    const screenY = VACUUM.y - camera.y;

    // Быстрая проверка видимости
    if (
      screenX < -100 ||
      screenX > canvas.width + 100 ||
      screenY < -100 ||
      screenY > canvas.height + 100
    ) {
      return;
    }

    if (VACUUM.sprite && VACUUM.sprite.complete) {
      ctx.drawImage(
        VACUUM.sprite,
        VACUUM.frame * 70,
        0,
        70,
        70,
        screenX,
        screenY,
        70,
        70
      );
    } else {
      // Заглушка
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(screenX, screenY, 70, 70);
      ctx.fillStyle = "#000";
      ctx.font = "12px Arial";
      ctx.fillText("VACUUM", screenX + 10, screenY + 40);
    }

    // Подсветка при приближении
    if (isPlayerNear()) {
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.strokeRect(screenX - 10, screenY - 10, 90, 90);
      ctx.setLineDash([]);
    }
  }

  function initialize(sprite) {
    VACUUM.sprite = sprite || images.vacuumRobotSprite;
    VACUUM.photo = images.vacuumPhotoImage;
    createDialog(); // создаём заранее
    console.log("Робот-пылесос ВАКУУМ-9000 запущен в Неоновом городе");
  }

  return {
    initialize,
    update,
    draw,
    hideDialog,
    showDialog,
  };
})();
