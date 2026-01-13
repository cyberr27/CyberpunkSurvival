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

  if (roll < 0.15) {
    // ничего
  } else if (roll < 0.3) {
    drops.push(createDrop("balyary", 1));
    drops.push(createDrop("blood_pack"));
  } else if (roll < 0.45) {
    drops.push(createDrop("atom"));
    drops.push(createDrop("blood_pack"));
  } else if (roll < 0.6) {
    const type = TORN_ITEMS[Math.floor(Math.random() * TORN_ITEMS.length)];
    drops.push(createDrop(type));
  } else if (roll < 0.75) {
    const type =
      MELEE_WEAPONS[Math.floor(Math.random() * MELEE_WEAPONS.length)];
    drops.push(createDrop(type));
  } else if (roll < 0.9) {
    const type = TORN_ITEMS[Math.floor(Math.random() * TORN_ITEMS.length)];
    drops.push(createDrop(type));
    drops.push(createDrop("atom"));
  } else if (roll < 0.97) {
    const type =
      CHAMELEON_ITEMS[Math.floor(Math.random() * CHAMELEON_ITEMS.length)];
    drops.push(createDrop(type));
  } else {
    const type =
      WHITE_VOID_ITEMS[Math.floor(Math.random() * WHITE_VOID_ITEMS.length)];
    drops.push(createDrop(type));
  }

  return drops;
}

module.exports = { generateEnemyDrop };
