// obstacles.js

const obstacles = [
  { worldId: 0, x1: 640, y1: 190, x2: 1525, y2: 657 },
  { worldId: 0, x1: 1525, y1: 657, x2: 2065, y2: 196 },
  { worldId: 0, x1: 640, y1: 190, x2: 2065, y2: 196 },
];

// Очень лёгкая проверка пересечения двух отрезков
function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const dx1 = x2 - x1;
  const dy1 = y2 - y1;
  const dx2 = x4 - x3;
  const dy2 = y4 - y3;

  const denom = dy2 * dx1 - dx2 * dy1;
  if (Math.abs(denom) < 1e-9) return false; // почти параллельны

  const ua = (dx2 * (y1 - y3) - dy2 * (x1 - x3)) / denom;
  const ub = (dx1 * (y1 - y3) - dy1 * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

// Для отладки — рисуем красные линии препятствий
function drawObstacles(ctx, cameraX, cameraY, worldId) {
  // Предварительный фильтр — сколько препятствий вообще в этом мире
  let count = 0;
  for (let i = 0; i < obstacles.length; i++) {
    if (obstacles[i].worldId === worldId) count++;
  }
  if (count === 0) return;

  ctx.save();
  ctx.strokeStyle = "red";
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.7;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (obs.worldId !== worldId) continue;

    const sx1 = obs.x1 - cameraX;
    const sy1 = obs.y1 - cameraY;
    const sx2 = obs.x2 - cameraX;
    const sy2 = obs.y2 - cameraY;

    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
  }

  ctx.restore();
}

const obstaclesSystem = {
  draw: drawObstacles,
  // getObstaclesForWorld(worldId) можно добавить позже, если понадобится
};

// Экспорт, если используешь модули (если нет — просто оставь window)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { obstacles, segmentsIntersect, obstaclesSystem };
} else {
  window.obstaclesSystem = obstaclesSystem;
  // window.obstacles и window.segmentsIntersect — по желанию, сейчас не вешаем
}
