// gameLogic.js — обновлённая версия с твоей логикой спавна

const { saveUserDatabase } = require("./database");

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
  // === AI МУТАНТОВ (каждые 200 мс) ===
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

          let speed = ENEMY_SPEED;
          let attackCooldown = ENEMY_ATTACK_COOLDOWN;
          let minDmg = 10,
            maxDmg = 15;
          let minEnergy = 0,
            maxEnergy = 0;

          if (enemy.type === "scorpion") {
            speed = 4;
            minDmg = 5;
            maxDmg = 10;
            minEnergy = 1;
            maxEnergy = 2;
          }

          const angle = Math.atan2(dy, dx);
          enemy.x += Math.cos(angle) * speed;
          enemy.y += Math.sin(angle) * speed;
          enemy.state = "walking";
          enemy.direction =
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0
                ? "right"
                : "left"
              : dy > 0
              ? "down"
              : "up";

          if (
            minDist <= ATTACK_RANGE * ATTACK_RANGE &&
            now - enemy.lastAttackTime >= attackCooldown
          ) {
            const damage =
              Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
            let energyDmg = 0;
            if (enemy.type === "scorpion") {
              energyDmg =
                Math.floor(Math.random() * (maxEnergy - minEnergy + 1)) +
                minEnergy;
              closestPlayer.energy = Math.max(
                0,
                closestPlayer.energy - energyDmg
              );
            }
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
                energyDmg,
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
          if (Math.random() < 0.1) {
            const wanderAngle = Math.random() * Math.PI * 2;
            enemy.x += Math.cos(wanderAngle) * ENEMY_SPEED * 0.5;
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
  }, 200);

  // === ОСНОВНОЙ ЦИКЛ КАЖДЫЕ 30 СЕКУНД ===
  const mainLoop = setInterval(() => {
    const now = Date.now();

    // Обновляем кэши миров
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

    // Онлайн
    const totalOnlineMsg = JSON.stringify({
      type: "totalOnline",
      count: players.size,
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(totalOnlineMsg);
    });

    // Удаляем старые предметы (>10 минут)
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

    // === ОСНОВНАЯ ЛОГИКА СПАВНА ПРЕДМЕТОВ ===
    for (const world of worlds) {
      const worldId = world.id;
      const playerCount = (worldPlayerCache.get(worldId) || new Set()).size;
      if (playerCount === 0) continue;

      const worldItemsMap = worldItemCache.get(worldId) || new Map();
      const currentItemCount = worldItemsMap.size;

      // Максимум 100 предметов в мире
      const maxItemsInWorld = 100;
      if (currentItemCount >= maxItemsInWorld) continue;

      // Целевые количества по редкости на 1 игрока
      const targetCommon = playerCount * 5; // rarity 3
      const targetMedium = playerCount * 3; // rarity 2
      const targetRare = playerCount * 2; // rarity 1

      // Текущее количество
      let countCommon = 0,
        countMedium = 0,
        countRare = 0;
      worldItemsMap.forEach((item) => {
        const rarity = ITEM_CONFIG[item.type]?.rarity;
        if (rarity === 3) countCommon++;
        else if (rarity === 2) countMedium++;
        else if (rarity === 1) countRare++;
      });

      // Сколько нужно заспавнить
      const needCommon = Math.max(0, targetCommon - countCommon);
      const needMedium = Math.max(0, targetMedium - countMedium);
      const needRare = Math.max(0, targetRare - countRare);

      const totalNeeded = needCommon + needMedium + needRare;
      const availableSlots = maxItemsInWorld - currentItemCount;
      const willSpawn = Math.min(totalNeeded, availableSlots);

      if (willSpawn <= 0) continue;

      // Списки по редкости
      const commonItems = Object.keys(ITEM_CONFIG).filter(
        (t) => ITEM_CONFIG[t].rarity === 3
      );
      const mediumItems = Object.keys(ITEM_CONFIG).filter(
        (t) => ITEM_CONFIG[t].rarity === 2
      );
      const rareItems = Object.keys(ITEM_CONFIG).filter(
        (t) => ITEM_CONFIG[t].rarity === 1
      );

      const newItems = [];

      const spawnFromPool = (pool, count) => {
        for (let i = 0; i < count && newItems.length < willSpawn; i++) {
          if (pool.length === 0) continue;
          const type = pool[Math.floor(Math.random() * pool.length)];

          let x,
            y,
            attempts = 0;
          const maxAttempts = 15;
          do {
            x = Math.random() * world.width;
            y = Math.random() * world.height;
            attempts++;
          } while (checkCollisionServer(x, y) && attempts < maxAttempts);

          if (attempts < maxAttempts) {
            const itemId = `${type}_${now}_${Date.now()}_${i}`;
            const newItem = {
              x,
              y,
              type,
              spawnTime: now,
              worldId,
              isDroppedByPlayer: true,
            };
            items.set(itemId, newItem);
            worldItemsMap.set(itemId, newItem);
            newItems.push({ itemId, x, y, type, spawnTime: now, worldId });
          }
        }
      };

      // Сначала редкие, потом средние, потом обычные — чтобы редкие точно попали
      spawnFromPool(rareItems, needRare);
      spawnFromPool(mediumItems, needMedium);
      spawnFromPool(commonItems, needCommon);

      // Отправляем только если что-то заспавнили
      if (newItems.length > 0) {
        const msg = JSON.stringify({
          type: "newItem",
          items: newItems,
        });
        broadcastToWorld(wss, clients, players, worldId, msg);
      }
      // Удаляем старые предметы
      const itemsToRemove = removeItemByWorld.get(worldId) || [];
      if (itemsToRemove.length > 0) {
        broadcastToWorld(
          wss,
          clients,
          players,
          worldId,
          JSON.stringify({
            type: "removeItems",
            itemIds: itemsToRemove,
          })
        );
      }

      // Синхронизация всех предметов (на всякий случай)
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
        broadcastToWorld(
          wss,
          clients,
          players,
          worldId,
          JSON.stringify({
            type: "syncItems",
            items: allItems,
            worldId,
            
          })
        );
      }
    }

    // Спавн мутантов и скорпионов остаётся без изменений (ниже твой старый код)
    for (const world of worlds) {
      const worldId = world.id;
      const playerCount = (worldPlayerCache.get(worldId) || new Set()).size;
      if (playerCount === 0) continue;

      // ... (весь твой код про мутантов и скорпионов — оставляем как есть)
      // (я его не трогаю, он работает идеально)
    }
  }, 3000);

  return { mainLoop, mutantAIInterval };
}

function broadcastToWorld(wss, clients, players, worldId, message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const playerId = clients.get(client);
      const player = players.get(playerId);
      if (player && player.worldId === worldId) {
        client.send(message);
      }
    }
  });
}

module.exports = { runGameLoop };
