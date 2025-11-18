// enemySystem.js - Полностью исправленная и масштабируемая версия (2025)

let enemies = new Map(); // Map<enemyId, enemyObject>
let mutantSprite = new Image();

// Константы мутанта (потом вынесем в конфиг при добавлении новых врагов)
const ENEMY_TYPES = {
  mutant: {
    size: 70,
    frames: 40,
    frameDuration: 100,
    maxHealth: 200,
    deathAnimationTime: 1000, // ms
    spriteSrc: "mutantSprite.png",
  },
};

// Инициализация
function initializeEnemySystem() {
  mutantSprite.src = ENEMY_TYPES.mutant.spriteSrc;
}

// === Синхронизация с сервера (новые враги, обновления) ===
function syncEnemies(serverEnemies) {
  const existingIds = new Set(enemies.keys());

  serverEnemies.forEach((serverEnemy) => {
    const existing = enemies.get(serverEnemy.id);

    if (!existing) {
      // Новый враг
      enemies.set(serverEnemy.id, {
        ...serverEnemy,
        type: "mutant", // пока только один тип
        frame: 0,
        frameTime: 0,
        deathStartTime: null, // null = живой
        maxHealth: ENEMY_TYPES.mutant.maxHealth,
      });
    } else {
      // Обновляем позицию, здоровье и т.д.
      if (existing.health > 0 && serverEnemy.health <= 0) {
        // Только что умер — запускаем анимацию смерти
        existing.health = 0;
        existing.state = "dying";
        existing.deathStartTime = Date.now();
      } else if (serverEnemy.health > 0) {
        existing.health = serverEnemy.health;
        existing.state = serverEnemy.state || "idle";
        existing.deathStartTime = null; // на всякий случай
      }

      // Обновляем координаты и направление (интерполяция будет в update)
      existing.x = serverEnemy.x;
      existing.y = serverEnemy.y;
      existing.direction = serverEnemy.direction || "down";
    }

    existingIds.delete(serverEnemy.id);
  });

  // Удаляем тех, кого сервер больше не присылает (уже удалены на сервере)
  existingIds.forEach((id) => enemies.delete(id));
}

// === Обработка смерти от сервера (enemyDied) ===
function handleEnemyDeath(enemyId) {
  const enemy = enemies.get(enemyId);
  if (enemy) {
    enemy.health = 0;
    enemy.state = "dying";
    enemy.deathStartTime = Date.now();
  }
}

// === Обновление анимации и состояния ===
function updateEnemies(deltaTime) {
  const currentWorldId = window.worldSystem.currentWorldId;

  enemies.forEach((enemy, id) => {
    if (enemy.worldId !== currentWorldId) return;

    const config = ENEMY_TYPES[enemy.type];

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

      // Автоудаление после анимации
      if (
        enemy.deathStartTime &&
        Date.now() - enemy.deathStartTime > config.deathAnimationTime
      ) {
        enemies.delete(id);
      }
    }

    // Если живой и не dying — сбрасываем кадр на 0 если idle
    if (enemy.health > 0 && enemy.state !== "walking") {
      enemy.frame = 0;
    }
  });
}

// === Отрисовка ===
function drawEnemies() {
  const currentWorldId = window.worldSystem.currentWorldId;
  const camera = window.movementSystem.getCamera();

  enemies.forEach((enemy) => {
    if (enemy.worldId !== currentWorldId) return;

    const config = ENEMY_TYPES[enemy.type];
    const screenX = enemy.x - camera.x;
    const screenY = enemy.y - camera.y;

    // Куллинг (не рисовать за экраном)
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
    if (mutantSprite.complete) {
      let spriteY = 70; // down по умолчанию
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
        mutantSprite,
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
      (enemy.deathStartTime && Date.now() - enemy.deathStartTime < 500)
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

    // ID (для дебага)
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText(enemy.id.split("_")[0], screenX + 35, screenY - 20);

    // Сброс альфы
    ctx.globalAlpha = 1;
  });
}

// Экспорт
window.enemySystem = {
  initialize: initializeEnemySystem,
  syncEnemies, // вызывается при получении enemyUpdate / newEnemies
  handleEnemyDeath, // вызывается при type: "enemyDied"
  update: updateEnemies,
  draw: drawEnemies,
};
