// enemySystem.js - ОПТИМИЗИРОВАННАЯ, СИНХРОНИЗИРОВАННАЯ, БЕЗ ЛАГОВ ВЕРСИЯ (2025)

let enemies = new Map(); // Map<enemyId, enemyObject>

// Конфиг типов врагов (расширяемо)
const ENEMY_TYPES = {
  mutant: {
    size: 70,
    frames: 13,
    frameDuration: 110,
    maxHealth: 200,
    spriteKey: "mutantSprite",
  },
  scorpion: {
    size: 70,
    frames: 13,
    frameDuration: 110,
    maxHealth: 250,
    spriteKey: "scorpionSprite",
    speed: 4,
    aggroRange: 300,
    attackCooldown: 1000,
    minDamage: 5,
    maxDamage: 10,
    minEnergy: 2,
    maxEnergy: 3,
  },
};

// === Урон и смерть скорпиона (отдельно, аналогично мутанту) ===
function damageScorpion(scorpionId, damage, attackerId) {
  const enemy = enemies.get(scorpionId);
  if (!enemy || enemy.type !== "scorpion" || enemy.health <= 0) return;
  enemy.health = Math.max(0, enemy.health - damage);
  if (enemy.health === 0) {
    handleScorpionDeath(scorpionId, attackerId);
  }
}

function handleScorpionDeath(scorpionId, killerId) {
  const enemy = enemies.get(scorpionId);
  if (!enemy) return;
  enemies.delete(scorpionId);
  // Найти игрока-убийцу и выдать 20 XP
  if (killerId && players && players.has(killerId)) {
    const player = players.get(killerId);
    if (player) {
      player.xp = (player.xp || 0) + 20;
      // Можно добавить визуальный эффект или всплывающий текст
      if (typeof window.levelSystem?.handleEnemyKill === "function") {
        window.levelSystem.handleEnemyKill({
          type: "scorpion",
          xp: 20,
          playerId: killerId,
        });
      }
    }
  }
}

// === Обработка урона по врагам (вызывается из боевой системы) ===
// Для интеграции: вызывайте window.enemySystem.damageEnemy(enemyId, damage, attackerId)
function damageEnemy(enemyId, damage, attackerId) {
  const enemy = enemies.get(enemyId);
  if (!enemy || enemy.health <= 0) return;
  if (enemy.type === "scorpion") {
    damageScorpion(enemyId, damage, attackerId);
  } else {
    // Старая логика для мутантов (или других типов)
    enemy.health = Math.max(0, enemy.health - damage);
    if (enemy.health === 0) {
      // Можно вызвать handleEnemyDeath(enemyId) или аналогичную функцию
      handleEnemyDeath(enemyId);
      // XP и т.д. — по старой логике
    }
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
  damageEnemy: damageEnemy,
};

// Инициализация (загрузка спрайтов уже в code.js)
function initializeEnemySystem() {
  // Спавним 10 скорпионов в каждом мире, кроме Неонового Города (id: 0)
  if (!window.worldSystem || !window.worldSystem.worlds) return;
  window.worldSystem.worlds.forEach((world) => {
    if (world.id === 0) return;
    let count = 0;
    while (count < 10) {
      const x = Math.floor(Math.random() * (world.w - 70));
      const y = Math.floor(Math.random() * (world.h - 70));
      const id = `scorpion_${world.id}_${count}_${Date.now()}_${Math.floor(
        Math.random() * 10000
      )}`;
      enemies.set(id, {
        id,
        type: "scorpion",
        x,
        y,
        health: ENEMY_TYPES.scorpion.maxHealth,
        maxHealth: ENEMY_TYPES.scorpion.maxHealth,
        direction: "down",
        state: "idle",
        frame: 0,
        frameTime: 0,
        worldId: world.id,
        targetId: null,
        lastAttackTime: 0,
      });
      count++;
    }
  });
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
  if (!currentWorldId && currentWorldId !== 0) return;

  for (const [id, enemy] of enemies) {
    if (enemy.worldId !== currentWorldId) continue;
    if (enemy.health <= 0) {
      enemies.delete(id);
      continue;
    }

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;

    if (enemy.type === "scorpion") {
      // AI: агр на ближайшего игрока в радиусе aggroRange
      let target = null;
      let minDist = config.aggroRange + 1;
      for (const [pid, player] of players) {
        if (player.worldId !== currentWorldId || player.health <= 0) continue;
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist <= config.aggroRange) {
          minDist = dist;
          target = player;
        }
      }
      if (target) {
        // Движение к игроку
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const moveDist = config.speed;
        enemy.x += (dx / len) * moveDist;
        enemy.y += (dy / len) * moveDist;
        enemy.direction =
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? "right"
              : "left"
            : dy > 0
            ? "down"
            : "up";
        // Атака, если в радиусе 50px и кулдаун
        if (minDist <= 50) {
          const now = Date.now();
          if (
            !enemy.lastAttackTime ||
            now - enemy.lastAttackTime > config.attackCooldown
          ) {
            enemy.lastAttackTime = now;
            // Урон по здоровью и энергии
            const dmg =
              Math.floor(
                Math.random() * (config.maxDamage - config.minDamage + 1)
              ) + config.minDamage;
            const energyDmg =
              Math.floor(
                Math.random() * (config.maxEnergy - config.minEnergy + 1)
              ) + config.minEnergy;
            target.health = Math.max(0, target.health - dmg);
            target.energy = Math.max(0, (target.energy || 0) - energyDmg);
            // Визуальный эффект атаки (можно добавить анимацию)
            if (
              typeof window.combatSystem?.triggerAttackAnimation ===
                "function" &&
              target.id === myId
            ) {
              window.combatSystem.triggerAttackAnimation();
            }
            enemy.state = "attacking";
          } else {
            enemy.state = "walking";
          }
        } else {
          enemy.state = "walking";
        }
      } else {
        enemy.state = "idle";
      }
      // Анимация кадров
      enemy.frameTime += deltaTime;
      if (enemy.frameTime >= config.frameDuration) {
        enemy.frameTime -= config.frameDuration;
        enemy.frame = (enemy.frame + 1) % config.frames;
      }
      // Запоминаем позицию для следующего кадра
      enemy.prevX = enemy.x;
      enemy.prevY = enemy.y;
      continue; // Не трогаем мутантов!
    }

    // === Мутанты (старая логика, не трогать) ===
    const prevX = enemy.prevX || enemy.x;
    const prevY = enemy.prevY || enemy.y;
    const isMoving =
      Math.abs(enemy.x - prevX) > 0.5 || Math.abs(enemy.y - prevY) > 0.5;
    if (isMoving) {
      enemy.frameTime += deltaTime;
      if (enemy.frameTime >= config.frameDuration) {
        enemy.frameTime -= config.frameDuration;
        enemy.frame = (enemy.frame + 1) % config.frames;
      }
      enemy.state = "walking";
    } else {
      enemy.frame = 0;
      enemy.frameTime = 0;
      enemy.state = "idle";
    }
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;
  }
}

// === Отрисовка ===
function drawEnemies() {
  const currentWorldId = window.worldSystem.currentWorldId;
  const camera = window.movementSystem.getCamera();
  if (!camera && currentWorldId !== 0) return;

  for (const [id, enemy] of enemies) {
    if (enemy.worldId !== currentWorldId || enemy.health <= 0) continue;
    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;
    const sprite = images[config.spriteKey];
    const screenX = enemy.x - camera.x;
    const screenY = enemy.y - camera.y - 20;
    // Куллинг
    if (
      screenX < -config.size - 100 ||
      screenX > canvas.width + config.size + 100 ||
      screenY < -config.size - 100 ||
      screenY > canvas.height + config.size + 100
    ) {
      continue;
    }
    // === Рисуем ===
    if (sprite?.complete && sprite.width >= 910) {
      let sourceX = 0;
      if (enemy.state === "walking") {
        sourceX = enemy.frame * 70;
      } else if (enemy.state === "attacking") {
        sourceX = 12 * 70;
      } else {
        sourceX = 0;
      }
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
    // === Здоровье ===
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
    ctx.fillStyle = "white";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.strokeText(`${Math.floor(enemy.health)}`, screenX + 35, screenY - 7);
    ctx.fillText(`${Math.floor(enemy.health)}`, screenX + 35, screenY - 7);
    // Дебаг ID
    ctx.font = "10px Arial";
    ctx.fillStyle = enemy.type === "scorpion" ? "#00eaff" : "#ffff00";
    ctx.textAlign = "center";
    ctx.fillText(enemy.type, screenX + 35, screenY + 80);
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
