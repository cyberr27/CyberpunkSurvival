// toremidosSkills.js

const TOREMIDOS_SKILLS = {
  power_strike: {
    name: "Мощный удар",
    maxLevel: 5,
    initialLevel: 1,
    price: { balyary: 120, atoms: 45 },
  },
  fast_regen: {
    name: "Быстрая регенерация",
    maxLevel: 4,
    initialLevel: 1,
    price: { balyary: 180, atoms: 30 },
  },
  energy_siphon: {
    name: "Высасывание энергии",
    maxLevel: 5,
    initialLevel: 1,
    price: { balyary: 250, blood_pack: 3 },
  },
  // добавляй остальные
};

module.exports = { TOREMIDOS_SKILLS };
