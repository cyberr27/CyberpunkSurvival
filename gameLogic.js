const { saveUserDatabase } = require("./database");
// === КОНСТАНТЫ ВРАГОВ (переносим с клиента на сервер!) ===
const ENEMY_SPEED = 2;
const AGGRO_RANGE = 300;
const ATTACK_RANGE = 50;
const ENEMY_ATTACK_COOLDOWN = 1000;

function checkCollisionServer(x, y) {
  return false;
}

const worldPlayerCache = new Map();
const worldItemCache = new Map();
const worldEnemyCache = new Map();

// === ОСНОВНАЯ ИГРОВАЯ ПЕТЛЯ (30 сек) ===
function runGameLoop(
  wss,
  dbCollection,
  clients,
  players,
  items,
  worlds,
  ITEM_CONFIG,
  userDatabase,
  enemies
) {
  // === AI МУТАНТОВ (каждые 100 мс) ===
  const mutantAIInterval = setInterval(() => {
    const now = Date.now();

    for (const [worldId, worldEnemiesMap] of worldEnemyCache) {
      if (worldId === 0) continue;

      const playerIds = worldPlayerCache.get(worldId) || new Set();
      if (playerIds.size === 0) continue;

      worldEnemiesMap.forEach((enemy) => {
        if (enemy.health <= 0) return;

        let closestPlayer = null;
        let minDist = Infinity;

        for (const playerId of playerIds) {
          const player = players.get(playerId); // ← Теперь players доступен!
          if (!player || player.health <= 0) continue;

          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const dist = dx * dx + dy * dy;
          if (dist < minDist) {
            minDist = dist;
            closestPlayer = player;
          }
        }

        if (closestPlayer && minDist <= AGGRO_RANGE * AGGRO_RANGE) {
          enemy.targetId = closestPlayer.id;

          const dx = closestPlayer.x - enemy.x;
          const dy = closestPlayer.y - enemy.y;
          const angle = Math.atan2(dy, dx);
          enemy.x += Math.cos(angle) * ENEMY_SPEED;
          enemy.y += Math.sin(angle) * ENEMY_SPEED;
          enemy.state = "walking";

          if (Math.abs(dx) > Math.abs(dy)) {
            enemy.direction = dx > 0 ? "right" : "left";
          } else {
            enemy.direction = dy > 0 ? "down" : "up";
          }

          if (
            minDist <= ATTACK_RANGE * ATTACK_RANGE &&
            now - enemy.lastAttackTime >= ENEMY_ATTACK_COOLDOWN
          ) {
            const damage = Math.floor(Math.random() * 5) + 1;
            closestPlayer.health = Math.max(0, closestPlayer.health - damage);
            enemy.lastAttackTime = now;

            broadcastToWorld(
              wss,
              clients,
              players,
              worldId,
              JSON.stringify({
                type: "enemyAttack",
                enemyId: enemy.id,
                targetId: closestPlayer.id,
                damage,
              })
            );

            broadcastToWorld(
              wss,
              clients,
              players,
              worldId,
              JSON.stringify({
                type: "update",
                player: { id: closestPlayer.id, ...closestPlayer },
              })
            );
          }
        } else {
          enemy.targetId = null;
          enemy.state = "idle";
        }

        broadcastToWorld(
          wss,
          clients,
          players,
          worldId,
          JSON.stringify({
            type: "enemyUpdate",
            enemy: { id: enemy.id, ...enemy },
          })
        );
      });
    }
  }, 100);

  // === ОСНОВНОЙ ЦИКЛ (30 сек) ===
  const mainLoop = setInterval(() => {
    const currentTime = Date.now();
    const now = currentTime;

    worldPlayerCache.clear();
    worldItemCache.clear();
    worldEnemyCache.clear();

    for (const player of players.values()) {
      if (!worldPlayerCache.has(player.worldId)) {
        worldPlayerCache.set(player.worldId, new Set());
      }
      worldPlayerCache.get(player.worldId).add(player.id);
    }

    for (const [enemyId, enemy] of enemies) {
      if (!worldEnemyCache.has(enemy.worldId)) {
        worldEnemyCache.set(enemy.worldId, new Map());
      }
      worldEnemyCache.get(enemy.worldId).set(enemyId, enemy);
    }

    for (const [itemId, item] of items) {
      if (!worldItemCache.has(item.worldId)) {
        worldItemCache.set(item.worldId, new Map());
      }
      worldItemCache.get(item.worldId).set(itemId, item);
    }

    const totalPlayers = players.size;

    const totalOnlineMsg = JSON.stringify({
      type: "totalOnline",
      count: totalPlayers,
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(totalOnlineMsg);
      }
    });

    const expiredItems = [];
    for (const [itemId, item] of items) {
      if (now - item.spawnTime > 10 * 60 * 1000) {
        expiredItems.push({ itemId, worldId: item.worldId });
        items.delete(itemId);
      }
    }

    const removeItemByWorld = new Map();
    for (const { itemId, worldId } of expiredItems) {
      if (!removeItemByWorld.has(worldId)) removeItemByWorld.set(worldId, []);
      removeItemByWorld.get(worldId).push(itemId);
    }

    for (const world of worlds) {
      const worldId = world.id;
      const playerIds = worldPlayerCache.get(worldId) || new Set();
      const playerCount = playerIds.size;
      const worldItemsMap = worldItemCache.get(worldId) || new Map();

      const removedItemIds = removeItemByWorld.get(worldId) || [];
      if (removedItemIds.length > 0) {
        const msg = JSON.stringify({
          type: "itemPicked",
          itemId: removedItemIds,
        });
        broadcastToWorld(wss, clients, players, worldId, msg);
      }

      const itemCounts = {};
      for (const [type] of Object.entries(ITEM_CONFIG)) {
        itemCounts[type] = 0;
      }
      for (const item of worldItemsMap.values()) {
        if (itemCounts[item.type] !== undefined) {
          itemCounts[item.type]++;
        }
      }

      const rareItems = Object.keys(ITEM_CONFIG).filter(
        (t) => ITEM_CONFIG[t].rarity === 1
      );
      const mediumItems = Object.keys(ITEM_CONFIG).filter(
        (t) => ITEM_CONFIG[t].rarity === 2
      );
      const commonItems = Object.keys(ITEM_CONFIG).filter(
        (t) => ITEM_CONFIG[t].rarity === 3
      );

      const desiredTotalItems = playerCount * 10;
      const currentTotalItems = worldItemsMap.size;

      if (currentTotalItems < desiredTotalItems) {
        const itemsToSpawn = desiredTotalItems - currentTotalItems;
        let rareCount = playerCount * 2;
        let mediumCount = playerCount * 3;
        let commonCount = playerCount * 5;

        const newItems = [];
        const atomSpawns = [];

        for (let i = 0; i < itemsToSpawn; i++) {
          let type;
          if (
            rareCount > 0 &&
            rareItems.length > 0 &&
            itemCounts[rareItems[0]] < rareCount
          ) {
            type = rareItems[Math.floor(Math.random() * rareItems.length)];
            rareCount--;
          } else if (
            mediumCount > 0 &&
            mediumItems.length > 0 &&
            itemCounts[mediumItems[0]] < mediumCount
          ) {
            type = mediumItems[Math.floor(Math.random() * mediumItems.length)];
            mediumCount--;
          } else if (
            commonCount > 0 &&
            commonItems.length > 0 &&
            itemCounts[commonItems[0]] < commonCount
          ) {
            type = commonItems[Math.floor(Math.random() * commonItems.length)];
            commonCount--;
          } else {
            const allTypes = Object.keys(ITEM_CONFIG).filter(
              (t) => ITEM_CONFIG[t].rarity !== 4
            );
            type = allTypes[Math.floor(Math.random() * allTypes.length)];
          }

          let x,
            y,
            attempts = 0;
          const maxAttempts = 10;
          do {
            x = Math.random() * world.width;
            y = Math.random() * world.height;
            attempts++;
          } while (checkCollisionServer(x, y) && attempts < maxAttempts);

          if (attempts < maxAttempts) {
            const itemId = `${type}_${now}_${i}`;
            const newItem = { x, y, type, spawnTime: now, worldId };
            items.set(itemId, newItem);
            worldItemsMap.set(itemId, newItem);
            newItems.push({ itemId, x, y, type, spawnTime: now, worldId });

            if (type === "atom") {
              atomSpawns.push(
                `Создан атом (${itemId}) в мире ${worldId} на x:${x}, y:${y}`
              );
            }
          }
        }

        if (newItems.length > 0) {
          const msg = JSON.stringify({ type: "newItem", items: newItems });
          broadcastToWorld(wss, clients, players, worldId, msg);
        }
        if (atomSpawns.length > 0) {
          const atomMsg = JSON.stringify({
            type: "atomSpawned",
            messages: atomSpawns,
          });
          broadcastToWorld(wss, clients, players, worldId, atomMsg);
        }
      }

      if (worldId !== 0 && playerCount > 0) {
        const worldEnemiesMap = worldEnemyCache.get(worldId) || new Map();
        const desiredEnemies = 10;
        const currentEnemies = worldEnemiesMap.size;
        if (currentEnemies < desiredEnemies) {
          const enemiesToSpawn = desiredEnemies - currentEnemies;
          const newEnemies = [];
          for (let i = 0; i < enemiesToSpawn; i++) {
            let x,
              y,
              attempts = 0;
            const maxAttempts = 10;
            do {
              x = Math.random() * world.width;
              y = Math.random() * world.height;
              attempts++;
            } while (checkCollisionServer(x, y) && attempts < maxAttempts);

            if (attempts < maxAttempts) {
              const enemyId = `mutant_${Date.now()}_${i}`;
              const newEnemy = {
                id: enemyId,
                x,
                y,
                health: 50,
                direction: "down",
                state: "idle",
                frame: 0,
                worldId,
                targetId: null,
                lastAttackTime: 0,
              };
              enemies.set(enemyId, newEnemy);
              worldEnemiesMap.set(enemyId, newEnemy);
              newEnemies.push({ ...newEnemy });
            }
          }
          if (newEnemies.length > 0) {
            const msg = JSON.stringify({
              type: "newEnemies",
              enemies: newEnemies,
            });
            broadcastToWorld(wss, clients, players, worldId, msg);
          }
        }
      }

      const allItems = Array.from(worldItemsMap.entries()).map(
        ([itemId, item]) => ({
          itemId,
          x: item.x,
          y: item.y,
          type: item.type,
          spawnTime: item.spawnTime,
          worldId,
        })
      );

      if (allItems.length > 0) {
        const syncMsg = JSON.stringify({
          type: "syncItems",
          items: allItems,
          worldId,
        });
        broadcastToWorld(wss, clients, players, worldId, syncMsg);
      }
    }
  }, 30_000);

  // Возвращаем интервалы, чтобы можно было остановить при выключении
  return { mainLoop, mutantAIInterval };
}

function broadcastToWorld(wss, clients, players, worldId, message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const player = players.get(clients.get(client));
      if (player && player.worldId === worldId) {
        client.send(message);
      }
    }
  });
}

module.exports = { runGameLoop };
