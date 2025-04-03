const fs = require("fs").promises; // Используем промисы для асинхронной работы с файлами
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();
const players = new Map();
const userDatabase = new Map();

// Путь к файлу для хранения данных
const DB_FILE = path.join(__dirname, "userDatabase.json");

// Функция загрузки базы данных из файла
async function loadUserDatabase() {
  try {
    const data = await fs.readFile(DB_FILE, "utf8");
    const users = JSON.parse(data);
    for (const [username, player] of Object.entries(users)) {
      userDatabase.set(username, player);
    }
    console.log("База данных пользователей загружена из файла");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("Файл базы данных не найден, начинаем с пустой базы");
    } else {
      console.error("Ошибка при загрузке базы данных:", error);
    }
  }
}

// Функция сохранения базы данных в файл
async function saveUserDatabase() {
  try {
    const data = JSON.stringify(Object.fromEntries(userDatabase));
    await fs.writeFile(DB_FILE, data, "utf8");
    console.log("База данных пользователей сохранена в файл");
  } catch (error) {
    console.error("Ошибка при сохранении базы данных:", error);
  }
}

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
  // Загружаем базу данных при старте сервера
  loadUserDatabase().then(() => {
    console.log("Сервер готов к работе после загрузки базы данных");
  });

  console.log("Клиент подключился");

  ws.on("message", (message) => {
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
        userDatabase.set(data.username, newPlayer); // Сохраняем в базе
        userDatabase.set(data.username, newPlayer);
        saveUserDatabase(); // Сохраняем после добавления нового пользователя
        ws.send(JSON.stringify({ type: "registerSuccess" }));
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
            players: Array.from(players.values()), // Отправляем только активных
            wolves: [],
            items: Array.from(items.values()),
            obstacles: obstacles, // Добавляем препятствия
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
        saveUserDatabase(); // Сохраняем после обновления данных игрока
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
        const bulletId = Date.now().toString(); // Уникальный ID пули
        bullets.set(bulletId, {
          id: bulletId,
          shooterId: id,
          x: data.x,
          y: data.y,
          dx: data.dx,
          dy: data.dy,
          spawnTime: Date.now(),
          life: 1000, // Время жизни пули в мс
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
      players.delete(id); // Удаляем только из активных игроков
      console.log("Клиент отключился:", id);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "playerLeft", id }));
        }
      });
      // Данные в userDatabase остаются нетронутыми
    }
  });

  ws.on("error", (error) => {
    console.error("Ошибка WebSocket:", error);
  });
});

// Обновление пуль и проверка столкновений
setInterval(() => {
  const currentTime = Date.now();
  bullets.forEach((bullet, bulletId) => {
    // Обновляем позицию пули
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;

    // Проверяем столкновение с препятствиями
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
          // 5 - радиус пули (из стилей клиента)
          bulletCollided = true;
          bullets.delete(bulletId);
          console.log(`Пуля ${bulletId} столкнулась с препятствием`);
          // Уведомляем всех клиентов об удалении пули
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
          break; // Выходим из цикла проверки препятствий
        }
      }
    }

    if (!bulletCollided) {
      // Проверяем столкновение с игроками (существующий код)
      players.forEach((player, playerId) => {
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

      // Удаляем пулю, если время жизни истекло
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
loadUserDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`WebSocket server running on ws://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(
      "Не удалось запустить сервер из-за ошибки загрузки базы:",
      error
    );
  });
