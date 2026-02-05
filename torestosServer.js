const { ITEM_CONFIG } = require("./items"); // предполагается, что ITEM_CONFIG экспортируется

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
  broadcastToWorld,
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

  if (!Array.isArray(inv)) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error: "Инвентарь не является массивом",
      }),
    );
    console.error("[Torestos] Получен НЕ массив в inventory:", inv);
    return;
  }

  // Дополнительно: заменяем undefined на null (чтобы унифицировать)
  for (let i = 0; i < inv.length; i++) {
    if (inv[i] === undefined) {
      inv[i] = null;
    }
  }

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

  // 2. Ищем материалы и определяем рецепт
  const materials = findMaterialItems(inv);

  let upgradeType = null; // "torn" или "chameleon"
  let requiredMaterials = [];

  // Проверяем рецепт Torn Health (нужно два предмета)
  let hasBlood = false;
  let hasTornRecipe = false;

  materials.forEach((m) => {
    if (m.item.type === "blood_pack") hasBlood = true;
    if (m.item.type === "recipe_torn_equipment") hasTornRecipe = true;
  });

  if (hasBlood && hasTornRecipe && materials.length >= 2) {
    upgradeType = "torn";
    requiredMaterials = ["blood_pack", "recipe_torn_equipment"];
  }
  // Если не подошёл Torn — проверяем Chameleon (нужен только один рецепт)
  else if (materials.length >= 1) {
    const hasChameleonRecipe = materials.some(
      (m) => m.item.type === "recipe_chameleon_equipment",
    );

    if (hasChameleonRecipe) {
      upgradeType = "chameleon";
      requiredMaterials = ["recipe_chameleon_equipment"];
    }
  }

  if (!upgradeType) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error:
          "Неправильные или недостаточные материалы. Требуется:\n" +
          "• blood_pack + recipe_torn_equipment\n" +
          "или\n" +
          "• recipe_chameleon_equipment",
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
        error:
          "Неизвестный / неподдерживаемый тип White Void предмета для этого рецепта",
      }),
    );
    return;
  }

  // 4. Создаём новый предмет
  const newItem = {
    type: newType,
    // Можно добавить quality / durability / etc в будущем
  };

  // 5. Удаляем использованные предметы
  inv[centerIdx] = null;

  if (upgradeType === "torn") {
    let bloodRemoved = false;
    let recipeRemoved = false;

    for (let i = 0; i < inv.length; i++) {
      // Самая надёжная проверка: null, undefined, не объект — пропускаем
      if (inv[i] == null || typeof inv[i] !== "object" || inv[i] === null) {
        continue;
      }

      // Теперь 100% безопасно
      const item = inv[i]; // ← для читаемости

      if (!bloodRemoved && item.type === "blood_pack") {
        inv[i] = null;
        bloodRemoved = true;
      }
      if (!recipeRemoved && item.type === "recipe_torn_equipment") {
        inv[i] = null;
        recipeRemoved = true;
      }

      if (bloodRemoved && recipeRemoved) break;
    }
  } else if (upgradeType === "chameleon") {
    let recipeRemoved = false;

    for (let i = 0; i < inv.length; i++) {
      // Та же надёжная защита
      if (inv[i] == null || typeof inv[i] !== "object" || inv[i] === null) {
        continue;
      }

      const item = inv[i];

      if (!recipeRemoved && item.type === "recipe_chameleon_equipment") {
        inv[i] = null;
        recipeRemoved = true;
        break;
      }
    }
  }

  // 6. Добавляем новый предмет в свободный слот
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

  // 7. Сохраняем изменения в базу
  player.inventory = inv;
  players.set(playerId, { ...player });
  userDatabase.set(playerId, { ...player });
  saveUserDatabase(dbCollection, playerId, player);

  // 8. Отправляем результат клиенту
  ws.send(
    JSON.stringify({
      type: "torestosUpgradeResult",
      success: true,
      newInventory: inv,
      message: `Получено: ${ITEM_CONFIG[newType]?.description || newType}`,
    }),
  );

  const updatePayload = {
    type: "update",
    player: {
      id: playerId,
      inventory: player.inventory,
    },
  };

  broadcastToWorld(
    wss,
    clients,
    players,
    player.worldId,
    JSON.stringify(updatePayload),
  );
}

module.exports = {
  handleTorestosUpgrade,
};
