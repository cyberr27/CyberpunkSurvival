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

const uri =
  process.env.MONGO_URI ||
  "mongodb+srv://aleksejbalinskij27:<db_password>@cluster0.jk71lmt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
console.log(
  "Используемая строка подключения MongoDB:",
  uri.replace(/:([^:@]+)@/, ":<password>@")
); // Скрываем пароль в логах
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
          steps: 0,
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
            items: Array.from(items.values()),
            obstacles: obstacles,
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
        await saveUserDatabase(dbCollection, id, updatedPlayer); // Сохраняем в MongoDB
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
        items.delete(data.itemId);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({ type: "itemPicked", itemId: data.itemId })
            );
          }
        });
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
  // Добавляем async
  const currentTime = Date.now();
  bullets.forEach(async (bullet, bulletId) => {
    // Добавляем async
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;

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
      players.forEach(async (player, playerId) => {
        // Добавляем async
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
            const damage = Math.floor(Math.random() * 100) + 1;
            player.health = Math.max(0, player.health - damage);
            console.log(
              `Пуля ${bulletId} попала в ${playerId}, урон: ${damage}, здоровье: ${player.health}`
            );

            userDatabase.set(playerId, { ...player });
            await saveUserDatabase(dbCollection, playerId, player); // Сохраняем в MongoDB
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
            return;
          }
        }
      });

      if (currentTime - bullet.spawnTime > bullet.life) {
        bullets.delete(bulletId);
      }
    }
  });
}, 16);

// Спавн предметов
setInterval(() => {
  // ... (без изменений)
}, 10000);

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
