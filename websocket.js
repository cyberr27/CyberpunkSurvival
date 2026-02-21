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

      if (!ws.registerQueue) {
        ws.registerQueue = [];
        ws.isProcessingRegister = false;
      }

      if (data.type === "register") {
        ws.registerQueue.push(data);
        processRegisterQueue(ws);
        return;
      }
      if (!ws.transitionQueue) {
        ws.transitionQueue = [];
        ws.isProcessingTransition = false;
      }

      if (data.type === "worldTransition") {
        ws.transitionQueue.push(data);
        processWorldTransitionQueue(ws);
        return;
      }
      if (!ws.syncQueue) {
        ws.syncQueue = [];
        ws.isProcessingSync = false;
      }

      if (data.type === "syncPlayers") {
        ws.syncQueue.push(data);
        processSyncQueue(ws);
        return;
      }
      if (!ws.loginQueue) {
        ws.loginQueue = [];
        ws.isProcessingLogin = false;
      }

      if (data.type === "login") {
        ws.loginQueue.push(data);
        processLoginQueue(ws);
        return;
      }
      if (!ws.updateQueue) {
        ws.updateQueue = [];
        ws.isProcessingUpdate = false;
      }

      if (data.type === "update" || data.type === "move") {
        ws.updateQueue.push(data);
        processUpdateQueue(ws);
        return;
      } else if (data.type === "buyWater") {
        const id = clients.get(ws);
        if (!id) return;

        const player = players.get(id);
        if (!player || !player.inventory) return;

        const balyarySlot = player.inventory.findIndex(
          (slot) => slot && slot.type === "balyary",
        );
        const balyaryCount =
          balyarySlot !== -1 ? player.inventory[balyarySlot].quantity || 1 : 0;

        if (balyaryCount < data.cost) {
          ws.send(
            JSON.stringify({
              type: "buyWaterResult",
              success: false,
              error: "Not enough balyary!",
            }),
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
          player.water + data.waterGain,
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
          }),
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
            }),
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
      } else if (data.type === "meetThimblerigger") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const player = players.get(playerId);
        player.thimbleriggerMet = true;

        players.set(playerId, player);
        userDatabase.set(playerId, player);
        await saveUserDatabase(dbCollection, playerId, player);

        ws.send(JSON.stringify({ type: "thimbleriggerMet", met: true }));
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
          }),
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
          }),
        );
      } else if (data.type === "updateLevel") {
        const id = clients.get(ws);
        if (!id || !players.has(id)) return;

        const player = players.get(id);

        player.level = Number(data.level) || player.level || 0;
        player.xp = Number(data.xp) || player.xp || 0;
        player.upgradePoints =
          Number(data.upgradePoints) || player.upgradePoints || 0;

        // Самое важное — skillPoints
        if (
          data.skillPoints !== undefined &&
          !isNaN(Number(data.skillPoints))
        ) {
          const newSkillPoints = Math.max(0, Number(data.skillPoints));
          if (newSkillPoints !== player.skillPoints) {
            console.log(
              `[LevelUp] Игрок ${id} получил skillPoints: ${player.skillPoints} → ${newSkillPoints}`,
            );
            player.skillPoints = newSkillPoints;
          }
        }

        players.set(id, { ...player });
        userDatabase.set(id, { ...player });
        await saveUserDatabase(dbCollection, id, player);

        // Рассылаем обновление только этому игроку (или всем, если хочешь)
        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            clients.get(client) === id
          ) {
            client.send(
              JSON.stringify({
                type: "update",
                player: {
                  id,
                  level: player.level,
                  xp: player.xp,
                  upgradePoints: player.upgradePoints,
                  skillPoints: player.skillPoints,
                },
              }),
            );
          }
        });
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
                JSON.stringify({ type: "update", player: { id, ...player } }),
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
                JSON.stringify({ type: "update", player: { id, ...player } }),
              );
            }
          });
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
        }
      } else if (data.type === "pickup") {
        const id = clients.get(ws);
        if (!id) return;

        if (!items.has(data.itemId)) {
          ws.send(
            JSON.stringify({ type: "itemNotFound", itemId: data.itemId }),
          );
          return;
        }

        const item = items.get(data.itemId);
        const player = players.get(id);

        if (item.isQuestItem && item.questOwnerId !== id) {
          return;
        }

        if (!player.inventory) player.inventory = Array(20).fill(null);

        // НОВОЕ: Расширили условие на atom, чтобы он тоже стекался как balyary
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
          // ИЗМЕНЕНО: Ищем слот с соответствующим типом (balyary или atom)
          const stackSlot = player.inventory.findIndex(
            (slot) => slot && slot.type === item.type, // Теперь проверяем item.type, чтобы работало для atom
          );
          if (stackSlot !== -1) {
            player.inventory[stackSlot].quantity =
              (player.inventory[stackSlot].quantity || 1) + quantityToAdd;
          } else {
            const freeSlot = player.inventory.findIndex(
              (slot) => slot === null,
            );
            if (freeSlot !== -1) {
              player.inventory[freeSlot] = {
                type: item.type, // Используем item.type, чтобы было "atom" или "balyary"
                quantity: quantityToAdd,
                itemId: data.itemId,
              };
            } else {
              ws.send(
                JSON.stringify({ type: "inventoryFull", itemId: data.itemId }),
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
              JSON.stringify({ type: "inventoryFull", itemId: data.itemId }),
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
                }),
              );
              if (clients.get(client) === id) {
                client.send(
                  JSON.stringify({ type: "update", player: { id, ...player } }),
                );
              }
            }
          }
        });

        setTimeout(
          () => {
            const worldWidth = worlds.find((w) => w.id === item.worldId).width;
            const worldHeight = worlds.find(
              (w) => w.id === item.worldId,
            ).height;
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
                    }),
                  );
                }
              }
            });
          },
          10 * 60 * 1000,
        );
      } else if (data.type === "chat") {
        const id = clients.get(ws);
        if (id) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({ type: "chat", id, message: data.message }),
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
              player.maxStats.health,
            );
          if (effect.energy)
            player.energy = Math.min(
              player.energy + effect.energy,
              player.maxStats.energy,
            );
          if (effect.food)
            player.food = Math.min(
              player.food + effect.food,
              player.maxStats.food,
            );
          if (effect.water)
            player.water = Math.min(
              player.water + effect.water,
              player.maxStats.water,
            );
          if (effect.armor)
            player.armor = Math.min(
              player.armor + effect.armor,
              player.maxStats.armor,
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
            }),
          );
        }
      } else if (data.type === "equipItem") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) {
          ws.send(
            JSON.stringify({ type: "equipItemFail", error: "Игрок не найден" }),
          );
          return;
        }

        const player = players.get(playerId);
        const { slotIndex, slotName } = data;

        // Валидация слота инвентаря
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
          return;
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
          return;
        }

        // Проверка уровня
        if (config.level !== undefined && (player.level || 0) < config.level) {
          ws.send(
            JSON.stringify({
              type: "equipItemFail",
              error: `Требуется уровень ${config.level} для экипировки этого предмета`,
            }),
          );
          return;
        }

        // Определяем целевой слот экипировки
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
              return;
            }
            targetSlot = "weapon";
          } else if (config.hands === "onehanded") {
            const currentWeapon = player.equipment.weapon;

            if (currentWeapon) {
              const currentConfig = ITEM_CONFIG[currentWeapon.type];
              if (currentConfig?.hands === "twohanded") {
                // Если сейчас двуручное → новое одноручное ставим вместо него
                targetSlot = "weapon";
              } else {
                // Обычная логика одноручных
                if (player.equipment.offhand === null) {
                  targetSlot = "offhand";
                } else {
                  targetSlot = "weapon";
                }
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
            return;
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

        player.equipment[targetSlot] = {
          type: item.type,
          itemId: item.itemId,
        };

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

        players.set(playerId, { ...player });
        userDatabase.set(playerId, { ...player });
        await saveUserDatabase(dbCollection, playerId, player);

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
      } else if (data.type === "unequipItem") {
        const playerId = clients.get(ws);
        if (!playerId) {
          ws.send(
            JSON.stringify({
              type: "unequipItemFail",
              error: "Игрок не найден",
            }),
          );
          return;
        }

        const player = players.get(playerId);
        if (!player?.equipment || !player?.inventory) {
          ws.send(
            JSON.stringify({
              type: "unequipItemFail",
              error: "Данные игрока недоступны",
            }),
          );
          return;
        }

        const { slotName, inventorySlot, itemId } = data;

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
          return;
        }

        // Проверяем наличие предмета и совпадение itemId (защита от подмены)
        const equippedItem = player.equipment[slotName];
        if (!equippedItem || equippedItem.itemId !== itemId) {
          ws.send(
            JSON.stringify({
              type: "unequipItemFail",
              error: "Предмет не найден в слоте или неверный itemId",
            }),
          );
          return;
        }

        // Проверяем, что указанный слот инвентаря действительно свободен
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
          return;
        }

        // Снимаем предмет и кладём ровно в тот слот инвентаря, который указал клиент
        player.inventory[inventorySlot] = {
          type: equippedItem.type,
          itemId: equippedItem.itemId,
          // quantity: equippedItem.quantity || 1,   // если в будущем будут стакающиеся предметы экипировки
        };

        player.equipment[slotName] = null;

        // Специальная обработка двуручного оружия
        const config = ITEM_CONFIG[equippedItem.type];
        if (config?.type === "weapon" && config.hands === "twohanded") {
          player.equipment.offhand = null;
        }

        // Пересчитываем характеристики
        calculateMaxStats(player, ITEM_CONFIG);

        // Сохраняем изменения
        players.set(playerId, { ...player });
        userDatabase.set(playerId, { ...player });
        await saveUserDatabase(dbCollection, playerId, player);

        // Успешный ответ
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

        // Рассылка обновления другим игрокам в мире
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
                      }),
                    );
                    if (clients.get(client) === id) {
                      client.send(
                        JSON.stringify({
                          type: "update",
                          player: { id, ...player },
                        }),
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
                    }),
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
                  }),
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
                  }),
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
                }),
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
              JSON.stringify({ type: "tradeOffer", fromId, offer: data.offer }),
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
        if (!fromId || !players.has(fromId)) return;

        // Получаем второго участника — он должен быть в данных или в tradeOffers
        let toId = data.toId;
        if (!toId || !players.has(toId)) {
          // Если toId не пришёл — ищем по активным трейдам
          for (const [key, offers] of tradeOffers.entries()) {
            const [id1, id2] = key.split("-");
            if (id1 === fromId || id2 === fromId) {
              toId = id1 === fromId ? id2 : id1;
              break;
            }
          }
        }
        if (!toId || !players.has(toId)) return;

        // Нормализуем ключ торговли (всегда меньший ID первым)
        const tradeKey =
          fromId < toId ? `${fromId}-${toId}` : `${toId}-${fromId}`;
        if (!tradeOffers.has(tradeKey)) return;

        const offers = tradeOffers.get(tradeKey);
        if (!offers.myConfirmed || !offers.partnerConfirmed) return;

        // Определяем игроков
        const playerAId = tradeKey.split("-")[0]; // меньший ID
        const playerBId = tradeKey.split("-")[1]; // больший ID
        const playerA = players.get(playerAId);
        const playerB = players.get(playerBId);

        if (!playerA || !playerB || !playerA.inventory || !playerB.inventory)
          return;

        // Определяем, чьё предложение чьё (симметрично!)
        const offerFromA = offers.myOffer; // всегда от игрока A (меньший ID)
        const offerFromB = offers.partnerOffer; // всегда от игрока B

        // ВАЛИДАЦИЯ: предметы на месте
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
          return;
        }

        // Проверка свободного места
        const calculateRequiredSlots = (player, incomingOffer) => {
          let requiredSlots = 0;

          incomingOffer.forEach((item) => {
            if (!item) return;

            const type = item.type;
            const isStackable = ITEM_CONFIG[type]?.stackable;

            if (isStackable) {
              // Проверяем, есть ли уже стек этого типа в инвентаре
              const hasExistingStack = player.inventory.some(
                (slot) => slot && slot.type === type,
              );
              if (!hasExistingStack) {
                requiredSlots += 1; // Нужен новый слот только если нет стака
              }
              // Если есть — просто прибавим количество, слот не нужен
            } else {
              // Не-стакабельный — всегда нужен отдельный слот
              requiredSlots += 1;
            }
          });

          return requiredSlots;
        };

        const calculateFreedSlots = (player, ownOffer) => {
          let freed = 0;

          ownOffer.forEach((item) => {
            if (!item || item.originalSlot === undefined) return;

            const slotItem = player.inventory[item.originalSlot];
            if (!slotItem) return;

            if (ITEM_CONFIG[item.type]?.stackable && item.quantity) {
              const remaining = (slotItem.quantity || 1) - (item.quantity || 1);
              if (remaining <= 0) {
                freed += 1; // Слот полностью освобождается
              }
              // Если осталось >0 — слот остаётся занятым
            } else {
              freed += 1; // Не-стакабельный — слот всегда освобождается
            }
          });

          return freed;
        };

        // Текущие пустые слоты
        const freeSlotsA = playerA.inventory.filter((s) => s === null).length;
        const freeSlotsB = playerB.inventory.filter((s) => s === null).length;

        // Освобождаются от своих отданных предметов
        const freedByA = calculateFreedSlots(playerA, offerFromA);
        const freedByB = calculateFreedSlots(playerB, offerFromB);

        // Итого доступных слотов после отдачи
        const totalAvailableA = freeSlotsA + freedByA;
        const totalAvailableB = freeSlotsB + freedByB;

        // Сколько реально нужно слотов для входящих предметов (с учётом стеков)
        const requiredForA = calculateRequiredSlots(playerA, offerFromB);
        const requiredForB = calculateRequiredSlots(playerB, offerFromA);

        // Проверка: хватает ли места?
        if (totalAvailableA < requiredForA || totalAvailableB < requiredForB) {
          broadcastTradeCancelled(wss, clients, playerAId, playerBId);
          tradeRequests.delete(tradeKey);
          tradeOffers.delete(tradeKey);
          return;
        }

        // УДАЛЕНИЕ предложенных предметов
        // УДАЛЕНИЕ предложенных предметов (с поддержкой частичного стака)
        offerFromA.forEach((item) => {
          if (item && item.originalSlot !== undefined) {
            const slotIndex = item.originalSlot;
            const invItem = playerA.inventory[slotIndex];

            // Защита от подлога
            if (!invItem || invItem.type !== item.type) return;

            if (ITEM_CONFIG[item.type]?.stackable && item.quantity) {
              // Это stackable (баляры, атомы) — уменьшаем количество
              invItem.quantity = (invItem.quantity || 1) - item.quantity;
              if (invItem.quantity <= 0) {
                playerA.inventory[slotIndex] = null;
              }
            } else {
              // Не stackable — полностью удаляем
              playerA.inventory[slotIndex] = null;
            }
          }
        });

        offerFromB.forEach((item) => {
          if (item && item.originalSlot !== undefined) {
            const slotIndex = item.originalSlot;
            const invItem = playerB.inventory[slotIndex];

            // Защита от подлога
            if (!invItem || invItem.type !== item.type) return;

            if (ITEM_CONFIG[item.type]?.stackable && item.quantity) {
              // Это stackable — уменьшаем количество
              invItem.quantity = (invItem.quantity || 1) - item.quantity;
              if (invItem.quantity <= 0) {
                playerB.inventory[slotIndex] = null;
              }
            } else {
              // Не stackable — полностью удаляем
              playerB.inventory[slotIndex] = null;
            }
          }
        });

        // ДОБАВЛЕНИЕ полученных предметов (с поддержкой стека для stackable)
        const addItemsToPlayer = (player, itemsToAdd) => {
          itemsToAdd.forEach((item) => {
            if (!item) return;

            const type = item.type;
            const qty = item.quantity || 1;

            // Если предмет stackable — ищем существующий стек
            if (ITEM_CONFIG[type]?.stackable) {
              let added = false;
              for (let i = 0; i < player.inventory.length; i++) {
                const slot = player.inventory[i];
                if (slot && slot.type === type) {
                  // Нашли существующий стек — прибавляем
                  slot.quantity = (slot.quantity || 1) + qty;
                  added = true;
                  break;
                }
              }
              if (added) return; // Уже добавили в существующий стек
            }

            // Если не stackable или не нашли стек — ищем свободный слот
            const freeSlot = player.inventory.findIndex((s) => s === null);
            if (freeSlot !== -1) {
              player.inventory[freeSlot] = {
                type: type,
                quantity: qty,
                itemId: `${type}_${Date.now()}_${Math.random()}`,
              };
            }
            // Если нет места — предмет пропадает (уже проверено ранее через freeSlots)
          });
        };

        // Применяем для обоих игроков
        addItemsToPlayer(playerA, offerFromB);
        addItemsToPlayer(playerB, offerFromA);

        // Сохранение
        players.set(playerAId, { ...playerA });
        players.set(playerBId, { ...playerB });
        userDatabase.set(playerAId, { ...playerA });
        userDatabase.set(playerBId, { ...playerB });
        await saveUserDatabase(dbCollection, playerAId, playerA);
        await saveUserDatabase(dbCollection, playerBId, playerB);

        // Отправляем каждому свой новый инвентарь
        wss.clients.forEach((client) => {
          if (client.readyState !== WebSocket.OPEN) return;
          const clientId = clients.get(client);
          if (clientId === playerAId) {
            client.send(
              JSON.stringify({
                type: "tradeCompleted",
                newInventory: playerA.inventory,
              }),
            );
          } else if (clientId === playerBId) {
            client.send(
              JSON.stringify({
                type: "tradeCompleted",
                newInventory: playerB.inventory,
              }),
            );
          }
        });

        // Очистка
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
      } else if (data.type === "tradeChatMessage") {
        const fromId = clients.get(ws);
        if (!fromId) return;

        const toId = data.toId;
        if (!toId || !players.has(toId)) return;

        // Находим активную торговлю между этими двумя игроками
        const sortedIds = [fromId, toId].sort();
        const tradeKey = `${sortedIds[0]}-${sortedIds[1]}`;

        if (!tradeOffers.has(tradeKey) && !tradeRequests.has(tradeKey)) {
          return; // Торговля не активна — игнорируем
        }

        const messagePacket = JSON.stringify({
          type: "tradeChatMessage",
          fromId: fromId,
          message: data.message,
        });

        // Отправляем сообщение И партнёру, И обратно отправителю
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const clientId = clients.get(client);
            if (clientId === toId || clientId === fromId) {
              client.send(messagePacket);
            }
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
                    }),
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

          // Уведомляем всех о смерти
          broadcastToWorld(
            wss,
            clients,
            players,
            data.worldId,
            JSON.stringify({
              type: "enemyDied",
              enemyId: data.targetId,
            }),
          );

          // ───────────────────── НОВАЯ СИСТЕМА ДРОПА ─────────────────────
          const now = Date.now();
          const dropItems = generateEnemyDrop(
            enemy.type,
            enemy.x,
            enemy.y,
            data.worldId,
            now,
          );

          if (dropItems.length > 0) {
            // Добавляем все дропнутые предметы в глобальную карту items
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

            // Отправляем одним сообщением весь дроп
            broadcastToWorld(
              wss,
              clients,
              players,
              data.worldId,
              JSON.stringify({
                type: "newItem",
                items: dropItems,
              }),
            );
          }
          // ──────────────────────────────────────────────────────────────

          // XP и level up
          let xpGained = 13;
          if (enemy.type === "scorpion") {
            xpGained = 20;
          }
          if (enemy.type === "blood_eye") {
            xpGained = 50;
          }
          attacker.xp = (attacker.xp || 0) + xpGained;

          const oldLevel = attacker.level;

          let levelUp = false;
          let xpToNext = calculateXPToNextLevel(attacker.level);

          while (attacker.xp >= xpToNext && attacker.level < 100) {
            attacker.level += 1;
            attacker.xp -= xpToNext;
            attacker.upgradePoints = (attacker.upgradePoints || 0) + 10;
            levelUp = true;
            xpToNext = calculateXPToNextLevel(attacker.level);
          }

          const levelsGained = attacker.level - oldLevel;

          if (levelsGained > 0) {
            attacker.skillPoints =
              (attacker.skillPoints || 0) + 3 * levelsGained;

            // Отправляем клиенту обновление (тот же тип сообщения, что и при прокачке)
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

            // Сохраняем в базу сразу
            players.set(attackerId, attacker);
            userDatabase.set(attackerId, attacker);
            await saveUserDatabase(dbCollection, attackerId, attacker);
          }

          // Уведомление атакующего (levelSyncAfterKill)
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

          // Прогресс квеста (только для мутантов)
          if (enemy.type === "mutant") {
            if (
              attacker.neonQuest &&
              attacker.neonQuest.currentQuestId === "neon_quest_1"
            ) {
              attacker.neonQuest.progress = attacker.neonQuest.progress || {};
              attacker.neonQuest.progress.killMutants =
                (attacker.neonQuest.progress.killMutants || 0) + 1;

              players.set(attackerId, attacker);
              userDatabase.set(attackerId, attacker);
              await saveUserDatabase(dbCollection, attackerId, attacker);

              ws.send(
                JSON.stringify({
                  type: "neonQuestProgressUpdate",
                  progress: attacker.neonQuest.progress,
                }),
              );
            }
          }

          // Респавн через 8–15 секунд
          setTimeout(
            () => spawnNewEnemy(data.worldId),
            8000 + Math.random() * 7000,
          );
        } else {
          // Если враг ещё жив — просто обновляем здоровье
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
            }),
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
          }),
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
          }),
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
            }),
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
          }),
        );
      } else if (data.type === "robotDoctorHeal20") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const player = players.get(playerId);

        // Ищем баляры
        const balyarySlot = player.inventory.findIndex(
          (s) => s && s.type === "balyary",
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
            }),
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
          }),
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
            }),
          );
          return;
        }

        const cost = Math.floor(missingHP / 20);
        const balyarySlot = player.inventory.findIndex(
          (s) => s && s.type === "balyary",
        );
        const balyaryCount =
          balyarySlot !== -1 ? player.inventory[balyarySlot].quantity || 0 : 0;

        if (balyaryCount < cost) {
          ws.send(
            JSON.stringify({
              type: "robotDoctorResult",
              success: false,
              error: "Недостаточно баляров",
            }),
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
          }),
        );
      } else if (data.type === "requestCaptainStamp") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const player = players.get(playerId);

        // Проверяем наличие обычной справки + флаг
        const certSlot = player.inventory.findIndex(
          (item) => item && item.type === "medical_certificate",
        );

        if (certSlot === -1 || !player.medicalCertificate) {
          ws.send(
            JSON.stringify({
              type: "captainStampResult",
              success: false,
              error: "У вас нет медицинской справки МД-07!",
            }),
          );
          return;
        }

        // Заменяем справку на проштампованную
        player.inventory[certSlot] = {
          type: "medical_certificate_stamped",
          quantity: 1,
        };

        // Главное — ставим флаг!
        player.medicalCertificateStamped = true;

        // Сохраняем всё
        players.set(playerId, player);
        userDatabase.set(playerId, player);
        await saveUserDatabase(dbCollection, playerId, player);

        // Отправляем клиенту обновлённый инвентарь + флаг
        ws.send(
          JSON.stringify({
            type: "captainStampResult",
            success: true,
            inventory: player.inventory,
            medicalCertificateStamped: true, // ← важно!
          }),
        );

        // Уведомляем всех в мире (опционально — звук/эффект)
        broadcastToWorld(
          wss,
          clients,
          players,
          player.worldId,
          JSON.stringify({
            type: "playerGotStamp",
            playerId: playerId,
          }),
        );
      } else if (data.type === "submitCorporateDocuments") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const player = players.get(playerId);

        // Проверяем все три условия
        if (
          !player.medicalCertificate ||
          !player.medicalCertificateStamped ||
          !player.inventory.some(
            (item) => item && item.type === "medical_certificate_stamped",
          )
        ) {
          ws.send(
            JSON.stringify({
              type: "corporateDocumentsResult",
              success: false,
              error: "Документы не соответствуют требованиям корпорации.",
            }),
          );
          return;
        }

        // Проверяем, не сдавал ли уже
        if (player.corporateDocumentsSubmitted) {
          ws.send(
            JSON.stringify({
              type: "corporateDocumentsResult",
              success: false,
              error: "Вы уже сдали документы ранее.",
            }),
          );
          return;
        }

        // === УДАЛЯЕМ СПРАВКУ С ПЕЧАТЬЮ ИЗ ИНВЕНТАРЯ ===
        const certIndex = player.inventory.findIndex(
          (item) => item && item.type === "medical_certificate_stamped",
        );
        if (certIndex !== -1) {
          player.inventory[certIndex] = null;
        }

        // === ОПЫТ +66 ===
        player.xp = (player.xp || 0) + 66;

        let xpToNext = calculateXPToNextLevel(player.level);
        while (player.xp >= xpToNext && player.level < 100) {
          player.level += 1;
          player.xp -= xpToNext;
          player.upgradePoints = (player.upgradePoints || 0) + 10;
          xpToNext = calculateXPToNextLevel(player.level);
        }

        // === +10 БАЛЯРОВ ===
        let balyaryAdded = false;
        for (let i = 0; i < player.inventory.length; i++) {
          if (player.inventory[i]?.type === "balyary") {
            player.inventory[i].quantity =
              (player.inventory[i].quantity || 1) + 10;
            balyaryAdded = true;
            break;
          }
          if (!player.inventory[i]) {
            player.inventory[i] = { type: "balyary", quantity: 10 };
            balyaryAdded = true;
            break;
          }
        }

        // === НАБОР НОВИЧКА КОРПОРАЦИИ ===
        const starterArmor = [
          "torn_health_t_shirt",
          "torn_energy_t_shirt",
          "torn_t_shirt_of_thirst",
          "torn_t_shirt_of_gluttony",
        ];
        const starterPants = [
          "torn_pants_of_health",
          "torn_pants_of_energy",
          "torn_pants_of_thirst",
          "torn_pants_of_gluttony",
        ];
        const starterBoots = [
          "torn_health_sneakers",
          "torn_sneakers_of_energy",
          "torn_sneakers_of_thirst",
          "torn_sneakers_of_gluttony",
        ];

        const itemsToGive = [
          starterArmor[Math.floor(Math.random() * starterArmor.length)],
          starterPants[Math.floor(Math.random() * starterPants.length)],
          starterBoots[Math.floor(Math.random() * starterBoots.length)],
          "knuckles", // кастет — всегда
        ];

        const freeSlots = player.inventory.filter(
          (slot) => slot === null,
        ).length;

        if (freeSlots >= itemsToGive.length) {
          itemsToGive.forEach((type) => {
            for (let i = 0; i < player.inventory.length; i++) {
              if (!player.inventory[i]) {
                player.inventory[i] = { type, quantity: 1 };
                break;
              }
            }
          });
        } else {
          const radius = 30;

          itemsToGive.forEach((type, index) => {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * radius;

            const x = player.x + Math.cos(angle) * r;
            const y = player.y + Math.sin(angle) * r;

            const itemId = `quest_${type}_${playerId}_${Date.now()}_${index}`;

            const questItem = {
              x,
              y,
              type,
              spawnTime: Date.now(),
              worldId: player.worldId,
              questOwnerId: playerId,
              isQuestItem: true,
            };

            items.set(itemId, questItem);

            // 👁 Отправляем ТОЛЬКО этому игроку
            ws.send(
              JSON.stringify({
                type: "newItem",
                items: [
                  {
                    itemId,
                    x,
                    y,
                    type,
                    worldId: player.worldId,
                    isQuestItem: true,
                  },
                ],
              }),
            );
          });
        }

        // === ФЛАГ СДАЧИ ДОКУМЕНТОВ ===
        player.corporateDocumentsSubmitted = true;

        // === СОХРАНЯЕМ ===
        players.set(playerId, player);
        userDatabase.set(playerId, player);
        await saveUserDatabase(dbCollection, playerId, player);

        // === ОТПРАВЛЯЕМ КЛИЕНТУ ВСЁ ОБНОВЛЁННОЕ ===
        ws.send(
          JSON.stringify({
            type: "corporateDocumentsResult",
            success: true,
            xpGained: 66,
            balyaryGained: 10,
            level: player.level,
            xp: player.xp,
            xpToNextLevel: xpToNext,
            upgradePoints: player.upgradePoints,
            inventory: player.inventory,
            corporateDocumentsSubmitted: true,
          }),
        );
      } else if (data.type === "thimbleriggerBet") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const player = players.get(playerId);
        const bet = data.bet;

        // Находим слот с балярами
        let balyarySlot = player.inventory.findIndex(
          (item) => item && item.type === "balyary",
        );
        if (
          balyarySlot === -1 ||
          (player.inventory[balyarySlot].quantity || 0) < bet
        ) {
          ws.send(
            JSON.stringify({
              type: "thimbleriggerBetResult",
              success: false,
              error: "Недостаточно баляров!",
            }),
          );
          return;
        }

        // Вычитаем ставку
        player.inventory[balyarySlot].quantity -= bet;
        if (player.inventory[balyarySlot].quantity <= 0) {
          player.inventory[balyarySlot] = null;
        }

        // Сохраняем
        players.set(playerId, player);
        userDatabase.set(playerId, player);
        await saveUserDatabase(dbCollection, playerId, player);

        // Отправляем ок с обновлённым инвентарём
        ws.send(
          JSON.stringify({
            type: "thimbleriggerBetResult",
            success: true,
            bet,
            inventory: player.inventory,
          }),
        );
      } else if (data.type === "thimbleriggerGameResult") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const player = players.get(playerId);
        const { won, bet, selectedCup, correctCup } = data;

        let xpToNext = calculateXPToNextLevel(player.level); // ← ДОБАВЛЕНО: выносим расчёт xpToNext наружу, чтобы он был всегда (даже при проигрыше)

        // Валидация: просто проверим won === (selectedCup === correctCup), чтобы избежать читов
        const validatedWon = selectedCup === correctCup;
        if (won !== validatedWon) {
          ws.send(
            JSON.stringify({
              type: "thimbleriggerGameResultSync",
              success: false,
              error: "Неверный результат! Игра отменена.",
            }),
          );
          return;
        }

        let xpGained = 0;
        if (won) {
          // Добавляем выигрыш bet*2 баляров
          let balyarySlot = player.inventory.findIndex(
            (item) => item && item.type === "balyary",
          );
          const winAmount = bet * 2;
          if (balyarySlot !== -1) {
            player.inventory[balyarySlot].quantity =
              (player.inventory[balyarySlot].quantity || 0) + winAmount;
          } else {
            balyarySlot = player.inventory.findIndex((item) => !item);
            if (balyarySlot !== -1) {
              player.inventory[balyarySlot] = {
                type: "balyary",
                quantity: winAmount,
              };
            }
          }

          // Добавляем XP = bet
          player.xp = (player.xp || 0) + bet;
          xpGained = bet;

          // Проверяем level up
          while (player.xp >= xpToNext && player.level < 100) {
            player.level += 1;
            player.xp -= xpToNext;
            player.upgradePoints = (player.upgradePoints || 0) + 10;
            xpToNext = calculateXPToNextLevel(player.level);
          }
        }

        // Сохраняем всё
        players.set(playerId, player);
        userDatabase.set(playerId, player);
        await saveUserDatabase(dbCollection, playerId, player);

        // Отправляем синхронизацию
        ws.send(
          JSON.stringify({
            type: "thimbleriggerGameResultSync",
            success: true,
            won,
            inventory: player.inventory,
            xp: player.xp,
            level: player.level,
            upgradePoints: player.upgradePoints,
            xpToNext: xpToNext,
            xpGained,
          }),
        );
      } else if (data.type === "buyFromJack") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) {
          ws.send(
            JSON.stringify({
              type: "buyFromJackFail",
              error: "Игрок не найден",
            }),
          );
          return;
        }

        const player = players.get(playerId);
        const type = data.itemType;
        const cfg = ITEM_CONFIG[type];
        if (!cfg) {
          ws.send(
            JSON.stringify({
              type: "buyFromJackFail",
              error: "Неверный тип предмета",
            }),
          );
          return;
        }

        // Проверка: это еда rarity 1-3, не оружие, не чёрный список
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
          return;
        }

        const price = cfg.rarity; // Цена = rarity
        if (data.price !== price) {
          ws.send(
            JSON.stringify({ type: "buyFromJackFail", error: "Неверная цена" }),
          );
          return;
        }

        // Находим баляры
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
          return;
        }

        // Вычитаем баляры
        if (balyaryQty === price) {
          player.inventory[balyarySlot] = null;
        } else {
          player.inventory[balyarySlot].quantity -= price;
        }

        // Находим свободный слот
        const freeSlot = player.inventory.findIndex((s) => s === null);
        if (freeSlot === -1) {
          ws.send(
            JSON.stringify({
              type: "buyFromJackFail",
              error: "Инвентарь полон",
            }),
          );
          return;
        }

        // Добавляем предмет
        player.inventory[freeSlot] = {
          type,
          quantity: 1,
          itemId: `${type}_${Date.now()}`,
        };

        // Сохраняем
        players.set(playerId, { ...player });
        userDatabase.set(playerId, { ...player });
        await saveUserDatabase(dbCollection, playerId, player);

        // Отправляем success с новым inventory
        ws.send(
          JSON.stringify({
            type: "buyFromJackSuccess",
            inventory: player.inventory,
          }),
        );
      } else if (data.type === "sellToJack") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) {
          ws.send(
            JSON.stringify({
              type: "sellToJackFail",
              error: "Игрок не найден",
            }),
          );
          return;
        }

        const player = players.get(playerId);
        const slotIndex = data.slotIndex;
        if (slotIndex < 0 || slotIndex >= player.inventory.length) {
          ws.send(
            JSON.stringify({ type: "sellToJackFail", error: "Неверный слот" }),
          );
          return;
        }

        const item = player.inventory[slotIndex];
        if (!item) {
          ws.send(
            JSON.stringify({ type: "sellToJackFail", error: "Слот пустой" }),
          );
          return;
        }

        // Проверка: это еда (та же как в покупке)
        const cfg = ITEM_CONFIG[item.type];
        if (!cfg) {
          ws.send(
            JSON.stringify({
              type: "sellToJackFail",
              error: "Неверный тип предмета",
            }),
          );
          return;
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
          return;
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
          if (freeSlot !== -1) {
            player.inventory[freeSlot] = {
              type: "balyary",
              quantity: 1,
              itemId: `balyary_${Date.now()}`,
            };
          } else {
            // Редко: но если нет места — не добавляем (хотя проверено ранее? Нет, добавить проверку
            ws.send(
              JSON.stringify({
                type: "sellToJackFail",
                error: "Нет места для баляра",
              }),
            );
            return;
          }
        }

        // Сохраняем
        players.set(playerId, { ...player });
        userDatabase.set(playerId, { ...player });
        await saveUserDatabase(dbCollection, playerId, player);

        // Отправляем success с новым inventory
        ws.send(
          JSON.stringify({
            type: "sellToJackSuccess",
            inventory: player.inventory,
          }),
        );
      } else if (data.type === "twister") {
        const playerId = clients.get(ws);
        if (!playerId) {
          console.warn("Twister сообщение без playerId");
          return;
        }

        handleTwisterMessage(
          ws,
          data,
          players,
          clients,
          wss,
          playerId,
          saveUserDatabase,
          dbCollection,
          broadcastToWorld,
        );
        return;
      } else if (data.type === "trashGuess") {
        handleTrashGuess(
          ws,
          data,
          players,
          clients,
          wss,
          userDatabase,
          dbCollection,
          broadcastToWorld,
        );
      } else if (data.type === "getTrashState") {
        const idx = data.trashIndex;
        if (idx >= 0 && idx < trashCansState.length) {
          const st = trashCansState[idx];
          ws.send(
            JSON.stringify({
              type: "trashState",
              index: idx,
              guessed: st.guessed,
              isOpened: st.isOpened,
              secretSuit: st.guessed ? st.secretSuit : null,
              nextAttemptAfter: st.nextAttemptAfter,
            }),
          );
        }
      } else if (data.type === "getAllTrashStates") {
        ws.send(
          JSON.stringify({
            type: "trashAllStates",
            states: trashCansState.map((st, idx) => ({
              index: idx,
              guessed: st.guessed,
              isOpened: st.isOpened,
              nextAttemptAfter: st.nextAttemptAfter,
            })),
          }),
        );
      } else if (data.type === "meetTorestos") {
        const player = players.get(clients.get(ws));
        if (!player) return;

        if (!player.torestosMet) {
          player.torestosMet = true;
          userDatabase.set(player.id, { ...player });
          await saveUserDatabase(dbCollection, player.id, player);

          // Отправляем клиенту обновление флага
          ws.send(
            JSON.stringify({
              type: "torestosMet",
              met: true,
            }),
          );

          // Можно сразу уведомить всех в мире (опционально)
          broadcastToWorld(
            wss,
            clients,
            players,
            player.worldId,
            JSON.stringify({
              type: "update",
              player: { id: player.id, torestosMet: true },
            }),
          );
        }
      } else if (data.type === "torestosUpgrade") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const player = players.get(playerId);

        // Координаты Торестоса — те же, что и на клиенте
        const TORESTOS_X = 800;
        const TORESTOS_Y = 1200;
        const INTERACTION_RADIUS = 70; // чуть больше, чем на клиенте (50), чтобы был запас

        const dx = player.x - TORESTOS_X;
        const dy = player.y - TORESTOS_Y;
        const distance = Math.hypot(dx, dy);

        if (distance > INTERACTION_RADIUS) {
          ws.send(
            JSON.stringify({
              type: "torestosUpgradeResult",
              success: false,
              error: "Подойди ближе к Торестосу",
            }),
          );
          return;
        }

        handleTorestosUpgrade(
          ws,
          data,
          player,
          players,
          userDatabase,
          dbCollection,
          saveUserDatabase,
        );
      } else if (data.type === "meetToremidos") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.toremidosMet = true;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          ws.send(JSON.stringify({ type: "toremidosMet", met: true }));
        }
      } else if (data.type === "homelessOpenStorage") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        handleHomelessRentRequest(
          wss,
          clients,
          players,
          userDatabase,
          dbCollection,
          playerId,
        );
      } else if (data.type === "homelessRentConfirm") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const days = Number(data.days);
        if (isNaN(days) || days < 1) {
          ws.send(
            JSON.stringify({
              type: "homelessError",
              message: "Количество дней должно быть целым числом ≥ 1",
            }),
          );
          return;
        }

        handleHomelessRentConfirm(
          wss,
          clients,
          players,
          userDatabase,
          dbCollection,
          playerId,
          days,
        );
      } else if (data.type === "homelessPutItem") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const { playerSlot, quantity } = data; // storageSlot больше НЕ нужен

        if (typeof playerSlot !== "number" || playerSlot < 0) {
          ws.send(
            JSON.stringify({
              type: "homelessError",
              message: "Некорректный слот инвентаря",
            }),
          );
          return;
        }

        handleHomelessStorageAction(
          wss,
          clients,
          players,
          dbCollection,
          playerId,
          "put",
          playerSlot,
          null, // ← storageSlot больше НЕ передаём (null)
          quantity,
        );
      } else if (data.type === "homelessTakeItem") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const { storageSlot, quantity } = data;

        if (typeof storageSlot !== "number" || storageSlot < 0) {
          ws.send(
            JSON.stringify({
              type: "homelessError",
              message: "Некорректный номер слота хранилища",
            }),
          );
          return;
        }

        handleHomelessStorageAction(
          wss,
          clients,
          players,
          dbCollection,
          playerId,
          "take",
          null,
          storageSlot,
          quantity, // ← передаём quantity четвёртым параметром действия
        );
      } else if (data.type === "upgradeSkill") {
        const playerId = clients.get(ws);
        if (!playerId || !players.has(playerId)) return;

        const player = players.get(playerId);

        handleSkillUpgrade(
          ws,
          data,
          player,
          players,
          userDatabase,
          dbCollection,
          saveUserDatabase,
        );
      } else if (data.type === "requestRegeneration") {
        const playerId = clients.get(ws);
        const player = players.get(playerId);
        if (!player) return;

        const requestedHeal = Number(data.amount);
        if (
          !Number.isInteger(requestedHeal) ||
          requestedHeal <= 0 ||
          requestedHeal > 50
        ) {
          ws.send(
            JSON.stringify({
              type: "regenerationRejected",
              playerId, // ← теперь работает
              reason: "invalid_amount",
            }),
          );
          return;
        }

        // Проверяем наличие и уровень навыка
        const regSkill = player.skills?.find((s) => s.id === 2);
        if (!regSkill || regSkill.level < 1) {
          ws.send(
            JSON.stringify({
              type: "regenerationRejected",
              playerId,
              reason: "no_skill",
            }),
          );
          return;
        }

        // Проверяем допустимый процент лечения
        const allowedPercent = regSkill.level * 1;
        const maxAllowedHeal = Math.floor((100 * allowedPercent) / 100);

        if (requestedHeal > maxAllowedHeal + 2) {
          // +2 — небольшой запас на rounding
          console.warn(
            `[AntiCheat] Игрок ${playerId} запросил слишком много регенерации: ${requestedHeal} > ${maxAllowedHeal}`,
          );
          ws.send(
            JSON.stringify({
              type: "regenerationRejected",
              playerId,
              reason: "cheat_suspected",
            }),
          );
          return;
        }

        // Проверяем, что здоровье не превысит максимум
        const newHealth = Math.min(
          player.health + requestedHeal,
          player.maxStats?.health || 100,
        );

        if (newHealth <= player.health) {
          // Уже полное здоровье
          return;
        }

        // Применяем
        player.health = newHealth;

        // Сохраняем в базу (если ваша система это делает)
        userDatabase.set(playerId, { ...player });
        saveUserDatabase?.(dbCollection, playerId, player);

        // Рассылаем обновление всем
        const updatePayload = {
          id: playerId,
          health: player.health,
          // можно добавить и другие поля, если нужно
        };

        broadcastToWorld(
          wss,
          clients,
          players,
          player.worldId,
          JSON.stringify({
            type: "update",
            player: updatePayload,
          }),
        );

        // Подтверждаем игроку
        ws.send(
          JSON.stringify({
            type: "regenerationApplied",
            playerId,
            newHealth: player.health,
          }),
        );
      }
      async function processRegisterQueue(ws) {
        if (ws.isProcessingRegister) return;
        ws.isProcessingRegister = true;

        while (ws.registerQueue.length > 0) {
          const data = ws.registerQueue.shift();

          // ── старая логика регистрации — без изменений ─────────────────────
          if (userDatabase.has(data.username)) {
            ws.send(JSON.stringify({ type: "registerFail" }));
          } else {
            const newPlayer = {
              id: data.username,
              password: data.password,
              x: 474,
              y: 2474,
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
                offhand: null,
                gloves: null,
              },
              npcMet: false,
              jackMet: false,
              alexNeonMet: false,
              captainMet: false,
              thimbleriggerMet: false,
              torestosMet: false,
              toremidosMet: false,
              level: 0,
              xp: 0,
              upgradePoints: 0,
              availableQuests: [],
              worldId: 0,
              hasSeenWelcomeGuide: false,
              worldPositions: { 0: { x: 222, y: 3205 } },

              healthUpgrade: 0,
              energyUpgrade: 0,
              foodUpgrade: 0,
              waterUpgrade: 0,
              maxStats: {
                health: 100,
                energy: 100,
                food: 100,
                water: 100,
                armor: 0,
              },
              skills: Array.from({ length: 10 }, (_, i) => ({
                id: i + 1,
                level: 0,
              })),
              skillPoints: 0,
              neonQuest: {
                currentQuestId: null,
                progress: {},
                completed: [],
              },
              medicalCertificate: false,
              medicalCertificateStamped: false,
              corporateDocumentsSubmitted: false,

              chatBubble: null,
            };

            userDatabase.set(data.username, newPlayer);
            await saveUserDatabase(dbCollection, data.username, newPlayer);
            ws.send(JSON.stringify({ type: "registerSuccess" }));
          }
        }

        ws.isProcessingRegister = false;
      }
      async function processWorldTransitionQueue(ws) {
        if (ws.isProcessingTransition) return;
        ws.isProcessingTransition = true;

        while (ws.transitionQueue.length > 0) {
          const data = ws.transitionQueue.shift();

          const id = clients.get(ws);
          if (!id) continue; // игрок уже отключился — пропускаем

          const player = players.get(id);
          if (!player) continue;

          const oldWorldId = player.worldId;
          const targetWorldId = data.targetWorldId;

          // Проверяем существование мира
          if (!worlds.find((w) => w.id === targetWorldId)) {
            ws.send(
              JSON.stringify({
                type: "worldTransitionFail",
                reason: "invalid_world",
              }),
            );
            continue;
          }

          // ── Основная логика перехода (та же, что была раньше) ─────────────
          player.worldId = targetWorldId;
          player.x = data.x;
          player.y = data.y;
          player.worldPositions[targetWorldId] = { x: data.x, y: data.y };

          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Уведомляем всех в старом мире, что игрок ушёл
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === oldWorldId) {
                client.send(JSON.stringify({ type: "playerLeft", id }));
              }
            }
          });

          // Собираем данные нового мира
          const worldPlayers = Array.from(players.values()).filter(
            (p) => p.id !== id && p.worldId === targetWorldId,
          );

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

          // Отправляем успех текущему игроку + все данные нового мира
          ws.send(
            JSON.stringify({
              type: "worldTransitionSuccess",
              worldId: targetWorldId,
              x: player.x,
              y: player.y,
              lights:
                lights.get(targetWorldId)?.map(({ id, ...rest }) => rest) || [],
              players: worldPlayers,
              items: worldItems,
              enemies: worldEnemies,
            }),
          );

          // Уведомляем всех в новом мире о новом игроке
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === targetWorldId) {
                client.send(JSON.stringify({ type: "newPlayer", player }));
              }
            }
          });
        }

        ws.isProcessingTransition = false;
      }
      async function processSyncQueue(ws) {
        if (ws.isProcessingSync) return;
        ws.isProcessingSync = true;

        while (ws.syncQueue.length > 0) {
          const data = ws.syncQueue.shift();

          const id = clients.get(ws);
          if (!id) continue;

          const player = players.get(id);
          if (!player) continue;

          const worldId = data.worldId;

          // Проверяем, что запрос актуален (игрок всё ещё в этом мире)
          if (player.worldId !== worldId) {
            // Можно отправить ошибку, но чаще всего просто игнорируем
            continue;
          }

          // Собираем список других игроков в мире
          const worldPlayers = Array.from(players.values()).filter(
            (p) => p.id !== id && p.worldId === worldId,
          );

          // Отправляем только один раз — самый свежий
          ws.send(
            JSON.stringify({
              type: "syncPlayers",
              players: worldPlayers,
              worldId,
            }),
          );
        }

        ws.isProcessingSync = false;
      }
      async function processLoginQueue(ws) {
        if (ws.isProcessingLogin) return;
        ws.isProcessingLogin = true;

        while (ws.loginQueue.length > 0) {
          const data = ws.loginQueue.shift();

          const player = userDatabase.get(data.username);
          if (!player || player.password !== data.password) {
            ws.send(JSON.stringify({ type: "loginFail" }));
            continue;
          }

          // ── Основная логика логина (та же, что была раньше) ────────────────
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
            thimbleriggerMet: player.thimbleriggerMet || false,
            torestosMet: player.torestosMet || false,
            toremidosMet: player.toremidosMet || false,
            selectedQuestId: player.selectedQuestId || null,
            level: player.level || 0,
            xp: player.xp || 0,
            skills: player.skills || [],
            meleeDamageBonus: player.meleeDamageBonus || 0,
            skillPoints: player.skillPoints || 0,
            upgradePoints: player.upgradePoints || 0,
            availableQuests: player.availableQuests || [],
            worldId: player.worldId || 0,
            hasSeenWelcomeGuide: player.hasSeenWelcomeGuide || false,
            worldPositions: player.worldPositions || {
              0: { x: player.x, y: player.y },
            },

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
            medicalCertificateStamped:
              player.medicalCertificateStamped || false,
            corporateDocumentsSubmitted:
              player.corporateDocumentsSubmitted || false,

            chatBubble: player.chatBubble || null,
          };

          playerData.maxStats = playerData.maxStats || {
            health: 100 + (playerData.healthUpgrade || 0),
            energy: 100 + (playerData.energyUpgrade || 0),
            food: 100 + (playerData.foodUpgrade || 0),
            water: 100 + (playerData.waterUpgrade || 0),
            armor: 0,
          };

          // Ограничиваем текущие значения
          playerData.health = Math.max(
            0,
            Math.min(playerData.health ?? 0, playerData.maxStats.health || 100),
          );
          playerData.energy = Math.max(
            0,
            Math.min(playerData.energy || 100, playerData.maxStats.energy),
          );
          playerData.food = Math.max(
            0,
            Math.min(playerData.food || 100, playerData.maxStats.food),
          );
          playerData.water = Math.max(
            0,
            Math.min(playerData.water || 100, playerData.maxStats.water),
          );
          playerData.armor = Math.max(
            0,
            Math.min(playerData.armor || 0, playerData.maxStats.armor),
          );

          calculateMaxStats(playerData, ITEM_CONFIG);
          playerData.health = Math.max(
            0,
            Math.min(playerData.health, playerData.maxStats.health),
          );

          players.set(data.username, playerData);

          // Отправляем успех + все данные
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
              thimbleriggerMet: playerData.thimbleriggerMet,
              torestosMet: playerData.torestosMet || false,
              toremidosMet: playerData.toremidosMet,
              selectedQuestId: playerData.selectedQuestId,
              level: playerData.level,
              xp: playerData.xp,
              skills: playerData.skills,
              skillPoints: playerData.skillPoints,
              upgradePoints: playerData.upgradePoints,
              availableQuests: playerData.availableQuests,
              worldId: playerData.worldId,
              hasSeenWelcomeGuide: playerData.hasSeenWelcomeGuide || false,
              worldPositions: playerData.worldPositions,
              healthUpgrade: playerData.healthUpgrade,
              energyUpgrade: playerData.energyUpgrade,
              foodUpgrade: playerData.foodUpgrade,
              waterUpgrade: playerData.waterUpgrade,
              neonQuest: playerData.neonQuest,
              medicalCertificate: playerData.medicalCertificate || false,
              medicalCertificateStamped:
                playerData.medicalCertificateStamped || false,
              corporateDocumentsSubmitted:
                playerData.corporateDocumentsSubmitted || false,
              trashCooldowns: playerData.trashCooldowns || {},
              players: Array.from(players.values()).filter(
                (p) =>
                  p.id !== data.username && p.worldId === playerData.worldId,
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
              enemies: Array.from(enemies.entries())
                .filter(([_, enemy]) => enemy.worldId === playerData.worldId)
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
              lights:
                lights
                  .get(playerData.worldId)
                  ?.map(({ id, ...rest }) => rest) || [],
            }),
          );

          // Отправляем состояние мусорок
          ws.send(
            JSON.stringify({
              type: "trashAllStates",
              states: trashCansState.map((st, idx) => ({
                index: idx,
                guessed: st.guessed,
                isOpened: st.isOpened || false,
                nextAttemptAfter: st.nextAttemptAfter || 0,
              })),
            }),
          );

          // Уведомляем других игроков в мире
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === playerData.worldId) {
                client.send(
                  JSON.stringify({
                    type: "newPlayer",
                    player: players.get(data.username),
                  }),
                );
              }
            }
          });
        }

        ws.isProcessingLogin = false;
      }
      async function processUpdateQueue(ws) {
        if (ws.isProcessingUpdate) return;
        ws.isProcessingUpdate = true;

        while (ws.updateQueue.length > 0) {
          const data = ws.updateQueue.shift();

          const playerId = clients.get(ws);

          // Защита: игрок не авторизован или уже отключился
          if (!playerId || !players.has(playerId)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated or session expired",
              }),
            );
            continue;
          }

          const player = players.get(playerId);
          const currentWorldId = player.worldId;

          // Сохраняем старую позицию для проверки коллизий
          const oldX = player.x;
          const oldY = player.y;

          // Принимаем только разрешённые поля (как было раньше)
          if (data.x !== undefined) player.x = Number(data.x);
          if (data.y !== undefined) player.y = Number(data.y);
          if (data.direction) player.direction = data.direction;
          if (data.state) player.state = data.state;
          if (data.attackFrame !== undefined)
            player.attackFrame = Number(data.attackFrame);
          if (data.attackFrameTime !== undefined)
            player.attackFrameTime = Number(data.attackFrameTime);
          if (data.frame !== undefined) player.frame = Number(data.frame);

          // Ограничиваем статы безопасными значениями
          if (data.health !== undefined)
            player.health = Math.max(
              0,
              Math.min(player.maxStats?.health || 100, Number(data.health)),
            );
          if (data.energy !== undefined)
            player.energy = Math.max(
              0,
              Math.min(player.maxStats?.energy || 100, Number(data.energy)),
            );
          if (data.food !== undefined)
            player.food = Math.max(
              0,
              Math.min(player.maxStats?.food || 100, Number(data.food)),
            );
          if (data.water !== undefined)
            player.water = Math.max(
              0,
              Math.min(player.maxStats?.water || 100, Number(data.water)),
            );
          if (data.armor !== undefined) player.armor = Number(data.armor);
          if (data.distanceTraveled !== undefined)
            player.distanceTraveled = Number(data.distanceTraveled);

          // ─── ПРОВЕРКА ПРЕПЯТСТВИЙ (как было) ────────────────────────────────
          let positionValid = true;

          if (data.x !== undefined || data.y !== undefined) {
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
          }

          // Сохраняем изменения в Map
          players.set(playerId, { ...player });

          // Готовим данные для broadcast (как было)
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

          // Рассылаем обновление всем в мире
          broadcastToWorld(
            wss,
            clients,
            players,
            currentWorldId,
            JSON.stringify({
              type: "update",
              player: updateData,
            }),
          );
        }

        ws.isProcessingUpdate = false;
      }
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
