const { saveUserDatabase } = require("./database");

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
  INACTIVITY_TIMEOUT
) {
  function checkCollisionServer(x, y) {
    return false; // Keeping as is
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
      if (item && ITEM_CONFIG[item.type] && ITEM_CONFIG[item.type].effect) {
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

      // === РЕГИСТРАЦИЯ ===
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
            jackMet: false,
            level: 0,
            xp: 99,
            upgradePoints: 0,
            availableQuests: [],
            worldId: 0,
            worldPositions: { 0: { x: 222, y: 3205 } },
            healthUpgrade: 0,
            energyUpgrade: 0,
            foodUpgrade: 0,
            waterUpgrade: 0,
          };

          userDatabase.set(data.username, newPlayer);
          await saveUserDatabase(dbCollection, data.username, newPlayer);
          ws.send(JSON.stringify({ type: "registerSuccess" }));
        }

        // === ПЕРЕХОД МЕЖДУ МИРАМИ ===
      } else if (data.type === "worldTransition") {
        const id = clients.get(ws);
        if (!id) return;

        const player = players.get(id);
        const oldWorldId = player.worldId;
        const targetWorldId = data.targetWorldId;

        if (!worlds.find((w) => w.id === targetWorldId)) return;

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
          })
        );

        // === СИНХРОНИЗАЦИЯ ИГРОКОВ ===
      } else if (data.type === "syncPlayers") {
        const id = clients.get(ws);
        if (!id) return;

        const player = players.get(id);
        const worldId = data.worldId;
        if (player.worldId !== worldId) return;

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

        // === ВХОД ===
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
            selectedQuestId: player.selectedQuestId || null,
            level: player.level || 0,
            xp: player.xp || 0,
            upgradePoints: player.upgradePoints || 0,
            availableQuests: player.availableQuests || [],
            worldId: player.worldId || 0,
            worldPositions: player.worldPositions || {
              0: { x: player.x, y: player.y },
            },
            healthUpgrade: player.healthUpgrade || 0,
            energyUpgrade: player.energyUpgrade || 0,
            foodUpgrade: player.foodUpgrade || 0,
            waterUpgrade: player.waterUpgrade || 0,
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
              selectedQuestId: playerData.selectedQuestId,
              level: playerData.level,
              xp: playerData.xp,
              upgradePoints: playerData.upgradePoints,
              availableQuests: playerData.availableQuests,
              worldId: playerData.worldId,
              worldPositions: playerData.worldPositions,
              healthUpgrade: playerData.healthUpgrade,
              energyUpgrade: playerData.energyUpgrade,
              foodUpgrade: playerData.foodUpgrade,
              waterUpgrade: playerData.waterUpgrade,
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

        // === ПОКУПКА ВОДЫ ===
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

        // === ВСТРЕЧА С NPC / JACK ===
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

        // === ДВИЖЕНИЕ ===
      } else if (data.type === "move") {
        const id = clients.get(ws);
        if (!id) return;

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
          updatedPlayer.worldPositions[data.worldId] = { x: data.x, y: data.y };
        }

        players.set(id, updatedPlayer);
        userDatabase.set(id, updatedPlayer);
        await saveUserDatabase(dbCollection, id, updatedPlayer);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const clientPlayer = players.get(clients.get(client));
            if (
              clientPlayer &&
              clientPlayer.worldId === updatedPlayer.worldId
            ) {
              client.send(
                JSON.stringify({ type: "update", player: updatedPlayer })
              );
            }
          }
        });

        // === ОБНОВЛЕНИЕ УРОВНЯ ===
      } else if (data.type === "updateLevel") {
        const id = clients.get(ws);
        if (!id) return;

        const player = players.get(id);
        player.level = data.level;
        player.xp = data.xp;
        player.upgradePoints = data.upgradePoints || 0;
        players.set(id, { ...player });
        userDatabase.set(id, { ...player });
        await saveUserDatabase(dbCollection, id, player);

        // === ОБНОВЛЕНИЕ МАКС. СТАТОВ ===
      } else if (data.type === "updateMaxStats") {
        const id = clients.get(ws);
        if (!id) return;

        const player = players.get(id);
        player.upgradePoints = data.upgradePoints;
        player.healthUpgrade = data.healthUpgrade || player.healthUpgrade || 0;
        player.energyUpgrade = data.energyUpgrade || player.energyUpgrade || 0;
        player.foodUpgrade = data.foodUpgrade || player.foodUpgrade || 0;
        player.waterUpgrade = data.waterUpgrade || player.waterUpgrade || 0;

        calculateMaxStats(player, ITEM_CONFIG);

        players.set(id, { ...player });
        userDatabase.set(id, { ...player });
        await saveUserDatabase(dbCollection, id, player);

        // === ОБНОВЛЕНИЕ ИНВЕНТАРЯ ===
      } else if (data.type === "updateInventory") {
        const id = clients.get(ws);
        if (!id) return;

        const player = players.get(id);
        player.inventory = data.inventory;
        player.availableQuests = data.availableQuests || player.availableQuests;
        players.set(id, { ...player });
        userDatabase.set(id, { ...player });
        await saveUserDatabase(dbCollection, id, player);

        // === НОВАЯ СИСТЕМА ТОРГОВЛИ ===
      } else if (data.type === "tradeRequest") {
        const fromId = clients.get(ws);
        if (!fromId || !data.toId) return;

        const fromPlayer = players.get(fromId);
        const toPlayer = players.get(data.toId);

        if (
          !fromPlayer ||
          !toPlayer ||
          fromPlayer.worldId !== toPlayer.worldId
        ) {
          ws.send(
            JSON.stringify({
              type: "tradeError",
              message: "Invalid player or world",
            })
          );
          return;
        }

        const dx = fromPlayer.x - toPlayer.x;
        const dy = fromPlayer.y - toPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 100 || fromPlayer.health <= 0 || toPlayer.health <= 0) {
          ws.send(
            JSON.stringify({ type: "tradeError", message: "Too far or dead" })
          );
          return;
        }

        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            clients.get(client) === data.toId
          ) {
            client.send(
              JSON.stringify({ type: "tradeRequest", fromId, toId: data.toId })
            );
          }
        });
      } else if (data.type === "tradeAccepted") {
        const fromId = clients.get(ws); // Принимающий
        const toId = data.toId; // Инициатор

        if (!fromId || !toId) return;

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
              );
            }
          }
        });
      } else if (data.type === "tradeOffer") {
        const fromId = clients.get(ws);
        if (!fromId || !data.toId || !Array.isArray(data.offer)) return;

        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            clients.get(client) === data.toId
          ) {
            client.send(
              JSON.stringify({ type: "tradeOffer", fromId, offer: data.offer })
            );
          }
        });
      } else if (data.type === "tradeConfirmed") {
        const fromId = clients.get(ws);
        if (!fromId || !data.toId) return;

        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            clients.get(client) === data.toId
          ) {
            client.send(JSON.stringify({ type: "tradeConfirmed", fromId }));
          }
        });
      } else if (data.type === "tradeCompleted") {
        const fromId = clients.get(ws);
        if (
          !fromId ||
          !data.toId ||
          !Array.isArray(data.myOffer) ||
          !Array.isArray(data.partnerOffer)
        )
          return;

        const fromPlayer = players.get(fromId);
        const toPlayer = players.get(data.toId);

        if (
          !fromPlayer ||
          !toPlayer ||
          !fromPlayer.inventory ||
          !toPlayer.inventory
        )
          return;

        // Валидация предложений
        const validateOffer = (offer, player) => {
          return offer.every((item) => {
            if (!item) return true;
            const invItem = player.inventory[item.originalSlot];
            return (
              invItem &&
              invItem.type === item.type &&
              (!item.quantity || invItem.quantity === item.quantity)
            );
          });
        };

        if (
          !validateOffer(data.myOffer, fromPlayer) ||
          !validateOffer(data.partnerOffer, toPlayer)
        ) {
          wss.clients.forEach((client) => {
            const id = clients.get(client);
            if (id === fromId || id === data.toId) {
              client.send(
                JSON.stringify({
                  type: "tradeCancelled",
                  message: "Invalid offer",
                })
              );
            }
          });
          return;
        }

        // Проверка свободных слотов
        const freeSlots = (inv) => inv.filter((s) => s === null).length;
        if (
          freeSlots(fromPlayer.inventory) <
            data.partnerOffer.filter(Boolean).length ||
          freeSlots(toPlayer.inventory) < data.myOffer.filter(Boolean).length
        ) {
          wss.clients.forEach((client) => {
            const id = clients.get(client);
            if (id === fromId || id === data.toId) {
              client.send(
                JSON.stringify({
                  type: "tradeCancelled",
                  message: "No inventory space",
                })
              );
            }
          });
          return;
        }

        // Удаление из инвентаря
        data.myOffer.forEach((item) => {
          if (item) fromPlayer.inventory[item.originalSlot] = null;
        });
        data.partnerOffer.forEach((item) => {
          if (item) toPlayer.inventory[item.originalSlot] = null;
        });

        // Добавление в инвентарь
        const addToInventory = (player, items) => {
          items.forEach((item) => {
            if (item) {
              const slot = player.inventory.findIndex((s) => s === null);
              if (slot !== -1) {
                player.inventory[slot] = {
                  type: item.type,
                  quantity: item.quantity,
                  itemId: `${item.type}_${Date.now()}_${Math.random()}`,
                };
              }
            }
          });
        };

        addToInventory(toPlayer, data.myOffer);
        addToInventory(fromPlayer, data.partnerOffer);

        players.set(fromId, { ...fromPlayer });
        players.set(data.toId, { ...toPlayer });
        userDatabase.set(fromId, { ...fromPlayer });
        userDatabase.set(data.toId, { ...toPlayer });
        await saveUserDatabase(dbCollection, fromId, fromPlayer);
        await saveUserDatabase(dbCollection, data.toId, toPlayer);

        wss.clients.forEach((client) => {
          const id = clients.get(client);
          if (id === fromId) {
            client.send(
              JSON.stringify({
                type: "tradeCompleted",
                newInventory: fromPlayer.inventory,
              })
            );
          } else if (id === data.toId) {
            client.send(
              JSON.stringify({
                type: "tradeCompleted",
                newInventory: toPlayer.inventory,
              })
            );
          }
        });
      } else if (data.type === "tradeCancelled") {
        const fromId = clients.get(ws);
        if (!fromId || !data.toId) return;

        wss.clients.forEach((client) => {
          const id = clients.get(client);
          if (id === fromId || id === data.toId) {
            client.send(JSON.stringify({ type: "tradeCancelled" }));
          }
        });

        // === АТАКА ===
      } else if (data.type === "attackPlayer") {
        const attackerId = clients.get(ws);
        if (
          !attackerId ||
          !players.has(attackerId) ||
          !players.has(data.targetId)
        )
          return;

        const attacker = players.get(attackerId);
        const target = players.get(data.targetId);

        if (
          attacker.worldId !== data.worldId ||
          target.worldId !== data.worldId ||
          target.health <= 0
        )
          return;

        target.health = Math.max(0, target.health - data.damage);
        players.set(data.targetId, { ...target });
        userDatabase.set(data.targetId, { ...target });
        await saveUserDatabase(dbCollection, data.targetId, target);

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

        // === ВЫБОР КВЕСТА ===
      } else if (data.type === "selectQuest") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.selectedQuestId = data.questId;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
        }

        // === СТРЕЛЬБА ===
      } else if (data.type === "shoot") {
        const shooterId = clients.get(ws);
        if (!shooterId || !players.has(shooterId)) return;

        const player = players.get(shooterId);
        if (player.worldId !== data.worldId) return;

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const clientPlayer = players.get(clients.get(client));
            if (clientPlayer && clientPlayer.worldId === data.worldId) {
              client.send(JSON.stringify({ type: "shoot", ...data }));
            }
          }
        });
      } else if (
        data.type === "bulletCollision" ||
        data.type === "removeBullet"
      ) {
        if (!data.worldId) return;

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const clientPlayer = players.get(clients.get(client));
            if (clientPlayer && clientPlayer.worldId === data.worldId) {
              client.send(JSON.stringify({ type: data.type, ...data }));
            }
          }
        });
      }
    });

    ws.on("close", async (code, reason) => {
      const id = clients.get(ws);
      if (id) {
        const player = players.get(id);
        if (player) {
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          const itemsToRemove = [];
          items.forEach((item, itemId) => {
            if (item.spawnedBy === id) itemsToRemove.push(itemId);
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
