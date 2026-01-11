const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const { connectToDatabase, loadUserDatabase } = require("./database");
const { setupWebSocket } = require("./websocket");
const { runGameLoop } = require("./gameLogic");
const { ITEM_CONFIG } = require("./items");

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
  { id: 0, width: 3135, height: 3300, name: "Неоновый Город" },
  { id: 1, width: 3135, height: 3300, name: "Пустоши" },
  { id: 2, width: 3135, height: 3300, name: "Токсичные Джунгли" },
];

worlds.forEach((world) => {
  if (world.id === 0) {
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
        radiusbury: 2,
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
  })
);

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

async function initializeServer() {
  const uri = process.env.MONGO_URI;
  console.log(
    "Значение MONGO_URI из окружения:",
    uri ? uri.replace(/:([^:@]+)@/, ":<password>@") : "не определено"
  );

  // const collection = await connectToDatabase(uri);
  // await loadUserDatabase(collection, userDatabase);
  const fakeCollection = {
    /* пустая заглушка */
  }; // или null
  console.log("Работаем без реальной MongoDB (тестовый режим)");
  console.log("Сервер готов к работе после загрузки базы данных");

  setupWebSocket(
    wss,
    fakeCollection,
    clients,
    players,
    userDatabase,
    items,
    lights,
    worlds,
    ITEM_CONFIG,
    INACTIVITY_TIMEOUT,
    enemies // ← Теперь enemies существует!
  );

  runGameLoop(
    wss,
    fakeCollection,
    clients,
    players,
    items,
    worlds,
    ITEM_CONFIG,
    userDatabase,
    enemies // ← ДОБАВЬ enemies и сюда!
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
