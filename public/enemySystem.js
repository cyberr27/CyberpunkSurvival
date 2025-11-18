// enemySystem.js - ПРОСТАЯ, НАДЁЖНАЯ, БЕЗ ЗАВИСАНИЙ ВЕРСИЯ (2025)

let enemies = new Map(); // Map<enemyId, enemyObject>

// Конфиг типов врагов
const ENEMY_TYPES = {
  mutant: {
    size: 70,
    frames: 40,
    frameDuration: 100,
    maxHealth: 200,
    spriteKey: "mutantSprite",
  },
};

// Инициализация
function initializeEnemySystem() {
  // Ничего не делаем — спрайт берётся из images.mutantSprite
}

// === Синхронизация с сервера ===
function syncEnemies(serverEnemies) {
  const existingIds = new Set(enemies.keys());

  serverEnemies.forEach((serverEnemy) => {
    const id = serverEnemy.id;

    // Если здоровье <= 0 — НЕ ДОБАВЛЯЕМ И НЕ ОБНОВЛЯЕМ — просто игнорируем
    if (serverEnemy.health <= 0) {
      enemies.delete(id);
      existingIds.delete(id);
      return;
    }

    const enemyType = serverEnemy.type || "mutant";
    const config = ENEMY_TYPES[enemyType] || ENEMY_TYPES.mutant;

    if (!existingIds.has(id)) {
      // Новый живой враг
      enemies.set(id, {
        ...serverEnemy,
        type: enemyType,
        frame: 0,
        frameTime: 0,
        maxHealth: config.maxHealth,
      });
    } else {
      // Обновляем существующего (только если живой)
      const existing = enemies.get(id);
      existing.x = serverEnemy.x;
      existing.y = serverEnemy.y;
      existing.health = serverEnemy.health;
      existing.direction = serverEnemy.direction || "down";
      existing.state = serverEnemy.state || "idle";
      existing.maxHealth = config.maxHealth;
    }

    existingIds.delete(id);
  });

  // Удаляем всех, кого сервер больше не шлёт (вдруг умерли)
  existingIds.forEach((id) => enemies.delete(id));
}

// === Если сервер отдельно шлёт enemyDied (на всякий случай) ===
function handleEnemyDeath(enemyId) {
  enemies.delete(enemyId);
}

// === Обновление анимации (только для живых) ===
function updateEnemies(deltaTime) {
  const currentWorldId = window.worldSystem.currentWorldId;

  enemies.forEach((enemy, id) => {
    if (enemy.worldId !== currentWorldId) return;

    // Если по какой-то причине здоровье упало до 0 — удаляем сразу
    if (enemy.health <= 0) {
      enemies.delete(id);
      return;
    }

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;

    // Анимация только при движении
    if (enemy.state === "walking") {
      enemy.frameTime += deltaTime;
      if (enemy.frameTime >= config.frameDuration) {
        enemy.frameTime -= config.frameDuration;
        enemy.frame = (enemy.frame + 1) % config.frames;
      }
    } else {
      enemy.frame = 0; // idle — первый кадр
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
    if (enemy.health <= 0) return; // на всякий случай

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;

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
    const displayHealth = Math.floor(enemy.health);
    ctx.fillStyle = displayHealth > 50 ? "red" : "darkred";
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

    // ID дебага
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText(enemy.id.split("_")[0], screenX + 35, screenY - 20);
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
