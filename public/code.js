// Получаем элементы DOM

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const inventoryEl = document.getElementById("items");
const statsEl = document.getElementById("stats");

// Элементы авторизации
const authContainer = document.getElementById("authContainer");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const toRegister = document.getElementById("toRegister");
const toLogin = document.getElementById("toLogin");
const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");

// WebSocket соединение
let ws;
// Хранилища данных
let players = new Map();
let myId;
const lights = [];

// Загрузка изображений
const backgroundImage = new Image();
backgroundImage.src = "backgr.png";
const vegetationImage = new Image();
vegetationImage.src = "vegetation.png";
const rocksImage = new Image();
rocksImage.src = "rocks.png";
const cloudsImage = new Image();
cloudsImage.src = "clouds.png";
const playerSprite = new Image();
playerSprite.src = "playerSprite.png";
const npcSpriteImage = new Image();
npcSpriteImage.src = "npc_sprite.png";
const npcPhotoImage = new Image();
npcPhotoImage.src = "fotoQuestNPC.png";

// Глобальные настройки игры
const GAME_CONFIG = {
  PLAYER_SPEED: 100,
  FRAME_DURATION: 400, // 700 мс на весь цикл (≈100 мс на кадр)
};

let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 2000; // 2 секунды
let lastDistance = 0; // Добавляем глобальную переменную

// Добавляем переменные для управления анимацией
let lastTime = 0; // Время последнего кадра для расчета deltaTime
const frameDuration = 200; // Длительность одного кадра в миллисекундах (настраиваемая скорость анимации)

// Размеры мира
const worldWidth = 3135;
const worldHeight = 3300;

createLight(2445, 1540, "rgba(0, 255, 255, 0.4)", 1000); // 1
createLight(1314, 332, "rgba(255, 0, 255, 0.4)", 1000); // 2
createLight(506, 2246, "rgba(148, 0, 211, 0.4)", 1000); // 3
createLight(950, 3115, "rgba(255, 0, 255, 0.4)", 850); // 4
createLight(50, 3120, "rgba(214, 211, 4, 0.5)", 850); // 5
createLight(264, 1173, "rgba(214, 211, 4, 0.4)", 950); // 6
createLight(2314, 2756, "rgba(194, 0, 10, 0.4)", 850); // 7
createLight(1605, 2151, "rgba(2, 35, 250, 0.4)", 950); // 8
createLight(3095, 2335, "rgba(28, 186, 55, 0.4)", 950); // 9
createLight(2605, 509, "rgba(2, 35, 250, 0.4)", 950); // 10
createLight(1083, 1426, "rgba(109, 240, 194, 0.4)", 750); // 11
createLight(2000, 900, "rgba(240, 109, 240, 0.4)", 850); // 12
createLight(133, 373, "rgba(240, 109, 240, 0.4)", 850); // 13

// Переключение форм
toRegister.addEventListener("click", () => {
  loginForm.style.display = "none";
  registerForm.style.display = "block";
  loginError.textContent = "";
  registerError.textContent = "";
});

toLogin.addEventListener("click", () => {
  registerForm.style.display = "none";
  loginForm.style.display = "block";
  loginError.textContent = "";
  registerError.textContent = "";
});

function reconnectWebSocket() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error(
      "Максимум попыток переподключения достигнут. Игра остановлена."
    );
    authContainer.style.display = "flex";
    document.getElementById("gameContainer").style.display = "none";
    return;
  }
  console.log(`Попытка переподключения ${reconnectAttempts + 1}...`);
  setTimeout(() => {
    ws = new WebSocket("wss://cyberpunksurvival.onrender.com");
    ws.onopen = () => {
      console.log("WebSocket успешно переподключен");
      reconnectAttempts = 0;
      if (myId) {
        const lastUsername = document
          .getElementById("loginUsername")
          .value.trim();
        const lastPassword = document
          .getElementById("loginPassword")
          .value.trim();
        if (lastUsername && lastPassword) {
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "login",
              username: lastUsername,
              password: lastPassword,
            })
          );
          console.log(`Повторная авторизация для ${lastUsername}`);
        } else {
          console.warn("Нет сохранённых данных для авторизации");
          authContainer.style.display = "flex";
          document.getElementById("gameContainer").style.display = "none";
        }
      }
    };
    ws.onerror = (error) => {
      console.error("Ошибка WebSocket при переподключении:", error);
      reconnectAttempts++;
      reconnectWebSocket();
    };
    ws.onclose = (event) => {
      console.log(
        "WebSocket закрыт при переподключении:",
        event.code,
        event.reason
      );
      // Если код 4000, не переподключаемся
      if (event.code === 4000) {
        console.log(
          "Отключён из-за неактивности, переподключение не требуется"
        );
        authContainer.style.display = "flex";
        document.getElementById("gameContainer").style.display = "none";
        return;
      }
      reconnectAttempts++;
      reconnectWebSocket();
    };
  }, reconnectDelay);
}

// Инициализация WebSocket
function initializeWebSocket() {
  ws = new WebSocket("wss://cyberpunksurvival.onrender.com");
  ws.onopen = () => {
    console.log("WebSocket соединение установлено");
    reconnectAttempts = 0; // Сбрасываем попытки переподключения
  };
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("Получено сообщение:", event.data);
      if (data.type === "loginSuccess") {
        handleAuthMessage(event);
        ws.onmessage = handleGameMessage;
      } else {
        handleAuthMessage(event);
      }
    } catch (error) {
      console.error("Ошибка при обработке сообщения:", error);
    }
  };
  ws.onerror = (error) => {
    console.error("Ошибка WebSocket:", error);
  };
  ws.onclose = (event) => {
    console.log("WebSocket закрыт:", event.code, event.reason);
    // Показываем окно авторизации
    authContainer.style.display = "flex";
    document.getElementById("gameContainer").style.display = "none";
    // Очищаем данные игрока
    players.clear();
    myId = null;
    // Если код 4000 (неактивность), не пытаемся переподключиться
    if (event.code === 4000) {
      console.log("Отключён из-за неактивности, переподключение не требуется");
      return;
    }
    // Иначе пробуем переподключиться
    reconnectWebSocket();
  };
}

initializeWebSocket();

registerBtn.addEventListener("click", () => {
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value.trim();
  if (!username || !password) {
    registerError.textContent = "Введите имя и пароль";
    return;
  }
  if (ws.readyState === WebSocket.OPEN) {
    console.log("Отправка регистрации:", { username, password });
    sendWhenReady(ws, JSON.stringify({ type: "register", username, password }));
  } else {
    registerError.textContent = "Нет соединения с сервером";
  }
});

// Вход
loginBtn.addEventListener("click", () => {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  if (!username || !password) {
    loginError.textContent = "Введите имя и пароль";
    return;
  }
  if (ws.readyState === WebSocket.OPEN) {
    sendWhenReady(ws, JSON.stringify({ type: "login", username, password }));
  } else {
    loginError.textContent = "Нет соединения с сервером";
  }
});

function handleAuthMessage(event) {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case "loginSuccess":
      myId = data.id;
      authContainer.style.display = "none";
      document.getElementById("gameContainer").style.display = "block";

      const me = {
        id: data.id,
        x: data.x || 222,
        y: data.y || 3205,
        health: data.health || 100,
        energy: data.energy || 100,
        food: data.food || 100,
        water: data.water || 100,
        armor: data.armor || 0,
        distanceTraveled: data.distanceTraveled || 0,
        direction: data.direction || "down",
        state: data.state || "idle",
        frame: data.frame || 0,
        inventory: data.inventory || Array(20).fill(null),
        npcMet: data.npcMet || false,
        selectedQuestId: data.selectedQuestId || null,
        level: data.level || 0,
        xp: data.xp || 0,
        maxStats: data.maxStats || {
          health: 100,
          energy: 100,
          food: 100,
          water: 100,
        },
        upgradePoints: data.upgradePoints || 0,
      };
      players.set(myId, me);

      if (data.players) {
        data.players.forEach((p) => {
          if (p.id !== myId) {
            players.set(p.id, p);
          }
        });
      }

      lastDistance = me.distanceTraveled || 0;
      if (data.items) {
        data.items.forEach((item) =>
          items.set(item.itemId, {
            x: item.x,
            y: item.y,
            type: item.type,
            spawnTime: item.spawnTime,
          })
        );
      }
      if (data.lights) {
        lights.length = 0;
        data.lights.forEach((light) => lights.push(light));
      }
      window.inventorySystem.setInventory(
        data.inventory || Array(20).fill(null)
      );
      window.npcSystem.setNPCMet(data.npcMet || false);
      window.npcSystem.setSelectedQuest(data.selectedQuestId || null);
      window.npcSystem.checkQuestCompletion(); // Проверяем выполнение задания сразу после входа, но с учётом isQuestActive
      window.npcSystem.setAvailableQuests(data.availableQuests || []);
      levelSystem.setLevelData(
        data.level || 0,
        data.xp || 0,
        data.maxStats || { health: 100, energy: 100, food: 100, water: 100 },
        data.upgradePoints || 0
      );
      resizeCanvas();
      ws.onmessage = handleGameMessage;
      console.log("Переключен обработчик на handleGameMessage");
      startGame();
      updateOnlineCount();
      break;
    case "registerSuccess":
      registerError.textContent = "Регистрация успешна! Войдите.";
      registerForm.style.display = "none";
      loginForm.style.display = "block";
      break;
    case "registerFail":
      registerError.textContent = "Ник занят, выберите другой";
      break;
    case "loginFail":
      loginError.textContent = "Неверное имя или пароль";
      break;
  }
}

// Функция создания источника света
function createLight(x, y, color, radius) {
  lights.push({ x, y, color, radius });
}

function setNPCMet(met) {
  isNPCMet = met;
}

function checkCollision(newX, newY) {
  return false;
}

// Функция для отправки данных, когда WebSocket готов
function sendWhenReady(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message);
  } else if (ws.readyState === WebSocket.CONNECTING) {
    const checkInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        clearInterval(checkInterval);
      }
    }, 100); // Проверяем каждые 100 мс
    setTimeout(() => clearInterval(checkInterval), 5000); // Таймаут 5 секунд
  } else {
    console.error("WebSocket не готов для отправки:", ws.readyState);
  }
}

function updateOnlineCount() {
  const onlineCountEl = document.getElementById("onlineCount");
  const playerCount = players.size; // Количество игроков из Map
  onlineCountEl.textContent = `Онлайн: ${playerCount}`;
}

function startGame() {
  updateOnlineCount();
  levelSystem.initialize(); // Инициализируем систему уровней
  window.vendingMachine.initialize();
  window.movementSystem.initialize(); // Инициализируем систему движения
  window.npcSystem.initialize(); // Инициализируем стили NPC

  document.addEventListener("keydown", (e) => {
    const me = players.get(myId);
    if (!me || me.health <= 0) return;

    if (e.key === "Escape") {
      if (chatContainer.style.display === "flex") {
        chatContainer.style.display = "none";
        chatInput.blur();
      }
      if (window.inventorySystem.isInventoryOpen) {
        window.inventorySystem.toggleInventory();
      }
      e.preventDefault();
      return;
    }

    if (
      document.activeElement === chatInput ||
      document.activeElement === document.getElementById("balyaryAmount")
    ) {
      console.log("Фокус на balyaryAmount, пропускаем keydown:", e.key);
      return;
    }

    switch (e.key) {
      case "i":
        window.inventorySystem.toggleInventory();
        e.preventDefault();
        break;
      case "c":
        const isChatVisible = chatContainer.style.display === "flex";
        chatContainer.style.display = isChatVisible ? "none" : "flex";
        chatBtn.classList.toggle("active", !isChatVisible);
        if (!isChatVisible) chatInput.focus();
        else chatInput.blur();
        e.preventDefault();
        break;
    }
  });

  window.inventorySystem.handleInventoryInput();

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    targetX = touch.clientX + camera.x;
    targetY = touch.clientY + camera.y;
  });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    isMoving = false;
    const me = players.get(myId);
    if (me) {
      me.state = "idle";
      me.frame = 0;
      me.frameTime = 0;
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "move",
          x: me.x,
          y: me.y,
          health: me.health,
          energy: me.energy,
          food: me.food,
          water: me.water,
          armor: me.armor,
          distanceTraveled: me.distanceTraveled,
          direction: me.direction,
          state: me.state,
          frame: me.frame,
        })
      );
    }
  });

  window.chatSystem.initializeChat(ws);

  // Настройка кнопки Inventory
  const inventoryBtn = document.getElementById("inventoryBtn");
  inventoryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleInventory();
  });

  // Инициализация инвентаря через inventorySystem
  window.inventorySystem.initializeInventory();

  requestAnimationFrame(gameLoop);
}

// Скрыть кнопки действий
function hideActionButtons() {
  document.querySelectorAll(".action-btn").forEach((btn) => btn.remove());
}

// Логика расхода ресурсов
function updateResources() {
  const me = players.get(myId);
  if (!me) return;

  const distance = Math.floor(me.distanceTraveled || 0);

  // Энергия: -1 каждые 600 пикселей
  const energyLoss = Math.floor(distance / 800);
  const prevEnergyLoss = Math.floor(lastDistance / 800);
  if (energyLoss > prevEnergyLoss) {
    me.energy = Math.max(0, me.energy - (energyLoss - prevEnergyLoss));
    console.log(`Energy reduced to ${me.energy}`);
  }

  // Еда: -1 каждые 350 пикселей
  const foodLoss = Math.floor(distance / 450);
  const prevFoodLoss = Math.floor(lastDistance / 450);
  if (foodLoss > prevFoodLoss) {
    me.food = Math.max(0, me.food - (foodLoss - prevFoodLoss));
    console.log(`Food reduced to ${me.food}`);
  }

  // Вода: -1 каждые 200 пикселей
  const waterLoss = Math.floor(distance / 250);
  const prevWaterLoss = Math.floor(lastDistance / 250);
  if (waterLoss > prevWaterLoss) {
    me.water = Math.max(0, me.water - (waterLoss - prevWaterLoss));
    console.log(`Water reduced to ${me.water}`);
  }

  // Здоровье: -1 каждые 50 пикселей, если ресурсы на нуле
  if (me.energy === 0 || me.food === 0 || me.water === 0) {
    const healthLoss = Math.floor(distance / 150);
    const prevHealthLoss = Math.floor(lastDistance / 150);
    if (healthLoss > prevHealthLoss) {
      me.health = Math.max(0, me.health - (healthLoss - prevHealthLoss));
      console.log(`Health reduced to ${me.health}`);
    }
  }

  lastDistance = distance; // Обновляем lastDistance для следующего вызова
  updateStatsDisplay();
}

function updateStatsDisplay() {
  const me = players.get(myId);
  if (!me) return;
  statsEl.innerHTML = `
    <span class="health">Здоровье: ${me.health}/${levelSystem.maxStats.health}</span><br>
    <span class="energy">Энергия: ${me.energy}/${levelSystem.maxStats.energy}</span><br>
    <span class="food">Еда: ${me.food}/${levelSystem.maxStats.food}</span><br>
    <span class="water">Вода: ${me.water}/${levelSystem.maxStats.water}</span><br>
    <span class="armor">Броня: ${me.armor}</span>
  `;
  document.getElementById("coords").innerHTML = `X: ${Math.floor(
    me.x
  )}<br>Y: ${Math.floor(me.y)}`;
  levelSystem.updateUpgradeButtons(); // Добавляем вызов для обновления кнопок
}

function handleGameMessage(event) {
  try {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "newPlayer":
        players.set(data.player.id, { ...data.player, frameTime: 0 });
        updateOnlineCount();
        break;
      case "playerLeft":
        players.delete(data.id);
        updateOnlineCount();
        break;
      case "syncItems":
        items.clear();
        data.items.forEach((item) =>
          items.set(item.itemId, {
            x: item.x,
            y: item.y,
            type: item.type,
            spawnTime: item.spawnTime,
          })
        );
        data.items.forEach((item) => {
          if (pendingPickups.has(item.itemId)) {
            console.log(
              `Предмет ${item.itemId} всё ещё в мире, убираем из pendingPickups`
            );
            pendingPickups.delete(item.itemId);
          }
        });
        break;
      case "itemPicked":
        items.delete(data.itemId);
        pendingPickups.delete(data.itemId);
        console.log(`Предмет ${data.itemId} удалён из мира (itemPicked)`);
        const me = players.get(myId);
        if (me && data.playerId === myId && data.item) {
          const newInventory = [...window.inventorySystem.inventory];
          if (data.item.type === "balyary") {
            const balyarySlot = newInventory.findIndex(
              (slot) => slot && slot.type === "balyary"
            );
            if (balyarySlot !== -1) {
              newInventory[balyarySlot].quantity =
                (newInventory[balyarySlot].quantity || 1) + 1;
            } else {
              const freeSlot = newInventory.findIndex((slot) => slot === null);
              if (freeSlot !== -1) {
                newInventory[freeSlot] = {
                  type: "balyary",
                  quantity: 1,
                  itemId: data.itemId,
                };
              }
            }
          } else {
            const freeSlot = newInventory.findIndex((slot) => slot === null);
            if (freeSlot !== -1) {
              newInventory[freeSlot] = data.item;
            }
          }
          window.inventorySystem.setInventory(newInventory);
          levelSystem.handleItemPickup(
            data.item.type,
            data.item.isDroppedByPlayer || false
          );
        }
        updateStatsDisplay();
        break;
      case "itemNotFound":
        items.delete(data.itemId);
        pendingPickups.delete(data.itemId);
        console.log(
          `Предмет ${data.itemId} не найден на сервере, удалён из локального items`
        );
        break;
      case "inventoryFull":
        console.log(`Инвентарь полон, предмет ${data.itemId} не поднят`);
        window.inventorySystem.getPendingPickups().delete(data.itemId);
        break;
      case "update":
        const existingPlayer = players.get(data.player.id);
        players.set(data.player.id, {
          ...existingPlayer,
          ...data.player,
          frameTime: existingPlayer.frameTime || 0,
        });
        if (data.player.id === myId) {
          window.inventorySystem.setInventory(data.player.inventory);
          setNPCMet(data.player.npcMet || false);
          levelSystem.setLevelData(
            data.player.level || 0,
            data.player.xp || 0,
            data.player.maxStats || levelSystem.maxStats,
            data.player.upgradePoints || 0
          );
          updateStatsDisplay(); // Добавьте здесь
          window.inventorySystem.updateInventoryDisplay();
        }
        break;
      case "itemDropped":
        console.log(
          `Получено itemDropped: itemId=${data.itemId}, type=${data.type}, x=${data.x}, y=${data.y}`
        );
        items.set(data.itemId, {
          x: data.x,
          y: data.y,
          type: data.type,
          spawnTime: data.spawnTime,
        });
        window.inventorySystem.updateInventoryDisplay();
        break;
      case "chat":
        window.chatSystem.handleChatMessage(data);
        break;
      case "buyWaterResult":
        if (data.success) {
          const me = players.get(myId);
          me.water = data.water;
          window.inventorySystem.setInventory(data.inventory);
          updateInventoryDisplay();
          window.vendingMachine.hideVendingMenu();
          console.log(
            `Куплено ${data.option} воды, вода: ${me.water}, баляры: ${data.balyaryCount}`
          );
        } else {
          const errorEl = document.getElementById("vendingError");
          errorEl.textContent = data.error || "Ошибка покупки";
          console.log(`Ошибка покупки: ${data.error}`);
        }
        break;
    }
  } catch (error) {
    console.error("Ошибка в handleGameMessage:", error);
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight; // 100% высоты
  const me = players.get(myId);
  if (me) {
    window.movementSystem.update(0); // Обновляем камеру
  }
}

function update(deltaTime) {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  // Обновляем движение через movementSystem
  window.movementSystem.update(deltaTime);

  // Удаление предметов по таймауту
  const currentTime = Date.now();
  window.inventorySystem.checkItemCollisions();
  window.inventorySystem.drawItems();
}

function draw(deltaTime) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(10, 20, 40, 0.8)"; // Ночной эффект
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const camera = window.movementSystem.getCamera();
  const groundSpeed = 1.0,
    vegetationSpeed = 0.8,
    rocksSpeed = 0.6,
    cloudsSpeed = 0.3;
  const groundOffsetX = camera.x * groundSpeed;
  const vegetationOffsetX = camera.x * vegetationSpeed;
  const rocksOffsetX = camera.x * rocksSpeed;
  const cloudsOffsetX = camera.x * cloudsSpeed;

  // Рисуем фон с учётом смещения камеры
  ctx.fillStyle = ctx.createPattern(backgroundImage, "repeat");
  ctx.save();
  ctx.translate(
    -groundOffsetX % backgroundImage.width,
    (-camera.y * groundSpeed) % backgroundImage.height
  );
  ctx.fillRect(
    (groundOffsetX % backgroundImage.width) - backgroundImage.width,
    ((camera.y * groundSpeed) % backgroundImage.height) -
      backgroundImage.height,
    worldWidth + backgroundImage.width,
    worldHeight + backgroundImage.height
  );
  ctx.restore();

  lights.forEach((light) => {
    const screenX = light.x - camera.x;
    const screenY = light.y - camera.y;
    if (
      screenX + light.radius > 0 &&
      screenX - light.radius < canvas.width &&
      screenY + light.radius > 0 &&
      screenY - light.radius < canvas.height
    ) {
      const gradient = ctx.createRadialGradient(
        screenX,
        screenY,
        0,
        screenX,
        screenY,
        light.radius
      );
      gradient.addColorStop(0, light.color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, light.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.drawImage(
    rocksImage,
    rocksOffsetX,
    camera.y * rocksSpeed,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  drawNPC();
  npcSystem.drawNPC();
  window.vendingMachine.draw();

  players.forEach((player) => {
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    if (player.id !== myId) {
      if (player.state === "walking") {
        player.frameTime += deltaTime;
        if (player.frameTime >= GAME_CONFIG.FRAME_DURATION / 7) {
          player.frameTime -= GAME_CONFIG.FRAME_DURATION / 7; // Плавное вычитание
          player.frame = (player.frame + 1) % 7;
        }
      } else if (player.state === "dying") {
        player.frameTime += deltaTime;
        if (player.frameTime >= GAME_CONFIG.FRAME_DURATION / 7) {
          player.frameTime = 0;
          if (player.frame < 6) player.frame += 1;
        }
      } else {
        player.frame = 0;
        player.frameTime = 0;
      }
    }

    let spriteX = player.frame * 40;
    let spriteY =
      player.state === "dying"
        ? 160
        : { up: 0, down: 40, left: 80, right: 120 }[player.direction] || 40;

    ctx.drawImage(
      playerSprite,
      spriteX,
      spriteY,
      40,
      40,
      screenX,
      screenY,
      40,
      40
    );
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(player.id, screenX + 20, screenY - 20);
    ctx.fillStyle = "red";
    ctx.fillRect(screenX, screenY - 15, 40, 5);
    ctx.fillStyle = "green";
    ctx.fillRect(screenX, screenY - 15, (player.health / 100) * 40, 5);
  });

  items.forEach((item, itemId) => {
    if (!items.has(itemId)) {
      console.log(
        `Предмет ${itemId} пропущен при отрисовке, так как уже удалён`
      );
      return;
    }
    const screenX = item.x - camera.x;
    const screenY = item.y - camera.y;
    // Уменьшаем область проверки видимости, так как размер теперь 20x20
    if (
      screenX >= -20 &&
      screenX <= canvas.width + 20 &&
      screenY >= -20 &&
      screenY <= canvas.height + 20
    ) {
      const itemImage = ITEM_CONFIG[item.type]?.image;
      if (itemImage && itemImage.complete) {
        // Меняем размер отрисовки с 40x40 на 20x20 и корректируем позицию,
        // чтобы центр предмета оставался на месте
        ctx.drawImage(itemImage, screenX + 10, screenY + 10, 20, 20);
      } else {
        // Уменьшаем заглушку до 5x5 для согласованности
        ctx.fillStyle = "yellow";
        ctx.fillRect(screenX + 7.5, screenY + 7.5, 5, 5);
      }
    }
  });

  ctx.drawImage(
    vegetationImage,
    vegetationOffsetX,
    camera.y * vegetationSpeed,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  ctx.drawImage(
    cloudsImage,
    cloudsOffsetX,
    camera.y * cloudsSpeed,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
}

function checkCollisions() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  window.inventorySystem.checkItemCollisions();
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  update(deltaTime);
  draw(deltaTime);
  requestAnimationFrame(gameLoop);
}

// Инициализация изображений (без изменений)
let imagesLoaded = 7;
function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === 5) window.addEventListener("resize", resizeCanvas);
}
