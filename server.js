const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

// Настройка Express для HTTP
const app = express();
const server = http.createServer(app);

// Настройка WebSocket
const wss = new WebSocket.Server({ server });

// Обслуживание статических файлов из папки 'public'
app.use(express.static(path.join(__dirname, "public")));

// Обработка WebSocket-соединений
wss.on("connection", (ws) => {
  console.log("Клиент подключился");
  ws.on("message", (message) => {
    console.log("Получено:", message);
    try {
      const data = JSON.parse(message);
      // Здесь ваша игровая логика, например:
      if (data.type === "register") {
        ws.send(JSON.stringify({ type: "registerSuccess", id: "some-id" }));
      } else if (data.type === "login") {
        ws.send(
          JSON.stringify({
            type: "loginSuccess",
            id: "some-id",
            players: [],
            wolves: [],
          })
        );
      }
    } catch (e) {
      console.error("Ошибка обработки сообщения:", e);
    }
  });
  ws.on("close", () => {
    console.log("Клиент отключился");
  });
});

// Запуск сервера
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
