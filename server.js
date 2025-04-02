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
const items = new Map();
const obstacles = [];
const bullets = new Map(); // Хранилище пуль на сервере

app.use(express.static(path.join(__dirname, "public")));

wss.on("connection", (ws) => {
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

    // Проверяем столкновение с игроками
    players.forEach((player, playerId) => {
      if (playerId !== bullet.shooterId && player.health > 0) {
        // Не наносим урон стрелявшему
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
          // Случайный урон от 1 до 100
          const damage = Math.floor(Math.random() * 100) + 1;
          player.health = Math.max(0, player.health - damage);
          console.log(
            `Пуля ${bulletId} попала в ${playerId}, урон: ${damage}, здоровье: ${player.health}`
          );

          // Обновляем состояние игрока в базе
          userDatabase.set(playerId, { ...player });

          // Удаляем пулю после попадания
          bullets.delete(bulletId);

          // Рассылаем обновление состояния игрока
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

          return; // Выходим из цикла, так как пуля уже попала
        }
      }
    });

    // Удаляем пулю, если время жизни истекло
    if (currentTime - bullet.spawnTime > bullet.life) {
      bullets.delete(bulletId);
    }
  });
}, 16); // Обновление каждые ~16 мс (60 FPS)

// Спавн предметов
setInterval(() => {
  // ... (без изменений)
}, 10000);

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
