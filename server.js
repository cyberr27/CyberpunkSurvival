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

const GAME_CONFIG = {
  BULLET_DAMAGE: 10,
  BULLET_LIFE: 1000,
};

const ITEM_CONFIG = {
  energy_drink: { effect: { energy: 20 }, baseCount: 1 },
  nut: { effect: { food: 27 }, baseCount: 2 },
  water_bottle: { effect: { water: 30 }, baseCount: 3 },
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
    console.log(`Данные пользователя ${username} сохранены в MongoDB`);
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
    x: 2404,
    y: 1693,
    color: "rgba(0, 255, 255, 0.7)",
    radius: 1500,
  },
  {
    id: "light2",
    x: 1710,
    y: 0,
    color: "rgba(255, 0, 255, 0.7)",
    radius: 1200,
  },
  {
    id: "light3",
    x: 943,
    y: 1793,
    color: "rgba(148, 0, 211, 0.7)",
    radius: 1200,
  },
  {
    id: "light4",
    x: 1164,
    y: 2843,
    color: "rgba(255, 0, 255, 0.7)",
    radius: 800,
  },
  {
    id: "light5",
    x: 364,
    y: 3093,
    color: "rgba(214, 211, 4, 0.5)",
    radius: 900,
  },
  {
    id: "light6",
    x: 364,
    y: 3093,
    color: "rgba(214, 211, 4, 0.5)",
    radius: 900,
  },
  {
    id: "light7",
    x: 264,
    y: 1173,
    color: "rgba(214, 211, 4, 0.7)",
    radius: 1500,
  },
  {
    id: "light8",
    x: 374,
    y: 483,
    color: "rgba(245, 5, 17, 0.7)",
    radius: 1000,
  },
  {
    id: "light9",
    x: 924,
    y: 943,
    color: "rgba(2, 35, 250, 0.4)",
    radius: 900,
  },
  {
    id: "light10",
    x: 1454,
    y: 1103,
    color: "rgba(2, 35, 250, 0.4)",
    radius: 900,
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

wss.on("connection", (ws) => {
  console.log("Клиент подключился");

  ws.on("message", async (message) => {
    // Добавляем async для асинхронных операций
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
          x: Math.random() * 2800,
          y: Math.random() * 3300,
          health: 100,
          energy: 100,
          food: 100,
          water: 100,
          armor: 0,
          distanceTraveled: 0,
          direction: "down",
          state: "idle",
          frame: 0,
        };
        userDatabase.set(data.username, newPlayer);
        await saveUserDatabase(dbCollection, data.username, newPlayer); // Сохраняем в MongoDB
        ws.send(JSON.stringify({ type: "registerSuccess" }));
      }
    } else if (data.type === "login") {
      const player = userDatabase.get(data.username);
      if (player && player.password === data.password) {
        clients.set(ws, data.username);
        players.set(data.username, { ...player }); // Добавляем в активные игроки
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
        const updatedPlayer = { ...players.get(id), ...data };
        players.set(id, updatedPlayer);
        userDatabase.set(id, updatedPlayer);
        let lastSaved = new Map();
        if (!lastSaved.has(id) || Date.now() - lastSaved.get(id) > 5000) {
          // Каждые 5 секунд
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
      if (id && items.has(data.itemId)) {
        const item = items.get(data.itemId);
        const player = players.get(id);
        const effect = ITEM_CONFIG[item.type]?.effect;

        if (effect) {
          if (effect.health)
            player.health = Math.min(100, player.health + effect.health);
          if (effect.energy)
            player.energy = Math.min(100, player.energy + effect.energy);
          if (effect.food)
            player.food = Math.min(100, player.food + effect.food);
          if (effect.water)
            player.water = Math.min(100, player.water + effect.water);
        }

        items.delete(data.itemId);
        players.set(id, { ...player });
        userDatabase.set(id, { ...player });
        await saveUserDatabase(dbCollection, id, player);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({ type: "itemPicked", itemId: data.itemId })
            );
            if (clients.get(client) === id) {
              client.send(
                JSON.stringify({ type: "update", player: { id, ...player } })
              );
            }
          }
        });
        console.log(`Игрок ${id} поднял ${item.type} (ID: ${data.itemId})`);

        // Планируем респавн предмета через 10 минут
        setTimeout(() => {
          const worldWidth = 2800;
          const worldHeight = 3300;
          const newItemId = `${item.type}_${Date.now()}`; // Уникальный ID для нового предмета
          const newItem = {
            x: Math.random() * worldWidth,
            y: Math.random() * worldHeight,
            type: item.type,
            spawnTime: Date.now(),
          };
          items.set(newItemId, newItem);
          console.log(
            `Предмет ${item.type} (${newItemId}) возродился на x:${newItem.x}, y:${newItem.y}`
          );

          // Отправляем всем клиентам сообщение о новом предмете с дополнительным логированием
          let clientsNotified = 0;
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const message = JSON.stringify({
                type: "newItem",
                itemId: newItemId,
                x: newItem.x,
                y: newItem.y,
                type: newItem.type, // Тип предмета (energy_drink, nut, water_bottle)
                spawnTime: newItem.spawnTime,
              });
              client.send(message);
              clientsNotified++;
              console.log(
                `Отправлено сообщение "newItem" клиенту ${
                  clients.get(client) || "unknown"
                }: ${message}`
              );
            }
          });
          console.log(
            `Уведомлено ${clientsNotified} клиентов о новом предмете ${newItemId}`
          );
        }, 10 * 60 * 1000); // 10 минут
      } else {
        console.log(
          `Не удалось поднять предмет ${data.itemId}: не найден или игрок не авторизован`
        );
      }
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
          life: 1000,
        });

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "shoot",
                bulletId,
                shooterId: id,
                x: data.x,
                y: data.y,
                dx: data.dx,
                dy: data.dy,
              })
            );
          }
        });
      }
    }
  });

  ws.on("close", () => {
    const id = clients.get(ws);
    if (id) {
      clients.delete(ws);
      players.delete(id);
      console.log("Клиент отключился:", id);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "playerLeft", id }));
        }
      });
    }
  });

  ws.on("error", (error) => {
    console.error("Ошибка WebSocket:", error);
  });
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
          console.log(`Пуля ${bulletId} столкнулась с препятствием`);
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
              console.log(
                `Пуля ${bulletId} попала в ${playerId}, здоровье: ${player.health}`
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
        console.error("Ошибка при обработке попадания пули:", error);
      }
    }

    if (currentTime - bullet.spawnTime > GAME_CONFIG.BULLET_LIFE) {
      bullets.delete(bulletId);
      console.log(`Пуля ${bulletId} удалена по истечении времени жизни`);
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

// Спавн предметов
// Спавн предметов каждые 10 секунд
setInterval(() => {
  const currentTime = Date.now();
  const playerCount = players.size;
  console.log(`Игроков онлайн: ${playerCount}`);

  // Удаляем предметы, которые не были подняты более 10 минут
  items.forEach((item, itemId) => {
    if (currentTime - item.spawnTime > 10 * 60 * 1000) {
      items.delete(itemId);
      console.log(`Предмет ${item.type} (${itemId}) исчез из-за таймаута`);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "itemPicked", itemId }));
        }
      });
    }
  });

  // Спавн новых предметов в зависимости от количества игроков
  const worldWidth = 2800;
  const worldHeight = 3300;

  for (const [type, config] of Object.entries(ITEM_CONFIG)) {
    const desiredCount = config.baseCount * Math.max(1, playerCount); // Желаемое количество предметов
    const existingCount = Array.from(items.values()).filter(
      (item) => item.type === type
    ).length; // Текущее количество предметов данного типа
    const toSpawn = Math.max(0, desiredCount - existingCount); // Сколько нужно заспавнить

    for (let i = 0; i < toSpawn; i++) {
      const itemId = `${type}_${Date.now()}_${i}`; // Уникальный ID
      const newItem = {
        x: Math.random() * worldWidth, // Случайная X-координата
        y: Math.random() * worldHeight, // Случайная Y-координата
        type: type, // Тип предмета
        spawnTime: currentTime, // Время создания
      };
      items.set(itemId, newItem); // Добавляем в хранилище
      console.log(
        `Создан предмет ${type} (${itemId}) на x:${newItem.x}, y:${newItem.y}`
      );
      // Уведомляем всех клиентов о новом предмете
      let clientsNotified = 0;
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          const message = JSON.stringify({
            type: "newItem", // Было item.type, что давало "energy_drink" и т.д.
            itemId: itemId,
            x: newItem.x,
            y: newItem.y,
            type: newItem.type, // Тип предмета отдельно
            spawnTime: newItem.spawnTime,
          });
          client.send(message);
          clientsNotified++;
          console.log(
            `Отправлено сообщение "newItem" клиенту ${
              clients.get(client) || "unknown"
            }: ${message}`
          );
        }
      });
      console.log(
        `Уведомлено ${clientsNotified} клиентов о новом предмете ${itemId}`
      );
    }
  }
}, 10 * 1000); // Каждые 10 секунд

const PORT = process.env.PORT || 10000;

initializeServer()
  .then((collection) => {
    dbCollection = collection; // Убеждаемся, что коллекция доступна
    server.listen(PORT, () => {
      console.log(`WebSocket server running on ws://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(
      "Не удалось запустить сервер из-за ошибки инициализации MongoDB:",
      error
    );
    process.exit(1);
  });
