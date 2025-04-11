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

// В начало файла, после определения констант
INACTIVITY_TIMEOUT = 15 * 60 * 1000;

const GAME_CONFIG = {
  BULLET_DAMAGE: 10,
  BULLET_LIFE: 1000,
};

const ITEM_CONFIG = {
  // Редкие (уровень 1)
  blood_pack: { effect: { health: 40 }, rarity: 1 },
  canned_meat: { effect: { food: 20 }, rarity: 1 },
  meat_chunk: { effect: { food: 20, energy: 5, water: -2 }, rarity: 1 },
  energy_drink: { effect: { energy: 20, water: 5 }, rarity: 1 },
  sausage: { effect: { food: 16, energy: 3 }, rarity: 1 },
  // Средние (уровень 2)
  mushroom: { effect: { food: 5, energy: 15 }, rarity: 2 },
  dried_fish: { effect: { food: 10, water: -3 }, rarity: 2 },
  condensed_milk: { effect: { water: 5, food: 11, energy: 2 }, rarity: 2 },
  milk: { effect: { water: 15, food: 5 }, rarity: 2 },
  blood_syringe: { effect: { health: 10 }, rarity: 2 },
  vodka_bottle: {
    effect: { health: 5, energy: -2, water: 1, food: 2 },
    rarity: 2,
  },
  bread: { effect: { food: 13, water: -2 }, rarity: 2 },
  balyary: {
    effect: {}, // Без эффекта
    rarity: 2,
    stackable: true, // Указываем, что предмет складывается
  },
  // Частые (уровень 3)
  water_bottle: { effect: { water: 30 }, rarity: 3 },
  nut: { effect: { food: 7 }, rarity: 3 },
  berry: { effect: { food: 5, water: 3 }, rarity: 3 },
  apple: { effect: { food: 8 }, rarity: 3 },
  carrot: { effect: { food: 6, water: 2 }, rarity: 3 },
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
  } catch (error) {
    console.error("Ошибка при сохранении данных в MongoDB:", error);
  }
}

// Добавляем функцию initializeServer
async function initializeServer() {
  const collection = await connectToDatabase();
  await loadUserDatabase(collection);
  console.log("Сервер готов к работе после загрузки базы данных");
  return collection;
}

// Теперь вызов функции будет работать
let dbCollection; // Объявляем переменную для коллекции
initializeServer()
  .then((collection) => {
    dbCollection = collection;
    server.listen(PORT, () => {
      console.log(`WebSocket server running on ws://localhost:${PORT}`);
    });
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
    x: 2515,
    y: 1590,
    color: "rgba(0, 255, 255, 0.7)",
    radius: 800,
  },
  {
    id: "light2",
    x: 1077,
    y: 3177,
    color: "rgba(255, 0, 255, 0.7)",
    radius: 800,
  },
  {
    id: "light3",
    x: 1079,
    y: 1464,
    color: "rgba(148, 0, 211, 0.7)",
    radius: 800,
  },
  {
    id: "light4",
    x: 491,
    y: 2317,
    color: "rgba(255, 0, 255, 0.7)",
    radius: 900,
  },
  {
    id: "light5",
    x: 46,
    y: 3111,
    color: "rgba(214, 211, 4, 0.5)",
    radius: 800,
  },
  {
    id: "light6",
    x: 264,
    y: 1173,
    color: "rgba(214, 211, 4, 0.7)",
    radius: 1500,
  },
  {
    id: "light7",
    x: 2319,
    y: 2816,
    color: "rgba(245, 5, 17, 0.7)",
    radius: 800,
  },
  {
    id: "light8",
    x: 2724,
    y: 398,
    color: "rgba(2, 35, 250, 0.4)",
    radius: 800,
  },
  {
    id: "light9",
    x: 1454,
    y: 1103,
    color: "rgba(2, 35, 250, 0.4)",
    radius: 900,
  },
  {
    id: "light10",
    x: 3095,
    y: 2341,
    color: "rgba(11, 160, 0, 0.4)",
    radius: 1000,
  },
  {
    id: "light11",
    x: 1606,
    y: 2203,
    color: "rgba(205, 84, 205, 0.5)",
    radius: 750,
  },
  {
    id: "light12",
    x: 2006,
    y: 891,
    color: "rgba(205, 84, 205, 0.5)",
    radius: 750,
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

function checkCollisionServer(x, y) {
  const left = x;
  const right = x + 40;
  const top = y;
  const bottom = y + 40;

  for (const obstacle of obstacles) {
    if (obstacle.isLine) {
      const distance = pointToLineDistance(
        x + 20,
        y + 20,
        obstacle.x1,
        obstacle.y1,
        obstacle.x2,
        obstacle.y2
      );
      if (distance < 20 + obstacle.thickness / 2) return true;
    } else {
      if (
        left < obstacle.right &&
        right > obstacle.left &&
        top < obstacle.bottom &&
        bottom > obstacle.top
      )
        return true;
    }
  }
  return false;
}

wss.on("connection", (ws) => {
  console.log("Клиент подключился");

  // Добавляем таймер неактивности для клиента
  let inactivityTimer = setTimeout(() => {
    console.log("Клиент отключён из-за неактивности");
    ws.close(4000, "Inactivity timeout"); // Закрываем соединение с пользовательским кодом
  }, INACTIVITY_TIMEOUT);

  ws.on("message", async (message) => {
    // Сбрасываем таймер неактивности при получении любого сообщения
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      console.log("Клиент отключён из-за неактивности");
      ws.close(4999, "Inactivity timeout");
    }, INACTIVITY_TIMEOUT);

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
          x: 222,
          y: 3205,
          health: 100,
          energy: 100,
          food: 100,
          water: 100,
          armor: 0,
          distanceTraveled: 0,
          direction: "down",
          state: "idle",
          frame: 0,
          inventory: Array(20).fill(null), // Добавляем инвентарь
        };

        userDatabase.set(data.username, newPlayer);
        await saveUserDatabase(dbCollection, data.username, newPlayer); // Сохраняем в MongoDB
        ws.send(JSON.stringify({ type: "registerSuccess" }));
      }
    } else if (data.type === "login") {
      const player = userDatabase.get(data.username);
      if (player && player.password === data.password) {
        clients.set(ws, data.username);
        const playerData = {
          ...player,
          inventory: player.inventory || Array(20).fill(null), // Гарантируем наличие inventory
        };
        players.set(data.username, playerData);
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
            inventory: playerData.inventory, // Отправляем гарантированно существующий inventory
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
        const existingPlayer = players.get(id);
        const updatedPlayer = {
          ...existingPlayer,
          ...data,
          inventory: existingPlayer.inventory || Array(20).fill(null), // Сохраняем или инициализируем inventory
        };
        players.set(id, updatedPlayer);
        userDatabase.set(id, updatedPlayer);
        let lastSaved = new Map();
        if (!lastSaved.has(id) || Date.now() - lastSaved.get(id) > 5000) {
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
    }
    if (data.type === "pickup") {
      const id = clients.get(ws);
      if (!id) return;

      if (!items.has(data.itemId)) {
        ws.send(JSON.stringify({ type: "itemNotFound", itemId: data.itemId }));
        return;
      }

      const item = items.get(data.itemId);
      const player = players.get(id);
      if (!player.inventory) player.inventory = Array(20).fill(null);

      // Логика поднятия предмета (без изменений)
      if (item.type === "balyary") {
        const quantityToAdd = item.quantity || 1;
        const balyarySlot = player.inventory.findIndex(
          (slot) => slot && slot.type === "balyary"
        );
        if (balyarySlot !== -1) {
          player.inventory[balyarySlot].quantity =
            (player.inventory[balyarySlot].quantity || 1) + quantityToAdd;
        } else {
          const freeSlot = player.inventory.findIndex((slot) => slot === null);
          if (freeSlot !== -1) {
            player.inventory[freeSlot] = {
              type: "balyary",
              quantity: quantityToAdd,
              itemId: data.itemId,
            };
          } else {
            ws.send(
              JSON.stringify({ type: "inventoryFull", itemId: data.itemId })
            );
            return;
          }
        }
      } else {
        const freeSlot = player.inventory.findIndex((slot) => slot === null);
        if (freeSlot !== -1) {
          player.inventory[freeSlot] = { type: item.type, itemId: data.itemId };
        } else {
          ws.send(
            JSON.stringify({ type: "inventoryFull", itemId: data.itemId })
          );
          return;
        }
      }

      items.delete(data.itemId);
      players.set(id, { ...player });
      userDatabase.set(id, { ...player });
      await saveUserDatabase(dbCollection, id, player);

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "itemPicked",
              itemId: data.itemId,
              playerId: id,
              item: {
                type: item.type,
                itemId: data.itemId,
                quantity: item.quantity || 1,
              },
            })
          );
          if (clients.get(client) === id) {
            client.send(
              JSON.stringify({ type: "update", player: { id, ...player } })
            );
          }
        }
      });

      // Респавн нового предмета той же редкости через 10 минут
      setTimeout(() => {
        const worldWidth = 3135;
        const worldHeight = 3300;
        const itemRarity = ITEM_CONFIG[item.type].rarity;
        const itemsOfSameRarity = Object.keys(ITEM_CONFIG).filter(
          (type) =>
            ITEM_CONFIG[type].rarity === itemRarity && type !== item.type // Исключаем поднятый предмет
        );
        const newType =
          itemsOfSameRarity[
            Math.floor(Math.random() * itemsOfSameRarity.length)
          ];
        const newItemId = `${newType}_${Date.now()}`;
        const newItem = {
          x: Math.random() * worldWidth,
          y: Math.random() * worldHeight,
          type: newType,
          spawnTime: Date.now(),
        };
        items.set(newItemId, newItem);
        console.log(
          `Респавн предмета ${newType} (${newItemId}) вместо ${item.type} на x:${newItem.x}, y:${newItem.y}`
        );

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "newItem",
                itemId: newItemId,
                x: newItem.x,
                y: newItem.y,
                type: newItem.type,
                spawnTime: newItem.spawnTime,
              })
            );
          }
        });
      }, 10 * 60 * 1000);
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
          life: GAME_CONFIG.BULLET_LIFE, // Используем константу из конфига
        });

        // Уведомляем всех о новом выстреле
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "shoot",
                bulletId: bulletId,
                x: data.x,
                y: data.y,
                dx: data.dx,
                dy: data.dy,
                shooterId: id,
              })
            );
          }
        });
        console.log(`Игрок ${id} выстрелил, пуля ${bulletId} создана`);
      }
    }
    // Обработка использования предмета из инвентаря
    else if (data.type === "useItem") {
      const id = clients.get(ws);
      if (id) {
        const player = players.get(id);
        const slotIndex = data.slotIndex;
        const item = player.inventory[slotIndex];
        if (item) {
          const effect = ITEM_CONFIG[item.type].effect;
          if (effect.health)
            player.health = Math.min(
              100,
              Math.max(0, player.health + effect.health)
            );
          if (effect.energy)
            player.energy = Math.min(
              100,
              Math.max(0, player.energy + effect.energy)
            );
          if (effect.food)
            player.food = Math.min(100, Math.max(0, player.food + effect.food));
          if (effect.water)
            player.water = Math.min(
              100,
              Math.max(0, player.water + effect.water)
            );

          player.inventory[slotIndex] = null;
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({ type: "update", player: { id, ...player } })
              );
            }
          });
          console.log(
            `Игрок ${id} использовал ${item.type} из слота ${slotIndex}`
          );
        }
      }
    }
    // Обработка выброса предмета из инвентаря
    else if (data.type === "dropItem") {
      const id = clients.get(ws);
      console.log(
        `Получен запрос dropItem от ${id}, slotIndex: ${data.slotIndex}, x: ${
          data.x
        }, y: ${data.y}, quantity: ${data.quantity || 1}`
      );
      if (id) {
        const player = players.get(id);
        const slotIndex = data.slotIndex;
        const item = player.inventory[slotIndex];
        if (item) {
          let quantityToDrop = data.quantity || 1; // По умолчанию 1, если не указано
          if (item.type === "balyary") {
            const currentQuantity = item.quantity || 1;
            if (quantityToDrop > currentQuantity) {
              console.log(
                `У игрока ${id} недостаточно Баляр для выброса: ${quantityToDrop} > ${currentQuantity}`
              );
              return; // Клиент уже проверил, но на всякий случай
            }
          }

          let dropX,
            dropY,
            attempts = 0;
          const maxAttempts = 10;
          do {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 100;
            dropX = player.x + Math.cos(angle) * radius;
            dropY = player.y + Math.sin(angle) * radius;
            attempts++;
          } while (
            checkCollisionServer(dropX, dropY) &&
            attempts < maxAttempts
          );

          if (attempts < maxAttempts) {
            const itemId = `${item.type}_${Date.now()}`;
            if (item.type === "balyary") {
              if (quantityToDrop === item.quantity) {
                player.inventory[slotIndex] = null;
              } else {
                player.inventory[slotIndex].quantity -= quantityToDrop;
              }
              items.set(itemId, {
                x: dropX,
                y: dropY,
                type: item.type,
                spawnTime: Date.now(),
                quantity: quantityToDrop, // Сохраняем количество выброшенных Баляр
              });
            } else {
              player.inventory[slotIndex] = null;
              items.set(itemId, {
                x: dropX,
                y: dropY,
                type: item.type,
                spawnTime: Date.now(),
              });
            }

            players.set(id, { ...player });
            userDatabase.set(id, { ...player });
            await saveUserDatabase(dbCollection, id, player);

            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "itemDropped",
                    itemId,
                    x: dropX,
                    y: dropY,
                    type: item.type,
                    spawnTime: Date.now(),
                    quantity:
                      item.type === "balyary" ? quantityToDrop : undefined,
                  })
                );
                if (clients.get(client) === id) {
                  client.send(
                    JSON.stringify({
                      type: "update",
                      player: { id, ...player },
                    })
                  );
                }
              }
            });
            console.log(
              `Игрок ${id} выбросил ${quantityToDrop} ${item.type} на x:${dropX}, y:${dropY}`
            );
          } else {
            console.log(`Не удалось найти место для выброса ${item.type}`);
          }
        }
      }
    }
  });

  ws.on("close", async (code, reason) => {
    const id = clients.get(ws);
    if (id) {
      const player = players.get(id);
      if (player) {
        userDatabase.set(id, { ...player });
        await saveUserDatabase(dbCollection, id, player);
        console.log(
          `Данные игрока ${id} сохранены перед отключением. Код: ${code}, Причина: ${reason}`
        );

        // Удаляем предметы, связанные с этим игроком, если они не были подняты
        const itemsToRemove = [];
        items.forEach((item, itemId) => {
          if (item.spawnedBy === id) {
            itemsToRemove.push(itemId);
          }
        });

        itemsToRemove.forEach((itemId) => {
          items.delete(itemId);
          console.log(`Предмет ${itemId} удалён из-за отключения игрока ${id}`);
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "itemPicked",
                  itemId: itemId,
                })
              );
            }
          });
        });
      }
      clients.delete(ws);
      players.delete(id);
      console.log("Клиент отключился:", id);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "playerLeft", id }));
        }
      });
    }
    // Очищаем таймер при закрытии соединения
    clearTimeout(inactivityTimer);
  });

  ws.on("error", (error) => {
    console.error("Ошибка WebSocket:", error);
    // Очищаем таймер при ошибке
    clearTimeout(inactivityTimer);
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

setInterval(() => {
  const currentTime = Date.now();
  const playerCount = players.size;

  // Удаление предметов по таймауту (10 минут)
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

  const worldWidth = 3135;
  const worldHeight = 3300;

  // Считаем текущие предметы по редкости
  const itemCountsByRarity = { 1: 0, 2: 0, 3: 0 };
  items.forEach((item) => {
    const rarity = ITEM_CONFIG[item.type].rarity;
    itemCountsByRarity[rarity]++;
  });

  // Цели по редкости на основе количества игроков
  const targetCounts = {
    1: playerCount * 2, // 2 редких на игрока
    2: playerCount * 4, // 4 средних на игрока
    3: playerCount * 5, // 5 частых на игрока
  };

  // Определяем предметы по редкости
  const itemsByRarity = {
    1: Object.keys(ITEM_CONFIG).filter(
      (type) => ITEM_CONFIG[type].rarity === 1
    ),
    2: Object.keys(ITEM_CONFIG).filter(
      (type) => ITEM_CONFIG[type].rarity === 2
    ),
    3: Object.keys(ITEM_CONFIG).filter(
      (type) => ITEM_CONFIG[type].rarity === 3
    ),
  };

  // Спавним недостающие предметы
  for (let rarity = 1; rarity <= 3; rarity++) {
    const currentCount = itemCountsByRarity[rarity];
    const targetCount = targetCounts[rarity];
    if (currentCount < targetCount) {
      const itemsToSpawn = targetCount - currentCount;
      for (let i = 0; i < itemsToSpawn; i++) {
        const type =
          itemsByRarity[rarity][
            Math.floor(Math.random() * itemsByRarity[rarity].length)
          ];
        const itemId = `${type}_${Date.now()}_${i}`;
        const newItem = {
          x: Math.random() * worldWidth,
          y: Math.random() * worldHeight,
          type: type,
          spawnTime: currentTime,
        };
        items.set(itemId, newItem);
        console.log(
          `Создан предмет ${type} (${itemId}) с редкостью ${rarity} на x:${newItem.x}, y:${newItem.y}`
        );

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "newItem",
                itemId: itemId,
                x: newItem.x,
                y: newItem.y,
                type: newItem.type,
                spawnTime: newItem.spawnTime,
              })
            );
          }
        });
      }
    }
  }

  // Синхронизация предметов
  const allItems = Array.from(items.entries()).map(([itemId, item]) => ({
    itemId,
    x: item.x,
    y: item.y,
    type: item.type,
    spawnTime: item.spawnTime,
  }));
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "syncItems",
          items: allItems,
        })
      );
    }
  });
}, 10 * 1000);

const PORT = process.env.PORT || 10000;
