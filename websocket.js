const { saveUserDatabase } = require("./database");

const tradeRequests = new Map(); // Запросы: key = `${fromId}-${toId}`, value = { status: 'pending' }
const tradeOffers = new Map(); // Офферы: key = `${fromId}-${toId}`, value = { myOffer: [], partnerOffer: [], myConfirmed: false, partnerConfirmed: false }

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
    return false; // Пока оставляем как есть
  }

  wss.on("connection", (ws) => {
    console.log("Клиент подключился");

    let inactivityTimer = setTimeout(() => {
      console.log("Клиент отключён из-за неактивности");
      ws.close(4000, "Inactivity timeout");
    }, INACTIVITY_TIMEOUT);

    ws.on("message", async (message) => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.log("Клиент отключён из-за неактивности");
        ws.close(4000, "Inactivity timeout");
      }, INACTIVITY_TIMEOUT);

      let data;
      try {
        data = JSON.parse(message);
      } catch (e) {
        console.error("Неверный JSON:", e);
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
            armor: 0,
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
            maxStats: { health: 100, energy: 100, food: 100, water: 100 },
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
            console.error(`Мир с ID ${targetWorldId} не существует`);
            return;
          }

          console.log(
            `Игрок ${id} переходит из мира ${oldWorldId} в мир ${targetWorldId} на x:${data.x}, y:${data.y}`
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
            `Переход успешен: игрок ${id}, мир ${targetWorldId}, синхронизировано ${worldPlayers.length} игроков, ${worldItems.length} предметов`
          );
        }
      } else if (data.type === "syncPlayers") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          const worldId = data.worldId;
          if (player.worldId !== worldId) {
            console.warn(
              `Игрок ${id} запросил syncPlayers для неверного мира ${worldId}`
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
            `Отправлен список ${worldPlayers.length} игроков в мире ${worldId} для ${id}`
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
            },
            upgradePoints: player.upgradePoints || 0,
            availableQuests: player.availableQuests || [],
            worldId: player.worldId || 0,
            worldPositions: player.worldPositions || {
              0: { x: player.x, y: player.y },
            },
            // --- Исправлено: не подставляем 100, если значение 0 ---
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
              error: "Недостаточно баляр!",
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
          `Игрок ${id} купил ${data.option} стакан воды, вода: ${
            player.water
          }, баляры: ${balyaryCount - data.cost}`
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
            `Игрок ${id} познакомился с NPC: npcMet=${data.npcMet}, задания: ${player.availableQuests}`
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
          // Рассылаем обновление всем игрокам в том же мире
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
            `Игрок ${id} обновил уровень: ${data.level}, XP: ${
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
            `Игрок ${id} обновил maxStats: ${JSON.stringify(
              data.maxStats
            )}, upgradePoints: ${data.upgradePoints}`
          );
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
            `Инвентарь и задания игрока ${id} обновлены: ${
              player.availableQuests
            }, selectedQuestId: ${player.selectedQuestId || "null"}`
          );
        }
      } else if (data.type === "unequipItem") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          const { slotName, inventorySlot, itemId } = data;
          if (
            player &&
            player.equipment &&
            player.equipment[slotName] &&
            player.equipment[slotName].itemId === itemId &&
            player.inventory &&
            player.inventory[inventorySlot] === null
          ) {
            // Перемещаем предмет из экипировки в инвентарь
            player.inventory[inventorySlot] = player.equipment[slotName];
            player.equipment[slotName] = null;

            players.set(id, { ...player });
            userDatabase.set(id, { ...player });
            await saveUserDatabase(dbCollection, id, player);

            // Отправляем обновлённые данные только этому игроку
            ws.send(
              JSON.stringify({ type: "update", player: { id, ...player } })
            );
            console.log(
              `Игрок ${id} снял экипировку ${itemId} из ${slotName} в слот инвентаря ${inventorySlot}`
            );
          }
        }
      } else if (data.type === "updateQuests") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.availableQuests =
            data.availableQuests || player.availableQuests;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
          console.log(
            `Задания игрока ${id} обновлены: ${player.availableQuests}`
          );
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

        if (item.type === "balyary") {
          const quantityToAdd = item.quantity || 1;
          const balyarySlot = player.inventory.findIndex(
            (slot) => slot && slot.type === "balyary"
          );
          if (balyarySlot !== -1) {
            player.inventory[balyarySlot].quantity =
              (player.inventory[balyarySlot].quantity || 1) + quantityToAdd;
          } else {
            const freeSlot = player.inventory.findIndex(
              (slot) => slot === null
            );
            if (freeSlot !== -1) {
              player.inventory[freeSlot] = {
                type: "balyary",
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
        if (id) {
          const player = players.get(id);
          const slotIndex = data.slotIndex;
          const item = player.inventory[slotIndex];
          if (item) {
            const effect = ITEM_CONFIG[item.type].effect;
            if (effect.health)
              player.health = Math.min(
                player.maxStats.health,
                Math.max(0, player.health + effect.health)
              );
            if (effect.energy)
              player.energy = Math.min(
                player.maxStats.energy,
                Math.max(0, player.energy + effect.energy)
              );
            if (effect.food)
              player.food = Math.min(
                player.maxStats.food,
                Math.max(0, player.food + effect.food)
              );
            if (effect.water)
              player.water = Math.min(
                player.maxStats.water,
                Math.max(0, player.water + effect.water)
              );

            player.inventory[slotIndex] = null;
            players.set(id, { ...player });
            userDatabase.set(id, { ...player });
            await saveUserDatabase(dbCollection, id, player);

            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({ type: "update", player: { id, ...player } })
                );
              }
            });
            console.log(
              `Игрок ${id} использовал ${item.type} из слота ${slotIndex}`
            );
          }
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
              // Снимаем старый предмет, если есть
              if (player.equipment[slotName]) {
                const freeSlot = player.inventory.findIndex(
                  (slot) => slot === null
                );
                if (freeSlot !== -1) {
                  player.inventory[freeSlot] = player.equipment[slotName];
                }
              }
              // Экипируем новый предмет
              player.equipment[slotName] = {
                type: item.type,
                itemId: item.itemId,
              };
              player.inventory[slotIndex] = null;

              // --- НЕ изменяем player.maxStats! ---

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
                `Игрок ${id} экипировал ${item.type} в слот ${slotName}`
              );
            }
          }
        }
      } else if (data.type === "dropItem") {
        const id = clients.get(ws);
        console.log(
          `Получен запрос dropItem от ${id}, slotIndex: ${data.slotIndex}, x: ${
            data.x
          }, y: ${data.y}, quantity: ${data.quantity || 1}`
        );
        if (id) {
          const player = players.get(id);
          const slotIndex = data.slotIndex;
          const item = player.inventory[slotIndex];
          if (item) {
            let quantityToDrop = data.quantity || 1;
            if (item.type === "balyary") {
              const currentQuantity = item.quantity || 1;
              if (quantityToDrop > currentQuantity) {
                console.log(
                  `У игрока ${id} недостаточно Баляр для выброса: ${quantityToDrop} > ${currentQuantity}`
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
              if (item.type === "balyary") {
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
                        quantity:
                          item.type === "balyary" ? quantityToDrop : undefined,
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
                `Игрок ${id} выбросил ${quantityToDrop} ${item.type} в мире ${player.worldId} на x:${dropX}, y:${dropY}`
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

        if (distance > 1000 || fromPlayer.health <= 0 || toPlayer.health <= 0)
          return;

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
          `Server: tradeRequest forwarded from ${fromId} to ${data.toId}`
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
        console.log(
          `Server: tradeAccepted forwarded from ${fromId} to ${data.toId}`
        );
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
        console.log(
          `Server: tradeCancelled forwarded from ${fromId} to ${data.toId}`
        );
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
          `Server: tradeOffer from ${fromId} to ${
            data.toId
          } — offer=${JSON.stringify(data.offer)}`
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
        console.log(
          `Server: tradeConfirmed forwarded from ${fromId} to ${data.toId}`
        );
      } else if (data.type === "tradeCompleted") {
        const fromId = clients.get(ws);
        if (!fromId || !players.has(fromId) || !players.has(data.toId)) return;
        const fromPlayer = players.get(fromId);
        const toPlayer = players.get(data.toId);
        if (!fromPlayer.inventory || !toPlayer.inventory) return;

        // Проверка наличия предметов по itemId

        // Проверка наличия предметов строго по offerSlot
        let fromOfferValid = true;
        let toOfferValid = true;
        for (let i = 0; i < data.myOffer.length; i++) {
          const item = data.myOffer[i];
          if (item) {
            const slotIdx = item.originalSlot;
            if (
              typeof slotIdx !== "number" ||
              !fromPlayer.inventory[slotIdx] ||
              fromPlayer.inventory[slotIdx].itemId !== item.itemId
            ) {
              fromOfferValid = false;
              console.log(
                "TRADE ERROR: fromPlayer slot mismatch",
                item,
                fromPlayer.inventory[slotIdx]
              );
              break;
            }
          }
        }
        for (let i = 0; i < data.partnerOffer.length; i++) {
          const item = data.partnerOffer[i];
          if (item) {
            const slotIdx = item.originalSlot;
            if (
              typeof slotIdx !== "number" ||
              !toPlayer.inventory[slotIdx] ||
              toPlayer.inventory[slotIdx].itemId !== item.itemId
            ) {
              toOfferValid = false;
              console.log(
                "TRADE ERROR: toPlayer slot mismatch",
                item,
                toPlayer.inventory[slotIdx]
              );
              break;
            }
          }
        }
        if (!fromOfferValid || !toOfferValid) {
          wss.clients.forEach((client) => {
            if (
              client.readyState === 1 &&
              (clients.get(client) === fromId ||
                clients.get(client) === data.toId)
            ) {
              client.send(
                JSON.stringify({
                  type: "tradeCancelled",
                  fromId,
                  toId: data.toId,
                })
              );
            }
          });
          console.log(
            `Server: tradeCompleted FAILED between ${fromId} and ${data.toId} — invalid offers, fromOfferValid=${fromOfferValid}, toOfferValid=${toOfferValid}`
          );
          return;
        }

        // Проверка свободных слотов
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
              client.readyState === 1 &&
              (clients.get(client) === fromId ||
                clients.get(client) === data.toId)
            ) {
              client.send(
                JSON.stringify({
                  type: "tradeCancelled",
                  fromId,
                  toId: data.toId,
                })
              );
            }
          });
          console.log(
            `Server: tradeCompleted FAILED between ${fromId} and ${data.toId} — not enough free slots (fromFreeSlots=${fromFreeSlots}, toFreeSlots=${toFreeSlots}, fromOfferCount=${fromOfferCount}, toOfferCount=${toOfferCount})`
          );
          return;
        }
        // Удаляем предметы строго из offerSlot
        data.myOffer.forEach((item) => {
          if (!item) return;
          const idx = item.originalSlot;
          if (
            typeof idx === "number" &&
            fromPlayer.inventory[idx] &&
            fromPlayer.inventory[idx].itemId === item.itemId
          ) {
            fromPlayer.inventory[idx] = null;
          }
        });
        data.partnerOffer.forEach((item) => {
          if (!item) return;
          const idx = item.originalSlot;
          if (
            typeof idx === "number" &&
            toPlayer.inventory[idx] &&
            toPlayer.inventory[idx].itemId === item.itemId
          ) {
            toPlayer.inventory[idx] = null;
          }
        });

        // Добавляем предметы партнёру
        data.myOffer.forEach((item) => {
          if (!item) return;
          const freeIdx = toPlayer.inventory.findIndex((slot) => slot === null);
          if (freeIdx !== -1) toPlayer.inventory[freeIdx] = item;
        });
        data.partnerOffer.forEach((item) => {
          if (!item) return;
          const freeIdx = fromPlayer.inventory.findIndex(
            (slot) => slot === null
          );
          if (freeIdx !== -1) fromPlayer.inventory[freeIdx] = item;
        });

        await saveUserDatabase(dbCollection, fromId, fromPlayer);
        await saveUserDatabase(dbCollection, data.toId, toPlayer);

        // Оповещаем обоих игроков
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            if (clients.get(client) === fromId) {
              client.send(
                JSON.stringify({
                  type: "tradeCompleted",
                  fromId,
                  toId: data.toId,
                  newInventory: fromPlayer.inventory,
                })
              );
            } else if (clients.get(client) === data.toId) {
              client.send(
                JSON.stringify({
                  type: "tradeCompleted",
                  fromId,
                  toId: data.toId,
                  newInventory: toPlayer.inventory,
                })
              );
            }
          }
        });
        console.log(
          `Server: tradeCompleted SUCCESS between ${fromId} and ${
            data.toId
          } — exchanged ${fromOfferCount} and ${toOfferCount} items. fromNewFree=${
            fromPlayer.inventory.filter((s) => s === null).length
          }, toNewFree=${toPlayer.inventory.filter((s) => s === null).length}`
        );
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

            // Рассылаем обновление всем игрокам в том же мире
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
              `Игрок ${attackerId} нанёс ${data.damage} урона игроку ${data.targetId}`
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
            `Данные игрока ${id} сохранены перед отключением. Код: ${code}, Причина: ${reason}`
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
              `Предмет ${itemId} удалён из-за отключения игрока ${id}`
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
        console.log("Клиент отключился:", id);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "playerLeft", id }));
          }
        });
      }
      clearTimeout(inactivityTimer);
    });

    ws.on("error", (error) => {
      console.error("Ошибка WebSocket:", error);
      clearTimeout(inactivityTimer);
    });
  });
}

module.exports = { setupWebSocket };
