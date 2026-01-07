// combatSystem.js - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ С ПОДДЕРЖКОЙ ДВУХ ОРУЖИЙ

const BULLET_SPEED = 12;
const BULLET_SIZE = 6;
const ATTACK_COOLDOWN = 500; // Кулдаун атаки (ms)
const MELEE_ATTACK_RANGE = 60; // Увеличил чуть для удобства

let bullets = new Map();
let lastAttackTime = 0;

// Инициализация кнопки и управления атакой
function initializeCombatSystem() {
  const combatBtn = document.getElementById("combatBtn");

  let attackInterval = null;

  const startAttack = () => {
    performAttack();
    if (attackInterval === null) {
      attackInterval = setInterval(performAttack, ATTACK_COOLDOWN);
    }
  };

  const stopAttack = () => {
    if (attackInterval !== null) {
      clearInterval(attackInterval);
      attackInterval = null;
    }
  };

  // Клик / тач
  combatBtn.addEventListener("click", (e) => {
    e.preventDefault();
    performAttack();
  });

  combatBtn.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      startAttack();
    },
    { passive: false }
  );
  combatBtn.addEventListener("touchend", stopAttack);
  combatBtn.addEventListener("touchcancel", stopAttack);

  // Мышь (удержание)
  combatBtn.addEventListener("mousedown", (e) => {
    if (e.button === 0) startAttack();
  });
  combatBtn.addEventListener("mouseup", stopAttack);
  combatBtn.addEventListener("mouseleave", stopAttack);

  // Пробел
  window.addEventListener("keydown", (e) => {
    if (e.key === " " && !window.isInventoryOpen && !window.isEquipmentOpen) {
      e.preventDefault();
      performAttack();
    }
  });
}

// Анимация получения урона
function triggerAttackAnimation() {
  const combatBtn = document.getElementById("combatBtn");
  combatBtn.classList.add("under-attack");
  setTimeout(() => combatBtn.classList.remove("under-attack"), 2000);
}

// Основная функция атаки
function performAttack() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const currentTime = Date.now();
  if (currentTime - lastAttackTime < ATTACK_COOLDOWN) return;

  lastAttackTime = currentTime;

  // Сбрасываем анимацию атаки
  me.state = "attacking";
  me.attackFrame = 0;
  me.attackFrameTime = 0;

  const currentWorldId = window.worldSystem.currentWorldId;

  // Проверяем, есть ли дальнобойное оружие
  const weaponSlot = me.equipment?.weapon;
  const offhandSlot = me.equipment?.offhand;

  let isRanged = false;
  let range = 0;
  let damage = 0;

  // Проверяем основное оружие
  if (weaponSlot && ITEM_CONFIG[weaponSlot.type]?.effect?.range) {
    const config = ITEM_CONFIG[weaponSlot.type];
    isRanged = true;
    range = config.effect.range || 500;
    damage = config.effect.damage || 10;
    if (weaponSlot.type === "plasma_rifle") {
      range = 700;
      damage = 50;
    }
  }

  // Если дальнобойное — стреляем
  if (isRanged) {
    const angle = getPlayerAngle(me.direction);
    const startX = me.x + 35;
    const startY = me.y + 35;

    const bulletId = `bullet_${Date.now()}_${Math.random()}`;
    const bullet = {
      id: bulletId,
      x: startX,
      y: startY,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      damage,
      range,
      ownerId: myId,
      worldId: currentWorldId,
      startX,
      startY,
    };

    bullets.set(bulletId, bullet);

    sendWhenReady(
      ws,
      JSON.stringify({
        type: "shoot",
        bulletId,
        x: startX,
        y: startY,
        vx: bullet.vx,
        vy: bullet.vy,
        damage,
        range,
        ownerId: myId,
        worldId: currentWorldId,
      })
    );
  } else {
    // БЛИЖНИЙ БОЙ — считаем урон из equipmentSystem
    const meleeDamage = window.equipmentSystem.getCurrentMeleeDamage();
    const finalDamage =
      Math.floor(Math.random() * (meleeDamage.max - meleeDamage.min + 1)) +
      meleeDamage.min;

    // Проверяем попадание по игрокам и врагам в радиусе
    let hitSomething = false;

    // По игрокам
    players.forEach((player, id) => {
      if (
        hitSomething ||
        id === myId ||
        player.health <= 0 ||
        player.worldId !== currentWorldId
      )
        return;

      const dx = player.x + 35 - (me.x + 35);
      const dy = player.y + 35 - (me.y + 35);
      if (Math.sqrt(dx * dx + dy * dy) < MELEE_ATTACK_RANGE) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "meleeAttackPlayer",
            targetId: id,
            damage: finalDamage,
            worldId: currentWorldId,
          })
        );
        if (id === myId) triggerAttackAnimation();
        hitSomething = true;
      }
    });

    // По врагам
    if (!hitSomething) {
      enemies.forEach((enemy, id) => {
        if (
          hitSomething ||
          enemy.health <= 0 ||
          enemy.worldId !== currentWorldId
        )
          return;

        const dx = enemy.x + 35 - (me.x + 35);
        const dy = enemy.y + 35 - (me.y + 35);
        if (Math.sqrt(dx * dx + dy * dy) < MELEE_ATTACK_RANGE) {
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "meleeAttackEnemy",
              targetId: id,
              damage: finalDamage,
              worldId: currentWorldId,
            })
          );
          hitSomething = true;
        }
      });
    }
  }

  // Отправляем состояние атаки другим игрокам
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "update",
      player: {
        id: myId,
        state: "attacking",
        attackFrame: 0,
        attackFrameTime: 0,
        direction: me.direction,
      },
    })
  );
}

// Угол направления
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
  const currentWorldId = window.worldSystem.currentWorldId;

  const bulletsToRemove = [];

  bullets.forEach((bullet) => {
    if (bullet.worldId !== currentWorldId) return;

    bullet.x += bullet.vx * (deltaTime / 16.67);
    bullet.y += bullet.vy * (deltaTime / 16.67);

    let hit = false;

    // Попадание по игрокам
    players.forEach((player, id) => {
      if (
        hit ||
        id === bullet.ownerId ||
        player.health <= 0 ||
        player.worldId !== currentWorldId
      )
        return;
      const dx = bullet.x - (player.x + 35);
      const dy = bullet.y - (player.y + 35);
      if (Math.sqrt(dx * dx + dy * dy) < 35) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "bulletHitPlayer",
            targetId: id,
            damage: bullet.damage,
            bulletId: bullet.id,
            worldId: currentWorldId,
          })
        );
        hit = true;
      }
    });

    // Попадание по врагам
    if (!hit) {
      enemies.forEach((enemy, id) => {
        if (hit || enemy.health <= 0 || enemy.worldId !== currentWorldId)
          return;
        const dx = bullet.x - (enemy.x + 35);
        const dy = bullet.y - (enemy.y + 35);
        if (Math.sqrt(dx * dx + dy * dy) < 35) {
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "bulletHitEnemy",
              targetId: id,
              damage: bullet.damage,
              bulletId: bullet.id,
              worldId: currentWorldId,
            })
          );
          hit = true;
        }
      });
    }

    if (hit) {
      bulletsToRemove.push(bullet.id);
    } else {
      // Проверка по дистанции
      const dist = Math.hypot(
        bullet.x - bullet.startX,
        bullet.y - bullet.startY
      );
      if (dist > bullet.range) {
        bulletsToRemove.push(bullet.id);
      }
    }
  });

  // Удаляем пули
  bulletsToRemove.forEach((id) => {
    bullets.delete(id);
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "removeBullet",
        bulletId: id,
        worldId: currentWorldId,
      })
    );
  });
}

// Отрисовка пуль
function drawBullets() {
  const currentWorldId = window.worldSystem.currentWorldId;
  bullets.forEach((bullet) => {
    if (bullet.worldId !== currentWorldId) return;

    const screenX = bullet.x - window.movementSystem.getCamera().x;
    const screenY = bullet.y - window.movementSystem.getCamera().y;

    // Трейл
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = bullet.damage >= 50 ? "#00ffff" : "#ff6666";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX - bullet.vx * 4, screenY - bullet.vy * 4);
    ctx.stroke();
    ctx.restore();

    // Свечение
    const grad = ctx.createRadialGradient(
      screenX,
      screenY,
      1,
      screenX,
      screenY,
      BULLET_SIZE * 2
    );
    grad.addColorStop(0, bullet.damage >= 50 ? "#00ffff" : "#ffffff");
    grad.addColorStop(0.5, bullet.damage >= 50 ? "#00ffffaa" : "#ff6666aa");
    grad.addColorStop(1, "transparent");

    ctx.fillStyle = grad;
    ctx.shadowBlur = bullet.damage >= 50 ? 20 : 12;
    ctx.shadowColor = bullet.damage >= 50 ? "#00ffff" : "#ff6666";
    ctx.beginPath();
    ctx.arc(screenX, screenY, BULLET_SIZE * 2, 0, Math.PI * 2);
    ctx.fill();

    // Ядро
    ctx.fillStyle = bullet.damage >= 50 ? "#00ffff" : "#ffffff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(screenX, screenY, BULLET_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function syncBullets(serverBullets) {
  bullets.clear();
  serverBullets.forEach((b) =>
    bullets.set(b.id, { ...b, startX: b.x, startY: b.y })
  );
}

window.combatSystem = {
  initialize: initializeCombatSystem,
  update: updateBullets,
  draw: drawBullets,
  syncBullets,
  resetAttackState: () => {
    const me = players.get(myId);
    if (me) {
      me.state = "idle";
      me.attackFrame = 0;
    }
  },
};
