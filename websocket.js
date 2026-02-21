const { saveUserDatabase } = require("./database");
const { generateEnemyDrop } = require("./dropGenerator");
const { handleTwisterMessage } = require("./misterTwisterServer");
const {
  initializeTrashCans,
  handleTrashGuess,
  trashCansState,
} = require("./trashCansServer");
const { handleTorestosUpgrade } = require("./torestosServer");
const {
  handleHomelessRentRequest,
  handleHomelessRentConfirm,
  handleHomelessStorageAction,
} = require("./homelessServer");
const { handleSkillUpgrade } = require("./toremidosServer");
const {
  initSequenceForPlayer,
  shouldEnqueueClientMessage,
  enqueueClientMessage,
  getNextServerSeq,
  cleanupSequence,
} = require("./playerStateSequence");

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

function broadcastTradeCancelled(wss, clients, playerAId, playerBId) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const id = clients.get(client);
      if (id === playerAId || id === playerBId) {
        client.send(JSON.stringify({ type: "tradeCancelled" }));
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
const BLOOD_EYE_SPEED = 3.2;
const BLOOD_EYE_AGGRO = 300;
const BLOOD_EYE_COOLDOWN = 2000;
const BLOOD_EYE_PROJ_SPEED = 5; // px/s
const BLOOD_EYE_DAMAGE_MIN = 12;
const BLOOD_EYE_DAMAGE_MAX = 18;

obstacles = [
  {
    worldId: 0,
    x1: 640,
    y1: 190,
    x2: 1525,
    y2: 657,
  },
  {
    worldId: 0,
    x1: 1525,
    y1: 657,
    x2: 2065,
    y2: 196,
  },
  {
    worldId: 0,
    x1: 640,
    y1: 190,
    x2: 2065,
    y2: 196,
  },
  {
    worldId: 0,
    x1: 507,
    y1: 348,
    x2: 640,
    y2: 299,
  },
  {
    worldId: 0,
    x1: 640,
    y1: 299,
    x2: 550,
    y2: 250,
  },
  {
    worldId: 0,
    x1: 550,
    y1: 250,
    x2: 534,
    y2: 178,
  },
  {
    worldId: 0,
    x1: 534,
    y1: 178,
    x2: 220,
    y2: 100,
  },
  {
    worldId: 0,
    x1: 220,
    y1: 100,
    x2: 0,
    y2: 206,
  },
  {
    worldId: 0,
    x1: 0,
    y1: 206,
    x2: 31,
    y2: 272,
  },
  {
    worldId: 0,
    x1: 31,
    y1: 272,
    x2: 186,
    y2: 310,
  },
  {
    worldId: 0,
    x1: 186,
    y1: 310,
    x2: 381,
    y2: 308,
  },
  {
    worldId: 0,
    x1: 381,
    y1: 308,
    x2: 507,
    y2: 348,
  },
  //Парус
  {
    worldId: 0,
    x1: 2800,
    y1: 1111,
    x2: 2442,
    y2: 1181,
  },
  {
    worldId: 0,
    x1: 2442,
    y1: 1181,
    x2: 2355,
    y2: 1055,
  },
  {
    worldId: 0,
    x1: 2355,
    y1: 1055,
    x2: 2191,
    y2: 1014,
  },
  {
    worldId: 0,
    x1: 2191,
    y1: 1014,
    x2: 2179,
    y2: 877,
  },
  {
    worldId: 0,
    x1: 2179,
    y1: 877,
    x2: 2800,
    y2: 797,
  },

  //Вокзал
  {
    worldId: 0,
    x1: 0,
    y1: 2404,
    x2: 799,
    y2: 2404,
  },
  {
    worldId: 0,
    x1: 799,
    y1: 2404,
    x2: 979,
    y2: 2288,
  },
  {
    worldId: 0,
    x1: 979,
    y1: 2288,
    x2: 767,
    y2: 1763,
  },
  {
    worldId: 0,
    x1: 767,
    y1: 1763,
    x2: 58,
    y2: 1784,
  },
  {
    worldId: 0,
    x1: 58,
    y1: 1784,
    x2: 0,
    y2: 2020,
  },

  //My House
  {
    worldId: 0,
    x1: 2810,
    y1: 2692,
    x2: 2615,
    y2: 2708,
  },
  {
    worldId: 0,
    x1: 2615,
    y1: 2708,
    x2: 2250,
    y2: 2379,
  },
  {
    worldId: 0,
    x1: 2250,
    y1: 2379,
    x2: 2414,
    y2: 2260,
  },
  {
    worldId: 0,
    x1: 2414,
    y1: 2260,
    x2: 2810,
    y2: 2573,
  },
  //Общага
  {
    worldId: 0,
    x1: 1800,
    y1: 2800,
    x2: 1731,
    y2: 2750,
  },
  {
    worldId: 0,
    x1: 1731,
    y1: 2750,
    x2: 2200,
    y2: 2500,
  },
  {
    worldId: 0,
    x1: 2200,
    y1: 2500,
    x2: 2310,
    y2: 2580,
  },
  {
    worldId: 0,
    x1: 2310,
    y1: 2580,
    x2: 1982,
    y2: 2810,
  },

  //минора
  {
    worldId: 0,
    x1: 701,
    y1: 1213,
    x2: 600,
    y2: 1135,
  },
  {
    worldId: 0,
    x1: 600,
    y1: 1135,
    x2: 355,
    y2: 1307,
  },
  {
    worldId: 0,
    x1: 355,
    y1: 1307,
    x2: 199,
    y2: 1121,
  },
  {
    worldId: 0,
    x1: 199,
    y1: 1121,
    x2: 293,
    y2: 1048,
  },
  {
    worldId: 0,
    x1: 293,
    y1: 1048,
    x2: 345,
    y2: 791,
  },
  {
    worldId: 0,
    x1: 345,
    y1: 791,
    x2: 706,
    y2: 686,
  },
  {
    worldId: 0,
    x1: 706,
    y1: 686,
    x2: 1059,
    y2: 792,
  },
  {
    worldId: 0,
    x1: 1059,
    y1: 792,
    x2: 1186,
    y2: 1123,
  },
  {
    worldId: 0,
    x1: 1186,
    y1: 1123,
    x2: 1023,
    y2: 1305,
  },
  {
    worldId: 0,
    x1: 1023,
    y1: 1305,
    x2: 806,
    y2: 1156,
  },
  {
    worldId: 0,
    x1: 806,
    y1: 1156,
    x2: 701,
    y2: 1213,
  },

  //Мечникова
  {
    worldId: 0,
    x1: 1967,
    y1: 1977,
    x2: 1400,
    y2: 1600,
  },
  {
    worldId: 0,
    x1: 1400,
    y1: 1600,
    x2: 1945,
    y2: 1343,
  },
  {
    worldId: 0,
    x1: 1945,
    y1: 1343,
    x2: 2416,
    y2: 1624,
  },
  {
    worldId: 0,
    x1: 2416,
    y1: 1624,
    x2: 1967,
    y2: 1977,
  },
];

function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

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
  enemies,
) {
  function checkCollisionServer(x, y) {
    return false;
  }

  function calculateMaxStats(player, ITEM_CONFIG) {
    // Базовые значения + улучшения от перков
    const base = {
      health: 100 + (player.healthUpgrade || 0),
      energy: 100 + (player.energyUpgrade || 0),
      food: 100 + (player.foodUpgrade || 0),
      water: 100 + (player.waterUpgrade || 0),
      armor: 0,
    };

    // Проверяем полную коллекцию
    const slots = ["head", "chest", "belt", "pants", "boots", "gloves"];
    const collections = slots
      .map((slot) => player.equipment?.[slot])
      .filter(Boolean)
      .map((item) => ITEM_CONFIG[item.type]?.collection)
      .filter(Boolean);

    const isFullSet =
      collections.length === slots.length && new Set(collections).size === 1;

    const multiplier = isFullSet ? 2 : 1;

    // Применяем бонусы экипировки
    Object.values(player.equipment || {}).forEach((item) => {
      if (!item) return;
      const eff = ITEM_CONFIG[item.type]?.effect;
      if (!eff) return;

      if (eff.health) base.health += eff.health * multiplier;
      if (eff.energy) base.energy += eff.energy * multiplier;
      if (eff.food) base.food += eff.food * multiplier;
      if (eff.water) base.water += eff.water * multiplier;
      if (eff.armor) base.armor += eff.armor * multiplier;
    });

    // Записываем итоговые максимумы
    player.maxStats = { ...base };

    // Жёстко ограничиваем текущие значения (самая важная защита!)
    player.health = Math.max(
      0,
      Math.min(player.health ?? 0, player.maxStats.health),
    );
    player.energy = Math.max(
      0,
      Math.min(player.energy ?? 0, player.maxStats.energy),
    );
    player.food = Math.max(0, Math.min(player.food ?? 0, player.maxStats.food));
    player.water = Math.max(
      0,
      Math.min(player.water ?? 0, player.maxStats.water),
    );
    player.armor = Math.max(
      0,
      Math.min(player.armor ?? 0, player.maxStats.armor),
    );
  }

  const EQUIPMENT_TYPES = {
    headgear: "head",
    armor: "chest",
    belt: "belt",
    pants: "pants",
    boots: "boots",
    weapon: "weapon",
    gloves: "gloves",
  };

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
      }),
    );
  }

  const applyMessage = async (playerId, msgType, payload, clientSeq) => {
    if (!players.has(playerId)) return false;
    const player = players.get(playerId);
    let success = false;

    switch (msgType) {
      // ────────────────────────────────────────
      // move / update
      // ────────────────────────────────────────
      case "move":
      case "update": {
        const currentWorldId = player.worldId;
        const oldX = player.x;
        const oldY = player.y;

        if (payload.x !== undefined) player.x = Number(payload.x);
        if (payload.y !== undefined) player.y = Number(payload.y);
        if (payload.direction) player.direction = payload.direction;
        if (payload.state) player.state = payload.state;
        if (payload.attackFrame !== undefined)
          player.attackFrame = Number(payload.attackFrame);
        if (payload.attackFrameTime !== undefined)
          player.attackFrameTime = Number(payload.attackFrameTime);
        if (payload.frame !== undefined) player.frame = Number(payload.frame);

        if (payload.health !== undefined)
          player.health = Math.max(
            0,
            Math.min(player.maxStats?.health || 100, Number(payload.health)),
          );
        if (payload.energy !== undefined)
          player.energy = Math.max(
            0,
            Math.min(player.maxStats?.energy || 100, Number(payload.energy)),
          );
        if (payload.food !== undefined)
          player.food = Math.max(
            0,
            Math.min(player.maxStats?.food || 100, Number(payload.food)),
          );
        if (payload.water !== undefined)
          player.water = Math.max(
            0,
            Math.min(player.maxStats?.water || 100, Number(payload.water)),
          );
        if (payload.armor !== undefined) player.armor = Number(payload.armor);
        if (payload.distanceTraveled !== undefined)
          player.distanceTraveled = Number(payload.distanceTraveled);

        let positionValid = true;
        if (payload.x !== undefined || payload.y !== undefined) {
          for (const obs of obstacles) {
            if (obs.worldId !== currentWorldId) continue;
            if (
              segmentsIntersect(
                oldX,
                oldY,
                player.x,
                player.y,
                obs.x1,
                obs.y1,
                obs.x2,
                obs.y2,
              )
            ) {
              positionValid = false;
              break;
            }
          }
        }

        if (!positionValid) {
          player.x = oldX;
          player.y = oldY;
          ws.send(
            JSON.stringify({
              type: "forcePosition",
              x: oldX,
              y: oldY,
              reason: "collision",
            }),
          );
          success = true; // даже коллизия — обработано
          break;
        }

        success = true;
        break;
      }

      // ────────────────────────────────────────
      // pickup
      // ────────────────────────────────────────
      case "pickup": {
        if (!items.has(payload.itemId)) {
          ws.send(
            JSON.stringify({ type: "itemNotFound", itemId: payload.itemId }),
          );
          break;
        }

        const item = items.get(payload.itemId);
        if (item.isQuestItem && item.questOwnerId !== playerId) break;

        if (!player.inventory) player.inventory = Array(20).fill(null);

        let added = false;
        if (
          item.type === "balyary" ||
          item.type === "atom" ||
          item.type === "blue_crystal" ||
          item.type === "green_crystal" ||
          item.type === "red_crystal" ||
          item.type === "white_crystal" ||
          item.type === "yellow_crystal" ||
          item.type === "chameleon_crystal" ||
          item.type === "nanofilament" ||
          item.type === "nanoalloy" ||
          (item.type.startsWith("recipe_") && item.type.includes("_equipment"))
        ) {
          const quantityToAdd = item.quantity || 1;
          const stackSlot = player.inventory.findIndex(
            (slot) => slot && slot.type === item.type,
          );
          if (stackSlot !== -1) {
            player.inventory[stackSlot].quantity =
              (player.inventory[stackSlot].quantity || 1) + quantityToAdd;
            added = true;
          }
        }

        if (!added) {
          const freeSlot = player.inventory.findIndex((slot) => slot === null);
          if (freeSlot === -1) {
            ws.send(
              JSON.stringify({ type: "inventoryFull", itemId: payload.itemId }),
            );
            break;
          }
          player.inventory[freeSlot] = {
            type: item.type,
            itemId: payload.itemId,
            ...(item.quantity && item.quantity > 1
              ? { quantity: item.quantity }
              : {}),
          };
        }

        items.delete(payload.itemId);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const cp = players.get(clients.get(client));
            if (cp && cp.worldId === item.worldId) {
              client.send(
                JSON.stringify({
                  type: "itemPicked",
                  itemId: payload.itemId,
                  playerId,
                  item: {
                    type: item.type,
                    itemId: payload.itemId,
                    quantity: item.quantity || 1,
                    isDroppedByPlayer: item.isDroppedByPlayer || false,
                  },
                }),
              );
            }
          }
        });

        setTimeout(
          () => {
            const world = worlds.find((w) => w.id === item.worldId);
            if (!world) return;
            const newItemId = `${item.type}_${Date.now()}`;
            const newItem = {
              x: Math.random() * world.width,
              y: Math.random() * world.height,
              type: item.type,
              spawnTime: Date.now(),
              worldId: item.worldId,
              quantity: item.quantity,
            };
            items.set(newItemId, newItem);
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                const cp = players.get(clients.get(client));
                if (cp && cp.worldId === item.worldId) {
                  client.send(
                    JSON.stringify({
                      type: "newItem",
                      itemId: newItemId,
                      x: newItem.x,
                      y: newItem.y,
                      type: newItem.type,
                      spawnTime: newItem.spawnTime,
                      worldId: newItem.worldId,
                      quantity: newItem.quantity,
                    }),
                  );
                }
              }
            });
          },
          10 * 60 * 1000,
        );

        success = true;
        break;
      }

      // ────────────────────────────────────────
      // useItem
      // ────────────────────────────────────────
      case "useItem": {
        const slotIndex = payload.slotIndex;
        const item = player.inventory?.[slotIndex];
        if (!item) break;

        const cfg = ITEM_CONFIG[item.type];
        if (!cfg?.effect) break;

        const effect = cfg.effect;
        if (effect.health) player.health += effect.health;
        if (effect.energy) player.energy += effect.energy;
        if (effect.food) player.food += effect.food;
        if (effect.water) player.water += effect.water;
        if (effect.armor) player.armor += effect.armor;

        player.health = Math.max(
          0,
          Math.min(player.health, player.maxStats?.health || 100),
        );
        player.energy = Math.max(
          0,
          Math.min(player.energy, player.maxStats?.energy || 100),
        );
        player.food = Math.max(
          0,
          Math.min(player.food, player.maxStats?.food || 100),
        );
        player.water = Math.max(
          0,
          Math.min(player.water, player.maxStats?.water || 100),
        );
        player.armor = Math.max(
          0,
          Math.min(player.armor, player.maxStats?.armor || 0),
        );

        if (cfg.stackable) {
          if (item.quantity > 1) {
            item.quantity -= 1;
          } else {
            player.inventory[slotIndex] = null;
          }
        } else {
          player.inventory[slotIndex] = null;
        }

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
          }),
        );

        success = true;
        break;
      }

      // ────────────────────────────────────────
      // equipItem
      // ────────────────────────────────────────
      case "equipItem": {
        const { slotIndex, slotName } = payload;

        if (
          slotIndex < 0 ||
          slotIndex >= player.inventory.length ||
          !player.inventory[slotIndex]
        ) {
          ws.send(
            JSON.stringify({
              type: "equipItemFail",
              error: "Неверный слот инвентаря",
            }),
          );
          break;
        }

        const item = player.inventory[slotIndex];
        const config = ITEM_CONFIG[item.type];

        if (!config || !config.type) {
          ws.send(
            JSON.stringify({
              type: "equipItemFail",
              error: "Некорректный предмет",
            }),
          );
          break;
        }

        if (config.level !== undefined && (player.level || 0) < config.level) {
          ws.send(
            JSON.stringify({
              type: "equipItemFail",
              error: `Требуется уровень ${config.level} для экипировки этого предмета`,
            }),
          );
          break;
        }

        let targetSlot = slotName;

        if (config.type === "weapon") {
          if (config.hands === "twohanded") {
            if (player.equipment.offhand !== null) {
              ws.send(
                JSON.stringify({
                  type: "equipItemFail",
                  error: "Снимите предмет со второй руки для двуручного оружия",
                }),
              );
              break;
            }
            targetSlot = "weapon";
          } else if (config.hands === "onehanded") {
            const currentWeapon = player.equipment.weapon;
            if (currentWeapon) {
              const currentConfig = ITEM_CONFIG[currentWeapon.type];
              if (currentConfig?.hands === "twohanded") {
                targetSlot = "weapon";
              } else {
                targetSlot =
                  player.equipment.offhand === null ? "offhand" : "weapon";
              }
            } else {
              targetSlot = "weapon";
            }
          }
        } else {
          targetSlot = EQUIPMENT_TYPES[config.type];
          if (!targetSlot) {
            ws.send(
              JSON.stringify({
                type: "equipItemFail",
                error: "Нельзя экипировать в этот слот",
              }),
            );
            break;
          }
        }

        const oldItem = player.equipment[targetSlot];

        if (oldItem) {
          player.inventory[slotIndex] = {
            type: oldItem.type,
            itemId: oldItem.itemId,
          };
        } else {
          player.inventory[slotIndex] = null;
        }

        player.equipment[targetSlot] = { type: item.type, itemId: item.itemId };

        if (oldItem) {
          const oldConfig = ITEM_CONFIG[oldItem.type];
          if (oldConfig?.type === "weapon" && oldConfig.hands === "twohanded") {
            player.equipment.offhand = null;
          }
        }

        if (config.hands === "twohanded") {
          player.equipment.offhand = null;
        }

        calculateMaxStats(player, ITEM_CONFIG);

        ws.send(
          JSON.stringify({
            type: "equipItemSuccess",
            inventory: player.inventory,
            equipment: player.equipment,
            maxStats: player.maxStats,
            stats: {
              health: player.health,
              energy: player.energy,
              food: player.food,
              water: player.water,
              armor: player.armor,
            },
          }),
        );

        broadcastToWorld(
          wss,
          clients,
          players,
          player.worldId,
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
            },
          }),
        );

        success = true;
        break;
      }

      // ────────────────────────────────────────
      // unequipItem
      // ────────────────────────────────────────
      case "unequipItem": {
        const { slotName, inventorySlot, itemId } = payload;

        const validSlots = [
          "head",
          "chest",
          "belt",
          "pants",
          "boots",
          "weapon",
          "offhand",
          "gloves",
        ];
        if (!validSlots.includes(slotName)) {
          ws.send(
            JSON.stringify({
              type: "unequipItemFail",
              error: "Недопустимый слот",
            }),
          );
          break;
        }

        const equippedItem = player.equipment[slotName];
        if (!equippedItem || equippedItem.itemId !== itemId) {
          ws.send(
            JSON.stringify({
              type: "unequipItemFail",
              error: "Предмет не найден в слоте или неверный itemId",
            }),
          );
          break;
        }

        if (
          inventorySlot < 0 ||
          inventorySlot >= player.inventory.length ||
          player.inventory[inventorySlot] !== null
        ) {
          ws.send(
            JSON.stringify({
              type: "unequipItemFail",
              error: "Указанный слот инвентаря недоступен или занят",
            }),
          );
          break;
        }

        player.inventory[inventorySlot] = {
          type: equippedItem.type,
          itemId: equippedItem.itemId,
        };
        player.equipment[slotName] = null;

        const config = ITEM_CONFIG[equippedItem.type];
        if (config?.type === "weapon" && config.hands === "twohanded") {
          player.equipment.offhand = null;
        }

        calculateMaxStats(player, ITEM_CONFIG);

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
            },
          }),
        );

        broadcastToWorld(
          wss,
          clients,
          players,
          player.worldId,
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
            },
          }),
        );

        success = true;
        break;
      }

      // ────────────────────────────────────────
      // dropItem
      // ────────────────────────────────────────
      case "dropItem": {
        const slotIndex = payload.slotIndex;
        const item = player.inventory?.[slotIndex];
        if (!item) break;

        let quantityToDrop = payload.quantity || 1;
        if (ITEM_CONFIG[item.type]?.stackable) {
          const currentQuantity = item.quantity || 1;
          if (quantityToDrop > currentQuantity) break;
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
        } while (checkCollisionServer(dropX, dropY) && attempts < maxAttempts);

        if (attempts >= maxAttempts) break;

        const itemId = `${item.type}_${Date.now()}`;

        if (ITEM_CONFIG[item.type]?.stackable) {
          if (quantityToDrop === (item.quantity || 1)) {
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

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const cp = players.get(clients.get(client));
            if (cp && cp.worldId === player.worldId) {
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
                }),
              );

              if (clients.get(client) === playerId) {
                client.send(
                  JSON.stringify({
                    type: "update",
                    player: { id: playerId, ...player },
                  }),
                );
              }
            }
          }
        });

        success = true;
        break;
      }

      // ────────────────────────────────────────
      // attackPlayer
      // ────────────────────────────────────────
      case "attackPlayer": {
        const attacker = player;
        const target = players.get(payload.targetId);
        if (
          !target ||
          attacker.worldId !== payload.worldId ||
          target.worldId !== payload.worldId ||
          target.health <= 0
        )
          break;

        target.health = Math.max(0, target.health - payload.damage);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const cp = players.get(clients.get(client));
            if (cp && cp.worldId === target.worldId) {
              client.send(
                JSON.stringify({
                  type: "update",
                  player: { id: payload.targetId, ...target },
                }),
              );
            }
          }
        });

        success = true;
        break;
      }

      // ────────────────────────────────────────
      // attackEnemy
      // ────────────────────────────────────────
      case "attackEnemy": {
        const attacker = player;
        const enemy = enemies.get(payload.targetId);
        if (
          !attacker ||
          !enemy ||
          enemy.worldId !== payload.worldId ||
          enemy.health <= 0
        )
          break;

        enemy.health = Math.max(0, enemy.health - payload.damage);

        if (enemy.health <= 0) {
          enemies.delete(payload.targetId);

          broadcastToWorld(
            wss,
            clients,
            players,
            payload.worldId,
            JSON.stringify({
              type: "enemyDied",
              enemyId: payload.targetId,
            }),
          );

          const now = Date.now();
          const dropItems = generateEnemyDrop(
            enemy.type,
            enemy.x,
            enemy.y,
            payload.worldId,
            now,
          );

          if (dropItems.length > 0) {
            for (const drop of dropItems) {
              items.set(drop.itemId, {
                x: drop.x,
                y: drop.y,
                type: drop.type,
                quantity: drop.quantity || 1,
                spawnTime: drop.spawnTime,
                worldId: drop.worldId,
              });
            }
            broadcastToWorld(
              wss,
              clients,
              players,
              payload.worldId,
              JSON.stringify({
                type: "newItem",
                items: dropItems,
              }),
            );
          }

          let xpGained = 13;
          if (enemy.type === "scorpion") xpGained = 20;
          if (enemy.type === "blood_eye") xpGained = 50;

          attacker.xp = (attacker.xp || 0) + xpGained;

          const oldLevel = attacker.level;
          let xpToNext = calculateXPToNextLevel(attacker.level);

          while (attacker.xp >= xpToNext && attacker.level < 100) {
            attacker.level += 1;
            attacker.xp -= xpToNext;
            attacker.upgradePoints = (attacker.upgradePoints || 0) + 10;
            xpToNext = calculateXPToNextLevel(attacker.level);
          }

          const levelsGained = attacker.level - oldLevel;
          if (levelsGained > 0) {
            attacker.skillPoints =
              (attacker.skillPoints || 0) + 3 * levelsGained;
            ws.send(
              JSON.stringify({
                type: "updateLevel",
                level: attacker.level,
                xp: attacker.xp,
                xpToNextLevel: xpToNext,
                upgradePoints: attacker.upgradePoints,
                skillPoints: attacker.skillPoints,
              }),
            );
          }

          ws.send(
            JSON.stringify({
              type: "levelSyncAfterKill",
              level: attacker.level,
              xp: attacker.xp,
              xpToNextLevel: xpToNext,
              upgradePoints: attacker.upgradePoints,
              xpGained,
            }),
          );

          if (
            enemy.type === "mutant" &&
            attacker.neonQuest?.currentQuestId === "neon_quest_1"
          ) {
            attacker.neonQuest.progress = attacker.neonQuest.progress || {};
            attacker.neonQuest.progress.killMutants =
              (attacker.neonQuest.progress.killMutants || 0) + 1;
            ws.send(
              JSON.stringify({
                type: "neonQuestProgressUpdate",
                progress: attacker.neonQuest.progress,
              }),
            );
          }

          setTimeout(
            () => spawnNewEnemy(payload.worldId),
            8000 + Math.random() * 7000,
          );
        } else {
          enemies.set(payload.targetId, enemy);
          broadcastToWorld(
            wss,
            clients,
            players,
            payload.worldId,
            JSON.stringify({
              type: "enemyUpdate",
              enemy: {
                id: payload.targetId,
                health: enemy.health,
                x: enemy.x,
                y: enemy.y,
              },
            }),
          );
        }

        success = true;
        break;
      }

      // ────────────────────────────────────────
      // tradeCompleted
      // ────────────────────────────────────────
      case "tradeCompleted": {
        const fromId = playerId;
        let toId = payload.toId;

        if (!toId || !players.has(toId)) {
          for (const [key, offers] of tradeOffers.entries()) {
            const [id1, id2] = key.split("-");
            if (id1 === fromId || id2 === fromId) {
              toId = id1 === fromId ? id2 : id1;
              break;
            }
          }
        }

        if (!toId || !players.has(toId)) break;

        const tradeKey =
          fromId < toId ? `${fromId}-${toId}` : `${toId}-${fromId}`;
        if (!tradeOffers.has(tradeKey)) break;

        const offers = tradeOffers.get(tradeKey);
        if (!offers.myConfirmed || !offers.partnerConfirmed) break;

        const playerAId = tradeKey.split("-")[0];
        const playerBId = tradeKey.split("-")[1];
        const playerA = players.get(playerAId);
        const playerB = players.get(playerBId);

        if (!playerA || !playerB || !playerA.inventory || !playerB.inventory)
          break;

        const offerFromA = offers.myOffer;
        const offerFromB = offers.partnerOffer;

        const validateOffer = (player, offer) => {
          return offer.every((item) => {
            if (!item) return true;
            const invItem = player.inventory[item.originalSlot];
            if (!invItem) return false;
            if (invItem.type !== item.type) return false;
            if (item.quantity && invItem.quantity < item.quantity) return false;
            return true;
          });
        };

        if (
          !validateOffer(playerA, offerFromA) ||
          !validateOffer(playerB, offerFromB)
        ) {
          broadcastTradeCancelled(wss, clients, playerAId, playerBId);
          tradeRequests.delete(tradeKey);
          tradeOffers.delete(tradeKey);
          break;
        }

        const calculateRequiredSlots = (player, incomingOffer) => {
          let required = 0;
          incomingOffer.forEach((item) => {
            if (!item) return;
            const isStackable = ITEM_CONFIG[item.type]?.stackable;
            if (isStackable) {
              if (!player.inventory.some((s) => s && s.type === item.type))
                required++;
            } else {
              required++;
            }
          });
          return required;
        };

        const calculateFreedSlots = (player, ownOffer) => {
          let freed = 0;
          ownOffer.forEach((item) => {
            if (!item || item.originalSlot === undefined) return;
            const slotItem = player.inventory[item.originalSlot];
            if (!slotItem) return;
            if (ITEM_CONFIG[item.type]?.stackable && item.quantity) {
              if ((slotItem.quantity || 1) - item.quantity <= 0) freed++;
            } else {
              freed++;
            }
          });
          return freed;
        };

        const freeA = playerA.inventory.filter((s) => s === null).length;
        const freeB = playerB.inventory.filter((s) => s === null).length;
        const freedA = calculateFreedSlots(playerA, offerFromA);
        const freedB = calculateFreedSlots(playerB, offerFromB);
        const availA = freeA + freedA;
        const availB = freeB + freedB;

        const reqA = calculateRequiredSlots(playerA, offerFromB);
        const reqB = calculateRequiredSlots(playerB, offerFromA);

        if (availA < reqA || availB < reqB) {
          broadcastTradeCancelled(wss, clients, playerAId, playerBId);
          tradeRequests.delete(tradeKey);
          tradeOffers.delete(tradeKey);
          break;
        }

        const removeOffered = (player, offer) => {
          offer.forEach((item) => {
            if (!item || item.originalSlot === undefined) return;
            const invItem = player.inventory[item.originalSlot];
            if (!invItem || invItem.type !== item.type) return;
            if (ITEM_CONFIG[item.type]?.stackable && item.quantity) {
              invItem.quantity = (invItem.quantity || 1) - item.quantity;
              if (invItem.quantity <= 0)
                player.inventory[item.originalSlot] = null;
            } else {
              player.inventory[item.originalSlot] = null;
            }
          });
        };

        removeOffered(playerA, offerFromA);
        removeOffered(playerB, offerFromB);

        const addReceived = (player, itemsToAdd) => {
          itemsToAdd.forEach((item) => {
            if (!item) return;
            const type = item.type;
            const qty = item.quantity || 1;
            if (ITEM_CONFIG[type]?.stackable) {
              const existing = player.inventory.find(
                (s) => s && s.type === type,
              );
              if (existing) {
                existing.quantity = (existing.quantity || 1) + qty;
                return;
              }
            }
            const free = player.inventory.findIndex((s) => s === null);
            if (free !== -1) {
              player.inventory[free] = {
                type,
                quantity: qty,
                itemId: `${type}_${Date.now()}_${Math.random()}`,
              };
            }
          });
        };

        addReceived(playerA, offerFromB);
        addReceived(playerB, offerFromA);

        wss.clients.forEach((client) => {
          if (client.readyState !== WebSocket.OPEN) return;
          const cid = clients.get(client);
          if (cid === playerAId) {
            client.send(
              JSON.stringify({
                type: "tradeCompleted",
                newInventory: playerA.inventory,
              }),
            );
          } else if (cid === playerBId) {
            client.send(
              JSON.stringify({
                type: "tradeCompleted",
                newInventory: playerB.inventory,
              }),
            );
          }
        });

        tradeRequests.delete(tradeKey);
        tradeOffers.delete(tradeKey);

        success = true;
        break;
      }

      // ────────────────────────────────────────
      // buyWater
      // ────────────────────────────────────────
      case "buyWater": {
        const balyarySlot = player.inventory.findIndex(
          (s) => s && s.type === "balyary",
        );
        const balyaryCount =
          balyarySlot !== -1 ? player.inventory[balyarySlot].quantity || 1 : 0;

        if (balyaryCount < payload.cost) {
          ws.send(
            JSON.stringify({
              type: "buyWaterResult",
              success: false,
              error: "Not enough balyary!",
            }),
          );
          break;
        }

        if (balyaryCount === payload.cost) {
          player.inventory[balyarySlot] = null;
        } else {
          player.inventory[balyarySlot].quantity -= payload.cost;
        }

        player.water = Math.min(
          player.maxStats.water,
          player.water + payload.waterGain,
        );

        ws.send(
          JSON.stringify({
            type: "buyWaterResult",
            success: true,
            option: payload.option,
            water: player.water,
            inventory: player.inventory,
            balyaryCount:
              balyarySlot !== -1
                ? player.inventory[balyarySlot]?.quantity || 0
                : 0,
          }),
        );

        success = true;
        break;
      }

      // ────────────────────────────────────────
      // sellToJack
      // ────────────────────────────────────────
      case "sellToJack": {
        const slotIndex = payload.slotIndex;
        if (slotIndex < 0 || slotIndex >= player.inventory.length) {
          ws.send(
            JSON.stringify({ type: "sellToJackFail", error: "Неверный слот" }),
          );
          break;
        }

        const item = player.inventory[slotIndex];
        if (!item) {
          ws.send(
            JSON.stringify({ type: "sellToJackFail", error: "Слот пустой" }),
          );
          break;
        }

        const cfg = ITEM_CONFIG[item.type];
        if (!cfg) {
          ws.send(
            JSON.stringify({
              type: "sellToJackFail",
              error: "Неверный тип предмета",
            }),
          );
          break;
        }

        const BLACKLIST = ["balyary", "atom", "blood_pack", "blood_syringe"];
        const isFood =
          cfg.rarity >= 1 &&
          cfg.rarity <= 3 &&
          !BLACKLIST.includes(item.type) &&
          cfg.category !== "weapon";

        if (!isFood) {
          ws.send(
            JSON.stringify({
              type: "sellToJackFail",
              error: "Джек покупает только продукты питания",
            }),
          );
          break;
        }

        player.inventory[slotIndex] = null;

        let balyarySlot = player.inventory.findIndex(
          (s) => s && s.type === "balyary",
        );
        if (balyarySlot !== -1) {
          player.inventory[balyarySlot].quantity =
            (player.inventory[balyarySlot].quantity || 0) + 1;
        } else {
          const freeSlot = player.inventory.findIndex((s) => s === null);
          if (freeSlot === -1) {
            ws.send(
              JSON.stringify({
                type: "sellToJackFail",
                error: "Нет места для баляра",
              }),
            );
            break;
          }
          player.inventory[freeSlot] = {
            type: "balyary",
            quantity: 1,
            itemId: `balyary_${Date.now()}`,
          };
        }

        ws.send(
          JSON.stringify({
            type: "sellToJackSuccess",
            inventory: player.inventory,
          }),
        );

        success = true;
        break;
      }

      // ────────────────────────────────────────
      // buyFromJack
      // ────────────────────────────────────────
      case "buyFromJack": {
        const type = payload.itemType;
        const cfg = ITEM_CONFIG[type];
        if (!cfg) {
          ws.send(
            JSON.stringify({
              type: "buyFromJackFail",
              error: "Неверный тип предмета",
            }),
          );
          break;
        }

        const BLACKLIST = ["balyary", "atom", "blood_pack", "blood_syringe"];
        const isValid =
          cfg.rarity >= 1 &&
          cfg.rarity <= 3 &&
          !BLACKLIST.includes(type) &&
          cfg.category !== "weapon";

        if (!isValid) {
          ws.send(
            JSON.stringify({
              type: "buyFromJackFail",
              error: "Этот предмет нельзя купить у Джека",
            }),
          );
          break;
        }

        const price = cfg.rarity;
        if (payload.price !== price) {
          ws.send(
            JSON.stringify({ type: "buyFromJackFail", error: "Неверная цена" }),
          );
          break;
        }

        const balyarySlot = player.inventory.findIndex(
          (s) => s && s.type === "balyary",
        );
        const balyaryQty =
          balyarySlot !== -1 ? player.inventory[balyarySlot].quantity || 0 : 0;

        if (balyaryQty < price) {
          ws.send(
            JSON.stringify({
              type: "buyFromJackFail",
              error: "Не хватает баляров",
            }),
          );
          break;
        }

        if (balyaryQty === price) {
          player.inventory[balyarySlot] = null;
        } else {
          player.inventory[balyarySlot].quantity -= price;
        }

        const freeSlot = player.inventory.findIndex((s) => s === null);
        if (freeSlot === -1) {
          ws.send(
            JSON.stringify({
              type: "buyFromJackFail",
              error: "Инвентарь полон",
            }),
          );
          break;
        }

        player.inventory[freeSlot] = {
          type,
          quantity: 1,
          itemId: `${type}_${Date.now()}`,
        };

        ws.send(
          JSON.stringify({
            type: "buyFromJackSuccess",
            inventory: player.inventory,
          }),
        );

        success = true;
        break;
      }

      default:
        console.warn(`applyMessage: неизвестный тип ${msgType}`);
        return false;
    }

    // ─── Общие действия после успешного применения ───
    if (success) {
      players.set(playerId, { ...player });
      userDatabase.set(playerId, { ...player });
      await saveUserDatabase(dbCollection, playerId, player);

      ws.send(
        JSON.stringify({
          type: "actionConfirmed",
          clientSeq,
          serverSeq: getNextServerSeq(playerId),
        }),
      );

      const updateData = {
        id: playerId,
        x: player.x,
        y: player.y,
        direction: player.direction,
        state: player.state,
        frame: player.frame,
        health: player.health,
        energy: player.energy,
        food: player.food,
        water: player.water,
        armor: player.armor,
        distanceTraveled: player.distanceTraveled,
        meleeDamageBonus: player.meleeDamageBonus || 0,
      };

      if (player.state === "attacking") {
        updateData.attackFrame = player.attackFrame ?? 0;
        updateData.attackFrameTime = player.attackFrameTime ?? 0;
      }

      broadcastToWorld(
        wss,
        clients,
        players,
        player.worldId,
        JSON.stringify({
          type: "update",
          player: updateData,
        }),
      );
    }

    return success;
  };

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

      const playerId = clients.get(ws);

      // ─── 1. Типы, которые НЕ ставим в очередь (обрабатываем сразу) ───
      if (
        [
          "register",
          "login", // если есть в твоём коде
          "worldTransition",
          "meetNPC",
          "meetTorestos",
          "torestosUpgrade",
          "meetToremidos",
          "upgradeSkill",
          "requestRegeneration",
          "twister",
          "trashGuess",
          "getTrashState",
          "getAllTrashStates",
          "homelessRentRequest",
          "homelessRentConfirm",
          "homelessStorageAction",
          // добавь сюда ВСЕ остальные типы, которые обрабатываются НЕ в applyMessage,
          // а сразу (через handleXXX или напрямую)
        ].includes(data.type)
      ) {
        // ─── Здесь оставляем 100% старую логику для этих типов ───

        if (data.type === "register") {
          if (userDatabase.has(data.username)) {
            ws.send(JSON.stringify({ type: "registerFail" }));
          } else {
            // вся твоя логика создания нового игрока
            const newPlayer = {
              id: data.username,
              x: 100,
              y: 100,
              worldId: 0,
              health: 100,
              energy: 100,
              food: 100,
              water: 100,
              armor: 0,
              maxStats: {
                health: 100,
                energy: 100,
                food: 100,
                water: 100,
                armor: 0,
              },
              inventory: Array(20).fill(null),
              equipment: {},
              level: 1,
              xp: 0,
              upgradePoints: 0,
              skillPoints: 0,
              distanceTraveled: 0,
              meleeDamageBonus: 0,
              hasSeenWelcomeGuide: false,
            };
            userDatabase.set(data.username, newPlayer);
            await saveUserDatabase(dbCollection, data.username, newPlayer);
            ws.send(JSON.stringify({ type: "registerSuccess" }));
          }
          return;
        }

        if (data.type === "worldTransition") {
          // вся твоя старая логика перехода между мирами
          // (если она есть — вставь сюда 1 в 1)
          return;
        }

        // Примеры для handle-функций — вставь свои реальные вызовы
        if (data.type === "twister") {
          return handleTwisterMessage(ws, data, players, clients, wss);
        }

        if (data.type === "trashGuess") {
          return handleTrashGuess(ws, data, trashCansState);
        }

        if (data.type === "torestosUpgrade") {
          return handleTorestosUpgrade(
            ws,
            data,
            players,
            userDatabase,
            dbCollection,
          );
        }

        if (data.type === "homelessRentRequest") {
          return handleHomelessRentRequest(ws, data, players);
        }

        if (data.type === "homelessRentConfirm") {
          return handleHomelessRentConfirm(ws, data, players);
        }

        if (data.type === "homelessStorageAction") {
          return handleHomelessStorageAction(ws, data, players);
        }

        if (data.type === "upgradeSkill") {
          return handleSkillUpgrade(
            ws,
            data,
            players,
            userDatabase,
            dbCollection,
          );
        }

        // если есть другие типы без очереди — добавляй аналогично
        return;
      }

      // ─── 2. Типы, которые меняют состояние → в очередь ───
      if (
        [
          "move",
          "update",
          "pickup",
          "useItem",
          "equipItem",
          "unequipItem",
          "dropItem",
          "attackPlayer",
          "attackEnemy",
          "tradeCompleted",
          "buyWater",
          "sellToJack",
          "buyFromJack",
          // если есть ещё мутирующие типы — добавь сюда
        ].includes(data.type)
      ) {
        if (!playerId || !players.has(playerId)) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Not authenticated or session expired",
            }),
          );
          return;
        }

        initSequenceForPlayer(playerId);

        const incomingSeq = Number(data.seq ?? -1);
        if (!Number.isInteger(incomingSeq) || incomingSeq < 0) {
          console.warn(`Некорректный seq от ${playerId}:`, data.seq);
          return;
        }

        if (!shouldEnqueueClientMessage(playerId, incomingSeq, data.type)) {
          return; // молча отбрасываем старые/дубликаты
        }

        enqueueClientMessage(
          playerId,
          incomingSeq,
          data.type,
          data,
          applyMessage,
        );
        return;
      }

      // ─── 3. Неизвестный тип ───
      console.warn(
        `Необработанный тип сообщения от ${playerId || "unknown"}: ${data.type}`,
      );
    });

    // ================== ИНТЕРВАЛ ОБНОВЛЕНИЯ ВРАГОВ ==================
    const enemyUpdateInterval = setInterval(() => {
      const now = Date.now();

      enemies.forEach((enemy, enemyId) => {
        if (enemy.health <= 0) return;

        // === Определяем параметры в зависимости от типа врага ===
        let speed = ENEMY_SPEED;
        let aggroRange = AGGRO_RANGE;
        let attackRange = ATTACK_RANGE;
        let attackCooldown = ENEMY_ATTACK_COOLDOWN;
        let minDamage = 10;
        let maxDamage = 15;
        let isRanged = false;
        let projectileSpeed = 0;

        if (enemy.type === "scorpion") {
          speed = 4;
          attackCooldown = 1000;
          minDamage = 5;
          maxDamage = 10;
        } else if (enemy.type === "blood_eye") {
          speed = BLOOD_EYE_SPEED; // 3.2
          aggroRange = BLOOD_EYE_AGGRO; // 400
          attackCooldown = BLOOD_EYE_COOLDOWN; // 2000
          minDamage = BLOOD_EYE_DAMAGE_MIN; // 12
          maxDamage = BLOOD_EYE_DAMAGE_MAX; // 18
          isRanged = true;
          projectileSpeed = BLOOD_EYE_PROJ_SPEED; // 200 px/s
        }

        // === Поиск ближайшего живого игрока в радиусе аггро ===
        let closestPlayer = null;
        let minDist = aggroRange;

        players.forEach((player) => {
          if (player.worldId === enemy.worldId && player.health > 0) {
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.hypot(dx, dy);

            if (dist < minDist) {
              minDist = dist;
              closestPlayer = player;
            }
          }
        });

        // === Если есть цель ===
        if (closestPlayer) {
          const dx = closestPlayer.x - enemy.x;
          const dy = closestPlayer.y - enemy.y;
          const dist = Math.hypot(dx, dy);

          if (isRanged) {
            // ────────────────────── ЛОГИКА ДАЛЬНОБОЙНОГО ВРАГА (blood_eye) ──────────────────────
            // Стреляет раз в 2000 мс
            if (now - (enemy.lastAttackTime || 0) >= attackCooldown) {
              // ← добавляем сюда
              if (closestPlayer.health <= 0) {
                enemy.state = "idle";
                return;
              }

              enemy.lastAttackTime = now;
              enemy.state = "attacking";

              const angle = Math.atan2(dy, dx);
              const bulletId = `blood_proj_${enemyId}_${Date.now()}`;

              // Отправляем событие выстрела ВСЕМ в мире
              broadcastToWorld(
                wss,
                clients,
                players,
                enemy.worldId,
                JSON.stringify({
                  type: "enemyShoot",
                  enemyId: enemyId,
                  bulletId: bulletId,
                  x: enemy.x,
                  y: enemy.y,
                  angle: angle,
                  speed: projectileSpeed,
                  damage:
                    Math.floor(Math.random() * (maxDamage - minDamage + 1)) +
                    minDamage,
                  worldId: enemy.worldId,
                  spawnTime: now,
                }),
              );
            }

            // Движение: держим дистанцию ~150–200 пикселей
            const desiredDistance = 180; // можно подкрутить
            if (dist > desiredDistance + 30) {
              // Идём ближе
              enemy.x += (dx / dist) * speed;
              enemy.y += (dy / dist) * speed;
              enemy.state = "walking";
            } else if (dist < desiredDistance - 30) {
              // Отходим назад
              enemy.x -= (dx / dist) * speed * 0.8;
              enemy.y -= (dy / dist) * speed * 0.8;
              enemy.state = "walking";
            } else {
              // Стоим на месте и атакуем
              enemy.state = "attacking";
            }
          } else {
            // ────────────────────── ЛОГИКА БЛИЖНЕГО БОЯ (mutant, scorpion) ──────────────────────
            if (dist > attackRange) {
              // Идём к игроку
              enemy.x += (dx / dist) * speed;
              enemy.y += (dy / dist) * speed;
              enemy.state = "walking";

              // Направление движения
              if (Math.abs(dx) > Math.abs(dy)) {
                enemy.direction = dx > 0 ? "right" : "left";
              } else {
                enemy.direction = dy > 0 ? "down" : "up";
              }
            } else {
              // Атакуем в ближнем бою
              if (now - (enemy.lastAttackTime || 0) >= attackCooldown) {
                enemy.lastAttackTime = now;
                enemy.state = "attacking";

                const damage =
                  Math.floor(Math.random() * (maxDamage - minDamage + 1)) +
                  minDamage;

                // Защита: не наносим урон мёртвому
                if (closestPlayer.health <= 0) {
                  enemy.state = "idle"; // или "walking" — чтобы не замирал
                  return;
                }

                closestPlayer.health = Math.max(
                  0,
                  closestPlayer.health - damage,
                );

                players.set(closestPlayer.id, { ...closestPlayer });
                userDatabase.set(closestPlayer.id, { ...closestPlayer });
                saveUserDatabase(dbCollection, closestPlayer.id, closestPlayer);

                // Уведомляем всех о попадании
                broadcastToWorld(
                  wss,
                  clients,
                  players,
                  enemy.worldId,
                  JSON.stringify({
                    type: "enemyAttack",
                    targetId: closestPlayer.id,
                    damage: damage,
                    enemyId: enemyId,
                  }),
                );

                broadcastToWorld(
                  wss,
                  clients,
                  players,
                  enemy.worldId,
                  JSON.stringify({
                    type: "update",
                    player: { id: closestPlayer.id, ...closestPlayer },
                  }),
                );
              } else {
                enemy.state = "attacking"; // держим анимацию
              }
            }
          }
        } else {
          // Нет цели — idle + лёгкий wander
          enemy.state = "idle";
          if (Math.random() < 0.08) {
            // ~8% шанс каждый тик
            const wanderAngle = Math.random() * Math.PI * 2;
            enemy.x += Math.cos(wanderAngle) * speed * 0.5;
            enemy.y += Math.sin(wanderAngle) * speed * 0.5;
          }
        }

        // === Обновляем направление при движении (для всех типов) ===
        if (enemy.state === "walking" && closestPlayer) {
          const dx = closestPlayer.x - enemy.x;
          const dy = closestPlayer.y - enemy.y;

          if (Math.abs(dx) > Math.abs(dy)) {
            enemy.direction = dx > 0 ? "right" : "left";
          } else {
            enemy.direction = dy > 0 ? "down" : "up";
          }
        }

        // === Отправляем обновление врага ВСЕМ в мире ===
        broadcastToWorld(
          wss,
          clients,
          players,
          enemy.worldId,
          JSON.stringify({
            type: "enemyUpdate",
            enemy: {
              id: enemyId,
              x: enemy.x,
              y: enemy.y,
              state: enemy.state,
              direction: enemy.direction,
              health: enemy.health,
              lastAttackTime: enemy.lastAttackTime || 0,
            },
          }),
        );
      });
    }, 200); // 200 мс — оптимально

    // Очистка интервала при disconnect (в ws.on("close"))
    clearInterval(enemyUpdateInterval);

    ws.on("close", async (code, reason) => {
      const id = clients.get(ws);
      if (id) {
        const player = players.get(id);
        if (player) {
          player.hasSeenWelcomeGuide = player.hasSeenWelcomeGuide || false;
          if (player.health <= 0) {
            player.health = 0; // фиксируем смерть
          }
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
