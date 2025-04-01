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
let wolves = new Map();
let myId;
const items = new Map();

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

// Регистрация
registerBtn.addEventListener("click", () => {
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value.trim();
  if (!username || !password) {
    registerError.textContent = "Введите имя и пароль";
    return;
  }
  if (ws.readyState === WebSocket.OPEN) {
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

// Обработка сообщений авторизации
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
      break; // Убрали ws.close()
    case "loginSuccess":
      myId = data.id;
      authContainer.style.display = "none";
      document.getElementById("gameContainer").style.display = "block";
      data.players.forEach((p) => players.set(p.id, p));
      data.wolves.forEach((w) => wolves.set(w.id, w));
      resizeCanvas();
      ws.onmessage = handleGameMessage;
      startGame();
      break;
    case "loginFail":
      loginError.textContent = "Неверное имя или пароль";
      break; // Убрали ws.close()
  }
}

// Запуск игровой логики после входа
function startGame() {
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
        controls.up = true;
        break;
      case "ArrowDown":
      case "s":
        controls.down = true;
        break;
      case "ArrowLeft":
      case "a":
        controls.left = true;
        break;
      case "ArrowRight":
      case "d":
        controls.right = true;
        break;
      case " ":
        controls.shoot = true;
        shoot();
        break;
    }
    e.preventDefault();
  });

  document.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
        controls.up = false;
        break;
      case "ArrowDown":
      case "s":
        controls.down = false;
        break;
      case "ArrowLeft":
      case "a":
        controls.left = false;
        break;
      case "ArrowRight":
      case "d":
        controls.right = false;
        break;
      case " ":
        controls.shoot = false;
        break;
    }
  });

  setupButton("upBtn", "up");
  setupButton("downBtn", "down");
  setupButton("leftBtn", "left");
  setupButton("rightBtn", "right");
  document.getElementById("shootBtn").addEventListener("click", shoot);

  requestAnimationFrame(gameLoop);
}

// Обработка игровых сообщений
function handleGameMessage(event) {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case "newPlayer":
      players.set(data.player.id, data.player);
      break;
    case "update":
      players.set(data.player.id, data.player);
      updateStatsDisplay();
      break;
    case "playerLeft":
      players.delete(data.id);
      break;
    case "spawnWolf":
      wolves.set(data.wolf.id, data.wolf);
      break;
    case "shoot":
      drawBullet(data.x, data.y);
      break;
    case "itemPicked":
      items.delete(data.itemId);
      updateStatsDisplay();
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

// Стрельба
function shoot() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;
  ws.send(JSON.stringify({ type: "shoot", x: me.x, y: me.y }));
}

// Обновление позиции и анимации
function update() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const speed = 5;
  let newX = me.x;
  let newY = me.y;

  if (controls.up) {
    newY -= speed;
    me.direction = "up";
    me.state = "walking";
  } else if (controls.down) {
    newY += speed;
    me.direction = "down";
    me.state = "walking";
  } else if (controls.left) {
    newX -= speed;
    me.direction = "left";
    me.state = "walking";
  } else if (controls.right) {
    newX += speed;
    me.direction = "right";
    me.state = "walking";
  } else {
    me.state = "idle";
  }

  newX = Math.max(0, Math.min(newX, worldWidth - 40));
  newY = Math.max(0, Math.min(newY, worldHeight - 40));

  if (newX !== me.x || newY !== me.y) {
    me.x = newX;
    me.y = newY;
    me.steps += 1;
    updateResources();
    me.frameTime += 16;
    if (me.frameTime >= (me.frameDuration || 100)) {
      // Добавили значение по умолчанию
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
  } else if (me.health <= 0 && me.state !== "dying") {
    me.state = "dying";
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
  } else if (me.state === "dying") {
    me.frameTime += 16;
    if (me.frameTime >= (me.deathFrameDuration || 200)) {
      // Добавили значение по умолчанию
      me.frameTime = 0;
      me.frame = Math.min(me.frame + 1, 6);
    }
  } else {
    me.frame = 0;
    me.frameTime = 0;
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

// Отображение показателей
function updateStatsDisplay() {
  const me = players.get(myId);
  if (!me) return;
  statsEl.innerHTML = `
    Здоровье: ${me.health}<br>
    Энергия: ${me.energy}<br>
    Еда: ${me.food}<br>
    Вода: ${me.water}<br>
    Броня: ${me.armor}
  `;
}

// Отрисовка
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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

  // В функции draw() заменяем отрисовку игроков на:
  players.forEach((player) => {
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;
    let spriteX = player.frame * 40;
    let spriteY =
      player.state === "dying"
        ? 160
        : { up: 0, down: 40, left: 80, right: 120 }[player.direction] || 40;

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

    // Имя игрока
    ctx.fillText(player.id, screenX + 20, screenY - 20);

    // Здоровье
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
    ctx.fillStyle = "yellow";
    const screenX = item.x - camera.x;
    const screenY = item.y - camera.y;
    ctx.fillRect(screenX, screenY, 10, 10);
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
  ctx.fillStyle = "black";
  const screenX = x - camera.x;
  const screenY = y - camera.y;
  ctx.fillRect(screenX, screenY, 5, 5);
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

// Игровой цикл
function gameLoop() {
  update();
  draw();
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

// Функция для настройки кнопок
function setupButton(id, action) {
  const btn = document.getElementById(id);
  btn.addEventListener("mousedown", () => (controls[action] = true));
  btn.addEventListener("mouseup", () => (controls[action] = false));
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    controls[action] = true;
  });
  btn.addEventListener("touchend", (e) => {
    e.preventDefault();
    controls[action] = false;
  });
}
