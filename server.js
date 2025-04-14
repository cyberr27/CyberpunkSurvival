const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const { MongoClient } = require("mongodb");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();
const players = new Map();
const userDatabase = new Map();
const tradeSessions = new Map(); // Хранилище торговых сессий

// В начало файла, после определения констант
INACTIVITY_TIMEOUT = 15 * 60 * 1000;

const GAME_CONFIG = {
  BULLET_DAMAGE: 10,
  BULLET_LIFE: 1000,
};

const ITEM_CONFIG = {
  // Редкие (уровень 1)
  blood_pack: { effect: { health: 40 }, rarity: 1 },
  canned_meat: { effect: { food: 20 }, rarity: 1 },
  mushroom: { effect: { food: 5, energy: 15 }, rarity: 1 },
  // Средние (уровень 2)
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
    effect: {}, // Без эффекта
    rarity: 2,
    stackable: true, // Указываем, что предмет складывается
  },
  // Частые (уровень 3)
  water_bottle: { effect: { water: 30 }, rarity: 3 },
  nut: { effect: { food: 7 }, rarity: 3 },
  apple: { effect: { food: 8, water: 5 }, rarity: 3 },
  berries: { effect: { food: 6, water: 6 }, rarity: 3 },
  carrot: { effect: { food: 5, energy: 3 }, rarity: 3 },
};

// Получаем строку подключения только из переменной окружения
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

// Остальной код остается без изменений...
async function loadUserDatabase(collection) {
  try {
    const users = await collection.find({}).toArray();
    users.forEach((user) => userDatabase.set(user.id, user));
    console.log("База данных пользователей загружена из MongoDB");
  } catch (error) {
    console.error("Ошибка при загрузке базы данных из MongoDB:", error);
  }
}

async function saveUserDatabase(collection, username, player) {
  try {
    await collection.updateOne(
      { id: username },
      { $set: player },
      { upsert: true }
    );
  } catch (error) {
    console.error("Ошибка при сохранении данных в MongoDB:", error);
  }
}

// Добавляем функцию initializeServer
async function initializeServer() {
  const collection = await connectToDatabase();
  await loadUserDatabase(collection);
  console.log("Сервер готов к работе после загрузки базы данных");
  return collection;
}

// Теперь вызов функции будет работать
let dbCollection; // Объявляем переменную для коллекции
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

const items = new Map();
const obstacles = [];
const bullets = new Map(); // Хранилище пуль на сервере

const lights = [
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
    color: "rgba(214, 211, 4, 0.4)",
    radius: 850,
  },
  {
    id: "light6",
    x: 50,
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
];

// Функция вычисления расстояния от точки до линии (взята из одиночной игры)
function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lineLengthSquared = dx * dx + dy * dy;
  if (lineLengthSquared === 0) {
    return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lineLengthSquared;
  t = Math.max(0, Math.min(1, t));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  return Math.sqrt(Math.pow(px - closestX, 2) + Math.pow(py - closestY, 2));
}

app.use(express.static(path.join(__dirname, "public")));

function checkCollisionServer(x, y) {
  const left = x;
  const right = x + 40;
  const top = y;
  const bottom = y + 40;

  for (const obstacle of obstacles) {
    if (obstacle.isLine) {
      const distance = pointToLineDistance(
        x + 20,
        y + 20,
        obstacle.x1,
        obstacle.y1,
        obstacle.x2,
        obstacle.y2
      );
      if (distance < 20 + obstacle.thickness / 2) return true;
    } else {
      if (
        left < obstacle.right &&
        right > obstacle.left &&
        top < obstacle.bottom &&
        bottom > obstacle.top
      )
        return true;
    }
  }
  return false;
}

let inactivityTimer = setTimeout(() => {
  ws.close(4000, "Inactivity timeout");
}, INACTIVITY_TIMEOUT);

ws.on("message", async (message) => {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    ws.close(4000, "Inactivity timeout");
  }, INACTIVITY_TIMEOUT);

  let data;
  try {
    data = JSON.parse(message);
  } catch (e) {
    // Удалён console.error("Неверный JSON:", e);
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
      };
      userDatabase.set(data.username, newPlayer);
      await saveUserDatabase(dbCollection, data.username, newPlayer);
      ws.send(JSON.stringify({ type: "registerSuccess" }));
    }
  } else if (data.type === "login") {
    const player = userDatabase.get(data.username);
    if (player && player.password === data.password) {
      clients.set(ws, data.username);
      const playerData = {
        ...player,
        inventory: player.inventory || Array(20).fill(null),
      };
      players.set(data.username, playerData);
      ws.send(
        JSON.stringify({
          type: "loginSuccess",
          id: data.username,
          players: Array.from(players.values()),
          wolves: [],
          items: Array.from(items.entries()).map(([itemId, item]) => ({
            itemId,
            x: item.x,
            y: item.y,
            type: item.type,
            spawnTime: item.spawnTime,
          })),
          obstacles: obstacles,
          lights: lights,
          inventory: playerData.inventory,
        })
      );
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "newPlayer",
              player: players.get(data.username),
            })
          );
        }
      });
    } else {
      ws.send(JSON.stringify({ type: "loginFail" }));
    }
  } else if (data.type === "move") {
    const id = clients.get(ws);
    if (id) {
      const existingPlayer = players.get(id);
      const updatedPlayer = {
        ...existingPlayer,
        ...data,
        inventory: existingPlayer.inventory || Array(20).fill(null),
      };
      players.set(id, updatedPlayer);
      userDatabase.set(id, updatedPlayer);
      let lastSaved = new Map();
      if (!lastSaved.has(id) || Date.now() - lastSaved.get(id) > 5000) {
        await saveUserDatabase(dbCollection, id, updatedPlayer);
        lastSaved.set(id, Date.now());
      }
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({ type: "update", player: updatedPlayer })
          );
        }
      });
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
        ws.send(JSON.stringify({ type: "inventoryFull", itemId: data.itemId }));
        return;
      }
    }

    items.delete(data.itemId);
    players.set(id, { ...player });
    userDatabase.set(id, { ...player });
    await saveUserDatabase(dbCollection, id, player);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "itemPicked",
            itemId: data.itemId,
            playerId: id,
            item: {
              type: item.type,
              itemId: data.itemId,
              quantity: item.quantity || 1,
            },
          })
        );
        if (clients.get(client) === id) {
          client.send(
            JSON.stringify({ type: "update", player: { id, ...player } })
          );
        }
      }
    });

    setTimeout(() => {
      const worldWidth = 2800;
      const worldHeight = 3300;
      const newItemId = `${item.type}_${Date.now()}`;
      const newItem = {
        x: Math.random() * worldWidth,
        y: Math.random() * worldHeight,
        type: item.type,
        spawnTime: Date.now(),
      };
      items.set(newItemId, newItem);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "newItem",
              itemId: newItemId,
              x: newItem.x,
              y: newItem.y,
              type: newItem.type,
              spawnTime: newItem.spawnTime,
            })
          );
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
  } else if (data.type === "shoot") {
    const id = clients.get(ws);
    if (id) {
      const bulletId = Date.now().toString();
      bullets.set(bulletId, {
        id: bulletId,
        shooterId: id,
        x: data.x,
        y: data.y,
        dx: data.dx,
        dy: data.dy,
        spawnTime: Date.now(),
        life: GAME_CONFIG.BULLET_LIFE,
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "shoot",
              bulletId: bulletId,
              x: data.x,
              y: data.y,
              dx: data.dx,
              dy: data.dy,
              shooterId: id,
            })
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
            100,
            Math.max(0, player.health + effect.health)
          );
        if (effect.energy)
          player.energy = Math.min(
            100,
            Math.max(0, player.energy + effect.energy)
          );
        if (effect.food)
          player.food = Math.min(100, Math.max(0, player.food + effect.food));
        if (effect.water)
          player.water = Math.min(
            100,
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
        if (item.type === "balyary") {
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
        } while (checkCollisionServer(dropX, dropY) && attempts < maxAttempts);

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
            });
          } else {
            player.inventory[slotIndex] = null;
            items.set(itemId, {
              x: dropX,
              y: dropY,
              type: item.type,
              spawnTime: Date.now(),
            });
          }

          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
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
          });
        }
      }
    }
  } else if (data.type === "tradeRequest") {
    const id = clients.get(ws);
    if (!id || !data.targetId || id === data.targetId || tradeSessions.has(id))
      return;

    const targetWs = Array.from(clients.entries()).find(
      ([client, clientId]) => clientId === data.targetId
    )?.[0];
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(
        JSON.stringify({
          type: "tradeRequest",
          fromId: id,
          targetId: data.targetId,
        })
      );
      console.log(
        `Приглашение на обмен от ${id} отправлено игроку ${data.targetId}`
      );
    }
  } else if (data.type === "tradeAccepted") {
    const id = clients.get(ws);
    if (!id || !data.targetId || tradeSessions.has(id)) return;

    const targetWs = Array.from(clients.entries()).find(
      ([client, clientId]) => clientId === data.targetId
    )?.[0];
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      tradeSessions.set(id, {
        partnerId: data.targetId,
        myItem: null,
        partnerItem: null,
        myConfirmed: false,
        partnerConfirmed: false,
      });
      tradeSessions.set(data.targetId, {
        partnerId: id,
        myItem: null,
        partnerItem: null,
        myConfirmed: false,
        partnerConfirmed: false,
      });
      targetWs.send(
        JSON.stringify({
          type: "tradeAccepted",
          fromId: id,
          targetId: data.targetId,
          message: `Игрок ${id} начал обмен`,
        })
      );
      ws.send(
        JSON.stringify({
          type: "tradeAccepted",
          fromId: id,
          targetId: data.targetId,
          message: `Обмен с ${data.targetId} начат`,
        })
      );
      console.log(`Обмен начат между ${id} и ${data.targetId}`);
    }
  } else if (data.type === "tradeDeclined") {
    const id = clients.get(ws);
    if (!id || !data.targetId) return;

    const targetWs = Array.from(clients.entries()).find(
      ([client, clientId]) => clientId === data.targetId
    )?.[0];
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(
        JSON.stringify({
          type: "tradeDeclined",
          fromId: id,
          targetId: data.targetId,
          message: `Игрок ${id} отклонил обмен`,
        })
      );
      console.log(`Игрок ${id} отклонил обмен с ${data.targetId}`);
    }
  } else if (data.type === "tradeItemPlaced") {
    const id = clients.get(ws);
    if (!id || !data.targetId || !tradeSessions.has(id)) return;

    const session = tradeSessions.get(id);
    if (session.partnerId !== data.targetId) return;

    session.myTradeItem = data.item;
    tradeSessions.set(id, { ...session });

    const partnerSession = tradeSessions.get(data.targetId);
    partnerSession.partnerTradeItem = data.item;
    tradeSessions.set(data.targetId, { ...partnerSession });

    const targetWs = Array.from(clients.entries()).find(
      ([client, clientId]) => clientId === data.targetId
    )?.[0];
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(
        JSON.stringify({
          type: "tradeItemPlaced",
          fromId: id,
          item: data.item,
          message: data.item
            ? `Игрок ${id} предложил ${data.item.type}`
            : `Игрок ${id} убрал предмет`,
        })
      );
      console.log(
        `Игрок ${id} предложил предмет ${
          data.item?.type || "ничего"
        } для обмена`
      );
    }
  } else if (data.type === "tradeConfirmed") {
    const id = clients.get(ws);
    if (!id || !data.targetId || !tradeSessions.has(id)) return;

    const session = tradeSessions.get(id);
    if (session.partnerId !== data.targetId) return;

    session.myConfirmed = true;
    tradeSessions.set(id, { ...session });

    const partnerSession = tradeSessions.get(data.targetId);
    partnerSession.partnerConfirmed = true;
    tradeSessions.set(data.targetId, { ...partnerSession });

    const targetWs = Array.from(clients.entries()).find(
      ([client, clientId]) => clientId === data.targetId
    )?.[0];
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(
        JSON.stringify({
          type: "tradeConfirmed",
          fromId: id,
          message: `Игрок ${id} подтвердил обмен`,
        })
      );
      console.log(`Игрок ${id} подтвердил обмен`);
    }

    if (session.myConfirmed && partnerSession.myConfirmed) {
      const player = players.get(id);
      const partner = players.get(data.targetId);

      if (!session.myTradeItem && !partnerSession.myTradeItem) {
        ws.send(
          JSON.stringify({
            type: "tradeFailed",
            reason: "Оба игрока должны предложить хотя бы один предмет",
            message: "Оба игрока должны предложить хотя бы один предмет",
          })
        );
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(
            JSON.stringify({
              type: "tradeFailed",
              reason: "Оба игрока должны предложить хотя бы один предмет",
              message: "Оба игрока должны предложить хотя бы один предмет",
            })
          );
        }
        tradeSessions.delete(id);
        tradeSessions.delete(data.targetId);
        return;
      }

      const playerFreeSlot = player.inventory.findIndex(
        (slot) => slot === null
      );
      const partnerFreeSlot = partner.inventory.findIndex(
        (slot) => slot === null
      );

      let canTrade = true;
      if (session.myTradeItem && partnerFreeSlot === -1) {
        console.log(`У партнёра ${data.targetId} нет свободных слотов`);
        canTrade = false;
        ws.send(
          JSON.stringify({
            type: "tradeFailed",
            reason: `У партнёра ${data.targetId} нет свободных слотов`,
            message: `У партнёра ${data.targetId} нет свободных слотов`,
          })
        );
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(
            JSON.stringify({
              type: "tradeFailed",
              reason: `У партнёра ${data.targetId} нет свободных слотов`,
              message: `У партнёра ${data.targetId} нет свободных слотов`,
            })
          );
        }
      }
      if (partnerSession.myTradeItem && playerFreeSlot === -1) {
        console.log(`У игрока ${id} нет свободных слотов`);
        canTrade = false;
        ws.send(
          JSON.stringify({
            type: "tradeFailed",
            reason: `У игрока ${id} нет свободных слотов`,
            message: `У игрока ${id} нет свободных слотов`,
          })
        );
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(
            JSON.stringify({
              type: "tradeFailed",
              reason: `У игрока ${id} нет свободных слотов`,
              message: `У игрока ${id} нет свободных слотов`,
            })
          );
        }
      }

      if (canTrade) {
        if (session.myTradeItem && partnerFreeSlot !== -1) {
          partner.inventory[partnerFreeSlot] = { ...session.myTradeItem };
          console.log(
            `Предмет ${session.myTradeItem.type} добавлен в инвентарь ${data.targetId}`
          );
        }
        if (partnerSession.myTradeItem && playerFreeSlot !== -1) {
          player.inventory[playerFreeSlot] = {
            ...partnerSession.myTradeItem,
          };
          console.log(
            `Предмет ${partnerSession.myTradeItem.type} добавлен в инвентарь ${id}`
          );
        }

        players.set(id, { ...player });
        players.set(data.targetId, { ...partner });
        userDatabase.set(id, { ...player });
        userDatabase.set(data.targetId, { ...partner });
        await saveUserDatabase(dbCollection, id, player);
        await saveUserDatabase(dbCollection, data.targetId, partner);

        ws.send(
          JSON.stringify({
            type: "tradeSuccess",
            player: { id, ...player },
            message: `Обмен с ${data.targetId} успешно завершён`,
          })
        );
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(
            JSON.stringify({
              type: "tradeSuccess",
              player: { id: data.targetId, ...partner },
              message: `Обмен с ${id} успешно завершён`,
            })
          );
        }
        console.log(`Обмен между ${id} и ${data.targetId} завершён`);
      } else {
        if (session.myTradeItem) {
          const freeSlot = player.inventory.findIndex((slot) => slot === null);
          if (freeSlot !== -1) {
            player.inventory[freeSlot] = { ...session.myTradeItem };
            console.log(
              `Предмет ${session.myTradeItem.type} возвращён игроку ${id}`
            );
          }
        }
        if (partnerSession.myTradeItem) {
          const freeSlot = partner.inventory.findIndex((slot) => slot === null);
          if (freeSlot !== -1) {
            partner.inventory[freeSlot] = { ...partnerSession.myTradeItem };
            console.log(
              `Предмет ${partnerSession.myTradeItem.type} возвращён игроку ${data.targetId}`
            );
          }
        }

        players.set(id, { ...player });
        players.set(data.targetId, { ...partner });
        userDatabase.set(id, { ...player });
        userDatabase.set(data.targetId, { ...partner });
        await saveUserDatabase(dbCollection, id, player);
        await saveUserDatabase(dbCollection, data.targetId, partner);

        ws.send(
          JSON.stringify({
            type: "tradeCancelled",
            fromId: data.targetId,
            message: "Обмен отменён из-за отсутствия свободных слотов",
          })
        );
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(
            JSON.stringify({
              type: "tradeCancelled",
              fromId: id,
              message: "Обмен отменён из-за отсутствия свободных слотов",
            })
          );
        }
      }

      tradeSessions.delete(id);
      tradeSessions.delete(data.targetId);
    }
  } else if (data.type === "tradeCancelled") {
    const id = clients.get(ws);
    if (!id || !data.targetId || !tradeSessions.has(id)) return;

    const session = tradeSessions.get(id);
    if (session.partnerId !== data.targetId) return;

    if (session.myTradeItem) {
      const player = players.get(id);
      const freeSlot = player.inventory.findIndex((slot) => slot === null);
      if (freeSlot !== -1) {
        player.inventory[freeSlot] = { ...session.myTradeItem };
        console.log(
          `Предмет ${session.myTradeItem.type} возвращён игроку ${id}`
        );
        players.set(id, { ...player });
        userDatabase.set(id, { ...player });
        await saveUserDatabase(dbCollection, id, player);
        ws.send(
          JSON.stringify({
            type: "update",
            player: { id, ...player },
            message: `Предмет ${session.myTradeItem.type} возвращён`,
          })
        );
      } else {
        console.log(`Инвентарь игрока ${id} полон, предмет не возвращён`);
        ws.send(
          JSON.stringify({
            type: "tradeCancelled",
            fromId: data.targetId,
            message: "Инвентарь полон, предмет не возвращён",
          })
        );
      }
    }

    const targetWs = Array.from(clients.entries()).find(
      ([client, clientId]) => clientId === data.targetId
    )?.[0];
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      const partnerSession = tradeSessions.get(data.targetId);
      if (partnerSession.myTradeItem) {
        const partner = players.get(data.targetId);
        const freeSlot = partner.inventory.findIndex((slot) => slot === null);
        if (freeSlot !== -1) {
          partner.inventory[freeSlot] = { ...partnerSession.myTradeItem };
          console.log(
            `Предмет ${partnerSession.myTradeItem.type} возвращён игроку ${data.targetId}`
          );
          players.set(data.targetId, { ...partner });
          userDatabase.set(data.targetId, { ...partner });
          await saveUserDatabase(dbCollection, data.targetId, partner);
          targetWs.send(
            JSON.stringify({
              type: "update",
              player: { id: data.targetId, ...partner },
              message: `Предмет ${partnerSession.myTradeItem.type} возвращён`,
            })
          );
        } else {
          console.log(
            `Инвентарь игрока ${data.targetId} полон, предмет не возвращён`
          );
          targetWs.send(
            JSON.stringify({
              type: "tradeCancelled",
              fromId: id,
              message: "Инвентарь полон, предмет не возвращён",
            })
          );
        }
      }
      targetWs.send(
        JSON.stringify({
          type: "tradeCancelled",
          fromId: id,
          message: `Игрок ${id} отменил обмен`,
        })
      );
    }

    tradeSessions.delete(id);
    tradeSessions.delete(data.targetId);
    console.log(`Обмен между ${id} и ${data.targetId} отменён`);
  }
});

ws.on("close", async (code, reason) => {
  const id = clients.get(ws);
  if (id) {
    const player = players.get(id);
    if (player) {
      userDatabase.set(id, { ...player });
      await saveUserDatabase(dbCollection, id, player);
      // Удалён console.log(`Данные игрока ${id} сохранены...`);

      if (tradeSessions.has(id)) {
        const session = tradeSessions.get(id);
        const targetWs = Array.from(clients.entries()).find(
          ([client, clientId]) => clientId === session.partnerId
        )?.[0];
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          const partnerSession = tradeSessions.get(session.partnerId);
          if (partnerSession.myTradeItem) {
            const partner = players.get(session.partnerId);
            const freeSlot = partner.inventory.findIndex(
              (slot) => slot === null
            );
            if (freeSlot !== -1) {
              partner.inventory[freeSlot] = { ...partnerSession.myTradeItem };
              players.set(session.partnerId, { ...partner });
              userDatabase.set(session.partnerId, { ...partner });
              await saveUserDatabase(dbCollection, session.partnerId, partner);
              targetWs.send(
                JSON.stringify({
                  type: "update",
                  player: { id: session.partnerId, ...partner },
                  message: `Предмет ${partnerSession.myTradeItem.type} возвращён`,
                })
              );
            } else {
              targetWs.send(
                JSON.stringify({
                  type: "tradeCancelled",
                  fromId: id,
                  message: "Инвентарь полон, предмет не возвращён",
                })
              );
            }
          }
          targetWs.send(
            JSON.stringify({
              type: "tradeCancelled",
              fromId: id,
              message: `Игрок ${id} отключился, обмен отменён`,
            })
          );
        }
        tradeSessions.delete(id);
        tradeSessions.delete(session.partnerId);
        console.log(`Торговая сессия для ${id} очищена из-за отключения`);
      }
    }
    clients.delete(ws);
    players.delete(id);
    // Удалён console.log("Клиент отключился:", id);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "playerLeft", id }));
      }
    });
  }
  clearTimeout(inactivityTimer);
});

ws.on("error", (error) => {
  // Удалён console.error("Ошибка WebSocket:", error);
  clearTimeout(inactivityTimer);
});

setInterval(async () => {
  const currentTime = Date.now();
  bullets.forEach(async (bullet, bulletId) => {
    bullet.x += bullet.dx * (16 / 1000);
    bullet.y += bullet.dy * (16 / 1000);

    let bulletCollided = false;
    for (const obstacle of obstacles) {
      if (obstacle.isLine) {
        const distance = pointToLineDistance(
          bullet.x,
          bullet.y,
          obstacle.x1,
          obstacle.y1,
          obstacle.x2,
          obstacle.y2
        );
        if (distance < obstacle.thickness / 2 + 5) {
          bulletCollided = true;
          bullets.delete(bulletId);
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "bulletRemoved",
                  bulletId: bulletId,
                })
              );
            }
          });
          break;
        }
      }
    }

    if (!bulletCollided) {
      try {
        players.forEach(async (player, playerId) => {
          if (playerId !== bullet.shooterId && player.health > 0) {
            const playerLeft = player.x;
            const playerRight = player.x + 40;
            const playerTop = player.y;
            const playerBottom = player.y + 40;

            if (
              bullet.x >= playerLeft &&
              bullet.x <= playerRight &&
              bullet.y >= playerTop &&
              bullet.y <= playerBottom
            ) {
              player.health = Math.max(
                0,
                player.health - GAME_CONFIG.BULLET_DAMAGE
              );
              userDatabase.set(playerId, { ...player });
              await saveUserDatabase(dbCollection, playerId, player);
              bullets.delete(bulletId);
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(
                    JSON.stringify({
                      type: "update",
                      player: { id: playerId, ...player },
                    })
                  );
                }
              });
            }
          }
        });
      } catch (error) {
        // Удалён console.error("Ошибка при обработке попадания пули:", error);
      }
    }

    if (currentTime - bullet.spawnTime > GAME_CONFIG.BULLET_LIFE) {
      bullets.delete(bulletId);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "bulletRemoved",
              bulletId: bulletId,
            })
          );
        }
      });
    }
  });
}, 16);

setInterval(() => {
  const currentTime = Date.now();
  const playerCount = players.size;

  items.forEach((item, itemId) => {
    if (currentTime - item.spawnTime > 10 * 60 * 1000) {
      items.delete(itemId);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "itemPicked", itemId }));
        }
      });
    }
  });

  const worldWidth = 3135;
  const worldHeight = 3300;

  const itemCounts = {};
  for (const [type] of Object.entries(ITEM_CONFIG)) {
    itemCounts[type] = Array.from(items.values()).filter(
      (item) => item.type === type
    ).length;
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
  const currentTotalItems = Array.from(items.values()).length;

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
        itemCounts[mediumItems[mediumCount % mediumItems.length]] < mediumCount
      ) {
        type = mediumItems[Math.floor(Math.random() * mediumItems.length)];
        mediumCount--;
      } else if (
        commonCount > 0 &&
        commonItems.length > 0 &&
        itemCounts[commonItems[commonCount % commonItems.length]] < commonCount
      ) {
        type = commonItems[Math.floor(Math.random() * commonItems.length)];
        commonCount--;
      } else {
        const allTypes = Object.keys(ITEM_CONFIG);
        type = allTypes[Math.floor(Math.random() * allTypes.length)];
      }

      let x,
        y,
        attempts = 0;
      const maxAttempts = 10;
      do {
        x = Math.random() * worldWidth;
        y = Math.random() * worldHeight;
        attempts++;
      } while (checkCollisionServer(x, y) && attempts < maxAttempts);

      if (attempts < maxAttempts) {
        const itemId = `${type}_${Date.now()}_${i}`;
        const newItem = {
          x,
          y,
          type,
          spawnTime: currentTime,
        };
        items.set(itemId, newItem);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "newItem",
                itemId: itemId,
                x: newItem.x,
                y: newItem.y,
                type: newItem.type,
                spawnTime: newItem.spawnTime,
              })
            );
          }
        });
      }
    }
  }

  const allItems = Array.from(items.entries()).map(([itemId, item]) => ({
    itemId,
    x: item.x,
    y: item.y,
    type: item.type,
    spawnTime: item.spawnTime,
  }));
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "syncItems",
          items: allItems,
        })
      );
    }
  });
}, 10 * 1000);

const PORT = process.env.PORT || 10000;
