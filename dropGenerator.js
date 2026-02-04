// dropGenerator.js

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
  // можно добавить остальные rarity 1-3, если нужно
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

  const createDrop = (type, quantity = 1) => {
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
    return drops; // пусто
  }

  // 10% — только пакет крови
  if (roll < 0.2) {
    drops.push(createDrop("blood_pack"));
    return drops;
  }

  // 10% — 1 баляр + пакет крови
  if (roll < 0.3) {
    drops.push(createDrop("balyary", 1));
    drops.push(createDrop("blood_pack"));
    return drops;
  }

  // 10% — 1 атом + пакет крови
  if (roll < 0.4) {
    drops.push(createDrop("atom", 1));
    drops.push(createDrop("blood_pack"));
    return drops;
  }

  // 10% — 1 атом + 1 баляр (без крови!)
  if (roll < 0.5) {
    drops.push(createDrop("atom", 1));
    drops.push(createDrop("balyary", 1));
    return drops;
  }

  // 27% — любой предмет rarity 1-3 + пакет крови
  // (было 35%, уменьшили чтобы уместить +7% torn и +6% White Void)
  if (roll < 0.77) {
    const type =
      LOW_RARITY_FOOD[Math.floor(Math.random() * LOW_RARITY_FOOD.length)];
    drops.push(createDrop(type));
    drops.push(createDrop("blood_pack"));
    return drops;
  }

  // 15% — одна порванная вещь
  if (roll < 0.92) {
    const type = TORN_ITEMS[Math.floor(Math.random() * TORN_ITEMS.length)];
    drops.push(createDrop(type));
    return drops;
  }

  // 3% — оружие ближнего боя
  if (roll < 0.95) {
    const type =
      MELEE_WEAPONS[Math.floor(Math.random() * MELEE_WEAPONS.length)];
    drops.push(createDrop(type));
    return drops;
  }

  // 8% — White Void
  if (roll < 0.98) {
    const type =
      WHITE_VOID_ITEMS[Math.floor(Math.random() * WHITE_VOID_ITEMS.length)];
    drops.push(createDrop(type));
    return drops;
  }

  // 2% — Chameleon
  const type =
    CHAMELEON_ITEMS[Math.floor(Math.random() * CHAMELEON_ITEMS.length)];
  drops.push(createDrop(type));

  return drops;
}

module.exports = { generateEnemyDrop };
