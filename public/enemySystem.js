// enemySystem.js - ОПТИМИЗИРОВАННАЯ, СИНХРОНИЗИРОВАННАЯ, БЕЗ ЛАГОВ ВЕРСИЯ (2025)

let enemies = new Map(); // Map<enemyId, enemyObject>

// Конфиг типов врагов (расширяемо)
const ENEMY_TYPES = {
  mutant: {
    size: 70,
    frames: 40,
    frameDuration: 100,
    maxHealth: 200,
    spriteKey: "mutantSprite",
  },
};

// Инициализация (загрузка спрайтов уже в code.js)
function initializeEnemySystem() {
  // Ничего не делаем — всё готово
}

// === Синхронизация с сервера (основной источник правды) ===
function syncEnemies(serverEnemies) {
  const currentIds = new Set(enemies.keys());

  serverEnemies.forEach((srv) => {
    const id = srv.id;
    currentIds.delete(id);

    // Сервер никогда не шлёт мёртвых — но на всякий случай
    if (srv.health <= 0) {
      enemies.delete(id);
      return;
    }

    const type = srv.type || "mutant";
    const config = ENEMY_TYPES[type] || ENEMY_TYPES.mutant;

    if (enemies.has(id)) {
      // Обновляем существующего
      const e = enemies.get(id);
      e.x = srv.x;
      e.y = srv.y;
      e.health = srv.health;
      e.direction = srv.direction || "down";
      e.state = srv.state || "idle";
      e.frame = srv.frame ?? 0;
      e.worldId = srv.worldId;
      e.maxHealth = config.maxHealth; // в случае смены типа
    } else {
      // Новый враг
      enemies.set(id, {
        id,
        x: srv.x,
        y: srv.y,
        health: srv.health,
        maxHealth: config.maxHealth,
        direction: srv.direction || "down",
        state: srv.state || "idle",
        frame: srv.frame ?? 0,
        frameTime: 0,
        type,
        worldId: srv.worldId,
      });
    }
  });

  // Удаляем тех, кого сервер больше не присылает (умерли или ушли)
  currentIds.forEach((id) => enemies.delete(id));
}

// === Отдельные события от сервера ===
function handleEnemyDeath(enemyId) {
  enemies.delete(enemyId);
}

function handleNewEnemy(enemyData) {
  if (enemyData.health <= 0) return; // на всякий пожарный

  const type = enemyData.type || "mutant";
  const config = ENEMY_TYPES[type] || ENEMY_TYPES.mutant;

  enemies.set(enemyData.id, {
    ...enemyData,
    frameTime: 0,
    maxHealth: config.maxHealth,
  });
}

// === Локальное обновление анимации (только визуал) ===
function updateEnemies(deltaTime) {
  const currentWorldId = window.worldSystem.currentWorldId;
  if (!currentWorldId) return;

  for (const [id, enemy] of enemies) {
    if (enemy.worldId !== currentWorldId) continue;
    if (enemy.health <= 0) {
      enemies.delete(id);
      continue;
    }

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;

    if (enemy.state === "walking") {
      enemy.frameTime += deltaTime;
      if (enemy.frameTime >= config.frameDuration) {
        enemy.frameTime -= config.frameDuration;
        enemy.frame = (enemy.frame + 1) % config.frames;
      }
    } else {
      enemy.frame = 0; // idle / attacking
    }
  }
}

// === Отрисовка ===
function drawEnemies() {
  const currentWorldId = window.worldSystem.currentWorldId;
  const camera = window.movementSystem.getCamera();
  if (!camera || !currentWorldId) return;

  for (const enemy of enemies.values()) {
    if (enemy.worldId !== currentWorldId || enemy.health <= 0) continue;

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;
    const sprite = images[config.spriteKey];

    const screenX = enemy.x - camera.x;
    const screenY = enemy.y - camera.y;

    // Куллинг
    if (
      screenX < -config.size - 50 ||
      screenX > canvas.width + config.size + 50 ||
      screenY < -config.size - 50 ||
      screenY > canvas.height + config.size + 50
    ) {
      continue;
    }

    // Спрайт
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
    const hpPercent = enemy.health / enemy.maxHealth;
    const displayHealth = Math.floor(enemy.health);

    // Фон полоски
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(screenX + 5, screenY - 15, 60, 8);

    // Полоска здоровья
    ctx.fillStyle = displayHealth > 50 ? "#ff0000" : "#8B0000";
    ctx.fillRect(screenX + 5, screenY - 15, 60 * hpPercent, 8);

    // Текст здоровья
    ctx.fillStyle = "white";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.strokeText(`${displayHealth}`, screenX + 35, screenY - 20);
    ctx.fillText(`${displayHealth}`, screenX + 35, screenY - 20);

    // Дебаг ID (можно убрать в релизе)
    ctx.font = "10px Arial";
    ctx.fillStyle = "#ffff00";
    ctx.fillText(enemy.id.split("_")[0], screenX + 35, screenY - 5);
  }
}

// Экспорт
window.enemySystem = {
  initialize: initializeEnemySystem,
  syncEnemies,
  handleEnemyDeath,
  handleNewEnemy, // ← НОВОЕ: сервер шлёт при спавне
  update: updateEnemies,
  draw: drawEnemies,
};
