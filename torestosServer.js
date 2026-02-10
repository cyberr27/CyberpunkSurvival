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

function isUpgradeableItemServer(item) {
  if (!item) return false;
  const cfg = ITEM_CONFIG[item.type];
  if (!cfg) return false;
  return (
    cfg.type === "weapon" ||
    ["headgear", "armor", "gloves", "belt", "pants", "boots"].includes(cfg.type)
  );
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

  // 1. Находим центральный предмет
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

  // Проверка типа предмета (дополнительная защита)
  if (!isWhiteVoidItem(centerItem)) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error: "В центральном слоте должен быть предмет коллекции White Void",
      }),
    );
    return;
  }

  // Можно раскомментировать для строгой проверки
  // if (!isUpgradeableItemServer(centerItem)) {
  //   ws.send(JSON.stringify({
  //     type: "torestosUpgradeResult",
  //     success: false,
  //     error: "В центральном слоте должен быть предмет экипировки или оружие",
  //   }));
  //   return;
  // }

  // 2. Собираем материалы
  const materials = findMaterialItems(inv);

  let upgradeType = null; // "torn" или "chameleon"

  // Считаем, сколько у нас каждого нужного типа
  const materialCounts = {};
  materials.forEach((m) => {
    const type = m.item.type;
    materialCounts[type] = (materialCounts[type] || 0) + (m.item.quantity || 1);
  });

  // Проверяем рецепт Torn Health
  const hasBlood = (materialCounts["blood_pack"] || 0) >= 1;
  const hasTornRecipe = (materialCounts["recipe_torn_equipment"] || 0) >= 1;

  if (hasBlood && hasTornRecipe) {
    upgradeType = "torn";
  }
  // Проверяем рецепт Chameleon
  else if ((materialCounts["recipe_chameleon_equipment"] || 0) >= 1) {
    upgradeType = "chameleon";
  }

  if (!upgradeType) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error:
          "Неправильные или недостаточные материалы.\n\n" +
          "Требуется один из вариантов:\n" +
          "• 1× blood_pack + 1× recipe_torn_equipment\n" +
          "• 1× recipe_chameleon_equipment",
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
  }

  if (!newType) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error: "Не поддерживается улучшение для этого типа White Void предмета",
      }),
    );
    return;
  }

  // 4. Создаём результат
  const newItem = {
    type: newType,
    // quality, durability и т.д. можно добавить позже
  };

  // 5. Удаляем использованные предметы
  inv[centerIdx] = null;

  if (upgradeType === "torn") {
    let bloodIdx = -1;
    let recipeIdx = -1;

    for (let i = 0; i < inv.length; i++) {
      if (!inv[i]) continue;

      if (inv[i].type === "blood_pack" && bloodIdx === -1) {
        bloodIdx = i;
      }
      if (inv[i].type === "recipe_torn_equipment" && recipeIdx === -1) {
        recipeIdx = i;
      }

      if (bloodIdx !== -1 && recipeIdx !== -1) break;
    }

    if (bloodIdx === -1 || recipeIdx === -1) {
      ws.send(
        JSON.stringify({
          type: "torestosUpgradeResult",
          success: false,
          error:
            "Сервер не нашёл необходимые материалы для удаления (ошибка синхронизации)",
        }),
      );
      return;
    }

    // Удаляем по одному экземпляру
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
          error:
            "Сервер не нашёл рецепт хамелеона для удаления (ошибка синхронизации)",
        }),
      );
      return;
    }

    inv[recipeIdx] = null;
  }

  // 6. Добавляем результат в свободный слот
  const freeSlot = inv.findIndex((slot) => slot === null);
  if (freeSlot === -1) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error: "Нет свободного места в инвентаре",
      }),
    );
    return;
  }

  inv[freeSlot] = newItem;

  // 7. Сохраняем
  player.inventory = inv;
  players.set(playerId, { ...player });
  userDatabase.set(playerId, { ...player });
  saveUserDatabase(dbCollection, playerId, player);

  // 8. Успешный ответ
  ws.send(
    JSON.stringify({
      type: "torestosUpgradeResult",
      success: true,
      newInventory: inv,
      message: `Успешно улучшено!\nПолучено: ${ITEM_CONFIG[newType]?.description || newType}`,
    }),
  );
}

module.exports = {
  handleTorestosUpgrade,
};
