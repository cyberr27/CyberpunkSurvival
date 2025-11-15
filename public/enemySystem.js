// enemySystem.js - Клиентская логика для врагов (мутантов)

const ENEMY_SPEED = 2; // Скорость движения мутантов (px/кадр)
const AGGRO_RANGE = 300; // Радиус аггро (px)
const ATTACK_RANGE = 50; // Радиус атаки (px)
const ENEMY_ATTACK_COOLDOWN = 1000; // Перезарядка атаки (ms)
const MUTANT_SIZE = 70; // Размер спрайта (как у игроков)
const MUTANT_FRAMES = 40; // Кадры анимации
const MUTANT_FRAME_DURATION = 100; // ms на кадр
const DEATH_ANIMATION_DURATION = 1000; // 

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
      deathTime: null, // Для анимации смерти
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

    
    if (enemy.health <= 0 && !enemy.deathTime) {
      enemy.state = "dying";
      enemy.deathTime = Date.now(); // Запустить таймер анимации смерти
    }

    // Анимация (если walking или dying)
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
  });
}


function removeEnemy(enemyId) {
  enemies.delete(enemyId);
}

// Отрисовка врагов
function drawEnemies() {
  const currentWorldId = window.worldSystem.currentWorldId;
  const camera = window.movementSystem.getCamera();

  enemies.forEach((enemy) => {
    if (enemy.worldId !== currentWorldId) return;

   
    if (
      enemy.deathTime &&
      Date.now() - enemy.deathTime > DEATH_ANIMATION_DURATION
    ) {
      return; // Сервер уже удалил, клиент тоже скоро удалит
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

    const isDying = enemy.deathTime && Date.now() - enemy.deathTime > 700;
    if (isDying) {
      ctx.save();
      ctx.globalAlpha = 0.3; // Полупрозрачный в конце анимации
    }

    ctx.fillStyle = "red";
    ctx.fillRect(screenX, screenY - 15, 70, 5);
    ctx.fillStyle = "green";
    ctx.fillRect(screenX, screenY - 15, (enemy.health / 200) * 70, 5); // ✅ 200 HP!

    if (isDying) {
      ctx.restore();
    }

    // ID для дебага (тоже с fade-out)
    if (!isDying) {
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(enemy.id, screenX + 35, screenY - 20);
    }
  });
}

// Экспорт
window.enemySystem = {
  initialize: initializeEnemySystem,
  update: updateEnemies,
  draw: drawEnemies,
  syncEnemies,
  removeEnemy,
};
