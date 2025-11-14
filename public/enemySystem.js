// enemySystem.js

const ENEMY_CONFIG = {
  count: 10,
  worldId: 1, // Пустоши
  health: 40,
  speed: 50, // пикселей в секунду
  attackRange: 300,
  attackCooldown: 1500, // мс между выстрелами
  bulletSpeed: 8,
  bulletDamage: { min: 5, max: 15 },
  bulletColor: "#00ff88",
  bulletSize: 6,
  respawnTime: 0, // мгновенно
};

let enemies = new Map(); // id → enemy
let enemyBullets = new Map();
let lastEnemyAttack = new Map(); // enemyId → timestamp

function initializeEnemySystem() {
  // Ничего не делаем при инициализации — спавн в updateEnemies
}

function spawnEnemiesIfNeeded() {
  const worldId = ENEMY_CONFIG.worldId;
  const playerInWorld = Array.from(players.values()).some(
    (p) => p.worldId === worldId
  );
  const currentCount = Array.from(enemies.values()).filter(
    (e) => e.worldId === worldId
  ).length;

  if (!playerInWorld && currentCount > 0) {
    // Удаляем всех мобов, если нет игроков
    enemies.forEach((enemy, id) => {
      if (enemy.worldId === worldId) {
        enemies.delete(id);
        sendWhenReady(ws, JSON.stringify({ type: "removeEnemy", enemyId: id }));
      }
    });
    enemyBullets.forEach((_, id) => {
      if (id.startsWith(`enemy_bullet_`)) {
        enemyBullets.delete(id);
      }
    });
    return;
  }

  if (playerInWorld && currentCount < ENEMY_CONFIG.count) {
    const toSpawn = ENEMY_CONFIG.count - currentCount;
    for (let i = 0; i < toSpawn; i++) {
      spawnEnemy(worldId);
    }
  }
}

function spawnEnemy(worldId) {
  const world = window.worldSystem.worlds.find((w) => w.id === worldId);
  if (!world) return;

  const id = `enemy_${Date.now()}_${Math.random()}`;
  const enemy = {
    id,
    x: Math.random() * (world.w - 80) + 40,
    y: Math.random() * (world.h - 80) + 40,
    health: ENEMY_CONFIG.health,
    maxHealth: ENEMY_CONFIG.health,
    worldId,
    direction: "down",
    targetPlayerId: null,
    lastMoveTime: 0,
  };

  enemies.set(id, enemy);
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "spawnEnemy",
      enemy: { id, x: enemy.x, y: enemy.y, health: enemy.health, worldId },
    })
  );
}

function updateEnemies(deltaTime) {
  const worldId = ENEMY_CONFIG.worldId;
  const now = Date.now();

  spawnEnemiesIfNeeded();

  enemies.forEach((enemy, id) => {
    if (enemy.worldId !== worldId || enemy.health <= 0) return;

    let closestPlayer = null;
    let minDist = Infinity;

    // Ищем ближайшего игрока в мире
    players.forEach((player) => {
      if (player.worldId !== worldId || player.health <= 0) return;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closestPlayer = player;
      }
    });

    if (!closestPlayer) {
      enemy.targetPlayerId = null;
      return;
    }

    const dist = Math.sqrt(minDist);
    enemy.targetPlayerId = closestPlayer.id;

    // Движение к игроку, если далеко
    if (dist > ENEMY_CONFIG.attackRange) {
      const moveSpeed = ENEMY_CONFIG.speed * (deltaTime / 1000);
      const dx = closestPlayer.x - enemy.x;
      const dy = closestPlayer.y - enemy.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        enemy.x += (dx / len) * moveSpeed;
        enemy.y += (dy / len) * moveSpeed;
        enemy.direction = getDirectionFromVector(dx / len, dy / len);
      }
    }

    // Атака, если в радиусе
    if (dist <= ENEMY_CONFIG.attackRange) {
      const lastAttack = lastEnemyAttack.get(id) || 0;
      if (now - lastAttack >= ENEMY_CONFIG.attackCooldown) {
        lastEnemyAttack.set(id, now);
        shootAtPlayer(enemy, closestPlayer);
      }
    }

    // Ограничиваем в мире
    const world = window.worldSystem.getCurrentWorld();
    enemy.x = Math.max(40, Math.min(world.w - 40, enemy.x));
    enemy.y = Math.max(40, Math.min(world.h - 40, enemy.y));

    // Отправляем обновление (редко)
    if (now - enemy.lastMoveTime > 200) {
      enemy.lastMoveTime = now;
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "updateEnemy",
          enemyId: id,
          x: enemy.x,
          y: enemy.y,
          direction: enemy.direction,
        })
      );
    }
  });

  updateEnemyBullets(deltaTime);
}

function shootAtPlayer(enemy, player) {
  const bulletId = `enemy_bullet_${Date.now()}_${Math.random()}`;
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const damage =
    Math.floor(
      Math.random() *
        (ENEMY_CONFIG.bulletDamage.max - ENEMY_CONFIG.bulletDamage.min + 1)
    ) + ENEMY_CONFIG.bulletDamage.min;

  const bullet = {
    id: bulletId,
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * ENEMY_CONFIG.bulletSpeed,
    vy: Math.sin(angle) * ENEMY_CONFIG.bulletSpeed,
    damage,
    ownerId: enemy.id,
    worldId: enemy.worldId,
    spawnTime: Date.now(),
  };

  enemyBullets.set(bulletId, bullet);

  sendWhenReady(
    ws,
    JSON.stringify({
      type: "enemyShoot",
      bulletId,
      x: bullet.x,
      y: bullet.y,
      vx: bullet.vx,
      vy: bullet.vy,
      damage: bullet.damage,
      ownerId: enemy.id,
      worldId: enemy.worldId,
    })
  );
}

function updateEnemyBullets(deltaTime) {
  const now = Date.now();
  const worldId = ENEMY_CONFIG.worldId;

  enemyBullets.forEach((bullet, id) => {
    if (bullet.worldId !== worldId) return;

    bullet.x += bullet.vx * (deltaTime / 16.67);
    bullet.y += bullet.vy * (deltaTime / 16.67);

    // Проверка попадания в игрока
    players.forEach((player) => {
      if (player.worldId !== worldId || player.health <= 0) return;
      const dx = bullet.x - (player.x + 20);
      const dy = bullet.y - (player.y + 20);
      if (Math.sqrt(dx * dx + dy * dy) < 25) {
        enemyBullets.delete(id);
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "attackPlayer",
            targetId: player.id,
            damage: bullet.damage,
            worldId,
          })
        );
        if (player.id === myId) {
          window.combatSystem.triggerAttackAnimation();
        }
      }
    });

    // Удаление по времени
    if (now - bullet.spawnTime > 3000) {
      enemyBullets.delete(id);
      sendWhenReady(
        ws,
        JSON.stringify({ type: "removeEnemyBullet", bulletId: id })
      );
    }
  });
}

function drawEnemies() {
  const camera = window.movementSystem.getCamera();
  const worldId = ENEMY_CONFIG.worldId;

  enemies.forEach((enemy) => {
    if (enemy.worldId !== worldId || enemy.health <= 0) return;

    const screenX = enemy.x - camera.x;
    const screenY = enemy.y - camera.y;

    if (
      screenX < -100 ||
      screenX > canvas.width + 100 ||
      screenY < -100 ||
      screenY > canvas.height + 100
    )
      return;

    // Рисуем тело
    ctx.fillStyle = "#ff0066";
    ctx.fillRect(screenX - 20, screenY - 20, 40, 40);

    // Глаза
    ctx.fillStyle = "#00ff88";
    ctx.fillRect(screenX - 10, screenY - 10, 8, 8);
    ctx.fillRect(screenX + 2, screenY - 10, 8, 8);

    // Здоровье
    ctx.fillStyle = "red";
    ctx.fillRect(screenX - 20, screenY - 30, 40, 4);
    ctx.fillStyle = "lime";
    ctx.fillRect(
      screenX - 20,
      screenY - 30,
      (enemy.health / enemy.maxHealth) * 40,
      4
    );
  });

  // Рисуем пули
  enemyBullets.forEach((bullet) => {
    if (bullet.worldId !== worldId) return;
    const screenX = bullet.x - camera.x;
    const screenY = bullet.y - camera.y;
    ctx.fillStyle = ENEMY_CONFIG.bulletColor;
    ctx.beginPath();
    ctx.arc(screenX, screenY, ENEMY_CONFIG.bulletSize / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function getDirectionFromVector(dx, dy) {
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle > -22.5 && angle <= 22.5) return "right";
  if (angle > 22.5 && angle <= 67.5) return "down-right";
  if (angle > 67.5 && angle <= 112.5) return "down";
  if (angle > 112.5 && angle <= 157.5) return "down-left";
  if (angle > 157.5 || angle <= -157.5) return "left";
  if (angle > -157.5 && angle <= -112.5) return "up-left";
  if (angle > -112.5 && angle <= -67.5) return "up";
  if (angle > -67.5 && angle <= -22.5) return "up-right";
  return "down";
}

// === СИНХРОНИЗАЦИЯ С СЕРВЕРОМ ===
function syncEnemies(serverEnemies) {
  enemies.clear();
  serverEnemies.forEach((e) => {
    enemies.set(e.id, { ...e });
  });
}

function syncEnemyBullets(serverBullets) {
  enemyBullets.clear();
  serverBullets.forEach((b) => {
    enemyBullets.set(b.id, { ...b });
  });
}

function handleEnemyDeath(enemyId, killerId) {
  const enemy = enemies.get(enemyId);
  if (!enemy) return;

  enemies.delete(enemyId);
  sendWhenReady(ws, JSON.stringify({ type: "removeEnemy", enemyId }));

  // Даём XP
  if (killerId && players.has(killerId)) {
    window.levelSystem.handleItemPickup("mushroom", true); // 5xp как редкий предмет
    window.levelSystem.handleItemPickup("mushroom", true);
    window.levelSystem.handleItemPickup("mushroom", true);
    window.levelSystem.handleItemPickup("mushroom", true);
    window.levelSystem.handleItemPickup("mushroom", true);
  }

  // Респаун
  setTimeout(() => spawnEnemy(enemy.worldId), ENEMY_CONFIG.respawnTime);
}

// Экспорт
window.enemySystem = {
  initialize: initializeEnemySystem,
  update: updateEnemies,
  draw: drawEnemies,
  syncEnemies,
  syncEnemyBullets,
  handleEnemyDeath,
};
