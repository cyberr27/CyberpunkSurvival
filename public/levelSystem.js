/**
 * levelSystem.js
 * Реализует систему уровней и опыта для игры Cyberpunk Survival
 * Управляет конфигурацией предметов (ITEM_CONFIG)
 * Добавляет отображение уровня и опыта на клиенте
 * Управляет начислением опыта за подбор предметов
 */

// Конфигурация системы уровней
const LEVEL_CONFIG = {
  BASE_XP: 100,
};

// Конфигурация предметов (ITEM_CONFIG) для клиента
let ITEM_CONFIG =
  typeof window !== "undefined"
    ? {
        energy_drink: {
          effect: { energy: 20, water: 5 },
          image: window.energyDrinkImage,
          description: "Энергетик: +20 эн. +5 воды.",
          rarity: 2,
        },
        nut: {
          effect: { food: 7 },
          image: window.nutImage,
          description: "Орех: +7 еды.",
          rarity: 3,
        },
        water_bottle: {
          effect: { water: 30 },
          image: window.waterBottleImage,
          description: "Вода: +30 воды.",
          rarity: 3,
        },
        apple: {
          effect: { food: 8, water: 5 },
          image: window.appleImage,
          description: "Яблоко: +8 еды, +5 воды.",
          rarity: 3,
        },
        berries: {
          effect: { food: 6, water: 6 },
          image: window.berriesImage,
          description: "Ягоды: +6 еды, +6 воды.",
          rarity: 3,
        },
        carrot: {
          effect: { food: 5, energy: 3 },
          image: window.carrotImage,
          description: "Морковь: +5 еды, +3 энергии.",
          rarity: 3,
        },
        canned_meat: {
          effect: { food: 20 },
          image: window.cannedMeatImage,
          description: "Банка тушёнки: +20 еды.",
          rarity: 1,
        },
        mushroom: {
          effect: { food: 5, energy: 15 },
          image: window.mushroomImage,
          description: "Гриб прущий: +15 энергии. +5 еды.",
          rarity: 1,
        },
        sausage: {
          effect: { food: 16, energy: 3 },
          image: window.sausageImage,
          description: "Колбаса: +16 еды, +3 энергии.",
          rarity: 2,
        },
        blood_pack: {
          effect: { health: 40 },
          image: window.bloodPackImage,
          description: "Пакет крови: +40 здоровья.",
          rarity: 1,
        },
        bread: {
          effect: { food: 13, water: -2 },
          image: window.breadImage,
          description: "Хлеб: +13 еды, -2 воды.",
          rarity: 2,
        },
        vodka_bottle: {
          effect: { health: 5, energy: -2, water: 1, food: 2 },
          image: window.vodkaBottleImage,
          description: "Водка: +5 здоровья, -2 эн. +1 воды, +2 еды.",
          rarity: 2,
        },
        meat_chunk: {
          effect: { food: 20, energy: 5, water: -2 },
          image: window.meatChunkImage,
          description: "Кусок мяса: +20 еды, +5 эн. -2 воды.",
          rarity: 2,
        },
        blood_syringe: {
          effect: { health: 10 },
          image: window.bloodSyringeImage,
          description: "Шприц с кровью: +10 здоровья.",
          rarity: 2,
        },
        milk: {
          effect: { water: 15, food: 5 },
          image: window.milkImage,
          description: "Молоко: +15 воды, +5 еды.",
          rarity: 2,
        },
        condensed_milk: {
          effect: { water: 5, food: 11, energy: 2 },
          image: window.condensedMilkImage,
          description: "Сгущёнка: +11 еды, +5 воды, +2 эн.",
          rarity: 2,
        },
        dried_fish: {
          effect: { food: 10, water: -3 },
          image: window.driedFishImage,
          description: "Сушёная рыба: +10 еды, -3 воды.",
          rarity: 2,
        },
        balyary: {
          effect: {},
          image: window.balyaryImage,
          description: "Баляр: игровая валюта.",
          stackable: true,
          rarity: 2,
        },
      }
    : null;

// Функция для получения опыта за предмет на основе его редкости
function getXPForItem(itemType) {
  if (!ITEM_CONFIG) {
    console.error("ITEM_CONFIG не инициализирован, возвращаем базовый XP");
    return 1;
  }
  const rarity = ITEM_CONFIG[itemType]?.rarity || 1;
  console.log(
    `Получение XP для ${itemType}, редкость: ${rarity}, XP: ${rarity}`
  );
  return rarity;
}

// Функция для проверки и повышения уровня
function checkLevelUp(player) {
  if (!player) {
    console.error("Игрок не определён в checkLevelUp");
    return null;
  }
  while (player.xp >= LEVEL_CONFIG.BASE_XP) {
    player.xp -= LEVEL_CONFIG.BASE_XP;
    player.level += 1;
    console.log(`Игрок ${player.id} повысил уровень до ${player.level}!`);
  }
  return player;
}

// Серверная функция для обработки подбора предмета
function handleItemPickupServer(player, itemType) {
  if (!player) {
    console.error("Игрок не определён в handleItemPickupServer");
    return null;
  }
  const xpGained = getXPForItem(itemType);
  player.xp = (player.xp || 0) + xpGained;
  player.level = player.level || 0;
  player = checkLevelUp(player);
  console.log(
    `Игрок ${player.id} получил ${xpGained} XP за ${itemType}, текущий XP: ${player.xp}, уровень: ${player.level}`
  );
  return player;
}

// Клиентская функция для обработки получения опыта
function handleItemPickupClient(itemId, itemType) {
  const me = window.players?.get(window.myId);
  if (!me) {
    console.error("Игрок не найден в handleItemPickupClient");
    return;
  }
  console.log(
    `Отправка запроса на подбор предмета ${itemType} (ID: ${itemId})`
  );
  window.sendWhenReady(
    window.ws,
    JSON.stringify({
      type: "pickup",
      itemId: itemId,
    })
  );
}

// Клиентская функция для отображения уровня и опыта
function drawLevelAndXP(ctx, player, camera) {
  if (!player) {
    console.warn("Игрок не определён в drawLevelAndXP");
    return;
  }
  ctx.fillStyle = "#00ffff";
  ctx.font = "16px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  const levelText = `Lvl: ${player.level || 0}`;
  const xpText = `${player.xp || 0} / ${LEVEL_CONFIG.BASE_XP} xp`;
  ctx.fillText(levelText, 10 - camera.x, window.canvas.height - 30 - camera.y);
  ctx.fillText(xpText, 10 - camera.x, window.canvas.height - 10 - camera.y);
}

// Экспорт для браузера и Node.js
const LevelSystem = {
  handleItemPickupServer,
  handleItemPickupClient,
  drawLevelAndXP,
  checkLevelUp,
  setItemConfig: (config) => {
    ITEM_CONFIG = config; // Для сервера
    console.log("ITEM_CONFIG установлен для сервера");
  },
  getItemConfig: () => {
    if (!ITEM_CONFIG) {
      console.error("ITEM_CONFIG не инициализирован при вызове getItemConfig");
    }
    return ITEM_CONFIG;
  },
};

// Для Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = LevelSystem;
} else {
  // Для браузера
  window.LevelSystem = LevelSystem;
}
