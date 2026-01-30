// obstacles.js

// Формат: { worldId: number, x1, y1, x2, y2 }
window.obstacles = [
  // Первая тестовая линия в Неоновом Городе (мир 0)
  {
    worldId: 0,
    x1: 640,
    y1: 190,
    x2: 1525,
    y2: 657,
  },
  {
    worldId: 0,
    x1: 1525,
    y1: 657,
    x2: 2065,
    y2: 196,
  },
  {
    worldId: 0,
    x1: 640,
    y1: 190,
    x2: 2065,
    y2: 196,
  },
  {
    worldId: 0,
    x1: 507,
    y1: 348,
    x2: 640,
    y2: 299,
  },
  {
    worldId: 0,
    x1: 640,
    y1: 299,
    x2: 550,
    y2: 250,
  },
  {
    worldId: 0,
    x1: 550,
    y1: 250,
    x2: 534,
    y2: 178,
  },
  {
    worldId: 0,
    x1: 534,
    y1: 178,
    x2: 220,
    y2: 100,
  },
  {
    worldId: 0,
    x1: 220,
    y1: 100,
    x2: 0,
    y2: 206,
  },
  {
    worldId: 0,
    x1: 0,
    y1: 206,
    x2: 31,
    y2: 272,
  },
  {
    worldId: 0,
    x1: 31,
    y1: 272,
    x2: 186,
    y2: 310,
  },
  {
    worldId: 0,
    x1: 186,
    y1: 310,
    x2: 381,
    y2: 308,
  },
  {
    worldId: 0,
    x1: 381,
    y1: 308,
    x2: 507,
    y2: 348,
  },

  {
    worldId: 0,
    x1: 2800,
    y1: 1257,
    x2: 2262,
    y2: 1289,
  },
  {
    worldId: 0,
    x1: 2262,
    y1: 1289,
    x2: 2205,
    y2: 1178,
  },
  {
    worldId: 0,
    x1: 2205,
    y1: 1178,
    x2: 2047,
    y2: 1123,
  },
  {
    worldId: 0,
    x1: 2047,
    y1: 1123,
    x2: 2096,
    y2: 904,
  },
  {
    worldId: 0,
    x1: 2096,
    y1: 904,
    x2: 2800,
    y2: 904,
  },
];

// Очень простая функция проверки пересечения двух отрезков
// (используется и на клиенте, и на сервере — копия будет в двух местах)
function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false; // параллельны

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

// Для отладки на клиенте — рисуем красные линии
function drawObstacles(ctx, cameraX, cameraY, worldId) {
  ctx.save();
  ctx.strokeStyle = "red";
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.7;

  window.obstacles.forEach((obs) => {
    if (obs.worldId !== worldId) return;

    const sx1 = obs.x1 - cameraX;
    const sy1 = obs.y1 - cameraY;
    const sx2 = obs.x2 - cameraX;
    const sy2 = obs.y2 - cameraY;

    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
  });

  ctx.restore();
}

window.obstaclesSystem = {
  draw: drawObstacles,
  // Позже можно добавить getObstaclesForWorld(worldId) и т.д.
};
