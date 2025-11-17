// combatSystem.js - ИЗМЕНЁННЫЙ ПОЛНОСТЬЮ
const BULLET_SPEED = 10; // Скорость пули (пикселей за кадр)
const BULLET_SIZE = 5; // Размер пули
const ATTACK_COOLDOWN = 1000; // Перезарядка атаки в миллисекундах
const BULLET_LIFETIME = 2000; // Время жизни пули в миллисекундах
const BASE_MELEE_MIN_DAMAGE = 5; // Базовый мин. урон ближнего боя
const BASE_MELEE_MAX_DAMAGE = 10; // Базовый макс. урон ближнего боя
const MELEE_ATTACK_RANGE = 50; // Дальность атаки ближнего боя

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
// Выполнение атаки
function performAttack() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const currentTime = Date.now();
  if (currentTime - lastAttackTime < ATTACK_COOLDOWN) return;

  lastAttackTime = currentTime;
  const equippedWeapon = me.equipment && me.equipment.weapon;
  const weaponConfig =
    equippedWeapon &&
    ITEM_CONFIG[equippedWeapon.type] &&
    ITEM_CONFIG[equippedWeapon.type].type === "weapon"
      ? ITEM_CONFIG[equippedWeapon.type]
      : null;

  const isRanged = weaponConfig && !!weaponConfig.effect?.range;

  // === НОВАЯ ЛОГИКА УРОНА: сначала берём player.damage, если его нет — старый расчёт ===
  let damage = me.damage; // ← основной урон игрока (будет задаваться при экипировке)

  if (damage === undefined) {
    // Если player.damage не задан — считаем по-старому (ничего не ломаем)
    if (isRanged) {
      damage = weaponConfig.effect.damage || 10;
    } else {
      // Ближний бой или кулаки
      let minDamage = BASE_MELEE_MIN_DAMAGE;
      let maxDamage = BASE_MELEE_MAX_DAMAGE;

      if (
        weaponConfig?.effect?.damage &&
        typeof weaponConfig.effect.damage === "object" &&
        weaponConfig.effect.damage.min !== undefined
      ) {
        minDamage += weaponConfig.effect.damage.min;
        maxDamage += weaponConfig.effect.damage.max;
      }
      damage = Math.floor(
        Math.random() * (maxDamage - minDamage + 1) + minDamage
      );
    }
  }

  const currentWorldId = window.worldSystem.currentWorldId;

  if (isRanged) {
    // === ДАЛЬНОБОЙНАЯ АТАКА (оставляем как было, только damage новый) ===
    const range = weaponConfig.effect.range || 500;

    const bulletId = `bullet_${Date.now()}_${Math.random()}`;
    const angle = getPlayerAngle(me.direction);

    const bullet = {
      id: bulletId,
      x: me.x + 20,
      y: me.y + 20,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      damage: damage, // ← теперь player.damage
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
        damage: damage, // ← теперь player.damage
        range: bullet.range,
        ownerId: myId,
        worldId: currentWorldId,
      })
    );

    // Обновляем данные игрока на сервере (оставляем как было)
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
    // === БЛИЖНИЙ БОЙ (или кулаки) — используем тот же damage ===
    performMeleeAttack(damage, currentWorldId);
  }
}

// Выполнение атаки ближнего боя (ДОБАВЛЕНА ПРОВЕРКА ВРАГОВ)
function performMeleeAttack(damage, worldId) {
  const me = players.get(myId);
  let hit = false; // Флаг успешного попадания

  // Проверка игроков
  players.forEach((player, id) => {
    if (id !== myId && player.health > 0 && player.worldId === worldId) {
      const dx = player.x - me.x;
      const dy = player.y - me.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= MELEE_ATTACK_RANGE) {
        hit = true;
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "attackPlayer",
            targetId: id,
            damage,
            worldId,
          })
        );
      }
    }
  });

  // ДОБАВЛЕНО: Проверка врагов (динамично: шлём на сервер, здоровье обновится через "enemyUpdate")
  enemies.forEach((enemy, enemyId) => {
    if (enemy.health > 0 && enemy.worldId === worldId) {
      const dx = enemy.x - me.x;
      const dy = enemy.y - me.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= MELEE_ATTACK_RANGE) {
        hit = true;
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "attackEnemy",
            targetId: enemyId,
            damage,
            worldId,
          })
        );
      }
    }
  });

  // Обновляем данные игрока на сервере, если была затрачена энергия (ОСТАВЛЯЕМ КАК ЕСТЬ)
  if (hit) {
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
          worldId,
        },
      })
    );
  }

  return hit; // Возвращаем, была ли атака успешной
}

// Получение угла поворота игрока (БЕЗ ИЗМЕНЕНИЙ)
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

// Обновление пуль (БЕЗ ИЗМЕНЕНИЙ, но добавлена динамичная проверка врагов)
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

    // Проверка столкновений с игроками
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

// Отрисовка пуль (БЕЗ ИЗМЕНЕНИЙ)
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

// Синхронизация пуль с сервером (БЕЗ ИЗМЕНЕНИЙ)
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
