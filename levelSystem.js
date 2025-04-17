const LEVELS = Array(101).fill(0); // Массив для хранения порогов опыта (0-100 уровни)
LEVELS[0] = 0; // 0 уровень
LEVELS[1] = 100; // 1 уровень требует 100 XP

// Заполняем пороги опыта: каждый уровень требует в 2 раза больше, чем предыдущий
for (let i = 2; i <= 100; i++) {
  const prevLevelXP = LEVELS[i - 1] - LEVELS[i - 2]; // Опыт для предыдущего уровня
  LEVELS[i] = LEVELS[i - 1] + prevLevelXP * 2; // Текущий уровень = предыдущий + удвоенный опыт
}

// Константы редкости предметов (синхронизированы с server.js)
const ITEM_RARITY = {
  // Редкие (rarity 1)
  blood_pack: 1,
  canned_meat: 1,
  mushroom: 1,
  // Средние (rarity 2)
  dried_fish: 2,
  condensed_milk: 2,
  milk: 2,
  blood_syringe: 2,
  meat_chunk: 2,
  vodka_bottle: 2,
  bread: 2,
  sausage: 2,
  energy_drink: 2,
  balyary: 2,
  // Частые (rarity 3)
  water_bottle: 3,
  nut: 3,
  apple: 3,
  berries: 3,
  carrot: 3,
};

// Функция для получения текущего уровня на основе опыта
function getLevelFromXP(xp) {
  for (let i = 1; i <= 100; i++) {
    if (xp < LEVELS[i]) {
      return i - 1; // Возвращаем предыдущий уровень
    }
  }
  return 100; // Максимальный уровень
}

// Функция для получения прогресса опыта для текущего уровня
function getLevelProgress(xp) {
  const currentLevel = getLevelFromXP(xp);
  if (currentLevel === 100) {
    return { currentXP: 0, requiredXP: 0, progress: "Max Level" }; // Максимальный уровень
  }
  const currentXP = xp - LEVELS[currentLevel]; // Текущий прогресс опыта
  const requiredXP = LEVELS[currentLevel + 1] - LEVELS[currentLevel]; // Необходимый опыт для следующего уровня
  return { currentXP, requiredXP, progress: `${currentXP} / ${requiredXP}xp` };
}

// Функция для начисления опыта за поднятие предмета
function awardExperienceForItem(player, itemType, dbCollection) {
  const rarity = ITEM_RARITY[itemType] || 3; // По умолчанию частый предмет
  let xpToAdd = 0;
  switch (rarity) {
    case 1: // Редкий
      xpToAdd = 3;
      break;
    case 2: // Средний
      xpToAdd = 2;
      break;
    case 3: // Частый
      xpToAdd = 1;
      break;
    default:
      xpToAdd = 1;
  }
  console.log(
    `Игрок ${player.id} получил ${xpToAdd} XP за предмет ${itemType} (редкость ${rarity})`
  );
  return addExperience(player, xpToAdd, dbCollection);
}

// Функция для добавления опыта игроку
function addExperience(player, xp, dbCollection) {
  player.xp = (player.xp || 0) + xp; // Добавляем опыт
  const oldLevel = player.level || 0;
  player.level = getLevelFromXP(player.xp); // Обновляем уровень
  if (player.level > oldLevel) {
    console.log(`Игрок ${player.id} достиг уровня ${player.level}!`);
  }
  const progress = getLevelProgress(player.xp);
  player.levelProgress = progress.progress; // Сохраняем строку прогресса
  // Сохраняем в базе данных
  savePlayerToDB(player, dbCollection);
  // Возвращаем обновлённые данные игрока
  return {
    xp: player.xp,
    level: player.level,
    levelProgress: player.levelProgress,
    progress: progress,
  };
}

// Сохранение данных игрока в MongoDB
async function savePlayerToDB(player, dbCollection) {
  try {
    await dbCollection.updateOne(
      { id: player.id },
      {
        $set: {
          xp: player.xp,
          level: player.level,
          levelProgress: player.levelProgress,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error(
      `Ошибка при сохранении данных игрока ${player.id} в MongoDB:`,
      error
    );
  }
}

// Экспортируем функции для использования на сервере
module.exports = {
  addExperience,
  getLevelProgress,
  getLevelFromXP,
  awardExperienceForItem,
};
