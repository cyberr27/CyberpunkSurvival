let enemies = new Map();
let enemyProjectiles = new Map();

// Конфиг типов врагов (заморожен для лучшей оптимизации)
const ENEMY_TYPES = Object.freeze({
  mutant: {
    size: 70,
    frames: 13,
    frameDuration: 110,
    maxHealth: 200,
    spriteKey: "mutantSprite",
    speed: 2,
    color: "#fbff00", // жёлто-зелёный для имени/типа
  },
  scorpion: {
    size: 70,
    frames: 13,
    frameDuration: 110,
    maxHealth: 250,
    spriteKey: "scorpionSprite",
    speed: 6,
    aggroRange: 300,
    attackCooldown: 1000,
    minDamage: 5,
    maxDamage: 10,
    minEnergy: 1,
    maxEnergy: 2,
    color: "#00eaff", // голубой
  },
  blood_eye: {
    size: 70,
    frames: 13,
    frameDuration: 90,
    maxHealth: 300,
    spriteKey: "bloodEyeSprite",
    speed: 3.2,
    aggroRange: 300,
    attackCooldown: 2000,
    projectileSpeed: 20,
    minDamage: 12,
    maxDamage: 18,
    attackType: "projectile",
    color: "#ff0000",
  },
});

// Цвета для полоски здоровья (низкий/нормальный)
const HP_COLORS = Object.freeze({
  low: "#8B0000",
  normal: "#ff0000",
  scorpion_low: "#005577",
  scorpion_normal: "#00eaff",
});

// ─── Вспомогательные константы ───────────────────────────────────────
const CULLING_MARGIN = 120;
const PROJECTILE_LIFETIME = 8000;
const HITBOX_RADIUS_SQ = 40 * 40;

// ─── Инициализация (пустая, спавн только с сервера) ──────────────────
function initializeEnemySystem() {}

// ─── Синхронизация врагов с сервера ──────────────────────────────────
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
      // Обновляем только необходимые поля
      enemy.x = srv.x;
      enemy.y = srv.y;
      enemy.health = srv.health;
      enemy.direction = srv.direction || "down";
      enemy.state = srv.state || "idle";
      enemy.worldId = srv.worldId;
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
        worldId: srv.worldId,
        type,
        walkFrame: 0,
        walkFrameTime: 0,
      });
    }
  }

  // Удаляем пропавшие враги (один проход)
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

// ─── Обновление (анимация + логика пуль) ─────────────────────────────
function updateEnemies(deltaTime) {
  const currentWorldId = window.worldSystem?.currentWorldId;
  if (currentWorldId === undefined) return;

  const now = performance.now();

  // Обновление анимации и логики blood_eye
  for (const enemy of enemies.values()) {
    if (enemy.worldId !== currentWorldId || enemy.health <= 0) continue;

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;

    // ─── Логика стрельбы только blood_eye ───────────────────────────
    if (enemy.type === "blood_eye" && enemy.lastAttackTime !== undefined) {
      if (now - enemy.lastAttackTime >= config.attackCooldown) {
        let closest = null;
        let minDistSq = Infinity;

        for (const p of players.values()) {
          if (p.worldId !== currentWorldId || p.health <= 0) continue;
          const dx = p.x - enemy.x;
          const dy = p.y - enemy.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            closest = p;
          }
        }

        if (closest && minDistSq < config.aggroRange ** 2) {
          const angle = Math.atan2(closest.y - enemy.y, closest.x - enemy.x);

          const bulletId = `eproj_${enemy.id}_${now | 0}`;
          const speedFactor = (config.projectileSpeed * 16.666) / 5000;

          enemyProjectiles.set(bulletId, {
            id: bulletId,
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * speedFactor,
            vy: Math.sin(angle) * speedFactor,
            damage:
              Math.floor(
                Math.random() * (config.maxDamage - config.minDamage + 1)
              ) + config.minDamage,
            spawnTime: now,
            ownerEnemyId: enemy.id,
            worldId: currentWorldId,
          });

          enemy.lastAttackTime = now;
          enemy.state = "attacking";
        }
      }
    }

    // ─── Плавная анимация ходьбы для всех ─────────────────────────────
    if (enemy.state === "walking" || enemy.state === "attacking") {
      enemy.walkFrameTime += deltaTime;
      if (enemy.walkFrameTime >= config.frameDuration) {
        enemy.walkFrame = (enemy.walkFrame + 1) % config.frames;
        enemy.walkFrameTime -= config.frameDuration;
      }
    } else {
      enemy.walkFrame = 0;
      enemy.walkFrameTime = 0;
    }
  }

  // ─── Обновление и чистка пуль ─────────────────────────────────────
  for (const [id, proj] of enemyProjectiles) {
    if (proj.worldId !== currentWorldId) continue;

    proj.x += proj.vx * deltaTime;
    proj.y += proj.vy * deltaTime;

    if (now - proj.spawnTime > PROJECTILE_LIFETIME) {
      enemyProjectiles.delete(id);
      continue;
    }

    const me = players.get(myId);
    if (me && me.health > 0) {
      const dx = me.x + 35 - proj.x;
      const dy = me.y + 35 - proj.y;
      if (dx * dx + dy * dy < HITBOX_RADIUS_SQ) {
        me.health = Math.max(0, me.health - (proj.damage || 0));

        // ─── Новый урон по еде от blood_eye ────────────────────────────────
        if (proj.foodDamage > 0) {
          const me = players.get(myId);
          if (me) {
            me.food = Math.max(0, me.food - proj.foodDamage);

            showNotification?.(
              `-${proj.foodDamage} 🍗`,
              me.x + 35,
              me.y + 10,
              "#ff6600",
              1400
            );
          }
        }

        updateStatsDisplay?.();
        enemyProjectiles.delete(id);
      }
    }
  }
}

// ─── Отрисовка ───────────────────────────────────────────────────────
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

    // Быстрый куллинг
    if (
      screenX < -size - CULLING_MARGIN ||
      screenX > canvasW + size + CULLING_MARGIN ||
      screenY < -size - CULLING_MARGIN ||
      screenY > canvasH + size + CULLING_MARGIN
    ) {
      continue;
    }

    const sprite = images[config.spriteKey];

    // Кадр анимации
    const sourceX = (enemy.walkFrame * 70) | 0;

    // Рисуем спрайт / заглушка
    if (sprite?.complete && sprite.width >= 910) {
      ctx.drawImage(sprite, sourceX, 0, 70, 70, screenX, screenY, 70, 70);
    } else {
      ctx.fillStyle = enemy.type === "scorpion" ? "#00eaff" : "purple";
      ctx.fillRect(screenX, screenY, 70, 70);
      ctx.fillStyle = enemy.type === "scorpion" ? "#003344" : "red";
      ctx.font = "30px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        enemy.type === "scorpion" ? "S" : "M",
        screenX + 35,
        screenY + 50
      );
    }

    // Полоска здоровья — исправленная логика цвета
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

    // Текст здоровья + тип врага
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;

    // Здоровье
    const hpText = Math.floor(enemy.health);
    ctx.strokeText(hpText, screenX + 35, screenY - 7);
    ctx.fillStyle = "white";
    ctx.fillText(hpText, screenX + 35, screenY - 7);

    // Тип врага (цвет теперь из конфига)
    ctx.font = "10px Arial";
    ctx.fillStyle = config.color;
    ctx.fillText(enemy.type, screenX + 35, screenY + 80);
  }

  // ─── Проектили ─────────────────────────────────────────────────────
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

// Экспорт
window.enemySystem = Object.freeze({
  initialize: initializeEnemySystem,
  syncEnemies,
  handleEnemyDeath,
  handleNewEnemy,
  update: updateEnemies,
  draw: drawEnemies,
});
