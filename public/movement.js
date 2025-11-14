// movement.js
(function () {
  // Глобальные переменные для управления движением
  let isMoving = false;
  let targetX = 0;
  let targetY = 0;
  const baseSpeed = 65; // Пикселей в секунду
  const worldWidth = 3135;
  const worldHeight = 3300;

  // Камера с интерполяцией для плавного следования
  const camera = { x: 0, y: 0, targetX: 0, targetY: 0, lerpFactor: 0.1 };

  // Анимационные параметры
  const frameDuration = 200; // Длительность одного кадра анимации в мс
  const directions = [
    "up",
    "down",
    "left",
    "right",
    "up-left",
    "up-right",
    "down-left",
    "down-right",
  ];
  const spriteOffsets = {
    up: 0,
    down: 40,
    left: 80,
    right: 120,
    "up-left": 80,
    "up-right": 120,
    "down-left": 80,
    "down-right": 120,
  };

  // Оптимизация: интервал отправки обновлений на сервер (в мс), чтобы не спамить каждый кадр
  const sendInterval = 100;
  let lastSendTime = 0;

  // Переменные для клавиатурного управления
  const keys = { w: false, a: false, s: false, d: false };
  let keyboardMoving = false; // Отдельный флаг для клавиатурного движения

  // Функция проверки клика/тача по инвентарю
  function isClickOnInventory(clientX, clientY) {
    const inventoryContainer = document.getElementById("inventoryContainer");
    if (!inventoryContainer || !isInventoryOpen) return false;

    const rect = inventoryContainer.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  // Инициализация системы движения
  function initializeMovement() {
    const canvas = document.getElementById("gameCanvas");

    // Обработчики мыши
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        const me = players.get(myId);
        if (!me || me.health <= 0) return;

        if (isClickOnInventory(e.clientX, e.clientY)) {
          return; // Пропускаем, если клик по инвентарю
        }

        // Останавливаем клавиатурное движение при клике мышью
        Object.keys(keys).forEach((key) => (keys[key] = false));
        keyboardMoving = false;

        isMoving = true;
        targetX = e.clientX + camera.x;
        targetY = e.clientY + camera.y;
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      if (isMoving) {
        targetX = e.clientX + camera.x;
        targetY = e.clientY + camera.y;
      }
    });

    canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        stopMovement();
      }
    });

    // Обработчики тач-событий
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const me = players.get(myId);
      if (!me || me.health <= 0) return;

      const touch = e.touches[0];
      if (isClickOnInventory(touch.clientX, touch.clientY)) {
        return; // Пропускаем, если тач по инвентарю
      }

      // Останавливаем клавиатурное движение при таче
      Object.keys(keys).forEach((key) => (keys[key] = false));
      keyboardMoving = false;

      isMoving = true;
      targetX = touch.clientX + camera.x;
      targetY = touch.clientY + camera.y;
    });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      targetX = touch.clientX + camera.x;
      targetY = touch.clientY + camera.y;
    });

    canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      stopMovement();
    });

    // Обработчики клавиатуры - добавляем проверку инвентаря
    document.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();

      // Проверяем, не кликнули ли по инвентарю (для пробела)
      if (key === " ") {
        if (isInventoryOpen) {
          // Если инвентарь открыт, пробел не вызывает атаку
          return;
        }
        e.preventDefault();
        window.combatSystem.performAttack();
        return;
      }

      if (["w", "a", "s", "d"].includes(key)) {
        // Если инвентарь открыт, WASD не двигают персонажа
        if (isInventoryOpen) return;

        keys[key] = true;
        keyboardMoving = true;
        // Останавливаем движение мышью при нажатии клавиш
        isMoving = false;
      }
    });

    document.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(key)) {
        keys[key] = false;
        // Проверяем, остались ли нажатые клавиши
        keyboardMoving = Object.values(keys).some((pressed) => pressed);
      }
    });
  }

  // Остановка движения
  function stopMovement() {
    isMoving = false;
    keyboardMoving = false;
    Object.keys(keys).forEach((key) => (keys[key] = false));

    const me = players.get(myId);
    if (me) {
      me.state = "idle";
      me.frame = 0;
      me.frameTime = 0;
      sendMovementUpdate(me);
    }
  }

  // Обновление движения персонажа
  function updateMovement(deltaTime) {
    const me = players.get(myId);
    if (!me) {
      return;
    }

    const currentTime = Date.now();

    if (me.health <= 0) {
      if (me.state === "dying") {
        me.frameTime += deltaTime;
        if (me.frameTime >= frameDuration) {
          me.frameTime -= frameDuration;
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

    // Если инвентарь открыт - останавливаем все движения
    if (isInventoryOpen) {
      stopMovement();
      updateCamera(me);
      return;
    }

    let dx = 0;
    let dy = 0;
    let anyMovement = false;

    // 1. Клавиатурное движение
    if (keyboardMoving && Object.values(keys).some((pressed) => pressed)) {
      anyMovement = true;
      dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
      dy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);

      const keyDistance = Math.sqrt(dx * dx + dy * dy);
      if (keyDistance > 0) {
        dx = (dx / keyDistance) * baseSpeed * (deltaTime / 1000);
        dy = (dy / keyDistance) * baseSpeed * (deltaTime / 1000);
      }
    }
    // 2. Мышиное движение
    else if (isMoving) {
      anyMovement = true;
      dx = targetX - me.x;
      dy = targetY - me.y;

      const mouseDistance = Math.sqrt(dx * dx + dy * dy);
      if (mouseDistance > 5) {
        dx = (dx / mouseDistance) * baseSpeed * (deltaTime / 1000);
        dy = (dy / mouseDistance) * baseSpeed * (deltaTime / 1000);
      } else {
        // Достигли цели мыши
        isMoving = false;
        me.state = "idle";
        me.frame = 0;
        me.frameTime = 0;
        sendMovementUpdate(me);
        lastSendTime = currentTime;
      }
    }

    if (anyMovement) {
      const prevX = me.x;
      const prevY = me.y;

      me.x += dx;
      me.y += dy;

      // Ограничиваем позицию в пределах мира
      me.x = Math.max(0, Math.min(worldWidth - 40, me.x));
      me.y = Math.max(0, Math.min(worldHeight - 40, me.y));

      // Проверка коллизий
      if (checkCollision(me.x, me.y)) {
        me.x = prevX;
        me.y = prevY;
        stopMovement();
        sendMovementUpdate(me);
        lastSendTime = currentTime;
        updateCamera(me);
        return;
      }

      // Определяем направление
      const dirDistance = Math.sqrt(dx * dx + dy * dy);
      let normalizedDx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      let normalizedDy = dy > 0 ? 1 : dy < 0 ? -1 : 0;

      if (dirDistance > 0) {
        normalizedDx = dx / dirDistance;
        normalizedDy = dy / dirDistance;
      }

      me.state = "walking";
      me.direction = getDirection(normalizedDx, normalizedDy);

      // Обновляем анимацию
      me.frameTime += deltaTime;
      if (me.frameTime >= frameDuration) {
        me.frameTime = me.frameTime % frameDuration;
        me.frame = (me.frame + 1) % 7;
      }

      // Обновляем дистанцию
      const traveled = Math.sqrt((me.x - prevX) ** 2 + (me.y - prevY) ** 2);
      me.distanceTraveled = (me.distanceTraveled || 0) + traveled;

      // Проверяем взаимодействие
      if (window.npcSystem) window.npcSystem.checkNPCProximity();
      if (window.jackSystem) window.jackSystem.checkJackProximity();
      if (window.npcSystem) window.npcSystem.checkQuestCompletion();
      if (window.vendingMachine) window.vendingMachine.checkProximity();

      updateResources();
      checkCollisions();

      if (currentTime - lastSendTime >= sendInterval) {
        sendMovementUpdate(me);
        lastSendTime = currentTime;
      }
    } else if (me.state !== "dying") {
      // Нет движения - переходим в idle
      stopMovement();
    } else if (me.state === "dying") {
      me.frameTime += deltaTime;
      if (me.frameTime >= frameDuration) {
        me.frameTime -= frameDuration;
        if (me.frame < 6) me.frame += 1;
      }
      if (currentTime - lastSendTime >= sendInterval) {
        sendMovementUpdate(me);
        lastSendTime = currentTime;
      }
    }

    updateCamera(me);
  }

  // Определение направления движения
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

  // Отправка обновления движения на сервер
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

  // Обновление камеры с интерполяцией
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
