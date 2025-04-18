let currentLevel = 0;
let currentXP = 0;
let xpToNextLevel = 100;
let isInitialized = false; // Флаг инициализации
let upgradePoints = 0; // Очки прокачки

// Максимальные значения параметров
let maxStats = {
  health: 100,
  energy: 100,
  food: 100,
  water: 100,
};

// Функция для создания элемента levelDisplay
function createLevelDisplayElement() {
  try {
    let levelDisplay = document.getElementById("levelDisplay");
    if (!levelDisplay) {
      levelDisplay = document.createElement("div");
      levelDisplay.id = "levelDisplay";
      levelDisplay.className = "cyber-text level-display";
      if (document.body) {
        document.body.appendChild(levelDisplay);
        console.log("Элемент levelDisplay создан и добавлен в DOM");
      } else {
        console.warn(
          "document.body не готов, откладываем создание levelDisplay"
        );
        setTimeout(createLevelDisplayElement, 100);
      }
    }
    return levelDisplay;
  } catch (error) {
    console.error("Ошибка в createLevelDisplayElement:", error);
    return null;
  }
}

// Функция для создания кнопок "+"
function createUpgradeButtons() {
  try {
    const statsEl = document.getElementById("stats");
    if (!statsEl) {
      console.warn("Элемент stats не найден, откладываем создание кнопок");
      setTimeout(createUpgradeButtons, 100);
      return;
    }

    // Удаляем старые кнопки, чтобы избежать дублирования
    const existingButtons = statsEl.querySelectorAll(".upgrade-btn");
    existingButtons.forEach((btn) => btn.remove());

    if (upgradePoints > 0) {
      const statTypes = ["health", "energy", "food", "water"];
      const statElements = statsEl.querySelectorAll("span");

      statElements.forEach((span, index) => {
        const statType = statTypes[index];
        if (!statType) return;

        const button = document.createElement("button");
        button.className = "upgrade-btn cyber-btn";
        button.textContent = "+";
        button.style.marginLeft = "5px";
        button.style.fontSize = "12px";
        button.style.padding = "2px 6px";

        button.addEventListener("click", () => {
          if (upgradePoints > 0) {
            upgradePoints--;
            maxStats[statType]++;
            console.log(`Увеличен max ${statType} до ${maxStats[statType]}`);

            // Обновляем отображение кнопок
            updateUpgradeButtons();

            // Отправляем обновление на сервер
            if (ws.readyState === WebSocket.OPEN) {
              sendWhenReady(
                ws,
                JSON.stringify({
                  type: "updateMaxStats",
                  maxStats,
                  upgradePoints,
                })
              );
              console.log("Отправлено updateMaxStats на сервер");
            } else {
              console.warn("WebSocket не открыт, updateMaxStats не отправлено");
            }
          }
        });

        span.appendChild(button);
      });
    }
  } catch (error) {
    console.error("Ошибка в createUpgradeButtons:", error);
  }
}

// Функция для обновления отображения кнопок
function updateUpgradeButtons() {
  try {
    if (upgradePoints > 0) {
      createUpgradeButtons();
    } else {
      const statsEl = document.getElementById("stats");
      const buttons = statsEl.querySelectorAll(".upgrade-btn");
      buttons.forEach((btn) => btn.remove());
    }
  } catch (error) {
    console.error("Ошибка в updateUpgradeButtons:", error);
  }
}

// Функция для инициализации системы уровней
function initializeLevelSystem() {
  try {
    if (isInitialized) {
      console.log("Система уровней уже инициализирована, пропускаем");
      return;
    }
    createLevelDisplayElement();
    isInitialized = true;
    console.log("Система уровней инициализирована, братишка!");
    updateLevelDisplay();
    updateUpgradeButtons();
  } catch (error) {
    console.error("Ошибка в initializeLevelSystem:", error);
  }
}

// Функция для обновления отображения уровня и опыта
function updateLevelDisplay() {
  try {
    let levelDisplay = document.getElementById("levelDisplay");
    if (!levelDisplay) {
      console.warn("Элемент levelDisplay не найден, создаём...");
      levelDisplay = createLevelDisplayElement();
    }
    if (levelDisplay) {
      levelDisplay.innerHTML = `Level: ${currentLevel} | XP: ${currentXP} / ${xpToNextLevel}`;
      console.log(
        `Обновлено отображение: Level ${currentLevel}, XP ${currentXP}/${xpToNextLevel}`
      );
    } else {
      console.warn("Не удалось создать levelDisplay, попробуем позже");
      setTimeout(updateLevelDisplay, 100);
    }
  } catch (error) {
    console.error("Ошибка в updateLevelDisplay:", error);
  }
}

// Функция для установки данных уровня из сервера
function setLevelData(level, xp, maxStatsData, upgradePointsData) {
  try {
    console.log(
      `Установка уровня: level=${level}, xp=${xp}, maxStats=${JSON.stringify(
        maxStatsData
      )}, upgradePoints=${upgradePointsData}`
    );
    currentLevel = level || 0;
    currentXP = xp || 0;
    maxStats = maxStatsData || {
      health: 100,
      energy: 100,
      food: 100,
      water: 100,
    };
    upgradePoints = upgradePointsData || 0;
    xpToNextLevel = calculateXPToNextLevel(currentLevel);
    if (!isInitialized) {
      console.log("Система уровней не инициализирована, запускаем...");
      initializeLevelSystem();
    }
    updateLevelDisplay();
    updateUpgradeButtons();
  } catch (error) {
    console.error("Ошибка в setLevelData:", error);
  }
}

// Функция для расчета опыта, необходимого для следующего уровня
function calculateXPToNextLevel(level) {
  try {
    if (level >= 100) return 0; // Максимальный уровень
    return 100 * Math.pow(2, level);
  } catch (error) {
    console.error("Ошибка в calculateXPToNextLevel:", error);
    return 100; // Значение по умолчанию
  }
}

// Функция для обработки поднятия предмета и начисления опыта
function handleItemPickup(itemType, isDroppedByPlayer) {
  try {
    console.log(
      `Поднят предмет: ${itemType}, выброшен игроком: ${isDroppedByPlayer}`
    );
    const me = players.get(myId);
    if (!me) {
      console.warn("Игрок не найден, пропускаем начисление опыта");
      return;
    }

    // Если предмет был выброшен игроком, не начисляем опыт
    if (isDroppedByPlayer) {
      console.log(`Предмет ${itemType} выброшен игроком, опыт не начисляется`);
      return;
    }

    const rarity = ITEM_CONFIG[itemType]?.rarity || 3;
    let xpGained;
    switch (rarity) {
      case 1: // Редкий
        xpGained = 3;
        break;
      case 2: // Средний
        xpGained = 2;
        break;
      case 3: // Частый
        xpGained = 1;
        break;
      default:
        xpGained = 1;
    }

    console.log(
      `Начислено ${xpGained} XP за предмет ${itemType} (rarity: ${rarity})`
    );
    currentXP += xpGained;
    checkLevelUp();

    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "updateLevel",
          level: currentLevel,
          xp: currentXP,
          maxStats,
          upgradePoints,
        })
      );
      console.log("Отправлено сообщение updateLevel на сервер");
    } else {
      console.warn("WebSocket не открыт, сообщение updateLevel не отправлено");
    }

    showXPEffect(xpGained);
  } catch (error) {
    console.error("Ошибка в handleItemPickup:", error);
  }
}

// Функция для проверки повышения уровня
function checkLevelUp() {
  try {
    while (currentXP >= xpToNextLevel && currentLevel < 100) {
      console.log(`Повышение уровня: ${currentLevel} -> ${currentLevel + 1}`);
      currentLevel++;
      currentXP -= xpToNextLevel;
      xpToNextLevel = calculateXPToNextLevel(currentLevel);
      upgradePoints++; // Начисляем очко прокачки
      showLevelUpEffect();
      updateUpgradeButtons(); // Обновляем кнопки при повышении уровня
    }
    updateLevelDisplay();
  } catch (error) {
    console.error("Ошибка в checkLevelUp:", error);
  }
}

// Функция для отображения эффекта получения опыта
function showXPEffect(xpGained) {
  try {
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
  } catch (error) {
    console.error("Ошибка в showXPEffect:", error);
  }
}

// Функция для отображения эффекта повышения уровня
function showLevelUpEffect() {
  try {
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
  } catch (error) {
    console.error("Ошибка в showLevelUpEffect:", error);
  }
}

// Экспортируем функции для использования в code.js
window.levelSystem = {
  initialize: initializeLevelSystem,
  setLevelData,
  handleItemPickup,
};
