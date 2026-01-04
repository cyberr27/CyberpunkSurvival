// equipmentSystem.js - ИЗМЕНЁННЫЙ ПОЛНОСТЬЮ
// equipmentSystem.js

const equipmentSystem = {
  isEquipmentOpen: false,
  isInitialized: false,
  lastApplied: false,
  equipmentSlots: {
    head: null,
    chest: null,
    belt: null,
    pants: null,
    boots: null,
    weapon: null,
    gloves: null,
  },

  // Типы предметов и их слоты
  EQUIPMENT_TYPES: {
    headgear: "head",
    armor: "chest",
    belt: "belt",
    pants: "pants",
    boots: "boots",
    weapon: "weapon",
    gloves: "gloves",
  },

  // БАЗОВЫЙ УРОН БЛИЖНЕГО БОЯ (СИНХРОНИЗИРОВАНО С COMBATSYSTEM)
  BASE_MELEE_MIN: 5,
  BASE_MELEE_MAX: 10,

  // НОВЫЕ ФУНКЦИИ ДЛЯ РАСЧЁТА УРОНА
  getCurrentMeleeDamage: function () {
    const levelBonus = window.levelSystem.meleeDamageBonus || 0;
    const baseMin = this.BASE_MELEE_MIN + levelBonus; // НОВОЕ: + levelBonus
    const baseMax = this.BASE_MELEE_MAX + levelBonus; // НОВОЕ: + levelBonus
    const weaponSlot = this.equipmentSlots.weapon;

    if (!weaponSlot || !this.EQUIPMENT_CONFIG[weaponSlot.type]) {
      return { min: baseMin, max: baseMax };
    }

    const config = this.EQUIPMENT_CONFIG[weaponSlot.type];
    if (config.effect.range) {
      // Дальнобойное: melee урон базовый
      return { min: baseMin, max: baseMax };
    }

    const dmgEffect = config.effect.damage;
    if (
      dmgEffect &&
      typeof dmgEffect === "object" &&
      dmgEffect.min !== undefined &&
      dmgEffect.max !== undefined
    ) {
      return {
        min: baseMin + dmgEffect.min,
        max: baseMax + dmgEffect.max,
      };
    }

    return { min: baseMin, max: baseMax };
  },

  updateDamageDisplay: function () {
    const dmg = this.getCurrentMeleeDamage();
    const baseStr = `${this.BASE_MELEE_MIN}-${this.BASE_MELEE_MAX}`;
    const currentStr = `${dmg.min}-${dmg.max}`;
    const displayEl = document.getElementById("damageDisplay");
    if (displayEl) {
      displayEl.textContent = `Урон: ${currentStr}`;
      displayEl.style.color =
        this.equipmentSlots.weapon !== null ? "lime" : "#ffaa00";
    }
  },

  // Конфигурация предметов экипировки (БЕЗ ИЗМЕНЕНИЙ)
  EQUIPMENT_CONFIG: {
    cyber_helmet: {
      type: "headgear",
      effect: { armor: 10, energy: 5 },
      description: "Кибершлем: +10 брони, +5 энергии",
      rarity: 4,
      image: new Image(),
    },
    nano_armor: {
      type: "armor",
      effect: { armor: 20, health: 10 },
      description: "Нано-броня: +20 брони, +10 здоровья",
      rarity: 4,
      image: new Image(),
    },
    tactical_belt: {
      type: "belt",
      effect: { armor: 5, food: 5 },
      description: "Тактический пояс: +5 брони, +5 еды",
      rarity: 4,
      image: new Image(),
    },
    cyber_pants: {
      type: "pants",
      effect: { armor: 10, water: 5 },
      description: "Киберштаны: +10 брони, +5 воды",
      rarity: 4,
      image: new Image(),
    },
    speed_boots: {
      type: "boots",
      effect: { armor: 5, energy: 10 },
      description: "Скоростные ботинки: +5 брони, +10 энергии",
      rarity: 4,
      image: new Image(),
    },
    tech_gloves: {
      type: "gloves",
      effect: { armor: 5, energy: 5 },
      description: "Технические перчатки: +5 брони, +5 энергии",
      rarity: 4,
      image: new Image(),
    },
    plasma_rifle: {
      type: "weapon",
      effect: { damage: 50, range: 200 },
      description: "Плазменная винтовка: +15 урона, дальнобойная",
      rarity: 4,
      image: new Image(),
    },
    knuckles: {
      type: "weapon",
      effect: { damage: { min: 3, max: 7 } },
      description: "Кастет: 3-7 урона в ближнем бою",
      rarity: 4,
      image: new Image(),
    },
    knife: {
      type: "weapon",
      effect: { damage: { min: 4, max: 6 } },
      description: "Нож: 4-6 урона в ближнем бою",
      rarity: 4,
      image: new Image(),
    },
    bat: {
      type: "weapon",
      effect: { damage: { min: 5, max: 10 } },
      description: "Бита: 5-10 урона в ближнем бою",
      rarity: 4,
      image: new Image(),
    },
    torn_baseball_cap_of_health: {
      type: "headgear",
      effect: { armor: 5, health: 5 },
      description:
        "Порванная кепка здоровья: +5 к максимальному здоровью и броне",
      rarity: 4,
      collection: "Torn Health", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_health_t_shirt: {
      type: "armor",
      effect: { armor: 10, health: 10 },
      description:
        "Порванная футболка здоровья: +10 к максимальному здоровью, +10 к броне",
      rarity: 4,
      collection: "Torn Health", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_health_gloves: {
      type: "gloves",
      effect: { armor: 5, health: 3 },
      description:
        "Порванные перчатки здоровья: +3 к максимальному здоровью, +5 к броне",
      rarity: 4,
      collection: "Torn Health", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_belt_of_health: {
      type: "belt",
      effect: { armor: 3, health: 7 },
      description:
        "Порванный пояс здоровья: +7 к максимальному здоровью, +3 к броне",
      rarity: 4,
      collection: "Torn Health", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_pants_of_health: {
      type: "pants",
      effect: { armor: 7, health: 6 },
      description:
        "Порванные штаны здоровья: +6 к максимальному здоровью, +7 к броне",
      rarity: 4,
      collection: "Torn Health", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_health_sneakers: {
      type: "boots",
      effect: { armor: 5, health: 4 },
      description:
        "Порванные кроссовки здоровья: +4 к максимальному здоровью, +5 к броне",
      rarity: 4,
      collection: "Torn Health", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },

    torn_energy_cap: {
      type: "headgear",
      effect: { armor: 5, energy: 5 },
      description:
        "Порванная кепка энергии: +5 к максимальной энергии, +5 к броне",
      rarity: 4,
      collection: "Torn Energy", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_energy_t_shirt: {
      type: "armor",
      effect: { armor: 10, energy: 10 },
      description:
        "Порванная футболка энергии: +10 к максимальной энергии, +10 к броне",
      rarity: 4,
      collection: "Torn Energy", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_gloves_of_energy: {
      type: "gloves",
      effect: { armor: 5, energy: 3 },
      description:
        "Порванные перчатки энергии: +3 к максимальной энергии, +5 к броне",
      rarity: 4,
      collection: "Torn Energy", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_energy_belt: {
      type: "belt",
      effect: { armor: 3, energy: 7 },
      description:
        "Порванный пояс энергии: +7 к максимальной энергии, +3 к броне",
      rarity: 4,
      collection: "Torn Energy", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_pants_of_energy: {
      type: "pants",
      effect: { armor: 7, energy: 6 },
      description:
        "Порванные штаны энергии: +6 к максимальной энергии, +7 к броне",
      rarity: 4,
      collection: "Torn Energy", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_sneakers_of_energy: {
      type: "boots",
      effect: { armor: 5, energy: 4 },
      description:
        "Порванные кроссовки энергии: +4 к максимальной энергии, +5 к броне",
      rarity: 4,
      collection: "Torn Energy", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },

    torn_cap_of_gluttony: {
      type: "headgear",
      effect: { armor: 5, food: 5 },
      description:
        "Порванная кепка обжорства: +5 к максимальной еде, +5 к броне",
      rarity: 4,
      collection: "Torn Gluttony", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_t_shirt_of_gluttony: {
      type: "armor",
      effect: { armor: 10, food: 10 },
      description:
        "Порванная футболка обжорства: +10 к максимальной еде, +10 к броне",
      rarity: 4,
      collection: "Torn Gluttony", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_gloves_of_gluttony: {
      type: "gloves",
      effect: { armor: 5, food: 3 },
      description:
        "Порванные перчатки обжорства: +3 к максимальной еде, +5 к броне",
      rarity: 4,
      collection: "Torn Gluttony", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_belt_of_gluttony: {
      type: "belt",
      effect: { armor: 3, food: 7 },
      description:
        "Порванный пояс обжорства: +7 к максимальной еде, +3 к броне",
      rarity: 4,
      collection: "Torn Gluttony", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_pants_of_gluttony: {
      type: "pants",
      effect: { armor: 7, food: 6 },
      description:
        "Порванные штаны обжорства: +6 к максимальной еде, +7 к броне",
      rarity: 4,
      collection: "Torn Gluttony", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_sneakers_of_gluttony: {
      type: "boots",
      effect: { armor: 5, food: 4 },
      description:
        "Порванные кроссовки обжорства: +4 к максимальной еде, +5 к броне",
      rarity: 4,
      collection: "Torn Gluttony", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },

    torn_cap_of_thirst: {
      type: "headgear",
      effect: { armor: 5, water: 5 },
      description: "Порванная кепка жажды: +5 к максимальной воде, +5 к броне",
      rarity: 4,
      collection: "Torn Thirst", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_t_shirt_of_thirst: {
      type: "armor",
      effect: { armor: 10, water: 10 },
      description:
        "Порванная футболка жажды: +10 к максимальной воде, +10 к броне",
      rarity: 4,
      collection: "Torn Thirst", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_gloves_of_thirst: {
      type: "gloves",
      effect: { armor: 5, water: 3 },
      description:
        "Порванные перчатки жажды: +3 к максимальной воде, +5 к броне",
      rarity: 4,
      collection: "Torn Thirst", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_belt_of_thirst: {
      type: "belt",
      effect: { armor: 3, water: 7 },
      description: "Порванный пояс жажды: +7 к максимальной воде, +3 к броне",
      rarity: 4,
      collection: "Torn Thirst", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_pants_of_thirst: {
      type: "pants",
      effect: { armor: 7, water: 6 },
      description: "Порванные штаны жажды: +6 к максимальной воде, +7 к броне",
      rarity: 4,
      collection: "Torn Thirst", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    torn_sneakers_of_thirst: {
      type: "boots",
      effect: { armor: 5, water: 4 },
      description:
        "Порванные кроссовки жажды: +4 к максимальной воде, +5 к броне",
      rarity: 4,
      collection: "Torn Thirst", // Вставлено здесь, после rarity, не меняя порядок
      image: new Image(),
    },
    // Вставка новых предметов здесь, в конец, после torn_sneakers_of_thirst (не меняя структуру)
    chameleon_belt: {
      type: "belt",
      effect: { armor: 12, health: 14, energy: 7, food: 7, water: 7 },
      description:
        "Хамелеон пояс: +12 брони, +14 здоровья, +7 энергии, +7 еды, +7 воды",
      rarity: 4,
      collection: "Light Chameleon",
      image: new Image(),
    },
    chameleon_cap: {
      type: "headgear",
      effect: { armor: 15, health: 10, energy: 5, food: 5, water: 5 },
      description:
        "Хамелеон кепка: +15 брони, +10 здоровья, +5 энергии, +5 еды, +5 воды",
      rarity: 4,
      collection: "Light Chameleon",
      image: new Image(),
    },
    chameleon_gloves: {
      type: "gloves",
      effect: { armor: 20, health: 6, energy: 3, food: 3, water: 3 },
      description:
        "Хамелеон перчатки: +20 брони, +6 здоровья, +3 энергии, +3 еды, +3 воды",
      rarity: 4,
      collection: "Light Chameleon",
      image: new Image(),
    },
    chameleon_pants: {
      type: "pants",
      effect: { armor: 21, health: 12, energy: 6, food: 6, water: 6 },
      description:
        "Хамелеон штаны: +21 брони, +12 здоровья, +6 энергии, +6 еды, +6 воды",
      rarity: 4,
      collection: "Light Chameleon",
      image: new Image(),
    },
    chameleon_sneakers: {
      type: "boots",
      effect: { armor: 15, health: 8, energy: 4, food: 4, water: 4 },
      description:
        "Хамелеон кроссовки: +15 брони, +8 здоровья, +4 энергии, +4 еды, +4 воды",
      rarity: 4,
      collection: "Light Chameleon",
      image: new Image(),
    },
    chameleon_t_shirt: {
      type: "armor",
      effect: { armor: 30, health: 20, energy: 10, food: 10, water: 10 },
      description:
        "Хамелеон футболка: +30 брони, +20 здоровья, +10 энергии, +10 еды, +10 воды",
      rarity: 4,
      collection: "Light Chameleon",
      image: new Image(),
    },
  },

  equipItem: function (slotIndex, item) {
    const me = players.get(myId);
    if (!me) {
      return;
    }

    const equipType = this.EQUIPMENT_CONFIG[item.type].type;
    const slotName = this.EQUIPMENT_TYPES[equipType];
    if (!slotName) {
      return;
    }

    // Проверяем, есть ли уже предмет в слоте
    let oldItem = null;
    let freeSlot = null; // <-- НАЧАЛО ИЗМЕНЕНИЯ: Объявляем freeSlot здесь для доступа ниже
    if (this.equipmentSlots[slotName]) {
      oldItem = this.equipmentSlots[slotName];
      freeSlot = inventory.findIndex((slot) => slot === null);
      if (freeSlot === -1) {
        alert("Инвентарь полон! Освободите место.");
        return;
      }
      inventory[freeSlot] = oldItem;
    }
    // <-- КОНЕЦ ИЗМЕНЕНИЯ (freeSlot доступен)

    // <-- НАЧАЛО ИЗМЕНЕНИЯ: Добавляем freeSlot в pending (null если нет swap)
    this.pendingEquip = {
      slotIndex,
      item: { ...item },
      slotName,
      oldItem,
      freeSlot: oldItem ? freeSlot : null,
    };
    // <-- КОНЕЦ ИЗМЕНЕНИЯ

    // Локально экипируем предмет
    this.equipmentSlots[slotName] = { type: item.type, itemId: item.itemId };
    inventory[slotIndex] = null; // Удаляем предмет из инвентаря
    this.updateEquipmentDisplay(); // Обновит и урон

    // Применяем эффекты экипировки
    this.applyEquipmentEffects(me);

    // Отправляем запрос на сервер
    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "equipItem",
          slotIndex,
          equipment: this.equipmentSlots,
          maxStats: { ...me.maxStats },
          stats: {
            health: me.health,
            energy: me.energy,
            food: me.food,
            water: me.water,
            armor: me.armor,
            damage: me.damage,
          },
        })
      );
    }

    // Обновляем интерфейс
    selectedSlot = null;
    document.getElementById("useBtn").disabled = true;
    document.getElementById("dropBtn").disabled = true;
    document.getElementById("inventoryScreen").textContent = "";
    updateStatsDisplay();
    updateInventoryDisplay();
  },

  unequipItem: function (slotName, inventorySlot) {
    const me = players.get(myId);
    if (!me) {
      return;
    }

    // Валидация слота
    const validSlots = [
      "head",
      "chest",
      "belt",
      "pants",
      "boots",
      "weapon",
      "gloves",
    ];
    if (!validSlots.includes(slotName)) {
      alert("Недопустимый слот!");
      return;
    }

    const item = this.equipmentSlots[slotName];
    if (!item) {
      alert("В слоте ничего нет!");
      return;
    }

    // Проверяем свободен ли слот инвентаря
    if (inventory[inventorySlot] !== null) {
      alert("Слот инвентаря занят!");
      return;
    }

    // Pending для revert
    this.pendingUnequip = {
      slotName,
      inventorySlot,
      item: { ...item },
    };

    // Локально unequip
    inventory[inventorySlot] = { type: item.type, itemId: item.itemId };
    this.equipmentSlots[slotName] = null;
    this.updateEquipmentDisplay();

    // Применяем эффекты
    this.applyEquipmentEffects(me);

    // Отправляем на сервер
    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "unequipItem",
          slotName,
          inventorySlot,
          itemId: item.itemId,
          equipment: this.equipmentSlots,
          maxStats: { ...me.maxStats },
          stats: {
            health: me.health,
            energy: me.energy,
            food: me.food,
            water: me.water,
            armor: me.armor,
            damage: me.damage,
          },
        })
      );
    }

    // Обновляем UI
    updateStatsDisplay();
    updateInventoryDisplay();
  },

  applyEquipmentEffects: function (player) {
    // Базовые значения из levelSystem
    const baseMaxStats = { ...window.levelSystem.maxStats };

    // Сбрасываем maxStats и урон
    player.maxStats = { ...baseMaxStats };
    player.damage = 0;

    // Проверка полной коллекции
    const equippedItems = Object.values(this.equipmentSlots).filter(Boolean); // Только надетые
    const collectionSlots = [
      "head",
      "chest",
      "belt",
      "pants",
      "boots",
      "gloves",
    ]; // 6 слотов для коллекций (без weapon)
    const equippedCollections = equippedItems
      .map((item) => this.EQUIPMENT_CONFIG[item.type]?.collection)
      .filter((c) => c);
    const uniqueCollections = new Set(equippedCollections);
    const isFullCollection =
      equippedItems.length >= 6 && // Минимум 6 (если weapon надет, игнор)
      uniqueCollections.size === 1 && // Все из одной коллекции
      collectionSlots.every(
        (slot) =>
          this.equipmentSlots[slot] &&
          this.EQUIPMENT_CONFIG[this.equipmentSlots[slot].type]?.collection ===
            [...uniqueCollections][0]
      );
    const multiplier = isFullCollection ? 2 : 1;

    // Применяем эффекты экипировки
    Object.values(this.equipmentSlots).forEach((item) => {
      if (item && this.EQUIPMENT_CONFIG[item.type]) {
        const effect = this.EQUIPMENT_CONFIG[item.type].effect;
        if (effect.armor) player.maxStats.armor += effect.armor * multiplier;
        if (effect.health) player.maxStats.health += effect.health * multiplier;
        if (effect.energy) player.maxStats.energy += effect.energy * multiplier;
        if (effect.food) player.maxStats.food += effect.food * multiplier;
        if (effect.water) player.maxStats.water += effect.water * multiplier;
        if (effect.damage) {
          if (
            typeof effect.damage === "object" &&
            effect.damage.min &&
            effect.damage.max
          ) {
            player.damage = effect.damage;
          } else {
            player.damage = (player.damage || 0) + effect.damage;
          }
        }
      }
    });
  },

  syncEquipment: function (equipment) {
    this.equipmentSlots = equipment;
    const me = players.get(myId);
    if (me) {
      this.applyEquipmentEffects(me);
    }
    this.updateEquipmentDisplay(); // Обновит и урон

    // Проверяем, инициализирован ли интерфейс
    if (document.getElementById("equipmentGrid")) {
      this.updateEquipmentDisplay();
    } else {
      setTimeout(() => this.updateEquipmentDisplay(), 100);
    }
    updateStatsDisplay();
  },

  handleEquipFail: function (error) {
    if (!this.pendingEquip) return; // Нет pending — игнор

    const { slotIndex, item, slotName, oldItem } = this.pendingEquip; // freeSlot уже в pending

    // Revert: Вернуть item в inventory, очистить slot
    inventory[slotIndex] = item;
    this.equipmentSlots[slotName] = oldItem; // Вернуть oldItem если был

    // <-- НАЧАЛО ИЗМЕНЕНИЯ: Используем сохраненный freeSlot вместо findIndex
    if (oldItem) {
      const oldSlot = this.pendingEquip.freeSlot;
      if (oldSlot !== null) inventory[oldSlot] = null;
    }
    // <-- КОНЕЦ ИЗМЕНЕНИЯ

    // Переприменить эффекты и обновить UI
    const me = players.get(myId);
    if (me) {
      this.applyEquipmentEffects(me);
    }
    this.updateEquipmentDisplay();
    updateInventoryDisplay();
    updateStatsDisplay();

    // Показать ошибку
    alert(error);

    // Очистить pending
    this.pendingEquip = null;
  },

  handleUnequipFail: function (error) {
    if (!this.pendingUnequip) return;

    const { slotName, inventorySlot, item } = this.pendingUnequip;

    // Revert: Вернуть item в equipment, очистить inventory slot
    this.equipmentSlots[slotName] = item;
    inventory[inventorySlot] = null;

    // Переприменить эффекты
    const me = players.get(myId);
    if (me) {
      this.applyEquipmentEffects(me);
    }
    this.updateEquipmentDisplay();
    updateInventoryDisplay();
    updateStatsDisplay();

    alert(error);

    this.pendingUnequip = null;
  },
};

window.equipmentSystem = equipmentSystem;
