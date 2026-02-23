function calculateMaxStats(player, ITEM_CONFIG) {
  // Базовые значения + улучшения от перков
  const base = {
    health: 100 + (player.healthUpgrade || 0),
    energy: 100 + (player.energyUpgrade || 0),
    food: 100 + (player.foodUpgrade || 0),
    water: 100 + (player.waterUpgrade || 0),
    armor: 0,
  };

  // Проверяем полную коллекцию
  const slots = ["head", "chest", "belt", "pants", "boots", "gloves"];
  const collections = slots
    .map((slot) => player.equipment?.[slot])
    .filter(Boolean)
    .map((item) => ITEM_CONFIG[item.type]?.collection)
    .filter(Boolean);

  const isFullSet =
    collections.length === slots.length && new Set(collections).size === 1;

  const multiplier = isFullSet ? 2 : 1;

  // Применяем бонусы экипировки
  Object.values(player.equipment || {}).forEach((item) => {
    if (!item) return;
    const eff = ITEM_CONFIG[item.type]?.effect;
    if (!eff) return;

    if (eff.health) base.health += eff.health * multiplier;
    if (eff.energy) base.energy += eff.energy * multiplier;
    if (eff.food) base.food += eff.food * multiplier;
    if (eff.water) base.water += eff.water * multiplier;
    if (eff.armor) base.armor += eff.armor * multiplier;
  });

  // Записываем итоговые максимумы
  player.maxStats = { ...base };

  // Жёстко ограничиваем текущие значения (самая важная защита!)
  player.health = Math.max(
    0,
    Math.min(player.health ?? 0, player.maxStats.health),
  );
  player.energy = Math.max(
    0,
    Math.min(player.energy ?? 0, player.maxStats.energy),
  );
  player.food = Math.max(0, Math.min(player.food ?? 0, player.maxStats.food));
  player.water = Math.max(
    0,
    Math.min(player.water ?? 0, player.maxStats.water),
  );
  player.armor = Math.max(
    0,
    Math.min(player.armor ?? 0, player.maxStats.armor),
  );
}

const EQUIPMENT_TYPES = {
  headgear: "head",
  armor: "chest",
  belt: "belt",
  pants: "pants",
  boots: "boots",
  weapon: "weapon",
  gloves: "gloves",
};

module.exports = { calculateMaxStats, EQUIPMENT_TYPES };