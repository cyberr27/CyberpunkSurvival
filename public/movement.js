(function () {
  let isMoving = false;
  let targetX = 0;
  let targetY = 0;
  const baseSpeed = 65;
  const worldWidth = 3135;
  const worldHeight = 3300;
  const camera = { x: 0, y: 0, targetX: 0, targetY: 0, lerpFactor: 0.1 };
  const frameDuration = 200;
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
  const sendInterval = 100;
  let lastSendTime = 0;
  let keys = {};
  const isMobile = window.joystickSystem
    ? window.joystickSystem.isMobile
    : false;

  function initializeMovement() {
    const canvas = document.getElementById("gameCanvas");
    const halfWidth = canvas.width / 2;
    const halfHeight = canvas.height / 2;

    if (isMobile && window.joystickSystem) {
      window.joystickSystem.initialize();
    }

    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        const me = players.get(myId);
        if (!me || me.health <= 0) return;
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

    canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        stopMovement();
      }
    });

    if (!isMobile) {
      canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const me = players.get(myId);
        if (!me || me.health <= 0) return;

        const touch = e.touches[0];
        const inventoryContainer =
          document.getElementById("inventoryContainer");
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
        const touch = e.touches[0];
        targetX = touch.clientX + camera.x;
        targetY = touch.clientY + camera.y;
      });

      canvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        stopMovement();
      });
    }

    window.addEventListener("keydown", (e) => {
      keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener("keyup", (e) => {
      keys[e.key.toLowerCase()] = false;
    });
  }

  function stopMovement() {
    isMoving = false;
    const me = players.get(myId);
    if (me) {
      me.state = "idle";
      me.frame = 0;
      me.frameTime = 0;
      sendMovementUpdate(me);
    }
  }

  function movePlayer(dx, dy, deltaTime, me, currentTime, minDistance = 0) {
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= minDistance) return false;

    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;
    const moveSpeed = baseSpeed * (deltaTime / 1000);
    const moveX = normalizedDx * moveSpeed;
    const moveY = normalizedDy * moveSpeed;

    const prevX = me.x;
    const prevY = me.y;

    me.x += moveX;
    me.y += moveY;

    me.x = Math.max(0, Math.min(worldWidth - 40, me.x));
    me.y = Math.max(0, Math.min(worldHeight - 40, me.y));

    if (checkCollision(me.x, me.y)) {
      me.x = prevX;
      me.y = prevY;
      me.state = "idle";
      me.frame = 0;
      me.frameTime = 0;
      sendMovementUpdate(me);
      lastSendTime = currentTime;
      return false;
    }

    me.state = "walking";
    me.direction = getDirection(normalizedDx, normalizedDy);

    me.frameTime += deltaTime;
    if (me.frameTime >= frameDuration) {
      me.frameTime %= frameDuration;
      me.frame = (me.frame + 1) % 7;
    }

    const traveled = Math.sqrt((me.x - prevX) ** 2 + (me.y - prevY) ** 2);
    me.distanceTraveled = (me.distanceTraveled || 0) + traveled;

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

    if (window.isInventoryOpen) {
      if (isMoving) {
        stopMovement();
      }
      updateCamera(me);
      return;
    }

    let moved = false;

    if (isMoving) {
      const dx = targetX - me.x;
      const dy = targetY - me.y;
      if (!movePlayer(dx, dy, deltaTime, me, currentTime, 5)) {
        me.state = "idle";
        me.frame = 0;
        me.frameTime = 0;
        isMoving = false;
        sendMovementUpdate(me);
        lastSendTime = currentTime;
      } else {
        moved = true;
      }
    } else {
      let dx = 0;
      let dy = 0;
      if (keys["w"]) dy -= 1;
      if (keys["s"]) dy += 1;
      if (keys["a"]) dx -= 1;
      if (keys["d"]) dx += 1;

      if (dx !== 0 || dy !== 0) {
        if (movePlayer(dx, dy, deltaTime, me, currentTime, 0)) {
          moved = true;
        }
      } else if (me.state !== "idle") {
        me.state = "idle";
        me.frame = 0;
        me.frameTime = 0;
        sendMovementUpdate(me);
        lastSendTime = currentTime;
      }
    }

    if (isMobile && window.joystickSystem) {
      const joyDir = window.joystickSystem.getDirection();
      if (joyDir.dx !== 0 || joyDir.dy !== 0) {
        if (movePlayer(joyDir.dx, joyDir.dy, deltaTime, me, currentTime, 0)) {
          moved = true;
        }
      } else if (me.state !== "idle") {
        me.state = "idle";
        me.frame = 0;
        me.frameTime = 0;
        sendMovementUpdate(me);
        lastSendTime = currentTime;
      }
    }

    if (me.state === "dying") {
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
