// levelSystem.js

let currentLevel = 0;
let currentXP = 0;
let xpToNextLevel = 100;
let isInitialized = false;
let upgradePoints = 0;

let maxStats = {
  health: 100,
  energy: 100,
  food: 100,
  water: 100,
};

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

function updateStatsDisplay() {
  try {
    console.log("UpdateStatsDisplay вызван");
    const statsEl = document.getElementById("stats");
    if (!statsEl) {
      console.warn("Элемент stats не найден для обновления");
      return;
    }
    const me = players.get(myId);
    if (!me) {
      console.warn("Игрок не найден для обновления статов");
      return;
    }
    statsEl.innerHTML = `
      <span class="health">Здоровье: ${me.health}/${me.maxStats.health}</span><br>
      <span class="energy">Энергия: ${me.energy}/${me.maxStats.energy}</span><br>
      <span class="food">Еда: ${me.food}/${me.maxStats.food}</span><br>
      <span class="water">Вода: ${me.water}/${me.maxStats.water}</span><br>
      <span class="armor">Броня: ${me.armor}</span>
    `;
    console.log("Статы обновлены в DOM");
    updateUpgradeButtons();
  } catch (error) {
    console.error("Ошибка в updateStatsDisplay:", error);
  }
}

function createUpgradeButtons() {
  try {
    const statsEl = document.getElementById("stats");
    if (!statsEl) {
      console.warn("Элемент stats не найден, откладываем создание кнопок");
      setTimeout(createUpgradeButtons, 100);
      return;
    }

    const existingButtons = statsEl.querySelectorAll(".upgrade-btn");
    existingButtons.forEach((btn) => btn.remove());

    console.log(`Создание кнопок, upgradePoints: ${upgradePoints}`);
    if (upgradePoints <= 0) {
      console.log("Нет очков улучшения, кнопки не создаются");
      return;
    }

    const statTypes = ["health", "energy", "food", "water"];
    const statElements = statsEl.querySelectorAll("span");

    statElements.forEach((span, index) => {
      const statType = statTypes[index];
      if (!statType) return;

      const button = document.createElement("button");
      button.className = "upgrade-btn";
      button.textContent = "+";
      button.style.marginLeft = "10px";
      button.style.fontSize = "14px";
      button.style.padding = "4px 8px";
      button.style.cursor = "pointer";

      button.addEventListener("click", () => {
        if (upgradePoints <= 0) {
          console.warn("Нет доступных очков улучшения");
          return;
        }

        upgradePoints--;
        maxStats[statType] = (maxStats[statType] || 100) + 1;
        window.levelSystem.maxStats[statType] = maxStats[statType];
        console.log(`Увеличен max ${statType} до ${maxStats[statType]}`);

        // Обновляем отображение немедленно
        updateStatsDisplay();

        // Отправляем обновление на сервер
        if (ws.readyState === WebSocket.OPEN) {
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "updateMaxStats",
              maxStats: { ...maxStats },
              upgradePoints,
            })
          );
          console.log("Отправлено updateMaxStats на сервер");
        } else {
          console.warn("WebSocket не открыт, updateMaxStats не отправлено");
        }
      });

      span.appendChild(button);
      console.log(`Кнопка для ${statType} добавлена`);
    });
  } catch (error) {
    console.error("Ошибка в createUpgradeButtons:", error);
  }
}

function updateUpgradeButtons() {
  try {
    console.log(`Обновление кнопок, upgradePoints: ${upgradePoints}`);
    const statsEl = document.getElementById("stats");
    if (!statsEl) {
      console.warn("Элемент stats не найден, откладываем обновление кнопок");
      setTimeout(updateUpgradeButtons, 100);
      return;
    }

    // Удаляем старые кнопки
    const buttons = statsEl.querySelectorAll(".upgrade-btn");
    buttons.forEach((btn) => btn.remove());

    // Создаём новые кнопки, если есть очки
    if (upgradePoints > 0) {
      createUpgradeButtons();
    } else {
      console.log("Нет очков улучшения, кнопки удалены");
    }
  } catch (error) {
    console.error("Ошибка в updateUpgradeButtons:", error);
  }
}

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
    updateStatsDisplay();
    updateUpgradeButtons();
  } catch (error) {
    console.error("Ошибка в initializeLevelSystem:", error);
  }
}

function updateLevelDisplay() {
  try {
    let levelDisplay = document.getElementById("levelDisplay");
    if (!levelDisplay) {
      console.warn("Элемент levelDisplay не найден, создаём...");
      levelDisplay = createLevelDisplayElement();
    }
    if (levelDisplay) {
      levelDisplay.innerHTML = `Level: ${currentLevel} | xp : ${currentXP} / ${xpToNextLevel}`;
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

function setLevelData(level, xp, maxStatsData, upgradePointsData) {
  try {
    console.log(
      `Установка уровня: level=${level}, xp=${xp}, maxStats=${JSON.stringify(
        maxStatsData
      )}, upgradePoints=${upgradePointsData}`
    );
    currentLevel = level || 0;
    currentXP = xp || 0;
    upgradePoints = upgradePointsData || 0;
    xpToNextLevel = calculateXPToNextLevel(currentLevel);

    // Защищаем maxStats от сброса
    maxStats = {
      health: maxStatsData?.health || maxStats.health || 100,
      energy: maxStatsData?.energy || maxStats.energy || 100,
      food: maxStatsData?.food || maxStats.food || 100,
      water: maxStatsData?.water || maxStats.water || 100,
    };
    window.levelSystem.maxStats = { ...maxStats }; // Синхронизируем глобальный maxStats

    if (!isInitialized) {
      console.log("Система уровней не инициализирована, запускаем...");
      initializeLevelSystem();
    }
    updateLevelDisplay();
    updateStatsDisplay();
    updateUpgradeButtons();
  } catch (error) {
    console.error("Ошибка в setLevelData:", error);
  }
}

function calculateXPToNextLevel(level) {
  try {
    if (level >= 100) return 0;
    return 100 * Math.pow(2, level);
  } catch (error) {
    console.error("Ошибка в calculateXPToNextLevel:", error);
    return 100;
  }
}

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

    if (isDroppedByPlayer) {
      console.log(`Предмет ${itemType} выброшен игроком, опыт не начисляется`);
      return;
    }

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

function handleQuestCompletion(rarity) {
  try {
    const me = players.get(myId);
    if (!me) {
      console.warn("Игрок не найден, пропускаем начисление опыта за задание");
      return;
    }

    let xpGained;
    switch (rarity) {
      case 1:
        xpGained = 3;
        break; // Редкий
      case 2:
        xpGained = 2;
        break; // Средний
      case 3:
        xpGained = 1;
        break; // Частый
      default:
        xpGained = 1;
    }

    console.log(
      `Начислено ${xpGained} XP за выполнение задания (rarity: ${rarity})`
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
    console.error("Ошибка в handleQuestCompletion:", error);
  }
}

function checkLevelUp() {
  try {
    while (currentXP >= xpToNextLevel && currentLevel < 100) {
      console.log(`Повышение уровня: ${currentLevel} -> ${currentLevel + 1}`);
      currentLevel++;
      currentXP -= xpToNextLevel;
      xpToNextLevel = calculateXPToNextLevel(currentLevel);
      upgradePoints += 10;
      console.log(`Начислено 10 upgradePoints, всего: ${upgradePoints}`);
      showLevelUpEffect();
      updateUpgradeButtons();

      // Отправляем обновление уровня и maxStats на сервер
      if (ws.readyState === WebSocket.OPEN) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "updateLevel",
            level: currentLevel,
            xp: currentXP,
            maxStats: { ...maxStats }, // Гарантируем отправку актуальных maxStats
            upgradePoints,
          })
        );
        console.log("Отправлено updateLevel на сервер с maxStats");
      } else {
        console.warn(
          "WebSocket не открыт, сообщение updateLevel не отправлено"
        );
      }
    }
    updateLevelDisplay();
    updateStatsDisplay();
  } catch (error) {
    console.error("Ошибка в checkLevelUp:", error);
  }
}

function setLevelData(level, xp, maxStatsData, upgradePointsData) {
  try {
    console.log(
      `Установка уровня: level=${level}, xp=${xp}, maxStats=${JSON.stringify(
        maxStatsData
      )}, upgradePoints=${upgradePointsData}`
    );
    currentLevel = level || 0;
    currentXP = xp || 0;
    upgradePoints = upgradePointsData || 0;
    xpToNextLevel = calculateXPToNextLevel(currentLevel);

    // Защищаем maxStats от сброса, берём максимум из присланных и текущих значений
    maxStats = {
      health: Math.max(maxStatsData?.health || 100, maxStats.health || 100),
      energy: Math.max(maxStatsData?.energy || 100, maxStats.energy || 100),
      food: Math.max(maxStatsData?.food || 100, maxStats.food || 100),
      water: Math.max(maxStatsData?.water || 100, maxStats.water || 100),
    };
    window.levelSystem.maxStats = { ...maxStats }; // Синхронизируем глобальный maxStats

    if (!isInitialized) {
      console.log("Система уровней не инициализирована, запускаем...");
      initializeLevelSystem();
    }
    updateLevelDisplay();
    updateStatsDisplay();
    updateUpgradeButtons();
  } catch (error) {
    console.error("Ошибка в setLevelData:", error);
  }
}

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

window.levelSystem = {
  initialize: initializeLevelSystem,
  setLevelData,
  handleItemPickup,
  handleQuestCompletion, // Добавляем новую функцию
  maxStats,
  updateUpgradeButtons,
};
