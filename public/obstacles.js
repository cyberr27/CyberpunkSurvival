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
  //Парус
  {
    worldId: 0,
    x1: 2800,
    y1: 1111,
    x2: 2442,
    y2: 1181,
  },
  {
    worldId: 0,
    x1: 2442,
    y1: 1181,
    x2: 2355,
    y2: 1055,
  },
  {
    worldId: 0,
    x1: 2355,
    y1: 1055,
    x2: 2191,
    y2: 1014,
  },
  {
    worldId: 0,
    x1: 2191,
    y1: 1014,
    x2: 2179,
    y2: 877,
  },
  {
    worldId: 0,
    x1: 2179,
    y1: 877,
    x2: 2800,
    y2: 797,
  },

  //Вокзал
  {
    worldId: 0,
    x1: 0,
    y1: 2404,
    x2: 799,
    y2: 2404,
  },
  {
    worldId: 0,
    x1: 799,
    y1: 2404,
    x2: 979,
    y2: 2288,
  },
  {
    worldId: 0,
    x1: 979,
    y1: 2288,
    x2: 767,
    y2: 1763,
  },
  {
    worldId: 0,
    x1: 767,
    y1: 1763,
    x2: 58,
    y2: 1784,
  },
  {
    worldId: 0,
    x1: 58,
    y1: 1784,
    x2: 0,
    y2: 2020,
  },

  //My House
  {
    worldId: 0,
    x1: 2810,
    y1: 2692,
    x2: 2615,
    y2: 2708,
  },
  {
    worldId: 0,
    x1: 2615,
    y1: 2708,
    x2: 2250,
    y2: 2379,
  },
  {
    worldId: 0,
    x1: 2250,
    y1: 2379,
    x2: 2414,
    y2: 2260,
  },
  {
    worldId: 0,
    x1: 2414,
    y1: 2260,
    x2: 2810,
    y2: 2573,
  },
  //Общага
  {
    worldId: 0,
    x1: 1800,
    y1: 2800,
    x2: 1731,
    y2: 2750,
  },
  {
    worldId: 0,
    x1: 1731,
    y1: 2750,
    x2: 2200,
    y2: 2500,
  },
  {
    worldId: 0,
    x1: 2200,
    y1: 2500,
    x2: 2310,
    y2: 2580,
  },
  {
    worldId: 0,
    x1: 2310,
    y1: 2580,
    x2: 1982,
    y2: 2810,
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
