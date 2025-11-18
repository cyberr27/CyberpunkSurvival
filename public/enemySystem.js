// enemySystem.js - ФИНАЛЬНАЯ, СТАБИЛЬНАЯ ВЕРСИЯ (без дёрганья, без зависаний)

let enemies = new Map(); // Map<enemyId, enemyObject>

// Конфиг врагов
const ENEMY_TYPES = {
  mutant: {
    size: 70,
    frames: 40,
    frameDuration: 100,
    maxHealth: 200,
    deathAnimationTime: 800, // ms — короче, чтобы не ждать вечно
    spriteKey: "mutantSprite",
  },
};

// Инициализация
function initializeEnemySystem() {
  // Ничего не делаем — спрайт берётся из общего images
}

// === Синхронизация с сервера ===
function syncEnemies(serverEnemies) {
  const existingIds = new Set(enemies.keys());

  serverEnemies.forEach((serverEnemy) => {
    const existing = enemies.get(serverEnemy.id);
    const enemyType = serverEnemy.type || "mutant";
    const config = ENEMY_TYPES[enemyType] || ENEMY_TYPES.mutant;

    if (!existing) {
      // Новый враг — всегда живой
      enemies.set(serverEnemy.id, {
        ...serverEnemy,
        type: enemyType,
        frame: 0,
        frameTime: 0,
        deathStartTime: null,
        isDead: false, // ФЛАГ: мёртв и не трогаем больше
        maxHealth: config.maxHealth,
      });
    } else {
      // === ВАЖНО: если уже помечен как мёртвый — НЕ ТРОГАЕМ НИЧЕГО ===
      if (existing.isDead) {
        existingIds.delete(serverEnemy.id);
        return;
      }

      // Обновляем только живых
      existing.x = serverEnemy.x;
      existing.y = serverEnemy.y;
      existing.direction = serverEnemy.direction || "down";
      existing.state = serverEnemy.state || "idle";

      // Если здоровье упало до 0 — запускаем смерть ОДИН РАЗ
      if (existing.health > 0 && serverEnemy.health <= 0) {
        existing.health = 0;
        existing.state = "dying";
        existing.deathStartTime = Date.now();
        existing.isDead = true; // Больше не обновляем!
      } else if (serverEnemy.health > 0) {
        existing.health = serverEnemy.health;
      }
    }

    existingIds.delete(serverEnemy.id);
  });

  // Удаляем тех, кого сервер больше не шлёт (на всякий пожарный)
  existingIds.forEach((id) => enemies.delete(id));
}

// === Обработка отдельного сообщения о смерти (если есть) ===
function handleEnemyDeath(enemyId) {
  const enemy = enemies.get(enemyId);
  if (enemy && !enemy.isDead) {
    enemy.health = 0;
    enemy.state = "dying";
    enemy.deathStartTime = Date.now();
    enemy.isDead = true;
  }
}

// === Обновление анимации (только для видимого мира) ===
function updateEnemies(deltaTime) {
  const currentWorldId = window.worldSystem.currentWorldId;

  enemies.forEach((enemy, id) => {
    if (enemy.worldId !== currentWorldId) return;
    if (enemy.isDead && !enemy.deathStartTime) return; // на всякий

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;

    // Анимация ходьбы (только если живой)
    if (!enemy.isDead && enemy.state === "walking") {
      enemy.frameTime += deltaTime;
      if (enemy.frameTime >= config.frameDuration) {
        enemy.frameTime -= config.frameDuration;
        enemy.frame = (enemy.frame + 1) % config.frames;
      }
    }

    // Анимация смерти
    if (enemy.state === "dying" && enemy.deathStartTime) {
      enemy.frameTime += deltaTime;
      if (enemy.frameTime >= config.frameDuration) {
        enemy.frameTime -= config.frameDuration;
        enemy.frame = (enemy.frame + 1) % config.frames;
      }

      // Удаляем после анимации
      if (Date.now() - enemy.deathStartTime > config.deathAnimationTime) {
        enemies.delete(id);
      }
    }

    // Сброс кадра в idle
    if (!enemy.isDead && enemy.state !== "walking") {
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
      let spriteY = 70; // down по дефолту
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

    // Здоровье (только если живой или в начале смерти)
    if (
      enemy.health > 0 ||
      (enemy.deathStartTime && Date.now() - enemy.deathStartTime < 400)
    ) {
      const displayHealth = Math.max(0, Math.floor(enemy.health));
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
    }

    // ID дебага (по желанию)
    // ctx.fillStyle = "white";
    // ctx.font = "12px Arial";
    // ctx.fillText(enemy.id.split("_")[0], screenX + 35, screenY - 20);

    ctx.globalAlpha = 1;
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
