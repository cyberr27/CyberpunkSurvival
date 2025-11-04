// movement.js
(function () {
  // Глобальные переменные для управления движением
  let isMoving = false;
  let targetX = 0;
  let targetY = 0;
  const baseSpeed = 100; // Пикселей в секунду
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

  // Инициализация системы движения
  function initializeMovement() {
    const canvas = document.getElementById("gameCanvas");

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
  }

  // Остановка движения
  function stopMovement() {
    isMoving = false;
    const me = players.get(myId);
    if (me) {
      me.state = "idle";
      me.frame = 0;
      me.frameTime = 0;
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "move",
          x: me.x,
          y: me.y,
          health: me.health,
          energy: me.energy,
          food: me.food,
          water: me.water,
          armor: me.armor,
          distanceTraveled: me.distanceTraveled,
          direction: me.direction,
          state: me.state,
          frame: me.frame,
        })
      );
    }
  }

  // Обновление движения персонажа
  function updateMovement(deltaTime) {
    const me = players.get(myId);
    if (!me || me.health <= 0) {
      // Даже если игрок не может двигаться, камера должна следовать за ним
      if (me) updateCamera(me);
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
          sendMovementUpdate(me);
          return;
        }

        // Определяем направление
        me.state = "walking";
        me.direction = getDirection(normalizedDx, normalizedDy);

        // Обновляем анимацию
        me.frameTime += deltaTime;
        if (me.frameTime >= frameDuration) {
          me.frameTime -= frameDuration;
          me.frame = (me.frame + 1) % 7;
        }

        // Обновляем дистанцию
        const traveled = Math.sqrt(
          Math.pow(me.x - prevX, 2) + Math.pow(me.y - prevY, 2)
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

        // Отправляем данные на сервер
        sendMovementUpdate(me);
      } else {
        // Достигли цели
        me.state = "idle";
        me.frame = 0;
        me.frameTime = 0;
        isMoving = false;
        sendMovementUpdate(me);
      }
    } else if (me.state === "dying") {
      // Обработка анимации смерти
      me.frameTime += deltaTime;
      if (me.frameTime >= frameDuration) {
        me.frameTime -= frameDuration;
        if (me.frame < 6) me.frame += 1;
      }
      sendMovementUpdate(me);
    }

    // Обновляем камеру
    updateCamera(me);
  }

  // Определение направления движения
  function getDirection(dx, dy) {
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle >= -22.5 && angle < 22.5) return "right";
    if (angle >= 22.5 && angle < 67.5) return "down-right";
    if (angle >= 67.5 && angle < 112.5) return "down";
    if (angle >= 112.5 && angle < 157.5) return "down-left";
    if (angle >= 157.5 || angle < -157.5) return "left";
    if (angle >= -157.5 && angle < -112.5) return "up-left";
    if (angle >= -112.5 && angle < -67.5) return "up";
    if (angle >= -67.5 && angle < -22.5) return "up-right";
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
    camera.targetX = player.x - canvas.width / 2;
    camera.targetY = player.y - canvas.height / 2;

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
