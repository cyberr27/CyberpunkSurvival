const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });
const fs = require("fs").promises; // Для работы с файлами

const players = new Map();
const wolves = new Map();
const users = new Map(); // Хранилище данных пользователей

// Загрузка данных пользователей из файла при запуске
async function loadUsers() {
  try {
    const data = await fs.readFile("users.json", "utf8");
    const loadedUsers = JSON.parse(data);
    for (const [username, userData] of Object.entries(loadedUsers)) {
      users.set(username, userData);
    }
  } catch (err) {
    console.log("No users file found, starting fresh.");
  }
}

// Сохранение данных пользователей в файл
async function saveUsers() {
  const usersObj = {};
  users.forEach((data, username) => (usersObj[username] = data));
  await fs.writeFile("users.json", JSON.stringify(usersObj, null, 2));
}

loadUsers();

class Player {
  constructor(id, username, savedData = {}) {
    this.id = id;
    this.username = username;
    this.x = savedData.x || Math.random() * 800;
    this.y = savedData.y || Math.random() * 600;
    this.health = savedData.health || 100;
    this.energy = savedData.energy || 100;
    this.food = savedData.food || 100;
    this.water = savedData.water || 100;
    this.armor = savedData.armor || 0;
    this.steps = savedData.steps || 0;
    this.inventory = savedData.inventory || [];
    this.direction = savedData.direction || "down";
    this.state = savedData.state || "idle";
    this.frame = savedData.frame || 0;
    this.frameTime = 0;
    this.frameDuration = 500;
    this.deathFrameDuration = 1000;
  }
}

class Wolf {
  constructor(id) {
    this.id = id;
    this.x = Math.random() * 800;
    this.y = Math.random() * 600;
    this.health = 50;
    this.direction = "down";
    this.state = "walking";
    this.frame = 0;
  }
}

wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    const data = JSON.parse(message);

    if (data.type === "register") {
      if (users.has(data.username)) {
        ws.send(JSON.stringify({ type: "registerFail" }));
      } else {
        users.set(data.username, { password: data.password });
        await saveUsers();
        ws.send(JSON.stringify({ type: "registerSuccess" }));
      }
      ws.close();
    } else if (data.type === "login") {
      const userData = users.get(data.username);
      if (userData && userData.password === data.password) {
        const playerId = Date.now();
        const player = new Player(
          playerId,
          data.username,
          userData.player || {}
        );
        players.set(playerId, player);
        users.set(data.username, { ...userData, player: { ...player } }); // Сохраняем начальные данные
        ws.send(
          JSON.stringify({
            type: "loginSuccess",
            id: playerId,
            players: Array.from(players.values()),
            wolves: Array.from(wolves.values()),
          })
        );
        broadcast({ type: "newPlayer", player }, ws);

        ws.on("message", (msg) => handleGameMessage(ws, playerId, msg));
        ws.on("close", async () => {
          users.set(data.username, {
            ...userData,
            player: { ...players.get(playerId) },
          });
          await saveUsers();
          players.delete(playerId);
          broadcast({ type: "playerLeft", id: playerId });
        });
      } else {
        ws.send(JSON.stringify({ type: "loginFail" }));
        ws.close();
      }
    }
  });
});

function handleGameMessage(ws, playerId, message) {
  const data = JSON.parse(message);
  const player = players.get(playerId);

  switch (data.type) {
    case "move":
      player.x = data.x;
      player.y = data.y;
      player.health = data.health;
      player.energy = data.energy;
      player.food = data.food;
      player.water = data.water;
      player.armor = data.armor;
      player.steps = data.steps;
      player.direction = data.direction;
      player.state = data.state;
      player.frame = data.frame;
      broadcast({ type: "update", player }, ws);
      break;
    case "shoot":
      broadcast(
        { type: "shoot", x: data.x, y: data.y, shooterId: playerId },
        ws
      );
      break;
    case "pickup":
      player.inventory.push(data.item);
      broadcast({ type: "itemPicked", itemId: data.itemId }, ws);
      break;
  }
}

function broadcast(data, excludeWs) {
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

setInterval(() => {
  if (wolves.size < 5) {
    const wolfId = Date.now();
    wolves.set(wolfId, new Wolf(wolfId));
    broadcast({ type: "spawnWolf", wolf: wolves.get(wolfId) });
  }
}, 5000);

console.log("WebSocket server running on ws://localhost:8080");
