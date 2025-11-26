// vacuumRobot.js
// УБОРОЧНЫЙ ДРОН XR-9000 — общий для всех игроков в Неоновом городе (worldId === 1)
// Движется по фиксированному маршруту, стоит 10 сек на точках, показывает диалог при приближении

window.vacuumRobotSystem = (function () {
  const VACUUM_WORLD_ID = 1;
  const ROBOT_SIZE = 70;
  const INTERACTION_RANGE = 50;

  // Фиксированный маршрут (A → B → C → D → A)
  const waypoints = [
    { x: 3069, y: 1602 }, // A
    { x: 1420, y: 2556 }, // B
    { x: 559, y: 954 }, // C
    { x: 1114, y: 490 }, // D
  ];

  // Состояние робота (общее для всех клиентов — синхронизировано по времени!)
  let currentWaypointIndex = 0;
  let startTime = Date.now(); // Время старта цикла
  let isPaused = false; // На точке ожидания
  let pauseEndTime = 0;

  let frame = 0;
  let frameTime = 0;
  const FRAME_DURATION = 120; // 8.3 FPS
  let direction = "down";
  let isDialogOpen = false;

  const robotImage = images.vacuumRobotImage;

  // Создание диалога (один раз)
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

  // Получаем текущее положение робота по времени (детерминировано!)
  function getRobotPosition() {
    const now = Date.now();
    const cycleTime = now - startTime;

    // Длина одного полного цикла (примерно)
    const totalDistance = waypoints.reduce((sum, wp, i) => {
      const next = waypoints[(i + 1) % waypoints.length];
      const dx = next.x - wp.x;
      const dy = next.y - wp.y;
      return sum + Math.hypot(dx, dy);
    }, 0);

    const speed = 0.1; // пикселей в мс
    const totalTimePerCycle = totalDistance / speed + waypoints.length * 10000; // +10 сек на точку
    const timeInCycle = cycleTime % totalTimePerCycle;

    let traveled = 0;
    let currentSegmentTime = 0;

    for (let i = 0; i < waypoints.length; i++) {
      const start = waypoints[i];
      const end = waypoints[(i + 1) % waypoints.length];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const segmentLength = Math.hypot(dx, dy);
      const segmentTime = segmentLength / speed;
      const segmentEnd = traveled + segmentTime + 10000; // +10 сек пауза

      if (timeInCycle < segmentEnd) {
        if (timeInCycle < traveled + segmentTime) {
          // Едем по сегменту
          const progress = (timeInCycle - traveled) / segmentTime;
          return {
            x: start.x + dx * progress,
            y: start.y + dy * progress,
            isMoving: true,
            direction:
              Math.abs(dx) > Math.abs(dy)
                ? dx > 0
                  ? "right"
                  : "left"
                : dy > 0
                ? "down"
                : "up",
          };
        } else {
          // Стоим на точке
          return {
            x: end.x,
            y: end.y,
            isMoving: false,
            direction: direction, // сохраняем последнее направление
          };
        }
      }
      traveled += segmentTime + 10000;
    }

    // Если что-то пошло не так — возвращаем первую точку
    return {
      x: waypoints[0].x,
      y: waypoints[0].y,
      isMoving: false,
      direction: "down",
    };
  }

  function update(deltaTime) {
    const me = players.get(myId);
    if (!me || me.worldId !== VACUUM_WORLD_ID) {
      removeDialog();
      return;
    }

    const pos = getRobotPosition();
    const x = pos.x;
    const y = pos.y;
    direction = pos.direction;

    // Проверка на диалог
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
      frame = (frame + 1) % 13;
    }
  }

  function draw() {
    const me = players.get(myId);
    if (!me || me.worldId !== VACUUM_WORLD_ID || !robotImage?.complete) return;

    const pos = getRobotPosition();
    const x = pos.x;
    const y = pos.y;

    const camera = window.movementSystem.getCamera();
    const screenX = x - camera.x;
    const screenY = y - camera.y;

    // Не рисуем, если далеко за экраном
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

  // Публичный интерфейс
  return {
    update,
    draw,
    isActive: () => players.get(myId)?.worldId === VACUUM_WORLD_ID,
    reset: () => {
      startTime = Date.now();
    }, // На случай ресинхронизации
  };
})();
