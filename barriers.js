// server/barriers.js

const barriers = new Map(); // worldId → Array<{id, x1,y1,x2,y2, comment?, oneWay?}>

function addBarrier(worldId, x1, y1, x2, y2, options = {}) {
  if (!barriers.has(worldId)) barriers.set(worldId, []);
  const barrier = {
    id: `barrier_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    x1,
    y1,
    x2,
    y2,
    ...options,
  };
  barriers.get(worldId).push(barrier);
  return barrier;
}

function getBarriersForWorld(worldId) {
  return barriers.get(worldId) || [];
}

// Классический алгоритм проверки пересечения двух отрезков
function lineSegmentsIntersect(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
  const denominator = (ay2 - ay1) * (bx2 - bx1) - (ax2 - ax1) * (by2 - by1);
  if (denominator === 0) return false; // параллельны

  const ua =
    ((bx2 - bx1) * (ay1 - by1) - (by2 - by1) * (ax1 - bx1)) / denominator;
  const ub =
    ((ax2 - ax1) * (ay1 - by1) - (ay2 - ay1) * (ax1 - bx1)) / denominator;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

function wouldCrossBarrier(
  worldId,
  prevX,
  prevY,
  newX,
  newY,
  playerRadius = 20,
) {
  const barriersInWorld = getBarriersForWorld(worldId);
  if (barriersInWorld.length === 0) return false;

  for (const b of barriersInWorld) {
    // Простой вариант — проверяем пересечение центра игрока
    if (
      lineSegmentsIntersect(prevX, prevY, newX, newY, b.x1, b.y1, b.x2, b.y2)
    ) {
      return true;
    }

    // Более точный вариант — учитываем радиус игрока (можно включить позже)
    // if (lineIntersectsCircle(b.x1,b.y1,b.x2,b.y2, newX,newY, playerRadius)) return true;
  }

  return false;
}

module.exports = {
  addBarrier,
  getBarriersForWorld,
  wouldCrossBarrier,
  barriers, // для отладки / админки
};
