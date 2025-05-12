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

  // Обработчик атаки по нажатию мыши
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      const me = players.get(myId);
      if (!me || me.health <= 0) return;
      if (isInventoryOpen || chatContainer.style.display === "flex") return;
      performAttack();
    }
  });

  // Обработчик атаки по касанию (для мобильных устройств)
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const me = players.get(myId);
    if (!me || me.health <= 0) return;
    if (isInventoryOpen || chatContainer.style.display === "flex") return;
    performAttack();
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
  if (!me || me.health <= 0 || me.energy <= 0) return;

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
      me.energy = Math.max(0, me.energy - 1); // Расход энергии при выстреле

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
      // Ближний бой
      let damage;
      if (
        weaponConfig.effect.damage &&
        weaponConfig.effect.damage.min &&
        weaponConfig.effect.damage.max
      ) {
        // Для оружия с диапазоном урона (кастет, нож, бита)
        damage = Math.floor(
          Math.random() *
            (weaponConfig.effect.damage.max -
              weaponConfig.effect.damage.min +
              1) +
            weaponConfig.effect.damage.min
        );
      } else {
        // Для других случаев (если вдруг есть оружие без диапазона)
        damage = (Math.random() * 10 + (weaponConfig.effect.damage || 0)) | 0;
      }
      performMeleeAttack(damage, currentWorldId);
    }
  } else {
    // Атака без оружия (кулаками)
    const damage = (Math.random() * 10) | 0;
    performMeleeAttack(damage, currentWorldId);
  }
}

// Выполнение атаки ближнего боя
function performMeleeAttack(damage, worldId) {
  const me = players.get(myId);
  const attackRange = 50; // Дальность атаки
  let hit = false; // Флаг успешного попадания

  // Проверка игроков
  players.forEach((player, id) => {
    if (id !== myId && player.health > 0 && player.worldId === worldId) {
      const dx = player.x - me.x;
      const dy = player.y - me.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= attackRange) {
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

  // Проверка волков (если в мире 1)
  if (worldId === 1) {
    window.wolfSystem.wolves.forEach((wolf, wolfId) => {
      if (wolf.health > 0) {
        const dx = wolf.x - me.x;
        const dy = wolf.y - me.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= attackRange) {
          hit = true;
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "attackWolf",
              wolfId,
              damage,
              worldId,
            })
          );
        }
      }
    });
  }

  // Обновляем данные игрока на сервере, если была затрачена энергия
  if (hit) {
    me.energy = Math.max(0, me.energy - 1); // Расход энергии при попадании
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

// Получение угла поворота игрока
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

    // Проверка столкновений с волками
    if (currentWorldId === 1) {
      window.wolfSystem.wolves.forEach((wolf, wolfId) => {
        if (wolf.health > 0) {
          const dx = bullet.x - (wolf.x + 20);
          const dy = bullet.y - (wolf.y + 20);
          if (Math.sqrt(dx * dx + dy * dy) < 20) {
            bullets.delete(bulletId);
            sendWhenReady(
              ws,
              JSON.stringify({
                type: "attackWolf",
                wolfId,
                damage: bullet.damage,
                worldId: currentWorldId,
              })
            );
            // Проверяем, убил ли выстрел волка
            if (wolf.health - bullet.damage <= 0) {
              window.wolfSystem.handleWolfDeath(wolfId, myId);
            }
          }
        }
      });
    }

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
