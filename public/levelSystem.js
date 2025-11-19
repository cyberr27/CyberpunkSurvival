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
  armor: 0, // Базовое значение брони зависит только от экипировки
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
      } else {
        setTimeout(createLevelDisplayElement, 100);
      }
    }
    return levelDisplay;
  } catch (error) {
    return null;
  }
}

function updateStatsDisplay() {
  try {
    const statsEl = document.getElementById("stats");
    if (!statsEl) {
      return;
    }
    const me = players.get(myId);
    if (!me) {
      return;
    }
    statsEl.innerHTML = `
  <span class="health">Здоровье: ${Math.min(me.health, me.maxStats.health)}/${
      me.maxStats.health
    }</span><br>
  <span class="energy">Энергия: ${Math.min(me.energy, me.maxStats.energy)}/${
      me.maxStats.energy
    }</span><br>
  <span class="food">Еда: ${Math.min(me.food, me.maxStats.food)}/${
      me.maxStats.food
    }</span><br>
  <span class="water">Вода: ${Math.min(me.water, me.maxStats.water)}/${
      me.maxStats.water
    }</span><br>
  <span class="armor">Броня: ${Math.min(me.armor, me.maxStats.armor)}/${
      me.maxStats.armor
    }</span>
`;
    updateUpgradeButtons();
  } catch (error) {}
}

function createUpgradeButtons() {
  try {
    const statsEl = document.getElementById("stats");
    if (!statsEl) {
      setTimeout(createUpgradeButtons, 100);
      return;
    }

    const existingButtons = statsEl.querySelectorAll(".upgrade-btn");
    existingButtons.forEach((btn) => btn.remove());

    if (upgradePoints <= 0) {
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

        const upgradeField = `${statType}Upgrade`;
        window.levelSystem[upgradeField] =
          (window.levelSystem[upgradeField] || 0) + 1;

        const baseValue = statType === "armor" ? 0 : 100;
        maxStats[statType] = baseValue + window.levelSystem[upgradeField];
        window.levelSystem.maxStats[statType] = maxStats[statType];

        const me = players.get(myId);
        if (me) {
          me.maxStats[statType] = maxStats[statType];
          me[statType] = Math.min(
            me[statType] || baseValue,
            maxStats[statType]
          );
          me[upgradeField] = window.levelSystem[upgradeField];
        }

        window.equipmentSystem.applyEquipmentEffects(me);

        updateStatsDisplay();

        if (ws.readyState === WebSocket.OPEN) {
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "updateMaxStats",
              upgradePoints,
              healthUpgrade: window.levelSystem.healthUpgrade || 0,
              energyUpgrade: window.levelSystem.energyUpgrade || 0,
              foodUpgrade: window.levelSystem.foodUpgrade || 0,
              waterUpgrade: window.levelSystem.waterUpgrade || 0,
            })
          );
        }
      });

      span.appendChild(button);
    });
  } catch (error) {}
}

function updateUpgradeButtons() {
  try {
    const statsEl = document.getElementById("stats");
    if (!statsEl) {
      setTimeout(updateUpgradeButtons, 100);
      return;
    }

    const buttons = statsEl.querySelectorAll(".upgrade-btn");
    buttons.forEach((btn) => btn.remove());

    if (upgradePoints > 0) {
      createUpgradeButtons();
    }
  } catch (error) {}
}

function initializeLevelSystem() {
  try {
    if (isInitialized) {
      return;
    }
    createLevelDisplayElement();
    isInitialized = true;
    updateLevelDisplay();
    updateStatsDisplay();
    updateUpgradeButtons();
  } catch (error) {}
}

function updateLevelDisplay() {
  try {
    const levelDisplay = document.getElementById("levelDisplay");
    if (!levelDisplay) {
      createLevelDisplayElement();
      setTimeout(updateLevelDisplay, 100);
      return;
    }

    // ВАЖНО: используем актуальные данные с сервера (или текущие)
    const me = players.get(myId);
    const level = (me?.level ?? currentLevel) || 0;
    const xp = (me?.xp ?? currentXP) || 0;
    const xpNext =
      (me?.xpToNextLevel ?? xpToNextLevel) || calculateXPToNextLevel(level);

    levelDisplay.textContent = `Level: ${level} | xp: ${xp} / ${xpNext}`;
    levelDisplay.style.position = "absolute";
    levelDisplay.style.top = "10px";
    levelDisplay.style.left = "50%";
    levelDisplay.style.transform = "translateX(-50%)";
    levelDisplay.style.color = "#00ffff";
    levelDisplay.style.fontSize = "18px";
    levelDisplay.style.fontWeight = "bold";
    levelDisplay.style.textShadow = "0 0 10px #00ffff";
    levelDisplay.style.zIndex = "1000";
    levelDisplay.style.background = "rgba(0,0,0,0.5)";
    levelDisplay.style.padding = "5px 15px";
    levelDisplay.style.borderRadius = "10px";
  } catch (error) {
    console.error("Ошибка в updateLevelDisplay:", error);
  }
}

function setLevelData(level, xp, maxStatsData, upgradePointsData) {
  try {
    currentLevel = level || 0;
    currentXP = xp || 0;
    upgradePoints = upgradePointsData || 0;
    xpToNextLevel = calculateXPToNextLevel(currentLevel);

    const me = players.get(myId);
    if (!me) {
      console.warn("Игрок не найден при setLevelData");
      return;
    }

    window.levelSystem.healthUpgrade = me.healthUpgrade || 0;
    window.levelSystem.energyUpgrade = me.energyUpgrade || 0;
    window.levelSystem.foodUpgrade = me.foodUpgrade || 0;
    window.levelSystem.waterUpgrade = me.waterUpgrade || 0;

    maxStats = {
      health: 100 + window.levelSystem.healthUpgrade,
      energy: 100 + window.levelSystem.energyUpgrade,
      food: 100 + window.levelSystem.foodUpgrade,
      water: 100 + window.levelSystem.waterUpgrade,
      armor: 0,
    };

    window.levelSystem.maxStats = { ...maxStats };

    if (window.equipmentSystem && me) {
      window.equipmentSystem.applyEquipmentEffects(me);
    }

    if (!isInitialized) {
      initializeLevelSystem();
    }
    updateLevelDisplay();
    updateStatsDisplay();
    updateUpgradeButtons();
  } catch (error) {}
}

function calculateXPToNextLevel(level) {
  try {
    if (level >= 100) return 0;
    return 100 * Math.pow(2, level);
  } catch (error) {
    return 100;
  }
}

function handleItemPickup(itemType, isDroppedByPlayer) {
  try {
    const me = players.get(myId);
    if (!me) return;

    if (isDroppedByPlayer) return;

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

    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "updateLevel",
          level: currentLevel,
          xp: currentXP,
          upgradePoints,
        })
      );
    }

    showXPEffect(xpGained);
    updateLevelDisplay(); // ← Важно: сразу обновляем строку XP
  } catch (error) {}
}

function handleQuestCompletion(rarity) {
  try {
    const me = players.get(myId);
    if (!me) return;

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

    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "updateLevel",
          level: currentLevel,
          xp: currentXP,
          upgradePoints,
        })
      );
    }

    showXPEffect(xpGained);
    updateLevelDisplay();
  } catch (error) {}
}

// ← ГЛАВНОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ
function handleEnemyKill(data) {
  try {
    currentLevel = data.level;
    currentXP = data.xp;
    xpToNextLevel = data.xpToNextLevel || calculateXPToNextLevel(currentLevel);
    upgradePoints = data.upgradePoints || 0;

    const me = players.get(myId);
    if (me) {
      me.level = currentLevel;
      me.xp = currentXP;
      me.upgradePoints = upgradePoints;
      me.xpToNextLevel = xpToNextLevel;
    }

    showXPEffect(data.xpGained || 13);

    // ← ГЛАВНОЕ: трижды вызываем, чтобы 100% обновилось
    updateLevelDisplay();
    setTimeout(updateLevelDisplay, 50);
    setTimeout(updateLevelDisplay, 100);

    updateStatsDisplay();
    updateUpgradeButtons();
  } catch (error) {
    console.error("Ошибка в handleEnemyKill:", error);
  }
}

function checkLevelUp() {
  try {
    while (currentXP >= xpToNextLevel && currentLevel < 100) {
      currentLevel++;
      currentXP -= xpToNextLevel;
      xpToNextLevel = calculateXPToNextLevel(currentLevel);
      upgradePoints += 10;

      showLevelUpEffect();
      updateUpgradeButtons();

      if (ws.readyState === WebSocket.OPEN) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "updateLevel",
            level: currentLevel,
            xp: currentXP,
            upgradePoints,
          })
        );
      }
    }
    updateLevelDisplay();
    updateStatsDisplay();
  } catch (error) {}
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
  } catch (error) {}
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
  } catch (error) {}
}

window.levelSystem = {
  initialize: initializeLevelSystem,
  setLevelData,
  handleItemPickup,
  handleQuestCompletion,
  maxStats,
  updateUpgradeButtons,
  handleEnemyKill,
};
