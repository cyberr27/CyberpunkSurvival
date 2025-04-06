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
let wolves = new Map();
const items = new Map();
const lights = [];
const obstacles = [];
const bullets = new Map();
// Глобальные настройки игры
const GAME_CONFIG = {
  PLAYER_SPEED: 100,
  FRAME_DURATION: 8000,
  BULLET_SPEED: 500,
  BULLET_LIFE: 2000,
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
const wolfSprite = new Image();
wolfSprite.src = "wolfSprite.png";
const energyDrinkImage = new Image();
energyDrinkImage.src = "energy_drink.png";
const nutImage = new Image();
nutImage.src = "nut.png";
const waterBottleImage = new Image();
waterBottleImage.src = "water_bottle.png";

// Добавляем проверку загрузки
energyDrinkImage.onload = () => {
  console.log("Энергетик загружен");
  onImageLoad();
};
energyDrinkImage.onerror = () => console.error("Ошибка загрузки энергетика");
nutImage.onload = () => {
  console.log("Орех загружен");
  onImageLoad();
};
nutImage.onerror = () => console.error("Ошибка загрузки ореха");
waterBottleImage.onload = () => {
  console.log("Вода загружена");
  onImageLoad();
};
waterBottleImage.onerror = () => console.error("Ошибка загрузки воды");

const ITEM_CONFIG = {
  energy_drink: { effect: { energy: 20 }, image: energyDrinkImage },
  nut: { effect: { food: 27 }, image: nutImage },
  water_bottle: { effect: { water: 30 }, image: waterBottleImage },
};

// Размеры мира
const worldWidth = 2800;
const worldHeight = 3300;

// Камера
const camera = { x: 0, y: 0 };

createLight(2404, 1693, "rgba(0, 255, 255, 0.7)", 1500); // Голубой неон
createLight(1710, 0, "rgba(255, 0, 255, 0.7)", 1200); // Розовый неон
createLight(934, 1793, "rgba(148, 0, 211, 0.7)", 1200); // Фиолетовый неон
createLight(1164, 2843, "rgba(255, 0, 255, 0.7)", 800); // Розовый неон
createLight(364, 3093, "rgba(214, 211, 4, 0.5)", 700);
createLight(434, 2653, "rgba(214, 211, 4, 0.5)", 700);
createLight(264, 1173, "rgba(214, 211, 4, 0.7)", 1500);
createLight(374, 483, "rgba(245, 5, 17, 0.7)", 1000);
createLight(924, 943, "rgba(2, 35, 250, 0.4)", 800);
createLight(1454, 110, "rgba(2, 35, 250, 0.4)", 800);

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
      "Достигнуто максимальное количество попыток переподключения."
    );
    alert(
      "Потеряно соединение с сервером. Пожалуйста, перезагрузите страницу."
    );
    return;
  }

  console.log(`Попытка переподключения ${reconnectAttempts + 1}...`);
  ws = new WebSocket("wss://cyberpunksurvival.onrender.com");

  ws.onopen = () => {
    console.log("WebSocket успешно переподключен");
    reconnectAttempts = 0;
    // Повторная авторизация, если нужно
    const username =
      document.getElementById("loginUsername")?.value.trim() || myId;
    const password = document.getElementById("loginPassword")?.value.trim();
    if (username && password) {
      ws.send(JSON.stringify({ type: "login", username, password }));
    }
    ws.onmessage = handleAuthMessage; // Восстанавливаем обработчик авторизации
  };

  ws.onerror = (error) => {
    console.error("Ошибка при переподключении WebSocket:", error);
  };

  ws.onclose = () => {
    console.log("WebSocket соединение закрыто, повторная попытка...");
    reconnectAttempts++;
    setTimeout(reconnectWebSocket, reconnectDelay);
  };
}

// Инициализация WebSocket
function initializeWebSocket() {
  ws = new WebSocket("wss://cyberpunksurvival.onrender.com");
  ws.onopen = () => {
    console.log("WebSocket соединение установлено");
  };
  ws.onmessage = handleAuthMessage;
  ws.onerror = (error) => {
    console.error("Ошибка WebSocket:", error);
  };
  ws.onclose = () => {
    console.log("WebSocket соединение закрыто");
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
    ws.send(JSON.stringify({ type: "register", username, password }));
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
    ws.send(JSON.stringify({ type: "login", username, password }));
  } else {
    loginError.textContent = "Нет соединения с сервером";
  }
});

function handleAuthMessage(event) {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case "registerSuccess":
      registerError.textContent = "Регистрация успешна! Войдите.";
      registerForm.style.display = "none";
      loginForm.style.display = "block";
      break;
    case "registerFail":
      registerError.textContent = "Ник занят, выберите другой";
      break;
    case "loginSuccess":
      myId = data.id;
      authContainer.style.display = "none";
      document.getElementById("gameContainer").style.display = "block";
      data.players.forEach((p) => players.set(p.id, p));
      lastDistance = players.get(myId).distanceTraveled || 0;
      // Отрисовка локальных пуль
      bullets.forEach((bullet) => {
        drawBullet(bullet.x - camera.x, bullet.y - camera.y);
      });
      data.wolves.forEach((w) => wolves.set(w.id, w));
      // Было: data.obstacles.forEach((o) => obstacles.set(o.id, o));
      // Стало: присваиваем массив напрямую
      data.obstacles.forEach((o) => obstacles.push(o));
      if (data.lights) {
        lights.length = 0; // Очищаем локальный массив
        data.lights.forEach((light) => lights.push(light));
      }
      resizeCanvas();
      ws.onmessage = handleGameMessage;
      startGame();
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

function startGame() {
  // Обработчик клавиш (только для стрельбы и чата)
  document.addEventListener("keydown", (e) => {
    if (document.activeElement === chatInput) return;
    const me = players.get(myId);
    if (!me || me.health <= 0) return;

    switch (e.key) {
      case " ":
        shoot();
        break;
      case "c":
        const isChatVisible = chatContainer.style.display === "flex";
        chatContainer.style.display = isChatVisible ? "none" : "flex";
        if (!isChatVisible) chatInput.focus();
        else chatInput.blur();
        break;
    }
    e.preventDefault();
  });

  // Обработчик нажатия мыши
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      // Только левая кнопка мыши
      const me = players.get(myId);
      if (!me || me.health <= 0) return;

      isMoving = true;
      // Переводим координаты клика из экранных в мировые
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
    }
  });

  // Обработчик тач-событий для мобильных устройств
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const me = players.get(myId);
    if (!me || me.health <= 0) return;

    const touch = e.touches[0];
    isMoving = true;
    targetX = touch.clientX + camera.x;
    targetY = touch.clientY + camera.y;
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
      ws.send(
        JSON.stringify({ type: "chat", message: chatInput.value.trim() })
      );
      chatInput.value = "";
    }
  });

  requestAnimationFrame(gameLoop);
}

// Логика расхода ресурсов
function updateResources() {
  const me = players.get(myId);
  if (!me) return;

  const distance = Math.floor(me.distanceTraveled || 0);
  console.log(
    `Before: Health: ${me.health}, Energy: ${me.energy}, Food: ${me.food}, Water: ${me.water}, Distance: ${distance}`
  );

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
  console.log(
    `After: Health: ${me.health}, Energy: ${me.energy}, Food: ${me.food}, Water: ${me.water}`
  );
  updateStatsDisplay();
}

function updateStatsDisplay() {
  const me = players.get(myId);
  if (!me) return;
  statsEl.innerHTML = `
    <span class="health">Здоровье: ${me.health}</span><br>
    <span class="energy">Энергия: ${me.energy}</span><br>
    <span class="food">Еда: ${me.food}</span><br>
    <span class="water">Вода: ${me.water}</span><br>
    <span class="armor">Броня: ${me.armor}</span>
  `;
  document.getElementById("coords").innerHTML = `X: ${Math.floor(
    me.x
  )}<br>Y: ${Math.floor(me.y)}`;
}

function handleGameMessage(event) {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case "update":
      const existingPlayer = players.get(data.player.id);
      players.set(data.player.id, {
        ...existingPlayer,
        ...data.player,
        frameTime: existingPlayer.frameTime || 0,
      });
      if (data.player.id === myId) updateStatsDisplay();
      break;
    case "chat":
      const messageEl = document.createElement("div");
      messageEl.textContent = `${data.id}: ${data.message}`;
      chatMessages.appendChild(messageEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      break;
    case "newPlayer":
      players.set(data.player.id, { ...data.player, frameTime: 0 });
      break;
    case "playerLeft":
      players.delete(data.id);
      break;
    case "shoot":
      bullets.set(data.bulletId, {
        x: data.x,
        y: data.y,
        dx: data.dx,
        dy: data.dy,
        spawnTime: Date.now(),
        life: GAME_CONFIG.BULLET_LIFE, // Используем значение из конфига
        shooterId: data.shooterId,
      });
      break;
    case "newItem":
      items.set(data.itemId, {
        x: data.x,
        y: data.y,
        type: data.type,
        spawnTime: data.spawnTime,
      });
      break;
    case "itemPicked":
      items.delete(data.itemId);
      updateStatsDisplay();
      break;
    case "bulletRemoved":
      bullets.delete(data.bulletId);
      break;
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
  ws.send(
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
          me.frameTime = 0;
          me.frame = (me.frame + 1) % 7;
        }

        updateResources();
        updateCamera();
        checkCollisions();
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
      me.frameTime = 0;
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

  // Удаление предметов, которые не подняли через 10 минут
  const currentTime = Date.now();
  items.forEach((item, itemId) => {
    if (currentTime - item.spawnTime > 10 * 60 * 1000) {
      // 10 минут в миллисекундах
      items.delete(itemId);
      console.log(`Предмет ${item.type} (${itemId}) исчез из-за таймаута`);
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

  ctx.fillStyle = ctx.createPattern(backgroundImage, "repeat");
  ctx.save();
  ctx.translate(-groundOffsetX, -camera.y * groundSpeed);
  ctx.fillRect(groundOffsetX, camera.y * groundSpeed, worldWidth, worldHeight);
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

  players.forEach((player) => {
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    if (player.id !== myId) {
      if (player.state === "walking") {
        player.frameTime += deltaTime;
        if (player.frameTime >= GAME_CONFIG.FRAME_DURATION / 7) {
          player.frameTime = 0;
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

    let spriteX = player.frame * 40; // Каждый кадр шириной 40px
    let spriteY =
      player.state === "dying"
        ? 160 // Строка смерти
        : { up: 0, down: 40, left: 80, right: 120 }[player.direction] || 40; // Исправляем направления

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

  wolves.forEach((wolf) => {
    const screenX = wolf.x - camera.x;
    const screenY = wolf.y - camera.y;
    let spriteX = wolf.frame * 40;
    let spriteY =
      wolf.state === "dying"
        ? 160
        : { up: 0, down: 40, left: 80, right: 120 }[wolf.direction] || 40;
    ctx.drawImage(
      wolfSprite,
      spriteX,
      spriteY,
      40,
      40,
      screenX,
      screenY,
      15,
      15
    );
  });

  items.forEach((item) => {
    const screenX = item.x - camera.x;
    const screenY = item.y - camera.y;
    const itemImage = ITEM_CONFIG[item.type]?.image;
    if (itemImage) {
      ctx.drawImage(itemImage, screenX, screenY, 40, 40);
    } else {
      // Запасной вариант, если изображение не загрузилось
      ctx.fillStyle = "yellow";
      ctx.fillRect(screenX, screenY, 10, 10);
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

  // Опционально: визуальные подсказки зон для мобильных (раскомментируй, если нужно)
  /*
  if (window.innerWidth <= 500) {
    ctx.fillStyle = "rgba(0, 255, 255, 0.1)"; // Левая зона (движение)
    ctx.fillRect(0, 0, canvas.width / 2, canvas.height);
    ctx.fillStyle = "rgba(255, 0, 255, 0.1)"; // Правая зона (выстрел)
    ctx.fillRect(canvas.width / 2, 0, canvas.width / 2, canvas.height);
  }
  */
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
    const distance = Math.sqrt(
      Math.pow(me.x + 20 - item.x - 20, 2) +
        Math.pow(me.y + 20 - item.y - 20, 2)
    );
    if (distance < 40) {
      // 40 — размер предмета/игрока
      const effect = ITEM_CONFIG[item.type]?.effect;
      if (effect) {
        console.log(`Подбираем ${item.type} с эффектом:`, effect);
        if (effect.health) me.health = Math.min(100, me.health + effect.health);
        if (effect.energy) me.energy = Math.min(100, me.energy + effect.energy);
        if (effect.food) me.food = Math.min(100, me.food + effect.food);
        if (effect.water) me.water = Math.min(100, me.water + effect.water);
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({ type: "pickup", itemId: id, item: item.type })
        );
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
  if (imagesLoaded === 9) window.addEventListener("resize", resizeCanvas);
}
backgroundImage.onload = onImageLoad;
vegetationImage.onload = onImageLoad;
rocksImage.onload = onImageLoad;
cloudsImage.onload = onImageLoad;
playerSprite.onload = onImageLoad;
wolfSprite.onload = onImageLoad;
energyDrinkImage.onload = onImageLoad;
nutImage.onload = onImageLoad;
waterBottleImage.onload = onImageLoad;
energyDrinkImage.onload = () => { console.log("Энергетик загружен"); onImageLoad(); };
energyDrinkImage.onerror = () => console.error("Ошибка загрузки энергетика");
nutImage.onload = () => { console.log("Орех загружен"); onImageLoad(); };
nutImage.onerror = () => console.error("Ошибка загрузки ореха");
waterBottleImage.onload = () => { console.log("Вода загружена"); onImageLoad(); };
waterBottleImage.onerror = () => console.error("Ошибка загрузки воды");

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
