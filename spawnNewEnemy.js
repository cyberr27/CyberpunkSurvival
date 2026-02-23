function spawnNewEnemy(
  worldId,
  worlds,
  players,
  enemies,
  wss,
  clients,
  broadcastToWorld,
) {
  const world = worlds.find((w) => w.id === worldId);
  if (!world) return;

  let x,
    y,
    attempts = 0;
  const minDistanceToPlayer = 300;

  do {
    x = Math.random() * world.width;
    y = Math.random() * world.height;
    attempts++;

    let tooClose = false;
    for (const player of players.values()) {
      if (player.worldId === worldId && player.health > 0) {
        const dx = player.x - x;
        const dy = player.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < minDistanceToPlayer) {
          tooClose = true;
          break;
        }
      }
    }
    if (!tooClose) break;
  } while (attempts < 50);

  const enemyId = `mutant_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const newEnemy = {
    id: enemyId,
    x,
    y,
    health: 200,
    maxHealth: 200,
    direction: "down",
    state: "idle",
    frame: 0,
    type: "mutant",
    worldId,
    targetId: null,
    lastAttackTime: 0,
  };

  enemies.set(enemyId, newEnemy);

  // Отправляем ВСЕМ в этом мире
  broadcastToWorld(
    wss,
    clients,
    players,
    worldId,
    JSON.stringify({
      type: "newEnemy",
      enemy: newEnemy,
    }),
  );
}

module.exports = { spawnNewEnemy };
