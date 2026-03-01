// dropGenerator.js

const { ITEM_CONFIG } = require("./items");

const TORN_ITEMS = [
  "torn_baseball_cap_of_health",
  "torn_health_t_shirt",
  "torn_health_gloves",
  "torn_belt_of_health",
  "torn_pants_of_health",
  "torn_health_sneakers",
  "torn_energy_cap",
  "torn_energy_t_shirt",
  "torn_gloves_of_energy",
  "torn_energy_belt",
  "torn_pants_of_energy",
  "torn_sneakers_of_energy",
  "torn_cap_of_gluttony",
  "torn_t_shirt_of_gluttony",
  "torn_gloves_of_gluttony",
  "torn_belt_of_gluttony",
  "torn_pants_of_gluttony",
  "torn_sneakers_of_gluttony",
  "torn_cap_of_thirst",
  "torn_t_shirt_of_thirst",
  "torn_gloves_of_thirst",
  "torn_belt_of_thirst",
  "torn_pants_of_thirst",
  "torn_sneakers_of_thirst",
];

const LOW_RARITY_FOOD = [
  "canned_meat",
  "mushroom",
  "energy_drink",
  "sausage",
  "bread",
  "vodka_bottle",
  "meat_chunk",
  "blood_syringe",
  "milk",
  "condensed_milk",
  "dried_fish",
];

const MELEE_WEAPONS = ["knuckles", "knife", "bat"];

const CHAMELEON_ITEMS = [
  "chameleon_belt",
  "chameleon_cap",
  "chameleon_gloves",
  "chameleon_pants",
  "chameleon_sneakers",
  "chameleon_t_shirt",
];

const WHITE_VOID_ITEMS = [
  "white_void_cap",
  "white_void_t_shirt",
  "white_void_gloves",
  "white_void_belt",
  "white_void_pants",
  "white_void_sneakers",
];

function generateEnemyDrop(enemyType, x, y, worldId, now = Date.now()) {
  const roll = Math.random();
  const drops = [];

  // Вспомогательная функция создания дропа
  const createDrop = (type, quantity = 1) => {
    // Самая важная проверка — разрешён ли предмет с мобов вообще
    if (!ITEM_CONFIG[type]?.canDropFromEnemy) {
      console.warn(`Попытка дропнуть запрещённый предмет с моба: ${type}`);
      return null;
    }

    const itemId = `${type}_${now}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      itemId,
      x,
      y,
      type,
      quantity,
      spawnTime: now,
      worldId,
    };
  };

  // 10% — ничего
  if (roll < 0.1) {
    return drops;
  }

  // 10% — только пакет крови
  if (roll < 0.2) {
    const drop = createDrop("blood_pack");
    if (drop) drops.push(drop);
    return drops;
  }

  // 10% — 1 баляр + пакет крови
  if (roll < 0.3) {
    const d1 = createDrop("balyary", 1);
    const d2 = createDrop("blood_pack");
    if (d1) drops.push(d1);
    if (d2) drops.push(d2);
    return drops;
  }

  // 10% — 1 атом + пакет крови
  if (roll < 0.4) {
    const d1 = createDrop("atom", 1);
    const d2 = createDrop("blood_pack");
    if (d1) drops.push(d1);
    if (d2) drops.push(d2);
    return drops;
  }

  // 10% — 1 атом + 1 баляр (без крови)
  if (roll < 0.5) {
    const d1 = createDrop("atom", 1);
    const d2 = createDrop("balyary", 1);
    if (d1) drops.push(d1);
    if (d2) drops.push(d2);
    return drops;
  }

  // 27% — любой разрешённый еда/напиток + пакет крови
  if (roll < 0.77) {
    const validFood = LOW_RARITY_FOOD.filter(
      (t) => ITEM_CONFIG[t]?.canDropFromEnemy,
    );
    if (validFood.length > 0) {
      const type = validFood[Math.floor(Math.random() * validFood.length)];
      const d1 = createDrop(type);
      const d2 = createDrop("blood_pack");
      if (d1) drops.push(d1);
      if (d2) drops.push(d2);
    }
    return drops;
  }

  // 15% — одна порванная вещь
  if (roll < 0.92) {
    const validTorn = TORN_ITEMS.filter(
      (t) => ITEM_CONFIG[t]?.canDropFromEnemy,
    );
    if (validTorn.length > 0) {
      const type = validTorn[Math.floor(Math.random() * validTorn.length)];
      const drop = createDrop(type);
      if (drop) drops.push(drop);
    }
    return drops;
  }

  // 3% — оружие ближнего боя
  if (roll < 0.95) {
    const validMelee = MELEE_WEAPONS.filter(
      (t) => ITEM_CONFIG[t]?.canDropFromEnemy,
    );
    if (validMelee.length > 0) {
      const type = validMelee[Math.floor(Math.random() * validMelee.length)];
      const drop = createDrop(type);
      if (drop) drops.push(drop);
    }
    return drops;
  }

  // 3% — White Void (очень редко)
  if (roll < 0.98) {
    const validWhite = WHITE_VOID_ITEMS.filter(
      (t) => ITEM_CONFIG[t]?.canDropFromEnemy,
    );
    if (validWhite.length > 0) {
      const type = validWhite[Math.floor(Math.random() * validWhite.length)];
      const drop = createDrop(type);
      if (drop) drops.push(drop);
    }
    return drops;
  }

  // 2% — Chameleon (самая редкая категория)
  const validCham = CHAMELEON_ITEMS.filter(
    (t) => ITEM_CONFIG[t]?.canDropFromEnemy,
  );
  if (validCham.length > 0) {
    const type = validCham[Math.floor(Math.random() * validCham.length)];
    const drop = createDrop(type);
    if (drop) drops.push(drop);
  }

  return drops;
}

module.exports = { generateEnemyDrop };
