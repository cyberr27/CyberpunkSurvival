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
  // === AI МУТАНТОВ (каждые 200 мс для оптимизации) ===
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
          const player = players.get(playerId);
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
            const damage = enemy.power;
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
          // Anti-зависание: random wander если idle (как в лучших играх)
          if (Math.random() < 0.1) {
            // 10% шанс на движение
            const wanderAngle = Math.random() * Math.PI * 2;
            enemy.x += Math.cos(wanderAngle) * ENEMY_SPEED * 0.5; // Медленнее
            enemy.y += Math.sin(wanderAngle) * ENEMY_SPEED * 0.5;
          }
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
  }, 200); // 200ms для оптимизации (5 FPS update, клиент интерполирует)

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
      const playerCount = (worldPlayerCache.get(worldId) || new Set()).size;
      const worldItemsMap = worldItemCache.get(worldId) || new Map();
      const itemCounts = {};
      worldItemsMap.forEach((item) => {
        itemCounts[item.type] = (itemCounts[item.type] || 0) + 1;
      });

      // Удаляем expired items per world
      const itemsToRemove = removeItemByWorld.get(worldId) || [];
      if (itemsToRemove.length > 0) {
        const removeMsg = JSON.stringify({
          type: "removeItems",
          itemIds: itemsToRemove,
        });
        broadcastToWorld(wss, clients, players, worldId, removeMsg);
      }

      if (playerCount > 0) {
        const itemsToSpawn = Math.max(1, playerCount * 2);
        let rareCount = playerCount;
        let mediumCount = playerCount * 3;
        let commonCount = playerCount * 5;

        const rareItems = Object.keys(ITEM_CONFIG).filter(
          (t) => ITEM_CONFIG[t].rarity === 1
        );
        const mediumItems = Object.keys(ITEM_CONFIG).filter(
          (t) => ITEM_CONFIG[t].rarity === 2
        );
        const commonItems = Object.keys(ITEM_CONFIG).filter(
          (t) => ITEM_CONFIG[t].rarity === 3
        );

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
            let x, y;
            let attempts = 0;
            const minDistanceToPlayer = 200;
            do {
              x = Math.random() * world.width;
              y = Math.random() * world.height;
              attempts++;

              let tooClose = false;
              for (const playerId of playerIds) {
                // playerIds из worldPlayerCache
                const player = players.get(playerId);
                if (player) {
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

            if (attempts < maxAttempts) {
              const enemyId = `mutant_${Date.now()}_${i}`;
              const newEnemy = {
                id: enemyId,
                x,
                y,
                health: 200,
                direction: "down",
                state: "idle",
                frame: 0,
                worldId,
                targetId: null,
                lastAttackTime: 0,
              };
              enemies.set(enemyId, newEnemy);
              worldEnemiesMap.set(enemyId, newEnemy);
              newEnemy.power = Math.floor(Math.random() * 4) + 5; // 5-8
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
