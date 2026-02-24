let enemies = new Map();
let enemyProjectiles = new Map();

// Конфиг только для отрисовки (на сервере своя копия)
const ENEMY_TYPES = Object.freeze({
  mutant: {
    size: 70,
    frames: 13,
    frameDuration: 110,
    maxHealth: 200,
    spriteKey: "mutantSprite",
    color: "#fbff00",
  },
  scorpion: {
    size: 70,
    frames: 13,
    frameDuration: 110,
    maxHealth: 250,
    spriteKey: "scorpionSprite",
    color: "#00eaff",
  },
  blood_eye: {
    size: 70,
    frames: 13,
    frameDuration: 90,
    maxHealth: 300,
    spriteKey: "bloodEyeSprite",
    color: "#ff0000",
  },
});

const HP_COLORS = Object.freeze({
  low: "#8B0000",
  normal: "#ff0000",
  scorpion_low: "#005577",
  scorpion_normal: "#00eaff",
});

const CULLING_MARGIN = 120;
const HITBOX_RADIUS_SQ = 40 * 40;

function initializeEnemySystem() {}

function syncEnemies(serverEnemies) {
  const currentIds = new Set(enemies.keys());

  for (const srv of serverEnemies) {
    const id = srv.id;
    currentIds.delete(id);

    if (srv.health <= 0) continue;

    const type = srv.type || "mutant";
    const config = ENEMY_TYPES[type] || ENEMY_TYPES.mutant;

    let enemy = enemies.get(id);
    if (enemy) {
      enemy.x = srv.x;
      enemy.y = srv.y;
      enemy.health = srv.health;
      enemy.direction = srv.direction || "down";
      enemy.state = srv.state || "idle";
      enemy.worldId = srv.worldId;
    } else {
      enemies.set(id, {
        id,
        x: srv.x,
        y: srv.y,
        health: srv.health,
        maxHealth: config.maxHealth,
        direction: srv.direction || "down",
        state: srv.state || "idle",
        worldId: srv.worldId,
        type,
        walkFrame: 0,
        walkFrameTime: 0,
      });
    }
  }

  for (const id of currentIds) {
    enemies.delete(id);
  }
}

function handleEnemyDeath(enemyId) {
  enemies.delete(enemyId);
}

function handleNewEnemy(enemyData) {
  if (enemyData.health <= 0) return;

  const type = enemyData.type || "mutant";
  const config = ENEMY_TYPES[type] || ENEMY_TYPES.mutant;

  enemies.set(enemyData.id, {
    ...enemyData,
    type,
    maxHealth: config.maxHealth,
    walkFrame: 0,
    walkFrameTime: 0,
  });
}

// НОВОЕ: проектил от сервера
function handleNewEnemyProjectile(projData) {
  enemyProjectiles.set(projData.id, { ...projData });
}

function updateEnemies(deltaTime) {
  const currentWorldId = window.worldSystem?.currentWorldId;
  if (currentWorldId === undefined) return;

  const now = performance.now();

  // Только анимация (стрельба теперь на сервере)
  for (const enemy of enemies.values()) {
    if (enemy.worldId !== currentWorldId || enemy.health <= 0) continue;

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;

    if (enemy.state === "walking" || enemy.state === "attacking") {
      enemy.walkFrameTime = (enemy.walkFrameTime || 0) + deltaTime;
      if (enemy.walkFrameTime >= config.frameDuration) {
        enemy.walkFrame = ((enemy.walkFrame || 0) + 1) % config.frames;
        enemy.walkFrameTime -= config.frameDuration;
      }
    } else {
      enemy.walkFrame = 0;
      enemy.walkFrameTime = 0;
    }
  }

  // Движение проектил (получаем от сервера, но интерполируем плавно)
  for (const proj of enemyProjectiles.values()) {
    if (proj.worldId !== currentWorldId) continue;
    // Здесь можно добавить небольшую клиентскую интерполяцию, но пока просто храним
  }
}

function drawEnemies() {
  const currentWorldId = window.worldSystem?.currentWorldId;
  if (currentWorldId === undefined) return;

  const camera = window.movementSystem?.getCamera?.();
  if (!camera) return;

  const { x: camX, y: camY } = camera;
  const { width: canvasW, height: canvasH } = canvas;

  ctx.save();

  for (const enemy of enemies.values()) {
    if (enemy.worldId !== currentWorldId || enemy.health <= 0) continue;

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;
    const { size } = config;

    const screenX = enemy.x - camX;
    const screenY = enemy.y - camY - 20;

    if (
      screenX < -size - CULLING_MARGIN ||
      screenX > canvasW + size + CULLING_MARGIN ||
      screenY < -size - CULLING_MARGIN ||
      screenY > canvasH + size + CULLING_MARGIN
    )
      continue;

    const sprite = images[config.spriteKey];

    const sourceX = (enemy.walkFrame * 70) | 0;

    if (sprite?.complete && sprite.width >= 910) {
      ctx.drawImage(sprite, sourceX, 0, 70, 70, screenX, screenY, 70, 70);
    } else {
      ctx.fillStyle = config.color;
      ctx.fillRect(screenX, screenY, 70, 70);
    }

    // Полоска HP
    const hpPercent = Math.max(0, enemy.health / enemy.maxHealth);
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(screenX + 5, screenY - 15, 60, 10);

    const isScorpion = enemy.type === "scorpion";
    const hpColor =
      hpPercent > 0.3
        ? isScorpion
          ? HP_COLORS.scorpion_normal
          : HP_COLORS.normal
        : isScorpion
          ? HP_COLORS.scorpion_low
          : HP_COLORS.low;

    ctx.fillStyle = hpColor;
    ctx.fillRect(screenX + 5, screenY - 15, 60 * hpPercent, 10);

    // Текст
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;

    const hpText = Math.floor(enemy.health);
    ctx.strokeText(hpText, screenX + 35, screenY - 7);
    ctx.fillStyle = "white";
    ctx.fillText(hpText, screenX + 35, screenY - 7);

    ctx.font = "10px Arial";
    ctx.fillStyle = config.color;
    ctx.fillText(enemy.type, screenX + 35, screenY + 80);
  }

  // Отрисовка проектил
  if (enemyProjectiles.size > 0) {
    ctx.fillStyle = "#ff0044";
    ctx.shadowColor = "#ff0044";
    ctx.shadowBlur = 12;

    for (const proj of enemyProjectiles.values()) {
      if (proj.worldId !== currentWorldId) continue;

      const sx = proj.x - camX;
      const sy = proj.y - camY;

      if (sx < -50 || sx > canvasW + 50 || sy < -50 || sy > canvasH + 50)
        continue;

      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// Обработка новых проектил от сервера
function handleNewEnemyProjectile(proj) {
  enemyProjectiles.set(proj.id, { ...proj });
}

// Удаление проектила при попадании или истечении времени (по сообщению от сервера)
function removeEnemyProjectile(projId) {
  enemyProjectiles.delete(projId);
}

window.enemySystem = Object.freeze({
  initialize: initializeEnemySystem,
  syncEnemies,
  handleEnemyDeath,
  handleNewEnemy,
  handleNewEnemyProjectile,
  removeEnemyProjectile,
  update: updateEnemies,
  draw: drawEnemies,
});
