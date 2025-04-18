let currentLevel = 0;
let currentXP = 0;
let xpToNextLevel = 100;

// Функция для инициализации системы уровней
function initializeLevelSystem() {
  // Создаем элемент для отображения уровня и опыта
  const levelDisplay = document.createElement("div");
  levelDisplay.id = "levelDisplay";
  levelDisplay.className = "cyber-text level-display";
  document.body.appendChild(levelDisplay);
  updateLevelDisplay();
}

// Функция для обновления отображения уровня и опыта
function updateLevelDisplay() {
  const levelDisplay = document.getElementById("levelDisplay");
  if (levelDisplay) {
    levelDisplay.innerHTML = `Level: ${currentLevel} | XP: ${currentXP} / ${xpToNextLevel}`;
  }
}

// Функция для установки данных уровня из сервера
function setLevelData(level, xp) {
  currentLevel = level || 0;
  currentXP = xp || 0;
  xpToNextLevel = calculateXPToNextLevel(currentLevel);
  updateLevelDisplay();
}

// Функция для расчета опыта, необходимого для следующего уровня
function calculateXPToNextLevel(level) {
  if (level >= 100) return 0; // Максимальный уровень
  return 100 * Math.pow(2, level);
}

// Функция для обработки поднятия предмета и начисления опыта
function handleItemPickup(itemType) {
  const me = players.get(myId);
  if (!me) return;

  const rarity = ITEM_CONFIG[itemType]?.rarity || 3;
  let xpGained;
  switch (rarity) {
    case 1:
      xpGained = 3;
      break;
    case 2:
      xpGained = 2;
      break;
    case 3:
      xpGained = 1;
      break;
    default:
      xpGained = 1;
  }

  currentXP += xpGained;
  checkLevelUp();

  // Отправляем обновленные данные на сервер
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "updateLevel",
      level: currentLevel,
      xp: currentXP,
    })
  );

  // Визуальный эффект получения опыта
  showXPEffect(xpGained);
}

// Функция для проверки повышения уровня
function checkLevelUp() {
  while (currentXP >= xpToNextLevel && currentLevel < 100) {
    currentLevel++;
    currentXP -= xpToNextLevel;
    xpToNextLevel = calculateXPToNextLevel(currentLevel);
    showLevelUpEffect();
  }
  updateLevelDisplay();
}

// Функция для отображения эффекта получения опыта
function showXPEffect(xpGained) {
  const effect = document.createElement("div");
  effect.className = "xp-effect cyber-text";
  effect.textContent = `+${xpGained} XP`;
  effect.style.position = "absolute";
  effect.style.left = "50px";
  effect.style.bottom = "100px";
  document.body.appendChild(effect);

  setTimeout(() => {
    effect.style.transition = "all 1s ease-out";
    effect.style.transform = "translateY(-50px)";
    effect.style.opacity = "0";
  }, 10);

  setTimeout(() => effect.remove(), 1000);
}

// Функция для отображения эффекта повышения уровня
function showLevelUpEffect() {
  const effect = document.createElement("div");
  effect.className = "level-up-effect cyber-text";
  effect.textContent = `LEVEL UP! ${currentLevel}`;
  effect.style.position = "absolute";
  effect.style.left = "50%";
  effect.style.top = "50%";
  effect.style.transform = "translate(-50%, -50%)";
  effect.style.fontSize = "48px";
  effect.style.textShadow = "0 0 10px #00ffff, 0 0 20px #00ffff";
  document.body.appendChild(effect);

  setTimeout(() => {
    effect.style.transition = "all 1s ease-out";
    effect.style.opacity = "0";
    effect.style.transform = "translate(-50%, -70%) scale(1.2)";
  }, 10);

  setTimeout(() => effect.remove(), 1000);
}

// Экспортируем функции для использования в code.js
window.levelSystem = {
  initialize: initializeLevelSystem,
  setLevelData,
  handleItemPickup,
};
