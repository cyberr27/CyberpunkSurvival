(function () {
  let isMoving = false;
  let targetX = 0;
  let targetY = 0;

  const baseSpeed = 65;
  const worldWidth = 2800;
  const worldHeight = 2800;
  const worldMaxX = worldWidth - 40;
  const worldMaxY = worldHeight - 40;

  const camera = { x: 0, y: 0, targetX: 0, targetY: 0, lerpFactor: 0.1 };

  const ANIMATION_FRAME_DURATION = 80; // ms → 5 FPS
  const WALK_FRAME_COUNT = 13;

  const sendInterval = 100;
  let lastSendTime = 0;

  let keys = {};
  const isMobile = window.joystickSystem
    ? window.joystickSystem.isMobile
    : false;

  // Кэшируем часто используемые элементы/функции
  const canvas = document.getElementById("gameCanvas");
  const inventoryContainer = document.getElementById("inventoryContainer");
  const getInventoryRect = () => inventoryContainer.getBoundingClientRect();

  function initializeMovement() {
    if (isMobile && window.joystickSystem) {
      window.joystickSystem.initialize();
    }

    // === Обработчики клика/тача по карте ===
    canvas.addEventListener("mousedown", handlePointerDown);
    canvas.addEventListener("mousemove", handlePointerMove);
    canvas.addEventListener("mouseup", handlePointerUp);

    if (!isMobile) {
      canvas.addEventListener("touchstart", handleTouchStart);
      canvas.addEventListener("touchmove", handleTouchMove);
      canvas.addEventListener("touchend", handleTouchEnd);
    }

    // Клавиатура
    window.addEventListener(
      "keydown",
      (e) => (keys[e.key.toLowerCase()] = true),
    );
    window.addEventListener(
      "keyup",
      (e) => (keys[e.key.toLowerCase()] = false),
    );
  }

  // Общие обработчики для мыши
  function handlePointerDown(e) {
    if (e.button !== 0) return;
    if (!canStartMovement(e.clientX, e.clientY)) return;

    isMoving = true;
    updateTarget(e.clientX, e.clientY);
  }

  function handlePointerMove(e) {
    if (isMoving) updateTarget(e.clientX, e.clientY);
  }

  function handlePointerUp(e) {
    if (e.button === 0) stopMovement();
  }

  // Общие обработчики для тача (десктоп)
  function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    if (!canStartMovement(touch.clientX, touch.clientY)) return;

    isMoving = true;
    updateTarget(touch.clientX, touch.clientY);
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (isMoving) {
      const touch = e.touches[0];
      updateTarget(touch.clientX, touch.clientY);
    }
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    stopMovement();
  }

  function canStartMovement(clientX, clientY) {
    const me = players.get(myId);
    if (!me || me.health <= 0) return false;

    if (window.isInventoryOpen) {
      const rect = getInventoryRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return false;
      }
    }
    return true;
  }

  function updateTarget(clientX, clientY) {
    targetX = clientX + camera.x;
    targetY = clientY + camera.y;
  }

  function stopMovement() {
    isMoving = false;
  }

  // ────────────────────────────────────────────────
  //           ПРОВЕРКА КОЛЛИЗИЙ И БАРЬЕРОВ
  // ────────────────────────────────────────────────

  function checkCollision(x, y) {
    // Старая серверная заглушка — можно расширить позже
    return false;
  }

  function wouldCrossBarrier(prevX, prevY, newX, newY) {
    // Клиентская проверка барьеров (для плавности движения)
    // Если barriersSystem не загружен — считаем, что барьеров нет
    return (
      window.barriersSystem?.wouldCrossBarrier?.(prevX, prevY, newX, newY) ||
      false
    );
  }

  // Универсальная функция движения
  function movePlayer(dx, dy, deltaTime, me, currentTime, tolerance = 0) {
    const distance = Math.hypot(dx, dy);
    if (distance <= tolerance) return false;

    const moveSpeed = baseSpeed * (deltaTime / 1000);
    let moveX = (dx / distance) * moveSpeed;
    let moveY = (dy / distance) * moveSpeed;

    const prevX = me.x;
    const prevY = me.y;

    let newX = me.x + moveX;
    let newY = me.y + moveY;

    // Проверка пересечения барьера (самая важная защита на клиенте)
    if (wouldCrossBarrier(prevX, prevY, newX, newY)) {
      // Можно здесь добавить визуальный откат или лёгкий эффект "столкновения"
      // Пока просто отменяем движение на этот кадр
      return false;
    }

    // Применяем движение
    me.x = newX;
    me.y = newY;

    // Ограничение по границам карты
    me.x = Math.max(0, Math.min(worldMaxX, me.x));
    me.y = Math.max(0, Math.min(worldMaxY, me.y));

    // Дополнительная проверка (на будущее — статические препятствия и т.д.)
    if (checkCollision(me.x, me.y)) {
      me.x = prevX;
      me.y = prevY;
      return false;
    }

    // Обновляем направление и состояние
    const normX = dx / distance;
    const normY = dy / distance;
    me.direction = getDirection(normX, normY, me);
    me.state = "walking";

    // Анимация ходьбы
    me.frameTime += deltaTime;
    if (me.frameTime >= ANIMATION_FRAME_DURATION) {
      me.frame = (me.frame + 1) % WALK_FRAME_COUNT;
      me.frameTime -= ANIMATION_FRAME_DURATION;
    }

    // Отправка позиции на сервер (с ограничением частоты)
    if (currentTime - lastSendTime >= sendInterval) {
      sendMovementUpdate(me);
      lastSendTime = currentTime;
    }

    return true;
  }

  function updateMovement(deltaTime) {
    const currentTime = Date.now();
    const me = players.get(myId);
    if (!me || me.health <= 0) return;

    let dx = 0;
    let dy = 0;

    if (isMoving) {
      dx = targetX - me.x;
      dy = targetY - me.y;

      const distanceToTarget = Math.hypot(dx, dy);

      if (distanceToTarget < 10) {
        // Достигли цели — останавливаемся
        stopMovement();
        me.state = "idle";
        me.frame = 0;
        me.frameTime = 0;
        sendMovementUpdate(me);
        lastSendTime = currentTime;
      } else {
        movePlayer(dx, dy, deltaTime, me, currentTime);
      }
    }

    if (me.state === "attacking") {
      // Отправляем каждые 100 мс прогресс атаки
      if (currentTime - lastSendTime >= 100) {
        sendMovementUpdate(me);
        lastSendTime = currentTime;
      }
    }

    updateCamera(me);
  }

  function getDirection(normX, normY, currentPlayer) {
    const angle = Math.atan2(normY, normX) * (180 / Math.PI);

    const currentDir = currentPlayer.direction || "down";

    const prevAngleMap = {
      right: 0,
      "down-right": 45,
      down: 90,
      "up-left": 135,
      left: 180,
      "down-left": -135,
      up: -90,
      "up-right": -45,
    };

    const prevAngle = prevAngleMap[currentDir] || 0;

    let diff = angle - prevAngle;
    while (diff > 180) diff -= 360;
    while (diff <= -180) diff += 360;

    if (Math.abs(diff) < 20) {
      return currentDir;
    }

    if (angle > -22.5 && angle <= 22.5) return "right";
    if (angle > 22.5 && angle <= 67.5) return "down-right";
    if (angle > 67.5 && angle <= 112.5) return "up";
    if (angle > 112.5 && angle <= 157.5) return "up-left";
    if (angle > 157.5 || angle <= -157.5) return "left";
    if (angle > -157.5 && angle <= -112.5) return "down-left";
    if (angle > -112.5 && angle <= -67.5) return "down";
    if (angle > -67.5 && angle <= -22.5) return "down-right";
    return "up";
  }

  function normalizeAngle(angle) {
    while (angle > 180) angle -= 360;
    while (angle <= -180) angle += 360;
    return angle;
  }

  function sendMovementUpdate(player) {
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "move",
        x: player.x,
        y: player.y,
        health: player.health,
        energy: player.energy,
        food: player.food,
        water: player.water,
        armor: player.armor,
        distanceTraveled: player.distanceTraveled,
        direction: player.direction,
        state: player.state,
        frame: player.frame,
        attackFrame: player.attackFrame || 0,
        attackFrameTime: player.attackFrameTime || 0,
      }),
    );
  }

  function updateCamera(player) {
    const halfWidth = canvas.width / 2;
    const halfHeight = canvas.height / 2;

    camera.targetX = player.x - halfWidth;
    camera.targetY = player.y - halfHeight;

    camera.x += (camera.targetX - camera.x) * camera.lerpFactor;
    camera.y += (camera.targetY - camera.y) * camera.lerpFactor;

    camera.x = Math.max(0, Math.min(camera.x, worldWidth - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, worldHeight - canvas.height));
  }

  function getCamera() {
    return camera;
  }

  window.movementSystem = {
    initialize: initializeMovement,
    update: updateMovement,
    getCamera: getCamera,
    isPlayerMoving: () => {
      const me = players.get(myId);
      return me ? me.state === "walking" || me.state === "attacking" : false;
    },
  };
})();
