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

const chatBtn = document.getElementById("chatBtn");
const chatContainer = document.getElementById("chatContainer");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");

// WebSocket соединение
let ws;
// Хранилища данных
let players = new Map();
let myId;
const items = new Map();
const lights = [];
const obstacles = [];
const bullets = new Map();
// Хранилище предметов, для которых уже отправлен запрос pickup
const pendingPickups = new Set();

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
const energyDrinkImage = new Image();
energyDrinkImage.src = "energy_drink.png";
const nutImage = new Image();
nutImage.src = "nut.png";
const waterBottleImage = new Image();
waterBottleImage.src = "water_bottle.png";

// Добавляем новые изображения
const cannedMeatImage = new Image();
cannedMeatImage.src = "canned_meat.png";
const mushroomImage = new Image();
mushroomImage.src = "mushroom.png";
const sausageImage = new Image();
sausageImage.src = "sausage.png";
const bloodPackImage = new Image();
bloodPackImage.src = "blood_pack.png";
const breadImage = new Image();
breadImage.src = "bread.png";
const vodkaBottleImage = new Image();
vodkaBottleImage.src = "vodka_bottle.png";
const meatChunkImage = new Image();
meatChunkImage.src = "meat_chunk.png";
const bloodSyringeImage = new Image();
bloodSyringeImage.src = "blood_syringe.png";
const milkImage = new Image();
milkImage.src = "milk.png";
const condensedMilkImage = new Image();
condensedMilkImage.src = "condensed_milk.png";
const driedFishImage = new Image();
driedFishImage.src = "dried_fish.png";
const balyaryImage = new Image();
balyaryImage.src = "balyary.png";
const appleImage = new Image();
appleImage.src = "apple.png";
const berriesImage = new Image();
berriesImage.src = "berry.png";
const carrotImage = new Image();
carrotImage.src = "carrot.png";
const npcSpriteImage = new Image();
npcSpriteImage.src = "npc_sprite.png";
const npcPhotoImage = new Image();
npcPhotoImage.src = "fotoQuestNPC.png";

// Инвентарь игрока (массив на 20 слотов, изначально пустой)
let inventory = Array(20).fill(null);

// Конфигурация эффектов предметов (расширяем ITEM_CONFIG)
const ITEM_CONFIG = {
  energy_drink: {
    effect: { energy: 20, water: 5 },
    image: energyDrinkImage,
    description: "Энергетик: +20 эн. +5 воды.",
    rarity: 3,
  },
  nut: {
    effect: { food: 7 },
    image: nutImage,
    description: "Орех: +7 еды.",
    rarity: 3,
  },
  water_bottle: {
    effect: { water: 30 },
    image: waterBottleImage,
    description: "Вода: +30 воды.",
    rarity: 3,
  },
  apple: {
    effect: { food: 8, water: 5 },
    image: appleImage,
    description: "Яблоко: +8 еды, +5 воды.",
    rarity: 3,
  },
  berries: {
    effect: { food: 6, water: 6 },
    image: berriesImage,
    description: "Ягоды: +6 еды, +6 воды.",
    rarity: 3,
  },
  carrot: {
    effect: { food: 5, energy: 3 },
    image: carrotImage,
    description: "Морковь: +5 еды, +3 энергии.",
    rarity: 3,
  },
  canned_meat: {
    effect: { food: 20 },
    image: cannedMeatImage,
    description: "Банка тушёнки: +20 еды.",
    rarity: 1,
  },
  mushroom: {
    effect: { food: 5, energy: 15 },
    image: mushroomImage,
    description: "Гриб прущий: +15 энергии. +5 еды.",
    rarity: 1,
  },
  sausage: {
    effect: { food: 16, energy: 3 },
    image: sausageImage,
    description: "Колбаса: +16 еды, +3 энергии.",
    rarity: 2,
  },
  blood_pack: {
    effect: { health: 40 },
    image: bloodPackImage,
    description: "Пакет крови: +40 здоровья.",
    rarity: 1,
  },
  bread: {
    effect: { food: 13, water: -2 },
    image: breadImage,
    description: "Хлеб: +13 еды, -2 воды.",
    rarity: 2,
  },
  vodka_bottle: {
    effect: { health: 5, energy: -2, water: 1, food: 2 },
    image: vodkaBottleImage,
    description: "Водка: +5 здоровья, -2 эн. +1 воды, +2 еды.",
    rarity: 2,
  },
  meat_chunk: {
    effect: { food: 20, energy: 5, water: -2 },
    image: meatChunkImage,
    description: "Кусок мяса: +20 еды, +5 эн. -2 воды.",
    rarity: 2,
  },
  blood_syringe: {
    effect: { health: 10 },
    image: bloodSyringeImage,
    description: "Шприц с кровью: +10 здоровья.",
    rarity: 2,
  },
  milk: {
    effect: { water: 15, food: 5 },
    image: milkImage,
    description: "Молоко: +15 воды, +5 еды.",
    rarity: 2,
  },
  condensed_milk: {
    effect: { water: 5, food: 11, energy: 2 },
    image: condensedMilkImage,
    description: "Сгущёнка: +11 еды, +5 воды, +2 эн.",
    rarity: 2,
  },
  dried_fish: {
    effect: { food: 10, water: -3 },
    image: driedFishImage,
    description: "Сушёная рыба: +10 еды, -3 воды.",
    rarity: 2,
  },
  balyary: {
    effect: {}, // Эффекта нет, это валюта
    image: balyaryImage,
    description: "Баляр: игровая валюта.",
    stackable: true, // Указываем, что предмет складывается
    rarity: 2,
  },
};

// Состояние инвентаря (открыт или закрыт)
let isInventoryOpen = false;
// Элемент подсказки
let tooltip = null;
// Выбранный слот инвентаря
let selectedSlot = null;

// Глобальные настройки игры
const GAME_CONFIG = {
  PLAYER_SPEED: 100,
  FRAME_DURATION: 200, // 700 мс на весь цикл (≈100 мс на кадр)
  BULLET_SPEED: 500,
  BULLET_LIFE: 1000,
  BULLET_DAMAGE: 10,
};

let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 2000; // 2 секунды

let lastDistance = 0; // Добавляем глобальную переменную
// Флаг, указывающий, что персонаж должен двигаться к цели
let isMoving = false;
// Целевая позиция в мировых координатах
let targetX = 0;
let targetY = 0;
// Базовая скорость в пикселях в секунду (одинакова для всех устройств)
const baseSpeed = 100; // пикселей в секунду

// Флаги для управления движением
const movement = {
  up: false,
  down: false,
  left: false,
  right: false,
};

// Добавляем переменные для управления анимацией
let lastTime = 0; // Время последнего кадра для расчета deltaTime
const frameDuration = 200; // Длительность одного кадра в миллисекундах (настраиваемая скорость анимации)

// Размеры мира
const worldWidth = 3135;
const worldHeight = 3300;

// Камера
const camera = { x: 0, y: 0 };

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
      data.obstacles?.forEach((o) => obstacles.push(o));
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
      inventory = data.inventory || Array(20).fill(null);
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

function createLineObstacle(x1, y1, x2, y2, thickness = 5) {
  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const halfThickness = thickness / 2;

  const sinAngle = Math.sin(angle);
  const cosAngle = Math.cos(angle);
  const dx = halfThickness * sinAngle;
  const dy = halfThickness * cosAngle;

  const point1 = { x: x1 - dx, y: y1 + dy };
  const point2 = { x: x1 + dx, y: y1 - dy };
  const point3 = { x: x2 - dx, y: y2 + dy };
  const point4 = { x: x2 + dx, y: y2 - dy };

  const left = Math.min(point1.x, point2.x, point3.x, point4.x);
  const right = Math.max(point1.x, point2.x, point3.x, point4.x);
  const top = Math.min(point1.y, point2.y, point3.y, point4.y);
  const bottom = Math.max(point1.y, point2.y, point3.y, point4.y);

  const obstacle = {
    id: Date.now().toString(),
    left,
    right,
    top,
    bottom,
    isLine: true,
    x1,
    y1,
    x2,
    y2,
    thickness,
  };
  obstacles.push(obstacle);
}

function lineIntersects(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denominator === 0) return false;
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

// Добавляем функцию pointToLineDistance (если её ещё нет)
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

function checkBulletCollision(bullet) {
  for (const obstacle of obstacles) {
    // Убираем деструктуризацию [, obstacle]
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
        return true;
      }
    }
  }
  return false;
}

// Функция создания источника света
function createLight(x, y, color, radius) {
  lights.push({ x, y, color, radius });
}

function setNPCMet(met) {
  isNPCMet = met;
}

function checkCollision(newX, newY) {
  const me = players.get(myId);
  if (!me) return false;

  const playerLeft = newX;
  const playerRight = newX + 40;
  const playerTop = newY;
  const playerBottom = newY + 40;

  for (const obstacle of obstacles) {
    // Убираем деструктуризацию [, obstacle]
    if (obstacle.isLine) {
      const lineX1 = obstacle.x1;
      const lineY1 = obstacle.y1;
      const lineX2 = obstacle.x2;
      const lineY2 = obstacle.y2;

      const playerEdges = [
        { x1: playerLeft, y1: playerTop, x2: playerRight, y2: playerTop },
        { x1: playerRight, y1: playerTop, x2: playerRight, y2: playerBottom },
        { x1: playerRight, y1: playerBottom, x2: playerLeft, y2: playerBottom },
        { x1: playerLeft, y1: playerBottom, x2: playerLeft, y2: playerTop },
      ];

      for (const edge of playerEdges) {
        if (
          lineIntersects(
            lineX1,
            lineY1,
            lineX2,
            lineY2,
            edge.x1,
            edge.y1,
            edge.x2,
            edge.y2
          )
        ) {
          return true;
        }
      }

      const distance = pointToLineDistance(
        newX + 20,
        newY + 20,
        lineX1,
        lineY1,
        lineX2,
        lineY2
      );
      if (distance < 20 + obstacle.thickness / 2) {
        return true;
      }
    } else {
      if (
        playerLeft < obstacle.right &&
        playerRight > obstacle.left &&
        playerTop < obstacle.bottom &&
        playerBottom > obstacle.top
      ) {
        return true;
      }
    }
  }
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

  // Обработчик клавиш (только для стрельбы и чата)
  document.addEventListener("keydown", (e) => {
    const me = players.get(myId);
    if (!me || me.health <= 0) return;

    if (e.key === "Escape") {
      if (chatContainer.style.display === "flex") {
        chatContainer.style.display = "none";
        chatInput.blur();
      }
      if (isInventoryOpen) {
        toggleInventory();
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
      case " ":
        shoot();
        e.preventDefault();
        break;
      case "c":
        const isChatVisible = chatContainer.style.display === "flex";
        chatContainer.style.display = isChatVisible ? "none" : "flex";
        if (!isChatVisible) chatInput.focus();
        else chatInput.blur();
        e.preventDefault();
        break;
      case "i":
        toggleInventory();
        e.preventDefault();
        break;
    }
  });
  // Обработчик нажатия мыши
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      const me = players.get(myId);
      if (!me || me.health <= 0) return;

      const inventoryContainer = document.getElementById("inventoryContainer");
      const rect = inventoryContainer.getBoundingClientRect();
      if (
        isInventoryOpen &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const slots = inventoryContainer.children;
        for (let i = 0; i < slots.length; i++) {
          const slotRect = slots[i].getBoundingClientRect();
          if (
            e.clientX >= slotRect.left &&
            e.clientX <= slotRect.right &&
            e.clientY >= slotRect.top &&
            e.clientY <= slotRect.bottom &&
            inventory[i]
          ) {
            console.log(
              `Клик по слоту ${i} (x:${e.clientX}, y:${e.clientY}), предмет: ${inventory[i].type}`
            );
            selectSlot(i, slots[i]);
            return;
          }
        }
        console.log(
          `Клик вне слотов инвентаря (x:${e.clientX}, y:${e.clientY})`
        );
        return; // Прерываем, если клик в инвентаре, но не по слоту
      }

      isMoving = true;
      targetX = e.clientX + camera.x;
      targetY = e.clientY + camera.y;
    }
  });

  // Обработчик движения мыши (обновляем цель, если кнопка зажата)
  canvas.addEventListener("mousemove", (e) => {
    if (isMoving) {
      targetX = e.clientX + camera.x;
      targetY = e.clientY + camera.y;
    }
  });

  // Обработчик отпускания мыши
  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
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
    }
  });

  // Обработчик тач-событий для мобильных устройств
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const me = players.get(myId);
    if (!me || me.health <= 0) return;

    const touch = e.touches[0];
    const inventoryContainer = document.getElementById("inventoryContainer");
    const rect = inventoryContainer.getBoundingClientRect();

    if (
      isInventoryOpen &&
      touch.clientX >= rect.left &&
      touch.clientX <= rect.right &&
      touch.clientY >= rect.top &&
      touch.clientY <= rect.bottom
    ) {
      const slots = inventoryContainer.children;
      for (let i = 0; i < slots.length; i++) {
        const slotRect = slots[i].getBoundingClientRect();
        if (
          touch.clientX >= slotRect.left &&
          touch.clientX <= slotRect.right &&
          touch.clientY >= slotRect.top &&
          touch.clientY <= slotRect.bottom &&
          inventory[i]
        ) {
          console.log(
            `Тач по слоту ${i} (x:${touch.clientX}, y:${touch.clientY}), предмет: ${inventory[i].type}`
          );
          selectSlot(i, slots[i]);
          return;
        }
      }
      console.log(
        `Тач вне слотов инвентаря (x:${touch.clientX}, y:${touch.clientY})`
      );
    } else {
      isMoving = true;
      targetX = touch.clientX + camera.x;
      targetY = touch.clientY + camera.y;
    }
  });

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

  // Настройка кнопки Fire
  const fireBtn = document.getElementById("fireBtn");
  fireBtn.addEventListener("click", (e) => {
    e.preventDefault();
    shoot();
  });

  // Настройка кнопки Chat
  const chatBtn = document.getElementById("chatBtn");
  chatBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const isChatVisible = chatContainer.style.display === "flex";
    chatContainer.style.display = isChatVisible ? "none" : "flex";
    chatBtn.classList.toggle("active", !isChatVisible);
    if (!isChatVisible) chatInput.focus();
    else chatInput.blur();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chatContainer.style.display === "flex") {
      chatContainer.style.display = "none";
      chatInput.blur();
    }
  });

  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && chatInput.value.trim()) {
      sendWhenReady(
        ws,
        JSON.stringify({ type: "chat", message: chatInput.value.trim() })
      );
      chatInput.value = "";
    }
  });

  // Настройка кнопки Inventory
  const inventoryBtn = document.getElementById("inventoryBtn");
  inventoryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleInventory();
  });

  // Создаём контейнер для ячеек инвентаря
  const inventoryContainer = document.getElementById("inventoryContainer");
  inventoryContainer.style.display = "none";

  const inventoryGrid = document.createElement("div");
  inventoryGrid.id = "inventoryGrid";
  inventoryContainer.insertBefore(
    inventoryGrid,
    document.getElementById("inventoryActions")
  );

  for (let i = 0; i < 20; i++) {
    const slot = document.createElement("div");
    slot.className = "inventory-slot";
    inventoryGrid.appendChild(slot);
  }

  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  useBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (selectedSlot !== null) useItem(selectedSlot);
  });

  dropBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (selectedSlot !== null) dropItem(selectedSlot);
  });

  // Добавляем стили NPC в DOM
  const npcStyles = `
    .npc-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(10, 10, 10, 0.95), rgba(20, 20, 20, 0.9));
      border: 2px solid #00ffff;
      border-radius: 10px;
      padding: 20px;
      color: #00ffff;
      font-family: "Courier New", monospace;
      text-align: center;
      z-index: 1000;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.5), 0 0 30px rgba(255, 0, 255, 0.3);
      animation: neonPulse 2s infinite alternate;
    }
    .npc-dialog-header {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 15px;
    }
    .npc-photo {
      width: 80px;
      height: 80px;
      border: 2px solid #ff00ff;
      border-radius: 50%;
      margin-right: 15px;
      box-shadow: 0 0 15px rgba(255, 0, 255, 0.5);
      object-fit: cover;
    }
    .npc-title {
      color: #00ffff;
      font-size: 24px;
      text-shadow: 0 0 5px #00ffff, 0 0 10px #ff00ff;
      animation: flicker 1.5s infinite alternate;
      margin: 0;
    }
    .npc-text {
      margin: 15px 0;
      font-size: 16px;
      text-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
      line-height: 1.4;
    }
    .quest-list {
      max-height: 250px;
      overflow-y: auto;
      margin-top: 15px;
      background: rgba(10, 10, 10, 0.9);
      border: 1px solid #ff00ff;
      border-radius: 5px;
      padding: 10px;
      box-shadow: inset 0 0 10px rgba(255, 0, 255, 0.3);
      scrollbar-width: thin;
      scrollbar-color: #ff00ff rgba(0, 0, 0, 0.5);
    }
    .quest-list::-webkit-scrollbar {
      width: 8px;
    }
    .quest-list::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.7);
      border-radius: 4px;
    }
    .quest-list::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #00ffff, #ff00ff);
      border-radius: 4px;
      box-shadow: 0 0 10px rgba(255, 0, 255, 0.7);
    }
    .quest-item {
      background: rgba(0, 0, 0, 0.85);
      padding: 12px;
      margin: 8px 0;
      cursor: pointer;
      border: 1px solid #00ffff;
      border-radius: 5px;
      color: #00ffff;
      font-size: 14px;
      text-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
      box-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
      transition: all 0.3s ease;
      position: relative;
      display: flex;
      align-items: center;
    }
    .quest-item:hover {
      background: rgba(0, 255, 255, 0.15);
      border-color: #ff00ff;
      box-shadow: 0 0 15px rgba(255, 0, 255, 0.7);
      transform: translateX(5px);
    }
    .quest-marker {
      color: #ff00ff;
      font-weight: bold;
      margin-right: 10px;
      font-size: 16px;
    }
    .quest-reward {
      color: #ff00ff;
      font-size: 12px;
      margin-left: 10px;
    }
    .neon-btn {
      padding: 12px 24px;
      font-size: 16px;
      font-family: "Courier New", monospace;
      background: linear-gradient(135deg, #00ffff, #ff00ff);
      border: none;
      color: #000;
      border-radius: 5px;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.7), 0 0 20px rgba(255, 0, 255, 0.5);
      transition: all 0.3s;
      text-transform: uppercase;
    }
    .neon-btn:hover {
      box-shadow: 0 0 20px rgba(0, 255, 255, 1), 0 0 30px rgba(255, 0, 255, 0.7);
      transform: scale(1.05);
    }
    @keyframes neonPulse {
      0% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(255, 0, 255, 0.3); }
      100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.8), 0 0 30px rgba(255, 0, 255, 0.5); }
    }
    @keyframes flicker {
      0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; text-shadow: 0 0 5px #00ffff, 0 0 10px #ff00ff; }
      20%, 24%, 55% { opacity: 0.7; text-shadow: 0 0 2px #00ffff, 0 0 5px #ff00ff; }
    }
    @media (max-width: 500px) {
      .npc-dialog { max-width: 90%; padding: 15px; }
      .npc-photo { width: 60px; height: 60px; }
      .npc-title { font-size: 20px; }
      .npc-text { font-size: 14px; }
      .quest-list { max-height: 200px; }
      .quest-item { padding: 10px; font-size: 12px; }
      .neon-btn { padding: 10px 20px; font-size: 14px; }
    }
  `;
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = npcStyles;
  document.head.appendChild(styleSheet);

  requestAnimationFrame(gameLoop);
}

// Функция переключения инвентаря
function toggleInventory() {
  isInventoryOpen = !isInventoryOpen;
  const inventoryContainer = document.getElementById("inventoryContainer");
  inventoryContainer.style.display = isInventoryOpen ? "grid" : "none";
  if (isInventoryOpen) updateInventoryDisplay();
  const inventoryBtn = document.getElementById("inventoryBtn");
  inventoryBtn.classList.toggle("active", isInventoryOpen);

  if (!isInventoryOpen) {
    const screen = document.getElementById("inventoryScreen");
    screen.innerHTML = "";
    selectedSlot = null;
    const useBtn = document.getElementById("useBtn");
    const dropBtn = document.getElementById("dropBtn");
    useBtn.textContent = "Использовать";
    useBtn.disabled = true;
    dropBtn.disabled = true;
  }
}

// Выбрать слот и показать кнопки
function selectSlot(slotIndex, slotElement) {
  if (!inventory[slotIndex]) return;
  console.log(
    `Выбран слот ${slotIndex}, предмет: ${inventory[slotIndex].type}`
  );
  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  if (selectedSlot === slotIndex) {
    selectedSlot = null;
    screen.innerHTML = "";
    useBtn.textContent = "Использовать"; // Возвращаем текст
    useBtn.disabled = true;
    dropBtn.disabled = true;
    return;
  }

  selectedSlot = slotIndex;
  // Если ранее была форма "Баляр", убираем её и показываем описание
  screen.textContent = ITEM_CONFIG[inventory[slotIndex].type].description;
  useBtn.textContent = "Использовать"; // Сбрасываем текст
  useBtn.disabled = inventory[slotIndex].type === "balyary"; // Отключаем для "Баляр"
  dropBtn.disabled = false;
}

// Скрыть кнопки действий
function hideActionButtons() {
  document.querySelectorAll(".action-btn").forEach((btn) => btn.remove());
}

// Использовать предмет
function useItem(slotIndex) {
  const item = inventory[slotIndex];
  if (!item || item.type === "balyary") return; // Ничего не делаем для Баляр
  const me = players.get(myId);
  const effect = ITEM_CONFIG[item.type].effect;

  if (effect.health)
    me.health = Math.min(100, Math.max(0, me.health + effect.health));
  if (effect.energy)
    me.energy = Math.min(100, Math.max(0, me.energy + effect.energy));
  if (effect.food) me.food = Math.min(100, Math.max(0, me.food + effect.food));
  if (effect.water)
    me.water = Math.min(100, Math.max(0, me.water + effect.water));

  inventory[slotIndex] = null;

  sendWhenReady(
    ws,
    JSON.stringify({
      type: "useItem",
      slotIndex,
      health: me.health,
      energy: me.energy,
      food: me.food,
      water: me.water,
    })
  );

  selectedSlot = null;
  document.getElementById("useBtn").disabled = true;
  document.getElementById("dropBtn").disabled = true;
  document.getElementById("inventoryScreen").textContent = "";
  updateStatsDisplay();
  updateInventoryDisplay();
}

// Выкинуть предмет
function dropItem(slotIndex) {
  const item = inventory[slotIndex];
  if (!item) return;
  const me = players.get(myId);
  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  if (item.type === "balyary") {
    // Логика для "Баляр" с формой ввода количества
    screen.innerHTML = `
      <div class="balyary-drop-form">
        <p class="cyber-text">Сколько выкинуть?</p>
        <input type="number" id="balyaryAmount" class="cyber-input" min="1" max="${
          item.quantity || 1
        }" placeholder="0" value="" autofocus />
        <p id="balyaryError" class="error-text"></p>
      </div>
    `;
    const input = document.getElementById("balyaryAmount");
    const errorEl = document.getElementById("balyaryError");

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    input.addEventListener("input", () => {
      console.log("Ввод в balyaryAmount:", input.value);
      input.value = input.value.replace(/[^0-9]/g, "");
      if (input.value === "") input.value = "";
    });

    useBtn.textContent = "Подтвердить";
    useBtn.disabled = false;
    dropBtn.disabled = true;

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmDrop();
      }
    });

    useBtn.onclick = (e) => {
      e.preventDefault();
      confirmDrop();
    };

    function confirmDrop() {
      const amount = parseInt(input.value) || 0;
      const currentQuantity = item.quantity || 1;

      if (amount <= 0) {
        errorEl.textContent = "Введи нормальное число, братишка!";
        return;
      }

      if (amount > currentQuantity) {
        errorEl.textContent = "Не хватает Баляр!";
        return;
      }

      sendWhenReady(
        ws,
        JSON.stringify({
          type: "dropItem",
          slotIndex,
          x: me.x,
          y: me.y,
          quantity: amount,
        })
      );

      if (amount === currentQuantity) {
        inventory[slotIndex] = null;
      } else {
        inventory[slotIndex].quantity -= amount;
      }

      useBtn.textContent = "Использовать";
      useBtn.disabled = true;
      dropBtn.disabled = true;
      useBtn.onclick = () => useItem(slotIndex);
      selectedSlot = null;
      screen.innerHTML = "";
      updateInventoryDisplay();
    }
  } else {
    // Логика для остальных предметов: выкидываем один предмет
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "dropItem",
        slotIndex,
        x: me.x,
        y: me.y,
        quantity: 1, // Выкидываем ровно один предмет
      })
    );

    // Очищаем слот инвентаря
    inventory[slotIndex] = null;

    // Сбрасываем выбранный слот и кнопки
    selectedSlot = null;
    useBtn.disabled = true;
    dropBtn.disabled = true;
    screen.innerHTML = "";
    updateInventoryDisplay();
  }
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

function updateInventoryDisplay() {
  const inventoryGrid = document.getElementById("inventoryGrid");
  const slots = inventoryGrid.children;
  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  // Проверяем, была ли уже показана форма выброса "Баляр"
  const isBalyaryFormActive =
    selectedSlot !== null &&
    inventory[selectedSlot] &&
    inventory[selectedSlot].type === "balyary" &&
    screen.querySelector(".balyary-drop-form");

  if (isBalyaryFormActive) {
    // Сохраняем форму, если выбраны "Баляры" и форма уже есть
    // Ничего не делаем с содержимым экрана
  } else if (selectedSlot === null) {
    screen.innerHTML = "";
  } else if (inventory[selectedSlot]) {
    screen.textContent = ITEM_CONFIG[inventory[selectedSlot].type].description;
  }

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    slot.innerHTML = "";
    if (inventory[i]) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[inventory[i].type].image.src;
      img.style.width = "100%";
      img.style.height = "100%";
      slot.appendChild(img);

      if (inventory[i].type === "balyary" && inventory[i].quantity > 1) {
        const quantityEl = document.createElement("div");
        quantityEl.textContent = inventory[i].quantity;
        quantityEl.style.position = "absolute";
        quantityEl.style.top = "0";
        quantityEl.style.right = "0";
        quantityEl.style.color = "#00ffff";
        quantityEl.style.fontSize = "14px";
        quantityEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
        slot.appendChild(quantityEl);
      }

      slot.onmouseover = () => {
        if (inventory[i] && selectedSlot !== i) {
          if (
            inventory[selectedSlot] &&
            inventory[selectedSlot].type === "balyary" &&
            screen.querySelector(".balyary-drop-form")
          ) {
            // Сохраняем форму выброса "Баляр" при наведении на другие слоты
            return;
          }
          screen.textContent = ITEM_CONFIG[inventory[i].type].description;
        }
      };
      slot.onmouseout = () => {
        if (
          selectedSlot === null ||
          (inventory[selectedSlot] &&
            inventory[selectedSlot].type === "balyary" &&
            screen.querySelector(".balyary-drop-form"))
        ) {
          // Ничего не очищаем, если форма "Баляр" активна
          return;
        }
        screen.textContent =
          inventory[selectedSlot] && selectedSlot !== null
            ? ITEM_CONFIG[inventory[selectedSlot].type].description
            : "";
      };
      slot.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`Клик по слоту ${i}, предмет: ${inventory[i].type}`);
        selectSlot(i, slot);
      };

      img.style.pointerEvents = "none";
    } else {
      slot.onmouseover = null;
      slot.onmouseout = null;
      slot.onclick = null;
    }
  }
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
          if (data.item.type === "balyary") {
            const balyarySlot = inventory.findIndex(
              (slot) => slot && slot.type === "balyary"
            );
            if (balyarySlot !== -1) {
              inventory[balyarySlot].quantity =
                (inventory[balyarySlot].quantity || 1) + 1;
              console.log(
                `Добавлено 1 Баляр, теперь их ${inventory[balyarySlot].quantity}`
              );
            } else {
              const freeSlot = inventory.findIndex((slot) => slot === null);
              if (freeSlot !== -1) {
                inventory[freeSlot] = {
                  type: "balyary",
                  quantity: 1,
                  itemId: data.itemId,
                };
                console.log(
                  `Баляры добавлены в слот ${freeSlot}, количество: 1`
                );
              }
            }
          } else {
            const freeSlot = inventory.findIndex((slot) => slot === null);
            if (freeSlot !== -1) {
              inventory[freeSlot] = data.item;
              console.log(
                `Предмет ${data.item.type} добавлен в слот ${freeSlot}`
              );
            }
          }
          updateInventoryDisplay();
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
        pendingPickups.delete(data.itemId);
        break;
      case "update":
        const existingPlayer = players.get(data.player.id);
        players.set(data.player.id, {
          ...existingPlayer,
          ...data.player,
          frameTime: existingPlayer.frameTime || 0,
        });
        if (data.player.id === myId) {
          inventory = data.player.inventory || inventory;
          setNPCMet(data.player.npcMet || false);
          levelSystem.setLevelData(
            data.player.level || 0,
            data.player.xp || 0,
            data.player.maxStats || levelSystem.maxStats,
            data.player.upgradePoints || 0
          );
          updateStatsDisplay(); // Добавьте здесь
          updateInventoryDisplay();
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
        updateInventoryDisplay();
        break;
      case "chat":
        const messageEl = document.createElement("div");
        messageEl.textContent = `${data.id}: ${data.message}`;
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        break;
      case "shoot":
        console.log(`Получена пуля ${data.bulletId} от ${data.shooterId}`);
        bullets.set(data.bulletId, {
          x: data.x,
          y: data.y,
          dx: data.dx,
          dy: data.dy,
          spawnTime: Date.now(),
          life: GAME_CONFIG.BULLET_LIFE,
          shooterId: data.shooterId,
        });
        break;
      case "bulletRemoved":
        bullets.delete(data.bulletId);
        console.log(`Пуля ${data.bulletId} удалена`);
        break;
      case "buyWaterResult":
        if (data.success) {
          const me = players.get(myId);
          me.water = data.water;
          inventory = data.inventory;
          updateStatsDisplay();
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

// Адаптация размеров канваса
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight; // 100% высоты
  updateCamera();
}

// Обновление камеры
function updateCamera() {
  const me = players.get(myId);
  if (!me) return;
  camera.x = me.x - canvas.width / 2;
  camera.y = me.y - canvas.height / 2;
  camera.x = Math.max(0, Math.min(camera.x, worldWidth - canvas.width));
  camera.y = Math.max(0, Math.min(camera.y, worldHeight - canvas.height));
}

function shoot() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  if (ws.readyState !== WebSocket.OPEN) {
    console.error("WebSocket не открыт. Пытаемся переподключиться...");
    reconnectWebSocket();
    return;
  }

  let dx = 0,
    dy = 0;
  switch (me.direction) {
    case "up":
      dy = -1;
      break;
    case "down":
      dy = 1;
      break;
    case "left":
      dx = -1;
      break;
    case "right":
      dx = 1;
      break;
  }
  const magnitude = Math.sqrt(dx * dx + dy * dy);
  if (magnitude !== 0) {
    dx = (dx / magnitude) * GAME_CONFIG.BULLET_SPEED;
    dy = (dy / magnitude) * GAME_CONFIG.BULLET_SPEED;
  }
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "shoot",
      x: me.x + 20,
      y: me.y + 20,
      dx: dx,
      dy: dy,
    })
  );
}

function update(deltaTime) {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  if (isMoving) {
    npcSystem.checkNPCProximity();
    npcSystem.checkQuestCompletion();
    window.vendingMachine.checkProximity();

    const dx = targetX - me.x;
    const dy = targetY - me.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      const moveSpeed = GAME_CONFIG.PLAYER_SPEED * (deltaTime / 1000);
      const moveX = (dx / distance) * moveSpeed;
      const moveY = (dy / distance) * moveSpeed;

      const prevX = me.x;
      const prevY = me.y;

      me.x += moveX;
      me.y += moveY;

      me.x = Math.max(0, Math.min(worldWidth - 40, me.x));
      me.y = Math.max(0, Math.min(worldHeight - 40, me.y));

      if (checkCollision(me.x, me.y)) {
        me.x = prevX;
        me.y = prevY;
        me.state = "idle";
        me.frame = 0;
        me.frameTime = 0;
        isMoving = false; // Останавливаем движение
      } else {
        me.state = "walking";
        if (Math.abs(dx) > Math.abs(dy)) {
          me.direction = dx > 0 ? "right" : "left";
        } else {
          me.direction = dy > 0 ? "down" : "up";
        }

        const traveled = Math.sqrt(
          Math.pow(me.x - prevX, 2) + Math.pow(me.y - prevY, 2)
        );
        me.distanceTraveled = (me.distanceTraveled || 0) + traveled;

        me.frameTime += deltaTime;
        if (me.frameTime >= GAME_CONFIG.FRAME_DURATION / 7) {
          me.frameTime -= GAME_CONFIG.FRAME_DURATION / 7;
          me.frame = (me.frame + 1) % 7;
        }

        updateResources();
        updateCamera();
        checkCollisions();
        checkNPCProximity(); // Проверка близости к NPC
        checkQuestCompletion(); // Проверка выполнения заданий
      }

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
    } else {
      me.state = "idle";
      me.frame = 0;
      me.frameTime = 0;
      isMoving = false;
      ws.send(
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
  } else if (me.state === "dying") {
    me.frameTime += deltaTime;
    if (me.frameTime >= GAME_CONFIG.FRAME_DURATION / 7) {
      me.frameTime -= GAME_CONFIG.FRAME_DURATION / 7;
      if (me.frame < 6) me.frame += 1;
    }
    ws.send(
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

  // Обновление пуль
  bullets.forEach((bullet, bulletId) => {
    bullet.x += bullet.dx * (deltaTime / 1000);
    bullet.y += bullet.dy * (deltaTime / 1000);

    const currentTime = Date.now();
    if (currentTime - bullet.spawnTime > bullet.life) {
      bullets.delete(bulletId);
    }

    if (checkBulletCollision(bullet)) {
      bullets.delete(bulletId);
    }
  });

  // Удаление предметов по таймауту (без изменений)
  const currentTime = Date.now();
  items.forEach((item, itemId) => {
    const screenX = item.x - camera.x;
    const screenY = item.y - camera.y;
    if (
      screenX >= -40 &&
      screenX <= canvas.width + 40 &&
      screenY >= -40 &&
      screenY <= canvas.height + 40
    ) {
      const itemImage = ITEM_CONFIG[item.type]?.image;
      if (itemImage && itemImage.complete) {
        ctx.drawImage(itemImage, screenX, screenY, 40, 40);
      } else {
        console.warn(
          `Изображение для ${item.type} не загружено, рисую заглушку`
        );
        ctx.fillStyle = "yellow";
        ctx.fillRect(screenX, screenY, 10, 10);
      }
    }
  });
}

function draw(deltaTime) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(10, 20, 40, 0.8)"; // Ночной эффект
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  obstacles.forEach((obstacle) => {
    if (obstacle.isLine) {
      const startX = obstacle.x1 - camera.x;
      const startY = obstacle.y1 - camera.y;
      const endX = obstacle.x2 - camera.x;
      const endY = obstacle.y2 - camera.y;
      if (
        (startX > 0 || endX > 0) &&
        (startX < canvas.width || endX < canvas.width) &&
        (startY > 0 || endY > 0) &&
        (startY < canvas.height || endY < canvas.height)
      ) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = obstacle.thickness;
        ctx.strokeStyle = "rgba(255, 0, 150, 0.5)";
        ctx.stroke();
      }
    }
  });

  bullets.forEach((bullet) => {
    const screenX = bullet.x - camera.x;
    const screenY = bullet.y - camera.y;
    console.log(`Отрисовка пули ${bullet.id} на x:${screenX}, y:${screenY}`);
    drawBullet(screenX, screenY);
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

function drawBullet(x, y) {
  const gradient = ctx.createRadialGradient(x, y, 2, x, y, 5);
  gradient.addColorStop(0, "rgb(0, 75, 75)");
  gradient.addColorStop(1, "rgba(0, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function checkCollisions() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  items.forEach((item, id) => {
    // Проверяем, существует ли предмет и не отправляли ли мы уже запрос
    if (!items.has(id)) {
      console.log(`Предмет ${id} уже удалён из items, пропускаем`);
      return;
    }
    if (pendingPickups.has(id)) {
      console.log(
        `Предмет ${id} в процессе поднятия (pendingPickups), пропускаем`
      );
      return;
    }
    // Центр предмета теперь смещён, так как размер 20x20
    const dx = me.x + 20 - (item.x + 10);
    const dy = me.y + 20 - (item.y + 10);
    const distance = Math.sqrt(dx * dx + dy * dy);
    console.log(
      `Проверка столкновения с ${item.type} (ID: ${id}), расстояние: ${distance}`
    );
    if (distance < 30) {
      // Уменьшено с 40 до 30
      console.log(
        `Игрок ${myId} пытается подобрать предмет ${item.type} (ID: ${id})`
      );
      if (ws.readyState === WebSocket.OPEN) {
        pendingPickups.add(id);
        sendWhenReady(ws, JSON.stringify({ type: "pickup", itemId: id }));
        console.log(`Отправлено сообщение pickup для ${id}`);
      } else {
        console.error("WebSocket не открыт, предмет не отправлен на сервер");
      }
    }
  });
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
let imagesLoaded = 0;
function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === 23) window.addEventListener("resize", resizeCanvas);
}
