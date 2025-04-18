const LEVEL_CONFIG = {
  MAX_LEVEL: 100,
  BASE_EXPERIENCE: 100,
  EXPERIENCE_MULTIPLIER: 2,
};

// Рассчитывает опыт, необходимый для достижения указанного уровня
function getRequiredExperience(level) {
  if (level < 0 || level > LEVEL_CONFIG.MAX_LEVEL) {
    return Infinity;
  }
  return (
    LEVEL_CONFIG.BASE_EXPERIENCE *
    Math.pow(LEVEL_CONFIG.EXPERIENCE_MULTIPLIER, level)
  );
}

// Проверяет, достаточно ли опыта для повышения уровня, и возвращает новый уровень
function checkLevelUp(currentLevel, currentExperience) {
  let level = currentLevel;
  let experience = currentExperience;
  while (level < LEVEL_CONFIG.MAX_LEVEL) {
    const requiredExp = getRequiredExperience(level);
    if (experience >= requiredExp) {
      level++;
      experience -= requiredExp; // Сбрасываем опыт для следующего уровня
    } else {
      break;
    }
  }
  return { level, experience };
}

// Возвращает опыт за поднятие предмета в зависимости от его редкости
function getExperienceForItem(rarity) {
  switch (rarity) {
    case 1: // Редкие
      return 3;
    case 2: // Средние
      return 2;
    case 3: // Частые
      return 1;
    default:
      return 0;
  }
}

// Форматирует строку уровня и опыта для отображения
function formatLevelDisplay(level, experience) {
  const nextLevel = Math.min(level + 1, LEVEL_CONFIG.MAX_LEVEL);
  const requiredExp = getRequiredExperience(level);
  return `Level: ${level} ${experience} / ${requiredExp}xp`;
}

// Экспорт для Node.js и глобальная доступность для браузера
if (typeof module !== "undefined" && module.exports) {
  // Для Node.js (server.js)
  module.exports = {
    getRequiredExperience,
    checkLevelUp,
    getExperienceForItem,
    formatLevelDisplay,
  };
} else {
  // Для браузера (code.js)
  window.LevelSystem = {
    getRequiredExperience,
    checkLevelUp,
    getExperienceForItem,
    formatLevelDisplay,
  };
}
