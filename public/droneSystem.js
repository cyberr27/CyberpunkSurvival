// droneSystem.js
// Три корпоративных дрона-шпиона в мире 0. Максимально лёгкие и плавные.

window.droneSystem = (function () {
  const DRONE_WORLD_ID = 0;
  const SPRITE_WIDTH = 70;
  const SPRITE_HEIGHT = 70;
  const TOTAL_FRAMES = 13;
  const FRAME_DURATION = 120;

  let droneSprite = null;
  let drones = []; // Теперь массив!
  let isInitialized = false;

  // Безопасные размеры мира 0
  function getWorldSize() {
    try {
      if (
        window.worldSystem?.getWorldById &&
        typeof window.worldSystem.getWorldById === "function"
      ) {
        const w = window.worldSystem.getWorldById(DRONE_WORLD_ID);
        if (w?.w && w?.h) return { w: w.w, h: w.h };
      }
      if (window.worldSystem?.worlds?.[DRONE_WORLD_ID]) {
        const w = window.worldSystem.worlds[DRONE_WORLD_ID];
        if (w?.w && w?.h) return { w: w.w, h: w.h };
      }
      return { w: 5000, h: 5000 };
    } catch (e) {
      return { w: 5000, h: 5000 };
    }
  }

  function getRandomTarget() {
    const s = getWorldSize();
    const m = 400;
    return {
      x: m + Math.random() * (s.w - 2 * m),
      y: m + Math.random() * (s.h - 2 * m),
    };
  }

  // Создаём одного дрона с заданными стартовыми координатами
  function createDrone(startX, startY) {
    const target = getRandomTarget();
    return {
      x: startX,
      y: startY,
      targetX: target.x,
      targetY: target.y,
      speed: 0.22 + Math.random() * 0.04, // лёгкая разница в скорости
      frame: Math.floor(Math.random() * TOTAL_FRAMES),
      frameTime: Math.random() * FRAME_DURATION,
      hoverTime: 0,
      hoverDuration: 3000 + Math.random() * 5000,
      state: Math.random() > 0.5 ? "hovering" : "moving",
    };
  }

  function initialize(spriteImage) {
    if (isInitialized) return;
    droneSprite = spriteImage;

    drones = [
      createDrone(847, 3009), // Дрон 1
      createDrone(1083, 1349), // Дрон 2 — новый
      createDrone(2742, 1112), // Дрон 3 — новый
    ];

    isInitialized = true;
  }

  function update(deltaTime) {
    if (!isInitialized || drones.length === 0) return;
    if (
      !window.worldSystem ||
      window.worldSystem.currentWorldId !== DRONE_WORLD_ID
    )
      return;

    drones.forEach((drone) => {
      // Анимация кадров
      drone.frameTime += deltaTime;
      if (drone.frameTime >= FRAME_DURATION) {
        drone.frameTime -= FRAME_DURATION;
        drone.frame = (drone.frame + 1) % TOTAL_FRAMES;
      }

      if (drone.state === "hovering") {
        drone.hoverTime += deltaTime;
        if (drone.hoverTime >= drone.hoverDuration) {
          drone.state = "moving";
          drone.hoverTime = 0;
          const t = getRandomTarget();
          drone.targetX = t.x;
          drone.targetY = t.y;
        }
        return;
      }

      // Движение
      const dx = drone.targetX - drone.x;
      const dy = drone.targetY - drone.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 8) {
        drone.x = drone.targetX;
        drone.y = drone.targetY;
        drone.state = "hovering";
        drone.hoverTime = 0;
        drone.hoverDuration = 3000 + Math.random() * 5000;
        return;
      }

      drone.x += (dx / dist) * drone.speed * deltaTime;
      drone.y += (dy / dist) * drone.speed * deltaTime;
    });
  }

  function draw() {
    if (!isInitialized || !droneSprite?.complete) return;
    if (
      !window.worldSystem ||
      window.worldSystem.currentWorldId !== DRONE_WORLD_ID
    )
      return;

    const cam = window.movementSystem.getCamera();

    drones.forEach((drone) => {
      const sx = drone.x - cam.x - SPRITE_WIDTH / 2;
      const sy = drone.y - cam.y - SPRITE_HEIGHT / 2;

      ctx.drawImage(
        droneSprite,
        drone.frame * SPRITE_WIDTH,
        0,
        SPRITE_WIDTH,
        SPRITE_HEIGHT,
        sx,
        sy,
        SPRITE_WIDTH,
        SPRITE_HEIGHT
      );
    });
  }

  return {
    initialize,
    update,
    draw,
    isInitialized: () => isInitialized,
  };
})();
