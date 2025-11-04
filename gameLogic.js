const { saveUserDatabase } = require("./database");

function checkCollisionServer(x, y) {
  return false; // Пока оставляем как есть
}

// КЭШИРОВАНИЕ: чтобы не пересчитывать одни и те же данные
const worldPlayerCache = new Map(); // worldId → Set(playerId)
const worldItemCache = new Map(); // worldId → Map(itemId, item)

function runGameLoop(
  wss,
  dbCollection,
  clients,
  players,
  items,
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
