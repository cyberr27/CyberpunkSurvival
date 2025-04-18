/**
 * levelSystem.js
 * Реализует систему уровней и опыта для игры Cyberpunk Survival
 * Добавляет отображение уровня и опыта на клиенте
 * Управляет начислением опыта за подбор предметов
 */

// Конфигурация системы уровней
const LEVEL_CONFIG = {
  BASE_XP: 100, // Базовый опыт, необходимый для следующего уровня
};

// Функция для получения опыта за предмет на основе его редкости
function getXPForItem(itemType) {
  const rarity = ITEM_CONFIG[itemType]?.rarity || 1; // По умолчанию редкость 1
  return rarity; // 1 XP за редкость 1, 2 XP за редкость 2, 3 XP за редкость 3
}

// Функция для проверки и повышения уровня
function checkLevelUp(player) {
  while (player.xp >= LEVEL_CONFIG.BASE_XP) {
    player.xp -= LEVEL_CONFIG.BASE_XP; // Снимаем 100 XP
    player.level += 1; // Повышаем уровень
    console.log(`Игрок ${player.id} повысил уровень до ${player.level}!`);
  }
  return player;
}

// Серверная функция для обработки подбора предмета (вызывается на сервере)
function handleItemPickupServer(player, itemType) {
  const xpGained = getXPForItem(itemType);
  player.xp = (player.xp || 0) + xpGained; // Добавляем опыт
  player.level = player.level || 0; // Убедимся, что уровень инициализирован
  player = checkLevelUp(player); // Проверяем повышение уровня
  return player;
}

// Клиентская функция для отображения уровня и опыта
function drawLevelAndXP(ctx, player, camera) {
  if (!player) return;
  ctx.fillStyle = "#00ffff"; // Цвет текста (неон)
  ctx.font = "16px 'Courier New', monospace"; // Шрифт в стиле киберпанка
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";

  // Отрисовка в нижнем левом углу (с отступом 10 пикселей)
  const levelText = `Lvl: ${player.level || 0}`;
  const xpText = `${player.xp || 0} / ${LEVEL_CONFIG.BASE_XP} xp`;
  ctx.fillText(levelText, 10 - camera.x, canvas.height - 30 - camera.y);
  ctx.fillText(xpText, 10 - camera.x, canvas.height - 10 - camera.y);
}

// Клиентская функция для обработки получения опыта
function handleItemPickupClient(itemId, itemType) {
  const me = players.get(myId);
  if (!me) return;

  // Отправляем запрос на сервер для начисления опыта
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "pickup",
      itemId: itemId,
    })
  );
}

// Экспортируем функции для использования в других частях игры
window.LevelSystem = {
  handleItemPickupServer,
  handleItemPickupClient,
  drawLevelAndXP,
  checkLevelUp,
};
