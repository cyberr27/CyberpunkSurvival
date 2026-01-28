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

  // 2. Ищем материалы
  const materials = findMaterialItems(inv);
  if (materials.length < 2) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error:
          "Недостаточно материалов (нужен blood_pack + recipe_torn_equipment)",
      }),
    );
    return;
  }

  let hasBloodPack = false;
  let hasRecipe = false;

  materials.forEach((m) => {
    if (m.item.type === "blood_pack") hasBloodPack = true;
    if (m.item.type === "recipe_torn_equipment") hasRecipe = true;
  });

  if (!hasBloodPack || !hasRecipe) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error: "Требуются blood_pack и recipe_torn_equipment",
      }),
    );
    return;
  }

  // 3. Определяем, что получим
  const newType = getTornHealthVariant(centerItem.type);
  if (!newType) {
    ws.send(
      JSON.stringify({
        type: "torestosUpgradeResult",
        success: false,
        error: "Неизвестный тип White Void предмета",
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

  // Удаляем по одному blood_pack и recipe_torn_equipment
  let bloodRemoved = false;
  let recipeRemoved = false;

  for (let i = 0; i < inv.length; i++) {
    if (!inv[i]) continue;

    if (!bloodRemoved && inv[i].type === "blood_pack") {
      inv[i] = null;
      bloodRemoved = true;
      continue;
    }
    if (!recipeRemoved && inv[i].type === "recipe_torn_equipment") {
      inv[i] = null;
      recipeRemoved = true;
      continue;
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
}

module.exports = {
  handleTorestosUpgrade,
};
