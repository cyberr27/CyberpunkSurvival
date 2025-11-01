const { saveUserDatabase } = require("./database");

const tradeRequests = new Map(); // Requests: key = `${fromId}-${toId}`, value = { status: 'pending' }
const tradeOffers = new Map(); // Offers: key = `${fromId}-${toId}`, value = { myOffer: [], partnerOffer: [], myConfirmed: false, partnerConfirmed: false }

function setupWebSocket(
  wss,
  dbCollection,
  clients,
  players,
  userDatabase,
  items,
  wolves,
  lights,
  worlds,
  ITEM_CONFIG,
  INACTIVITY_TIMEOUT
) {
  function checkCollisionServer(x, y) {
    return false; // Keeping as is
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
            x: 222,
            y: 3205,
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
            level: 0,
            xp: 99,
            maxStats: {
              health: 100,
              energy: 100,
              food: 100,
              water: 100,
              armor: 0,
            }, // Added armor: 0
            upgradePoints: 0,
            availableQuests: [],
            worldId: 0,
            worldPositions: { 0: { x: 222, y: 3205 } },
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
            console.error(`World with ID ${targetWorldId} does not exist`);
            return;
          }

          console.log(
            `Player ${id} transitioning from world ${oldWorldId} to world ${targetWorldId} at x:${data.x}, y:${data.y}`
          );

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

          ws.send(
            JSON.stringify({
              type: "worldTransitionSuccess",
              worldId: targetWorldId,
              x: player.x,
              y: player.y,
              lights: lights.get(targetWorldId).map(({ id, ...rest }) => rest),
              players: worldPlayers,
              items: worldItems,
              wolves: Array.from(wolves.entries())
                .filter(([_, wolf]) => wolf.worldId === targetWorldId)
                .map(([id, wolf]) => ({
                  id,
                  x: wolf.x,
                  y: wolf.y,
                  health: wolf.health,
                  direction: wolf.direction,
                  state: wolf.state,
                })),
            })
          );

          console.log(
            `Transition successful: player ${id}, world ${targetWorldId}, synchronized ${worldPlayers.length} players, ${worldItems.length} items`
          );
        }
      } else if (data.type === "syncPlayers") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          const worldId = data.worldId;
          if (player.worldId !== worldId) {
            console.warn(
              `Player ${id} requested syncPlayers for incorrect world ${worldId}`
            );
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
          console.log(
            `Sent list of ${worldPlayers.length} players in world ${worldId} to ${id}`
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
            selectedQuestId: player.selectedQuestId || null,
            level: player.level || 0,
            xp: player.xp || 0,
            maxStats: player.maxStats || {
              health: 100,
              energy: 100,
              food: 100,
              water: 100,
              armor: 0,
            },
            upgradePoints: player.upgradePoints || 0,
            availableQuests: player.availableQuests || [],
            worldId: player.worldId || 0,
            worldPositions: player.worldPositions || {
              0: { x: player.x, y: player.y },
            },

            // ДОБАВЛЯЕМ ПОЛЯ УЛУЧШЕНИЙ
            healthUpgrade: player.healthUpgrade || 0,
            energyUpgrade: player.energyUpgrade || 0,
            foodUpgrade: player.foodUpgrade || 0,
            waterUpgrade: player.waterUpgrade || 0,

            // Fixed: don't set 100 if value is 0
            health: typeof player.health === "number" ? player.health : 100,
            energy: typeof player.energy === "number" ? player.energy : 100,
            food: typeof player.food === "number" ? player.food : 100,
            water: typeof player.water === "number" ? player.water : 100,
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
              selectedQuestId: playerData.selectedQuestId,
              level: playerData.level,
              xp: playerData.xp,
              maxStats: playerData.maxStats,
              upgradePoints: playerData.upgradePoints,
              availableQuests: playerData.availableQuests,
              worldId: playerData.worldId,
              worldPositions: playerData.worldPositions,
              healthUpgrade: playerData.healthUpgrade || 0,
              energyUpgrade: playerData.energyUpgrade || 0,
              foodUpgrade: playerData.foodUpgrade || 0,
              waterUpgrade: playerData.waterUpgrade || 0,
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
                })),
              wolves: Array.from(wolves.entries())
                .filter(([_, wolf]) => wolf.worldId === playerData.worldId)
                .map(([id, wolf]) => ({
                  id,
                  x: wolf.x,
                  y: wolf.y,
                  health: wolf.health,
                  direction: wolf.direction,
                  state: wolf.state,
                })),
              lights: lights
                .get(playerData.worldId)
                .map(({ id, ...rest }) => rest),
              healthUpgrade: playerData.healthUpgrade,
              energyUpgrade: playerData.energyUpgrade,
              foodUpgrade: playerData.foodUpgrade,
              waterUpgrade: playerData.waterUpgrade,
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

        console.log(
          `Player ${id} bought ${data.option} water, water: ${
            player.water
          }, balyary: ${balyaryCount - data.cost}`
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
          console.log(
            `Player ${id} met NPC: npcMet=${data.npcMet}, quests: ${player.availableQuests}`
          );
        }
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
          player.maxStats = {
            health: Math.max(
              data.maxStats?.health || 100,
              player.maxStats.health
            ),
            energy: Math.max(
              data.maxStats?.energy || 100,
              player.maxStats.energy
            ),
            food: Math.max(data.maxStats?.food || 100, player.maxStats.food),
            water: Math.max(data.maxStats?.water || 100, player.maxStats.water),
          };
          player.upgradePoints = data.upgradePoints || 0;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
          console.log(
            `Player ${id} updated level: ${data.level}, XP: ${
              data.xp
            }, maxStats: ${JSON.stringify(player.maxStats)}, upgradePoints: ${
              data.upgradePoints
            }`
          );
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
          player.maxStats = data.maxStats;
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
          console.log(`Player ${id} updated maxStats + upgrades`);
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
          console.log(
            `Player ${id} inventory and quests updated: ${
              player.availableQuests
            }, selectedQuestId: ${player.selectedQuestId || "null"}`
          );
        }
      } else if (data.type === "unequipItem") {
        const playerId = clients.get(ws);
        if (!playerId) {
          console.warn("Игрок не идентифицирован для сообщения unequipItem");
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
          console.warn(
            `Игрок ${playerId} или его данные не найдены для снятия экипировки`
          );
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
          console.warn(`Недопустимый слот ${slotName} для снятия экипировки`);
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
          console.warn(
            `Слот ${slotName} пуст или itemId не совпадает (${itemId})`
          );
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
          console.warn(`Слот инвентаря ${inventorySlot} занят`);
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

        // Пересчитываем maxStats (снимаем эффекты предмета)
        const itemType = player.inventory[inventorySlot].type;
        const itemConfig = ITEM_CONFIG[itemType];
        if (itemConfig && itemConfig.effect) {
          if (itemConfig.effect.armor)
            player.maxStats.armor = Math.max(
              0,
              player.maxStats.armor - itemConfig.effect.armor
            );
          if (itemConfig.effect.health)
            player.maxStats.health = Math.max(
              100,
              player.maxStats.health - itemConfig.effect.health
            );
          if (itemConfig.effect.energy)
            player.maxStats.energy = Math.max(
              100,
              player.maxStats.energy - itemConfig.effect.energy
            );
          if (itemConfig.effect.food)
            player.maxStats.food = Math.max(
              100,
              player.maxStats.food - itemConfig.effect.food
            );
          if (itemConfig.effect.water)
            player.maxStats.water = Math.max(
              100,
              player.maxStats.water - itemConfig.effect.water
            );
          if (itemConfig.effect.damage) {
            player.damage = player.damage ? { min: 0, max: 0 } : 0; // Сбрасываем урон, если был
          }
        }

        // Ограничиваем текущие статы новыми максимумами
        player.armor = Math.min(player.armor, player.maxStats.armor);
        player.health = Math.min(player.health, player.maxStats.health);
        player.energy = Math.min(player.energy, player.maxStats.energy);
        player.food = Math.min(player.food, player.maxStats.food);
        player.water = Math.min(player.water, player.maxStats.water);

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

        console.log(
          `Игрок ${playerId} снял предмет ${itemId} из слота ${slotName} в слот инвентаря ${inventorySlot}`
        );
      } else if (data.type === "updateQuests") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.availableQuests =
            data.availableQuests || player.availableQuests;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
          console.log(`Player ${id} quests updated: ${player.availableQuests}`);
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
      } else if (data.type === "useAtom") {
        const id = clients.get(ws);
        if (!id || !players.has(id)) return;

        const player = players.get(id);
        const slotIndex = data.slotIndex;
        if (
          slotIndex >= 0 &&
          slotIndex < player.inventory.length &&
          player.inventory[slotIndex]?.type === "atom"
        ) {
          // Увеличиваем броню на 5, но не выше maxStats.armor
          player.armor = Math.min(player.armor + 5, player.maxStats.armor);
          player.inventory[slotIndex] = null;

          // Сохраняем изменения
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Отправляем подтверждение клиенту
          ws.send(
            JSON.stringify({
              type: "useAtomSuccess",
              armor: player.armor,
              inventory: player.inventory,
            })
          );
          console.log(`Игрок ${id} использовал атом, броня: ${player.armor}`);
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

          // Удаляем использованный предмет
          player.inventory[slotIndex] = null;

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
              },
              inventory: player.inventory,
            })
          );
          console.log(`Игрок ${id} использовал предмет ${item.type}`);
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
                }
              }
              player.equipment[slotName] = {
                type: item.type,
                itemId: item.itemId,
              };
              player.inventory[slotIndex] = null;

              players.set(id, { ...player });
              userDatabase.set(id, { ...player });
              await saveUserDatabase(dbCollection, id, player);

              wss.clients.forEach((client) => {
                if (
                  client.readyState === WebSocket.OPEN &&
                  clients.get(client) === id
                ) {
                  client.send(
                    JSON.stringify({
                      type: "update",
                      player: { id, ...player },
                    })
                  );
                }
              });

              console.log(
                `Player ${id} equipped ${item.type} to slot ${slotName}`
              );
            }
          }
        }
      } else if (data.type === "dropItem") {
        const id = clients.get(ws);
        console.log(
          `Received dropItem request from ${id}, slotIndex: ${
            data.slotIndex
          }, x: ${data.x}, y: ${data.y}, quantity: ${data.quantity || 1}`
        );
        if (id) {
          const player = players.get(id);
          const slotIndex = data.slotIndex;
          const item = player.inventory[slotIndex];
          if (item) {
            let quantityToDrop = data.quantity || 1;
            if (ITEM_CONFIG[item.type]?.stackable) {
              const currentQuantity = item.quantity || 1;
              if (quantityToDrop > currentQuantity) {
                console.log(
                  `Player ${id} has insufficient ${item.type} to drop: ${quantityToDrop} > ${currentQuantity}`
                );
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
              console.log(
                `Player ${id} dropped ${quantityToDrop} ${item.type} in world ${player.worldId} at x:${dropX}, y:${dropY}`
              );
            }
          }
        }
      } else if (data.type === "tradeRequest") {
        const fromId = clients.get(ws);
        if (!fromId || !players.has(fromId) || !players.has(data.toId)) return;

        const fromPlayer = players.get(fromId);
        const toPlayer = players.get(data.toId);
        const dx = fromPlayer.x - toPlayer.x;
        const dy = fromPlayer.y - toPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1000 || fromPlayer.health <= 0 || toPlayer.health <= 0) {
          console.log(
            `Trade request denied: fromId=${fromId}, toId=${data.toId}, distance=${distance}, fromHealth=${fromPlayer.health}, toHealth=${toPlayer.health}`
          );
          return;
        }

        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            clients.get(client) === data.toId
          ) {
            client.send(
              JSON.stringify({
                type: "tradeRequest",
                fromId: fromId,
                toId: data.toId,
              })
            );
          }
        });
        console.log(
          `Trade request: fromId=${fromId}, toId=${data.toId}, distance=${distance}`
        );
      } else if (data.type === "tradeAccepted") {
        const fromId = clients.get(ws);
        if (!fromId || !players.has(fromId) || !players.has(data.toId)) return;

        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            clients.get(client) === data.toId
          ) {
            client.send(
              JSON.stringify({
                type: "tradeAccepted",
                fromId: fromId,
                toId: data.toId,
              })
            );
          }
        });
        console.log(`Trade accepted: fromId=${fromId}, toId=${data.toId}`);
      } else if (data.type === "tradeCancelled") {
        const fromId = clients.get(ws);
        if (!fromId || !players.has(fromId) || !players.has(data.toId)) return;

        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            (clients.get(client) === data.toId ||
              clients.get(client) === fromId)
          ) {
            client.send(
              JSON.stringify({
                type: "tradeCancelled",
                fromId: fromId,
                toId: data.toId,
              })
            );
          }
        });
        console.log(`Trade cancelled: fromId=${fromId}, toId=${data.toId}`);
      } else if (data.type === "tradeOffer") {
        const fromId = clients.get(ws);
        if (!fromId || !players.has(fromId) || !players.has(data.toId)) return;

        const fromPlayer = players.get(fromId);
        if (data.inventory) {
          fromPlayer.inventory = data.inventory;
          players.set(fromId, { ...fromPlayer });
          userDatabase.set(fromId, { ...fromPlayer });
          await saveUserDatabase(dbCollection, fromId, fromPlayer);
        }

        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            clients.get(client) === data.toId
          ) {
            client.send(
              JSON.stringify({
                type: "tradeOffer",
                fromId: fromId,
                toId: data.toId,
                offer: data.offer,
                inventory: data.inventory,
              })
            );
          }
        });
        console.log(
          `Trade offer: fromId=${fromId}, toId=${
            data.toId
          }, offer=${JSON.stringify(data.offer)}, inventory=${JSON.stringify(
            data.inventory
          )}`
        );
      } else if (data.type === "tradeConfirmed") {
        const fromId = clients.get(ws);
        if (!fromId || !players.has(fromId) || !players.has(data.toId)) return;

        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            clients.get(client) === data.toId
          ) {
            client.send(
              JSON.stringify({
                type: "tradeConfirmed",
                fromId: fromId,
                toId: data.toId,
              })
            );
          }
        });
        console.log(`Trade confirmed: fromId=${fromId}, toId=${data.toId}`);
      } else if (data.type === "tradeCompleted") {
        const fromId = clients.get(ws);
        if (!fromId || !players.has(fromId) || !players.has(data.toId)) return;

        const fromPlayer = players.get(fromId);
        const toPlayer = players.get(data.toId);

        if (!fromPlayer.inventory || !toPlayer.inventory) return;

        const fromOfferValid = data.myOffer.every((item, index) => {
          if (!item) return true;
          const invItem = fromPlayer.inventory[item.originalSlot];
          return (
            invItem &&
            invItem.type === item.type &&
            (!item.quantity || invItem.quantity === item.quantity)
          );
        });

        const toOfferValid = data.partnerOffer.every((item, index) => {
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
              (clients.get(client) === fromId ||
                clients.get(client) === data.toId)
            ) {
              client.send(
                JSON.stringify({
                  type: "tradeCancelled",
                  fromId: fromId,
                  toId: data.toId,
                })
              );
            }
          });
          console.log(
            `Trade cancelled: fromOfferValid=${fromOfferValid}, toOfferValid=${toOfferValid}, fromId=${fromId}, toId=${data.toId}`
          );
          return;
        }

        const fromFreeSlots = fromPlayer.inventory.filter(
          (slot) => slot === null
        ).length;
        const toFreeSlots = toPlayer.inventory.filter(
          (slot) => slot === null
        ).length;
        const fromOfferCount = data.myOffer.filter(
          (item) => item !== null
        ).length;
        const toOfferCount = data.partnerOffer.filter(
          (item) => item !== null
        ).length;

        if (fromFreeSlots < toOfferCount || toFreeSlots < fromOfferCount) {
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              (clients.get(client) === fromId ||
                clients.get(client) === data.toId)
            ) {
              client.send(
                JSON.stringify({
                  type: "tradeCancelled",
                  fromId: fromId,
                  toId: data.toId,
                })
              );
            }
          });
          console.log(
            `Trade cancelled: insufficient slots. fromFreeSlots=${fromFreeSlots}, toFreeSlots=${toFreeSlots}, fromOfferCount=${fromOfferCount}, toOfferCount=${toOfferCount}`
          );
          return;
        }

        data.myOffer.forEach((item) => {
          if (item) {
            fromPlayer.inventory[item.originalSlot] = null;
          }
        });

        data.partnerOffer.forEach((item) => {
          if (item) {
            toPlayer.inventory[item.originalSlot] = null;
          }
        });

        data.myOffer.forEach((item) => {
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

        data.partnerOffer.forEach((item) => {
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

        players.set(fromId, { ...fromPlayer });
        players.set(data.toId, { ...toPlayer });
        userDatabase.set(fromId, { ...fromPlayer });
        userDatabase.set(data.toId, { ...toPlayer });
        await saveUserDatabase(dbCollection, fromId, fromPlayer);
        await saveUserDatabase(dbCollection, data.toId, toPlayer);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            if (clients.get(client) === fromId) {
              client.send(
                JSON.stringify({
                  type: "tradeCompleted",
                  fromId: fromId,
                  toId: data.toId,
                  newInventory: fromPlayer.inventory,
                })
              );
            } else if (clients.get(client) === data.toId) {
              client.send(
                JSON.stringify({
                  type: "tradeCompleted",
                  fromId: fromId,
                  toId: data.toId,
                  newInventory: toPlayer.inventory,
                })
              );
            }
          }
        });
        console.log(
          `Trade completed: fromId=${fromId}, toId=${
            data.toId
          }, myOffer=${JSON.stringify(
            data.myOffer
          )}, partnerOffer=${JSON.stringify(data.partnerOffer)}`
        );
      } else if (data.type === "selectQuest") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.selectedQuestId = data.questId;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
          console.log(
            `Player ${id} selected quest ID: ${data.questId || "null"}`
          );
        }
      } else if (data.type === "attackWolf") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          if (player.worldId !== 1 || !wolves.has(data.wolfId)) return;

          const wolf = wolves.get(data.wolfId);
          const damage = data.damage || 10;
          wolf.health = Math.max(0, wolf.health - damage);
          wolves.set(data.wolfId, { ...wolf });

          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              players.get(clients.get(client))?.worldId === wolf.worldId
            ) {
              client.send(
                JSON.stringify({
                  type: "updateWolf",
                  worldId: wolf.worldId,
                  wolf,
                })
              );
            }
          });
          console.log(
            `Player ${id} dealt ${damage} damage to wolf ${data.wolfId}`
          );
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

        // Checks: distance, health, not already trading
        if (!playerA || !playerB || playerA.worldId !== playerB.worldId) return;
        const dx = playerA.x - playerB.x;
        const dy = playerA.y - playerB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 100 || playerA.health <= 0 || playerB.health <= 0) {
          ws.send(
            JSON.stringify({
              type: "tradeError",
              message: "Too far or dead",
            })
          );
          return;
        }

        // Save request
        const tradeKey = `${fromId}-${toId}`;
        tradeRequests.set(tradeKey, { status: "pending" });

        // Send request to player B
        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            clients.get(client) === toId
          ) {
            client.send(JSON.stringify({ type: "tradeRequest", fromId, toId }));
          }
        });
        console.log(`Trade request from ${fromId} to ${toId}`);
      } else if (data.type === "tradeAccepted") {
        const fromId = data.fromId; // B accepts, fromId = B, toId = A (initiator)
        const toId = data.toId;
        const tradeKey = `${toId}-${fromId}`; // Key from initiator
        if (
          !tradeRequests.has(tradeKey) ||
          tradeRequests.get(tradeKey).status !== "pending"
        )
          return;

        tradeRequests.set(tradeKey, { status: "accepted" });
        tradeOffers.set(tradeKey, {
          myOffer: Array(3).fill(null),
          partnerOffer: Array(3).fill(null),
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
        console.log(`Trade accepted between ${toId} and ${fromId}`);
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
        console.log(`Offer updated from ${fromId} to ${toId}`);
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

        // If both confirmed — execute trade
        if (offers.myConfirmed && offers.partnerConfirmed) {
          const playerA = players.get(tradeKey.split("-")[0]);
          const playerB = players.get(tradeKey.split("-")[1]);

          // Check slots (count free slots)
          const freeA = playerA.inventory.filter(
            (slot) => slot === null
          ).length;
          const freeB = playerB.inventory.filter(
            (slot) => slot === null
          ).length;
          const offerCountB = offers.partnerOffer.filter((item) => item).length;
          const offerCountA = offers.myOffer.filter((item) => item).length;
          if (freeA < offerCountB || freeB < offerCountA) {
            // Cancel if no space
            wss.clients.forEach((client) => {
              if (
                clients.get(client) === playerA.id ||
                clients.get(client) === playerB.id
              ) {
                client.send(
                  JSON.stringify({
                    type: "tradeCancelled",
                    message: "No space in inventory",
                  })
                );
              }
            });
            tradeOffers.delete(tradeKey);
            return;
          }

          // Trade: A gets partnerOffer, B gets myOffer
          offers.partnerOffer.forEach((item) => {
            if (item) {
              const freeSlot = playerA.inventory.findIndex(
                (slot) => slot === null
              );
              playerA.inventory[freeSlot] = {
                ...item,
                itemId: `${item.type}_${Date.now()}`,
              };
            }
          });
          offers.myOffer.forEach((item) => {
            if (item) {
              const freeSlot = playerB.inventory.findIndex(
                (slot) => slot === null
              );
              playerB.inventory[freeSlot] = {
                ...item,
                itemId: `${item.type}_${Date.now()}`,
              };
            }
          });

          // Save
          players.set(playerA.id, playerA);
          players.set(playerB.id, playerB);
          userDatabase.set(playerA.id, playerA);
          userDatabase.set(playerB.id, playerB);
          await saveUserDatabase(dbCollection, playerA.id, playerA);
          await saveUserDatabase(dbCollection, playerB.id, playerB);

          // Notify
          wss.clients.forEach((client) => {
            const clientId = clients.get(client);
            if (clientId === playerA.id) {
              client.send(
                JSON.stringify({
                  type: "tradeCompleted",
                  newInventory: playerA.inventory,
                })
              );
            } else if (clientId === playerB.id) {
              client.send(
                JSON.stringify({
                  type: "tradeCompleted",
                  newInventory: playerB.inventory,
                })
              );
            }
          });
          tradeOffers.delete(tradeKey);
          console.log(
            `Trade completed between ${playerA.id} and ${playerB.id}`
          );
        } else {
          // Send confirmation to partner
          wss.clients.forEach((client) => {
            if (clients.get(client) === toId) {
              client.send(JSON.stringify({ type: "tradeConfirmed", fromId }));
            }
          });
        }
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
        console.log(`Trade cancelled between ${fromId} and ${toId}`);
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
            console.log(
              `Player ${attackerId} dealt ${data.damage} damage to player ${data.targetId}`
            );
          }
        }
      }
    });

    ws.on("close", async (code, reason) => {
      const id = clients.get(ws);
      if (id) {
        const player = players.get(id);
        if (player) {
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
          console.log(
            `Player ${id} data saved before disconnection. Code: ${code}, Reason: ${reason}`
          );

          const itemsToRemove = [];
          items.forEach((item, itemId) => {
            if (item.spawnedBy === id) {
              itemsToRemove.push(itemId);
            }
          });

          itemsToRemove.forEach((itemId) => {
            items.delete(itemId);
            console.log(
              `Item ${itemId} removed due to player ${id} disconnection`
            );
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
