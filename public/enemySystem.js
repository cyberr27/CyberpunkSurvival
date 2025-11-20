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
    aggroRange: 300,
    speed: 2,
    attackCooldown: 1000,
    attack: function (enemy, player) {
      // Мутант наносит только урон по здоровью (10-15)
      const dmg = Math.floor(Math.random() * 6) + 10;
      player.health = Math.max(0, player.health - dmg);
      return { health: dmg, energy: 0 };
    },
  },
  scorpion: {
    size: 70,
    frames: 13,
    frameDuration: 110,
    maxHealth: 120,
    spriteKey: "scorpionSprite",
    aggroRange: 300,
    speed: 6,
    attackCooldown: 1000,
    attack: function (enemy, player) {
      // Скорпион: 5-10 урона по здоровью, 2-3 по энергии
      const dmgHealth = Math.floor(Math.random() * 6) + 5;
      const dmgEnergy = Math.floor(Math.random() * 2) + 2;
      player.health = Math.max(0, player.health - dmgHealth);
      player.energy = Math.max(0, player.energy - dmgEnergy);
      return { health: dmgHealth, energy: dmgEnergy };
    },
  },
};

// Инициализация (загрузка спрайтов уже в code.js)
function initializeEnemySystem() {
  // Автоспавн 10 скорпионов в каждом мире кроме неонового города (id !== 0)
  if (window.worldSystem && window.worldSystem.worlds) {
    window.worldSystem.worlds.forEach((world) => {
      if (world.id === 0) return;
      let count = 0;
      // Проверяем, есть ли уже скорпионы в этом мире
      for (const enemy of enemies.values()) {
        if (enemy.type === "scorpion" && enemy.worldId === world.id) count++;
      }
      for (let i = count; i < 10; i++) {
        const id = `scorpion_${world.id}_${i}_${Date.now()}_${Math.floor(
          Math.random() * 10000
        )}`;
        enemies.set(id, {
          id,
          x: Math.random() * world.w,
          y: Math.random() * world.h,
          health: ENEMY_TYPES.scorpion.maxHealth,
          maxHealth: ENEMY_TYPES.scorpion.maxHealth,
          direction: "down",
          state: "idle",
          frame: 0,
          frameTime: 0,
          type: "scorpion",
          worldId: world.id,
          lastAttackTime: 0,
          targetId: null,
        });
      }
    });
  }
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

  const myPlayer = players.get(myId);

  for (const [id, enemy] of enemies) {
    if (enemy.worldId !== currentWorldId) continue;
    if (enemy.health <= 0) {
      enemies.delete(id);
      continue;
    }

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;

    // === AI: агр и атака на игрока (только если игрок жив и есть myPlayer) ===
    if (myPlayer && myPlayer.health > 0) {
      const dx = myPlayer.x - enemy.x;
      const dy = myPlayer.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < config.aggroRange) {
        // Двигаемся к игроку
        if (dist > 40) {
          const moveDist = config.speed * (deltaTime / 16.67);
          if (dist > 0) {
            enemy.x += (dx / dist) * moveDist;
            enemy.y += (dy / dist) * moveDist;
          }
          enemy.state = "walking";
          if (Math.abs(dx) > Math.abs(dy)) {
            enemy.direction = dx > 0 ? "right" : "left";
          } else {
            enemy.direction = dy > 0 ? "down" : "up";
          }
        } else {
          // Атака
          const now = Date.now();
          if (!enemy.lastAttackTime) enemy.lastAttackTime = 0;
          if (now - enemy.lastAttackTime >= (config.attackCooldown || 1000)) {
            enemy.lastAttackTime = now;
            enemy.state = "attacking";
            const result = config.attack(enemy, myPlayer);
            // Визуализация урона (можно добавить эффект)
            // Можно добавить всплывающий текст урона
          } else {
            enemy.state = "idle";
          }
        }
      } else {
        enemy.state = "idle";
      }
    }

    // Анимация
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
    } else {
      enemy.frame = 0;
      enemy.frameTime = 0;
    }
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;
  }
}

// === Отрисовка ===
function drawEnemies() {
  const currentWorldId = window.worldSystem.currentWorldId;
  const camera = window.movementSystem.getCamera();
  if (!camera || !currentWorldId) return;

  for (const [id, enemy] of enemies) {
    if (enemy.worldId !== currentWorldId || enemy.health <= 0) continue;

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;
    const sprite = images[config.spriteKey];

    const screenX = enemy.x - camera.x;
    const screenY = enemy.y - camera.y - 20; // чуть приподнимаем, чтобы не в земле стоял

    // Куллинг
    if (
      screenX < -config.size - 100 ||
      screenX > canvas.width + config.size + 100 ||
      screenY < -config.size - 100 ||
      screenY > canvas.height + config.size + 100
    ) {
      continue;
    }

    // === Рисуем врага (одна строка, 13 кадров) ===
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
      ctx.fillStyle = enemy.type === "scorpion" ? "orange" : "purple";
      ctx.fillRect(screenX, screenY, 70, 70);
      ctx.fillStyle = "red";
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
      hpPercent > 0.3
        ? enemy.type === "scorpion"
          ? "#00ffcc"
          : "#ff0000"
        : enemy.type === "scorpion"
        ? "#008080"
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
    ctx.fillStyle = enemy.type === "scorpion" ? "#00ffcc" : "#ffff00";
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
