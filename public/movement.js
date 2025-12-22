(function () {
  let isMoving = false;
  let targetX = 0;
  let targetY = 0;

  const baseSpeed = 65;
  const worldWidth = 3135;
  const worldHeight = 3300;
  const worldMaxX = worldWidth - 40;
  const worldMaxY = worldHeight - 40;

  const camera = { x: 0, y: 0, targetX: 0, targetY: 0, lerpFactor: 0.1 };

  const ANIMATION_FRAME_DURATION = 200; // ms → 5 FPS
  const WALK_FRAME_COUNT = 7;

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
      (e) => (keys[e.key.toLowerCase()] = true)
    );
    window.addEventListener(
      "keyup",
      (e) => (keys[e.key.toLowerCase()] = false)
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

  // Универсальная функция движения
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

    // Границы мира
    me.x = Math.max(0, Math.min(worldMaxX, me.x));
    me.y = Math.max(0, Math.min(worldMaxY, me.y));

    if (checkCollision(me.x, me.y)) {
      me.x = prevX;
      me.y = prevY;
      return false;
    }

    if (me.state !== "attacking") {
      me.state = "walking";
    }
    me.direction = getDirection(dx / distance, dy / distance);

    const traveled = Math.hypot(me.x - prevX, me.y - prevY);
    me.distanceTraveled = (me.distanceTraveled || 0) + traveled;

    // Проверки взаимодействия (один раз за тик движения)
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

    // 3. Джойстик (мобильные)
    if (isMobile && window.joystickSystem && !isCurrentlyMoving) {
      const joy = window.joystickSystem.getDirection();
      if (joy.active && (Math.abs(joy.dx) > 0.05 || Math.abs(joy.dy) > 0.05)) {
        if (movePlayer(joy.dx, joy.dy, deltaTime, me, currentTime, 0)) {
          isCurrentlyMoving = true;
        }
      }
    }

    if (me.state === "attacking") {
      me.attackFrameTime = (me.attackFrameTime || 0) + deltaTime;
      while (me.attackFrameTime >= ATTACK_FRAME_DURATION) {
        me.attackFrameTime -= ATTACK_FRAME_DURATION;
        me.attackFrame = (me.attackFrame || 0) + 1;
        if (me.attackFrame >= ATTACK_FRAME_COUNT) {
          me.attackFrame = 0;
          me.attackFrameTime = 0;
          me.state = isCurrentlyMoving ? "walking" : "idle";
          me.frame = 0; // Сбрасываем кадр ходьбы, чтобы начать с начала при возврате
          sendMovementUpdate(me); // Синхронизируем смену состояния с сервером
          lastSendTime = currentTime;
        }
      }
    } else {
      if (isCurrentlyMoving) {
        me.frameTime = (me.frameTime || 0) + deltaTime;
        while (me.frameTime >= ANIMATION_FRAME_DURATION) {
          me.frameTime -= ANIMATION_FRAME_DURATION;
          me.frame = (me.frame + 1) % WALK_FRAME_COUNT;
        }
      } else if (me.state === "walking") {
        me.state = "idle";
        me.frame = 0;
        me.frameTime = 0;
        sendMovementUpdate(me);
        lastSendTime = currentTime;
      }
    }

    updateCamera(me);
  }

  function getDirection(normX, normY) {
    const angle = Math.atan2(normY, normX) * (180 / Math.PI);

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
