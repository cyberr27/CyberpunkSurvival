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

const GAME_CONFIG = {
  FRAME_DURATION: 80, // 700 мс на весь цикл (≈100 мс на кадр)
};

// Глобальная анимация АТОМА (для поля + инвентаря)
let atomFrame = 0;
let atomFrameTime = 0;
const ATOM_FRAMES = 40; // Количество кадров в спрайте (из вашего кода: % 40, спрайт 70x(40 кадров)? Подтвердите ширину atomImage.png / 50px на кадр)
const ATOM_FRAME_DURATION = 180; // ms на кадр (8 FPS: плавно, без лагов. Можно протестировать 100-150 для скорости)
let inventoryAtomTimer = null;
const pendingPickups = new Set();

// Добавляем переменные для управления анимацией
let lastTime = 0; // Время последнего кадра для расчета deltaTime
let lastRender = 0; // Новая для трекинга последнего рендера
const FPS = 60; // Целевой FPS, можно изменить

const PLAYER_FRAME_WIDTH = 70; // Ширина кадра (не меняем)
const PLAYER_FRAME_HEIGHT = 70; // Высота кадра (не меняем)
const WALK_FRAME_COUNT = 13; // Новый: 13 кадров для ходьбы (цикл)
const ATTACK_FRAME_COUNT = 13; // Новый: 13 кадров для атаки (one-shot)
const WALK_FRAME_DURATION = GAME_CONFIG.FRAME_DURATION / WALK_FRAME_COUNT; // Адаптируем FPS (было /40, теперь /13 для похожей скорости)
const ATTACK_FRAME_DURATION = 500 / ATTACK_FRAME_COUNT;

const SPRITE_ROWS = {
  walk_up: 70,
  walk_down: 0,
  walk_right: 140,
  walk_left: 210,
  attack_up_down: 280, // Строка 4 для атаки вверх/вниз (один ряд для обоих)
  attack_right: 350,
  attack_left: 420,
};

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
  johnSprite: "JohnSprite.png",
  npcPhotoImage: "fotoQuestNPC.png",
  jackSprite: "jackSprite.png", // Создай файл спрайта (аналог johnSprite.png, 70x(40 кадров))
  jackPhotoImage: "jackPhoto.png", // Фото для диалога (аналог fotoQuestNPC.png)
  cyberHelmetImage: "cyber_helmet.png",
  nanoArmorImage: "nano_armor.png",
  tacticalBeltImage: "tactical_belt.png",
  cyberPantsImage: "cyber_pants.png",
  speedBootsImage: "speed_boots.png",
  techGlovesImage: "tech_gloves.png",
  plasmaRifleImage: "plasma_rifle.png",
  knucklesImage: "knuckles.png",
  knifeImage: "knife.png",
  batImage: "bat.png",
  atomImage: "atom.png",
  mutantSprite: "mutantSprite.png",
  scorpionSprite: "scorpionSprite.png",
  alexNeonSprite: "alexNeonSprite.png",
  alexNeonFoto: "alexNeonFoto.png",
  vacuumRobotSprite: "vacuum_robot.png",
  vacuumPhotoImage: "vacuum_photo.png",
  cockroachSprite: "cockroachSprite.png",
  droneSprite: "dronSprite.png",
  bonfireImage: "bonfire.png",
  oclocSprite: "oclocSprite.png",
  corporateRobotSprite: "corporate_robot.png",
  corporateRobotFoto: "corporate_robot_foto.png",
  robotDoctorSprite: "robotDoctorSprite.png",
  robotDoctorFoto: "robot_doctor_foto.png",
  medicalCertificateImage: "medical_certificate.png",
  medicalCertificateStampedImage: "medical_certificate_stamped.png",
  // === НОВАЯ ПОРВАННАЯ ЭКИПИРОВКА ===
  torn_baseball_cap_of_health: "torn_baseball_cap_of_health.png",
  torn_health_t_shirt: "torn_health_t_shirt.png",
  torn_health_gloves: "torn_health_gloves.png",
  torn_belt_of_health: "torn_belt_of_health.png",
  torn_pants_of_health: "torn_pants_of_health.png",
  torn_health_sneakers: "torn_health_sneakers.png",

  torn_energy_cap: "torn_energy_cap.png",
  torn_energy_t_shirt: "torn_energy_t_shirt.png",
  torn_gloves_of_energy: "torn_gloves_of_energy.png",
  torn_energy_belt: "torn_energy_belt.png",
  torn_pants_of_energy: "torn_pants_of_energy.png",
  torn_sneakers_of_energy: "torn_sneakers_of_energy.png",

  torn_cap_of_gluttony: "torn_cap_of_gluttony.png",
  torn_t_shirt_of_gluttony: "torn_t_shirt_of_gluttony.png",
  torn_gloves_of_gluttony: "torn_gloves_of_gluttony.png",
  torn_belt_of_gluttony: "torn_belt_of_gluttony.png",
  torn_pants_of_gluttony: "torn_pants_of_gluttony.png",
  torn_sneakers_of_gluttony: "torn_sneakers_of_gluttony.png",

  torn_cap_of_thirst: "torn_cap_of_thirst.png",
  torn_t_shirt_of_thirst: "torn_t_shirt_of_thirst.png",
  torn_gloves_of_thirst: "torn_gloves_of_thirst.png",
  torn_belt_of_thirst: "torn_belt_of_thirst.png",
  torn_pants_of_thirst: "torn_pants_of_thirst.png",
  torn_sneakers_of_thirst: "torn_sneakers_of_thirst.png",
};

const images = {};
let imagesLoaded = 0;
const totalImages = Object.keys(imageSources).length;

Object.entries(imageSources).forEach(([key, src]) => {
  images[key] = new Image();
  images[key].src = src;
  images[key].onload = () => {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
      window.addEventListener("resize", resizeCanvas);
      window.enemySystem.initialize();
      window.cockroachSystem.initialize(images.cockroachSprite);
      window.droneSystem.initialize(images.droneSprite);
      window.bonfireSystem.initialize(images.bonfireImage);
      window.clockSystem.initialize(images.oclocSprite);
      window.corporateRobotSystem.initialize(images.corporateRobotSprite);
      window.robotDoctorSystem.initialize(images.robotDoctorSprite);
    }
  };
});

let inventory = Array(20).fill(null);

// Конфигурация эффектов предметов (расширяем ITEM_CONFIG)
// Обновляем ITEM_CONFIG, чтобы использовать объект images
const ITEM_CONFIG = {
  // === ЕДА И НАПИТКИ ===
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
    description: "Гриб прущий: +15 энергии, +5 еды.",
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
    description: "Кусок мяса: +20 еды, +5 эн., -2 воды.",
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

  // === ВАЛЮТА И СПЕЦПРЕДМЕТЫ ===
  balyary: {
    effect: {},
    image: images.balyaryImage,
    description: "Баляр: игровая валюта.",
    stackable: true,
    balyary: true,
    rarity: 1,
  },
  atom: {
    effect: { armor: 5 },
    image: images.atomImage,
    description: "Атом — даёт +5 брони при использовании.",
    stackable: true,
    rarity: 1,
  },
  medical_certificate: {
    effect: {},
    image: images.medicalCertificateImage,
    description: "Мед. справка МД-07: подтверждает, что ты не зомби.",
    rarity: 5,
  },
  medical_certificate_stamped: {
    effect: {},
    image: images.medicalCertificateStampedImage,
    description: "Мед. справка с печатью заставы. Допуск в Неоновый Город.",
    rarity: 5,
  },

  // === КИБЕР-ЭКИПИРОВКА (ЭНДГЕЙМ) ===
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
  plasma_rifle: {
    type: "weapon",
    effect: { damage: 50, range: 200 },
    image: images.plasmaRifleImage,
    description: "Плазменная винтовка: 50 урона, дальность 200px",
    rarity: 4,
  },
  knuckles: {
    type: "weapon",
    effect: { damage: { min: 3, max: 7 } },
    image: images.knucklesImage,
    description: "Кастет: 3–7 урона в ближнем бою",
    rarity: 4,
  },
  knife: {
    type: "weapon",
    effect: { damage: { min: 4, max: 6 } },
    image: images.knifeImage,
    description: "Нож: 4–6 урона в ближнем бою",
    rarity: 4,
  },
  bat: {
    type: "weapon",
    effect: { damage: { min: 5, max: 10 } },
    image: images.batImage,
    description: "Бита: 5–10 урона в ближнем бою",
    rarity: 4,
  },
  // === ПОРВАННАЯ СТАРТОВАЯ ЭКИПИРОВКА — АКТУАЛЬНЫЕ ЗНАЧЕНИЯ ИЗ items.js ===
  torn_baseball_cap_of_health: {
    type: "headgear",
    effect: { armor: 5, health: 5 },
    image: images.torn_baseball_cap_of_health,
    description:
      "Порванная кепка здоровья: +5 к максимальному здоровью и броне",
    rarity: 4,
  },
  torn_health_t_shirt: {
    type: "armor",
    effect: { armor: 10, health: 10 },
    image: images.torn_health_t_shirt,
    description:
      "Порванная футболка здоровья: +10 к максимальному здоровью, +10 к броне",
    rarity: 4,
  },
  torn_health_gloves: {
    type: "gloves",
    effect: { armor: 5, health: 3 },
    image: images.torn_health_gloves,
    description:
      "Порванные перчатки здоровья: +3 к максимальному здоровью, +5 к броне",
    rarity: 4,
  },
  torn_belt_of_health: {
    type: "belt",
    effect: { armor: 3, health: 7 },
    image: images.torn_belt_of_health,
    description:
      "Порванный пояс здоровья: +7 к максимальному здоровью, +3 к броне",
    rarity: 4,
  },
  torn_pants_of_health: {
    type: "pants",
    effect: { armor: 7, health: 6 },
    image: images.torn_pants_of_health,
    description:
      "Порванные штаны здоровья: +6 к максимальному здоровью, +7 к броне",
    rarity: 4,
  },
  torn_health_sneakers: {
    type: "boots",
    effect: { armor: 5, health: 4 },
    image: images.torn_health_sneakers,
    description:
      "Порванные кроссовки здоровья: +4 к максимальному здоровью, +5 к броне",
    rarity: 4,
  },

  // ЭНЕРГЕТИЧЕСКАЯ ЛИНИЯ
  torn_energy_cap: {
    type: "headgear",
    effect: { armor: 5, energy: 5 },
    image: images.torn_energy_cap,
    description:
      "Порванная кепка энергии: +5 к максимальной энергии, +5 к броне",
    rarity: 4,
  },
  torn_energy_t_shirt: {
    type: "armor",
    effect: { armor: 10, energy: 10 },
    image: images.torn_energy_t_shirt,
    description:
      "Порванная футболка энергии: +10 к максимальной энергии, +10 к броне",
    rarity: 4,
  },
  torn_gloves_of_energy: {
    type: "gloves",
    effect: { armor: 5, energy: 3 },
    image: images.torn_gloves_of_energy,
    description:
      "Порванные перчатки энергии: +3 к максимальной энергии, +5 к броне",
    rarity: 4,
  },
  torn_energy_belt: {
    type: "belt",
    effect: { armor: 3, energy: 7 },
    image: images.torn_energy_belt,
    description:
      "Порванный пояс энергии: +7 к максимальной энергии, +3 к броне",
    rarity: 4,
  },
  torn_pants_of_energy: {
    type: "pants",
    effect: { armor: 7, energy: 6 },
    image: images.torn_pants_of_energy,
    description:
      "Порванные штаны энергии: +6 к максимальной энергии, +7 к броне",
    rarity: 4,
  },
  torn_sneakers_of_energy: {
    type: "boots",
    effect: { armor: 5, energy: 4 },
    image: images.torn_sneakers_of_energy,
    description:
      "Порванные кроссовки энергии: +4 к максимальной энергии, +5 к броне",
    rarity: 4,
  },

  // ОБЖОРСТВО
  torn_cap_of_gluttony: {
    type: "headgear",
    effect: { armor: 5, food: 5 },
    image: images.torn_cap_of_gluttony,
    description: "Порванная кепка обжорства: +5 к максимальной еде, +5 к броне",
    rarity: 4,
  },
  torn_t_shirt_of_gluttony: {
    type: "armor",
    effect: { armor: 10, food: 10 },
    image: images.torn_t_shirt_of_gluttony,
    description:
      "Порванная футболка обжорства: +10 к максимальной еде, +10 к броне",
    rarity: 4,
  },
  torn_gloves_of_gluttony: {
    type: "gloves",
    effect: { armor: 5, food: 3 },
    image: images.torn_gloves_of_gluttony,
    description:
      "Порванные перчатки обжорства: +3 к максимальной еде, +5 к броне",
    rarity: 4,
  },
  torn_belt_of_gluttony: {
    type: "belt",
    effect: { armor: 3, food: 7 },
    image: images.torn_belt_of_gluttony,
    description: "Порванный пояс обжорства: +7 к максимальной еде, +3 к броне",
    rarity: 4,
  },
  torn_pants_of_gluttony: {
    type: "pants",
    effect: { armor: 7, food: 6 },
    image: images.torn_pants_of_gluttony,
    description: "Порванные штаны обжорства: +6 к максимальной еде, +7 к броне",
    rarity: 4,
  },
  torn_sneakers_of_gluttony: {
    type: "boots",
    effect: { armor: 5, food: 4 },
    image: images.torn_sneakers_of_gluttony,
    description:
      "Порванные кроссовки обжорства: +4 к максимальной еде, +5 к броне",
    rarity: 4,
  },

  // ЖАЖДА
  torn_cap_of_thirst: {
    type: "headgear",
    effect: { armor: 5, water: 5 },
    image: images.torn_cap_of_thirst,
    description: "Порванная кепка жажды: +5 к максимальной воде, +5 к броне",
    rarity: 4,
  },
  torn_t_shirt_of_thirst: {
    type: "armor",
    effect: { armor: 10, water: 10 },
    image: images.torn_t_shirt_of_thirst,
    description:
      "Порванная футболка жажды: +10 к максимальной воде, +10 к броне",
    rarity: 4,
  },
  torn_gloves_of_thirst: {
    type: "gloves",
    effect: { armor: 5, water: 3 },
    image: images.torn_gloves_of_thirst,
    description: "Порванные перчатки жажды: +3 к максимальной воде, +5 к броне",
    rarity: 4,
  },
  torn_belt_of_thirst: {
    type: "belt",
    effect: { armor: 3, water: 7 },
    image: images.torn_belt_of_thirst,
    description: "Порванный пояс жажды: +7 к максимальной воде, +3 к броне",
    rarity: 4,
  },
  torn_pants_of_thirst: {
    type: "pants",
    effect: { armor: 7, water: 6 },
    image: images.torn_pants_of_thirst,
    description: "Порванные штаны жажды: +6 к максимальной воде, +7 к броне",
    rarity: 4,
  },
  torn_sneakers_of_thirst: {
    type: "boots",
    effect: { armor: 5, water: 4 },
    image: images.torn_sneakers_of_thirst,
    description:
      "Порванные кроссовки жажды: +4 к максимальной воде, +5 к броне",
    rarity: 4,
  },
};

// Состояние инвентаря (открыт или закрыт)
let isInventoryOpen = false;
window.isInventoryOpen = false;
// Выбранный слот инвентаря
let selectedSlot = null;

let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 2000; // 2 секунды
let lastDistance = 0; // Добавляем глобальную переменную

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
    authContainer.style.display = "flex";
    document.getElementById("gameContainer").style.display = "none";
    return;
  }
  setTimeout(() => {
    // Проверяем доступность сервера перед переподключением
    fetch("https://cyberpunksurvival.onrender.com/health")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Сервер недоступен");
        }
        ws = new WebSocket("wss://cyberpunksurvival.onrender.com");
        ws.onopen = () => {
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
            } else {
              authContainer.style.display = "flex";
              document.getElementById("gameContainer").style.display = "none";
            }
          }
        };
        ws.onerror = (error) => {
          reconnectAttempts++;
          reconnectWebSocket();
        };
        ws.onclose = (event) => {
          if (event.code === 4000) {
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
              tradeSystem.initialize(ws);
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
        health: data.health,
        energy: data.energy,
        food: data.food,
        water: data.water,
        armor: data.armor || 0,
        distanceTraveled: data.distanceTraveled || 0,
        hasSeenWelcomeGuide: data.hasSeenWelcomeGuide || false,
        direction: data.direction || "down",
        state: data.state || "idle",
        frame: data.frame || 0,
        inventory: data.inventory || Array(20).fill(null),
        equipment: data.equipment || {
          head: null,
          chest: null,
          belt: null,
          pants: null,
          boots: null,
          weapon: null,
          gloves: null,
        },
        npcMet: data.npcMet || false,
        jackMet: data.jackMet || false,
        alexNeonMet: data.alexNeonMet || false,
        captainMet: data.captainMet || false,
        selectedQuestId: data.selectedQuestId || null,
        level: data.level || 0,
        xp: data.xp || 99,
        upgradePoints: data.upgradePoints || 0,
        worldId: data.worldId || 0,
        worldPositions: data.worldPositions || { 0: { x: 222, y: 3205 } },

        // Апгрейды
        healthUpgrade: data.healthUpgrade || 0,
        energyUpgrade: data.energyUpgrade || 0,
        foodUpgrade: data.foodUpgrade || 0,
        waterUpgrade: data.waterUpgrade || 0,

        // === МЕДСПРАВКИ ===
        medicalCertificate: data.medicalCertificate || false,
        medicalCertificateStamped: data.medicalCertificateStamped || false,
        corporateDocumentsSubmitted: data.corporateDocumentsSubmitted || false,
      };

      // === ДОПОЛНИТЕЛЬНО: если сервер вдруг пришлёт maxStats — сохраняем ===
      if (data.maxStats) {
        me.maxStats = data.maxStats;
      }

      if (window.welcomeGuideSystem && window.welcomeGuideSystem.setSeen) {
        window.welcomeGuideSystem.setSeen(data.hasSeenWelcomeGuide === true);
      }

      players.set(myId, me);
      window.worldSystem.currentWorldId = me.worldId;

      if (window.welcomeGuideSystem) {
        window.welcomeGuideSystem.setSeen(me.hasSeenWelcomeGuide);
        window.welcomeGuideSystem.init();
      }

      // Инициализация систем
      if (window.equipmentSystem && !window.equipmentSystem.isInitialized) {
        window.equipmentSystem.initialize();
      }

      if (window.equipmentSystem && me.equipment) {
        window.equipmentSystem.syncEquipment(me.equipment);
      }

      // Инвентарь и UI
      inventory = me.inventory.map((item) => (item ? { ...item } : null));
      updateInventoryDisplay();
      updateStatsDisplay();

      // Другие игроки
      if (data.players) {
        data.players.forEach((p) => {
          if (p.id !== myId) {
            // Важно: тоже синхронизируем флаг у других игроков (если придёт)
            if (p.medicalCertificateStamped === undefined) {
              p.medicalCertificateStamped = false;
            }
            players.set(p.id, p);
          }
        });
      }

      lastDistance = me.distanceTraveled;

      // Предметы
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

      // Свет
      if (data.lights) {
        lights.length = 0;
        data.lights.forEach((light) =>
          lights.push({
            ...light,
            baseRadius: light.radius,
            pulseSpeed: 0.001,
          })
        );
      }

      window.lightsSystem.reset(me.worldId);

      // === СИНХРОНИЗАЦИЯ NPC ===
      window.npcSystem.setNPCMet(data.npcMet || false);
      window.jackSystem.setJackMet(data.jackMet || false);

      if (window.neonNpcSystem && data.alexNeonMet !== undefined) {
        NEON_NPC.isMet = !!data.alexNeonMet;
      }

      if (window.outpostCaptainSystem) {
        window.outpostCaptainSystem.setCaptainMet(data.captainMet === true);
      }

      // Квесты
      window.npcSystem.setSelectedQuest(data.selectedQuestId || null);
      window.npcSystem.checkQuestCompletion();
      window.npcSystem.setAvailableQuests(data.availableQuests || []);

      // Уровень и статы
      window.levelSystem.setLevelData(
        data.level || 0,
        data.xp || 0,
        data.maxStats,
        data.upgradePoints || 0
      );

      window.equipmentSystem.syncEquipment(data.equipment);

      resizeCanvas();
      ws.onmessage = handleGameMessage;
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
    case "newItem":
      const newItem = {
        x: data.x,
        y: data.y,
        type: data.type,
        spawnTime: data.spawnTime,
        worldId: data.worldId,
      };
      items.set(data.itemId, newItem);
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
  window.npcSystem.initialize(images.johnSprite); // Передаём изображение NPC
  window.jackSystem.initialize(images.jackSprite);
  if (window.outpostCaptainSystem) window.outpostCaptainSystem.initialize();
  window.vacuumRobotSystem.initialize(images.vacuumRobotSprite);
  window.cockroachSystem.initialize(images.cockroachSprite);
  window.droneSystem.initialize(images.droneSprite);
  window.bonfireSystem.initialize(images.bonfireImage);
  window.clockSystem.initialize(images.oclocSprite);
  window.corporateRobotSystem.initialize(images.corporateRobotSprite);
  window.robotDoctorSystem.initialize(images.robotDoctorSprite);

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
            selectSlot(i, slots[i]);
            return;
          }
        }
      } else {
        const camera = window.movementSystem.getCamera();
        const worldX = e.clientX + window.movementSystem.getCamera().x;
        const worldY = e.clientY + window.movementSystem.getCamera().y;
        const currentWorldId = window.worldSystem.currentWorldId;
        let selectedPlayerId = null;
        players.forEach((player, id) => {
          if (id !== myId && player.worldId === currentWorldId) {
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
          selectSlot(i, slots[i]);
          return;
        }
      }
    } else {
      const camera = window.movementSystem.getCamera();
      const worldX = touch.clientX + window.movementSystem.getCamera().x;
      const worldY = touch.clientY + window.movementSystem.getCamera().y;
      const currentWorldId = window.worldSystem.currentWorldId;
      let selectedPlayerId = null;
      players.forEach((player, id) => {
        if (id !== myId && player.worldId === currentWorldId) {
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

  document.getElementById("useBtn").addEventListener("click", () => {
    if (selectedSlot !== null) {
      const item = inventory[selectedSlot];
      if (item && ITEM_CONFIG[item.type]) {
        if (ITEM_CONFIG[item.type].type) {
          // Если предмет экипируемый
          window.equipmentSystem.equipItem(selectedSlot);
        } else {
          // Если предмет используемый (еда, вода, атом и т.д.)
          useItem(selectedSlot);
        }
      }
    }
  });
  dropBtn.addEventListener("click", () => {
    if (selectedSlot !== null) {
      dropItem(selectedSlot);
    }
  });
  window.tradeSystem.initialize(ws);
  window.equipmentSystem.initialize();
  const me = players.get(myId);
  if (me && me.equipment) {
    window.equipmentSystem.syncEquipment(me.equipment);
  }

  if (window.outpostCaptainSystem) {
    window.outpostCaptainSystem.initialize();
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
  window.isInventoryOpen = isInventoryOpen;

  const me = players.get(myId);

  // НОВОЕ: Проверка на мобильное устройство и закрытие экипировки, если она открыта и мы открываем инвентарь
  const isMobile = window.innerWidth <= 500;
  if (isMobile && isInventoryOpen && window.equipmentSystem.isEquipmentOpen) {
    window.equipmentSystem.toggleEquipment(); // Автоматически закрываем экипировку
  }

  const inventoryContainer = document.getElementById("inventoryContainer");
  inventoryContainer.style.display = isInventoryOpen ? "grid" : "none";
  const inventoryBtn = document.getElementById("inventoryBtn");
  inventoryBtn.classList.toggle("active", isInventoryOpen);

  if (isInventoryOpen) {
    if (!inventoryAtomTimer) {
      inventoryAtomTimer = setInterval(() => {
        atomFrame = (atomFrame + 1) % ATOM_FRAMES; // Только frame, без time (просто для инвентаря)
        if (me.state === "attacking") {
          me.attackFrameTime = (me.attackFrameTime || 0) + deltaTime;
          if (me.attackFrameTime >= ATTACK_FRAME_DURATION) {
            me.attackFrameTime -= ATTACK_FRAME_DURATION;
            me.attackFrame = (me.attackFrame || 0) + 1;
            if (me.attackFrame >= ATTACK_FRAME_COUNT) {
              // Завершение анимации атаки
              me.state = isMoving ? "walking" : "idle"; // Возвращаем к предыдущему состоянию (с проверкой на движение из movement.js)
              me.attackFrame = 0;
              me.attackFrameTime = 0;
            }
          }
        }
        // Обновляем только canvas атомов, без полной перерисовки инвентаря
        if (window.atomAnimations) {
          window.atomAnimations.forEach((anim) => {
            // Проверяем, что слот всё ещё содержит атом
            if (
              inventory[anim.slotIndex] &&
              inventory[anim.slotIndex].type === "atom"
            ) {
              anim.ctx.clearRect(0, 0, 40, 40);
              if (ITEM_CONFIG["atom"]?.image?.complete) {
                anim.ctx.drawImage(
                  ITEM_CONFIG["atom"].image,
                  atomFrame * 50,
                  0,
                  50,
                  50,
                  0,
                  0,
                  40,
                  40
                );
              }
            }
          });
        }
      }, ATOM_FRAME_DURATION);
    }
    updateInventoryDisplay();
  } else {
    if (inventoryAtomTimer) {
      clearInterval(inventoryAtomTimer);
      inventoryAtomTimer = null;
    }
    const screen = document.getElementById("inventoryScreen");
    screen.innerHTML = "";
    selectedSlot = null;
    const useBtn = document.getElementById("useBtn");
    const dropBtn = document.getElementById("dropBtn");
    useBtn.disabled = true;
    dropBtn.disabled = true;
    // Очищаем массив анимаций при закрытии
    window.atomAnimations = [];
  }
}

// Выбрать слот и показать кнопки
function selectSlot(slotIndex, slotElement) {
  if (!inventory[slotIndex]) return;
  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  if (selectedSlot === slotIndex) {
    selectedSlot = null;
    screen.innerHTML = "";
    useBtn.disabled = true;
    dropBtn.disabled = true;
    return;
  }

  selectedSlot = slotIndex;
  // Если ранее была форма для stackable, убираем её и показываем описание
  screen.textContent = ITEM_CONFIG[inventory[slotIndex].type].description;
  useBtn.disabled = ITEM_CONFIG[inventory[slotIndex].type].balyary; // Отключаем для stackable предметов (balyary и atom)
  dropBtn.disabled = false;
}

// Использовать предмет
function useItem(slotIndex) {
  const item = inventory[slotIndex];
  if (!item || !ITEM_CONFIG[item.type]) {
    return;
  }
  const me = players.get(myId);
  if (!me) {
    return;
  }

  // Проверяем, является ли предмет экипировкой
  if (window.equipmentSystem.EQUIPMENT_CONFIG[item.type]) {
    window.equipmentSystem.equipItem(slotIndex);
    selectedSlot = null;
    document.getElementById("useBtn").disabled = true;
    document.getElementById("dropBtn").disabled = true;
    document.getElementById("inventoryScreen").textContent = "";
    updateStatsDisplay();
    updateInventoryDisplay();
    return;
  }

  // Проверяем, является ли предмет баляром
  if (item.type === "balyary") {
    return;
  } else {
    // Обработка других предметов (еда, вода, здоровье, энергия)
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
    if (effect.armor)
      me.armor = Math.min(
        me.maxStats.armor,
        Math.max(0, me.armor + effect.armor)
      );

    if (ITEM_CONFIG[item.type].stackable) {
      if (item.quantity > 1) {
        inventory[slotIndex].quantity -= 1;
      } else {
        inventory[slotIndex] = null;
      }
    } else {
      inventory[slotIndex] = null;
    }

    // Отправляем обновление на сервер
    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "useItem",
          slotIndex,
          stats: {
            health: me.health,
            energy: me.energy,
            food: me.food,
            water: me.water,
            armor: me.armor,
          },
          inventory,
        })
      );
    } else {
    }
  }

  // Обновляем интерфейс
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

  if (ITEM_CONFIG[item.type].stackable) {
    // Логика для stackable (balyary и atom) с формой ввода количества, стили как раньше
    screen.innerHTML = `
      <div class="balyary-drop-form">
        <p class="cyber-text">Сколько выкинуть?</p>
        <input type="number" id="stackableAmount" class="cyber-input" min="1" max="${
          item.quantity || 1
        }" placeholder="0" value="" autofocus />
        <p id="stackableError" class="error-text"></p>
      </div>
    `;
    const input = document.getElementById("stackableAmount");
    const errorEl = document.getElementById("stackableError");

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-9]/g, "");
      if (input.value === "") input.value = "";
    });

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
        errorEl.textContent = "Не хватает " + item.type + "!";
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

      useBtn.disabled = true;
      dropBtn.disabled = true;
      useBtn.onclick = () => useItem(slotIndex); // Восстанавливаем оригинальный onclick для useBtn (предполагаю, что useItem — функция использования)
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
  const waterLoss = Math.floor(distance / 500);
  const prevWaterLoss = Math.floor(lastDistance / 500);
  if (waterLoss > prevWaterLoss) {
    me.water = Math.max(0, me.water - (waterLoss - prevWaterLoss));
  }

  // Еда: -1 каждые 450 пикселей
  const foodLoss = Math.floor(distance / 900);
  const prevFoodLoss = Math.floor(lastDistance / 900);
  if (foodLoss > prevFoodLoss) {
    me.food = Math.max(0, me.food - (foodLoss - prevFoodLoss));
  }

  // Энергия: -1 каждые 650 пикселей
  const energyLoss = Math.floor(distance / 1300);
  const prevEnergyLoss = Math.floor(lastDistance / 1300);
  if (energyLoss > prevEnergyLoss) {
    me.energy = Math.max(0, me.energy - (energyLoss - prevEnergyLoss));
  }

  // Здоровье: -1 каждые 100 пикселей, если любой из показателей равен 0
  if (me.energy === 0 || me.food === 0 || me.water === 0) {
    const healthLoss = Math.floor(distance / 200);
    const prevHealthLoss = Math.floor(lastDistance / 200);
    if (healthLoss > prevHealthLoss) {
      me.health = Math.max(0, me.health - (healthLoss - prevHealthLoss));
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
    <span class="health">Здоровье: ${me.health}/${me.maxStats.health}</span><br>
    <span class="energy">Энергия: ${me.energy}/${me.maxStats.energy}</span><br>
    <span class="food">Еда: ${me.food}/${me.maxStats.food}</span><br>
    <span class="water">Вода: ${me.water}/${me.maxStats.water}</span><br>
    <span class="armor">Броня: ${me.armor}/${me.maxStats.armor || 0}</span>
  `;
  document.getElementById("coords").innerHTML = `X: ${Math.floor(
    me.x
  )}<br>Y: ${Math.floor(me.y)}`;
  levelSystem.updateUpgradeButtons();
}

function startAtomAnimation(atomAnimations) {
  let lastTime = null;

  function animate(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Продолжаем анимацию, если есть активные атомы
    if (
      atomAnimations.length > 0 &&
      atomAnimations.some(
        (atom) =>
          inventory[atom.slotIndex] && inventory[atom.slotIndex].type === "atom"
      )
    ) {
      requestAnimationFrame(animate);
    }
  }

  // Запускаем анимацию, если есть атомы
  if (atomAnimations.length > 0) {
    requestAnimationFrame(animate);
  }
}

function updateInventoryDisplay() {
  // Проверяем наличие необходимых DOM-элементов
  const inventoryGrid = document.getElementById("inventoryGrid");
  const inventoryScreen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  if (!inventoryGrid || !inventoryScreen) {
    return;
  }

  // Получаем данные игрока
  const me = players.get(myId);
  if (!me || !me.inventory) {
    return;
  }

  // Синхронизируем глобальную inventory
  inventory = me.inventory.map((slot) => (slot ? { ...slot } : null));

  // Проверяем, активна ли форма выброса stackable
  const isStackableFormActive =
    selectedSlot !== null &&
    inventory[selectedSlot] &&
    ITEM_CONFIG[inventory[selectedSlot].type]?.stackable &&
    inventoryScreen.querySelector(".balyary-drop-form");

  // Обновляем содержимое экрана
  if (!isStackableFormActive) {
    inventoryScreen.innerHTML = "";
    if (selectedSlot !== null && inventory[selectedSlot]) {
      inventoryScreen.textContent =
        ITEM_CONFIG[inventory[selectedSlot].type]?.description || "";
    }
  }

  // Очищаем слоты
  inventoryGrid.innerHTML = "";

  // Хранилище для анимации атомов (canvas ссылок)
  window.atomAnimations = []; // Глобальный массив для хранения, чтобы обновлять в interval

  // Заполняем слоты инвентаря
  inventory.forEach((item, i) => {
    const slot = document.createElement("div");
    slot.className = "inventory-slot";
    slot.dataset.index = i;
    inventoryGrid.appendChild(slot);

    if (item) {
      if (item.type === "atom") {
        // Создаём canvas для анимации атома
        const canvas = document.createElement("canvas");
        canvas.width = 40;
        canvas.height = 40;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        const ctx = canvas.getContext("2d");
        slot.appendChild(canvas);

        // Сохраняем для анимации
        window.atomAnimations.push({
          ctx: ctx,
          slotIndex: i,
        });

        // Начальный рендеринг текущего глобального кадра
        if (ITEM_CONFIG[item.type]?.image?.complete) {
          ctx.drawImage(
            ITEM_CONFIG[item.type].image,
            atomFrame * 50,
            0,
            50,
            50,
            0,
            0,
            40,
            40
          );
        }

        // Отображение количества
        if (item.quantity > 1) {
          const quantityEl = document.createElement("div");
          quantityEl.textContent = item.quantity;
          quantityEl.style.position = "absolute";
          quantityEl.style.top = "0";
          quantityEl.style.right = "0";
          quantityEl.style.color = "#00ffff";
          quantityEl.style.fontSize = "14px";
          quantityEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
          slot.appendChild(quantityEl);
        }
      } else {
        // Обрабатываем остальные предметы (stackable и не-stackable)
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[item.type]?.image?.src || "";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.pointerEvents = "none";
        slot.appendChild(img);

        // Отображение количества для stackable
        if (ITEM_CONFIG[item.type]?.stackable && item.quantity > 1) {
          const quantityEl = document.createElement("div");
          quantityEl.textContent = item.quantity;
          quantityEl.style.position = "absolute";
          quantityEl.style.top = "0";
          quantityEl.style.right = "0";
          quantityEl.style.color = "#00ffff";
          quantityEl.style.fontSize = "14px";
          quantityEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
          slot.appendChild(quantityEl);
        }
      }

      // Обработчики событий
      slot.onmouseover = () => {
        if (inventory[i] && selectedSlot !== i) {
          if (
            selectedSlot !== null &&
            ITEM_CONFIG[inventory[selectedSlot].type]?.stackable &&
            inventoryScreen.querySelector(".balyary-drop-form")
          ) {
            return;
          }
          inventoryScreen.textContent =
            ITEM_CONFIG[inventory[i].type]?.description || "";
        }
      };
      slot.onmouseout = () => {
        if (
          selectedSlot === null ||
          (inventory[selectedSlot] &&
            ITEM_CONFIG[inventory[selectedSlot].type]?.stackable &&
            inventoryScreen.querySelector(".balyary-drop-form"))
        ) {
          return;
        }
        inventoryScreen.textContent =
          selectedSlot !== null && inventory[selectedSlot]
            ? ITEM_CONFIG[inventory[selectedSlot].type]?.description || ""
            : "";
      };
      slot.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectSlot(i, slot);
      };
    } else {
      slot.onmouseover = null;
      slot.onmouseout = null;
      slot.onclick = null;
    }
  });

  // Обновляем кнопки действий
  if (useBtn && dropBtn) {
    useBtn.disabled = selectedSlot === null || !inventory[selectedSlot];
    dropBtn.disabled = selectedSlot === null || !inventory[selectedSlot];
  }
}

function handleGameMessage(event) {
  try {
    const data = JSON.parse(event.data);
    const currentWorldId = window.worldSystem.currentWorldId;

    switch (data.type) {
      case "syncPlayers":
        if (data.worldId === currentWorldId && data.players) {
          const myPlayer = players.get(myId);
          players.clear();
          if (myPlayer) players.set(myId, { ...myPlayer, frameTime: 0 });

          data.players.forEach((p) => {
            if (p?.id && p.id !== myId) {
              players.set(p.id, {
                ...p,
                frameTime: 0,
                animTime: 0,
                targetX: p.x,
                targetY: p.y,
                targetFrame: p.state === "walking" ? p.frame : 0,
                targetDirection: p.direction,
                targetState: p.state,
                targetAttackFrame: p.attackFrame || 0,
              });
            }
          });
        }
        break;
      case "unequipItemSuccess":
        me = players.get(myId);
        if (me) {
          me.inventory = data.inventory;
          me.equipment = data.equipment;
          inventory = me.inventory.map((slot) => (slot ? { ...slot } : null));
          window.equipmentSystem.equipmentSlots = data.equipment;
          window.equipmentSystem.applyEquipmentEffects(me);
          window.equipmentSystem.updateEquipmentDisplay();
          updateInventoryDisplay();
          updateStatsDisplay();
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
            if (data.lights) {
              lights.length = 0;
              data.lights.forEach((light) =>
                lights.push({
                  ...light,
                  baseRadius: light.radius,
                  pulseSpeed: 0.001,
                })
              );
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
          }
        }, 1000); // Задержка 1 секунда
        break;
      case "newPlayer":
        if (data.player?.id && data.player.worldId === currentWorldId) {
          players.set(data.player.id, {
            ...data.player,
            animTime: 0,
            targetX: data.player.x,
            targetY: data.player.y,
            targetDirection: data.player.direction,
            targetState: data.player.state,
            targetAttackFrame: data.player.attackFrame || 0,
          });
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
            pendingPickups.delete(item.itemId);
          }
        });
        break;
      case "itemPicked":
        items.delete(data.itemId);
        pendingPickups.delete(data.itemId);
        const me = players.get(myId);
        if (me && data.playerId === myId && data.item) {
          if (data.item.type === "balyary") {
            const balyarySlot = inventory.findIndex(
              (slot) => slot && slot.type === "balyary"
            );
            if (balyarySlot !== -1) {
              inventory[balyarySlot].quantity =
                (inventory[balyarySlot].quantity || 1) + 1;
            } else {
              const freeSlot = inventory.findIndex((slot) => slot === null);
              if (freeSlot !== -1) {
                inventory[freeSlot] = {
                  type: "balyary",
                  quantity: 1,
                  itemId: data.itemId,
                };
              }
            }
          } else {
            const freeSlot = inventory.findIndex((slot) => slot === null);
            if (freeSlot !== -1) {
              inventory[freeSlot] = data.item;
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
        break;
      case "equipItemFail":
        window.equipmentSystem.handleEquipFail(data.error);
        break;
      case "inventoryFull":
        pendingPickups.delete(data.itemId);
        break;
      case "update":
        if (data.player?.id === myId) {
          // Обновление себя — только статы (позиция интерполируется движением)
          const me = players.get(myId);
          if (me) {
            // Если двигаемся или атакуем — обновляем только статы
            const isMoving = me.state === "walking" || me.state === "attacking";
            if (isMoving) {
              const {
                x,
                y,
                direction,
                state,
                frame,
                attackFrame,
                attackFrameTime,
                ...stats
              } = data.player;
              Object.assign(me, stats);
            } else {
              // Стоим — лёгкая интерполяция позиции от сервера
              if (data.player.x !== undefined && data.player.y !== undefined) {
                me.serverTargetX = data.player.x;
                me.serverTargetY = data.player.y;
                me.x += (me.serverTargetX - me.x) * 0.15;
                me.y += (me.serverTargetY - me.y) * 0.15;
                if (
                  Math.abs(me.serverTargetX - me.x) < 1 &&
                  Math.abs(me.serverTargetY - me.y) < 1
                ) {
                  me.x = me.serverTargetX;
                  me.y = me.serverTargetY;
                  delete me.serverTargetX;
                  delete me.serverTargetY;
                }
              }
              const { x, y, ...stats } = data.player;
              Object.assign(me, stats);
            }

            // Всегда обновляем direction и state (важно для атаки!)
            if (data.player.direction !== undefined)
              me.direction = data.player.direction;
            if (data.player.state !== undefined) me.state = data.player.state;

            // Инвентарь и экипировка
            if (data.player.inventory) {
              inventory = data.player.inventory;
              updateInventoryDisplay();
            }
            if (data.player.equipment) {
              window.equipmentSystem.syncEquipment(data.player.equipment);
            }
            updateStatsDisplay();
          }
        } else if (data.player?.id) {
          // ===== ДРУГИЕ ИГРОКИ =====
          const existing = players.get(data.player.id) || {};
          const wasAttacking = existing.state === "attacking";
          const isAttacking = data.player.state === "attacking";

          // Основное обновление
          const updatedPlayer = {
            ...existing,
            ...data.player,
            targetX: data.player.x,
            targetY: data.player.y,
            targetDirection: data.player.direction,
            targetState: data.player.state,
            x: existing.x ?? data.player.x,
            y: existing.y ?? data.player.y,
            direction: data.player.direction ?? existing.direction,
            state: data.player.state ?? existing.state,
          };

          // === КРИТИЧНАЯ ЛОГИКА АНИМАЦИИ АТАКИ ===
          if (isAttacking && !wasAttacking) {
            // Только что начал атаковать (даже стоя!)
            updatedPlayer.attackFrame = 0;
            updatedPlayer.attackFrameTime = 0;
            updatedPlayer.animTime = 0;
            updatedPlayer.frame = 0;
          } else if (isAttacking && wasAttacking) {
            // Продолжает атаку — можно принять кадр с сервера, если пришёл
            if (data.player.attackFrame !== undefined) {
              updatedPlayer.attackFrame = data.player.attackFrame;
              updatedPlayer.attackFrameTime = data.player.attackFrameTime || 0;
            }
          } else if (!isAttacking && wasAttacking) {
            // Закончил атаку
            updatedPlayer.attackFrame = 0;
            updatedPlayer.attackFrameTime = 0;
          }
          // Если не атакует — сбрасываем
          if (!isAttacking) {
            updatedPlayer.attackFrame = 0;
            updatedPlayer.attackFrameTime = 0;
          }

          // Ходьба — только если не атакует
          if (data.player.state === "walking") {
            updatedPlayer.animTime = existing.animTime || 0;
            updatedPlayer.frame = existing.frame ?? 0;
          } else if (data.player.state !== "attacking") {
            updatedPlayer.frame = 0;
            updatedPlayer.animTime = 0;
          }

          players.set(data.player.id, updatedPlayer);
        }
        break;
      case "itemDropped":
        if (data.worldId === currentWorldId) {
          items.set(data.itemId, {
            x: data.x,
            y: data.y,
            type: data.type,
            spawnTime: data.spawnTime,
            worldId: data.worldId,
          });
          if (data.quantity && ITEM_CONFIG[data.type]?.stackable) {
            items.get(data.itemId).quantity = data.quantity;
          }
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
        } else {
          const errorEl = document.getElementById("vendingError");
          errorEl.textContent = data.error || "Ошибка покупки";
        }
        break;
      case "totalOnline":
        updateOnlineCount(data.count);
        break;
      case "tradeRequest":
      case "tradeAccepted":
      case "tradeCancelled":
      case "tradeOffer":
      case "tradeConfirmed":
      case "tradeCompleted":
        window.tradeSystem.handleTradeMessage(data);
        break;
      case "useItemSuccess":
        {
          const me = players.get(myId);
          if (me) {
            me.health = data.stats.health;
            me.energy = data.stats.energy;
            me.food = data.stats.food;
            me.water = data.stats.water;
          }
          inventory = data.inventory;
          updateStatsDisplay();
          updateInventoryDisplay();
        }
        break;
      case "syncBullets":
        window.combatSystem.syncBullets(data.bullets);
        break;
      case "newEnemy":
        enemies.set(data.enemy.id, {
          ...data.enemy,
          frame: 0,
          frameTime: 0,
          lastAttackTime: 0,
        });
      case "enemyKilled":
        break;
      case "levelSyncAfterKill": {
        // Мгновенно обновляем уровень, XP, xpToNextLevel, upgradePoints
        if (window.levelSystem) {
          window.levelSystem.currentLevel = data.level;
          window.levelSystem.currentXP = data.xp;
          window.levelSystem.xpToNextLevel = data.xpToNextLevel;
          window.levelSystem.upgradePoints = data.upgradePoints;
          if (typeof window.levelSystem.setLevelData === "function") {
            window.levelSystem.setLevelData(
              data.level,
              data.xp,
              null,
              data.upgradePoints
            );
          }
          if (typeof window.levelSystem.showXPEffect === "function") {
            window.levelSystem.showXPEffect(data.xpGained);
          }
          if (typeof window.levelSystem.updateLevelDisplay === "function") {
            window.levelSystem.updateLevelDisplay();
          }
          if (typeof window.levelSystem.updateStatsDisplay === "function") {
            window.levelSystem.updateStatsDisplay();
          }
          if (typeof window.levelSystem.updateUpgradeButtons === "function") {
            window.levelSystem.updateUpgradeButtons();
          }
        }
        break;
      }
      case "syncEnemies":
        window.enemySystem.syncEnemies(data.enemies);
        break;
      case "enemyUpdate":
        if (data.enemy && data.enemy.id) {
          enemies.set(data.enemy.id, {
            ...enemies.get(data.enemy.id),
            ...data.enemy,
          });
        }
        break;
      case "enemyDied":
        enemies.delete(data.enemyId);
        if (window.enemySystem && window.enemySystem.handleEnemyDeath) {
          window.enemySystem.handleEnemyDeath(data.enemyId);
        }
        break;
      case "enemyUpdate":
        if (data.enemy && data.enemy.id && enemies.has(data.enemy.id)) {
          const existing = enemies.get(data.enemy.id);
          enemies.set(data.enemy.id, {
            ...existing,
            ...data.enemy,
            targetX: data.enemy.x, // Для интерполяции
            targetY: data.enemy.y,
          });
        }
        break;
      case "enemyAttack":
        // Визуал атаки на игрока (например, triggerAttackAnimation если targetId === myId)
        if (data.targetId === myId) {
          triggerAttackAnimation();
        }
        break;
      case "neonQuestStarted":
        showNotification("Заказ принят: Очистка пустошей", "#00ff44");
        break;
      case "neonQuestProgressUpdate":
        // Это основное обновление прогресса от сервера
        if (window.neonNpcSystem) {
          const me = players.get(myId);
          if (me && me.neonQuest) {
            me.neonQuest.progress = {
              ...me.neonQuest.progress,
              ...data.progress,
            };
            if (me.neonQuest.currentQuestId === "neon_quest_1") {
              updateQuestProgressDisplay(); // вызываем из neon_npc.js
            }
          }
        }
        break;
      case "neonQuestCompleted":
        showNotification(
          `Заказ сдан! +${data.reward.xp} XP | +${data.reward.balyary} баляров!`,
          "#00ffff"
        );
        if (window.levelSystem) {
          window.levelSystem.setLevelData(
            data.level,
            data.xp,
            data.xpToNextLevel,
            data.upgradePoints
          );
          window.levelSystem.showXPEffect(data.reward.xp);
        }
        updateInventoryDisplay();
        break;
      case "doctorQuestCompleted":
        showNotification(
          "Мед. справка получена! Форма МД-07 в инвентаре.",
          "#00ff44"
        );
        me = players.get(myId);
        if (me) {
          me.inventory = data.inventory;
          me.medicalCertificate = data.medicalCertificate || true; // синхронизируем флаг
          inventory = data.inventory.map((i) => (i ? { ...i } : null));
          updateInventoryDisplay();
        }
        break;
      case "robotDoctorResult":
        if (data.success) {
          const me = players.get(myId);
          if (me) {
            if (data.health !== undefined) me.health = data.health;
            if (data.inventory) {
              inventory = data.inventory.map((i) => (i ? { ...i } : null));
              updateInventoryDisplay();
            }
            updateStatsDisplay();
            showNotification(
              data.action === "freeHeal"
                ? "Осмотр пройден. Здоровье восстановлено!"
                : data.action === "heal20"
                ? "+20 HP за 1 баляр"
                : `Полное восстановление за ${data.cost} баляров!`,
              "#00ff44"
            );
          }
        } else {
          showNotification(data.error || "Лечение невозможно", "#ff0066");
        }
        break;
      case "captainStampResult":
        if (data.success) {
          // Обновляем инвентарь
          inventory = data.inventory.map((i) => (i ? { ...i } : null));
          updateInventoryDisplay();

          // Важно: сохраняем новый флаг в объекте игрока
          const me = players.get(myId);
          if (me) {
            me.medicalCertificateStamped =
              data.medicalCertificateStamped ?? true;
            players.set(myId, me);
          }

          // Уведомление
          showNotification(
            "Печать получена! Допуск в Неоновый Город выдан.",
            "#00ff44"
          );

          // Звук успеха
          if (window.soundSystem && window.soundSystem.play) {
            window.soundSystem.play("success");
          }

          // Автоматически закрываем диалог капитана
          const captainDialog = document.getElementById("captainDialog");
          if (captainDialog) captainDialog.remove();

          if (window.outpostCaptainSystem) {
            window.outpostCaptainSystem.isCaptainDialogOpen = () => false;
          }
        } else {
          showNotification(
            data.error || "Капитан отказался ставить печать.",
            "#ff0066"
          );
        }
        break;
      case "corporateDocumentsResult":
        if (data.success) {
          // Обновляем уровень и опыт
          window.levelSystem.setLevelData(
            data.level,
            data.xp,
            null,
            data.upgradePoints
          );

          // Обновляем инвентарь
          inventory = data.inventory;
          updateInventoryDisplay();

          // Уведомление
          showNotification(
            "Документы приняты. Добро пожаловать в Корпорацию!",
            "#00ffff"
          );
          showNotification(
            "Получен стартовый комплект снаряжения и кастет",
            "#ffff00"
          );

          // Закрываем диалог
          if (window.corporateRobotSystem?.isPlayerInteracting()) {
            document.querySelector(".npc-dialog")?.style &&
              (document.querySelector(".npc-dialog").style.display = "none");
          }
        } else {
          showNotification(
            data.error || "Ошибка при сдаче документов",
            "#ff0000"
          );
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
  // Глобальная анимация атома — одна на всю игру
  atomFrameTime += deltaTime;
  while (atomFrameTime >= ATOM_FRAME_DURATION) {
    atomFrameTime -= ATOM_FRAME_DURATION;
    atomFrame = (atomFrame + 1) % ATOM_FRAMES;
  }

  const me = players.get(myId);
  if (!me) return;

  const currentWorldId = window.worldSystem.currentWorldId;
  const camera = window.movementSystem.getCamera();

  // === Интерполяция и анимация других игроков ===
  players.forEach((player, id) => {
    if (id === myId || player.worldId !== currentWorldId) return;

    const lerpFactor = 0.15;

    // Позиция
    if (player.targetX !== undefined) {
      player.x += (player.targetX - player.x) * lerpFactor;
      player.y += (player.targetY - player.y) * lerpFactor;
    }

    // Состояние и направление — сразу с сервера
    player.direction = player.targetDirection ?? player.direction;
    player.state = player.targetState ?? player.state;

    // === ОТСЛЕЖИВАНИЕ ПЕРЕХОДА В АТАКУ ===
    // Сохраняем предыдущее состояние (нужно для детекта начала атаки)
    if (player.prevState === undefined) {
      player.prevState = player.state;
    }

    // Если только что перешёл в атаку — принудительно запускаем анимацию с начала
    if (player.state === "attacking" && player.prevState !== "attacking") {
      player.attackFrame = 0;
      player.attackFrameTime = 0;
      player.animTime = 0; // на всякий случай сбрасываем ходьбу
      player.frame = 0;
    }

    // Обновляем prevState для следующего кадра
    player.prevState = player.state;

    // Атака — фиксируем кадр с сервера
    if (player.state === "attacking") {
      // Таймеры инициализируются при переходе в атаку (выше)
      player.attackFrameTime += deltaTime;

      const ATTACK_FRAME_DURATION = 500 / ATTACK_FRAME_COUNT; // ~38.46 мс на кадр (500 мс на всю атаку)

      while (player.attackFrameTime >= ATTACK_FRAME_DURATION) {
        player.attackFrameTime -= ATTACK_FRAME_DURATION;
        player.attackFrame += 1;

        if (player.attackFrame >= ATTACK_FRAME_COUNT) {
          // Анимация закончилась
          player.attackFrame = 0;
          player.attackFrameTime = 0;

          // Определяем, куда возвращаться
          const isMoving =
            player.targetX !== undefined &&
            (Math.abs(player.targetX - player.x) > 3 ||
              Math.abs(player.targetY - player.y) > 3);

          player.state = isMoving ? "walking" : "idle";
          player.animTime = 0;
          player.frame = 0;
        }
      }
    } else {
      // Не атакует — сбрасываем всё связанное с атакой
      player.attackFrame = 0;
      player.attackFrameTime = 0;
    }

    // === ЛОКАЛЬНАЯ АНИМАЦИЯ ХОДЬБЫ ===
    if (player.state === "walking") {
      player.animTime = (player.animTime || 0) + deltaTime;
      const frameDuration = 80;
      player.frame =
        Math.floor(player.animTime / frameDuration) % WALK_FRAME_COUNT;
    } else if (player.state !== "attacking") {
      player.frame = 0;
      player.animTime = 0;
    }
  });

  // Применяем эффекты экипировки один раз при логине
  if (
    window.equipmentSystem &&
    me.equipment &&
    !window.equipmentSystem.lastApplied
  ) {
    window.equipmentSystem.syncEquipment(me.equipment);
    window.equipmentSystem.lastApplied = true;
    updateStatsDisplay();
  }

  window.movementSystem.update(deltaTime);
  if (me.health <= 0) return;

  // Обновление систем
  window.combatSystem.update(deltaTime);

  window.enemySystem.update(deltaTime);

  if (window.neonNpcSystem) window.neonNpcSystem.update(deltaTime);
  if (window.vacuumRobotSystem) window.vacuumRobotSystem.update(deltaTime);
  window.cockroachSystem.update(deltaTime);
  window.droneSystem.update(deltaTime);
  window.bonfireSystem.update(deltaTime);
  clockSystem.update(deltaTime);
  if (window.corporateRobotSystem)
    window.corporateRobotSystem.update(deltaTime);
  if (window.robotDoctorSystem) window.robotDoctorSystem.update(deltaTime);
  if (window.outpostCaptainSystem)
    window.outpostCaptainSystem.update(deltaTime);
  if (me && me.state === "attacking" && ws.readyState === WebSocket.OPEN) {
    // Отправляем каждые 100 мс (или реже, чтобы не спамить)
    const currentTime = Date.now();
    if (!me.lastAttackUpdate || currentTime - me.lastAttackUpdate > 100) {
      me.lastAttackUpdate = currentTime;

      sendWhenReady(
        ws,
        JSON.stringify({
          type: "update",
          player: {
            id: myId,
            state: "attacking",
            attackFrame: me.attackFrame || 0,
            attackFrameTime: me.attackFrameTime || 0,
            direction: me.direction,
            x: me.x,
            y: me.y,
            // Не обязательно слать статы каждый раз — только если нужно
          },
        })
      );
    }
  }
  window.worldSystem.checkTransitionZones(me.x, me.y);
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

  // Рисуем фон
  if (currentWorld.bg && currentWorld.bg.complete) {
    ctx.fillStyle = ctx.createPattern(currentWorld.bg, "repeat");
    ctx.save();
    ctx.translate(
      -(groundOffsetX % currentWorld.bg.width),
      -(window.movementSystem.getCamera().y * groundSpeed) %
        currentWorld.bg.height
    );
    ctx.fillRect(
      (groundOffsetX % currentWorld.bg.width) - currentWorld.bg.width,
      ((window.movementSystem.getCamera().y * groundSpeed) %
        currentWorld.bg.height) -
        currentWorld.bg.height,
      currentWorld.w + currentWorld.bg.width,
      currentWorld.h + currentWorld.bg.height
    );
    ctx.restore();
  } else {
    ctx.fillStyle = "rgba(10, 20, 40, 1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  window.lightsSystem.draw(deltaTime);

  // Отрисовка предметов (оптимизировано: без дубликатов, с ранней проверкой видимости)
  const cameraX = window.movementSystem.getCamera().x;
  const cameraY = window.movementSystem.getCamera().y;
  // Предметы — оптимизированная отрисовка
  const viewWidth = canvas.width + 100;
  const viewHeight = canvas.height + 100;

  items.forEach((item) => {
    if (item.worldId !== currentWorldId) return;

    const screenX = item.x - cameraX;
    const screenY = item.y - cameraY;

    if (
      screenX < -60 ||
      screenX > viewWidth ||
      screenY < -60 ||
      screenY > viewHeight
    )
      return;

    const config = ITEM_CONFIG[item.type];
    if (!config?.image?.complete) {
      ctx.fillStyle = "yellow";
      ctx.fillRect(screenX, screenY, 20, 20);
      return;
    }

    if (item.type === "atom") {
      ctx.drawImage(
        config.image,
        atomFrame * 50,
        0,
        50,
        50,
        screenX,
        screenY,
        50,
        50
      );
    } else {
      ctx.drawImage(config.image, screenX, screenY, 20, 20);
    }
  });

  // Остальные слои
  if (currentWorld.rocks.complete) {
    ctx.drawImage(
      currentWorld.rocks,
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

  if (window.cockroachSystem) {
    window.cockroachSystem.draw();
  }
  if (window.vacuumRobotSystem) {
    window.vacuumRobotSystem.draw();
  }

  window.npcSystem.drawNPC(deltaTime);
  window.bonfireSystem.draw();
  window.jackSystem.drawJack(deltaTime);
  window.vendingMachine.draw();
  window.combatSystem.draw();
  window.enemySystem.draw();
  window.corporateRobotSystem.draw();

  players.forEach((player) => {
    if (player.worldId !== currentWorldId) return;

    const screenX = player.x - cameraX;
    const screenY = player.y - cameraY;
    if (
      screenX < -80 ||
      screenX > viewWidth ||
      screenY < -80 ||
      screenY > viewHeight
    )
      return;

    let spriteX, spriteY;

    if (player.state === "dying") {
      spriteY = SPRITE_ROWS.walk_down;
      spriteX = player.frame * PLAYER_FRAME_WIDTH;
    } else if (player.state === "attacking") {
      let frame = player.attackFrame || 0;
      if (frame >= ATTACK_FRAME_COUNT) frame = ATTACK_FRAME_COUNT - 1;
      spriteX = frame * PLAYER_FRAME_WIDTH;
      spriteY =
        player.direction === "up" || player.direction === "down"
          ? SPRITE_ROWS.attack_up_down
          : player.direction === "right"
          ? SPRITE_ROWS.attack_right
          : SPRITE_ROWS.attack_left;
    } else {
      const frame = player.state === "walking" ? player.frame : 0;
      spriteX = frame * PLAYER_FRAME_WIDTH;
      spriteY =
        {
          up: SPRITE_ROWS.walk_up,
          down: SPRITE_ROWS.walk_down,
          left: SPRITE_ROWS.walk_left,
          right: SPRITE_ROWS.walk_right,
        }[player.direction] || SPRITE_ROWS.walk_down;
    }

    if (images.playerSprite?.complete) {
      ctx.drawImage(
        images.playerSprite,
        spriteX,
        spriteY,
        PLAYER_FRAME_WIDTH,
        PLAYER_FRAME_HEIGHT,
        screenX,
        screenY,
        70,
        70
      );
    } else {
      ctx.fillStyle = "blue";
      ctx.fillRect(screenX, screenY, 70, 70);
    }

    // Оптимизированный неоновый текст (меньше слоёв, но всё ещё красиво)
    const nameY = screenY - 45;
    const healthY = screenY - 25;

    ctx.font = "20px 'Courier New', monospace";
    ctx.textAlign = "center";

    // Имя
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.strokeText(player.id, screenX + 35, nameY);
    ctx.fillStyle = "#00ffff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 10;
    ctx.fillText(player.id, screenX + 35, nameY);

    // Здоровье
    const healthText = `${Math.floor(player.health ?? 0)} / ${
      player.maxStats?.health ?? 100
    }`;
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.strokeText(healthText, screenX + 35, healthY);
    ctx.fillStyle = "#ff0066";
    ctx.shadowColor = "#ff0066";
    ctx.shadowBlur = 10;
    ctx.fillText(healthText, screenX + 35, healthY);

    ctx.shadowBlur = 0;
  });
  if (currentWorld.veg.complete) {
    ctx.drawImage(
      currentWorld.veg,
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

  if (window.neonNpcSystem) {
    window.neonNpcSystem.draw();
  }
  if (window.robotDoctorSystem) {
    window.robotDoctorSystem.draw();
  }
  window.outpostCaptainSystem.drawCaptain(ctx, cameraX, cameraY);
  clockSystem.draw();
  window.droneSystem.draw();

  if (currentWorld.clouds.complete) {
    ctx.drawImage(
      currentWorld.clouds,
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

  window.worldSystem.drawTransitionZones();
}

function checkCollisions() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  const currentWorldId = window.worldSystem.currentWorldId;
  items.forEach((item, id) => {
    if (item.worldId !== currentWorldId) return;
    if (!items.has(id)) return; // Убрал console.log для оптимизации
    if (pendingPickups.has(id)) return; // Убрал console.log

    const dx = me.x + 35 - (item.x + 10);
    const dy = me.y + 35 - (item.y + 10);
    const distanceSquared = dx * dx + dy * dy; // Используем квадрат расстояния вместо Math.sqrt для снижения нагрузки на CPU
    // Убрал console.log проверки расстояния

    if (distanceSquared < 2500) {
      // 50^2 = 2500, чтобы избежать дорогого Math.sqrt
      if (ws.readyState === WebSocket.OPEN) {
        pendingPickups.add(id);
        sendWhenReady(ws, JSON.stringify({ type: "pickup", itemId: id }));
        // Убрал console.log отправки и попытки подбора
      } else {
        // Убрал console.error
      }
    }
  });
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp; // Инициализация, как у тебя

  // Проверяем, пора ли рендерить (не чаще 30 FPS)
  if (timestamp - lastRender < 1000 / FPS) {
    requestAnimationFrame(gameLoop);
    return;
  }

  // Рассчитываем deltaTime только для рендера
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  lastRender = timestamp; // Обновляем время последнего рендера

  update(deltaTime);
  draw(deltaTime);
  requestAnimationFrame(gameLoop);
}

// Инициализация изображений (без изменений)
function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === 30) window.addEventListener("resize", resizeCanvas);
}
