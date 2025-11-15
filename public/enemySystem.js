// enemySystem.js - Клиентская логика для врагов (мутантов)

const ENEMY_SPEED = 2; // Скорость движения мутантов (px/кадр)
const AGGRO_RANGE = 300; // Радиус аггро (px)
const ATTACK_RANGE = 50; // Радиус атаки (px)
const ENEMY_ATTACK_COOLDOWN = 1000; // Перезарядка атаки (ms)
const MUTANT_SIZE = 70; // Размер спрайта (как у игроков)
const MUTANT_FRAMES = 40; // Кадры анимации
const MUTANT_FRAME_DURATION = 100; // ms на кадр
const DEATH_ANIMATION_DURATION = 1000; // Длительность анимации смерти (ms)

let enemies = new Map(); // Хранилище врагов: key = enemyId, value = {id, x, y, health, direction, state, frame, worldId, lastAttackTime, deathTime}
let mutantSprite; // Изображение спрайта

// Инициализация системы врагов
function initializeEnemySystem() {
  mutantSprite = new Image();
  mutantSprite.src = "mutantSprite.png";
  mutantSprite.onload = () => {
    console.log("Mutant sprite loaded");
  };
  mutantSprite.onerror = () => {
    console.error("Failed to load mutantSprite.png");
  };
}

// Синхронизация врагов с сервером
function syncEnemies(serverEnemies) {
  enemies.clear();
  serverEnemies.forEach((enemy) => {
    enemies.set(enemy.id, {
      ...enemy,
      frame: 0,
      frameTime: 0,
      lastAttackTime: 0,
      deathTime: null,
    });
  });
}

// Обновление врагов (локально, на основе серверных обновлений)
function updateEnemies(deltaTime) {
  const currentWorldId = window.worldSystem.currentWorldId;
  const me = players.get(myId);
  if (!me) return;

  enemies.forEach((enemy, enemyId) => {
    if (enemy.worldId !== currentWorldId) return;

    // ✅ ДИНАМИЧНОЕ ОБНОВЛЕНИЕ: Если здоровье <=0, запускаем анимацию смерти
    if (enemy.health <= 0 && !enemy.deathTime) {
      enemy.state = "dying";
      enemy.deathTime = Date.now();
    }

    // Анимация (walking или dying)
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

    // ✅ ПРАВИЛЬНАЯ ОЧИСТКА: Удаляем локально через 1 сек после смерти
    if (
      enemy.deathTime &&
      Date.now() - enemy.deathTime > DEATH_ANIMATION_DURATION
    ) {
      enemies.delete(enemyId);
      return;
    }
  });
}

// Отрисовка врагов
function drawEnemies() {
  const currentWorldId = window.worldSystem.currentWorldId;
  const camera = window.movementSystem.getCamera();

  enemies.forEach((enemy) => {
    if (enemy.worldId !== currentWorldId) return;

    // ✅ ПРОВЕРКА: Не рисовать, если анимация смерти закончилась
    if (
      enemy.deathTime &&
      Date.now() - enemy.deathTime > DEATH_ANIMATION_DURATION
    ) {
      return;
    }

    const screenX = enemy.x - camera.x;
    const screenY = enemy.y - camera.y;

    // Проверка видимости (оптимизация)
    if (
      screenX < -MUTANT_SIZE ||
      screenX > canvas.width + MUTANT_SIZE ||
      screenY < -MUTANT_SIZE ||
      screenY > canvas.height + MUTANT_SIZE
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
      // ✅ ПРИ СМЕРТИ - фиксированный кадр смерти
      if (enemy.state === "dying") spriteY = 70;

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

    // ✅ ДИНАМИЧНЫЙ HEALTH BAR: Всегда виден, плавный, с fade-out при смерти
    const healthPercent = Math.max(0, enemy.health / 200); // ✅ 200 HP!
    const barWidth = 70;
    const barHeight = 8;
    const barX = screenX;
    const barY = screenY - 20;

    // Фон бара (красный)
    ctx.fillStyle = "rgba(100, 0, 0, 0.8)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Зелёный прогресс (плавный)
    ctx.fillStyle = "rgba(0, 200, 0, 0.9)";
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

    // Рамка (белая, тонкая)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // ✅ FADE-OUT ЭФФЕКТ при смерти (после 500ms)
    if (enemy.deathTime) {
      const deathProgress = (Date.now() - enemy.deathTime) / 500;
      if (deathProgress > 1) {
        ctx.globalAlpha = 0; // Полностью скрыть
      } else {
        ctx.globalAlpha = 1 - deathProgress; // Плавное исчезновение
      }
      ctx.fillRect(barX, barY, barWidth, barHeight); // Перерисовать с альфой
      ctx.globalAlpha = 1; // Восстановить
    }

    // ID для дебага (только если жив)
    if (enemy.health > 0) {
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(enemy.id, screenX + 35, screenY - 30);
    }
  });
}

// Экспорт
window.enemySystem = {
  initialize: initializeEnemySystem,
  update: updateEnemies,
  draw: drawEnemies,
  syncEnemies,
};
