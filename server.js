const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const { MongoClient } = require("mongodb");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, pingInterval: 30000 }); // Добавляем pingInterval
const clients = new Map();
const players = new Map();
const userDatabase = new Map();

// В начало файла, после определения констант
const INACTIVITY_TIMEOUT = 45 * 60 * 1000; // 45 минут

// Обновляем middleware для статических файлов
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "1d", // Кэширование на 1 день
    setHeaders: (res, path) => {
      if (path.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      }
    },
  })
);

// Добавляем маршрут для проверки статуса сервера
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const ITEM_CONFIG = {
  blood_pack: { effect: { health: 40 }, rarity: 1 },
  canned_meat: { effect: { food: 20 }, rarity: 1 },
  mushroom: { effect: { food: 5, energy: 15 }, rarity: 1 },
  dried_fish: { effect: { food: 10, water: -3 }, rarity: 2 },
  condensed_milk: { effect: { water: 5, food: 11, energy: 2 }, rarity: 2 },
  milk: { effect: { water: 15, food: 5 }, rarity: 2 },
  blood_syringe: { effect: { health: 10 }, rarity: 2 },
  meat_chunk: { effect: { food: 20, energy: 5, water: -2 }, rarity: 2 },
  vodka_bottle: {
    effect: { health: 5, energy: -2, water: 1, food: 2 },
    rarity: 2,
  },
  bread: { effect: { food: 13, water: -2 }, rarity: 2 },
  sausage: { effect: { food: 16, energy: 3 }, rarity: 2 },
  energy_drink: { effect: { energy: 20, water: 5 }, rarity: 2 },
  balyary: {
    effect: {},
    rarity: 2,
    stackable: true,
  },
  water_bottle: { effect: { water: 30 }, rarity: 3 },
  nut: { effect: { food: 7 }, rarity: 3 },
  apple: { effect: { food: 8, water: 5 }, rarity: 3 },
  berries: { effect: { food: 6, water: 6 }, rarity: 3 },
  carrot: { effect: { food: 5, energy: 3 }, rarity: 3 },
  cyber_helmet: {
    type: "headgear",
    effect: { armor: 10, energy: 5 },
    rarity: 4,
  },
  nano_armor: { type: "armor", effect: { armor: 20, health: 10 }, rarity: 4 },
  tactical_belt: { type: "belt", effect: { armor: 5, food: 5 }, rarity: 4 },
  cyber_pants: { type: "pants", effect: { armor: 10, water: 5 }, rarity: 4 },
  speed_boots: { type: "boots", effect: { armor: 5, energy: 10 }, rarity: 4 },
  plasma_rifle: { type: "weapon", effect: { damage: 15 }, rarity: 4 },
  tech_gloves: { type: "gloves", effect: { armor: 5, energy: 5 }, rarity: 4 },
};

const uri = process.env.MONGO_URI;
console.log(
  "Значение MONGO_URI из окружения:",
  uri ? uri.replace(/:([^:@]+)@/, ":<password>@") : "не определено"
);

if (!uri || typeof uri !== "string" || !uri.trim()) {
  console.error(
    "Ошибка: Переменная окружения MONGO_URI не определена или пуста!"
  );
  process.exit(1);
}

if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
  console.error(
    "Ошибка: Некорректная схема в MONGO_URI. Ожидается 'mongodb://' или 'mongodb+srv://'"
  );
  process.exit(1);
}

console.log(
  "Используемая строка подключения MongoDB:",
  uri.replace(/:([^:@]+)@/, ":<password>@")
);
const mongoClient = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await mongoClient.connect();
    console.log("Подключено к MongoDB");
    return mongoClient.db("cyberpunk_survival").collection("users");
  } catch (error) {
    console.error("Ошибка подключения к MongoDB:", error);
    process.exit(1);
  }
}

async function loadUserDatabase(collection) {
  try {
    const users = await collection.find({}).toArray();
    users.forEach((user) => {
      // Гарантируем наличие maxStats при загрузке
      const userData = {
        ...user,
        maxStats: user.maxStats || {
          health: 100,
          energy: 100,
          food: 100,
          water: 100,
        },
      };
      userDatabase.set(user.id, userData);
      console.log(
        `Загружен игрок ${user.id}, maxStats: ${JSON.stringify(
          userData.maxStats
        )}`
      );
    });
    console.log("База данных пользователей загружена из MongoDB");
  } catch (error) {
    console.error("Ошибка при загрузке базы данных из MongoDB:", error);
  }
}

async function saveUserDatabase(collection, username, player) {
  try {
    const playerData = {
      ...player,
      maxStats: player.maxStats || {
        health: 100,
        energy: 100,
        food: 100,
        water: 100,
      }, // Гарантируем наличие maxStats
    };
    await collection.updateOne(
      { id: username },
      { $set: playerData },
      { upsert: true }
    );
    console.log(
      `Данные игрока ${username} сохранены, maxStats: ${JSON.stringify(
        playerData.maxStats
      )}`
    );
  } catch (error) {
    console.error("Ошибка при сохранении данных в MongoDB:", error);
  }
}

async function initializeServer() {
  const collection = await connectToDatabase();
  await loadUserDatabase(collection);
  console.log("Сервер готов к работе после загрузки базы данных");
  return collection;
}

let dbCollection;
initializeServer()
  .then((collection) => {
    dbCollection = collection;
    server.listen(PORT, () => {
      console.log(`WebSocket server running on ws://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Ошибка при инициализации сервера:", error);
    process.exit(1);
  });

const worlds = [
  { id: 0, width: 3135, height: 3300, name: "Неоновый Город" },
  { id: 1, width: 3135, height: 3300, name: "Пустоши" },
  { id: 2, width: 3135, height: 3300, name: "Токсичные Джунгли" },
];

const items = new Map(); // Храним предметы с указанием worldId
const wolves = new Map(); // Хранит волков: id -> {x, y, health, direction, state, worldId, lastAttackTime}
const lights = new Map(); // Храним источники света по мирам

// Инициализация источников света для каждого мира
worlds.forEach((world) => {
  if (world.id === 0) {
    // Исправлено с id === 1 на id === 0
    lights.set(world.id, [
      {
        id: "light1",
        x: 2445,
        y: 1540,
        color: "rgba(0, 255, 255, 0.4)",
        radius: 1000,
      },
      {
        id: "light2",
        x: 1314,
        y: 332,
        color: "rgba(255, 0, 255, 0.4)",
        radius: 1000,
      },
      {
        id: "light3",
        x: 506,
        y: 2246,
        color: "rgba(148, 0, 211, 0.4)",
        radius: 1000,
      },
      {
        id: "light4",
        x: 950,
        y: 3115,
        color: "rgba(255, 0, 255, 0.4)",
        radius: 850,
      },
      {
        id: "light5",
        x: 50,
        y: 3120,
        color: "rgba(214, 211, 4, 0.5)",
        radius: 850,
      },
      {
        id: "light6",
        x: 264,
        y: 1173,
        color: "rgba(214, 211, 4, 0.4)",
        radius: 950,
      },
      {
        id: "light7",
        x: 2314,
        y: 2756,
        color: "rgba(194, 0, 10, 0.4)",
        radius: 850,
      },
      {
        id: "light8",
        x: 1605,
        y: 2151,
        color: "rgba(2, 35, 250, 0.4)",
        radius: 950,
      },
      {
        id: "light9",
        x: 3095,
        y: 2335,
        color: "rgba(28, 186, 55, 0.4)",
        radius: 950,
      },
      {
        id: "light10",
        x: 2605,
        y: 509,
        color: "rgba(2, 35, 250, 0.4)",
        radius: 950,
      },
      {
        id: "light11",
        x: 1083,
        y: 1426,
        color: "rgba(109, 240, 194, 0.4)",
        radius: 750,
      },
      {
        id: "light12",
        x: 2000,
        y: 900,
        color: "rgba(240, 109, 240, 0.4)",
        radius: 850,
      },
      {
        id: "light13",
        x: 133,
        y: 373,
        color: "rgba(240, 109, 240, 0.4)",
        radius: 850,
      },
    ]);
  } else {
    lights.set(world.id, []); // Пустой массив для других миров
  }
});

const lastSaved = new Map();

function checkCollisionServer(x, y) {
  return false;
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
          xp: 0,
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
    }

    if (data.type === "worldTransition") {
      const id = clients.get(ws);
      if (id) {
        const player = players.get(id);
        const oldWorldId = player.worldId;
        const targetWorldId = data.targetWorldId;

        if (!worlds.find((w) => w.id === targetWorldId)) {
          console.error(`Мир с ID ${targetWorldId} не существует`);
          return;
        }

        // Логируем переход для отладки
        console.log(
          `Игрок ${id} переходит из мира ${oldWorldId} в мир ${targetWorldId} на x:${data.x}, y:${data.y}`
        );

        // Обновляем данные игрока
        player.worldId = targetWorldId;
        player.x = data.x;
        player.y = data.y;
        player.worldPositions[targetWorldId] = { x: data.x, y: data.y };

        players.set(id, { ...player });
        userDatabase.set(id, { ...player });
        await saveUserDatabase(dbCollection, id, player);

        // Уведомляем игроков в старом мире об уходе
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const clientPlayer = players.get(clients.get(client));
            if (clientPlayer && clientPlayer.worldId === oldWorldId) {
              client.send(
                JSON.stringify({
                  type: "playerLeft",
                  id: id,
                })
              );
            }
          }
        });

        // Собираем список игроков в новом мире
        const worldPlayers = Array.from(players.values()).filter(
          (p) => p.id !== id && p.worldId === targetWorldId
        );

        // Уведомляем игроков в новом мире о появлении
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            const clientPlayer = players.get(clients.get(client));
            if (clientPlayer && clientPlayer.worldId === targetWorldId) {
              client.send(
                JSON.stringify({
                  type: "newPlayer",
                  player: player,
                })
              );
            }
          }
        });

        // Собираем предметы в новом мире
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

        // Отправляем клиенту подтверждение перехода
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
            worldId: worldId,
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
              (p) => p.id !== data.username && p.worldId === playerData.worldId
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

      // Проверяем наличие баляр
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

      // Списываем баляры
      if (balyaryCount === data.cost) {
        player.inventory[balyarySlot] = null;
      } else {
        player.inventory[balyarySlot].quantity -= data.cost;
      }

      // Начисляем воду
      player.water = Math.min(
        player.maxStats.water,
        player.water + data.waterGain
      );

      // Сохраняем изменения
      players.set(id, { ...player });
      userDatabase.set(id, { ...player });
      await saveUserDatabase(dbCollection, id, player);

      // Отправляем результат клиенту
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
          updatedPlayer.worldPositions[data.worldId] = { x: data.x, y: data.y };
        }
        players.set(id, updatedPlayer);
        userDatabase.set(id, updatedPlayer);
        if (!lastSaved.has(id) || Date.now() - lastSaved.get(id) > 5000) {
          await saveUserDatabase(dbCollection, id, updatedPlayer);
          lastSaved.set(id, Date.now());
        }
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
      }
    } else if (data.type === "updateLevel") {
      const id = clients.get(ws);
      if (id) {
        const player = players.get(id);
        player.level = data.level;
        player.xp = data.xp;
        // Защищаем maxStats от сброса
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
        player.availableQuests = data.availableQuests || player.availableQuests;
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
    } else if (data.type === "updateQuests") {
      const id = clients.get(ws);
      if (id) {
        const player = players.get(id);
        player.availableQuests = data.availableQuests || player.availableQuests;
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
        ws.send(JSON.stringify({ type: "itemNotFound", itemId: data.itemId }));
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
          const freeSlot = player.inventory.findIndex((slot) => slot === null);
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
          player.inventory[freeSlot] = { type: item.type, itemId: data.itemId };
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
            // Сохраняем старый предмет, если он есть
            if (player.equipment[slotName]) {
              const freeSlot = player.inventory.findIndex(
                (slot) => slot === null
              );
              if (freeSlot === -1) {
                ws.send(JSON.stringify({ type: "inventoryFull" }));
                return;
              }
              player.inventory[freeSlot] = player.equipment[slotName];
            }

            // Экипируем новый предмет
            player.equipment[slotName] = {
              type: item.type,
              itemId: item.itemId,
            };
            player.inventory[slotIndex] = null;

            // Сохраняем улучшенные maxStats
            const upgradedMaxStats = { ...player.maxStats };

            // Пересчитываем эффекты экипировки
            player.armor = 0;
            player.maxStats = {
              health: 100,
              energy: 100,
              food: 100,
              water: 100,
            };
            Object.values(player.equipment).forEach((equippedItem) => {
              if (equippedItem && ITEM_CONFIG[equippedItem.type]) {
                const effect = ITEM_CONFIG[equippedItem.type].effect;
                if (effect.armor) player.armor += effect.armor;
                if (effect.health) player.maxStats.health += effect.health;
                if (effect.energy) player.maxStats.energy += effect.energy;
                if (effect.food) player.maxStats.food += effect.food;
                if (effect.water) player.maxStats.water += effect.water;
                if (effect.damage)
                  player.damage = (player.damage || 0) + effect.damage;
              }
            });

            // Восстанавливаем улучшенные значения maxStats
            player.maxStats.health = Math.max(
              player.maxStats.health,
              upgradedMaxStats.health
            );
            player.maxStats.energy = Math.max(
              player.maxStats.energy,
              upgradedMaxStats.energy
            );
            player.maxStats.food = Math.max(
              player.maxStats.food,
              upgradedMaxStats.food
            );
            player.maxStats.water = Math.max(
              player.maxStats.water,
              upgradedMaxStats.water
            );

            // Ограничиваем характеристики
            player.health = Math.min(player.health, player.maxStats.health);
            player.energy = Math.min(player.energy, player.maxStats.energy);
            player.food = Math.min(player.food, player.maxStats.food);
            player.water = Math.min(player.water, player.maxStats.water);

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
              `Игрок ${id} экипировал ${
                item.type
              } в слот ${slotName}, maxStats: ${JSON.stringify(
                player.maxStats
              )}`
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
    } else if (data.type === "tradeCancelled") {
      const fromId = clients.get(ws);
      if (!fromId || !players.has(fromId) || !players.has(data.toId)) return;

      wss.clients.forEach((client) => {
        if (
          client.readyState === WebSocket.OPEN &&
          (clients.get(client) === data.toId || clients.get(client) === fromId)
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
    } else if (data.type === "tradeOffer") {
      const fromId = clients.get(ws);
      if (!fromId || !players.has(fromId) || !players.has(data.toId)) return;

      // Обновляем инвентарь отправителя
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
              inventory: data.inventory, // Пересылаем инвентарь
            })
          );
        }
      });
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
    } else if (data.type === "tradeCompleted") {
      const fromId = clients.get(ws);
      if (!fromId || !players.has(fromId) || !players.has(data.toId)) return;

      const fromPlayer = players.get(fromId);
      const toPlayer = players.get(data.toId);

      // Проверяем, что инвентарь валиден
      if (!fromPlayer.inventory || !toPlayer.inventory) return;

      // Проверяем, что предметы в предложении существуют в инвентаре
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
        return;
      }

      // Подсчитываем, сколько слотов нужно для обмена
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
        return;
      }

      // Удаляем предметы из инвентаря
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

      // Добавляем предметы в инвентарь
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

      // Сохраняем изменения
      players.set(fromId, { ...fromPlayer });
      players.set(data.toId, { ...toPlayer });
      userDatabase.set(fromId, { ...fromPlayer });
      userDatabase.set(data.toId, { ...toPlayer });
      await saveUserDatabase(dbCollection, fromId, fromPlayer);
      await saveUserDatabase(dbCollection, data.toId, toPlayer);

      // Отправляем обновления
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
    } else if (data.type === "selectQuest") {
      const id = clients.get(ws);
      if (id) {
        const player = players.get(id);
        player.selectedQuestId = data.questId; // Может быть null
        players.set(id, { ...player });
        userDatabase.set(id, { ...player });
        await saveUserDatabase(dbCollection, id, player);
        console.log(`Игрок ${id} выбрал задание ID: ${data.questId || "null"}`);
      }
    } else if (data.type === "attackWolf") {
      const id = clients.get(ws);
      if (id) {
        const player = players.get(id);
        if (player.worldId !== 1 || !wolves.has(data.wolfId)) return;

        const wolf = wolves.get(data.wolfId);
        const damage = data.damage || 10; // Например, стандартный урон 10
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
        console.log(`Игрок ${id} нанёс ${damage} урона волку ${data.wolfId}`);
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
          console.log(`Предмет ${itemId} удалён из-за отключения игрока ${id}`);
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "itemPicked",
                  itemId: itemId,
                })
              );
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

setInterval(() => {
  const currentTime = Date.now();
  const playerCountPerWorld = new Map();
  worlds.forEach((world) => {
    playerCountPerWorld.set(
      world.id,
      Array.from(players.values()).filter((p) => p.worldId === world.id).length
    );
  });

  // Отправка общего количества игроков всем клиентам
  const totalPlayers = players.size;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "totalOnline",
          count: totalPlayers,
        })
      );
    }
  });

  // Удаление старых предметов
  items.forEach((item, itemId) => {
    if (currentTime - item.spawnTime > 10 * 60 * 1000) {
      items.delete(itemId);
      console.log(
        `Предмет ${item.type} (${itemId}) в мире ${item.worldId} исчез из-за таймаута`
      );
      wss.clients.forEach((client) => {
        if (
          client.readyState === WebSocket.OPEN &&
          players.get(clients.get(client))?.worldId === item.worldId
        ) {
          client.send(JSON.stringify({ type: "itemPicked", itemId }));
        }
      });
    }
  });

  // Спавн новых предметов
  worlds.forEach((world) => {
    const playerCount = playerCountPerWorld.get(world.id);
    const worldItems = Array.from(items.values()).filter(
      (item) => item.worldId === world.id
    );

    const itemCounts = {};
    for (const [type] of Object.entries(ITEM_CONFIG)) {
      itemCounts[type] = worldItems.filter((item) => item.type === type).length;
    }

    const rareItems = Object.entries(ITEM_CONFIG)
      .filter(([_, config]) => config.rarity === 1)
      .map(([type]) => type);
    const mediumItems = Object.entries(ITEM_CONFIG)
      .filter(([_, config]) => config.rarity === 2)
      .map(([type]) => type);
    const commonItems = Object.entries(ITEM_CONFIG)
      .filter(([_, config]) => config.rarity === 3)
      .map(([type]) => type);

    const desiredTotalItems = playerCount * 10;
    const currentTotalItems = worldItems.length;

    if (currentTotalItems < desiredTotalItems) {
      const itemsToSpawn = desiredTotalItems - currentTotalItems;

      let rareCount = playerCount * 2;
      let mediumCount = playerCount * 3;
      let commonCount = playerCount * 5;

      for (let i = 0; i < itemsToSpawn; i++) {
        let type;
        if (
          rareCount > 0 &&
          rareItems.length > 0 &&
          itemCounts[rareItems[rareCount % rareItems.length]] < rareCount
        ) {
          type = rareItems[Math.floor(Math.random() * rareItems.length)];
          rareCount--;
        } else if (
          mediumCount > 0 &&
          mediumItems.length > 0 &&
          itemCounts[mediumItems[mediumCount % mediumItems.length]] <
            mediumCount
        ) {
          type = mediumItems[Math.floor(Math.random() * mediumItems.length)];
          mediumCount--;
        } else if (
          commonCount > 0 &&
          commonItems.length > 0 &&
          itemCounts[commonItems[commonCount % commonItems.length]] <
            commonCount
        ) {
          type = commonItems[Math.floor(Math.random() * commonItems.length)];
          commonCount--;
        } else {
          const allTypes = Object.keys(ITEM_CONFIG).filter(
            (type) => ITEM_CONFIG[type].rarity !== 4
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
          const itemId = `${type}_${Date.now()}_${i}`;
          const newItem = {
            x,
            y,
            type,
            spawnTime: currentTime,
            worldId: world.id,
          };
          items.set(itemId, newItem);
          console.log(
            `Создан предмет ${type} (${itemId}) в мире ${world.id} на x:${newItem.x}, y:${newItem.y}`
          );

          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              players.get(clients.get(client))?.worldId === world.id
            ) {
              client.send(
                JSON.stringify({
                  type: "newItem",
                  itemId: itemId,
                  x: newItem.x,
                  y: newItem.y,
                  type: newItem.type,
                  spawnTime: newItem.spawnTime,
                  worldId: world.id,
                })
              );
            }
          });
        } else {
          console.log(
            `Не удалось найти место для спавна предмета ${type} в мире ${world.id}`
          );
        }
      }
      if (world.id === 1) {
        // Только для Пустошей
        const maxWolves = Math.max(5, playerCount * 2); // Максимум волков: минимум 5 или 2 на игрока
        const currentWolves = Array.from(wolves.values()).filter(
          (w) => w.worldId === world.id
        ).length;

        if (currentWolves < maxWolves) {
          const wolvesToSpawn = maxWolves - currentWolves;
          for (let i = 0; i < wolvesToSpawn; i++) {
            let x,
              y,
              attempts = 0;
            const maxAttempts = 10;
            // Спавним на краю видимой зоны игрока
            const player = Array.from(players.values()).find(
              (p) => p.worldId === world.id
            );
            if (!player) continue;

            do {
              const edge = Math.floor(Math.random() * 4); // 0: верх, 1: низ, 2: лево, 3: право
              switch (edge) {
                case 0: // Верх
                  x = player.x + (Math.random() - 0.5) * 1000;
                  y = player.y - 500;
                  break;
                case 1: // Низ
                  x = player.x + (Math.random() - 0.5) * 1000;
                  y = player.y + 500;
                  break;
                case 2: // Лево
                  x = player.x - 500;
                  y = player.y + (Math.random() - 0.5) * 1000;
                  break;
                case 3: // Право
                  x = player.x + 500;
                  y = player.y + (Math.random() - 0.5) * 1000;
                  break;
              }
              attempts++;
            } while (checkCollisionServer(x, y) && attempts < maxAttempts);

            if (attempts < maxAttempts) {
              const wolfId = `wolf_${Date.now()}_${i}`;
              const wolf = {
                id: wolfId,
                x,
                y,
                health: 100,
                direction: "down",
                state: "walking",
                worldId: world.id,
                lastAttackTime: 0,
              };
              wolves.set(wolfId, wolf);
              console.log(
                `Создан волк ${wolfId} в мире ${world.id} на x:${x}, y:${y}`
              );

              wss.clients.forEach((client) => {
                if (
                  client.readyState === WebSocket.OPEN &&
                  players.get(clients.get(client))?.worldId === world.id
                ) {
                  client.send(
                    JSON.stringify({
                      type: "updateWolf",
                      worldId: world.id,
                      wolf,
                    })
                  );
                }
              });
            }
          }
        }
      }
    }

    if (world.id === 1) {
      wolves.forEach((wolf, wolfId) => {
        if (wolf.worldId !== world.id) return;

        // Находим ближайшего игрока с health > 0
        let closestPlayer = null;
        let minDistance = Infinity;
        players.forEach((player) => {
          if (player.worldId === world.id && player.health > 0) {
            const dx = wolf.x - player.x;
            const dy = wolf.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
              minDistance = distance;
              closestPlayer = player;
            }
          }
        });

        if (closestPlayer) {
          const dx = closestPlayer.x - wolf.x;
          const dy = closestPlayer.y - wolf.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const speed = 2; // Скорость волка (пикселей за кадр)

          if (distance > 40) {
            // Движение к игроку
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
          } else {
            // Атака игрока
            const currentTime = Date.now();
            if (currentTime - wolf.lastAttackTime >= 3000) {
              const damage = Math.floor(Math.random() * 10) + 1; // 1–10 урона
              closestPlayer.health = Math.max(0, closestPlayer.health - damage);
              wolf.lastAttackTime = currentTime;
              console.log(
                `Волк ${wolfId} атаковал игрока ${closestPlayer.id}, урон: ${damage}`
              );

              players.set(closestPlayer.id, { ...closestPlayer });
              userDatabase.set(closestPlayer.id, { ...closestPlayer });
              saveUserDatabase(dbCollection, closestPlayer.id, closestPlayer);

              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  const clientPlayer = players.get(clients.get(client));
                  if (clientPlayer && clientPlayer.worldId === world.id) {
                    client.send(
                      JSON.stringify({
                        type: "update",
                        player: closestPlayer,
                      })
                    );
                  }
                }
              });
            }
          }

          // Проверка смерти волка
          if (wolf.health <= 0 && wolf.state !== "dying") {
            wolf.state = "dying";
            wolf.frame = 0;
          }

          wolves.set(wolfId, { ...wolf });
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              players.get(clients.get(client))?.worldId === world.id
            ) {
              client.send(
                JSON.stringify({
                  type: "updateWolf",
                  worldId: world.id,
                  wolf,
                })
              );
            }
          });

          // Удаление волка после смерти
          if (wolf.state === "dying" && wolf.frame >= 3) {
            wolves.delete(wolfId);
            const itemId = `wolf_skin_${Date.now()}`;
            items.set(itemId, {
              x: wolf.x,
              y: wolf.y,
              type: "wolf_skin",
              spawnTime: Date.now(),
              worldId: world.id,
              isDroppedByPlayer: false,
            });

            wss.clients.forEach((client) => {
              if (
                client.readyState === WebSocket.OPEN &&
                players.get(clients.get(client))?.worldId === world.id
              ) {
                client.send(
                  JSON.stringify({
                    type: "removeWolf",
                    worldId: world.id,
                    wolfId,
                  })
                );
                client.send(
                  JSON.stringify({
                    type: "itemDropped",
                    itemId,
                    x: wolf.x,
                    y: wolf.y,
                    type: "wolf_skin",
                    spawnTime: Date.now(),
                    worldId: world.id,
                  })
                );
              }
            });
            console.log(`Волк ${wolfId} умер, дропнута волчья шкура ${itemId}`);
          }
        }
      });
    }

    // Синхронизация предметов для игроков в этом мире
    const allItems = Array.from(items.entries())
      .filter(([_, item]) => item.worldId === world.id)
      .map(([itemId, item]) => ({
        itemId,
        x: item.x,
        y: item.y,
        type: item.type,
        spawnTime: item.spawnTime,
        worldId: item.worldId,
      }));
    wss.clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        players.get(clients.get(client))?.worldId === world.id
      ) {
        client.send(
          JSON.stringify({
            type: "syncItems",
            items: allItems,
            worldId: world.id,
          })
        );
      }
    });
  });
}, 10 * 1000);

const PORT = process.env.PORT || 10000;
