// movement.js
(function () {
  // Глобальные переменные для управления движением
  let isMoving = false; // Только для мыши/тача
  let targetX = 0;
  let targetY = 0;
  let keysPressed = new Set(); // Для клавиатуры
  const baseSpeed = 65; // Пикселей в секунду
  const worldWidth = 3135;
  const worldHeight = 3300;

  // Камера с интерполяцией для плавного следования
  const camera = { x: 0, y: 0, targetX: 0, targetY: 0, lerpFactor: 0.1 };

  // Анимационные параметры
  const frameDuration = 200; // Длительность одного кадра анимации в мс (для ходьбы)
  const sendInterval = 100; // Интервал отправки на сервер (мс)
  let lastSendTime = 0;

  // Инициализация системы движения
  function initializeMovement() {
    const canvas = document.getElementById("gameCanvas");
    canvas.setAttribute("tabindex", "0");
    canvas.focus();

    // Обработчики мыши (click-to-move)
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        const me = players.get(myId);
        if (!me || me.health <= 0) return;

        // Проверяем клик по инвентарю
        const inventoryContainer =
          document.getElementById("inventoryContainer");
        const rect = inventoryContainer.getBoundingClientRect();
        if (
          isInventoryOpen &&
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          return;
        }

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

    // Убираем stopMovement из mouseup/touchend - теперь update сам остановит при достижении цели

    // Обработчики тач-событий (аналогично мыши)
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const me = players.get(myId);
      if (!me || me.health <= 0) return;

      const touch = e.touches[0];
      const inventoryContainer = document.getElementById("inventoryContainer");
      const rect = inventoryContainer.getBoundingClientRect();

      if (
        isInventoryOpen &&
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        return;
      }

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

    // Клавиатурные обработчики (WASD + стрелки)
    document.addEventListener("keydown", (e) => {
      e.preventDefault();
      keysPressed.add(e.code);
    });

    document.addEventListener("keyup", (e) => {
      e.preventDefault();
      keysPressed.delete(e.code);
    });

    // Фокус на канвас для клавиш
    canvas.addEventListener("click", () => canvas.focus());
  }

  // Обновление движения персонажа (унифицированная логика для клавиатуры + мыши)
  function updateMovement(deltaTime) {
    const me = players.get(myId);
    if (!me) {
      return;
    }

    const currentTime = Date.now();

    if (me.health <= 0) {
      // Анимация смерти
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

    // Вычисляем входной вектор (клавиатура имеет приоритет)
    let inputDx = 0;
    let inputDy = 0;
    let moving = false;

    if (keysPressed.size > 0) {
      // Клавиатурный ввод (WASD + стрелки)
      if (keysPressed.has("KeyW") || keysPressed.has("ArrowUp")) inputDy -= 1;
      if (keysPressed.has("KeyS") || keysPressed.has("ArrowDown")) inputDy += 1;
      if (keysPressed.has("KeyA") || keysPressed.has("ArrowLeft")) inputDx -= 1;
      if (keysPressed.has("KeyD") || keysPressed.has("ArrowRight"))
        inputDx += 1;

      const inputLen = Math.hypot(inputDx, inputDy);
      if (inputLen > 0) {
        inputDx /= inputLen;
        inputDy /= inputLen;
        moving = true;
      }
    } else if (isMoving) {
      // Мышь/тач: движение к цели
      const dx = targetX - me.x;
      const dy = targetY - me.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 5) {
        inputDx = dx / dist;
        inputDy = dy / dist;
        moving = true;
      } else {
        isMoving = false;
        moving = false;
      }
    }

    if (moving) {
      me.state = "walking";
      me.direction = getDirection(inputDx, inputDy);

      // Анимация ходьбы
      me.frameTime += deltaTime;
      if (me.frameTime >= frameDuration) {
        me.frameTime -= frameDuration;
        me.frame = (me.frame + 1) % 40;
      }

      // Движение
      const moveSpeed = baseSpeed * (deltaTime / 1000);
      const moveX = inputDx * moveSpeed;
      const moveY = inputDy * moveSpeed;

      const prevX = me.x;
      const prevY = me.y;

      me.x += moveX;
      me.y += moveY;

      // Границы мира
      me.x = Math.max(0, Math.min(worldWidth - 70, me.x));
      me.y = Math.max(0, Math.min(worldHeight - 70, me.y));

      // Коллизии
      if (checkCollision(me.x, me.y)) {
        me.x = prevX;
        me.y = prevY;
      }

      // Дистанция
      const traveled = Math.hypot(me.x - prevX, me.y - prevY);
      me.distanceTraveled = (me.distanceTraveled || 0) + traveled;

      // Проверки взаимодействий
      if (window.npcSystem) window.npcSystem.checkNPCProximity();
      if (window.jackSystem) window.jackSystem.checkJackProximity();
      if (window.npcSystem) window.npcSystem.checkQuestCompletion();
      if (window.vendingMachine) window.vendingMachine.checkProximity();

      // Ресурсы и предметы
      updateResources();
      checkCollisions();

      // Отправка на сервер
      if (currentTime - lastSendTime >= sendInterval) {
        sendMovementUpdate(me);
        lastSendTime = currentTime;
      }
    } else {
      // Остановка
      me.state = "idle";
      me.frame = 0;
      me.frameTime = 0;
      if (currentTime - lastSendTime >= sendInterval) {
        sendMovementUpdate(me);
        lastSendTime = currentTime;
      }
    }

    updateCamera(me);
  }

  // Направление для 4-стороннего спрайта (снэп к основным)
  function getDirection(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "right" : "left";
    } else {
      return dy > 0 ? "down" : "up";
    }
  }

  // Отправка обновления на сервер
  function sendMovementUpdate(player) {
    if (ws && ws.readyState === WebSocket.OPEN) {
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
  }

  // Обновление камеры
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

  // Экспорт
  window.movementSystem = {
    initialize: initializeMovement,
    update: updateMovement,
    getCamera: getCamera,
  };
})();
