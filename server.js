const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const { connectToDatabase, loadUserDatabase } = require("./database");
const { setupWebSocket } = require("./websocket");
const { runGameLoop } = require("./gameLogic");
const { ITEM_CONFIG } = require("./items");
const { loadTwisterState } = require("./misterTwisterServer");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, pingInterval: 30000 });
const clients = new Map();
const players = new Map();
const userDatabase = new Map();
const items = new Map();
const lights = new Map();
const enemies = new Map();
const lastSaved = new Map();

const INACTIVITY_TIMEOUT = 45 * 60 * 1000;

const worlds = [
  { id: 0, width: 2800, height: 2800, name: "Неоновый Город" },
  { id: 1, width: 2800, height: 2800, name: "Пустоши" },
  { id: 2, width: 2800, height: 2800, name: "Токсичные Джунгли" },
];

worlds.forEach((world) => {
  if (world.id === 0) {
    lights.set(world.id, [
      {
        x: 400,
        y: 2200,
        color: "rgba(0, 110, 255, 0.4)",
        radius: 1300,
        pulseSpeed: 0.002,
      },
      {
        x: 1900,
        y: 1600,
        color: "rgba(0, 255, 98, 0.54)",
        radius: 900,
        pulseSpeed: 0.002,
      },
      {
        x: 700,
        y: 900,
        color: "rgba(208, 0, 255, 0.64)",
        radius: 800,
        pulseSpeed: 0.002,
      },
      {
        x: 2600,
        y: 822,
        color: "rgba(0, 17, 255, 0.31)",
        radius: 1500,
        pulseSpeed: 0.002,
      },
      {
        x: 1400,
        y: 40,
        color: "rgba(255, 0, 0, 0.59)",
        radius: 1100,
        pulseSpeed: 0.002,
      },
      {
        x: 260,
        y: 160,
        color: "rgba(234, 255, 0, 0.66)",
        radius: 600,
        pulseSpeed: 0.002,
      },
    ]);
  } else {
    lights.set(world.id, []);
  }
});

app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "1d",
    setHeaders: (res, path) => {
      if (path.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      }
    },
  }),
);

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

async function initializeServer() {
  const uri = process.env.MONGO_URI;
  console.log(
    "Значение MONGO_URI из окружения:",
    uri ? uri.replace(/:([^:@]+)@/, ":<password>@") : "не определено",
  );

  const collection = await connectToDatabase(uri);
  await loadUserDatabase(collection, userDatabase);
  console.log("Сервер готов к работе после загрузки базы данных");
  await loadTwisterState(collection);

  setupWebSocket(
    wss,
    collection,
    clients,
    players,
    userDatabase,
    items,
    lights,
    worlds,
    ITEM_CONFIG,
    INACTIVITY_TIMEOUT,
    enemies,
  );

  runGameLoop(
    wss,
    collection,
    clients,
    players,
    items,
    worlds,
    ITEM_CONFIG,
    userDatabase,
    enemies,
  );

  return collection;
}

const PORT = process.env.PORT || 10000;

initializeServer()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`WebSocket server running on ws://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Ошибка при инициализации сервера:", error);
    process.exit(1);
  });
