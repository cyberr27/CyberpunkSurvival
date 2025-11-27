// vacuumRobot.js — Три робота-пылесоса: ВАКУУМ-9000, ВАКУУМ-9001 и ВАКУУМ-9002 (2025)

window.vacuumRobotSystem = (function () {
  // ==================== ОБЩИЕ КОНСТАНТЫ ====================
  const DIALOG_RANGE_SQ = 20 * 20; // 20px радиус диалога (квадрат расстояния)
  const REWARD_DURATION = 100; // 2 секунды на точке перед наградой

  // ==================== ПЫЛЕСОС №1 — ВАКУУМ-9000 ====================
  const VACUUM_9000 = {
    x: 3069,
    y: 1602,
    worldId: 0,
    width: 70,
    height: 70,
    speed: 0.09, // px/ms
    frame: 0,
    frameTime: 0,
    frameDuration: 83,
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
    waitDuration: REWARD_DURATION,
    dialogShown: false,
    dialogElement: null,
    name: "ВАКУУМ-9000",
    photo: "vacuum_photo.png",
  };

  // ==================== ПЫЛЕСОС №2 — ВАКУУМ-9001 ====================
  const VACUUM_9001 = {
    x: 2317,
    y: 9,
    worldId: 0,
    width: 70,
    height: 70,
    speed: 0.09,
    frame: 0,
    frameTime: 0,
    frameDuration: 83,
    sprite: null,
    path: [
      { x: 2317, y: 9 }, // A
      { x: 650, y: 1168 }, // B
      { x: 136, y: 577 }, // C
      { x: 1754, y: 57 }, // D
      { x: 2317, y: 9 }, // обратно в A
    ],
    currentTargetIndex: 1,
    state: "moving",
    waitTimer: 0,
    waitDuration: REWARD_DURATION,
    dialogShown: false,
    dialogElement: null,
    name: "ВАКУУМ-9001",
    photo: "vacuum_photo2.png",
  };

  // ==================== ПЫЛЕСОС №3 — ВАКУУМ-9002 (НОВЫЙ МАРШРУТ) ====================
  const VACUUM_9002 = {
    x: 642,
    y: 2978,
    worldId: 0,
    width: 70,
    height: 70,
    speed: 0.09,
    frame: 0,
    frameTime: 0,
    frameDuration: 83,
    sprite: null,
    path: [
      { x: 642, y: 2978 }, // A
      { x: 2936, y: 3062 }, // B
      { x: 1492, y: 1618 }, // C
      { x: 642, y: 2978 }, // D → обратно в A
    ],
    currentTargetIndex: 1,
    state: "moving",
    waitTimer: 0,
    waitDuration: REWARD_DURATION,
    dialogShown: false,
    dialogElement: null,
    name: "ВАКУУМ-9002",
    photo: "vacuum_photo.png", // можно сделать vacuum_photo3.png, если хочешь отдельное фото
  };

  const robots = [VACUUM_9000, VACUUM_9001, VACUUM_9002];
  let cachedMe = null;

  // ==================== ДИАЛОГ ====================
  function createDialog(robot) {
    if (robot.dialogElement) return;

    const dialog = document.createElement("div");
    dialog.className = "npc-dialog";
    dialog.style.display = "none";
    dialog.innerHTML = `
      <div class="npc-dialog-header">
        <img src="${robot.photo}" class="npc-photo" alt="${robot.name}">
        <h2 class="npc-title">${robot.name}</h2>
      </div>
      <div class="npc-dialog-content">
        <div class="npc-text fullscreen">
          *жужж... жужжит угрожающе и сканирует тебя красным лучом*<br><br>
          «ЧИСТОТА — ЭТО ПОРЯДОК.<br>
          Я УБИРАЮ МУСОР. ЛЮБОЙ.<br><br>
          НЕ СТОЙ НА ПУТИ, ПАНК.<br>
          ИЛИ СТАНЕШЬ ПЫЛЬЮ В МОЁМ БАКЕ.»
        </div>
      </div>
      <button class="neon-btn vacuum-close-btn">ПОНЯЛ, УХОЖУ</button>
    `;
    document.body.appendChild(dialog);
    robot.dialogElement = dialog;

    dialog.querySelector(".vacuum-close-btn").addEventListener("click", () => {
      giveRewardAndClose(robot);
    });
  }

  function giveRewardAndClose(robot) {
    hideDialog(robot);

    const me = players.get(myId);
    if (!me || me.worldId !== robot.worldId) return;

    const level = me.level || 0;
    let chance = 0;
    if (level < 2) chance = 1 / 20;
    else if (level < 5) chance = 1 / 10;
    else chance = 1 / 9;

    if (Math.random() < chance) {
      let slot = me.inventory.findIndex((i) => i && i.type === "balyary");
      const isNewStack = slot === -1;
      if (isNewStack) slot = me.inventory.findIndex((i) => i === null);

      if (slot !== -1) {
        const quantity = isNewStack
          ? 1
          : (me.inventory[slot].quantity || 0) + 1;

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

        // Локальное обновление
        if (isNewStack) {
          me.inventory[slot] = { type: "balyary", quantity: 1 };
        } else {
          me.inventory[slot].quantity = quantity;
        }
        updateInventoryDisplay();
        showNotification(`${robot.name} оставил тебе 1 баляр!`, "#00ff00");
      }
    }
  }

  function showDialog(robot) {
    if (robot.dialogShown) return;
    createDialog(robot);
    robot.dialogElement.style.display = "flex";
    robot.dialogShown = true;
  }

  function hideDialog(robot) {
    if (robot.dialogElement) {
      robot.dialogElement.style.display = "none";
    }
    robot.dialogShown = false;
  }

  function isPlayerNear(robot) {
    if (!cachedMe || cachedMe.worldId !== robot.worldId) return false;
    const dx = cachedMe.x + 35 - (robot.x + 35);
    const dy = cachedMe.y + 35 - (robot.y + 35);
    return dx * dx + dy * dy <= DIALOG_RANGE_SQ;
  }

  function moveTowards(robot, targetX, targetY, deltaTime) {
    const dx = targetX - robot.x;
    const dy = targetY - robot.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 3) {
      robot.x = targetX;
      robot.y = targetY;
      robot.state = "waiting";
      robot.waitTimer = 0;
      return;
    }

    const moveX = (dx / dist) * robot.speed * deltaTime;
    const moveY = (dy / dist) * robot.speed * deltaTime;

    robot.x += moveX;
    robot.y += moveY;
  }

  // ==================== ОБНОВЛЕНИЕ ====================
  function update(deltaTime) {
    if (window.worldSystem.currentWorldId !== 0) {
      robots.forEach((r) => hideDialog(r));
      return;
    }

    cachedMe = players.get(myId);

    robots.forEach((robot) => {
      // Анимация кадров
      robot.frameTime += deltaTime;
      if (robot.frameTime >= robot.frameDuration) {
        robot.frameTime -= robot.frameDuration;
        robot.frame = (robot.frame + 1) % 13;
      }

      // Движение
      if (robot.state === "waiting") {
        robot.waitTimer += deltaTime;
        if (robot.waitTimer >= robot.waitDuration) {
          robot.currentTargetIndex =
            (robot.currentTargetIndex + 1) % robot.path.length;
          robot.state = "moving";
        }
      } else if (robot.state === "moving") {
        const target = robot.path[robot.currentTargetIndex];
        moveTowards(robot, target.x, target.y, deltaTime);
      }

      // Диалог
      if (isPlayerNear(robot)) {
        showDialog(robot);
      } else if (robot.dialogShown) {
        hideDialog(robot);
      }
    });
  }

  // ==================== ОТРИСОВКА ====================
  function draw() {
    if (window.worldSystem.currentWorldId !== 0) return;

    const camera = window.movementSystem.getCamera();

    robots.forEach((robot) => {
      const screenX = robot.x - camera.x;
      const screenY = robot.y - camera.y;

      // Отсечение по видимости
      if (
        screenX < -100 ||
        screenX > canvas.width + 100 ||
        screenY < -100 ||
        screenY > canvas.height + 100
      )
        return;

      if (robot.sprite?.complete) {
        ctx.drawImage(
          robot.sprite,
          robot.frame * 70,
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
        ctx.fillText(robot.name, screenX + 8, screenY + 40);
      }

      // Подсветка при приближении
      if (isPlayerNear(robot)) {
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(screenX - 10, screenY - 10, 90, 90);
        ctx.setLineDash([]);
      }
    });
  }

  // ==================== ИНИЦИАЛИЗАЦИЯ ====================
  function initialize(sprite9000, sprite9001, sprite9002) {
    VACUUM_9000.sprite = sprite9000 || images.vacuumRobotSprite;
    VACUUM_9001.sprite = sprite9001 || images.vacuumRobotSprite;
    VACUUM_9002.sprite = sprite9002 || images.vacuumRobotSprite; // можно одну текстуру
  }

  return {
    initialize,
    update,
    draw,
    hideDialog: (robot) => hideDialog(robot),
  };
})();
