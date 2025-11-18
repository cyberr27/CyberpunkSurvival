// enemySystem.js - ИСПРАВЛЕННАЯ, БЕЗБАГОВАЯ ВЕРСИЯ (2025)

let enemies = new Map(); // Map<enemyId, enemyObject>

// Загружаем спрайт через images (как все остальные), а не отдельно
let mutantSprite = null;

// Конфиг типов врагов — легко добавлять новых
const ENEMY_TYPES = {
  mutant: {
    size: 70,
    frames: 40,
    frameDuration: 100,
    maxHealth: 200,
    deathAnimationTime: 1000, // ms
    spriteKey: "mutantSprite", // ключ в объекте images
  },
  // Пример для будущего:
  // zombie: { size: 70, frames: 32, frameDuration: 120, maxHealth: 150, deathAnimationTime: 1200, spriteKey: "zombieSprite" },
};

// Инициализация
function initializeEnemySystem() {
  // Спрайт берём из общего кэша изображений (как playerSprite и т.д.)
  mutantSprite = images.mutantSprite || null;
}

// === Синхронизация с сервера ===
function syncEnemies(serverEnemies) {
  const existingIds = new Set(enemies.keys());

  serverEnemies.forEach((serverEnemy) => {
    const existing = enemies.get(serverEnemy.id);

    // Определяем тип врага (по старому — всегда mutant, по новому — если пришло)
    const enemyType = serverEnemy.type || "mutant";

    if (!existing) {
      // Новый враг
      enemies.set(serverEnemy.id, {
        ...serverEnemy,
        type: enemyType,
        frame: 0,
        frameTime: 0,
        deathStartTime: null,
        maxHealth: ENEMY_TYPES[enemyType]?.maxHealth || 200,
      });
    } else {
      // Обновляем существующего
      Object.assign(existing, serverEnemy);
      existing.type = enemyType;

      // Если только что умер
      if (existing.health > 0 && serverEnemy.health <= 0) {
        existing.health = 0;
        existing.state = "dying";
        existing.deathStartTime = Date.now();
      } else if (serverEnemy.health > 0) {
        existing.health = serverEnemy.health;
        existing.state = serverEnemy.state || "idle";
        existing.deathStartTime = null;
      }

      // Позиция и направление (всегда обновляем)
      existing.x = serverEnemy.x;
      existing.y = serverEnemy.y;
      existing.direction = serverEnemy.direction || "down";
      existing.maxHealth = ENEMY_TYPES[enemyType]?.maxHealth || 200;
    }

    existingIds.delete(serverEnemy.id);
  });

  // Удаляем тех, кого сервер больше не шлёт
  existingIds.forEach((id) => enemies.delete(id));
}

// === Обработка смерти (если сервер отдельно шлёт enemyDied) ===
function handleEnemyDeath(enemyId) {
  const enemy = enemies.get(enemyId);
  if (enemy) {
    enemy.health = 0;
    enemy.state = "dying";
    enemy.deathStartTime = Date.now();
  }
}

// === Обновление анимации ===
function updateEnemies(deltaTime) {
  const currentWorldId = window.worldSystem.currentWorldId;

  enemies.forEach((enemy, id) => {
    if (enemy.worldId !== currentWorldId) return;

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;
    if (!config) return;

    // Анимация ходьбы
    if (enemy.state === "walking" && enemy.health > 0) {
      enemy.frameTime += deltaTime;
      if (enemy.frameTime >= config.frameDuration) {
        enemy.frameTime -= config.frameDuration;
        enemy.frame = (enemy.frame + 1) % config.frames;
      }
    }

    // Анимация смерти
    if (enemy.state === "dying") {
      enemy.frameTime += deltaTime;
      if (enemy.frameTime >= config.frameDuration) {
        enemy.frameTime -= config.frameDuration;
        enemy.frame = (enemy.frame + 1) % config.frames;
      }

      // Удаляем после анимации
      if (
        enemy.deathStartTime &&
        Date.now() - enemy.deathStartTime > config.deathAnimationTime
      ) {
        enemies.delete(id);
      }
    }

    // Сброс кадра в idle
    if (enemy.health > 0 && enemy.state !== "walking") {
      enemy.frame = 0;
    }
  });
}

// === Отрисовка ===
function drawEnemies() {
  const currentWorldId = window.worldSystem.currentWorldId;
  const camera = window.movementSystem.getCamera();
  if (!camera) return;

  enemies.forEach((enemy) => {
    if (enemy.worldId !== currentWorldId) return;

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;
    if (!config) return;

    const screenX = enemy.x - camera.x;
    const screenY = enemy.y - camera.y;

    // Куллинг
    if (
      screenX < -config.size - 50 ||
      screenX > canvas.width + config.size + 50 ||
      screenY < -config.size - 50 ||
      screenY > canvas.height + config.size + 50
    )
      return;

    // Fade-out при смерти
    if (enemy.state === "dying" && enemy.deathStartTime) {
      const progress =
        (Date.now() - enemy.deathStartTime) / config.deathAnimationTime;
      ctx.globalAlpha = Math.max(0, 1 - progress);
    }

    // Спрайт
    const sprite = images[config.spriteKey];
    if (sprite?.complete) {
      let spriteY = 70; // down
      switch (enemy.direction) {
        case "up":
          spriteY = 0;
          break;
        case "down":
          spriteY = 70;
          break;
        case "left":
          spriteY = 210;
          break;
        case "right":
          spriteY = 140;
          break;
      }

      ctx.drawImage(
        sprite,
        enemy.frame * 70,
        spriteY,
        70,
        70,
        screenX,
        screenY,
        70,
        70
      );
    } else {
      ctx.fillStyle = "purple";
      ctx.fillRect(screenX, screenY, 70, 70);
    }

    // Здоровье
    if (
      enemy.health > 0 ||
      (enemy.deathStartTime && Date.now() - enemy.deathStartTime < 500)
    ) {
      const displayHealth = Math.max(0, Math.floor(enemy.health));
      const color = displayHealth > 50 ? "red" : "darkred";
      ctx.fillStyle = color;
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 3;
      ctx.strokeText(
        `${displayHealth} / ${config.maxHealth}`,
        screenX + 35,
        screenY - 30
      );
      ctx.fillText(
        `${displayHealth} / ${config.maxHealth}`,
        screenX + 35,
        screenY - 30
      );
    }

    // ID дебага
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText(enemy.id.split("_")[0], screenX + 35, screenY - 20);

    ctx.globalAlpha = 1; // сброс
  });
}

// Экспорт
window.enemySystem = {
  initialize: initializeEnemySystem,
  syncEnemies,
  handleEnemyDeath,
  update: updateEnemies,
  draw: drawEnemies,
};
