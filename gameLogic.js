const { saveUserDatabase } = require("./database");

const UPDATE_INTERVAL = 100; // 10 FPS для всех обновлений
let updateTimeout = null;
const updateBuffer = new Map();

function checkCollisionServer(x, y) {
  return false; // Пока оставляем как есть
}

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

  // 1. Подсчёт игроков по мирам
  const playerCountPerWorld = new Map();
  const worldPlayers = new Map(); // worldId -> [player]
  const worldWolves = new Map();  // worldId -> [wolf]
  const worldItems = new Map();   // worldId -> [item]

  for (const world of worlds) {
    playerCountPerWorld.set(world.id, 0);
    worldPlayers.set(world.id, []);
    worldWolves.set(world.id, []);
    worldItems.set(world.id, []);
  }

  // Оптимизация: один проход по игрокам
  for (const player of players.values()) {
    if (worldPlayers.has(player.worldId)) {
      playerCountPerWorld.set(player.worldId, playerCountPerWorld.get(player.worldId) + 1);
      worldPlayers.get(player.worldId).push(player);
    }
  }

  // Один проход по волкам
  for (const wolf of wolves.values()) {
    if (worldWolves.has(wolf.worldId)) {
      worldWolves.get(wolf.worldId).push(wolf);
    }
  }

  // Один проход по предметам
  for (const [itemId, item] of items) {
    if (worldItems.has(item.worldId)) {
      worldItems.get(item.worldId).push({ itemId, ...item });
    }
  }

  const totalPlayers = players.size;

  // 2. Отправка totalOnline (раз в 10 сек)
  if (Math.floor(currentTime / 10000) !== Math.floor((currentTime - 100) / 10000)) {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "totalOnline", count: totalPlayers }));
      }
    }
  }

  // 3. Удаление старых предметов
  for (const [itemId, item] of items) {
    if (currentTime - item.spawnTime > 10 * 60 * 1000) {
      items.delete(itemId);
      const worldBuf = updateBuffer.get(item.worldId) || { removeItems: [] };
      worldBuf.removeItems = worldBuf.removeItems || [];
      worldBuf.removeItems.push(itemId);
      updateBuffer.set(item.worldId, worldBuf);
    }
  }

  // === ЛОГИКА ПО МИРАМ ===
  for (const world of worlds) {
    const playerCount = playerCountPerWorld.get(world.id) || 0;
    const playersInWorld = worldPlayers.get(world.id) || [];
    const wolvesInWorld = worldWolves.get(world.id) || [];
    const itemsInWorld = worldItems.get(world.id) || [];

    const worldBuf = updateBuffer.get(world.id) || {};
    worldBuf.players = worldBuf.players || [];
    worldBuf.wolves = worldBuf.wolves || [];
    worldBuf.items = worldBuf.items || [];
    worldBuf.removeWolves = worldBuf.removeWolves || [];
    worldBuf.removeItems = worldBuf.removeItems || [];
    updateBuffer.set(world.id, worldBuf);

    // === СПАВН ПРЕДМЕТОВ ===
    const itemCounts = {};
    for (const [type] of Object.entries(ITEM_CONFIG)) {
      itemCounts[type] = 0;
    }
    for (const item of itemsInWorld) {
      if (itemCounts[item.type] !== undefined) itemCounts[item.type]++;
    }

    const desiredTotalItems = playerCount * 10;
    const currentTotalItems = itemsInWorld.length;

    if (currentTotalItems < desiredTotalItems) {
      const itemsToSpawn = Math.min(desiredTotalItems - currentTotalItems, 5); // не больше 5 за тик

      const rareItems = Object.keys(ITEM_CONFIG).filter(t => ITEM_CONFIG[t].rarity === 1);
      const mediumItems = Object.keys(ITEM_CONFIG).filter(t => ITEM_CONFIG[t].rarity === 2);
      const commonItems = Object.keys(ITEM_CONFIG).filter(t => ITEM_CONFIG[t].rarity === 3);

      let rareCount = playerCount * 2;
      let mediumCount = playerCount * 3;
      let commonCount = playerCount * 5;

      for (let i = 0; i < itemsToSpawn; i++) {
        let type;
        if (rareCount > 0 && rareItems.length > 0 && itemCounts[rareItems[0]] < rareCount) {
          type = rareItems[Math.floor(Math.random() * rareItems.length)];
          rareCount--;
        } else if (mediumCount > 0 && mediumItems.length > 0 && itemCounts[mediumItems[0]] < mediumCount) {
          type = mediumItems[Math.floor(Math.random() * mediumItems.length)];
          mediumCount--;
        } else if (commonCount > 0 && commonItems.length > 0 && itemCounts[commonItems[0]] < commonCount) {
          type = commonItems[Math.floor(Math.random() * commonItems.length)];
          commonCount--;
        } else {
          const all = Object.keys(ITEM_CONFIG).filter(t => ITEM_CONFIG[t].rarity !== 4);
          type = all[Math.floor(Math.random() * all.length)];
        }

        let x, y, attempts = 0;
        do {
          x = Math.random() * world.width;
          y = Math.random() * world.height;
          attempts++;
        } while (checkCollisionServer(x, y) && attempts < 10);

        if (attempts < 10) {
          const itemId = `${type}_${currentTime}_${i}`;
          const newItem = { x, y, type, spawnTime: currentTime, worldId: world.id };
          items.set(itemId, newItem);

          worldBuf.items.push({
            itemId,
            x: newItem.x,
            y: newItem.y,
            type: newItem.type,
            spawnTime: newItem.spawnTime,
            worldId: world.id
          });

          if (type === "atom") {
            console.log(`АТОМ: ${itemId} @ ${world.id} (${x.toFixed(1)}, ${y.toFixed(1)})`);
          }
        }
      }
    }

    // === ВОЛКИ (только мир 1) ===
    if (world.id === 1) {
      const maxWolves = Math.max(5, playerCount * 2);
      const currentWolves = wolvesInWorld.length;

      if (currentWolves < maxWolves && playersInWorld.length > 0) {
        const toSpawn = Math.min(maxWolves - currentWolves, 3);
        const player = playersInWorld[0]; // ближайший — первый

        for (let i = 0; i < toSpawn; i++) {
          let x, y, attempts = 0;
          do {
            const edge = Math.floor(Math.random() * 4);
            switch (edge) {
              case 0: x = player.x + (Math.random() - 0.5) * 1000; y = player.y - 500; break;
              case 1: x = player.x + (Math.random() - 0.5) * 1000; y = player.y + 500; break;
              case 2: x = player.x - 500; y = player.y + (Math.random() - 0.5) * 1000; break;
              case 3: x = player.x + 500; y = player.y + (Math.random() - 0.5) * 1000; break;
            }
            attempts++;
          } while (checkCollisionServer(x, y) && attempts < 10);

          if (attempts < 10) {
            const wolfId = `wolf_${currentTime}_${i}`;
            const wolf = {
              id: wolfId, x, y, health: 100, direction: "down", state: "walking",
              worldId: world.id, lastAttackTime: 0, frame: 0
            };
            wolves.set(wolfId, wolf);
            worldBuf.wolves.push(wolf);
          }
        }
      }

      // === ЛОГИКА ВОЛКОВ ===
      for (const wolf of wolvesInWorld) {
        let closest = null;
        let minDist = Infinity;

        for (const player of playersInWorld) {
          if (player.health <= 0) continue;
          const dx = wolf.x - player.x;
          const dy = wolf.y - player.y;
          const dist = dx * dx + dy * dy;
          if (dist < minDist) {
            minDist = dist;
            closest = player;
          }
        }

        if (closest) {
          const dx = closest.x - wolf.x;
          const dy = closest.y - wolf.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 40) {
            const angle = Math.atan2(dy, dx);
            wolf.x += Math.cos(angle) * 2;
            wolf.y += Math.sin(angle) * 2;
            wolf.state = "walking";
            wolf.direction = Math.abs(dx) > Math.abs(dy)
              ? dx > 0 ? "right" : "left"
              : dy > 0 ? "down" : "up";
          } else if (currentTime - wolf.lastAttackTime >= 3000) {
            const damage = Math.floor(Math.random() * 10) + 1;
            closest.health = Math.max(0, closest.health - damage);
            wolf.lastAttackTime = currentTime;

            players.set(closest.id, { ...closest });
            userDatabase.set(closest.id, { ...closest });
            saveUserDatabase(dbCollection, closest.id, closest);

            worldBuf.players.push(closest);
          }

          if (wolf.health <= 0 && wolf.state !== "dying") {
            wolf.state = "dying";
            wolf.frame = 0;
          }

          if (wolf.state === "dying") {
            wolf.frame = (wolf.frame || 0) + 1;
            if (wolf.frame >= 3) {
              wolves.delete(wolf.id);
              worldBuf.removeWolves.push(wolf.id);

              const itemId = `wolf_skin_${currentTime}`;
              items.set(itemId, {
                x: wolf.x, y: wolf.y, type: "wolf_skin",
                spawnTime: currentTime, worldId: world.id
              });
              worldBuf.items.push({
                itemId, x: wolf.x, y: wolf.y, type: "wolf_skin",
                spawnTime: currentTime, worldId: world.id
              });
            }
          }

          worldBuf.wolves.push(wolf);
        }
      }
    }
  }

  // === ОТПРАВКА БАТЧЕЙ ===
  if (updateTimeout) return;

  updateTimeout = setTimeout(() => {
    updateTimeout = null;

    for (const [worldId, buf] of updateBuffer) {
      const message = {
        type: "batchUpdate",
        worldId,
        players: buf.players || [],
        wolves: buf.wolves || [],
        newItems: buf.items || [],
        removeWolves: buf.removeWolves || [],
        removeItems: buf.removeItems || []
      };

      for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        const player = players.get(clients.get(client));
        if (player && player.worldId === worldId) {
          client.send(JSON.stringify(message));
        }
      }
    }

    updateBuffer.clear();
  }, UPDATE_INTERVAL);
}, 100); // каждые 100 мс
}

module.exports = { runGameLoop };
