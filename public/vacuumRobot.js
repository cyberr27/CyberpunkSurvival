// vacuumRobot.js — Робот-пылесос ВАКУУМ-9000 (2025) — Оптимизированная версия + награда

window.vacuumRobotSystem = (function () {
  const VACUUM = {
    x: 3069,
    y: 1602,
    worldId: 0,
    width: 70,
    height: 70,
    speed: 0.07, // px/ms
    frame: 0,
    frameTime: 0,
    frameDuration: 83, // ~12 FPS (было 30 мс → теперь плавнее и легче)
    sprite: null,
    path: [
      { x: 3069, y: 1602 },
      { x: 1592, y: 2748 },
      { x: 323, y: 1440 },
      { x: 2131, y: 490 },
      { x: 3069, y: 1602 },
    ],
    currentTargetIndex: 1,
    state: "moving", // moving | waiting
    waitTimer: 0,
    waitDuration: 2000, // ← 2 секунды на точке
    dialogShown: false,
    dialogElement: null,
  };

  const DIALOG_RANGE_SQ = 50 * 50; // квадрат расстояния — избегаем Math.sqrt
  let cachedMe = null; // кэшируем игрока для частых проверок

  // Один раз создаём диалог
  function createDialog() {
    if (VACUUM.dialogElement) return;

    const dialog = document.createElement("div");
    dialog.className = "npc-dialog";
    dialog.style.display = "none";
    dialog.innerHTML = `
      <div class="npc-dialog-header">
        <img src="vacuum_photo.png" class="npc-photo" alt="ВАКУУМ-9000">
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
      <button id="vacuumCloseBtn" class="neon-btn">ПОНЯЛ, УХОЖУ</button>
    `;
    document.body.appendChild(dialog);
    VACUUM.dialogElement = dialog;

    // Навешиваем обработчик один раз
    dialog
      .querySelector("#vacuumCloseBtn")
      .addEventListener("click", giveRewardAndClose);
  }

  function giveRewardAndClose() {
    hideDialog();

    const me = players.get(myId);
    if (!me || me.worldId !== VACUUM.worldId) return;

    const level = me.level || 0;
    let chance = 0;

    if (level < 2) chance = 1 / 20;
    else if (level < 5) chance = 1 / 10;
    else chance = 1 / 9;

    if (Math.random() < chance) {
      // Ищем слот с балярами или пустой
      let slot = me.inventory.findIndex((i) => i && i.type === "balyary");
      const isNewStack = slot === -1;
      if (isNewStack) slot = me.inventory.findIndex((i) => i === null);

      if (slot !== -1) {
        const quantity = isNewStack
          ? 1
          : (me.inventory[slot].quantity || 0) + 1;

        // Отправляем на сервер
        if (ws && ws.readyState === WebSocket.OPEN) {
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "vacuumBalyaryReward",
              slot,
              quantity,
              isNewStack,
            })
          );
        }

        // Локально обновляем (на случай задержки)
        if (isNewStack) {
          me.inventory[slot] = { type: "balyary", quantity: 1 };
        } else {
          me.inventory[slot].quantity = quantity;
        }
        updateInventoryDisplay();
        showNotification("ВАКУУМ-9000 оставил тебе 1 баляр!", "#00ff00");
      }
    }
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
    if (!cachedMe || cachedMe.worldId !== VACUUM.worldId) return false;

    const dx = cachedMe.x + 35 - (VACUUM.x + 35);
    const dy = cachedMe.y + 35 - (VACUUM.y + 35);
    return dx * dx + dy * dy <= DIALOG_RANGE_SQ;
  }

  function moveTowards(targetX, targetY, deltaTime) {
    const dx = targetX - VACUUM.x;
    const dy = targetY - VACUUM.y;
    const dist = Math.hypot(dx, dy); // всё равно нужен один раз

    if (dist < 3) {
      VACUUM.x = targetX;
      VACUUM.y = targetY;
      VACUUM.state = "waiting";
      VACUUM.waitTimer = 0;
      return;
    }

    const moveX = (dx / dist) * VACUUM.speed * deltaTime;
    const moveY = (dy / dist) * VACUUM.speed * deltaTime;

    VACUUM.x += moveX;
    VACUUM.y += moveY;
  }

  function update(deltaTime) {
    if (window.worldSystem.currentWorldId !== VACUUM.worldId) {
      hideDialog();
      return;
    }

    cachedMe = players.get(myId);

    // Анимация кадров
    VACUUM.frameTime += deltaTime;
    if (VACUUM.frameTime >= VACUUM.frameDuration) {
      VACUUM.frameTime -= VACUUM.frameDuration;
      VACUUM.frame = (VACUUM.frame + 1) % 13;
    }

    // Движение по маршруту
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

    // Диалог при приближении
    if (isPlayerNear()) {
      showDialog();
    } else if (VACUUM.dialogShown) {
      hideDialog();
    }
  }

  function draw() {
    if (window.worldSystem.currentWorldId !== VACUUM.worldId) return;

    const camera = window.movementSystem.getCamera();
    const screenX = VACUUM.x - camera.x;
    const screenY = VACUUM.y - camera.y;

    // Быстрая отсечка по видимости
    if (
      screenX < -100 ||
      screenX > canvas.width + 100 ||
      screenY < -100 ||
      screenY > canvas.height + 100
    )
      return;

    if (VACUUM.sprite?.complete) {
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
      ctx.fillStyle = "#00ff44";
      ctx.fillRect(screenX, screenY, 70, 70);
      ctx.fillStyle = "#000";
      ctx.font = "12px Arial";
      ctx.fillText("VACUUM", screenX + 8, screenY + 40);
    }

    // Подсветка при близости
    if (isPlayerNear()) {
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(screenX - 10, screenY - 10, 90, 90);
      ctx.setLineDash([]);
    }
  }

  function initialize(sprite) {
    VACUUM.sprite = sprite || images.vacuumRobotSprite;
    createDialog();
  }

  return {
    initialize,
    update,
    draw,
    hideDialog,
  };
})();
