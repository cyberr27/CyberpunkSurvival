const { saveUserDatabase } = require("./database");
const { ITEM_CONFIG } = require("./items");

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

let activeMainLoop = null;
let activeMutantAI = null;

function runGameLoop(
  wss,
  dbCollection,
  clients,
  players,
  items,
  worlds,
  ITEM_CONFIG,
  userDatabase,
  enemyMap,
) {
  if (activeMainLoop) {
    clearInterval(activeMainLoop);
    activeMainLoop = null;
  }
  if (activeMutantAI) {
    clearInterval(activeMutantAI);
    activeMutantAI = null;
  }

  const mutantAIInterval = setInterval(() => {
    const now = Date.now();

    if (worldPlayerCache.size === 0) return;

    for (const [worldId, worldEnemiesMap] of worldEnemyCache) {
      if (worldId === 0) continue;

      const playerIds = worldPlayerCache.get(worldId);
      if (!playerIds || playerIds.size === 0) continue;

      if (worldEnemiesMap.size === 0) continue;

      worldEnemiesMap.forEach((enemy) => {
        if (enemy.health <= 0) return;

        let closestPlayer = null;
        let minDistSq = Infinity;

        for (const playerId of playerIds) {
          const player = players.get(playerId);
          if (!player || player.health <= 0) continue;
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDistSq) {
            minDistSq = distSq;
            closestPlayer = player;
          }
        }

        const inAggro = closestPlayer && minDistSq <= AGGRO_RANGE * AGGRO_RANGE;

        let moved = false;
        let attacked = false;

        if (inAggro) {
          enemy.targetId = closestPlayer.id;
          const dx = closestPlayer.x - enemy.x;
          const dy = closestPlayer.y - enemy.y;

          let speed = ENEMY_SPEED;
          let attackCooldown = ENEMY_ATTACK_COOLDOWN;
          let minDmg = 10;
          let maxDmg = 15;
          let minEnergyDmg = 0;
          let maxEnergyDmg = 0;

          if (enemy.type === "scorpion") {
            speed = 4;
            attackCooldown = 1000;
            minDmg = 5;
            maxDmg = 10;
            minEnergyDmg = 1;
            maxEnergyDmg = 2;
          } else if (enemy.type === "blood_eye") {
            speed = 3.2;
            attackCooldown = 2000;
            minDmg = 12;
            maxDmg = 18;
          }

          if (minDistSq > ATTACK_RANGE * ATTACK_RANGE) {
            const angle = Math.atan2(dy, dx);
            enemy.x += Math.cos(angle) * speed;
            enemy.y += Math.sin(angle) * speed;
            moved = true;
          }

          enemy.state = "walking";

          if (Math.abs(dx) > Math.abs(dy)) {
            enemy.direction = dx > 0 ? "right" : "left";
          } else {
            enemy.direction = dy > 0 ? "down" : "up";
          }

          if (
            minDistSq <= ATTACK_RANGE * ATTACK_RANGE &&
            now - (enemy.lastAttackTime || 0) >= attackCooldown
          ) {
            const damage =
              Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
            let energyDmg = 0;

            if (enemy.type === "scorpion") {
              energyDmg =
                Math.floor(Math.random() * (maxEnergyDmg - minEnergyDmg + 1)) +
                minEnergyDmg;
              closestPlayer.energy = Math.max(
                0,
                (closestPlayer.energy || 0) - energyDmg,
              );
            }

            closestPlayer.health = Math.max(0, closestPlayer.health - damage);
            enemy.lastAttackTime = now;
            enemy.state = "attacking";
            attacked = true;

            players.set(closestPlayer.id, { ...closestPlayer });
            userDatabase.set(closestPlayer.id, { ...closestPlayer });
            saveUserDatabase(dbCollection, closestPlayer.id, closestPlayer);

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
                energyDmg,
              }),
            );

            broadcastToWorld(
              wss,
              clients,
              players,
              worldId,
              JSON.stringify({
                type: "update",
                player: { id: closestPlayer.id, ...closestPlayer },
              }),
            );
          }
        } else {
          enemy.targetId = null;
          enemy.state = "idle";

          if (Math.random() < 0.08) {
            const wanderAngle = Math.random() * Math.PI * 2;
            enemy.x += Math.cos(wanderAngle) * ENEMY_SPEED * 0.5;
            enemy.y += Math.sin(wanderAngle) * ENEMY_SPEED * 0.5;
            moved = true;
          }
        }

        if (moved || attacked || enemy.state === "attacking") {
          broadcastToWorld(
            wss,
            clients,
            players,
            worldId,
            JSON.stringify({
              type: "enemyUpdate",
              enemy: { id: enemy.id, ...enemy },
            }),
          );
        }
      });
    }
  }, 200);

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

    for (const [enemyId, enemy] of enemyMap) {
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
    const permanentExpired = [];

    for (const [itemId, item] of items) {
      if (!item.spawnTime) continue;

      const age = now - item.spawnTime;
      const isSpecialShortLife =
        item.isEnemyDrop === true || item.isDroppedByPlayer === true;

      if (isSpecialShortLife) {
        if (age > 2 * 60 * 1000) {
          items.delete(itemId);
          permanentExpired.push({
            itemId,
            type: item.type,
            worldId: item.worldId,
          });
        }
      } else {
        if (age > 10 * 60 * 1000) {
          expiredItems.push({ itemId, worldId: item.worldId });
          items.delete(itemId);
        }
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

        const allowedRare = Object.keys(ITEM_CONFIG).filter(
          (t) => ITEM_CONFIG[t].canBeAutoSpawned && ITEM_CONFIG[t].rarity === 1,
        );
        const allowedMedium = Object.keys(ITEM_CONFIG).filter(
          (t) => ITEM_CONFIG[t].canBeAutoSpawned && ITEM_CONFIG[t].rarity === 2,
        );
        const allowedCommon = Object.keys(ITEM_CONFIG).filter(
          (t) => ITEM_CONFIG[t].canBeAutoSpawned && ITEM_CONFIG[t].rarity === 3,
        );

        const newItems = [];

        for (let i = 0; i < itemsToSpawn; i++) {
          let type;

          if (rareCount > 0 && allowedRare.length > 0) {
            const idx = Math.floor(Math.random() * allowedRare.length);
            type = allowedRare[idx];
            rareCount--;
          } else if (mediumCount > 0 && allowedMedium.length > 0) {
            const idx = Math.floor(Math.random() * allowedMedium.length);
            type = allowedMedium[idx];
            mediumCount--;
          } else if (commonCount > 0 && allowedCommon.length > 0) {
            const idx = Math.floor(Math.random() * allowedCommon.length);
            type = allowedCommon[idx];
            commonCount--;
          } else {
            const fallback = [
              ...allowedRare,
              ...allowedMedium,
              ...allowedCommon,
            ];
            if (fallback.length === 0) continue;
            type = fallback[Math.floor(Math.random() * fallback.length)];
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
          }
        }

        if (newItems.length > 0) {
          const msg = JSON.stringify({ type: "newItem", items: newItems });
          broadcastToWorld(wss, clients, players, worldId, msg);
        }
      }

      if (worldId !== 0 && playerCount > 0) {
        const worldEnemiesMap = worldEnemyCache.get(worldId) || new Map();
        const desiredMutants = 10;
        const currentMutants = Array.from(worldEnemiesMap.values()).filter(
          (e) => !e.type || e.type === "mutant",
        ).length;
        if (currentMutants < desiredMutants) {
          const toSpawn = desiredMutants - currentMutants;
          const newMutants = [];
          for (let i = 0; i < toSpawn; i++) {
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
                health: 200,
                direction: "down",
                state: "idle",
                frame: 0,
                worldId,
                targetId: null,
                lastAttackTime: 0,
                type: "mutant",
              };
              enemyMap.set(enemyId, newEnemy);
              worldEnemiesMap.set(enemyId, newEnemy);
              newMutants.push({ ...newEnemy });
            }
          }
          if (newMutants.length > 0) {
            const msg = JSON.stringify({
              type: "newEnemies",
              enemies: newMutants,
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
        }),
      );

      if (allItems.length > 0) {
        wss.clients.forEach((client) => {
          if (client.readyState !== WebSocket.OPEN) return;

          const playerId = clients.get(client);
          const player = players.get(playerId);
          if (!player || player.worldId !== worldId) return;

          const visibleItems = allItems.filter((item) => {
            const serverItem = items.get(item.itemId);
            if (!serverItem) return false;
            if (!serverItem.isQuestItem) return true;
            return serverItem.questOwnerId === playerId;
          });

          if (visibleItems.length === 0) return;

          client.send(
            JSON.stringify({
              type: "syncItems",
              items: visibleItems,
              worldId,
            }),
          );
        });
      }
    }
  }, 30000);

  console.log("[GameLoop] Основной цикл запущен — интервал 30 сек");

  activeMainLoop = mainLoop;
  activeMutantAI = mutantAIInterval;

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

module.exports = {
  runGameLoop,
  activeMainLoop: () => activeMainLoop,
  activeMutantAI: () => activeMutantAI,
  setActiveMainLoop: (value) => {
    activeMainLoop = value;
  },
  setActiveMutantAI: (value) => {
    activeMutantAI = value;
  },
};
