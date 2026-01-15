let enemies = new Map();
let enemyProjectiles = new Map();

// Конфиг типов врагов
const ENEMY_TYPES = {
  mutant: {
    size: 70,
    frames: 13,
    frameDuration: 110,
    maxHealth: 200,
    spriteKey: "mutantSprite",
    speed: 2,
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
  },
  blood_eye: {
    size: 70,
    frames: 13,
    frameDuration: 90, // чуть быстрее анимация
    maxHealth: 300,
    spriteKey: "bloodEyeSprite",
    speed: 3.2, // медленнее скорпиона
    aggroRange: 300,
    attackCooldown: 2000,
    projectileSpeed: 20, // px/s
    minDamage: 12,
    maxDamage: 18,
    attackType: "projectile",
  },
};

function initializeEnemySystem() {
  // Спавн только с сервера
}

// === Синхронизация с сервера ===
function syncEnemies(serverEnemies) {
  const currentIds = new Set(enemies.keys());

  serverEnemies.forEach((srv) => {
    const id = srv.id;
    currentIds.delete(id);

    if (srv.health <= 0) {
      enemies.delete(id);
      return;
    }

    const type = srv.type || "mutant";
    const config = ENEMY_TYPES[type] || ENEMY_TYPES.mutant;

    if (enemies.has(id)) {
      const e = enemies.get(id);
      e.x = srv.x;
      e.y = srv.y;
      e.health = srv.health;
      e.direction = srv.direction || "down";
      e.state = srv.state || "idle";
      e.worldId = srv.worldId;
      e.type = type;
      e.maxHealth = config.maxHealth;
      // frame с сервера игнорируем для анимации ходьбы — у нас своя
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
        // Локальные поля для плавной анимации
        walkFrame: 0,
        walkFrameTime: 0,
      });
    }
  });

  // Удаляем исчезнувших
  currentIds.forEach((id) => enemies.delete(id));
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

function updateEnemies(deltaTime) {
  const currentWorldId = window.worldSystem.currentWorldId;
  if (currentWorldId === undefined) return;

  const now = performance.now();

  for (const enemy of enemies.values()) {
    if (enemy.worldId !== currentWorldId || enemy.health <= 0) continue;

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;

    // ─── Логика стрельбы только для blood_eye ────────────────────────
    if (enemy.type === "blood_eye") {
      if (!enemy.lastAttackTime) enemy.lastAttackTime = 0;

      if (now - enemy.lastAttackTime >= config.attackCooldown) {
        // Ищем ближайшего игрока (аналогично серверу)
        let closest = null;
        let minDistSq = Infinity;

        players.forEach((p) => {
          if (p.worldId !== currentWorldId || p.health <= 0) return;
          const dx = p.x - enemy.x;
          const dy = p.y - enemy.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            closest = p;
          }
        });

        if (closest && minDistSq < config.aggroRange ** 2) {
          const angle = Math.atan2(closest.y - enemy.y, closest.x - enemy.x);

          const bulletId = `eproj_${enemy.id}_${now}`;
          const vx =
            ((Math.cos(angle) * config.projectileSpeed) / 1000) * 16.666; // ~60fps
          const vy =
            ((Math.sin(angle) * config.projectileSpeed) / 1000) * 16.666;

          enemyProjectiles.set(bulletId, {
            id: bulletId,
            x: enemy.x,
            y: enemy.y,
            vx,
            vy,
            damage:
              Math.floor(
                Math.random() * (config.maxDamage - config.minDamage + 1)
              ) + config.minDamage,
            spawnTime: now,
            ownerEnemyId: enemy.id,
            worldId: currentWorldId,
          });

          enemy.lastAttackTime = now;
          enemy.state = "attacking"; // для красивой анимации
        }
      }
    }

    // ─── Обычная анимация ходьбы (остаётся как было) ────────
    if (enemy.state === "walking") {
      enemy.walkFrameTime = (enemy.walkFrameTime || 0) + deltaTime;
      if (enemy.walkFrameTime >= config.frameDuration) {
        enemy.walkFrame = (enemy.walkFrame + 1) % config.frames;
        enemy.walkFrameTime -= config.frameDuration;
      }
    } else {
      enemy.walkFrame = 0;
      enemy.walkFrameTime = 0;
    }
  }

  // Двигаем и чистим пули врагов
  for (const [id, proj] of enemyProjectiles) {
    if (proj.worldId !== currentWorldId) continue;

    proj.x += proj.vx * deltaTime;
    proj.y += proj.vy * deltaTime;

    // Удаляем старые пули (8 секунд жизни например)
    if (now - proj.spawnTime > 8000) {
      enemyProjectiles.delete(id);
      continue;
    }

    // Проверка попадания по игроку (мой персонаж)
    const me = players.get(myId);
    if (me && me.health > 0) {
      const dx = me.x + 35 - proj.x;
      const dy = me.y + 35 - proj.y;
      if (dx * dx + dy * dy < 40 * 40) {
        // хитбокс ~40px
        me.health = Math.max(0, me.health - proj.damage);
        updateStatsDisplay();
        enemyProjectiles.delete(id);

        // Визуальный эффект попадания можно добавить позже
      }
    }
  }
}

// === Отрисовка ===
function drawEnemies() {
  const currentWorldId = window.worldSystem.currentWorldId;
  if (currentWorldId === undefined) return;

  const camera = window.movementSystem.getCamera();
  if (!camera) return;

  const camX = camera.x;
  const camY = camera.y;
  const canvasW = canvas.width;
  const canvasH = canvas.height;

  for (const enemy of enemies.values()) {
    if (enemy.worldId !== currentWorldId || enemy.health <= 0) continue;

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;
    const size = config.size;

    const screenX = enemy.x - camX;
    const screenY = enemy.y - camY - 20;

    // Куллинг
    if (
      screenX < -size - 100 ||
      screenX > canvasW + size + 100 ||
      screenY < -size - 100 ||
      screenY > canvasH + size + 100
    ) {
      continue;
    }

    const sprite = images[config.spriteKey];

    // Определяем текущий кадр
    let sourceX = 0;
    if (enemy.state === "walking") {
      sourceX = enemy.walkFrame * 70;
    } else if (enemy.state === "attacking") {
      sourceX = 12 * 70; // атака начинается с 12-го кадра
    }
    // idle — sourceX = 0

    // Рисуем спрайт или заглушку
    if (sprite?.complete && sprite.width >= 910) {
      ctx.drawImage(sprite, sourceX, 0, 70, 70, screenX, screenY, 70, 70);
    } else {
      ctx.fillStyle = enemy.type === "scorpion" ? "#00eaff" : "purple";
      ctx.fillRect(screenX, screenY, 70, 70);
      ctx.fillStyle = enemy.type === "scorpion" ? "#003344" : "red";
      ctx.font = "30px Arial";
      ctx.fillText(
        enemy.type === "scorpion" ? "S" : "M",
        screenX + 20,
        screenY + 50
      );
    }

    // Полоска здоровья
    const hpPercent = enemy.health / enemy.maxHealth;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(screenX + 5, screenY - 15, 60, 10);

    ctx.fillStyle =
      enemy.type === "scorpion"
        ? hpPercent > 0.3
          ? "#00eaff"
          : "#005577"
        : hpPercent > 0.3
        ? "#ff0000"
        : "#8B0000";
    ctx.fillRect(screenX + 5, screenY - 15, 60 * hpPercent, 10);

    // Текст здоровья
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.strokeText(`${Math.floor(enemy.health)}`, screenX + 35, screenY - 7);
    ctx.fillStyle = "white";
    ctx.fillText(`${Math.floor(enemy.health)}`, screenX + 35, screenY - 7);

    // Дебаг: тип врага
    ctx.font = "10px Arial";
    ctx.fillStyle = enemy.type === "scorpion" ? "#00eaff" : "#ffff00";
    ctx.fillText(enemy.type, screenX + 35, screenY + 80);
  }

  ctx.fillStyle = "#ff0044"; // ярко-красный
  ctx.shadowColor = "#ff0044";
  ctx.shadowBlur = 12;

  for (const proj of enemyProjectiles.values()) {
    if (proj.worldId !== currentWorldId) continue;

    const sx = proj.x - camX;
    const sy = proj.y - camY;

    if (
      sx < -50 ||
      sx > canvas.width + 50 ||
      sy < -50 ||
      sy > canvas.height + 50
    )
      continue;

    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fill();

    // Можно добавить "хвост" или свечение — по желанию
  }
  ctx.shadowBlur = 0;
}

// Экспорт
window.enemySystem = {
  initialize: initializeEnemySystem,
  syncEnemies,
  handleEnemyDeath,
  handleNewEnemy,
  update: updateEnemies,
  draw: drawEnemies,
};
