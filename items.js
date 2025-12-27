// items.js — ПОЛНОСТЬЮ ОБНОВЛЁННАЯ ВЕРСИЯ (на декабрь 2025)
// Используется как на клиенте, так и на сервере (если нужно)

const e = require("express");

const ITEM_CONFIG = {
  // === ЕДА / НАПИТКИ ===
  energy_drink: {
    effect: { energy: 20, water: 5 },
    description: "Энергетик: +20 эн. +5 воды.",
    rarity: 2,
  },
  nut: {
    effect: { food: 7 },
    description: "Синтетический протеиновый батончик: +7 еды.",
    rarity: 3,
  },
  water_bottle: {
    effect: { water: 30 },
    description:
      "Гидро-гель пакет: +30 воды. Чистая H₂O из атмосферного конденсатора.",
    rarity: 3,
  },
  apple: {
    effect: { food: 8, water: 5 },
    description: "Био-яблоко (ген-модификат): +8 еды, +5 воды.",
    rarity: 3,
  },
  berries: {
    effect: { food: 6, water: 6 },
    description: "Неоновые ягоды: +6 еды, +6 воды.",
    rarity: 3,
  },
  carrot: {
    effect: { food: 5, energy: 3 },
    description: "Нейро-морковь (стимулятор мозга): +5 еды, +3 энергии.",
    rarity: 3,
  },
  canned_meat: {
    effect: { food: 20 },
    description: "Банка синтетического протеина: +20 еды. Вкус — на выбор ИИ.",
    rarity: 1,
  },
  mushroom: {
    effect: { food: 5, energy: 15 },
    description: "Стимулирующий гриб (лабораторный): +5 еды, +15 энергии.",
    rarity: 1,
  },
  sausage: {
    effect: { food: 16, energy: 3 },
    description: "Синтетическая колбаса: +16 еды, +3 энергии.",
    rarity: 2,
  },
  blood_pack: {
    effect: { health: 40 },
    description: "Пакет крови: +40 здоровья.",
    rarity: 1,
  },
  bread: {
    effect: { food: 13, water: -2 },
    description: "Питательный брикет (сухой паёк): +13 еды, -2 воды.",
    rarity: 2,
  },
  vodka_bottle: {
    effect: { health: 5, energy: -2, water: 1, food: 2 },
    description:
      "Синтетическая водка: +5 здоровья, -2 энергии, +1 вода, +2 еда.",
    rarity: 2,
  },
  meat_chunk: {
    effect: { food: 20, energy: 5, water: -2 },
    description: "Кусок лабораторного мяса: +20 еды, +5 энергии, -2 воды.",
    rarity: 2,
  },
  blood_syringe: {
    effect: { health: 10 },
    description: "Шприц с кровью: +10 здоровья.",
    rarity: 2,
  },
  milk: {
    effect: { water: 15, food: 5 },
    description: "Нано-молоко (синтезировано): +15 воды, +5 еды.",
    rarity: 2,
  },
  condensed_milk: {
    effect: { water: 5, food: 11, energy: 2 },
    description: "Сгущённый питательный гель: +11 еды, +5 воды, +2 энергии.",
    rarity: 2,
  },
  dried_fish: {
    effect: { food: 10, water: -3 },
    description: "Сушёный протеиновый стик: +10 еды, -3 воды.",
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
    effect: { armor: 5, health: 5 },
    description:
      "Порванная кепка здоровья: +5 к максимальному здоровью и броне",
    rarity: 4,
  },
  torn_health_t_shirt: {
    type: "armor",
    effect: { armor: 10, health: 10 },
    description:
      "Порванная футболка здоровья: +10 к максимальному здоровью, +10 к броне",
    rarity: 4,
  },
  torn_health_gloves: {
    type: "gloves",
    effect: { armor: 5, health: 3 },
    description:
      "Порванные перчатки здоровья: +3 к максимальному здоровью, +5 к броне",
    rarity: 4,
  },
  torn_belt_of_health: {
    type: "belt",
    effect: { armor: 3, health: 7 },
    description:
      "Порванный пояс здоровья: +7 к максимальному здоровью, +3 к броне",
    rarity: 4,
  },
  torn_pants_of_health: {
    type: "pants",
    effect: { armor: 7, health: 6 },
    description:
      "Порванные штаны здоровья: +6 к максимальному здоровью, +7 к броне",
    rarity: 4,
  },
  torn_health_sneakers: {
    type: "boots",
    effect: { armor: 5, health: 4 },
    description:
      "Порванные кроссовки здоровья: +4 к максимальному здоровью, +5 к броне",
    rarity: 4,
  },

  torn_energy_cap: {
    type: "headgear",
    effect: { armor: 5, energy: 5 },
    description:
      "Порванная кепка энергии: +5 к максимальной энергии, +5 к броне",
    rarity: 4,
  },
  torn_energy_t_shirt: {
    type: "armor",
    effect: { armor: 10, energy: 10 },
    description:
      "Порванная футболка энергии: +10 к максимальной энергии, +10 к броне",
    rarity: 4,
  },
  torn_gloves_of_energy: {
    type: "gloves",
    effect: { armor: 5, energy: 3 },
    description:
      "Порванные перчатки энергии: +3 к максимальной энергии, +5 к броне",
    rarity: 4,
  },
  torn_energy_belt: {
    type: "belt",
    effect: { armor: 3, energy: 7 },
    description:
      "Порванный пояс энергии: +7 к максимальной энергии, +3 к броне",
    rarity: 4,
  },
  torn_pants_of_energy: {
    type: "pants",
    effect: { armor: 7, energy: 6 },
    description:
      "Порванные штаны энергии: +6 к максимальной энергии, +7 к броне",
    rarity: 4,
  },
  torn_sneakers_of_energy: {
    type: "boots",
    effect: { armor: 5, energy: 4 },
    description:
      "Порванные кроссовки энергии: +4 к максимальной энергии, +5 к броне",
    rarity: 4,
  },

  torn_cap_of_gluttony: {
    type: "headgear",
    effect: { armor: 5, food: 5 },
    description: "Порванная кепка обжорства: +5 к максимальной еде, +5 к броне",
    rarity: 4,
  },
  torn_t_shirt_of_gluttony: {
    type: "armor",
    effect: { armor: 10, food: 10 },
    description:
      "Порванная футболка обжорства: +10 к максимальной еде, +10 к броне",
    rarity: 4,
  },
  torn_gloves_of_gluttony: {
    type: "gloves",
    effect: { armor: 5, food: 3 },
    description:
      "Порванные перчатки обжорства: +3 к максимальной еде, +5 к броне",
    rarity: 4,
  },
  torn_belt_of_gluttony: {
    type: "belt",
    effect: { armor: 3, food: 7 },
    description: "Порванный пояс обжорства: +7 к максимальной еде, +3 к броне",
    rarity: 4,
  },
  torn_pants_of_gluttony: {
    type: "pants",
    effect: { armor: 7, food: 6 },
    description: "Порванные штаны обжорства: +6 к максимальной еде, +7 к броне",
    rarity: 4,
  },
  torn_sneakers_of_gluttony: {
    type: "boots",
    effect: { armor: 5, food: 4 },
    description:
      "Порванные кроссовки обжорства: +4 к максимальной еде, +5 к броне",
    rarity: 4,
  },

  torn_cap_of_thirst: {
    type: "headgear",
    effect: { armor: 5, water: 5 },
    description: "Порванная кепка жажды: +5 к максимальной воде, +5 к броне",
    rarity: 4,
  },
  torn_t_shirt_of_thirst: {
    type: "armor",
    effect: { armor: 10, water: 10 },
    description:
      "Порванная футболка жажды: +10 к максимальной воде, +10 к броне",
    rarity: 4,
  },
  torn_gloves_of_thirst: {
    type: "gloves",
    effect: { armor: 5, water: 3 },
    description: "Порванные перчатки жажды: +3 к максимальной воде, +5 к броне",
    rarity: 4,
  },
  torn_belt_of_thirst: {
    type: "belt",
    effect: { armor: 3, water: 7 },
    description: "Порванный пояс жажды: +7 к максимальной воде, +3 к броне",
    rarity: 4,
  },
  torn_pants_of_thirst: {
    type: "pants",
    effect: { armor: 7, water: 6 },
    description: "Порванные штаны жажды: +6 к максимальной воде, +7 к броне",
    rarity: 4,
  },
  torn_sneakers_of_thirst: {
    type: "boots",
    effect: { armor: 5, water: 4 },
    description:
      "Порванные кроссовки жажды: +4 к максимальной воде, +5 к броне",
    rarity: 4,
  },
};

module.exports = { ITEM_CONFIG };
