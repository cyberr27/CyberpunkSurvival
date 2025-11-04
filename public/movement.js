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
  const sendInterval = 100; // Можно настроить, например, 200 для ещё меньшей нагрузки
  let lastSendTime = 0;

  // Инициализация системы движения
  function initializeMovement() {
    const canvas = document.getElementById("gameCanvas");

    // Кэшируем половину размеров канваса один раз для оптимизации камеры
    const halfWidth = canvas.width / 2;
    const halfHeight = canvas.height / 2;

    // Обработчики мыши
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        const me = players.get(myId);
        if (!me || me.health <= 0) return;

        // Проверяем, не кликнули ли по инвентарю
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
          return; // Пропускаем, если клик по инвентарю
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
      const inventoryContainer = document.getElementById("inventoryContainer");
      const rect = inventoryContainer.getBoundingClientRect();

      if (
        isInventoryOpen &&
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        return; // Пропускаем, если тач по инвентарю
      }

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

    // Экспортируем halfWidth и halfHeight, если нужно, но не трогаем другие модули
    // (они используются только в updateCamera, так что ок)
  }

  // Остановка движения
  function stopMovement() {
    isMoving = false;
    const me = players.get(myId);
    if (me) {
      me.state = "idle";
      me.frame = 0;
      me.frameTime = 0;
      // При остановке всегда отправляем, чтобы сервер знал сразу
      sendMovementUpdate(me);
    }
  }

  // Обновление движения персонажа
  function updateMovement(deltaTime) {
    const me = players.get(myId);
    if (!me) {
      return; // Нет игрока — выходим рано, чтобы сэкономить CPU
    }

    const currentTime = Date.now(); // Для throttling отправок

    if (me.health <= 0) {
      // Если мёртв, только обновляем камеру и анимацию смерти, если нужно
      if (me.state === "dying") {
        me.frameTime += deltaTime;
        if (me.frameTime >= frameDuration) {
          me.frameTime -= frameDuration;
          if (me.frame < 6) me.frame += 1;
        }
        // Отправляем только по интервалу или если анимация закончилась
        if (currentTime - lastSendTime >= sendInterval || me.frame >= 6) {
          sendMovementUpdate(me);
          lastSendTime = currentTime;
        }
      }
      updateCamera(me);
      return;
    }

    if (isMoving) {
      // Вычисляем вектор направления
      const dx = targetX - me.x;
      const dy = targetY - me.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        const moveSpeed = baseSpeed * (deltaTime / 1000);
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        const moveX = normalizedDx * moveSpeed;
        const moveY = normalizedDy * moveSpeed;

        const prevX = me.x;
        const prevY = me.y;

        me.x += moveX;
        me.y += moveY;

        // Ограничиваем позицию в пределах мира
        me.x = Math.max(0, Math.min(worldWidth - 40, me.x));
        me.y = Math.max(0, Math.min(worldHeight - 40, me.y));

        // Проверка коллизий
        if (checkCollision(me.x, me.y)) {
          me.x = prevX;
          me.y = prevY;
          me.state = "idle";
          me.frame = 0;
          me.frameTime = 0;
          isMoving = false;
          sendMovementUpdate(me); // Отправляем сразу при коллизии
          lastSendTime = currentTime;
          updateCamera(me);
          return;
        }

        // Определяем направление
        me.state = "walking";
        me.direction = getDirection(normalizedDx, normalizedDy); // Используем нормализованные, чтобы избежать повторного atan2 на dx/dy

        // Обновляем анимацию
        me.frameTime += deltaTime;
        if (me.frameTime >= frameDuration) {
          me.frameTime = me.frameTime % frameDuration; // Оптимизация: используем % для предотвращения переполнения
          me.frame = (me.frame + 1) % 7;
        }

        // Обновляем дистанцию
        const traveled = Math.sqrt(
          (me.x - prevX) ** 2 + (me.y - prevY) ** 2 // Используем **2 вместо pow для скорости в modern JS
        );
        me.distanceTraveled = (me.distanceTraveled || 0) + traveled;

        // Проверяем взаимодействие с NPC, квестами и торговым автоматом
        window.npcSystem.checkNPCProximity();
        window.jackSystem.checkJackProximity();
        window.npcSystem.checkQuestCompletion();
        window.vendingMachine.checkProximity();

        // Обновляем ресурсы и коллизии
        updateResources();
        checkCollisions();

        // Отправляем данные на сервер только по интервалу
        if (currentTime - lastSendTime >= sendInterval) {
          sendMovementUpdate(me);
          lastSendTime = currentTime;
        }
      } else {
        // Достигли цели
        me.state = "idle";
        me.frame = 0;
        me.frameTime = 0;
        isMoving = false;
        sendMovementUpdate(me); // Отправляем сразу при остановке
        lastSendTime = currentTime;
      }
    } else if (me.state === "dying") {
      // Обработка анимации смерти
      me.frameTime += deltaTime;
      if (me.frameTime >= frameDuration) {
        me.frameTime -= frameDuration;
        if (me.frame < 6) me.frame += 1;
      }
      // Отправляем по интервалу
      if (currentTime - lastSendTime >= sendInterval) {
        sendMovementUpdate(me);
        lastSendTime = currentTime;
      }
    }

    // Обновляем камеру всегда в конце
    updateCamera(me);
  }

  // Определение направления движения (оптимизировал условия для скорости)
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
    return "down"; // По умолчанию
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
    const halfWidth = canvas.width / 2; // Кэшируем здесь, если не закешировано в init
    const halfHeight = canvas.height / 2;

    camera.targetX = player.x - halfWidth;
    camera.targetY = player.y - halfHeight;

    // Интерполяция для плавного следования
    camera.x += (camera.targetX - camera.x) * camera.lerpFactor;
    camera.y += (camera.targetY - camera.y) * camera.lerpFactor;

    // Ограничиваем камеру в пределах мира
    camera.x = Math.max(0, Math.min(camera.x, worldWidth - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, worldHeight - canvas.height));
  }

  // Получение текущей позиции камеры
  function getCamera() {
    return camera;
  }

  // Экспортируем функции для использования в code.js
  window.movementSystem = {
    initialize: initializeMovement,
    update: updateMovement,
    getCamera: getCamera,
  };
})();
