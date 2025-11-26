// vacuumRobot.js
// Робот-пылесос в Неоновом городе (worldId === 1)
// Спрайт: 13 кадров по 70x70, движется по маршруту, диалог при приближении

window.vacuumRobotSystem = (function () {
  const VACUUM_WORLD_ID = 1; // Только в Неоновом городе
  const ROBOT_SIZE = 70;
  const INTERACTION_RANGE = 50; // Пикселей

  // Точки маршрута (A → B → C → D → A)
  const waypoints = [
    { x: 3069, y: 1602 }, // A
    { x: 1420, y: 2556 }, // B
    { x: 559, y: 954 }, // C
    { x: 1114, y: 490 }, // D
  ];

  let currentWaypointIndex = 0;
  let x = waypoints[0].x;
  let y = waypoints[0].y;
  let frame = 0;
  let frameTime = 0;
  const FRAME_DURATION = 120; // ms на кадр (≈8.3 FPS)
  let isMoving = false;
  let waitTimer = 0;
  const WAIT_TIME = 10000; // 10 секунд на точке
  let direction = "down"; // По умолчанию
  let isDialogOpen = false;
  let lastPlayerDistance = Infinity;

  // Загрузка спрайта
  const robotImage = new Image();
  robotImage.src = "vacuum_robot.png"; // ← Назови спрайт именно так: vacuum_robot.png (13 кадров по горизонтали, 70x70)

  // Создаём диалог
  function createDialog() {
    if (document.getElementById("vacuum-dialog")) return;

    const dialog = document.createElement("div");
    dialog.id = "vacuum-dialog";
    dialog.className = "npc-dialog";
    dialog.innerHTML = `
      <div class="npc-dialog-header">
        <img src="vacuum_photo.png" class="npc-photo" alt="Робот-пылесос">
        <h2 class="npc-title">УБОРОЧНЫЙ ДРОН XR-9000</h2>
      </div>
      <div class="npc-dialog-content">
        <div class="npc-text fullscreen">
          *жужжит и мигает лампочками*<br><br>
          "ОБНАРУЖЕНА ОРГАНИЧЕСКАЯ ЖИЗНЬ.<br>
          УРОВЕНЬ ЗАГРЯЗНЕНИЯ: КРИТИЧЕСКИЙ.<br><br>
          РЕКОМЕНДУЕТСЯ НЕМЕДЛЕННАЯ ДЕЗИНФЕКЦИЯ.<br>
          ИСПОЛЬЗОВАТЬ МОЮЩИЙ РЕЖИМ?"<br><br>
          *пытается всосать твою ногу*
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
  }

  function removeDialog() {
    const dialog = document.getElementById("vacuum-dialog");
    if (dialog) {
      dialog.remove();
      isDialogOpen = false;
    }
  }

  function updateDirection(targetX, targetY) {
    const dx = targetX - x;
    const dy = targetY - y;
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? "right" : "left";
    } else {
      direction = dy > 0 ? "down" : "up";
    }
  }

  function update(deltaTime) {
    const me = players.get(myId);
    if (!me || me.worldId !== VACUUM_WORLD_ID) {
      removeDialog();
      return;
    }

    // Проверка дистанции до игрока
    const dx = me.x + 35 - (x + 35);
    const dy = me.y + 35 - (y + 35);
    const distance = Math.hypot(dx, dy);

    if (distance < INTERACTION_RANGE) {
      if (!isDialogOpen) {
        createDialog();
        isDialogOpen = true;
      }
    } else if (isDialogOpen && distance > INTERACTION_RANGE + 20) {
      removeDialog();
    }

    // Анимация кадров
    frameTime += deltaTime;
    if (frameTime >= FRAME_DURATION) {
      frameTime -= FRAME_DURATION;
      frame = (frame + 1) % 13; // 13 кадров в спрайте
    }

    // Логика движения
    if (waitTimer > 0) {
      waitTimer -= deltaTime;
      isMoving = false;
      if (waitTimer <= 0) {
        currentWaypointIndex = (currentWaypointIndex + 1) % waypoints.length;
        isMoving = true;
      }
      return;
    }

    const target = waypoints[currentWaypointIndex];
    const tx = target.x;
    const ty = target.y;
    const distToTarget = Math.hypot(tx - x, ty - y);

    if (distToTarget < 5) {
      // Достигли точки — ждём 10 сек
      x = tx;
      y = ty;
      waitTimer = WAIT_TIME;
      isMoving = false;
      return;
    }

    // Движение к точке
    isMoving = true;
    updateDirection(tx, ty);

    const speed = 0.1; // Как ты и просил — очень медленно
    const moveX = ((tx - x) / distToTarget) * speed * deltaTime;
    const moveY = ((ty - y) / distToTarget) * speed * deltaTime;

    x += moveX;
    y += moveY;
  }

  function draw() {
    const me = players.get(myId);
    if (!me || me.worldId !== VACUUM_WORLD_ID || !robotImage.complete) return;

    const camera = window.movementSystem.getCamera();
    const screenX = x - camera.x;
    const screenY = y - camera.y;

    // Оптимизация: не рисовать, если далеко
    if (
      screenX < -100 ||
      screenX > canvas.width + 100 ||
      screenY < -100 ||
      screenY > canvas.height + 100
    )
      return;

    const spriteY =
      {
        up: 0,
        down: 70,
        left: 140,
        right: 210,
      }[direction] || 70;

    ctx.drawImage(
      robotImage,
      frame * 70,
      spriteY,
      70,
      70,
      screenX,
      screenY,
      70,
      70
    );

    // Подсветка при близости
    if (isDialogOpen) {
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 10]);
      ctx.strokeRect(screenX - 10, screenY - 10, 90, 90);
      ctx.setLineDash([]);
    }
  }

  return {
    update,
    draw,
    isActive: () => players.get(myId)?.worldId === VACUUM_WORLD_ID,
  };
})();
