// enemySystem.js - ОПТИМИЗИРОВАННАЯ, ПЛАВНАЯ АНИМАЦИЯ, МИНИМАЛЬНАЯ НАГРУЗКА (2025)

let enemies = new Map(); // Map<enemyId, enemyObject>

// Конфиг типов врагов
const ENEMY_TYPES = {
  mutant: {
    size: 70,
    frames: 13,
    frameDuration: 110,
    maxHealth: 200,
    spriteKey: "mutantSprite",
    speed: 2,
  },
  scorpion: {
    size: 70,
    frames: 13,
    frameDuration: 110,
    maxHealth: 250,
    spriteKey: "scorpionSprite",
    speed: 6,
    aggroRange: 300,
    attackCooldown: 1000,
    minDamage: 5,
    maxDamage: 10,
    minEnergy: 1,
    maxEnergy: 2,
  },
};

function initializeEnemySystem() {
  // Спавн только с сервера
}

// === Синхронизация с сервера ===
function syncEnemies(serverEnemies) {
  const currentIds = new Set(enemies.keys());

  serverEnemies.forEach((srv) => {
    const id = srv.id;
    currentIds.delete(id);

    if (srv.health <= 0) {
      enemies.delete(id);
      return;
    }

    const type = srv.type || "mutant";
    const config = ENEMY_TYPES[type] || ENEMY_TYPES.mutant;

    if (enemies.has(id)) {
      const e = enemies.get(id);
      e.x = srv.x;
      e.y = srv.y;
      e.health = srv.health;
      e.direction = srv.direction || "down";
      e.state = srv.state || "idle";
      e.worldId = srv.worldId;
      e.type = type;
      e.maxHealth = config.maxHealth;
      // frame с сервера игнорируем для анимации ходьбы — у нас своя
    } else {
      enemies.set(id, {
        id,
        x: srv.x,
        y: srv.y,
        health: srv.health,
        maxHealth: config.maxHealth,
        direction: srv.direction || "down",
        state: srv.state || "idle",
        worldId: srv.worldId,
        type,
        // Локальные поля для плавной анимации
        walkFrame: 0,
        walkFrameTime: 0,
      });
    }
  });

  // Удаляем исчезнувших
  currentIds.forEach((id) => enemies.delete(id));
}

function handleEnemyDeath(enemyId) {
  enemies.delete(enemyId);
}

function handleNewEnemy(enemyData) {
  if (enemyData.health <= 0) return;

  const type = enemyData.type || "mutant";
  const config = ENEMY_TYPES[type] || ENEMY_TYPES.mutant;

  enemies.set(enemyData.id, {
    ...enemyData,
    type,
    maxHealth: config.maxHealth,
    walkFrame: 0,
    walkFrameTime: 0,
  });
}

// === Локальное обновление анимации (только визуал) ===
function updateEnemies(deltaTime) {
  const currentWorldId = window.worldSystem.currentWorldId;
  if (currentWorldId === undefined) return;

  for (const enemy of enemies.values()) {
    if (enemy.worldId !== currentWorldId || enemy.health <= 0) continue;

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;

    // Только анимация ходьбы управляется локально
    if (enemy.state === "walking") {
      enemy.walkFrameTime += deltaTime;
      if (enemy.walkFrameTime >= config.frameDuration) {
        enemy.walkFrame = (enemy.walkFrame + 1) % config.frames;
        enemy.walkFrameTime -= config.frameDuration; // точнее, чем = 0
      }
    } else {
      // В других состояниях сбрасываем анимацию ходьбы
      enemy.walkFrame = 0;
      enemy.walkFrameTime = 0;
    }
  }
}

// === Отрисовка ===
function drawEnemies() {
  const currentWorldId = window.worldSystem.currentWorldId;
  if (currentWorldId === undefined) return;

  const camera = window.movementSystem.getCamera();
  if (!camera) return;

  const camX = camera.x;
  const camY = camera.y;
  const canvasW = canvas.width;
  const canvasH = canvas.height;

  for (const enemy of enemies.values()) {
    if (enemy.worldId !== currentWorldId || enemy.health <= 0) continue;

    const config = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.mutant;
    const size = config.size;

    const screenX = enemy.x - camX;
    const screenY = enemy.y - camY - 20;

    // Куллинг
    if (
      screenX < -size - 100 ||
      screenX > canvasW + size + 100 ||
      screenY < -size - 100 ||
      screenY > canvasH + size + 100
    ) {
      continue;
    }

    const sprite = images[config.spriteKey];

    // Определяем текущий кадр
    let sourceX = 0;
    if (enemy.state === "walking") {
      sourceX = enemy.walkFrame * 70;
    } else if (enemy.state === "attacking") {
      sourceX = 12 * 70; // атака начинается с 12-го кадра
    }
    // idle — sourceX = 0

    // Рисуем спрайт или заглушку
    if (sprite?.complete && sprite.width >= 910) {
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

    // Полоска здоровья
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

    // Текст здоровья
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.strokeText(`${Math.floor(enemy.health)}`, screenX + 35, screenY - 7);
    ctx.fillStyle = "white";
    ctx.fillText(`${Math.floor(enemy.health)}`, screenX + 35, screenY - 7);

    // Дебаг: тип врага
    ctx.font = "10px Arial";
    ctx.fillStyle = enemy.type === "scorpion" ? "#00eaff" : "#ffff00";
    ctx.fillText(enemy.type, screenX + 35, screenY + 80);
  }
}

// Экспорт
window.enemySystem = {
  initialize: initializeEnemySystem,
  syncEnemies,
  handleEnemyDeath,
  handleNewEnemy,
  update: updateEnemies,
  draw: drawEnemies,
};
