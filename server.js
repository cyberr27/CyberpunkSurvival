const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Список подключенных клиентов и игроков
const clients = new Map(); // ws -> id
const players = new Map(); // id -> данные игрока

app.use(express.static(path.join(__dirname, "public")));

wss.on("connection", (ws) => {
  console.log("Клиент подключился");

  ws.on("message", (message) => {
    console.log("Получено:", message);
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error("Неверный JSON:", e);
      return;
    }

    if (data.type === "register") {
      // Простая проверка (в реальной игре нужна база данных)
      if (players.has(data.username)) {
        ws.send(JSON.stringify({ type: "registerFail" }));
      } else {
        const id = data.username; // Используем username как ID для простоты
        players.set(id, {
          id,
          x: 100, // Начальные координаты
          y: 100,
          health: 100,
          energy: 100,
          food: 100,
          water: 100,
          armor: 0,
          steps: 0,
          direction: "down",
          state: "idle",
          frame: 0,
          inventory: [],
        });
        clients.set(ws, id);
        ws.send(JSON.stringify({ type: "registerSuccess" }));
      }
    } else if (data.type === "login") {
      const player = players.get(data.username);
      if (player && data.password === "111") {
        // Простая проверка пароля
        clients.set(ws, data.username);
        ws.send(
          JSON.stringify({
            type: "loginSuccess",
            id: data.username,
            players: Array.from(players.values()),
            wolves: [], // Пока волков нет
          })
        );
      } else {
        ws.send(JSON.stringify({ type: "loginFail" }));
      }
    } else if (data.type === "move") {
      const id = clients.get(ws);
      if (id) {
        players.set(id, { ...players.get(id), ...data });
        // Рассылаем обновление всем клиентам
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({ type: "update", player: players.get(id) })
            );
          }
        });
      }
    }
  });

  ws.on("close", () => {
    const id = clients.get(ws);
    if (id) {
      players.delete(id);
      clients.delete(ws);
      console.log("Клиент отключился");
      // Уведомляем остальных
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "playerLeft", id }));
        }
      });
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
