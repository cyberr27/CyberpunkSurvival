const BULLET_SPEED = 10; // Скорость пули (пикселей за кадр)
const BULLET_SIZE = 5; // Размер пули
const ATTACK_COOLDOWN = 500; // Перезарядка атаки в миллисекундах
const BULLET_LIFETIME = 2000; // Время жизни пули в миллисекундах

let bullets = new Map(); // Хранилище пуль
let lastAttackTime = 0; // Время последней атаки

// Инициализация системы боя
function initializeCombatSystem() {
  const combatBtn = document.getElementById("combatBtn");
  combatBtn.addEventListener("click", (e) => {
    e.preventDefault();
    performAttack(); // Запускаем атаку при клике
  });

  // Добавлено: обработчик пробела для атаки (глобально)
  window.addEventListener("keydown", (e) => {
    if (e.key === " " && !window.isInventoryOpen) {
      // Игнорируем, если инвентарь открыт, чтобы не мешать кнопкам
      e.preventDefault(); // Предотвращаем скролл страницы
      performAttack();
    }
  });
}

// Запуск анимации мигания кнопки при атаке на игрока
function triggerAttackAnimation() {
  const combatBtn = document.getElementById("combatBtn");
  combatBtn.classList.add("under-attack");
  setTimeout(() => {
    combatBtn.classList.remove("under-attack");
  }, 2000); // Анимация длится 2 секунды
}

// Выполнение атаки
function performAttack() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const currentTime = Date.now();
  if (currentTime - lastAttackTime < ATTACK_COOLDOWN) return;

  lastAttackTime = currentTime;
  const equippedWeapon = me.equipment && me.equipment.weapon;
  const currentWorldId = window.worldSystem.currentWorldId;

  if (equippedWeapon && ITEM_CONFIG[equippedWeapon.type].type === "weapon") {
    const weaponConfig = ITEM_CONFIG[equippedWeapon.type];
    const isRanged = weaponConfig.effect.range; // Проверяем, дальнобойное ли оружие

    if (isRanged) {
      // Стрельба из дальнобойного оружия
      const range = weaponConfig.effect.range || 500;
      const damage = weaponConfig.effect.damage || 10;

      const bulletId = `bullet_${Date.now()}_${Math.random()}`;
      const angle = getPlayerAngle(me.direction);

      const bullet = {
        id: bulletId,
        x: me.x + 20,
        y: me.y + 20,
        vx: Math.cos(angle) * BULLET_SPEED,
        vy: Math.sin(angle) * BULLET_SPEED,
        damage: damage,
        range: Math.min(range, BULLET_LIFETIME * BULLET_SPEED),
        ownerId: myId,
        spawnTime: Date.now(),
        worldId: currentWorldId,
      };

      bullets.set(bulletId, bullet);

      sendWhenReady(
        ws,
        JSON.stringify({
          type: "shoot",
          bulletId,
          x: bullet.x,
          y: bullet.y,
          vx: bullet.vx,
          vy: bullet.vy,
          damage: bullet.damage,
          range: bullet.range,
          ownerId: myId,
          worldId: currentWorldId,
        })
      );

      // Обновляем данные игрока на сервере
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "update",
          player: {
            id: myId,
            x: me.x,
            y: me.y,
            health: me.health,
            energy: me.energy,
            food: me.food,
            water: me.water,
            armor: me.armor,
            distanceTraveled: me.distanceTraveled,
            direction: me.direction,
            state: me.state,
            frame: me.frame,
            worldId: currentWorldId,
          },
        })
      );
    } else {
      // Ближний бой: БАЗОВЫЙ 5-10 + бонус оружия
      let weaponMin = 0,
        weaponMax = 0;
      if (weaponConfig.effect.damage?.min) {
        weaponMin = weaponConfig.effect.damage.min;
        weaponMax = weaponConfig.effect.damage.max;
      }

      const baseMin = 5,
        baseMax = 10;
      const totalMin = baseMin + weaponMin;
      const totalMax = baseMax + weaponMax;

      const damage = Math.floor(
        Math.random() * (totalMax - totalMin + 1) + totalMin
      );

      performMeleeAttack(damage, currentWorldId);
    }
  } else {
    // БЕЗ оружия: чисто базовый 5-10
    const damage = Math.floor(Math.random() * 6 + 5); // 5-10
    performMeleeAttack(damage, currentWorldId);
  }
}

// Выполнение атаки ближнего боя (теперь ищет и мутантов, и игроков)
function performMeleeAttack(damage, worldId) {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  // Ищем ближайшую цель: сначала мутант, потом игрок в радиусе 50px
  let closestTargetId = null;
  let closestTargetType = null; // 'enemy' или 'player'
  let minDistSq = 50 * 50; // 2500px²

  // Сначала проверяем мутантов (приоритет PvE)
  enemies.forEach((enemy, enemyId) => {
    if (enemy.health <= 0 || enemy.worldId !== worldId) return;

    // Расстояние от центра игрока (35px) к центру мутанта (35px)
    const dx = me.x + 35 - (enemy.x + 35);
    const dy = me.y + 35 - (enemy.y + 35);
    const distSq = dx * dx + dy * dy;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      closestTargetId = enemyId;
      closestTargetType = "enemy";
    }
  });

  // Если мутант не найден, проверяем игроков (PvP)
  if (!closestTargetId) {
    players.forEach((player, playerId) => {
      if (playerId === myId || player.health <= 0 || player.worldId !== worldId)
        return;

      const dx = me.x + 35 - (player.x + 35);
      const dy = me.y + 35 - (player.y + 35);
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestTargetId = playerId;
        closestTargetType = "player";
      }
    });
  }

  // Если цель найдена - отправляем на сервер
  if (closestTargetId && ws.readyState === WebSocket.OPEN) {
    if (closestTargetType === "enemy") {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "attackEnemy",
          targetId: closestTargetId,
          damage: damage,
          worldId: worldId,
        })
      );
    } else if (closestTargetType === "player") {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "attackPlayer",
          targetId: closestTargetId,
          damage: damage,
          worldId: worldId,
        })
      );
    }
  }
}

function getPlayerAngle(direction) {
  switch (direction) {
    case "up":
      return -Math.PI / 2;
    case "down":
      return Math.PI / 2;
    case "left":
      return Math.PI;
    case "right":
      return 0;
    default:
      return 0;
  }
}

// Обновление пуль
function updateBullets(deltaTime) {
  const currentTime = Date.now();
  const currentWorldId = window.worldSystem.currentWorldId;

  bullets.forEach((bullet, bulletId) => {
    if (bullet.worldId !== currentWorldId) return;

    bullet.x += bullet.vx * (deltaTime / 16.67); // Нормализация по 60 FPS
    bullet.y += bullet.vy * (deltaTime / 16.67);

    // Проверка столкновений с другими пулями
    bullets.forEach((otherBullet, otherBulletId) => {
      if (
        bulletId !== otherBulletId &&
        otherBullet.worldId === currentWorldId &&
        Math.abs(bullet.x - otherBullet.x) < BULLET_SIZE &&
        Math.abs(bullet.y - otherBullet.y) < BULLET_SIZE
      ) {
        bullets.delete(bulletId);
        bullets.delete(otherBulletId);
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "bulletCollision",
            bulletIds: [bulletId, otherBulletId],
            worldId: currentWorldId,
          })
        );
      }
    });

    // Проверка столкновений с игроками (PvP дальнее)
    players.forEach((player, id) => {
      if (
        id !== bullet.ownerId &&
        player.health > 0 &&
        player.worldId === currentWorldId
      ) {
        const dx = bullet.x - (player.x + 20);
        const dy = bullet.y - (player.y + 20);
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
          bullets.delete(bulletId);
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "attackPlayer",
              targetId: id,
              damage: bullet.damage,
              worldId: currentWorldId,
            })
          );
          // Если атакован текущий игрок, запускаем анимацию
          if (id === myId) {
            triggerAttackAnimation();
          }
        }
      }
    });

    // Проверка столкновений с мутантами
    enemies.forEach((enemy, id) => {
      if (enemy.health > 0 && enemy.worldId === currentWorldId) {
        const dx = bullet.x - (enemy.x + 35); // Центр
        const dy = bullet.y - (enemy.y + 35);
        if (Math.sqrt(dx * dx + dy * dy) < 35) {
          // Радиус мутанта ~35
          bullets.delete(bulletId);
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "attackEnemy",
              targetId: id,
              damage: bullet.damage,
              worldId: currentWorldId,
            })
          );
        }
      }
    });

    // Удаление пули по истечении времени жизни или превышения дальности
    const timeElapsed = currentTime - bullet.spawnTime;
    const distanceTraveled = Math.sqrt(
      (bullet.x - (bullet.x - bullet.vx * timeElapsed)) ** 2 +
        (bullet.y - (bullet.y - bullet.vy * timeElapsed)) ** 2
    );
    if (timeElapsed > BULLET_LIFETIME || distanceTraveled > bullet.range) {
      bullets.delete(bulletId);
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "removeBullet",
          bulletId,
          worldId: currentWorldId,
        })
      );
    }
  });
}

// Отрисовка пуль
function drawBullets() {
  const currentWorldId = window.worldSystem.currentWorldId;
  bullets.forEach((bullet) => {
    if (bullet.worldId !== currentWorldId) return;
    const screenX = bullet.x - window.movementSystem.getCamera().x;
    const screenY = bullet.y - window.movementSystem.getCamera().y;
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(screenX, screenY, BULLET_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Синхронизация пуль с сервером
function syncBullets(serverBullets) {
  bullets.clear();
  serverBullets.forEach((bullet) => {
    bullets.set(bullet.id, {
      id: bullet.id,
      x: bullet.x,
      y: bullet.y,
      vx: bullet.vx,
      vy: bullet.vy,
      damage: bullet.damage,
      range: bullet.range,
      ownerId: bullet.ownerId,
      spawnTime: bullet.spawnTime,
      worldId: bullet.worldId,
    });
  });
}

// Экспорт функций
window.combatSystem = {
  initialize: initializeCombatSystem,
  update: updateBullets,
  draw: drawBullets,
  syncBullets,
};
