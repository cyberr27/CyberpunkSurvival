// levelSystem.js
/**
 * levelSystem.js
 * Реализует систему уровней и опыта для игры Cyberpunk Survival
 * Добавляет отображение уровня и опыта на клиенте
 * Управляет начислением опыта за подбор предметов
 */

// Конфигурация системы уровней
const LEVEL_CONFIG = {
  BASE_XP: 100,
};

// Зависимость от ITEM_CONFIG (для сервера нужно передать)
let ITEM_CONFIG = typeof window !== "undefined" ? window.ITEM_CONFIG : null;

// Функция для получения опыта за предмет на основе его редкости
function getXPForItem(itemType) {
  const rarity = ITEM_CONFIG[itemType]?.rarity || 1;
  return rarity;
}

// Функция для проверки и повышения уровня
function checkLevelUp(player) {
  while (player.xp >= LEVEL_CONFIG.BASE_XP) {
    player.xp -= LEVEL_CONFIG.BASE_XP;
    player.level += 1;
    console.log(`Игрок ${player.id} повысил уровень до ${player.level}!`);
  }
  return player;
}

// Серверная функция для обработки подбора предмета
function handleItemPickupServer(player, itemType) {
  const xpGained = getXPForItem(itemType);
  player.xp = (player.xp || 0) + xpGained;
  player.level = player.level || 0;
  player = checkLevelUp(player);
  return player;
}

// Клиентская функция для отображения уровня и опыта
function drawLevelAndXP(ctx, player, camera) {
  if (!player) return;
  ctx.fillStyle = "#00ffff";
  ctx.font = "16px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  const levelText = `Lvl: ${player.level || 0}`;
  const xpText = `${player.xp || 0} / ${LEVEL_CONFIG.BASE_XP} xp`;
  ctx.fillText(levelText, 10 - camera.x, canvas.height - 30 - camera.y);
  ctx.fillText(xpText, 10 - camera.x, canvas.height - 10 - camera.y);
}

// Клиентская функция для обработки получения опыта
function handleItemPickupClient(itemId, itemType) {
  const me = players.get(myId);
  if (!me) return;
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "pickup",
      itemId: itemId,
    })
  );
}

// Экспорт для браузера и Node.js
const LevelSystem = {
  handleItemPickupServer,
  handleItemPickupClient,
  drawLevelAndXP,
  checkLevelUp,
  setItemConfig: (config) => {
    ITEM_CONFIG = config; // Для сервера, чтобы передать ITEM_CONFIG
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = LevelSystem; // Для Node.js
} else {
  window.LevelSystem = LevelSystem; // Для браузера
}
