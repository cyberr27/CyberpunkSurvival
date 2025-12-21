(function () {
  let isMoving = false;
  let targetX = 0;
  let targetY = 0;
  const baseSpeed = 65;
  const worldWidth = 3135;
  const worldHeight = 3300;
  const camera = { x: 0, y: 0, targetX: 0, targetY: 0, lerpFactor: 0.1 };

  // Анимация теперь фиксированная по времени (как было до джойстика — 5 кадров в секунду)
  const ANIMATION_FRAME_DURATION = 200; // ms на кадр → 5 FPS анимации ходьбы
  const WALK_FRAME_COUNT = 7; // Количество кадров в анимации ходьбы

  const sendInterval = 100;
  let lastSendTime = 0;
  let keys = {};

  const isMobile = window.joystickSystem
    ? window.joystickSystem.isMobile
    : false;

  function initializeMovement() {
    const canvas = document.getElementById("gameCanvas");

    if (isMobile && window.joystickSystem) {
      window.joystickSystem.initialize();
    }

    // === Обработчики клика/тача по карте (без изменений) ===
    canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      const me = players.get(myId);
      if (!me || me.health <= 0) return;

      const inventoryContainer = document.getElementById("inventoryContainer");
      const rect = inventoryContainer.getBoundingClientRect();
      if (
        window.isInventoryOpen &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      )
        return;

      isMoving = true;
      targetX = e.clientX + camera.x;
      targetY = e.clientY + camera.y;
    });

    canvas.addEventListener("mousemove", (e) => {
      if (isMoving) {
        targetX = e.clientX + camera.x;
        targetY = e.clientY + camera.y;
      }
    });

    canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) stopMovement();
    });

    // Touch для десктопа (если вдруг)
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const me = players.get(myId);
      if (!me || me.health <= 0) return;

      const touch = e.touches[0];
      const inventoryContainer = document.getElementById("inventoryContainer");
      const rect = inventoryContainer.getBoundingClientRect();

      if (
        window.isInventoryOpen &&
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      )
        return;

      isMoving = true;
      targetX = touch.clientX + camera.x;
      targetY = touch.clientY + camera.y;
    });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (isMoving) {
        const touch = e.touches[0];
        targetX = touch.clientX + camera.x;
        targetY = touch.clientY + camera.y;
      }
    });

    canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      stopMovement();
    });

    // Клавиатура
    window.addEventListener("keydown", (e) => {
      keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener("keyup", (e) => {
      keys[e.key.toLowerCase()] = false;
    });
  }

  function stopMovement() {
    isMoving = false;
  }

  // Универсальная функция движения (используется всеми источниками ввода)
  function movePlayer(dx, dy, deltaTime, me, currentTime, tolerance = 0) {
    const distance = Math.hypot(dx, dy);
    if (distance <= tolerance) return false;

    const moveSpeed = baseSpeed * (deltaTime / 1000);
    const moveX = (dx / distance) * moveSpeed;
    const moveY = (dy / distance) * moveSpeed;

    const prevX = me.x;
    const prevY = me.y;

    me.x += moveX;
    me.y += moveY;

    me.x = Math.max(0, Math.min(worldWidth - 40, me.x));
    me.y = Math.max(0, Math.min(worldHeight - 40, me.y));

    if (checkCollision(me.x, me.y)) {
      me.x = prevX;
      me.y = prevY;
      return false;
    }

    me.state = "walking";
    me.direction = getDirection(dx / distance, dy / distance);

    const traveled = Math.hypot(me.x - prevX, me.y - prevY);
    me.distanceTraveled = (me.distanceTraveled || 0) + traveled;

    // Проверки взаимодействия
    window.npcSystem.checkNPCProximity();
    window.jackSystem.checkJackProximity();
    window.npcSystem.checkQuestCompletion();
    window.vendingMachine.checkProximity();
    updateResources();
    checkCollisions();

    if (currentTime - lastSendTime >= sendInterval) {
      sendMovementUpdate(me);
      lastSendTime = currentTime;
    }

    return true;
  }

  function updateMovement(deltaTime) {
    const me = players.get(myId);
    if (!me) return;

    const currentTime = Date.now();

    // === Смерть ===
    if (me.health <= 0) {
      if (me.state === "dying") {
        me.frameTime = (me.frameTime || 0) + deltaTime;
        if (me.frameTime >= ANIMATION_FRAME_DURATION) {
          me.frameTime -= ANIMATION_FRAME_DURATION;
          if (me.frame < 6) me.frame += 1;
        }
        if (currentTime - lastSendTime >= sendInterval || me.frame >= 6) {
          sendMovementUpdate(me);
          lastSendTime = currentTime;
        }
      }
      updateCamera(me);
      return;
    }

    // === Инвентарь открыт ===
    if (window.isInventoryOpen) {
      if (isMoving) stopMovement();
      updateCamera(me);
      return;
    }

    let isCurrentlyMoving = false;

    // 1. Клик по карте
    if (isMoving) {
      const dx = targetX - me.x;
      const dy = targetY - me.y;
      if (movePlayer(dx, dy, deltaTime, me, currentTime, 5)) {
        isCurrentlyMoving = true;
      } else {
        isMoving = false;
      }
    }

    // 2. Клавиатура
    if (!isCurrentlyMoving) {
      let dx = 0,
        dy = 0;
      if (keys["w"]) dy -= 1;
      if (keys["s"]) dy += 1;
      if (keys["a"]) dx -= 1;
      if (keys["d"]) dx += 1;

      if (dx !== 0 || dy !== 0) {
        if (movePlayer(dx, dy, deltaTime, me, currentTime, 0)) {
          isCurrentlyMoving = true;
        }
      }
    }

    // 3. Джойстик (главное исправление)
    if (isMobile && window.joystickSystem && !isCurrentlyMoving) {
      const joy = window.joystickSystem.getDirection();
      if (joy.active && (Math.abs(joy.dx) > 0.05 || Math.abs(joy.dy) > 0.05)) {
        if (movePlayer(joy.dx, joy.dy, deltaTime, me, currentTime, 0)) {
          isCurrentlyMoving = true;
        }
      }
    }

    // === АНИМАЦИЯ: независимая от ввода, только если движемся ===
    if (isCurrentlyMoving) {
      me.frameTime = (me.frameTime || 0) + deltaTime;
      while (me.frameTime >= ANIMATION_FRAME_DURATION) {
        me.frameTime -= ANIMATION_FRAME_DURATION;
        me.frame = (me.frame + 1) % WALK_FRAME_COUNT;
      }
    } else if (me.state === "walking") {
      // Остановка: плавный сброс
      me.state = "idle";
      me.frame = 0;
      me.frameTime = 0;
      sendMovementUpdate(me);
      lastSendTime = currentTime;
    }

    updateCamera(me);
  }

  function getDirection(dx, dy) {
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle > -22.5 && angle <= 22.5) return "right";
    if (angle > 22.5 && angle <= 67.5) return "down-right";
    if (angle > 67.5 && angle <= 112.5) return "down";
    if (angle > 112.5 && angle <= 157.5) return "down-left";
    if (angle > 157.5 || angle <= -157.5) return "left";
    if (angle > -157.5 && angle <= -112.5) return "up-left";
    if (angle > -112.5 && angle <= -67.5) return "up";
    if (angle > -67.5 && angle <= -22.5) return "up-right";
    return "down";
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
      })
    );
  }

  function updateCamera(player) {
    const canvas = document.getElementById("gameCanvas");
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
  };
})();
