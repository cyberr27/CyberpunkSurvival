const { ITEM_CONFIG } = require("./items");

// ------------------------------------------------------------------------
// Вспомогательные функции
// ------------------------------------------------------------------------

function findCentralItem(inventory) {
  return inventory.findIndex((item) => item && item.isUpgradeItem);
}

function findMaterialItems(inventory) {
  return inventory
    .map((item, idx) => (item && item.isMaterial ? { idx, item } : null))
    .filter(Boolean);
}

function isWhiteVoidItem(item) {
  if (!item) return false;
  const cfg = ITEM_CONFIG[item.type];
  return cfg && cfg.collection === "White Void";
}

function getTornHealthVariant(originalType) {
  const mapping = {
    white_void_cap: "torn_baseball_cap_of_health",
    white_void_t_shirt: "torn_health_t_shirt",
    white_void_gloves: "torn_health_gloves",
    white_void_belt: "torn_belt_of_health",
    white_void_pants: "torn_pants_of_health",
    white_void_sneakers: "torn_health_sneakers",
  };
  return mapping[originalType] || null;
}

function getChameleonVariant(originalType) {
  const mapping = {
    white_void_cap: "chameleon_cap",
    white_void_t_shirt: "chameleon_t_shirt",
    white_void_gloves: "chameleon_gloves",
    white_void_belt: "chameleon_belt",
    white_void_pants: "chameleon_pants",
    white_void_sneakers: "chameleon_sneakers",
  };
  return mapping[originalType] || null;
}

function getNanoAbsorbingKnifeFromKnife(originalType) {
  if (originalType === "knife") {
    return "nano_absorbing_knife";
  }
  return null;
}

// ------------------------------------------------------------------------
// Основная функция обработки апгрейда
// ------------------------------------------------------------------------
function handleTorestosUpgrade(
  ws,
  data,
  player,
  players,
  userDatabase,
  dbCollection,
  saveUserDatabase,
) {
  const playerId = player.id;

  if (!data || !data.inventory) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error: "Некорректные данные",
      }),
    );
    return;
  }

  const inv = data.inventory;

  // 1. Находим центральный предмет (White Void)
  const centerIdx = findCentralItem(inv);
  if (centerIdx === -1) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error: "Нет предмета для улучшения в центральном слоте",
      }),
    );
    return;
  }

  const centerItem = inv[centerIdx];
  const centerType = centerItem.type;

  // Для рецептов torn и chameleon — нужен White Void
  // Для рецепта nano — нужен обычный knife
  let isValidCenter = false;

  if (centerType === "knife") {
    isValidCenter = true; // для nano-рецепта
  } else if (isWhiteVoidItem(centerItem)) {
    isValidCenter = true; // для torn и chameleon
  }

  if (!isValidCenter) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error:
          "В центральном слоте должен быть либо предмет коллекции White Void, либо обычный нож (knife)",
      }),
    );
    return;
  }

  // 2. Ищем материалы
  const materials = findMaterialItems(inv);

  let upgradeType = null; // "torn" / "chameleon" / "nano"
  let requiredMaterials = [];

  // ─── Проверка старых рецептов ───
  let hasBlood = false;
  let hasTornRecipe = false;
  let hasChameleonRecipe = false;

  const materialTypes = materials.map((m) => m.item.type);

  hasBlood = materialTypes.includes("blood_pack");
  hasTornRecipe = materialTypes.includes("recipe_torn_equipment");
  hasChameleonRecipe = materialTypes.includes("recipe_chameleon_equipment");

  if (hasBlood && hasTornRecipe && materials.length >= 2) {
    upgradeType = "torn";
    requiredMaterials = ["blood_pack", "recipe_torn_equipment"];
  } else if (hasChameleonRecipe && materials.length >= 1) {
    upgradeType = "chameleon";
    requiredMaterials = ["recipe_chameleon_equipment"];
  }

  // ─── НОВЫЙ РЕЦЕПТ: Nano Absorbing Knife из обычного ножа ───
  if (!upgradeType) {
    // Проверяем, что центральный предмет — это knife
    if (centerType === "knife") {
      const hasAllCrystals =
        materialTypes.includes("white_crystal") &&
        materialTypes.includes("green_crystal") &&
        materialTypes.includes("red_crystal") &&
        materialTypes.includes("yellow_crystal") &&
        materialTypes.includes("blue_crystal") &&
        materialTypes.includes("chameleon_crystal") &&
        materialTypes.includes("nanoalloy") &&
        materialTypes.includes("nanofilament");

      if (hasAllCrystals && materials.length >= 8) {
        upgradeType = "nano_knife";
        requiredMaterials = [
          "white_crystal",
          "green_crystal",
          "red_crystal",
          "yellow_crystal",
          "blue_crystal",
          "chameleon_crystal",
          "nanoalloy",
          "nanofilament",
        ];
      }
    }
  }

  if (!upgradeType) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error:
          "Неправильные материалы или центральный предмет.\n\n" +
          "Доступные рецепты:\n" +
          "• White Void + blood_pack + recipe_torn_equipment\n" +
          "• White Void + recipe_chameleon_equipment\n" +
          "• knife + white_crystal + green + red + yellow + blue + chameleon_crystal + nanoalloy + nanofilament",
      }),
    );
    return;
  }

  // 3. Определяем, что получим
  let newType = null;

  if (upgradeType === "torn") {
    newType = getTornHealthVariant(centerItem.type);
  } else if (upgradeType === "chameleon") {
    newType = getChameleonVariant(centerItem.type);
  } else if (upgradeType === "nano_knife") {
    newType = getNanoAbsorbingKnifeFromKnife(centerItem.type);
  }

  if (!newType) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error: "Этот тип White Void предмета не поддерживается данным рецептом",
      }),
    );
    return;
  }

  // 4. Создаём новый предмет
  const newItem = {
    type: newType,
    // Можно добавить quality, durability, itemId и т.д. позже
  };

  // 5. Удаляем центральный предмет
  inv[centerIdx] = null;

  // 6. Удаляем использованные материалы
  if (upgradeType === "torn") {
    let bloodIdx = -1;
    let recipeIdx = -1;

    for (let i = 0; i < inv.length; i++) {
      if (!inv[i]) continue;
      if (inv[i].type === "blood_pack" && bloodIdx === -1) bloodIdx = i;
      if (inv[i].type === "recipe_torn_equipment" && recipeIdx === -1)
        recipeIdx = i;
      if (bloodIdx !== -1 && recipeIdx !== -1) break;
    }

    if (bloodIdx === -1 || recipeIdx === -1) {
      ws.send(
        JSON.stringify({
          type: "torestosUpgradeResult",
          success: false,
          error: "Не удалось найти один из требуемых материалов для удаления",
        }),
      );
      return;
    }

    inv[bloodIdx] = null;
    inv[recipeIdx] = null;
  } else if (upgradeType === "chameleon") {
    let recipeIdx = -1;
    for (let i = 0; i < inv.length; i++) {
      if (!inv[i]) continue;
      if (inv[i].type === "recipe_chameleon_equipment" && recipeIdx === -1) {
        recipeIdx = i;
        break;
      }
    }
    if (recipeIdx === -1) {
      ws.send(
        JSON.stringify({
          type: "torestosUpgradeResult",
          success: false,
          error: "Не удалось найти рецепт хамелеона для удаления",
        }),
      );
      return;
    }
    inv[recipeIdx] = null;
  } else if (upgradeType === "nano_knife") {
    // Удаляем ВСЕ указанные материалы (по одному каждого типа)
    const toRemove = [
      "knife",
      "white_crystal",
      "green_crystal",
      "red_crystal",
      "yellow_crystal",
      "blue_crystal",
      "chameleon_crystal",
      "nanoalloy",
      "nanofilament",
    ];

    const removed = new Set();

    for (let type of toRemove) {
      for (let i = 0; i < inv.length; i++) {
        if (inv[i] && inv[i].type === type && !removed.has(type)) {
          inv[i] = null;
          removed.add(type);
          break;
        }
      }
    }

    if (removed.size !== toRemove.length) {
      ws.send(
        JSON.stringify({
          type: "torestosUpgradeResult",
          success: false,
          error: "Не удалось найти все необходимые кристаллы и нано-материалы",
        }),
      );
      return;
    }
  }

  // 7. Добавляем новый предмет в свободный слот
  const freeSlot = inv.findIndex((slot) => slot === null);
  if (freeSlot === -1) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error: "Нет места в инвентаре",
      }),
    );
    return;
  }

  inv[freeSlot] = newItem;

  // 8. Сохраняем изменения
  player.inventory = inv;
  players.set(playerId, { ...player });
  userDatabase.set(playerId, { ...player });
  saveUserDatabase(dbCollection, playerId, player);

  // 9. Отправляем результат клиенту
  ws.send(
    JSON.stringify({
      type: "torestosUpgradeResult",
      success: true,
      newInventory: inv,
      message: `Получено: ${ITEM_CONFIG[newType]?.description || newType}`,
    }),
  );
}

module.exports = {
  handleTorestosUpgrade,
};
