// enemySystem.js - Клиентская логика для врагов (мутантов)

const ENEMY_SPEED = 2; // Скорость движения мутантов (px/кадр)
const AGGRO_RANGE = 300; // Радиус аггро (px)
const ATTACK_RANGE = 50; // Радиус атаки (px)
const ENEMY_ATTACK_COOLDOWN = 1000; // Перезарядка атаки (ms) — переименовано, чтобы избежать конфликта с combatSystem.js
const MUTANT_SIZE = 70; // Размер спрайта (как у игроков)
const MUTANT_FRAMES = 40; // Кадры анимации
const MUTANT_FRAME_DURATION = 100; // ms на кадр

let enemies = new Map(); // Хранилище врагов: key = enemyId, value = {id, x, y, health, direction, state, frame, worldId, lastAttackTime}
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
      });
      // Оптимизация: нормализуем health (max 200, на случай серверных багов)
      enemies.get(enemy.id).health = Math.min(enemy.health, 200);
    } else {
      // Немедленное удаление при sync, если health <=0
      enemies.delete(enemy.id);
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

    // Если здоровье <=0, удаляем сразу (без dying)
    if (enemy.health <= 0) {
      enemies.delete(enemyId);
      return;
    }

    // Интерполяция движения (улучшено: плавнее с deltaTime, проверка на малое dist для anti-зависания)
    if (
      (enemy.state === "walking" || enemy.state === "attacking") && // Добавлено: движение продолжается при attacking, чтобы не дергалось
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

    // Анимация (если walking или attacking, оптимизировано: без лишних if)
    if (enemy.state === "walking" || enemy.state === "attacking") {
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

// Отрисовка врагов (улучшено: динамический текст health вместо bar, немедленное удаление при смерти)
function drawEnemies() {
  const currentWorldId = window.worldSystem.currentWorldId;
  const camera = window.movementSystem.getCamera();

  enemies.forEach((enemy) => {
    if (enemy.worldId !== currentWorldId) return;

    // Пропустить и удалить, если health <=0
    if (enemy.health <= 0) {
      enemies.delete(enemy.id); // Удаляем с клиента
      return; // Не рисовать
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
    } else {
      // Заглушка
      ctx.fillStyle = "purple";
      ctx.fillRect(screenX, screenY, 70, 70);
    }

    // Текст здоровья вместо bar (мелкий шрифт, над именем)
    ctx.fillStyle = "white";
    ctx.font = "10px Arial"; // Мелкий текст
    ctx.textAlign = "center";
    ctx.fillText(
      `${Math.floor(enemy.health)} / 200`,
      screenX + 35,
      screenY - 32
    ); // Над именем

    // ID для дебага
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
