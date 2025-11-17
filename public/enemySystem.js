// enemySystem.js - Клиентская логика для врагов (мутантов)

const ENEMY_SPEED = 2; // Скорость движения мутантов (px/кадр)
const AGGRO_RANGE = 300; // Радиус аггро (px)
const ATTACK_RANGE = 50; // Радиус атаки (px)
const ENEMY_ATTACK_COOLDOWN = 2000; // Перезарядка атаки (ms) — переименовано, чтобы избежать конфликта с combatSystem.js
const MUTANT_SIZE = 70; // Размер спрайта (как у игроков)
const MUTANT_FRAMES = 40; // Кадры анимации
const MUTANT_FRAME_DURATION = 100; // ms на кадр

let enemies = new Map(); // Хранилище врагов: key = enemyId, value = {id, x, y, health, direction, state, frame, worldId, lastAttackTime, deathTime}
let mutantSprite; // Изображение спрайта

// Инициализация системы врагов
function initializeEnemySystem() {
  mutantSprite = new Image();
  mutantSprite.src = "mutantSprite.png";
  mutantSprite.onload = () => {}; // Убрал console.log для оптимизации
  mutantSprite.onerror = () => {}; // Убрал console.error
}

// Синхронизация врагов с сервером (оптимизировано: пропускаем мёртвых, добавляем max health 200 для проверки)
function syncEnemies(serverEnemies) {
  enemies.clear();
  serverEnemies.forEach((enemy) => {
    if (enemy.health > 0) {
      // Пропускаем мёртвых
      enemies.set(enemy.id, {
        ...enemy,
        frame: 0,
        frameTime: 0,
        lastAttackTime: 0,
        deathTime: null,
      });
      // Оптимизация: нормализуем health (max 200, на случай серверных багов)
      enemies.get(enemy.id).health = Math.min(enemy.health, 200);
    }
  });
}

// Обновление врагов (оптимизировано: улучшенная интерполяция, проверка на зависание, меньше вычислений)
function updateEnemies(deltaTime) {
  const currentWorldId = window.worldSystem.currentWorldId;
  const me = players.get(myId);
  if (!me) return;

  enemies.forEach((enemy, enemyId) => {
    if (enemy.worldId !== currentWorldId) return;

    // Если здоровье <=0, установить state dying и таймер удаления
    if (enemy.health <= 0 && !enemy.deathTime) {
      enemy.state = "dying";
      enemy.deathTime = Date.now(); // Запустить таймер анимации смерти
    }

    // Интерполяция движения (улучшено: плавнее с deltaTime, проверка на малое dist для anti-зависания)
    if (
      enemy.state === "walking" &&
      enemy.targetX !== undefined &&
      enemy.targetY !== undefined
    ) {
      const dx = enemy.targetX - enemy.x;
      const dy = enemy.targetY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.1) {
        // Anti-зависание: если dist < 0.1, считаем reached
        const speedFactor = (ENEMY_SPEED / dist) * deltaTime; // Полная deltaTime нормализация (без /16.67, т.к. deltaTime уже в ms)
        enemy.x += dx * speedFactor;
        enemy.y += dy * speedFactor;
      } else {
        enemy.x = enemy.targetX;
        enemy.y = enemy.targetY;
        enemy.state = "idle"; // Anti-зависание: если reached, idle
      }
      // Обновляем direction по движению (минимально)
      if (Math.abs(dx) > Math.abs(dy)) {
        enemy.direction = dx > 0 ? "right" : "left";
      } else {
        enemy.direction = dy > 0 ? "down" : "up";
      }
    }

    // Анимация (если walking или dying, оптимизировано: без лишних if)
    if (enemy.state === "walking" || enemy.state === "dying") {
      enemy.frameTime += deltaTime;
      if (enemy.frameTime >= MUTANT_FRAME_DURATION) {
        enemy.frameTime -= MUTANT_FRAME_DURATION;
        enemy.frame = (enemy.frame + 1) % MUTANT_FRAMES;
      }
    } else {
      enemy.frame = 0;
      enemy.frameTime = 0;
    }

    // Локальная проверка атаки (визуальные эффекты, логика на сервере)
  });
}

// Отрисовка врагов (оптимизировано: ранняя видимость, fade-out в dying, health bar на max 200)
function drawEnemies() {
  const currentWorldId = window.worldSystem.currentWorldId;
  const camera = window.movementSystem.getCamera();

  enemies.forEach((enemy) => {
    if (enemy.worldId !== currentWorldId) return;

    // Пропустить, если анимация смерти закончилась (>1000ms) или health <=0 без deathTime
    if (
      (enemy.deathTime && Date.now() - enemy.deathTime > 1000) ||
      enemy.health <= 0
    ) {
      enemies.delete(enemy.id); // Удаляем с клиента
      return; // Не рисовать после анимации (сервер удалил)
    }

    const screenX = enemy.x - camera.x;
    const screenY = enemy.y - camera.y;

    // Оптимизация: проверка видимости (буфер +50px)
    if (
      screenX < -MUTANT_SIZE - 50 ||
      screenX > canvas.width + MUTANT_SIZE + 50 ||
      screenY < -MUTANT_SIZE - 50 ||
      screenY > canvas.height + MUTANT_SIZE + 50
    )
      return;

    if (mutantSprite.complete) {
      let spriteY = 0; // По умолчанию down
      switch (enemy.direction) {
        case "up":
          spriteY = 0;
          break;
        case "down":
          spriteY = 70;
          break;
        case "left":
          spriteY = 210;
          break;
        case "right":
          spriteY = 140;
          break;
      }
      if (enemy.state === "dying") spriteY = 70; // Пример для dying

      // Fade-out в dying (оптимизация: только если dying и time < 1000ms)
      if (enemy.state === "dying" && enemy.deathTime) {
        const fade = 1 - (Date.now() - enemy.deathTime) / 1000; // 1..0
        ctx.globalAlpha = Math.max(0, fade);
      }

      ctx.drawImage(
        mutantSprite,
        enemy.frame * 70,
        spriteY,
        70,
        70,
        screenX,
        screenY,
        70,
        70
      );

      ctx.globalAlpha = 1; // Reset alpha
    } else {
      // Заглушка
      ctx.fillStyle = "purple";
      ctx.fillRect(screenX, screenY, 70, 70);
    }

    // Новый текст здоровья вместо полоски (над ID, красным, если не dying или dying <500ms)
    if (
      enemy.state !== "dying" ||
      (enemy.deathTime && Date.now() - enemy.deathTime < 500)
    ) {
      ctx.fillStyle = "red";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${enemy.health} / 200`, screenX + 35, screenY - 30); // -30 для отступа над ID (-20 - 10)
    }

    // ID для дебага (остается как есть)
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText(enemy.id, screenX + 35, screenY - 20);
  });
}

// Экспорт
window.enemySystem = {
  initialize: initializeEnemySystem,
  update: updateEnemies,
  draw: drawEnemies,
  syncEnemies,
};
