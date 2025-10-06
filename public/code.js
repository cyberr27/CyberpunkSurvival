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

let ws;
let players = new Map();
let myId;
const items = new Map();
const pendingPickups = new Set();

// Загрузка изображений
const imageSources = {
  playerSprite: "playerSprite.png",
  energyDrinkImage: "energy_drink.png",
  nutImage: "nut.png",
  waterBottleImage: "water_bottle.png",
  cannedMeatImage: "canned_meat.png",
  mushroomImage: "mushroom.png",
  sausageImage: "sausage.png",
  bloodPackImage: "blood_pack.png",
  breadImage: "bread.png",
  vodkaBottleImage: "vodka_bottle.png",
  meatChunkImage: "meat_chunk.png",
  bloodSyringeImage: "blood_syringe.png",
  milkImage: "milk.png",
  condensedMilkImage: "condensed_milk.png",
  driedFishImage: "dried_fish.png",
  balyaryImage: "balyary.png",
  appleImage: "apple.png",
  berriesImage: "berry.png",
  carrotImage: "carrot.png",
  npcSpriteImage: "npc_sprite.png",
  npcPhotoImage: "fotoQuestNPC.png",
  cyberHelmetImage: "cyber_helmet.png",
  nanoArmorImage: "nano_armor.png",
  tacticalBeltImage: "tactical_belt.png",
  cyberPantsImage: "cyber_pants.png",
  speedBootsImage: "speed_boots.png",
  techGlovesImage: "tech_gloves.png",
  wolfSprite: "wolfSprite.png",
  wolfSkinImage: "wolfSkin.png",
  plasmaRifleImage: "plasma_rifle.png",
  knucklesImage: "knuckles.png",
  knifeImage: "knife.png",
  batImage: "bat.png",
};

const images = {};
let imagesLoaded = 0;
const totalImages = Object.keys(imageSources).length;

Object.entries(imageSources).forEach(([key, src]) => {
  images[key] = new Image();
  images[key].src = src;
  images[key].onload = () => {
    imagesLoaded++;
    console.log(
      `Изображение ${src} загружено (${imagesLoaded}/${totalImages})`
    );
    if (imagesLoaded === totalImages) {
      window.addEventListener("resize", resizeCanvas);
    }
  };
  images[key].onerror = () => {
    console.error(`Ошибка загрузки изображения ${src}`);
    images[key].src = "fallback.png"; // Запасное изображение
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
      window.addEventListener("resize", resizeCanvas);
    }
  };
});

let inventory = Array(20).fill(null);

// Конфигурация эффектов предметов (расширяем ITEM_CONFIG)
// Обновляем ITEM_CONFIG, чтобы использовать объект images
const ITEM_CONFIG = {
  energy_drink: {
    effect: { energy: 20, water: 5 },
    image: images.energyDrinkImage,
    description: "Энергетик: +20 эн. +5 воды.",
    rarity: 2,
  },
  nut: {
    effect: { food: 7 },
    image: images.nutImage,
    description: "Орех: +7 еды.",
    rarity: 3,
  },
  water_bottle: {
    effect: { water: 30 },
    image: images.waterBottleImage,
    description: "Вода: +30 воды.",
    rarity: 3,
  },
  apple: {
    effect: { food: 8, water: 5 },
    image: images.appleImage,
    description: "Яблоко: +8 еды, +5 воды.",
    rarity: 3,
  },
  berries: {
    effect: { food: 6, water: 6 },
    image: images.berriesImage,
    description: "Ягоды: +6 еды, +6 воды.",
    rarity: 3,
  },
  carrot: {
    effect: { food: 5, energy: 3 },
    image: images.carrotImage,
    description: "Морковь: +5 еды, +3 энергии.",
    rarity: 3,
  },
  canned_meat: {
    effect: { food: 20 },
    image: images.cannedMeatImage,
    description: "Банка тушёнки: +20 еды.",
    rarity: 1,
  },
  mushroom: {
    effect: { food: 5, energy: 15 },
    image: images.mushroomImage,
    description: "Гриб прущий: +15 энергии. +5 еды.",
    rarity: 1,
  },
  sausage: {
    effect: { food: 16, energy: 3 },
    image: images.sausageImage,
    description: "Колбаса: +16 еды, +3 энергии.",
    rarity: 2,
  },
  blood_pack: {
    effect: { health: 40 },
    image: images.bloodPackImage,
    description: "Пакет крови: +40 здоровья.",
    rarity: 1,
  },
  bread: {
    effect: { food: 13, water: -2 },
    image: images.breadImage,
    description: "Хлеб: +13 еды, -2 воды.",
    rarity: 2,
  },
  vodka_bottle: {
    effect: { health: 5, energy: -2, water: 1, food: 2 },
    image: images.vodkaBottleImage,
    description: "Водка: +5 здоровья, -2 эн. +1 воды, +2 еды.",
    rarity: 2,
  },
  meat_chunk: {
    effect: { food: 20, energy: 5, water: -2 },
    image: images.meatChunkImage,
    description: "Кусок мяса: +20 еды, +5 эн. -2 воды.",
    rarity: 2,
  },
  blood_syringe: {
    effect: { health: 10 },
    image: images.bloodSyringeImage,
    description: "Шприц с кровью: +10 здоровья.",
    rarity: 2,
  },
  milk: {
    effect: { water: 15, food: 5 },
    image: images.milkImage,
    description: "Молоко: +15 воды, +5 еды.",
    rarity: 2,
  },
  condensed_milk: {
    effect: { water: 5, food: 11, energy: 2 },
    image: images.condensedMilkImage,
    description: "Сгущёнка: +11 еды, +5 воды, +2 эн.",
    rarity: 2,
  },
  dried_fish: {
    effect: { food: 10, water: -3 },
    image: images.driedFishImage,
    description: "Сушёная рыба: +10 еды, -3 воды.",
    rarity: 2,
  },
  balyary: {
    effect: {},
    image: images.balyaryImage,
    description: "Баляр: игровая валюта.",
    stackable: true,
    rarity: 2,
  },
  cyber_helmet: {
    type: "headgear",
    effect: { armor: 10, energy: 5 },
    image: images.cyberHelmetImage,
    description: "Кибершлем: +10 брони, +5 энергии",
    rarity: 4,
  },
  nano_armor: {
    type: "armor",
    effect: { armor: 20, health: 10 },
    image: images.nanoArmorImage,
    description: "Нано-броня: +20 брони, +10 здоровья",
    rarity: 4,
  },
  tactical_belt: {
    type: "belt",
    effect: { armor: 5, food: 5 },
    image: images.tacticalBeltImage,
    description: "Тактический пояс: +5 брони, +5 еды",
    rarity: 4,
  },
  cyber_pants: {
    type: "pants",
    effect: { armor: 10, water: 5 },
    image: images.cyberPantsImage,
    description: "Киберштаны: +10 брони, +5 воды",
    rarity: 4,
  },
  speed_boots: {
    type: "boots",
    effect: { armor: 5, energy: 10 },
    image: images.speedBootsImage,
    description: "Скоростные ботинки: +5 брони, +10 энергии",
    rarity: 4,
  },
  tech_gloves: {
    type: "gloves",
    effect: { armor: 5, energy: 5 },
    image: images.techGlovesImage,
    description: "Технические перчатки: +5 брони, +5 энергии",
    rarity: 4,
  },
  wolf_skin: {
    effect: {},
    image: images.wolfSkinImage,
    description: "Волчья шкура: материал для крафта.",
    rarity: 2,
  },
  plasma_rifle: {
    type: "weapon",
    effect: { damage: 15, range: 500 },
    image: images.plasmaRifleImage,
    description: "Плазменная винтовка: +15 урона, дальнобойная",
    rarity: 4,
  },
  knuckles: {
    type: "weapon",
    effect: { damage: { min: 3, max: 7 } },
    image: images.knucklesImage,
    description: "Кастет: 3-7 урона в ближнем бою",
    rarity: 3,
  },
  knife: {
    type: "weapon",
    effect: { damage: { min: 4, max: 6 } },
    image: images.knifeImage,
    description: "Нож: 4-6 урона в ближнем бою",
    rarity: 3,
  },
  bat: {
    type: "weapon",
    effect: { damage: { min: 5, max: 10 } },
    image: images.batImage,
    description: "Бита: 5-10 урона в ближнем бою",
    rarity: 3,
  },
};

// Состояние инвентаря (открыт или закрыт)
let isInventoryOpen = false;
// Выбранный слот инвентаря
let selectedSlot = null;

// Глобальные настройки игры
const GAME_CONFIG = {
  FRAME_DURATION: 400, // 700 мс на весь цикл (≈100 мс на кадр)
};

let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 2000; // 2 секунды
let lastDistance = 0; // Добавляем глобальную переменную

// Добавляем переменные для управления анимацией
let lastTime = 0; // Время последнего кадра для расчета deltaTime

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
    console.error("Максимум попыток переподключения достигнут.");
    authContainer.style.display = "flex";
    document.getElementById("gameContainer").style.display = "none";
    return;
  }
  console.log(`Попытка переподключения ${reconnectAttempts + 1}...`);
  setTimeout(() => {
    // Проверяем доступность сервера перед переподключением
    fetch("https://cyberpunksurvival.onrender.com/health")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Сервер недоступен");
        }
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
              // Очищаем волков при переподключении
              window.wolfSystem.clearWolves();
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
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "loginSuccess") {
              ws.onmessage = handleGameMessage;
              window.wolfSystem.clearWolves();
              // Синхронизируем игрока с сервером
              const me = players.get(myId);
              if (me) {
                sendWhenReady(
                  ws,
                  JSON.stringify({
                    type: "syncPlayers",
                    worldId: me.worldId,
                  })
                );
              }
            }
          } catch (error) {
            console.error("Ошибка при обработке сообщения:", error);
          }
        };
      })
      .catch((error) => {
        console.error("Сервер недоступен, повторная попытка:", error);
        reconnectAttempts++;
        reconnectWebSocket();
      });
  }, reconnectDelay * (reconnectAttempts + 1) * 1.5); // Увеличиваем задержку
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
      handleAuthMessage(event);
      const data = JSON.parse(event.data);
      if (data.type === "loginSuccess") {
        ws.onmessage = handleGameMessage;
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
        xp: data.xp || 99,
        maxStats: data.maxStats || {
          health: 100,
          energy: 100,
          food: 100,
          water: 100,
        },
        upgradePoints: data.upgradePoints || 0,
        worldId: data.worldId || 0,
        worldPositions: data.worldPositions || { 0: { x: 222, y: 3205 } },
      };
      players.set(myId, me);
      window.worldSystem.currentWorldId = me.worldId;

      if (data.players) {
        data.players.forEach((p) => {
          if (p.id !== myId) {
            players.set(p.id, p);
          }
        });
      }

      lastDistance = me.distanceTraveled;
      if (data.items) {
        items.clear();
        data.items.forEach((item) =>
          items.set(item.itemId, {
            x: item.x,
            y: item.y,
            type: item.type,
            spawnTime: item.spawnTime,
            worldId: item.worldId,
          })
        );
      }
      if (data.lights) {
        lights.length = 0;
        data.lights.forEach((light) =>
          lights.push({
            ...light,
            baseRadius: light.radius,
            pulseSpeed: 0.001,
          })
        );
        console.log(`Загружено ${lights.length} источников света при логине`);
      }
      window.lightsSystem.reset(me.worldId); // Синхронизируем свет с текущим миром
      inventory = data.inventory || Array(20).fill(null);
      window.npcSystem.setNPCMet(data.npcMet || false);
      window.npcSystem.setSelectedQuest(data.selectedQuestId || null);
      window.npcSystem.checkQuestCompletion();
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
      updateOnlineCount(0);
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
    case "shoot":
      if (data.worldId === currentWorldId) {
        bullets.set(data.bulletId, {
          id: data.bulletId,
          x: data.x,
          y: data.y,
          vx: data.vx,
          vy: data.vy,
          damage: data.damage,
          range: data.range,
          ownerId: data.ownerId,
          spawnTime: data.spawnTime,
          worldId: data.worldId,
        });
      }
      break;
    case "bulletCollision":
      if (data.worldId === currentWorldId) {
        data.bulletIds.forEach((bulletId) => bullets.delete(bulletId));
      }
      break;
    case "removeBullet":
      if (data.worldId === currentWorldId) {
        bullets.delete(data.bulletId);
      }
      break;
    case "attackPlayer":
      if (data.worldId === currentWorldId && players.has(data.targetId)) {
        const player = players.get(data.targetId);
        player.health = Math.max(0, player.health - data.damage);
        players.set(data.targetId, { ...player });
        updateStatsDisplay();
      }
      break;
  }
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

function updateOnlineCount(totalCount) {
  const onlineCountEl = document.getElementById("onlineCount");
  onlineCountEl.textContent = `Онлайн: ${totalCount || 0}`;
}

function startGame() {
  window.worldSystem.initialize();
  window.lightsSystem.initialize(); // Инициализируем источники света
  updateOnlineCount(0); // Начальное значение до получения данных от сервера
  levelSystem.initialize(); // Инициализируем систему уровней
  window.vendingMachine.initialize();
  window.movementSystem.initialize(); // Инициализируем систему движения
  window.npcSystem.initialize(images.npcSpriteImage); // Передаём изображение NPC

  // Проверяем, что изображения загружены перед инициализацией wolfSystem
  if (imagesLoaded === totalImages) {
    window.wolfSystem.initialize(images.wolfSprite, images.wolfSkinImage);
  } else {
    console.error(
      "Изображения волка не загружены, пропускаем инициализацию wolfSystem"
    );
  }
  window.combatSystem.initialize();

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
      case "i":
        toggleInventory();
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
      case "e":
        window.equipmentSystem.toggleEquipment();
        e.preventDefault();
        break;
    }
  });

  // Обработчик нажатия мыши (только для инвентаря)
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
              `Клик по слоту ${i} (x:${touch.clientX}, y:${touch.clientY}), предмет: ${inventory[i].type}`
            );
            selectSlot(i, slots[i]);
            return;
          }
        }
        console.log(
          `Клик вне слотов инвентаря (x:${e.clientX}, y:${e.clientY})`
        );
      } else {
        const camera = window.movementSystem.getCamera();
        const worldX = e.clientX + window.movementSystem.getCamera().x;
        const worldY = e.clientY + window.movementSystem.getCamera().y;
        const currentWorldId = window.worldSystem.currentWorldId;
        let selectedPlayerId = null;
        players.forEach((player, id) => {
          if (
            id !== myId &&
            player.health > 0 &&
            player.worldId === currentWorldId
          ) {
            const dx = worldX - (player.x + 20);
            const dy = worldY - (player.y + 20);
            if (Math.sqrt(dx * dx + dy * dy) < 40) {
              selectedPlayerId = id;
            }
          }
        });
        window.tradeSystem.selectPlayer(selectedPlayerId);
      }
    }
  });

  // Обработчик тач-событий для инвентаря
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
      const camera = window.movementSystem.getCamera();
      const worldX = touch.clientX + window.movementSystem.getCamera().x;
      const worldY = touch.clientY + window.movementSystem.getCamera().y;
      const currentWorldId = window.worldSystem.currentWorldId;
      let selectedPlayerId = null;
      players.forEach((player, id) => {
        if (
          id !== myId &&
          player.health > 0 &&
          player.worldId === currentWorldId
        ) {
          const dx = worldX - (player.x + 20);
          const dy = worldY - (player.y + 20);
          if (Math.sqrt(dx * dx + dy * dy) < 40) {
            selectedPlayerId = id;
          }
        }
      });
      window.tradeSystem.selectPlayer(selectedPlayerId);
    }
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    targetX = touch.clientX + window.movementSystem.getCamera().x;
    targetY = touch.clientY + window.movementSystem.getCamera().y;
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

  useBtn.addEventListener("click", (j) => {
    e.preventDefault();
    if (selectedSlot !== null) {
      useItem(selectedSlot);
    }
  });
  dropBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (selectedSlot !== null) dropItem(selectedSlot);
  });
  window.tradeSystem.initialize(ws);
  window.equipmentSystem.initialize();
  window.wolfSystem.initialize(images.wolfSprite, images.wolfSkinImage);
  const me = players.get(myId);
  if (me && me.equipment) {
    window.equipmentSystem.syncEquipment(me.equipment);
  }

  requestAnimationFrame(gameLoop);
}

function handlePlayerClick(worldX, worldY) {
  let selectedPlayerId = null;
  players.forEach((player, id) => {
    if (id !== myId && player.health > 0) {
      const dx = worldX - (player.x + 20);
      const dy = worldY - (player.y + 20);
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        selectedPlayerId = id;
      }
    }
  });
  window.tradeSystem.selectPlayer(selectedPlayerId); // Убрали !!selectedPlayerId
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

// Использовать предмет
function useItem(slotIndex) {
  console.log("UseItem вызван для слота:", slotIndex);
  const item = inventory[slotIndex];
  if (!item) return;
  const me = players.get(myId);

  // Проверяем, является ли предмет экипировкой (оружие, броня и т.д.)
  if (window.equipmentSystem.EQUIPMENT_CONFIG[item.type]) {
    console.log("Попытка экипировать предмет:", item.type);
    window.equipmentSystem.equipItem(slotIndex);
    // После экипировки очищаем слот (сервер сам вернёт старый предмет, если был)
    inventory[slotIndex] = null;
    selectedSlot = null;
    document.getElementById("useBtn").disabled = true;
    document.getElementById("dropBtn").disabled = true;
    document.getElementById("inventoryScreen").textContent = "";
    updateStatsDisplay();
    updateInventoryDisplay();
    return;
  }

  // Обычная логика использования для не-экипировки
  if (item.type === "balyary") return; // Ничего не делаем для Баляр
  const effect = ITEM_CONFIG[item.type].effect;

  if (effect.health)
    me.health = Math.min(
      me.maxStats.health,
      Math.max(0, me.health + effect.health)
    );
  if (effect.energy)
    me.energy = Math.min(
      me.maxStats.energy,
      Math.max(0, me.energy + effect.energy)
    );
  if (effect.food)
    me.food = Math.min(me.maxStats.food, Math.max(0, me.food + effect.food));
  if (effect.water)
    me.water = Math.min(
      me.maxStats.water,
      Math.max(0, me.water + effect.water)
    );

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

  // Вода: -1 каждые 250 пикселей
  const waterLoss = Math.floor(distance / 250);
  const prevWaterLoss = Math.floor(lastDistance / 250);
  if (waterLoss > prevWaterLoss) {
    me.water = Math.max(0, me.water - (waterLoss - prevWaterLoss));
    console.log(`Вода уменьшена до ${me.water}`);
  }

  // Еда: -1 каждые 450 пикселей
  const foodLoss = Math.floor(distance / 450);
  const prevFoodLoss = Math.floor(lastDistance / 450);
  if (foodLoss > prevFoodLoss) {
    me.food = Math.max(0, me.food - (foodLoss - prevFoodLoss));
    console.log(`Еда уменьшена до ${me.food}`);
  }

  // Энергия: -1 каждые 650 пикселей
  const energyLoss = Math.floor(distance / 650);
  const prevEnergyLoss = Math.floor(lastDistance / 650);
  if (energyLoss > prevEnergyLoss) {
    me.energy = Math.max(0, me.energy - (energyLoss - prevEnergyLoss));
    console.log(`Энергия уменьшена до ${me.energy}`);
  }

  // Здоровье: -1 каждые 100 пикселей, если любой из показателей равен 0
  if (me.energy === 0 || me.food === 0 || me.water === 0) {
    const healthLoss = Math.floor(distance / 100);
    const prevHealthLoss = Math.floor(lastDistance / 100);
    if (healthLoss > prevHealthLoss) {
      me.health = Math.max(0, me.health - (healthLoss - prevHealthLoss));
      console.log(
        `Здоровье уменьшено до ${me.health} из-за нулевых показателей`
      );
    }
  }

  lastDistance = distance; // Обновляем lastDistance
  updateStatsDisplay();

  // Отправляем обновленные данные на сервер
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "update",
      player: {
        id: myId,
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
        worldId: window.worldSystem.currentWorldId,
      },
    })
  );
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
    const currentWorldId = window.worldSystem.currentWorldId;

    switch (data.type) {
      case "syncPlayers":
        if (
          data.players &&
          data.worldId === window.worldSystem.currentWorldId
        ) {
          const myPlayer = players.get(myId);
          players.clear();
          if (myPlayer) {
            players.set(myId, { ...myPlayer, frameTime: 0 });
          } else {
            console.warn(
              `Игрок ${myId} не найден при синхронизации, пропускаем сохранение`
            );
          }
          data.players.forEach((p) => {
            if (p && p.id && p.id !== myId && typeof p === "object") {
              players.set(p.id, { ...p, frameTime: 0 });
            } else {
              console.warn(`Пропущен некорректный игрок при синхронизации:`, p);
            }
          });

          console.log(
            `Синхронизировано ${data.players.length} игроков в мире ${data.worldId}, players:`,
            Array.from(players.keys())
          );
        } else {
          console.warn(
            `Получен syncPlayers для неверного мира ${data.worldId} или без игроков`
          );
        }
        break;
      case "worldTransitionSuccess":
        {
          const me = players.get(myId);
          if (me) {
            window.worldSystem.switchWorld(data.worldId, me, data.x, data.y);
            items.forEach((item, itemId) => {
              if (item.worldId !== data.worldId) {
                items.delete(itemId);
              }
            });
            window.vendingMachine.hideVendingMenu();
            window.lightsSystem.reset(data.worldId);
            window.wolfSystem.clearWolves(); // Очищаем волков при переходе
            if (data.lights) {
              lights.length = 0;
              data.lights.forEach((light) =>
                lights.push({
                  ...light,
                  baseRadius: light.radius,
                  pulseSpeed: 0.001,
                })
              );
              console.log(
                `Загружено ${lights.length} источников света при переходе в мир ${data.worldId}`
              );
            }
            if (data.wolves && data.worldId === 1) {
              window.wolfSystem.syncWolves(data.wolves);
            }
          }
        }
        // Добавляем задержку для стабилизации соединения после перехода
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            sendWhenReady(
              ws,
              JSON.stringify({
                type: "syncPlayers",
                worldId: data.worldId,
              })
            );
            console.log(
              `Запрошена синхронизация игроков для мира ${data.worldId}`
            );
          }
        }, 1000); // Задержка 1 секунда
        break;
      case "newPlayer":
        if (!data.player || typeof data.player !== "object") {
          console.warn(
            "newPlayer: Получены некорректные данные игрока:",
            data.player
          );
          break;
        }
        if (!data.player.id) {
          console.warn("newPlayer: Отсутствует ID игрока:", data.player);
          break;
        }
        if (data.player.worldId !== currentWorldId) {
          console.log(
            `newPlayer: Игрок ${data.player.id} в другом мире (${data.player.worldId}), текущий мир: ${currentWorldId}, пропускаем`
          );
          break;
        }
        if (players.has(data.player.id)) {
          console.log(
            `newPlayer: Игрок ${data.player.id} уже существует в мире ${currentWorldId}, обновляем данные`
          );
          players.set(data.player.id, { ...data.player, frameTime: 0 });
        } else {
          players.set(data.player.id, { ...data.player, frameTime: 0 });
          console.log(
            `Добавлен новый игрок ${data.player.id} в мире ${currentWorldId}`
          );
        }
        break;
      case "playerLeft":
        if (players.has(data.id)) {
          players.delete(data.id);
        }
        break;
      case "syncItems":
        items.clear();
        data.items.forEach((item) => {
          if (item.worldId === currentWorldId) {
            items.set(item.itemId, {
              x: item.x,
              y: item.y,
              type: item.type,
              spawnTime: item.spawnTime,
              worldId: item.worldId,
            });
          }
        });
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
        if (data.player && data.player.id === myId) {
          players.set(myId, { ...players.get(myId), ...data.player });
          if (data.player.equipment) {
            window.equipmentSystem.syncEquipment(data.player.equipment);
          }
          if (data.player.inventory) {
            inventory = data.player.inventory;
            updateInventoryDisplay();
          }
          updateStatsDisplay();
          console.log("Получено обновление игрока:", data.player);
        }
        break;
      case "itemDropped":
        if (data.worldId === currentWorldId) {
          console.log(
            `Получено itemDropped: itemId=${data.itemId}, type=${data.type}, x=${data.x}, y=${data.y}, worldId=${data.worldId}`
          );
          items.set(data.itemId, {
            x: data.x,
            y: data.y,
            type: data.type,
            spawnTime: data.spawnTime,
            worldId: data.worldId,
          });
          updateInventoryDisplay();
        }
        break;
      case "chat":
        window.chatSystem.handleChatMessage(data);
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
      case "totalOnline":
        updateOnlineCount(data.count);
        console.log(`Получено общее количество игроков: ${data.count}`);
        break;
      case "tradeRequest":
      case "tradeAccepted":
      case "tradeCancelled":
      case "tradeOffer":
      case "tradeConfirmed":
      case "tradeCompleted":
        window.tradeSystem.handleTradeMessage(data);
        break;
      case "syncWolves":
        if (data.worldId === currentWorldId) {
          window.wolfSystem.syncWolves(data.wolves);
        }
        break;
      case "updateWolf":
        if (data.worldId === currentWorldId) {
          window.wolfSystem.updateWolf(data.wolf);
        }
        break;
      case "removeWolf":
        if (data.worldId === currentWorldId) {
          window.wolfSystem.removeWolf(data.wolfId);
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
  window.wolfSystem.update(deltaTime);
  window.combatSystem.update(deltaTime);

  // Проверяем зоны перехода
  window.worldSystem.checkTransitionZones(me.x, me.y);

  // Удаление предметов по таймауту и отрисовка только для текущего мира
  const currentTime = Date.now();
  const currentWorldId = window.worldSystem.currentWorldId;
  items.forEach((item, itemId) => {
    if (item.worldId !== currentWorldId) return; // Пропускаем предметы из других миров
    const camera = window.movementSystem.getCamera();
    const screenX = item.x - window.movementSystem.getCamera().x;
    const screenY = item.y - window.movementSystem.getCamera().y;
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

  const currentWorld = window.worldSystem.getCurrentWorld();
  const currentWorldId = window.worldSystem.currentWorldId;
  const groundSpeed = 1.0,
    vegetationSpeed = 0.8,
    rocksSpeed = 0.6,
    cloudsSpeed = 0.3;
  const groundOffsetX = window.movementSystem.getCamera().x * groundSpeed;
  const vegetationOffsetX =
    window.movementSystem.getCamera().x * vegetationSpeed;
  const rocksOffsetX = window.movementSystem.getCamera().x * rocksSpeed;
  const cloudsOffsetX = window.movementSystem.getCamera().x * cloudsSpeed;

  // Рисуем фон с учётом смещения камеры
  if (currentWorld.backgroundImage.complete) {
    ctx.fillStyle = ctx.createPattern(currentWorld.backgroundImage, "repeat");
    ctx.save();
    ctx.translate(
      -(groundOffsetX % currentWorld.backgroundImage.width),
      -(window.movementSystem.getCamera().y * groundSpeed) %
        currentWorld.backgroundImage.height
    );
    ctx.fillRect(
      (groundOffsetX % currentWorld.backgroundImage.width) -
        currentWorld.backgroundImage.width,
      ((window.movementSystem.getCamera().y * groundSpeed) %
        currentWorld.backgroundImage.height) -
        currentWorld.backgroundImage.height,
      currentWorld.width + currentWorld.backgroundImage.width,
      currentWorld.height + currentWorld.backgroundImage.height
    );
    ctx.restore();
  } else {
    ctx.fillStyle = "rgba(10, 20, 40, 1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  window.lightsSystem.draw(deltaTime);

  if (currentWorld.rocksImage.complete) {
    ctx.drawImage(
      currentWorld.rocksImage,
      rocksOffsetX,
      window.movementSystem.getCamera().y * rocksSpeed,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  drawNPC();
  npcSystem.drawNPC();
  window.vendingMachine.draw();
  window.wolfSystem.draw(ctx, window.movementSystem.getCamera());
  window.combatSystem.draw();

  players.forEach((player, id) => {
    if (
      !player ||
      typeof player !== "object" ||
      !player.hasOwnProperty("worldId")
    ) {
      console.warn(`Некорректные данные игрока ${id} в players:`, player);
      players.delete(id); // Удаляем некорректную запись
      updateOnlineCount();
      console.log(
        `Удалён игрок ${id} из players, текущие игроки:`,
        Array.from(players.keys())
      );
      return;
    }
    if (player.worldId !== currentWorldId) return; // Пропускаем игроков из других миров
    const screenX = player.x - window.movementSystem.getCamera().x;
    const screenY = player.y - window.movementSystem.getCamera().y;

    if (player.id !== myId) {
      if (player.state === "walking") {
        player.frameTime += deltaTime;
        if (player.frameTime >= GAME_CONFIG.FRAME_DURATION / 7) {
          player.frameTime -= GAME_CONFIG.FRAME_DURATION / 7;
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

    // Исправленный код отрисовки
    if (images.playerSprite && images.playerSprite.complete) {
      ctx.drawImage(
        images.playerSprite,
        spriteX,
        spriteY,
        40,
        40,
        screenX,
        screenY,
        40,
        40
      );
    } else {
      // Заглушка, если изображение не загружено
      ctx.fillStyle = "blue";
      ctx.fillRect(screenX, screenY, 40, 40);
    }

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
    if (item.worldId !== currentWorldId) return; // Пропускаем предметы из других миров
    if (!items.has(itemId)) {
      console.log(
        `Предмет ${itemId} пропущен при отрисовке, так как уже удалён`
      );
      return;
    }
    const screenX = item.x - window.movementSystem.getCamera().x;
    const screenY = item.y - window.movementSystem.getCamera().y;
    if (
      screenX >= -20 &&
      screenX <= canvas.width + 20 &&
      screenY >= -20 &&
      screenY <= canvas.height + 20
    ) {
      const itemImage = ITEM_CONFIG[item.type]?.image;
      if (itemImage && itemImage.complete) {
        ctx.drawImage(itemImage, screenX + 10, screenY + 10, 20, 20);
      } else {
        ctx.fillStyle = "yellow";
        ctx.fillRect(screenX + 7.5, screenY + 7.5, 5, 5);
      }
    }
  });

  if (currentWorld.vegetationImage.complete) {
    ctx.drawImage(
      currentWorld.vegetationImage,
      vegetationOffsetX,
      window.movementSystem.getCamera().y * vegetationSpeed,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  if (currentWorld.cloudsImage.complete) {
    ctx.drawImage(
      currentWorld.cloudsImage,
      cloudsOffsetX,
      window.movementSystem.getCamera().y * cloudsSpeed,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  // Отрисовка зон перехода
  window.worldSystem.drawTransitionZones();
}

function checkCollisions() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const currentWorldId = window.worldSystem.currentWorldId;
  items.forEach((item, id) => {
    if (item.worldId !== currentWorldId) return; // Пропускаем предметы из других миров
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
    const dx = me.x + 20 - (item.x + 10);
    const dy = me.y + 20 - (item.y + 10);
    const distance = Math.sqrt(dx * dx + dy * dy);
    console.log(
      `Проверка столкновения с ${item.type} (ID: ${id}), расстояние: ${distance}`
    );
    if (distance < 30) {
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
function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === 25) window.addEventListener("resize", resizeCanvas);
}
