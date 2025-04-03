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
let wolves = new Map();
let myId;
const items = new Map();
const lights = [];
const obstacles = [];
const bullets = new Map(); // Изменяем на Map для синхронизации с сервером

// Добавляем переменные для управления анимацией
let lastTime = 0; // Время последнего кадра для расчета deltaTime
const frameDuration = 300; // Длительность одного кадра в миллисекундах (настраиваемая скорость анимации)

createLineObstacle(1590, 1510, 1830, 1725);
createLineObstacle(1830, 1725, 2100, 1515);
createLineObstacle(2100, 1515, 1895, 1410);
createLineObstacle(1895, 1410, 1590, 1510);

createLineObstacle(1460, 490, 1630, 620);
createLineObstacle(1630, 620, 1820, 500);
createLineObstacle(1820, 500, 1640, 405);
createLineObstacle(1640, 405, 1460, 490);

createLineObstacle(2125, 930, 2260, 1080);
createLineObstacle(2260, 1080, 2395, 915);
createLineObstacle(2395, 915, 2290, 825);
createLineObstacle(2290, 825, 2125, 930);

createLineObstacle(1640, 2530, 1355, 2720);
createLineObstacle(1355, 2720, 1065, 2520);
createLineObstacle(1065, 2520, 1290, 2435);
createLineObstacle(1290, 2435, 1640, 2530);

createLight(1700, 1600, "rgba(0, 255, 255, 0.7)", 1000); // Голубой неон
createLight(2000, 1000, "rgba(255, 0, 255, 0.7)", 1000); // Розовый неон
createLight(1400, 2600, "rgba(148, 0, 211, 0.7)", 1000); // Фиолетовый неон

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

// Управление клавишами и кнопками
const controls = {
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
};

// Размеры мира
const worldWidth = 2800;
const worldHeight = 3300;

// Камера
const camera = { x: 0, y: 0 };

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
      document.body.style.background = "url(body2) center no-repeat";
      document.body.style.backgroundSize = "100% 100%";
      data.players.forEach((p) => players.set(p.id, p));
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

function startGame() {
  let isKeyPressed = false; // Флаг для отслеживания нажатия клавиши

  document.addEventListener("keydown", (e) => {
    if (document.activeElement === chatInput) return;
    const me = players.get(myId);
    if (!me || me.health <= 0 || isKeyPressed) return; // Проверяем флаг

    const speed = 5;
    let moved = false;

    switch (e.key) {
      case "ArrowUp":
      case "w":
        me.direction = "up";
        me.state = "walking";
        me.y = Math.max(0, me.y - speed);
        moved = true;
        break;
      case "ArrowDown":
      case "s":
        me.direction = "down";
        me.state = "walking";
        me.y = Math.min(worldHeight - 40, me.y + speed);
        moved = true;
        break;
      case "ArrowLeft":
      case "a":
        me.direction = "left";
        me.state = "walking";
        me.x = Math.max(0, me.x - speed);
        moved = true;
        break;
      case "ArrowRight":
      case "d":
        me.direction = "right";
        me.state = "walking";
        me.x = Math.min(worldWidth - 40, me.x + speed);
        moved = true;
        break;
      case " ":
        shoot();
        break;
    }

    if (moved && !checkCollision(me.x, me.y)) {
      isKeyPressed = true; // Устанавливаем флаг при успешном движении
      me.steps += 1;
      updateResources();

      me.frameTime += frameDuration;
      if (me.frameTime >= frameDuration) {
        me.frameTime = 0;
        me.frame = (me.frame + 1) % 7;
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
          steps: me.steps,
          direction: me.direction,
          state: me.state,
          frame: me.frame,
        })
      );
      updateCamera();
      checkCollisions();
    } else if (moved) {
      me.state = "idle";
      me.frame = 0;
      me.frameTime = 0;
    }

    e.preventDefault();
  });

  // Сбрасываем флаг при отпускании клавиши
  document.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "ArrowDown":
      case "s":
      case "ArrowLeft":
      case "a":
      case "ArrowRight":
      case "d":
        isKeyPressed = false;
        const me = players.get(myId);
        if (me) {
          me.state = "idle"; // Переводим в состояние покоя
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
              steps: me.steps,
              direction: me.direction,
              state: me.state,
              frame: me.frame,
            })
          );
        }
        break;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chatContainer.style.display === "flex") {
      chatContainer.style.display = "none";
      chatInput.blur();
    }
  });

  setupButton("upBtn", "up");
  setupButton("downBtn", "down");
  setupButton("leftBtn", "left");
  setupButton("rightBtn", "right");
  setupButton("shootBtn", "shoot"); // Используем setupButton для унификации

  chatBtn.addEventListener("click", () => {
    const isChatVisible = chatContainer.style.display === "flex";
    chatContainer.style.display = isChatVisible ? "none" : "flex";
    chatBtn.classList.toggle("active", !isChatVisible);
    if (!isChatVisible) {
      chatInput.focus();
    } else {
      chatInput.blur();
    }
  });

  chatBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const isChatVisible = chatContainer.style.display === "flex";
    chatContainer.style.display = isChatVisible ? "none" : "flex";
    if (!isChatVisible) {
      chatInput.focus();
    }
  });

  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && chatInput.value.trim()) {
      const message = chatInput.value.trim();
      ws.send(JSON.stringify({ type: "chat", message }));
      chatInput.value = "";
    }
  });

  chatInput.addEventListener("touchstart", (e) => {
    e.stopPropagation();
    chatInput.focus();
  });

  requestAnimationFrame(gameLoop);
}

function handleGameMessage(event) {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case "chat":
      const chatMessagesEl = document.getElementById("chatMessages");
      const messageEl = document.createElement("div");
      messageEl.textContent = `${data.id}: ${data.message}`;
      chatMessagesEl.appendChild(messageEl);
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight; // Прокрутка вниз
      break;
    case "newPlayer":
      players.set(data.player.id, { ...data.player, frameTime: 0 });
      break;
    case "update":
      const existingPlayer = players.get(data.player.id);
      players.set(data.player.id, {
        ...existingPlayer,
        ...data.player,
        frameTime: existingPlayer.frameTime || 0,
      });
      if (data.player.id === myId) updateStatsDisplay();
      break;
    case "playerLeft":
      players.delete(data.id);
      break;
    case "spawnWolf":
      wolves.set(data.wolf.id, data.wolf);
      break;
    case "shoot":
      bullets.set(data.bulletId, {
        x: data.x,
        y: data.y,
        dx: data.dx,
        dy: data.dy,
        spawnTime: Date.now(),
        life: 1000,
        shooterId: data.shooterId,
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
  canvas.width = window.innerWidth * 0.997;
  canvas.height = window.innerHeight * 0.75;
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

  // Отправляем выстрел на сервер, локально пулю не создаем
  ws.send(
    JSON.stringify({
      type: "shoot",
      x: me.x + 20,
      y: me.y + 20,
      dx: dx * 10,
      dy: dy * 10,
    })
  );
}

function update(deltaTime) {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  // Обновление пуль
  bullets.forEach((bullet, bulletId) => {
    bullet.x += bullet.dx * (deltaTime / 16);
    bullet.y += bullet.dy * (deltaTime / 16);
    if (
      checkBulletCollision(bullet) ||
      Date.now() - bullet.spawnTime > bullet.life
    ) {
      bullets.delete(bulletId); // Удаляем локально при столкновении или истечении времени
    }
  });

  // Обработка смерти
  if (me.health <= 0 && me.state !== "dying") {
    me.state = "dying";
    me.frame = 0;
    me.frameTime = 0;
  } else if (me.state === "dying") {
    me.frameTime += deltaTime;
    if (me.frameTime >= 200) {
      me.frameTime = 0;
      if (me.frame < 6) {
        me.frame += 1;
      }
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
        steps: me.steps,
        direction: me.direction,
        state: me.state,
        frame: me.frame,
      })
    );
  }
}

// Логика расхода ресурсов
function updateResources() {
  const me = players.get(myId);
  if (!me) return;
  if (me.steps % 100 === 0) me.energy = Math.max(0, me.energy - 1);
  if (me.steps % 50 === 0) me.food = Math.max(0, me.food - 1);
  if (me.steps % 25 === 0) me.water = Math.max(0, me.water - 1);
  if (
    (me.energy === 0 || me.food === 0 || me.water === 0) &&
    me.steps % 10 === 0
  ) {
    me.health = Math.max(0, me.health - 1);
  }
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
  const coordsEl = document.getElementById("coords");
  coordsEl.innerHTML = `X: ${Math.floor(me.x)}<br>Y: ${Math.floor(me.y)}`;
}

function draw(deltaTime) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Эффект ночи: тёмный полупрозрачный слой
  ctx.fillStyle = "rgba(10, 20, 40, 0.8)"; // Тёмно-синий с прозрачностью для киберпанк-стиля
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const groundSpeed = 1.0,
    vegetationSpeed = 0.8,
    rocksSpeed = 0.6,
    cloudsSpeed = 0.3;
  const groundOffsetX = camera.x * groundSpeed;
  const vegetationOffsetX = camera.x * vegetationSpeed;
  const rocksOffsetX = camera.x * rocksSpeed;
  const cloudsOffsetX = camera.x * cloudsSpeed;

  const pattern = ctx.createPattern(backgroundImage, "repeat");
  ctx.fillStyle = pattern;
  ctx.save();
  ctx.translate(-groundOffsetX, -camera.y * groundSpeed);
  ctx.fillRect(groundOffsetX, camera.y * groundSpeed, worldWidth, worldHeight);
  ctx.restore();

  // Отрисовка огней
  lights.forEach((light) => {
    const screenX = light.x - camera.x;
    const screenY = light.y - camera.y;

    // Проверяем, виден ли свет в области камеры
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
      gradient.addColorStop(0, light.color); // Яркий центр
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)"); // Прозрачная граница

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
        player.frameTime += deltaTime; // Используем deltaTime вместо фиксированного 16
        if (player.frameTime >= frameDuration) {
          player.frameTime = 0;
          player.frame = (player.frame + 1) % 7;
        }
      } else if (player.state === "dying") {
        player.frameTime += deltaTime;
        if (player.frameTime >= 200) {
          player.frameTime = 0;
          if (player.frame < 6) {
            player.frame += 1;
          }
        }
      } else {
        player.frame = 0;
        player.frameTime = 0;
      }
    }

    // Определяем координаты в спрайте
    let spriteX = player.frame * 40;
    let spriteY;
    if (player.state === "dying") {
      spriteY = 160;
    } else {
      const directionMap = {
        up: 0,
        down: 40,
        left: 80,
        right: 120,
      };
      spriteY = directionMap[player.direction];
      // Если direction некорректен, используем down как запасной вариант
      if (spriteY === undefined) {
        spriteY = 40;
      }
    }

    // Отрисовка спрайта
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

    // Отрисовка имени и HP
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(player.id, screenX + 20, screenY - 20);
    ctx.fillStyle = "red";
    ctx.fillRect(screenX, screenY - 15, 40, 5);
    ctx.fillStyle = "green";
    ctx.fillRect(screenX, screenY - 15, (player.health / 100) * 40, 5);
  });

  // Оставшиеся части функции draw() остаются без изменений
  wolves.forEach((wolf) => {
    const screenX = wolf.x - camera.x;
    const screenY = wolf.y - camera.y;
    let spriteX = wolf.frame * 40;
    let spriteY =
      wolf.state === "dying"
        ? 160
        : {
            up: 0,
            down: 40,
            left: 80,
            right: 120,
          }[wolf.direction] || 40;
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
    ctx.fillStyle = "yellow";
    const screenX = item.x - camera.x;
    const screenY = item.y - camera.y;
    ctx.fillRect(screenX, screenY, 10, 10);
  });

  obstacles.forEach((obstacle) => {
    // Было: obstacles.forEach(([_, obstacle])
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

  // Отрисовка пуль
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
}

function drawBullet(x, y) {
  // Киберпанк-стиль: неоновый круг с градиентом
  const gradient = ctx.createRadialGradient(x, y, 2, x, y, 5);
  gradient.addColorStop(0, "rgba(0, 255, 255, 1)"); // Яркий центр
  gradient.addColorStop(1, "rgba(0, 255, 255, 0)"); // Прозрачная кайма
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
}

// Проверка столкновений
function checkCollisions() {
  const me = players.get(myId);
  items.forEach((item, id) => {
    if (Math.abs(me.x - item.x) < 40 && Math.abs(me.y - item.y) < 40) {
      ws.send(JSON.stringify({ type: "pickup", itemId: id, item: item.type }));
      me.inventory.push(item.type);
      inventoryEl.textContent = me.inventory.join(", ");
      if (item.type === "health") me.health = Math.min(100, me.health + 10);
    }
  });
}

// Спавн предметов
setInterval(() => {
  if (items.size < 3) {
    const item = {
      x: Math.random() * worldWidth,
      y: Math.random() * worldHeight,
      type: "health",
    };
    items.set(Date.now(), item);
  }
}, 10000);

let currentDeltaTime = 0; // Добавьте это в глобальные переменные перед gameLoop

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  currentDeltaTime = deltaTime; // Сохраняем deltaTime

  update(deltaTime);
  draw(currentDeltaTime); // Передаем deltaTime в draw
  requestAnimationFrame(gameLoop);
}

// Инициализация изображений
let imagesLoaded = 0;
function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === 6) {
    window.addEventListener("resize", resizeCanvas);
  }
}

backgroundImage.onload = onImageLoad;
vegetationImage.onload = onImageLoad;
rocksImage.onload = onImageLoad;
cloudsImage.onload = onImageLoad;
playerSprite.onload = onImageLoad;
wolfSprite.onload = onImageLoad;

function setupButton(id, action) {
  const btn = document.getElementById(id);
  let isPressed = false; // Флаг для отслеживания нажатия

  // Обработчик для десктопов (click)
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!isPressed) {
      isPressed = true;
      handleButtonAction(action);
      // Сбрасываем флаг после небольшого таймаута
      setTimeout(() => {
        isPressed = false;
      }, 200); // 200 мс — минимальная задержка между нажатиями
    }
  });

  // Обработчик для мобильных устройств (touchstart)
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (!isPressed) {
      isPressed = true;
      handleButtonAction(action);
    }
  });

  // Сбрасываем флаг при отпускании кнопки на мобильных устройствах
  btn.addEventListener("touchend", (e) => {
    e.preventDefault();
    isPressed = false;
  });

  // Дополнительно предотвращаем нежелательное поведение при движении пальца
  btn.addEventListener("touchmove", (e) => {
    e.preventDefault();
  });
}

function handleButtonAction(action) {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const speed = 5;
  let moved = false;

  switch (action) {
    case "up":
      me.direction = "up";
      me.state = "walking";
      me.y = Math.max(0, me.y - speed);
      moved = true;
      break;
    case "down":
      me.direction = "down";
      me.state = "walking";
      me.y = Math.min(worldHeight - 40, me.y + speed);
      moved = true;
      break;
    case "left":
      me.direction = "left";
      me.state = "walking";
      me.x = Math.max(0, me.x - speed);
      moved = true;
      break;
    case "right":
      me.direction = "right";
      me.state = "walking";
      me.x = Math.min(worldWidth - 40, me.x + speed);
      moved = true;
      break;
    case "shoot": // Добавляем обработку выстрела
      shoot();
      break;
  }

  if (moved && !checkCollision(me.x, me.y)) {
    me.steps += 1;
    updateResources();

    me.frameTime += frameDuration;
    if (me.frameTime >= frameDuration) {
      me.frameTime = 0;
      me.frame = (me.frame + 1) % 7;
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
        steps: me.steps,
        direction: me.direction,
        state: me.state,
        frame: me.frame,
      })
    );
    updateCamera();
    checkCollisions();
  } else if (moved) {
    me.state = "idle";
    me.frame = 0;
    me.frameTime = 0;
  }
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
