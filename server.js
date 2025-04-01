const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();
const players = new Map();

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
      // ... (регистрация остается без изменений)
    } else if (data.type === "login") {
      const player = players.get(data.username);
      if (player && player.password === data.password) {
        clients.set(ws, data.username);
        // Отправляем только активных игроков (тех, у кого есть активное соединение)
        const activePlayers = Array.from(players.values()).filter((p) =>
          Array.from(clients.values()).includes(p.id)
        );
        ws.send(
          JSON.stringify({
            type: "loginSuccess",
            id: data.username,
            players: activePlayers,
            wolves: [],
          })
        );
      } else {
        ws.send(JSON.stringify({ type: "loginFail" }));
      }
    } else if (data.type === "move") {
      const id = clients.get(ws);
      if (id) {
        players.set(id, { ...players.get(id), ...data });
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
      clients.delete(ws);
      console.log("Клиент отключился:", id);
      // Уведомляем всех об уходе игрока
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "playerLeft", id }));
        }
      });
      // Данные игрока остаются в players, но он исчезает с поля
    }
  });

  ws.on("error", (error) => {
    console.error("Ошибка WebSocket:", error);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
