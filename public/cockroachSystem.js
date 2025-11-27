// cockroachSystem.js
// Тараканы теперь во ВСЕХ мирах! (0, 1, 2)
// Оптимизация на максимум: спавн при входе в мир, очистка при выходе, минимум CPU

const COCKROACH_COUNT = 33;
const COCKROACH_SIZE = 10;
const NORMAL_SPEED = 0.5;
const SCARED_SPEED = 2.8; // Быстро убегают
const SCARE_RANGE = 50; // Чувствуют тебя издалека
const PANIC_DURATION = 800; // Дольше паникуют
const FRAME_DURATION = 80; // Плавная анимация при беге

let cockroaches = [];
let cockroachSprite = null;
let currentWorldId = -1; // Отслеживаем, в каком мире мы сейчас

const cockroachSystem = {
  initialize(spriteImage) {
    cockroachSprite = spriteImage;
  },

  update(deltaTime) {
    if (!cockroachSprite?.complete) return;

    const worldId = window.worldSystem.currentWorldId;

    // Если сменили мир — пересоздаём тараканов под новый мир
    if (worldId !== currentWorldId) {
      currentWorldId = worldId;
      this.spawnCockroachesForCurrentWorld();
    }

    // Если тараканов нет — ничего не делаем
    if (cockroaches.length === 0) return;

    const me = players.get(myId);
    if (!me) return;

    const playerCX = me.x + 35;
    const playerCY = me.y + 35;
    const world = window.worldSystem.getCurrentWorld();

    for (let i = 0; i < cockroaches.length; i++) {
      const c = cockroaches[i];

      const dx = playerCX - c.x;
      const dy = playerCY - c.y;
      const distSq = dx * dx + dy * dy;

      // Паника: игрок рядом!
      if (distSq < SCARE_RANGE * SCARE_RANGE) {
        const angle = Math.atan2(dy, dx);
        c.vx = -Math.cos(angle) * SCARED_SPEED;
        c.vy = -Math.sin(angle) * SCARED_SPEED;
        c.panicTimer = PANIC_DURATION;
      }
      // Паника заканчивается — возвращаемся к блужданию
      else if (c.panicTimer > 0) {
        c.panicTimer -= deltaTime;
        if (c.panicTimer <= 0) {
          c.vx = (Math.random() - 0.5) * NORMAL_SPEED * 2;
          c.vy = (Math.random() - 0.5) * NORMAL_SPEED * 2;
        }
      }
      // Спокойное блуждание — редко меняем направление
      else if (Math.random() < 0.005) {
        c.vx = (Math.random() - 0.5) * NORMAL_SPEED * 2;
        c.vy = (Math.random() - 0.5) * NORMAL_SPEED * 2;
      }

      // Движение
      c.x += c.vx * (deltaTime / 16);
      c.y += c.vy * (deltaTime / 16);

      // Отскок от стен
      if (c.x <= 60 || c.x >= world.w - 60) c.vx *= -1;
      if (c.y <= 60 || c.y >= world.h - 60) c.vy *= -1;

      // Кламп в границы (на всякий)
      c.x = Math.max(60, Math.min(world.w - 60, c.x));
      c.y = Math.max(60, Math.min(world.h - 60, c.y));

      // Анимация только при беге
      if (Math.abs(c.vx) > 2 || Math.abs(c.vy) > 2) {
        c.frameTime += deltaTime;
        if (c.frameTime >= FRAME_DURATION) {
          c.frameTime = 0;
          c.frame = (c.frame + 1) % 13;
        }
      }
    }
  },

  // Спавн тараканов именно для текущего мира
  spawnCockroachesForCurrentWorld() {
    const world = window.worldSystem.getCurrentWorld();
    if (!world) return;

    cockroaches.length = 0; // Полная очистка

    for (let i = 0; i < COCKROACH_COUNT; i++) {
      cockroaches.push({
        x: 80 + Math.random() * (world.w - 160),
        y: 80 + Math.random() * (world.h - 160),
        vx: (Math.random() - 0.5) * NORMAL_SPEED * 2,
        vy: (Math.random() - 0.5) * NORMAL_SPEED * 2,
        frame: Math.floor(Math.random() * 13),
        frameTime: 0,
        panicTimer: 0,
      });
    }
  },

  draw() {
    if (cockroaches.length === 0 || !cockroachSprite?.complete) return;

    const camera = window.movementSystem.getCamera();

    for (let i = 0; i < cockroaches.length; i++) {
      const c = cockroaches[i];
      const screenX = c.x - camera.x - COCKROACH_SIZE / 2;
      const screenY = c.y - camera.y - COCKROACH_SIZE / 2;

      // Куллинг — не рисуем за экраном
      if (
        screenX < -60 ||
        screenX > canvas.width + 60 ||
        screenY < -60 ||
        screenY > canvas.height + 60
      )
        continue;

      ctx.drawImage(
        cockroachSprite,
        c.frame * 70,
        0,
        70,
        70,
        screenX,
        screenY,
        COCKROACH_SIZE,
        COCKROACH_SIZE
      );
    }
  },
};

// Экспортируем
window.cockroachSystem = cockroachSystem;
