const { saveUserDatabase } = require("./database");

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

const tradeRequests = new Map();
const tradeOffers = new Map();

const ENEMY_SPEED = 2;
const AGGRO_RANGE = 300;
const ATTACK_RANGE = 50;
const ENEMY_ATTACK_COOLDOWN = 1000;

function calculateXPToNextLevel(level) {
  if (level >= 100) return 0;
  return 100 * Math.pow(2, level);
}

function setupWebSocket(
  wss,
  dbCollection,
  clients,
  players,
  userDatabase,
  items,
  lights,
  worlds,
  ITEM_CONFIG,
  INACTIVITY_TIMEOUT,
  enemies
) {
  function checkCollisionServer(x, y) {
    return false;
  }

  function calculateMaxStats(player, ITEM_CONFIG) {
    const baseStats = {
      health: 100 + (player.healthUpgrade || 0),
      energy: 100 + (player.energyUpgrade || 0),
      food: 100 + (player.foodUpgrade || 0),
      water: 100 + (player.waterUpgrade || 0),
      armor: 0,
    };

    player.damage = 0;

    Object.values(player.equipment || {}).forEach((item) => {
      if (item && ITEM_CONFIG[item.type]?.effect) {
        const effect = ITEM_CONFIG[item.type].effect;
        if (effect.armor) baseStats.armor += effect.armor;
        if (effect.health) baseStats.health += effect.health;
        if (effect.energy) baseStats.energy += effect.energy;
        if (effect.food) baseStats.food += effect.food;
        if (effect.water) baseStats.water += effect.water;
        if (effect.damage) {
          if (
            typeof effect.damage === "object" &&
            effect.damage.min &&
            effect.damage.max
          ) {
            player.damage = { ...effect.damage };
          } else {
            player.damage += effect.damage;
          }
        }
      }
    });

    player.maxStats = { ...baseStats };
    player.health = Math.min(player.health, player.maxStats.health);
    player.energy = Math.min(player.energy, player.maxStats.energy);
    player.food = Math.min(player.food, player.maxStats.food);
    player.water = Math.min(player.water, player.maxStats.water);
    player.armor = Math.min(player.armor, player.maxStats.armor);
  }

  // === НОВАЯ ФУНКЦИЯ: спавн врага с отправкой newEnemy ===
  function spawnNewEnemy(worldId) {
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
      })
    );
  }

  wss.on("connection", (ws) => {
    console.log("Client connected");

    let inactivityTimer = setTimeout(() => {
      console.log("Client disconnected due to inactivity");
      ws.close(4000, "Inactivity timeout");
    }, INACTIVITY_TIMEOUT);

    ws.on("message", async (message) => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.log("Client disconnected due to inactivity");
        ws.close(4000, "Inactivity timeout");
      }, INACTIVITY_TIMEOUT);

      let data;
      try {
        data = JSON.parse(message);
      } catch (e) {
        console.error("Invalid JSON:", e);
        return;
      }

      if (data.type === "register") {
        if (userDatabase.has(data.username)) {
          ws.send(JSON.stringify({ type: "registerFail" }));
        } else {
          const newPlayer = {
            id: data.username,
            password: data.password,
            x: 605,
            y: 3177,
            health: 100,
            energy: 100,
            food: 100,
            water: 100,
            armor: 0, // Current armor: 0
            distanceTraveled: 0,
            direction: "down",
            state: "idle",
            frame: 0,
            inventory: Array(20).fill(null),
            equipment: {
              head: null,
              chest: null,
              belt: null,
              pants: null,
              boots: null,
              weapon: null,
              gloves: null,
            },
            npcMet: false,
            jackMet: false,
            alexNeonMet: false,
            captainMet: false,
            level: 0,
            xp: 0,
            upgradePoints: 0,
            availableQuests: [],
            worldId: 0,
            hasSeenWelcomeGuide: false,
            worldPositions: { 0: { x: 222, y: 3205 } },

            // ДОБАВЬ ЭТИ ПОЛЯ (базово 0)
            healthUpgrade: 0,
            energyUpgrade: 0,
            foodUpgrade: 0,
            waterUpgrade: 0,
            neonQuest: {
              currentQuestId: null,
              progress: {},
              completed: [],
            },
            medicalCertificate: false,
          };

          userDatabase.set(data.username, newPlayer);
          await saveUserDatabase(dbCollection, data.username, newPlayer);
          ws.send(JSON.stringify({ type: "registerSuccess" }));
        }
      } else if (data.type === "worldTransition") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          const oldWorldId = player.worldId;
          const targetWorldId = data.targetWorldId;

          if (!worlds.find((w) => w.id === targetWorldId)) {
            return;
          }

          player.worldId = targetWorldId;
          player.x = data.x;
          player.y = data.y;
          player.worldPositions[targetWorldId] = { x: data.x, y: data.y };

          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === oldWorldId) {
                client.send(JSON.stringify({ type: "playerLeft", id }));
              }
            }
          });

          const worldPlayers = Array.from(players.values()).filter(
            (p) => p.id !== id && p.worldId === targetWorldId
          );

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === targetWorldId) {
                client.send(JSON.stringify({ type: "newPlayer", player }));
              }
            }
          });

          const worldItems = Array.from(items.entries())
            .filter(([_, item]) => item.worldId === targetWorldId)
            .map(([itemId, item]) => ({
              itemId,
              x: item.x,
              y: item.y,
              type: item.type,
              spawnTime: item.spawnTime,
              worldId: item.worldId,
            }));
          const worldEnemies = Array.from(enemies.entries())
            .filter(([_, enemy]) => enemy.worldId === targetWorldId)
            .map(([enemyId, enemy]) => ({
              enemyId,
              x: enemy.x,
              y: enemy.y,
              health: enemy.health,
              direction: enemy.direction,
              state: enemy.state,
              frame: enemy.frame,
              worldId: enemy.worldId,
            }));

          ws.send(
            JSON.stringify({
              type: "worldTransitionSuccess",
              worldId: targetWorldId,
              x: player.x,
              y: player.y,
              lights: lights.get(targetWorldId).map(({ id, ...rest }) => rest),
              players: worldPlayers,
              items: worldItems,
              enemies: worldEnemies,
            })
          );
        }
      } else if (data.type === "syncPlayers") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          const worldId = data.worldId;
          if (player.worldId !== worldId) {
            return;
          }
          const worldPlayers = Array.from(players.values()).filter(
            (p) => p.id !== id && p.worldId === worldId
          );
          ws.send(
            JSON.stringify({
              type: "syncPlayers",
              players: worldPlayers,
              worldId,
            })
          );
        }
      } else if (data.type === "login") {
        const player = userDatabase.get(data.username);
        if (player && player.password === data.password) {
          clients.set(ws, data.username);
          const playerData = {
            ...player,
            inventory: player.inventory || Array(20).fill(null),
            equipment: player.equipment || {
              head: null,
              chest: null,
              belt: null,
              pants: null,
              boots: null,
              weapon: null,
              gloves: null,
            },
            npcMet: player.npcMet || false,
            jackMet: player.jackMet || false,
            alexNeonMet: player.alexNeonMet || false,
            captainMet: player.captainMet || false,
            selectedQuestId: player.selectedQuestId || null,
            level: player.level || 0,
            xp: player.xp || 0,
            upgradePoints: player.upgradePoints || 0,
            availableQuests: player.availableQuests || [],
            worldId: player.worldId || 0,
            hasSeenWelcomeGuide: false,
            worldPositions: player.worldPositions || {
              0: { x: player.x, y: player.y },
            },

            // ДОБАВЬ ЭТИ ПОЛЯ
            healthUpgrade: player.healthUpgrade || 0,
            energyUpgrade: player.energyUpgrade || 0,
            foodUpgrade: player.foodUpgrade || 0,
            waterUpgrade: player.waterUpgrade || 0,
            neonQuest: player.neonQuest || {
              currentQuestId: null,
              progress: {},
              completed: [],
            },
            medicalCertificate: player.medicalCertificate || false,
          };

          players.set(data.username, playerData);
          ws.send(
            JSON.stringify({
              type: "loginSuccess",
              id: data.username,
              x: playerData.x,
              y: playerData.y,
              health: playerData.health,
              energy: playerData.energy,
              food: playerData.food,
              water: playerData.water,
              armor: playerData.armor,
              distanceTraveled: playerData.distanceTraveled || 0,
              direction: playerData.direction || "down",
              state: playerData.state || "idle",
              frame: playerData.frame || 0,
              inventory: playerData.inventory,
              equipment: playerData.equipment,
              npcMet: playerData.npcMet,
              jackMet: playerData.jackMet,
              alexNeonMet: playerData.alexNeonMet,
              captainMet: playerData.captainMet,
              selectedQuestId: playerData.selectedQuestId,
              level: playerData.level,
              xp: playerData.xp,
              upgradePoints: playerData.upgradePoints,
              availableQuests: playerData.availableQuests,
              worldId: playerData.worldId,
              hasSeenWelcomeGuide: player.hasSeenWelcomeGuide || false, // ← ЭТО ГЛАВНОЕ
              worldPositions: playerData.worldPositions,
              healthUpgrade: playerData.healthUpgrade || 0,
              energyUpgrade: playerData.energyUpgrade || 0,
              foodUpgrade: playerData.foodUpgrade || 0,
              waterUpgrade: playerData.waterUpgrade || 0,
              neonQuest: playerData.neonQuest,
              players: Array.from(players.values()).filter(
                (p) =>
                  p.id !== data.username && p.worldId === playerData.worldId
              ),
              items: Array.from(items.entries())
                .filter(([_, item]) => item.worldId === playerData.worldId)
                .map(([itemId, item]) => ({
                  itemId,
                  x: item.x,
                  y: item.y,
                  type: item.type,
                  spawnTime: item.spawnTime,
                  worldId: item.worldId,
                  enemies: Array.from(enemies.entries())
                    .filter(
                      ([_, enemy]) => enemy.worldId === playerData.worldId
                    )
                    .map(([enemyId, enemy]) => ({
                      enemyId,
                      x: enemy.x,
                      y: enemy.y,
                      health: enemy.health,
                      direction: enemy.direction,
                      state: enemy.state,
                      frame: enemy.frame,
                      worldId: enemy.worldId,
                    })),
                })),
              healthUpgrade: playerData.healthUpgrade,
              energyUpgrade: playerData.energyUpgrade,
              foodUpgrade: playerData.foodUpgrade,
              waterUpgrade: playerData.waterUpgrade,
              lights: lights
                .get(playerData.worldId)
                .map(({ id, ...rest }) => rest),
            })
          );
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === playerData.worldId) {
                client.send(
                  JSON.stringify({
                    type: "newPlayer",
                    player: players.get(data.username),
                  })
                );
              }
            }
          });
        } else {
          ws.send(JSON.stringify({ type: "loginFail" }));
        }
      } else if (data.type === "buyWater") {
        const id = clients.get(ws);
        if (!id) return;

        const player = players.get(id);
        if (!player || !player.inventory) return;

        const balyarySlot = player.inventory.findIndex(
          (slot) => slot && slot.type === "balyary"
        );
        const balyaryCount =
          balyarySlot !== -1 ? player.inventory[balyarySlot].quantity || 1 : 0;

        if (balyaryCount < data.cost) {
          ws.send(
            JSON.stringify({
              type: "buyWaterResult",
              success: false,
              error: "Not enough balyary!",
            })
          );
          return;
        }

        if (balyaryCount === data.cost) {
          player.inventory[balyarySlot] = null;
        } else {
          player.inventory[balyarySlot].quantity -= data.cost;
        }

        player.water = Math.min(
          player.maxStats.water,
          player.water + data.waterGain
        );

        players.set(id, { ...player });
        userDatabase.set(id, { ...player });
        await saveUserDatabase(dbCollection, id, player);

        ws.send(
          JSON.stringify({
            type: "buyWaterResult",
            success: true,
            option: data.option,
            water: player.water,
            inventory: player.inventory,
            balyaryCount:
              balyarySlot !== -1
                ? player.inventory[balyarySlot]?.quantity || 0
                : 0,
          })
        );
      } else if (data.type === "meetNPC") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.npcMet = data.npcMet;
          if (data.npcMet && data.availableQuests) {
            player.availableQuests = data.availableQuests;
          }
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
        }
      } else if (data.type === "meetJack") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.jackMet = true;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
        }
      } else if (data.type === "meetNeonAlex") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.alexNeonMet = true;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Рассылаем всем в мире обновление (чтобы у других игроков тоже обновился флаг)
          broadcastToWorld(
            wss,
            clients,
            players,
            player.worldId,
            JSON.stringify({
              type: "update",
              player: {
                id: player.id,
                alexNeonMet: true,
              },
            })
          );
        }
      } else if (data.type === "meetCaptain") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.captainMet = data.captainMet;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
        }
      } else if (data.type === "requestNeonQuestSync") {
        const id = clients.get(ws);
        const player = players.get(id);
        ws.send(
          JSON.stringify({
            type: "neonQuestSync",
            progress: player.neonQuest || {
              currentQuestId: null,
              progress: 0,
              completed: [],
            },
            isMet: player.alexNeonMet || false,
          })
        );
      } else if (data.type === "neonQuestProgress") {
        const id = clients.get(ws);
        const player = players.get(id);
        if (player.neonQuest && player.neonQuest.currentQuestId) {
          player.neonQuest.progress = {
            ...player.neonQuest.progress,
            ...data.progress,
          };
          players.set(id, player);
          userDatabase.set(id, player);
          await saveUserDatabase(dbCollection, id, player);
        }
      } else if (data.type === "neonQuestComplete") {
        const id = clients.get(ws);
        if (!id || !players.has(id)) return;

        const player = players.get(id);
        if (
          !player.neonQuest ||
          player.neonQuest.currentQuestId !== "neon_quest_1"
        ) {
          return;
        }

        const kills = player.neonQuest.progress?.killMutants || 0;
        if (kills < 3) {
          return; // Нельзя сдать
        }

        // Даём награду
        player.xp = (player.xp || 0) + 150;
        let xpToNext = calculateXPToNextLevel(player.level);
        while (player.xp >= xpToNext && player.level < 100) {
          player.level += 1;
          player.xp -= xpToNext;
          player.upgradePoints = (player.upgradePoints || 0) + 10;
          xpToNext = calculateXPToNextLevel(player.level);
        }

        // Даём 50 баляров
        let added = false;
        for (let i = 0; i < player.inventory.length; i++) {
          if (player.inventory[i]?.type === "balyary") {
            player.inventory[i].quantity += 50;
            added = true;
            break;
          }
          if (!player.inventory[i]) {
            player.inventory[i] = { type: "balyary", quantity: 50 };
            added = true;
            break;
          }
        }

        // Завершаем квест
        player.neonQuest.currentQuestId = null;
        if (!player.neonQuest.completed) player.neonQuest.completed = [];
        player.neonQuest.completed.push("neon_quest_1");
        player.neonQuest.progress = {};

        // Сохраняем
        players.set(id, player);
        userDatabase.set(id, player);
        await saveUserDatabase(dbCollection, id, player);

        // Отправляем клиенту
        ws.send(
          JSON.stringify({
            type: "neonQuestCompleted",
            reward: { xp: 150, balyary: 50 },
            level: player.level,
            xp: player.xp,
            xpToNextLevel: xpToNext,
            upgradePoints: player.upgradePoints,
            inventory: player.inventory,
          })
        );
      } else if (data.type === "move") {
        const id = clients.get(ws);
        if (id) {
          const existingPlayer = players.get(id);
          const updatedPlayer = {
            ...existingPlayer,
            ...data,
            inventory: existingPlayer.inventory || Array(20).fill(null),
            npcMet: existingPlayer.npcMet || false,
            level: existingPlayer.level || 0,
            xp: existingPlayer.xp || 0,
            maxStats: existingPlayer.maxStats || {
              health: 100,
              energy: 100,
              food: 100,
              water: 100,
            },
            upgradePoints: existingPlayer.upgradePoints || 0,
            worldId:
              data.worldId !== undefined
                ? data.worldId
                : existingPlayer.worldId || 0,
            worldPositions: existingPlayer.worldPositions || {},
            alexNeonMet: existingPlayer.alexNeonMet || false,
          };
          if (data.worldId !== undefined) {
            updatedPlayer.worldPositions[data.worldId] = {
              x: data.x,
              y: data.y,
            };
          }
          players.set(id, updatedPlayer);
          userDatabase.set(id, updatedPlayer);
          await saveUserDatabase(dbCollection, id, updatedPlayer);
          // Broadcast update to all players in the same world
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (
                clientPlayer &&
                clientPlayer.worldId === updatedPlayer.worldId
              ) {
                client.send(
                  JSON.stringify({
                    type: "update",
                    player: updatedPlayer,
                  })
                );
              }
            }
          });
        }
      } else if (data.type === "updateLevel") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.level = data.level;
          player.xp = data.xp;
          player.upgradePoints = data.upgradePoints || 0;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              clients.get(client) === id
            ) {
              client.send(
                JSON.stringify({ type: "update", player: { id, ...player } })
              );
            }
          });
        }
      } else if (data.type === "updateMaxStats") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.upgradePoints = data.upgradePoints;
          // СОХРАНЯЕМ UPGRADE ПОЛЯ
          player.healthUpgrade =
            data.healthUpgrade || player.healthUpgrade || 0;
          player.energyUpgrade =
            data.energyUpgrade || player.energyUpgrade || 0;
          player.foodUpgrade = data.foodUpgrade || player.foodUpgrade || 0;
          player.waterUpgrade = data.waterUpgrade || player.waterUpgrade || 0;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              clients.get(client) === id
            ) {
              client.send(
                JSON.stringify({ type: "update", player: { id, ...player } })
              );
            }
          });
        }
      } else if (data.type === "updateInventory") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.inventory = data.inventory;
          player.availableQuests =
            data.availableQuests || player.availableQuests;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              clients.get(client) === id
            ) {
              client.send(
                JSON.stringify({ type: "update", player: { id, ...player } })
              );
            }
          });
        }
      } else if (data.type === "unequipItem") {
        const playerId = clients.get(ws);
        if (!playerId) {
          ws.send(
            JSON.stringify({
              type: "unequipItemFail",
              error: "Игрок не найден",
            })
          );
          return;
        }

        const player = players.get(playerId);
        if (!player || !player.equipment || !player.inventory) {
          ws.send(
            JSON.stringify({
              type: "unequipItemFail",
              error: "Данные игрока недоступны",
            })
          );
          return;
        }

        const { slotName, inventorySlot, itemId } = data;

        // Проверяем валидность слота
        const validSlots = [
          "head",
          "chest",
          "belt",
          "pants",
          "boots",
          "weapon",
          "gloves",
        ];
        if (!validSlots.includes(slotName)) {
          ws.send(
            JSON.stringify({
              type: "unequipItemFail",
              error: "Недопустимый слот",
            })
          );
          return;
        }

        // Проверяем наличие предмета и совпадение itemId
        if (
          !player.equipment[slotName] ||
          player.equipment[slotName].itemId !== itemId
        ) {
          ws.send(
            JSON.stringify({
              type: "unequipItemFail",
              error: "Предмет не найден или неверный ID",
            })
          );
          return;
        }

        // Проверяем, свободен ли слот инвентаря
        if (player.inventory[inventorySlot] !== null) {
          ws.send(
            JSON.stringify({
              type: "unequipItemFail",
              error: "Слот инвентаря занят",
            })
          );
          return;
        }

        // Перемещаем предмет в инвентарь
        player.inventory[inventorySlot] = {
          type: player.equipment[slotName].type,
          quantity: player.equipment[slotName].quantity || 1,
          itemId: player.equipment[slotName].itemId,
        };
        player.equipment[slotName] = null;

        // Полностью пересчитываем maxStats и обрезаем текущие статы
        calculateMaxStats(player, ITEM_CONFIG);

        // Сохраняем изменения
        players.set(playerId, { ...player });
        userDatabase.set(playerId, { ...player });
        await saveUserDatabase(dbCollection, playerId, player);

        // Отправляем подтверждение клиенту
        ws.send(
          JSON.stringify({
            type: "unequipItemSuccess",
            slotName,
            inventorySlot,
            inventory: player.inventory,
            equipment: player.equipment,
            maxStats: player.maxStats,
            stats: {
              health: player.health,
              energy: player.energy,
              food: player.food,
              water: player.water,
              armor: player.armor,
              damage: player.damage,
            },
          })
        );

        // Отправляем обновление другим игрокам в том же мире
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            const clientPlayer = players.get(clients.get(client));
            if (clientPlayer && clientPlayer.worldId === player.worldId) {
              client.send(
                JSON.stringify({
                  type: "update",
                  player: {
                    id: playerId,
                    maxStats: player.maxStats,
                    health: player.health,
                    energy: player.energy,
                    food: player.food,
                    water: player.water,
                    armor: player.armor,
                    damage: player.damage,
                  },
                })
              );
            }
          }
        });
      } else if (data.type === "updateQuests") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.availableQuests =
            data.availableQuests || player.availableQuests;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
        }
      } else if (data.type === "pickup") {
        const id = clients.get(ws);
        if (!id) return;

        if (!items.has(data.itemId)) {
          ws.send(
            JSON.stringify({ type: "itemNotFound", itemId: data.itemId })
          );
          return;
        }

        const item = items.get(data.itemId);
        const player = players.get(id);
        if (!player.inventory) player.inventory = Array(20).fill(null);

        // НОВОЕ: Расширили условие на atom, чтобы он тоже стекался как balyary
        if (item.type === "balyary" || item.type === "atom") {
          const quantityToAdd = item.quantity || 1;
          // ИЗМЕНЕНО: Ищем слот с соответствующим типом (balyary или atom)
          const stackSlot = player.inventory.findIndex(
            (slot) => slot && slot.type === item.type // Теперь проверяем item.type, чтобы работало для atom
          );
          if (stackSlot !== -1) {
            player.inventory[stackSlot].quantity =
              (player.inventory[stackSlot].quantity || 1) + quantityToAdd;
          } else {
            const freeSlot = player.inventory.findIndex(
              (slot) => slot === null
            );
            if (freeSlot !== -1) {
              player.inventory[freeSlot] = {
                type: item.type, // Используем item.type, чтобы было "atom" или "balyary"
                quantity: quantityToAdd,
                itemId: data.itemId,
              };
            } else {
              ws.send(
                JSON.stringify({ type: "inventoryFull", itemId: data.itemId })
              );
              return;
            }
          }
        } else {
          const freeSlot = player.inventory.findIndex((slot) => slot === null);
          if (freeSlot !== -1) {
            player.inventory[freeSlot] = {
              type: item.type,
              itemId: data.itemId,
            };
          } else {
            ws.send(
              JSON.stringify({ type: "inventoryFull", itemId: data.itemId })
            );
            return;
          }
        }

        items.delete(data.itemId);
        players.set(id, { ...player });
        userDatabase.set(id, { ...player });
        await saveUserDatabase(dbCollection, id, player);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const clientPlayer = players.get(clients.get(client));
            if (clientPlayer && clientPlayer.worldId === item.worldId) {
              client.send(
                JSON.stringify({
                  type: "itemPicked",
                  itemId: data.itemId,
                  playerId: id,
                  item: {
                    type: item.type,
                    itemId: data.itemId,
                    quantity: item.quantity || 1,
                    isDroppedByPlayer: item.isDroppedByPlayer || false,
                  },
                })
              );
              if (clients.get(client) === id) {
                client.send(
                  JSON.stringify({ type: "update", player: { id, ...player } })
                );
              }
            }
          }
        });

        setTimeout(() => {
          const worldWidth = worlds.find((w) => w.id === item.worldId).width;
          const worldHeight = worlds.find((w) => w.id === item.worldId).height;
          const newItemId = `${item.type}_${Date.now()}`;
          const newItem = {
            x: Math.random() * worldWidth,
            y: Math.random() * worldHeight,
            type: item.type,
            spawnTime: Date.now(),
            worldId: item.worldId,
          };
          items.set(newItemId, newItem);
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === item.worldId) {
                client.send(
                  JSON.stringify({
                    type: "newItem",
                    itemId: newItemId,
                    x: newItem.x,
                    y: newItem.y,
                    type: newItem.type,
                    spawnTime: newItem.spawnTime,
                    worldId: newItem.worldId,
                  })
                );
              }
            }
          });
        }, 10 * 60 * 1000);
      } else if (data.type === "chat") {
        const id = clients.get(ws);
        if (id) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({ type: "chat", id, message: data.message })
              );
            }
          });
        }
      } else if (data.type === "useItem") {
        const id = clients.get(ws);
        if (!id || !players.has(id)) return;

        const player = players.get(id);
        const slotIndex = data.slotIndex;
        const item = player.inventory[slotIndex];
        if (item && ITEM_CONFIG[item.type]?.effect) {
          const effect = ITEM_CONFIG[item.type].effect;
          if (effect.health)
            player.health = Math.min(
              player.health + effect.health,
              player.maxStats.health
            );
          if (effect.energy)
            player.energy = Math.min(
              player.energy + effect.energy,
              player.maxStats.energy
            );
          if (effect.food)
            player.food = Math.min(
              player.food + effect.food,
              player.maxStats.food
            );
          if (effect.water)
            player.water = Math.min(
              player.water + effect.water,
              player.maxStats.water
            );
          if (effect.armor)
            player.armor = Math.min(
              player.armor + effect.armor,
              player.maxStats.armor
            );
          if (ITEM_CONFIG[item.type].stackable) {
            if (item.quantity > 1) {
              player.inventory[slotIndex].quantity -= 1;
            } else {
              player.inventory[slotIndex] = null;
            }
          } else {
            player.inventory[slotIndex] = null;
          }

          // Сохраняем изменения
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Отправляем подтверждение клиенту
          ws.send(
            JSON.stringify({
              type: "useItemSuccess",
              stats: {
                health: player.health,
                energy: player.energy,
                food: player.food,
                water: player.water,
                armor: player.armor,
              },
              inventory: player.inventory,
            })
          );
        }
      } else if (data.type === "equipItem") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          const slotIndex = data.slotIndex;
          const item = player.inventory[slotIndex];
          if (item && ITEM_CONFIG[item.type] && ITEM_CONFIG[item.type].type) {
            const slotName = {
              headgear: "head",
              armor: "chest",
              belt: "belt",
              pants: "pants",
              boots: "boots",
              weapon: "weapon",
              gloves: "gloves",
            }[ITEM_CONFIG[item.type].type];

            if (slotName) {
              if (player.equipment[slotName]) {
                const freeSlot = player.inventory.findIndex(
                  (slot) => slot === null
                );
                if (freeSlot !== -1) {
                  player.inventory[freeSlot] = player.equipment[slotName];
                } else {
                  // Если нет места для swap, отменяем (добавил проверку, которой не было)
                  ws.send(
                    JSON.stringify({
                      type: "equipItemFail",
                      error: "Нет места в инвентаре для замены",
                    })
                  );
                  return;
                }
              }
              player.equipment[slotName] = {
                type: item.type,
                itemId: item.itemId,
              };
              player.inventory[slotIndex] = null;

              // Полностью пересчитываем maxStats и обрезаем текущие статы
              calculateMaxStats(player, ITEM_CONFIG);

              // Сохраняем изменения
              players.set(id, { ...player });
              userDatabase.set(id, { ...player });
              await saveUserDatabase(dbCollection, id, player);

              // Отправляем обновление клиенту (с новыми статами)
              ws.send(
                JSON.stringify({
                  type: "update",
                  player: {
                    id,
                    inventory: player.inventory,
                    equipment: player.equipment,
                    maxStats: player.maxStats,
                    health: player.health,
                    energy: player.energy,
                    food: player.food,
                    water: player.water,
                    armor: player.armor,
                    damage: player.damage,
                  },
                })
              );

              // Отправляем обновление другим игрокам в том же мире (только статы, если нужно)
              wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  const clientPlayer = players.get(clients.get(client));
                  if (clientPlayer && clientPlayer.worldId === player.worldId) {
                    client.send(
                      JSON.stringify({
                        type: "update",
                        player: {
                          id,
                          maxStats: player.maxStats,
                          health: player.health,
                          energy: player.energy,
                          food: player.food,
                          water: player.water,
                          armor: player.armor,
                          damage: player.damage,
                        },
                      })
                    );
                  }
                }
              });
            }
          }
        }
      } else if (data.type === "dropItem") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          const slotIndex = data.slotIndex;
          const item = player.inventory[slotIndex];
          if (item) {
            let quantityToDrop = data.quantity || 1;
            if (ITEM_CONFIG[item.type]?.stackable) {
              const currentQuantity = item.quantity || 1;
              if (quantityToDrop > currentQuantity) {
                return;
              }
            }

            let dropX,
              dropY,
              attempts = 0;
            const maxAttempts = 10;
            do {
              const angle = Math.random() * Math.PI * 2;
              const radius = Math.random() * 100;
              dropX = player.x + Math.cos(angle) * radius;
              dropY = player.y + Math.sin(angle) * radius;
              attempts++;
            } while (
              checkCollisionServer(dropX, dropY) &&
              attempts < maxAttempts
            );

            if (attempts < maxAttempts) {
              const itemId = `${item.type}_${Date.now()}`;
              if (ITEM_CONFIG[item.type]?.stackable) {
                if (quantityToDrop === item.quantity) {
                  player.inventory[slotIndex] = null;
                } else {
                  player.inventory[slotIndex].quantity -= quantityToDrop;
                }
                items.set(itemId, {
                  x: dropX,
                  y: dropY,
                  type: item.type,
                  spawnTime: Date.now(),
                  quantity: quantityToDrop,
                  isDroppedByPlayer: true,
                  worldId: player.worldId,
                });
              } else {
                player.inventory[slotIndex] = null;
                items.set(itemId, {
                  x: dropX,
                  y: dropY,
                  type: item.type,
                  spawnTime: Date.now(),
                  isDroppedByPlayer: true,
                  worldId: player.worldId,
                });
              }
              players.set(id, { ...player });
              userDatabase.set(id, { ...player });
              await saveUserDatabase(dbCollection, id, player);
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  const clientPlayer = players.get(clients.get(client));
                  if (clientPlayer && clientPlayer.worldId === player.worldId) {
                    client.send(
                      JSON.stringify({
                        type: "itemDropped",
                        itemId,
                        x: dropX,
                        y: dropY,
                        type: item.type,
                        spawnTime: Date.now(),
                        quantity: ITEM_CONFIG[item.type]?.stackable
                          ? quantityToDrop
                          : undefined,
                        isDroppedByPlayer: true,
                        worldId: player.worldId,
                      })
                    );
                    if (clients.get(client) === id) {
                      client.send(
                        JSON.stringify({
                          type: "update",
                          player: { id, ...player },
                        })
                      );
                    }
                  }
                }
              });
            }
          }
        }
      } else if (data.type === "selectQuest") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.selectedQuestId = data.questId;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
        }
      } else if (data.type === "shoot") {
        const shooterId = clients.get(ws);
        if (shooterId && players.has(shooterId)) {
          const player = players.get(shooterId);
          if (player.worldId === data.worldId) {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                const clientPlayer = players.get(clients.get(client));
                if (clientPlayer && clientPlayer.worldId === data.worldId) {
                  client.send(
                    JSON.stringify({
                      type: "shoot",
                      bulletId: data.bulletId,
                      x: data.x,
                      y: data.y,
                      vx: data.vx,
                      vy: data.vy,
                      damage: data.damage,
                      range: data.range,
                      ownerId: data.ownerId,
                      spawnTime: data.spawnTime,
                      worldId: data.worldId,
                    })
                  );
                }
              }
            });
          }
        }
      } else if (data.type === "bulletCollision") {
        if (data.worldId) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === data.worldId) {
                client.send(
                  JSON.stringify({
                    type: "bulletCollision",
                    bulletIds: data.bulletIds,
                    worldId: data.worldId,
                  })
                );
              }
            }
          });
        }
      } else if (data.type === "removeBullet") {
        if (data.worldId) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === data.worldId) {
                client.send(
                  JSON.stringify({
                    type: "removeBullet",
                    bulletId: data.bulletId,
                    worldId: data.worldId,
                  })
                );
              }
            }
          });
        }
      } else if (data.type === "tradeRequest") {
        const fromId = clients.get(ws);
        if (!fromId) return;
        const toId = data.toId;
        const playerA = players.get(fromId);
        const playerB = players.get(toId);

        // УБРАНЫ ПРОВЕРКИ НА РАССТОЯНИЕ И ЗДОРОВЬЕ
        if (!playerA || !playerB || playerA.worldId !== playerB.worldId) return;

        // ИСПРАВЛЕНИЕ: всегда сортированный ключ (меньший ID первым)
        const sortedIds = [fromId, toId].sort();
        const tradeKey = `${sortedIds[0]}-${sortedIds[1]}`;
        tradeRequests.set(tradeKey, { status: "pending" });

        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            clients.get(client) === toId
          ) {
            client.send(JSON.stringify({ type: "tradeRequest", fromId, toId }));
          }
        });
      } else if (data.type === "tradeAccepted") {
        const fromId = data.fromId; // B accepts, fromId = B, toId = A (initiator)
        const toId = data.toId;
        // ИСПРАВЛЕНИЕ: всегда сортированный ключ (меньший ID первым)
        const sortedIds = [fromId, toId].sort();
        const tradeKey = `${sortedIds[0]}-${sortedIds[1]}`;
        if (
          !tradeRequests.has(tradeKey) ||
          tradeRequests.get(tradeKey).status !== "pending"
        )
          return;

        tradeRequests.set(tradeKey, { status: "accepted" });
        tradeOffers.set(tradeKey, {
          myOffer: Array(4).fill(null),
          partnerOffer: Array(4).fill(null),
          myConfirmed: false,
          partnerConfirmed: false,
        });

        // Notify both of trade start
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const clientId = clients.get(client);
            if (clientId === fromId || clientId === toId) {
              client.send(
                JSON.stringify({
                  type: "tradeAccepted",
                  fromId: toId,
                  toId: fromId,
                })
              ); // fromId = initiator for both
            }
          }
        });
      } else if (data.type === "tradeOffer") {
        const fromId = clients.get(ws);
        if (!fromId) return;
        const toId = data.toId;
        const tradeKey =
          fromId < toId ? `${fromId}-${toId}` : `${toId}-${fromId}`; // Symmetric key

        if (!tradeOffers.has(tradeKey)) return;

        // Update offer from fromId
        const offers = tradeOffers.get(tradeKey);
        if (fromId === tradeKey.split("-")[0]) {
          // A - initiator
          offers.myOffer = data.offer;
        } else {
          offers.partnerOffer = data.offer;
        }
        tradeOffers.set(tradeKey, offers);

        // Send to partner (dynamic update)
        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            clients.get(client) === toId
          ) {
            client.send(
              JSON.stringify({ type: "tradeOffer", fromId, offer: data.offer })
            );
          }
        });
      } else if (data.type === "tradeConfirmed") {
        const fromId = clients.get(ws);
        const toId = data.toId;
        const tradeKey =
          fromId < toId ? `${fromId}-${toId}` : `${toId}-${fromId}`;

        if (!tradeOffers.has(tradeKey)) return;

        const offers = tradeOffers.get(tradeKey);
        if (fromId === tradeKey.split("-")[0]) {
          offers.myConfirmed = true;
        } else {
          offers.partnerConfirmed = true;
        }

        // Send confirmation to partner
        wss.clients.forEach((client) => {
          if (clients.get(client) === toId) {
            client.send(JSON.stringify({ type: "tradeConfirmed", fromId }));
          }
        });
      } else if (data.type === "tradeCompleted") {
        const fromId = clients.get(ws);
        if (!fromId || !players.has(fromId) || !players.has(data.toId)) return;

        const tradeKey =
          fromId < data.toId
            ? `${fromId}-${data.toId}`
            : `${data.toId}-${fromId}`;

        if (!tradeOffers.has(tradeKey)) return;

        const offers = tradeOffers.get(tradeKey);
        if (!offers.myConfirmed || !offers.partnerConfirmed) return;

        const initiatorId = tradeKey.split("-")[0];
        const partnerId = tradeKey.split("-")[1];
        const fromPlayer = players.get(initiatorId);
        const toPlayer = players.get(partnerId);

        if (!fromPlayer.inventory || !toPlayer.inventory) return;

        const fromOfferValid = offers.myOffer.every((item) => {
          if (!item) return true;
          const invItem = fromPlayer.inventory[item.originalSlot];
          return (
            invItem &&
            invItem.type === item.type &&
            (!item.quantity || invItem.quantity === item.quantity)
          );
        });

        const toOfferValid = offers.partnerOffer.every((item) => {
          if (!item) return true;
          const invItem = toPlayer.inventory[item.originalSlot];
          return (
            invItem &&
            invItem.type === item.type &&
            (!item.quantity || invItem.quantity === item.quantity)
          );
        });

        if (!fromOfferValid || !toOfferValid) {
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              (clients.get(client) === initiatorId ||
                clients.get(client) === partnerId)
            ) {
              client.send(
                JSON.stringify({
                  type: "tradeCancelled",
                  fromId: initiatorId,
                  toId: partnerId,
                })
              );
            }
          });
          tradeRequests.delete(tradeKey);
          tradeOffers.delete(tradeKey);
          return;
        }

        const fromFreeSlots = fromPlayer.inventory.filter(
          (slot) => slot === null
        ).length;
        const toFreeSlots = toPlayer.inventory.filter(
          (slot) => slot === null
        ).length;
        const fromOfferCount = offers.myOffer.filter(
          (item) => item !== null
        ).length;
        const toOfferCount = offers.partnerOffer.filter(
          (item) => item !== null
        ).length;

        if (fromFreeSlots < toOfferCount || toFreeSlots < fromOfferCount) {
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              (clients.get(client) === initiatorId ||
                clients.get(client) === partnerId)
            ) {
              client.send(
                JSON.stringify({
                  type: "tradeCancelled",
                  fromId: initiatorId,
                  toId: partnerId,
                })
              );
            }
          });
          tradeRequests.delete(tradeKey);
          tradeOffers.delete(tradeKey);
          return;
        }

        offers.myOffer.forEach((item) => {
          if (item) {
            fromPlayer.inventory[item.originalSlot] = null;
          }
        });

        offers.partnerOffer.forEach((item) => {
          if (item) {
            toPlayer.inventory[item.originalSlot] = null;
          }
        });

        offers.myOffer.forEach((item) => {
          if (item) {
            const freeSlot = toPlayer.inventory.findIndex(
              (slot) => slot === null
            );
            if (freeSlot !== -1) {
              toPlayer.inventory[freeSlot] = {
                type: item.type,
                quantity: item.quantity,
                itemId: `${item.type}_${Date.now()}`,
              };
            }
          }
        });

        offers.partnerOffer.forEach((item) => {
          if (item) {
            const freeSlot = fromPlayer.inventory.findIndex(
              (slot) => slot === null
            );
            if (freeSlot !== -1) {
              fromPlayer.inventory[freeSlot] = {
                type: item.type,
                quantity: item.quantity,
                itemId: `${item.type}_${Date.now()}`,
              };
            }
          }
        });

        players.set(initiatorId, { ...fromPlayer });
        players.set(partnerId, { ...toPlayer });
        userDatabase.set(initiatorId, { ...fromPlayer });
        userDatabase.set(partnerId, { ...toPlayer });
        await saveUserDatabase(dbCollection, initiatorId, fromPlayer);
        await saveUserDatabase(dbCollection, partnerId, toPlayer);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            if (clients.get(client) === initiatorId) {
              client.send(
                JSON.stringify({
                  type: "tradeCompleted",
                  fromId: initiatorId,
                  toId: partnerId,
                  newInventory: fromPlayer.inventory,
                })
              );
            } else if (clients.get(client) === partnerId) {
              client.send(
                JSON.stringify({
                  type: "tradeCompleted",
                  fromId: initiatorId,
                  toId: partnerId,
                  newInventory: toPlayer.inventory,
                })
              );
            }
          }
        });

        tradeRequests.delete(tradeKey);
        tradeOffers.delete(tradeKey);
      } else if (data.type === "tradeCancelled") {
        const fromId = clients.get(ws);
        const toId = data.toId;
        const tradeKey =
          fromId < toId ? `${fromId}-${toId}` : `${toId}-${fromId}`;

        tradeRequests.delete(tradeKey);
        tradeOffers.delete(tradeKey);

        wss.clients.forEach((client) => {
          if (clients.get(client) === fromId || clients.get(client) === toId) {
            client.send(JSON.stringify({ type: "tradeCancelled" }));
          }
        });
      } else if (data.type === "attackPlayer") {
        const attackerId = clients.get(ws);
        if (
          attackerId &&
          players.has(attackerId) &&
          players.has(data.targetId)
        ) {
          const attacker = players.get(attackerId);
          const target = players.get(data.targetId);
          if (
            attacker.worldId === data.worldId &&
            target.worldId === data.worldId &&
            target.health > 0
          ) {
            target.health = Math.max(0, target.health - data.damage);
            players.set(data.targetId, { ...target });
            userDatabase.set(data.targetId, { ...target });
            await saveUserDatabase(dbCollection, data.targetId, target);

            // Broadcast update to all players in the same world
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                const clientPlayer = players.get(clients.get(client));
                if (clientPlayer && clientPlayer.worldId === target.worldId) {
                  client.send(
                    JSON.stringify({
                      type: "update",
                      player: { id: data.targetId, ...target },
                    })
                  );
                }
              }
            });
          }
        }
      } else if (data.type === "attackEnemy") {
        const attackerId = clients.get(ws);
        if (!attackerId) return;

        const attacker = players.get(attackerId);
        const enemy = enemies.get(data.targetId);

        if (
          !attacker ||
          !enemy ||
          enemy.worldId !== data.worldId ||
          enemy.health <= 0
        )
          return;

        // Наносим урон
        enemy.health = Math.max(0, enemy.health - data.damage);

        // Если умер
        if (enemy.health <= 0) {
          enemies.delete(data.targetId);

          // Уведомляем всех
          broadcastToWorld(
            wss,
            clients,
            players,
            data.worldId,
            JSON.stringify({
              type: "enemyDied",
              enemyId: data.targetId,
            })
          );

          // Дроп
          if (Math.random() < 0.5) {
            const dropType = Math.random() < 0.7 ? "meat_chunk" : "blood_pack";
            const itemId = `${dropType}_${Date.now()}`;
            const dropItem = {
              x: enemy.x,
              y: enemy.y,
              type: dropType,
              spawnTime: Date.now(),
              worldId: data.worldId,
            };
            items.set(itemId, dropItem);

            broadcastToWorld(
              wss,
              clients,
              players,
              data.worldId,
              JSON.stringify({
                type: "newItem",
                items: [{ itemId, ...dropItem }],
              })
            );
          }

          if (Math.random() < 0.15) {
            const itemId = `atom_${Date.now()}`;
            const dropItem = {
              x: enemy.x,
              y: enemy.y,
              type: "atom",
              spawnTime: Date.now(),
              worldId: data.worldId,
            };
            items.set(itemId, dropItem);

            broadcastToWorld(
              wss,
              clients,
              players,
              data.worldId,
              JSON.stringify({
                type: "newItem",
                items: [{ itemId, ...dropItem }],
              })
            );
          }

          // XP и level up
          let xpGained = 13;
          if (enemy.type === "scorpion") {
            xpGained = 20;
          }
          attacker.xp = (attacker.xp || 0) + xpGained;
          let levelUp = false;
          let xpToNext = calculateXPToNextLevel(attacker.level);
          while (attacker.xp >= xpToNext && attacker.level < 100) {
            attacker.level += 1;
            attacker.xp -= xpToNext;
            attacker.upgradePoints = (attacker.upgradePoints || 0) + 10;
            levelUp = true;
            xpToNext = calculateXPToNextLevel(attacker.level);
          }

          players.set(attackerId, attacker);
          userDatabase.set(attackerId, attacker);
          await saveUserDatabase(dbCollection, attackerId, attacker);

          // Уведомление атакующего (levelSyncAfterKill)
          ws.send(
            JSON.stringify({
              type: "levelSyncAfterKill",
              level: attacker.level,
              xp: attacker.xp,
              xpToNextLevel: xpToNext,
              upgradePoints: attacker.upgradePoints,
              xpGained,
            })
          );

          if (enemy.type === "mutant") {
            if (
              attacker.neonQuest &&
              attacker.neonQuest.currentQuestId === "neon_quest_1"
            ) {
              attacker.neonQuest.progress = attacker.neonQuest.progress || {};
              attacker.neonQuest.progress.killMutants =
                (attacker.neonQuest.progress.killMutants || 0) + 1;

              // Сохраняем в БД
              players.set(attackerId, attacker);
              userDatabase.set(attackerId, attacker);
              await saveUserDatabase(dbCollection, attackerId, attacker);

              // Отправляем игроку обновлённый прогресс
              ws.send(
                JSON.stringify({
                  type: "neonQuestProgressUpdate",
                  progress: attacker.neonQuest.progress,
                })
              );
            }
          }

          // Респавн через 8-15 сек
          setTimeout(
            () => spawnNewEnemy(data.worldId),
            8000 + Math.random() * 7000
          );
        } else {
          // Если жив — просто обновляем здоровье
          enemies.set(data.targetId, enemy);

          broadcastToWorld(
            wss,
            clients,
            players,
            data.worldId,
            JSON.stringify({
              type: "enemyUpdate",
              enemy: {
                id: data.targetId,
                health: enemy.health,
                x: enemy.x,
                y: enemy.y,
              },
            })
          );
        }
      } else if (data.type === "neonQuestAccept") {
        const id = clients.get(ws);
        if (id && players.has(id)) {
          const player = players.get(id);

          // ГАРАНТИРУЕМ правильную структуру
          player.neonQuest = {
            currentQuestId: "neon_quest_1",
            progress: { killMutants: 0 },
            completed: player.neonQuest?.completed || [], // сохраняем старые завершённые квесты
          };

          players.set(id, player);
          userDatabase.set(id, player);
          await saveUserDatabase(dbCollection, id, player);

          ws.send(JSON.stringify({ type: "neonQuestStarted" }));
        }
      } else if (data.type === "vacuumBalyaryReward") {
        const playerId = clients.get(ws);
        if (!playerId) return;

        const player = players.get(playerId);
        if (!player || !player.inventory) return;
        if (data.slot < 0 || data.slot >= 20) return;

        if (data.isNewStack) {
          player.inventory[data.slot] = {
            type: "balyary",
            quantity: data.quantity || 1,
          };
        } else {
          if (!player.inventory[data.slot]) {
            player.inventory[data.slot] = { type: "balyary", quantity: 0 };
          }
          player.inventory[data.slot].quantity = data.quantity || 1;
        }

        players.set(playerId, player);
        userDatabase.set(playerId, player);
        await saveUserDatabase(dbCollection, playerId, player);

        ws.send(
          JSON.stringify({
            type: "useItemSuccess",
            inventory: player.inventory,
          })
        );
      } else if (data.type === "welcomeGuideSeen") {
        const id = clients.get(ws);
        if (id && players.has(id)) {
          const player = players.get(id);
          player.hasSeenWelcomeGuide = true;

          players.set(id, player);
          userDatabase.set(id, player);
          await saveUserDatabase(dbCollection, id, player); // ← лучше await, а не .catch

          ws.send(JSON.stringify({ type: "welcomeGuideSeenConfirm" }));
        }
      } else if (data.type === "completeDoctorQuest") {
        const playerId = clients.get(ws);
        if (!playerId) return;

        const player = players.get(playerId);
        if (!player) return;

        // Проверяем по флагу — не выдавали ли уже
        if (player.medicalCertificate === true) {
          ws.send(JSON.stringify({ type: "doctorQuestAlreadyDone" }));
          return;
        }

        // Ищем свободный слот для справки
        const freeSlot = player.inventory.findIndex((slot) => slot === null);
        if (freeSlot === -1) {
          ws.send(JSON.stringify({ type: "inventoryFull" }));
          return;
        }

        // Выдаём предмет
        player.inventory[freeSlot] = {
          type: "medical_certificate",
          quantity: 1,
        };

        // ГЛАВНОЕ: ставим флаг навсегда
        player.medicalCertificate = true;

        // Сохраняем
        players.set(playerId, player);
        userDatabase.set(playerId, player);
        await saveUserDatabase(dbCollection, playerId, player);

        ws.send(
          JSON.stringify({
            type: "doctorQuestCompleted",
            inventory: player.inventory,
            medicalCertificate: true, // отправляем клиенту
          })
        );
      } else if (data.type === "robotDoctorFreeHeal") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const player = players.get(playerId);
        if (player.level > 5 || player.health >= player.maxStats.health) {
          ws.send(
            JSON.stringify({
              type: "robotDoctorResult",
              success: false,
              error: "Условия не выполнены",
            })
          );
          return;
        }

        player.health = player.maxStats.health;

        players.set(playerId, player);
        userDatabase.set(playerId, player);
        await saveUserDatabase(dbCollection, playerId, player);

        ws.send(
          JSON.stringify({
            type: "robotDoctorResult",
            success: true,
            action: "freeHeal",
            health: player.health,
          })
        );
      } else if (data.type === "robotDoctorHeal20") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const player = players.get(playerId);

        // Ищем баляры
        const balyarySlot = player.inventory.findIndex(
          (s) => s && s.type === "balyary"
        );
        if (
          balyarySlot === -1 ||
          (player.inventory[balyarySlot].quantity || 0) < 1
        ) {
          ws.send(
            JSON.stringify({
              type: "robotDoctorResult",
              success: false,
              error: "Нет баляров",
            })
          );
          return;
        }

        // Снимаем 1 баляр
        if (player.inventory[balyarySlot].quantity === 1) {
          player.inventory[balyarySlot] = null;
        } else {
          player.inventory[balyarySlot].quantity -= 1;
        }

        // +20 HP (но не больше максимума)
        player.health = Math.min(player.maxStats.health, player.health + 20);

        players.set(playerId, player);
        userDatabase.set(playerId, player);
        await saveUserDatabase(dbCollection, playerId, player);

        ws.send(
          JSON.stringify({
            type: "robotDoctorResult",
            success: true,
            action: "heal20",
            health: player.health,
            inventory: player.inventory,
          })
        );
      } else if (data.type === "robotDoctorFullHeal") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const player = players.get(playerId);
        const missingHP = player.maxStats.health - player.health;
        if (missingHP <= 0) {
          ws.send(
            JSON.stringify({
              type: "robotDoctorResult",
              success: false,
              error: "Здоровье уже полное",
            })
          );
          return;
        }

        const cost = Math.floor(missingHP / 20);
        const balyarySlot = player.inventory.findIndex(
          (s) => s && s.type === "balyary"
        );
        const balyaryCount =
          balyarySlot !== -1 ? player.inventory[balyarySlot].quantity || 0 : 0;

        if (balyaryCount < cost) {
          ws.send(
            JSON.stringify({
              type: "robotDoctorResult",
              success: false,
              error: "Недостаточно баляров",
            })
          );
          return;
        }

        // Снимаем баляры
        if (balyaryCount === cost) {
          player.inventory[balyarySlot] = null;
        } else {
          player.inventory[balyarySlot].quantity -= cost;
        }

        player.health = player.maxStats.health;

        players.set(playerId, player);
        userDatabase.set(playerId, player);
        await saveUserDatabase(dbCollection, playerId, player);

        ws.send(
          JSON.stringify({
            type: "robotDoctorResult",
            success: true,
            action: "fullHeal",
            health: player.health,
            cost: cost,
            inventory: player.inventory,
          })
        );
      } else if (data.type === "requestCaptainStamp") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const player = players.get(playerId);

        // Проверяем: есть ли справка и флаг
        const certSlot = player.inventory.findIndex(
          (item) => item && item.type === "medical_certificate"
        );

        if (certSlot === -1 || !player.medicalCertificate) {
          ws.send(
            JSON.stringify({
              type: "captainStampResult",
              success: false,
              error: "У вас нет медицинской справки!",
            })
          );
          return;
        }

        // Удаляем старую справку
        player.inventory[certSlot] = {
          type: "medical_certificate_stamped",
          quantity: 1,
        };

        players.set(playerId, player);
        userDatabase.set(playerId, player);
        await saveUserDatabase(dbCollection, playerId, player);

        ws.send(
          JSON.stringify({
            type: "captainStampResult",
            success: true,
            inventory: player.inventory,
          })
        );
      }
    });

    const enemyUpdateInterval = setInterval(() => {
      enemies.forEach((enemy, enemyId) => {
        if (enemy.health <= 0) return;

        let closestPlayer = null;
        let minDist = AGGRO_RANGE;
        players.forEach((player) => {
          if (player.worldId === enemy.worldId && player.health > 0) {
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
              minDist = dist;
              closestPlayer = player;
            }
          }
        });

        if (closestPlayer) {
          const dx = closestPlayer.x - enemy.x;
          const dy = closestPlayer.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > ATTACK_RANGE) {
            const moveDist = ENEMY_SPEED;
            if (dist > 0) {
              enemy.x += (dx / dist) * moveDist;
              enemy.y += (dy / dist) * moveDist;
            }
            enemy.state = "walking";
            if (Math.abs(dx) > Math.abs(dy)) {
              enemy.direction = dx > 0 ? "right" : "left";
            } else {
              enemy.direction = dy > 0 ? "down" : "up";
            }
          } else {
            const currentTime = Date.now();
            if (currentTime - enemy.lastAttackTime >= ENEMY_ATTACK_COOLDOWN) {
              enemy.lastAttackTime = currentTime;
              enemy.state = "attacking";
              const damage = Math.floor(Math.random() * 6) + 10; // 10-15
              closestPlayer.health = Math.max(0, closestPlayer.health - damage);
              players.set(closestPlayer.id, { ...closestPlayer });
              userDatabase.set(closestPlayer.id, { ...closestPlayer });
              saveUserDatabase(dbCollection, closestPlayer.id, closestPlayer);

              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  const clientPlayer = players.get(clients.get(client));
                  if (clientPlayer && clientPlayer.worldId === enemy.worldId) {
                    client.send(
                      JSON.stringify({
                        type: "enemyAttack",
                        targetId: closestPlayer.id,
                        damage: damage,
                      })
                    );
                    client.send(
                      JSON.stringify({
                        type: "update",
                        player: { id: closestPlayer.id, ...closestPlayer },
                      })
                    );
                  }
                }
              });
            } else {
              enemy.state = "idle";
            }
          }
        } else {
          enemy.state = "idle";
          // Anti-зависание: random wander
          if (Math.random() < 0.1) {
            const wanderAngle = Math.random() * Math.PI * 2;
            enemy.x += Math.cos(wanderAngle) * ENEMY_SPEED * 0.5;
            enemy.y += Math.sin(wanderAngle) * ENEMY_SPEED * 0.5;
          }
        }

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const clientPlayer = players.get(clients.get(client));
            if (clientPlayer && clientPlayer.worldId === enemy.worldId) {
              client.send(
                JSON.stringify({
                  type: "enemyUpdate",
                  enemy: { id: enemyId, ...enemy },
                })
              );
            }
          }
        });
      });
    }, 200); // 200ms оптимизация

    // Очистка интервала при disconnect (в ws.on("close"))
    clearInterval(enemyUpdateInterval);

    ws.on("close", async (code, reason) => {
      const id = clients.get(ws);
      if (id) {
        const player = players.get(id);
        if (player) {
          player.hasSeenWelcomeGuide = player.hasSeenWelcomeGuide || false;
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          const itemsToRemove = [];
          items.forEach((item, itemId) => {
            if (item.spawnedBy === id) {
              itemsToRemove.push(itemId);
            }
          });

          itemsToRemove.forEach((itemId) => {
            items.delete(itemId);
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "itemPicked", itemId }));
              }
            });
          });
        }
        clients.delete(ws);
        players.delete(id);
        console.log("Client disconnected:", id);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "playerLeft", id }));
          }
        });
      }
      clearTimeout(inactivityTimer);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clearTimeout(inactivityTimer);
    });
  });
}

module.exports = { setupWebSocket };
