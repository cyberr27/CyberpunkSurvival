// items.js — ПОЛНОСТЬЮ ОБНОВЛЁННАЯ ВЕРСИЯ (на декабрь 2025)
// Используется как на клиенте, так и на сервере (если нужно)

const ITEM_CONFIG = {
  // === ЕДА / НАПИТКИ ===
  energy_drink: {
    effect: { energy: 20, water: 5 },
    description: "Энергетик: +20 эн. +5 воды.",
    rarity: 2,
  },
  nut: {
    effect: { food: 7 },
    description: "Орех: +7 еды.",
    rarity: 3,
  },
  water_bottle: {
    effect: { water: 30 },
    description: "Вода: +30 воды.",
    rarity: 3,
  },
  apple: {
    effect: { food: 8, water: 5 },
    description: "Яблоко: +8 еды, +5 воды.",
    rarity: 3,
  },
  berries: {
    effect: { food: 6, water: 6 },
    description: "Ягоды: +6 еды, +6 воды.",
    rarity: 3,
  },
  carrot: {
    effect: { food: 5, energy: 3 },
    description: "Морковь: +5 еды, +3 энергии.",
    rarity: 3,
  },
  canned_meat: {
    effect: { food: 20 },
    description: "Банка тушёнки: +20 еды.",
    rarity: 1,
  },
  mushroom: {
    effect: { food: 5, energy: 15 },
    description: "Гриб прущий: +15 энергии, +5 еды.",
    rarity: 1,
  },
  sausage: {
    effect: { food: 16, energy: 3 },
    description: "Колбаса: +16 еды, +3 энергии.",
    rarity: 2,
  },
  blood_pack: {
    effect: { health: 40 },
    description: "Пакет крови: +40 здоровья.",
    rarity: 1,
  },
  bread: {
    effect: { food: 13, water: -2 },
    description: "Хлеб: +13 еды, -2 воды.",
    rarity: 2,
  },
  vodka_bottle: {
    effect: { health: 5, energy: -2, water: 1, food: 2 },
    description: "Водка: +5 здоровья, -2 эн. +1 воды, +2 еды.",
    rarity: 2,
  },
  meat_chunk: {
    effect: { food: 20, energy: 5, water: -2 },
    description: "Кусок мяса: +20 еды, +5 эн., -2 воды.",
    rarity: 2,
  },
  blood_syringe: {
    effect: { health: 10 },
    description: "Шприц с кровью: +10 здоровья.",
    rarity: 2,
  },
  milk: {
    effect: { water: 15, food: 5 },
    description: "Молоко: +15 воды, +5 еды.",
    rarity: 2,
  },
  condensed_milk: {
    effect: { water: 5, food: 11, energy: 2 },
    description: "Сгущёнка: +11 еды, +5 воды, +2 эн.",
    rarity: 2,
  },
  dried_fish: {
    effect: { food: 10, water: -3 },
    description: "Сушёная рыба: +10 еды, -3 воды.",
    rarity: 2,
  },

  // === ВАЛЮТА ===
  balyary: {
    effect: {},
    description: "Баляр: игровая валюта.",
    stackable: true,
    balyary: true,
    rarity: 1,
  },

  // === СПЕЦПРЕДМЕТЫ ===
  atom: {
    effect: { armor: 5 },
    description: "Атом — даёт +5 брони при использовании.",
    stackable: true,
    rarity: 1,
  },
  medical_certificate: {
    effect: {},
    description: "Мед. справка МД-07: подтверждает, что ты не зомби.",
    rarity: 5,
  },
  medical_certificate_stamped: {
    effect: {},
    description: "Мед. справка с печатью заставы. Допуск в Неоновый Город.",
    rarity: 5,
  },

  // === КИБЕР-ЭКИПИРОВКА (ЭНДГЕЙМ) ===
  cyber_helmet: {
    type: "headgear",
    effect: { armor: 10, energy: 5 },
    description: "Кибершлем: +10 брони, +5 энергии",
    rarity: 4,
  },
  nano_armor: {
    type: "armor",
    effect: { armor: 20, health: 10 },
    description: "Нано-броня: +20 брони, +10 здоровья",
    rarity: 4,
  },
  tactical_belt: {
    type: "belt",
    effect: { armor: 5, food: 5 },
    description: "Тактический пояс: +5 брони, +5 еды",
    rarity: 4,
  },
  cyber_pants: {
    type: "pants",
    effect: { armor: 10, water: 5 },
    description: "Киберштаны: +10 брони, +5 воды",
    rarity: 4,
  },
  speed_boots: {
    type: "boots",
    effect: { armor: 5, energy: 10 },
    description: "Скоростные ботинки: +5 брони, +10 энергии",
    rarity: 4,
  },
  tech_gloves: {
    type: "gloves",
    effect: { armor: 5, energy: 5 },
    description: "Технические перчатки: +5 брони, +5 энергии",
    rarity: 4,
  },
  plasma_rifle: {
    type: "weapon",
    effect: { damage: 50, range: 200 },
    description: "Плазменная винтовка: 50 урона, дальность 200px",
    rarity: 4,
  },
  knuckles: {
    type: "weapon",
    effect: { damage: { min: 3, max: 7 } },
    description: "Кастет: 3–7 урона в ближнем бою",
    rarity: 4,
  },
  knife: {
    type: "weapon",
    effect: { damage: { min: 4, max: 6 } },
    description: "Нож: 4–6 урона в ближнем бою",
    rarity: 4,
  },
  bat: {
    type: "weapon",
    effect: { damage: { min: 5, max: 10 } },
    description: "Бита: 5–10 урона в ближнем бою",
    rarity: 4,
  },

  // === НОВАЯ ПОРВАННАЯ ЭКИПИРОВКА (СТАРТОВАЯ ===
  torn_baseball_cap_of_health: {
    type: "headgear",
    effect: { health: 5 },
    description: "Порванная кепка здоровья: +5 к максимальному здоровью",
    rarity: 1,
  },
  torn_health_t_shirt: {
    type: "armor",
    effect: { health: 10 },
    description: "Порванная футболка здоровья: +10 к максимальному здоровью",
    rarity: 1,
  },
  torn_health_gloves: {
    type: "gloves",
    effect: { health: 3 },
    description: "Порванные перчатки здоровья: +3 к максимальному здоровью",
    rarity: 1,
  },
  torn_belt_of_health: {
    type: "belt",
    effect: { health: 7 },
    description: "Порванный пояс здоровья: +7 к максимальному здоровью",
    rarity: 1,
  },
  torn_pants_of_health: {
    type: "pants",
    effect: { health: 8 },
    description: "Порванные штаны здоровья: +8 к максимальному здоровью",
    rarity: 1,
  },
  torn_health_sneakers: {
    type: "boots",
    effect: { health: 4 },
    description: "Порванные кроссовки здоровья: +4 к максимальному здоровью",
    rarity: 1,
  },

  torn_energy_cap: {
    type: "headgear",
    effect: { energy: 8 },
    description: "Порванная кепка энергии: +8 к максимальной энергии",
    rarity: 1,
  },
  torn_energy_t_shirt: {
    type: "armor",
    effect: { energy: 15 },
    description: "Порванная футболка энергии: +15 к максимальной энергии",
    rarity: 1,
  },
  torn_gloves_of_energy: {
    type: "gloves",
    effect: { energy: 5 },
    description: "Порванные перчатки энергии: +5 к максимальной энергии",
    rarity: 1,
  },
  torn_energy_belt: {
    type: "belt",
    effect: { energy: 10 },
    description: "Порванный пояс энергии: +10 к максимальной энергии",
    rarity: 1,
  },
  torn_pants_of_energy: {
    type: "pants",
    effect: { energy: 12 },
    description: "Порванные штаны энергии: +12 к максимальной энергии",
    rarity: 1,
  },
  torn_sneakers_of_energy: {
    type: "boots",
    effect: { energy: 7 },
    description: "Порванные кроссовки энергии: +7 к максимальной энергии",
    rarity: 1,
  },

  torn_cap_of_gluttony: {
    type: "headgear",
    effect: { food: 10 },
    description: "Порванная кепка обжорства: +10 к максимальной еде",
    rarity: 1,
  },
  torn_t_shirt_of_gluttony: {
    type: "armor",
    effect: { food: 20 },
    description: "Порванная футболка обжорства: +20 к максимальной еде",
    rarity: 1,
  },
  torn_gloves_of_gluttony: {
    type: "gloves",
    effect: { food: 6 },
    description: "Порванные перчатки обжорства: +6 к максимальной еде",
    rarity: 1,
  },
  torn_belt_of_gluttony: {
    type: "belt",
    effect: { food: 15 },
    description: "Порванный пояс обжорства: +15 к максимальной еде",
    rarity: 1,
  },
  torn_pants_of_gluttony: {
    type: "pants",
    effect: { food: 18 },
    description: "Порванные штаны обжорства: +18 к максимальной еде",
    rarity: 1,
  },
  torn_sneakers_of_gluttony: {
    type: "boots",
    effect: { food: 8 },
    description: "Порванные кроссовки обжорства: +8 к максимальной еде",
    rarity: 1,
  },

  torn_cap_of_thirst: {
    type: "headgear",
    effect: { water: 12 },
    description: "Порванная кепка жажды: +12 к максимальной воде",
    rarity: 1,
  },
  torn_t_shirt_of_thirst: {
    type: "armor",
    effect: { water: 25 },
    description: "Порванная футболка жажды: +25 к максимальной воде",
    rarity: 1,
  },
  torn_gloves_of_thirst: {
    type: "gloves",
    effect: { water: 7 },
    description: "Порванные перчатки жажды: +7 к максимальной воде",
    rarity: 1,
  },
  torn_belt_of_thirst: {
    type: "belt",
    effect: { water: 18 },
    description: "Порванный пояс жажды: +18 к максимальной воде",
    rarity: 1,
  },
  torn_pants_of_thirst: {
    type: "pants",
    effect: { water: 20 },
    description: "Порванные штаны жажды: +20 к максимальной воде",
    rarity: 1,
  },
  torn_sneakers_of_thirst: {
    type: "boots",
    effect: { water: 9 },
    description: "Порванные кроссовки жажды: +9 к максимальной воде",
    rarity: 1,
  },
};

module.exports = { ITEM_CONFIG };
