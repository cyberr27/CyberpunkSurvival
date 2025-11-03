const { saveUserDatabase } = require("./database");

function checkCollisionServer(x, y) {
  return false; // Пока оставляем как есть
}

// КЭШИРОВАНИЕ: чтобы не пересчитывать одни и те же данные
const worldPlayerCache = new Map(); // worldId → Set(playerId)
const worldItemCache = new Map(); // worldId → Map(itemId, item)
const worldWolfCache = new Map(); // worldId → Map(wolfId, wolf)

function runGameLoop(
  wss,
  dbCollection,
  clients,
  players,
  items,
  wolves,
  worlds,
  ITEM_CONFIG,
  userDatabase
) {
  setInterval(() => {
    const currentTime = Date.now();
    const now = currentTime;

    // === 1. ОДНОКРАТНОЕ СОБИРАНИЕ ДАННЫХ ПО МИРАМ ===
    worldPlayerCache.clear();
    worldItemCache.clear();
    worldWolfCache.clear();

    // Группируем игроков, предметы, волков по мирам
    for (const player of players.values()) {
      if (!worldPlayerCache.has(player.worldId)) {
        worldPlayerCache.set(player.worldId, new Set());
      }
      worldPlayerCache.get(player.worldId).add(player.id);
    }

    for (const [itemId, item] of items) {
      if (!worldItemCache.has(item.worldId)) {
        worldItemCache.set(item.worldId, new Map());
      }
      worldItemCache.get(item.worldId).set(itemId, item);
    }

    for (const [wolfId, wolf] of wolves) {
      if (!worldWolfCache.has(wolf.worldId)) {
        worldWolfCache.set(wolf.worldId, new Map());
      }
      worldWolfCache.get(wolf.worldId).set(wolfId, wolf);
    }

    const totalPlayers = players.size;

    // === 2. ОТПРАВКА totalOnline — ОДИН РАЗ ===
    const totalOnlineMsg = JSON.stringify({
      type: "totalOnline",
      count: totalPlayers,
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(totalOnlineMsg);
      }
    });

    // === 3. УДАЛЕНИЕ СТАРЫХ ПРЕДМЕТОВ ===
    const expiredItems = [];
    for (const [itemId, item] of items) {
      if (now - item.spawnTime > 10 * 60 * 1000) {
        expiredItems.push({ itemId, worldId: item.worldId });
        items.delete(itemId);
      }
    }

    // Отправляем удаление предметов — группируем по миру
    const removeItemByWorld = new Map();
    for (const { itemId, worldId } of expiredItems) {
      if (!removeItemByWorld.has(worldId)) removeItemByWorld.set(worldId, []);
      removeItemByWorld.get(worldId).push(itemId);
    }

    // === 4. ОБРАБОТКА КАЖДОГО МИРА ===
    for (const world of worlds) {
      const worldId = world.id;
      const playerIds = worldPlayerCache.get(worldId) || new Set();
      const playerCount = playerIds.size;
      const worldItemsMap = worldItemCache.get(worldId) || new Map();
      const worldWolvesMap = worldWolfCache.get(worldId) || new Map();

      // --- Удаление старых предметов ---
      const removedItemIds = removeItemByWorld.get(worldId) || [];
      if (removedItemIds.length > 0) {
        const msg = JSON.stringify({
          type: "itemPicked",
          itemId: removedItemIds,
        });
        broadcastToWorld(wss, clients, players, worldId, msg);
      }

      // --- Подсчёт типов предметов ---
      const itemCounts = {};
      for (const [type] of Object.entries(ITEM_CONFIG)) {
        itemCounts[type] = 0;
      }
      for (const item of worldItemsMap.values()) {
        if (itemCounts[item.type] !== undefined) {
          itemCounts[item.type]++;
        }
      }

      // --- Категории редкости (кэшируем) ---
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

      // --- Спаун предметов ---
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
            worldItemsMap.set(itemId, newItem); // Обновляем кэш
            newItems.push({ itemId, x, y, type, spawnTime: now, worldId });

            if (type === "atom") {
              atomSpawns.push(
                `Создан атом (${itemId}) в мире ${worldId} на x:${x}, y:${y} в ${new Date(
                  now
                ).toLocaleString("ru-RU")}`
              );
            }
          }
        }

        // Отправляем новые предметы и атомы
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

      // === СПЕЦИАЛЬНО ДЛЯ МИРА 1: ВОЛКИ ===
      if (worldId === 1) {
        const maxWolves = Math.max(5, playerCount * 2);
        const currentWolves = worldWolvesMap.size;

        // --- Спаун волков ---
        if (currentWolves < maxWolves) {
          const wolvesToSpawn = maxWolves - currentWolves;
          const playerList = Array.from(players.values()).filter(
            (p) => p.worldId === 1
          );
          if (playerList.length === 0) continue;

          const newWolves = [];
          for (let i = 0; i < wolvesToSpawn; i++) {
            const player =
              playerList[Math.floor(Math.random() * playerList.length)];
            let x,
              y,
              attempts = 0;
            const maxAttempts = 10;
            do {
              const edge = Math.floor(Math.random() * 4);
              switch (edge) {
                case 0:
                  x = player.x + (Math.random() - 0.5) * 1000;
                  y = player.y - 500;
                  break;
                case 1:
                  x = player.x + (Math.random() - 0.5) * 1000;
                  y = player.y + 500;
                  break;
                case 2:
                  x = player.x - 500;
                  y = player.y + (Math.random() - 0.5) * 1000;
                  break;
                case 3:
                  x = player.x + 500;
                  y = player.y + (Math.random() - 0.5) * 1000;
                  break;
              }
              attempts++;
            } while (checkCollisionServer(x, y) && attempts < maxAttempts);

            if (attempts < maxAttempts) {
              const wolfId = `wolf_${now}_${i}`;
              const wolf = {
                id: wolfId,
                x,
                y,
                health: 100,
                direction: "down",
                state: "walking",
                worldId: 1,
                lastAttackTime: 0,
              };
              wolves.set(wolfId, wolf);
              worldWolvesMap.set(wolfId, wolf);
              newWolves.push(wolf);
            }
          }
          if (newWolves.length > 0) {
            const msg = JSON.stringify({
              type: "updateWolf",
              worldId: 1,
              wolves: newWolves,
            });
            broadcastToWorld(wss, clients, players, 1, msg);
          }
        }

        // --- Логика волков (движение + атака) ---
        const alivePlayers = Array.from(players.values()).filter(
          (p) => p.worldId === 1 && p.health > 0
        );
        const updateWolves = [];
        const removeWolves = [];
        const dropItems = [];

        for (const [wolfId, wolf] of worldWolvesMap) {
          let closestPlayer = null;
          let minDistance = Infinity;

          for (const player of alivePlayers) {
            const dx = wolf.x - player.x;
            const dy = wolf.y - player.y;
            const distance = dx * dx + dy * dy;
            if (distance < minDistance) {
              minDistance = distance;
              closestPlayer = player;
            }
          }

          if (closestPlayer) {
            const dx = closestPlayer.x - wolf.x;
            const dy = closestPlayer.y - wolf.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const speed = 2;

            if (distance > 40) {
              const angle = Math.atan2(dy, dx);
              wolf.x += Math.cos(angle) * speed;
              wolf.y += Math.sin(angle) * speed;
              wolf.state = "walking";
              wolf.direction =
                Math.abs(dx) > Math.abs(dy)
                  ? dx > 0
                    ? "right"
                    : "left"
                  : dy > 0
                  ? "down"
                  : "up";
            } else if (now - wolf.lastAttackTime >= 3000) {
              const damage = Math.floor(Math.random() * 10) + 1;
              closestPlayer.health = Math.max(0, closestPlayer.health - damage);
              wolf.lastAttackTime = now;

              players.set(closestPlayer.id, { ...closestPlayer });
              userDatabase.set(closestPlayer.id, { ...closestPlayer });
              saveUserDatabase(dbCollection, closestPlayer.id, closestPlayer); // Оставляем, но можно вынести в очередь

              // Отправим апдейт игрока отдельно
              const playerUpdateMsg = JSON.stringify({
                type: "update",
                player: closestPlayer,
              });
              broadcastToWorld(wss, clients, players, 1, playerUpdateMsg);
            }

            if (wolf.health <= 0 && wolf.state !== "dying") {
              wolf.state = "dying";
              wolf.frame = 0;
            }

            updateWolves.push({ ...wolf });

            if (wolf.state === "dying" && wolf.frame >= 3) {
              removeWolves.push(wolfId);
              const itemId = `wolf_skin_${now}`;
              const drop = {
                x: wolf.x,
                y: wolf.y,
                type: "wolf_skin",
                spawnTime: now,
                worldId: 1,
                isDroppedByPlayer: false,
              };
              items.set(itemId, drop);
              worldItemsMap.set(itemId, drop);
              dropItems.push({ itemId, ...drop });
            }
          }
        }

        // Отправляем обновления волков
        if (updateWolves.length > 0) {
          const msg = JSON.stringify({
            type: "updateWolf",
            worldId: 1,
            wolves: updateWolves,
          });
          broadcastToWorld(wss, clients, players, 1, msg);
        }

        // Удаление мёртвых волков + дроп
        if (removeWolves.length > 0) {
          const removeMsg = JSON.stringify({
            type: "removeWolf",
            worldId: 1,
            wolfIds: removeWolves,
          });
          broadcastToWorld(wss, clients, players, 1, removeMsg);

          if (dropItems.length > 0) {
            const dropMsg = JSON.stringify({
              type: "itemDropped",
              items: dropItems,
            });
            broadcastToWorld(wss, clients, players, 1, dropMsg);
          }

          for (const wolfId of removeWolves) {
            wolves.delete(wolfId);
            worldWolvesMap.delete(wolfId);
          }
        }
      }

      // === 5. Синхронизация всех предметов (только если нужно) ===
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
  }, 30_000); // 30 секунд
}

// === УТИЛИТА: отправка сообщения всем в мире ===
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
