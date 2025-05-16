const ITEM_CONFIG = {
  blood_pack: { effect: { health: 40 }, rarity: 1 },
  canned_meat: { effect: { food: 20 }, rarity: 1 },
  mushroom: { effect: { food: 5, energy: 15 }, rarity: 1 },
  dried_fish: { effect: { food: 10, water: -3 }, rarity: 2 },
  condensed_milk: { effect: { water: 5, food: 11, energy: 2 }, rarity: 2 },
  milk: { effect: { water: 15, food: 5 }, rarity: 2 },
  blood_syringe: { effect: { health: 10 }, rarity: 2 },
  meat_chunk: { effect: { food: 20, energy: 5, water: -2 }, rarity: 2 },
  vodka_bottle: {
    effect: { health: 5, energy: -2, water: 1, food: 2 },
    rarity: 2,
  },
  bread: { effect: { food: 13, water: -2 }, rarity: 2 },
  sausage: { effect: { food: 16, energy: 3 }, rarity: 2 },
  energy_drink: { effect: { energy: 20, water: 5 }, rarity: 2 },
  balyary: { effect: {}, rarity: 2, stackable: true },
  water_bottle: { effect: { water: 30 }, rarity: 3 },
  nut: { effect: { food: 7 }, rarity: 3 },
  apple: { effect: { food: 8, water: 5 }, rarity: 3 },
  berries: { effect: { food: 6, water: 6 }, rarity: 3 },
  carrot: { effect: { food: 5, energy: 3 }, rarity: 3 },
  wolf_skin: {
    effect: {},
    rarity: 4,
  },
  cyber_helmet: {
    type: "headgear",
    effect: { armor: 10, energy: 5 },
    rarity: 4,
  },
  nano_armor: { type: "armor", effect: { armor: 20, health: 10 }, rarity: 4 },
  tactical_belt: { type: "belt", effect: { armor: 5, food: 5 }, rarity: 4 },
  cyber_pants: { type: "pants", effect: { armor: 10, water: 5 }, rarity: 4 },
  speed_boots: { type: "boots", effect: { armor: 5, energy: 10 }, rarity: 4 },
  tech_gloves: { type: "gloves", effect: { armor: 5, energy: 5 }, rarity: 4 },
  plasma_rifle: {
    type: "weapon",
    effect: { damage: 15, range: 500 }, // Добавляем range для дальнобойного оружия
    rarity: 3,
  },
  knuckles: {
    type: "weapon",
    effect: { damage: { min: 3, max: 7 } }, // Кастет: 3-7 урона
    rarity: 3,
  },
  knife: {
    type: "weapon",
    effect: { damage: { min: 4, max: 6 } }, // Нож: 4-6 урона
    rarity: 3,
  },
  bat: {
    type: "weapon",
    effect: { damage: { min: 5, max: 10 } }, // Бита: 5-10 урона
    rarity: 3,
  },
};

module.exports = { ITEM_CONFIG };
