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
    const baseMin = this.BASE_MELEE_MIN;
    const baseMax = this.BASE_MELEE_MAX;
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
        dmg.min > this.BASE_MELEE_MIN ? "lime" : "#ffaa00"; // Ярко-зелёный если улучшено
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
      rarity: 1,
      image: new Image(),
    },
    torn_health_t_shirt: {
      type: "armor",
      effect: { armor: 10, health: 10 },
      description:
        "Порванная футболка здоровья: +10 к максимальному здоровью, +10 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_health_gloves: {
      type: "gloves",
      effect: { armor: 5, health: 3 },
      description:
        "Порванные перчатки здоровья: +3 к максимальному здоровью, +5 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_belt_of_health: {
      type: "belt",
      effect: { armor: 3, health: 7 },
      description:
        "Порванный пояс здоровья: +7 к максимальному здоровью, +3 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_pants_of_health: {
      type: "pants",
      effect: { armor: 7, health: 6 },
      description:
        "Порванные штаны здоровья: +6 к максимальному здоровью, +7 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_health_sneakers: {
      type: "boots",
      effect: { armor: 5, health: 4 },
      description:
        "Порванные кроссовки здоровья: +4 к максимальному здоровью, +5 к броне",
      rarity: 1,
      image: new Image(),
    },

    torn_energy_cap: {
      type: "headgear",
      effect: { armor: 5, energy: 5 },
      description:
        "Порванная кепка энергии: +5 к максимальной энергии, +5 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_energy_t_shirt: {
      type: "armor",
      effect: { armor: 10, energy: 10 },
      description:
        "Порванная футболка энергии: +10 к максимальной энергии, +10 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_gloves_of_energy: {
      type: "gloves",
      effect: { armor: 5, energy: 3 },
      description:
        "Порванные перчатки энергии: +3 к максимальной энергии, +5 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_energy_belt: {
      type: "belt",
      effect: { armor: 3, energy: 7 },
      description:
        "Порванный пояс энергии: +7 к максимальной энергии, +3 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_pants_of_energy: {
      type: "pants",
      effect: { armor: 7, energy: 6 },
      description:
        "Порванные штаны энергии: +6 к максимальной энергии, +7 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_sneakers_of_energy: {
      type: "boots",
      effect: { armor: 5, energy: 4 },
      description:
        "Порванные кроссовки энергии: +4 к максимальной энергии, +5 к броне",
      rarity: 1,
      image: new Image(),
    },

    torn_cap_of_gluttony: {
      type: "headgear",
      effect: { armor: 5, food: 5 },
      description:
        "Порванная кепка обжорства: +5 к максимальной еде, +5 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_t_shirt_of_gluttony: {
      type: "armor",
      effect: { armor: 10, food: 10 },
      description:
        "Порванная футболка обжорства: +10 к максимальной еде, +10 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_gloves_of_gluttony: {
      type: "gloves",
      effect: { armor: 5, food: 3 },
      description:
        "Порванные перчатки обжорства: +3 к максимальной еде, +5 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_belt_of_gluttony: {
      type: "belt",
      effect: { armor: 3, food: 7 },
      description:
        "Порванный пояс обжорства: +7 к максимальной еде, +3 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_pants_of_gluttony: {
      type: "pants",
      effect: { armor: 7, food: 6 },
      description:
        "Порванные штаны обжорства: +6 к максимальной еде, +7 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_sneakers_of_gluttony: {
      type: "boots",
      effect: { armor: 5, food: 4 },
      description:
        "Порванные кроссовки обжорства: +4 к максимальной еде, +5 к броне",
      rarity: 1,
      image: new Image(),
    },

    torn_cap_of_thirst: {
      type: "headgear",
      effect: { armor: 5, water: 5 },
      description: "Порванная кепка жажды: +5 к максимальной воде, +5 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_t_shirt_of_thirst: {
      type: "armor",
      effect: { armor: 10, water: 10 },
      description:
        "Порванная футболка жажды: +10 к максимальной воде, +10 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_gloves_of_thirst: {
      type: "gloves",
      effect: { armor: 5, water: 3 },
      description:
        "Порванные перчатки жажды: +3 к максимальной воде, +5 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_belt_of_thirst: {
      type: "belt",
      effect: { armor: 3, water: 7 },
      description: "Порванный пояс жажды: +7 к максимальной воде, +3 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_pants_of_thirst: {
      type: "pants",
      effect: { armor: 7, water: 6 },
      description: "Порванные штаны жажды: +6 к максимальной воде, +7 к броне",
      rarity: 1,
      image: new Image(),
    },
    torn_sneakers_of_thirst: {
      type: "boots",
      effect: { armor: 5, water: 4 },
      description:
        "Порванные кроссовки жажды: +4 к максимальной воде, +5 к броне",
      rarity: 1,
      image: new Image(),
    },
  },

  initialize: function () {
    // Загружаем изображения (БЕЗ ИЗМЕНЕНИЙ)
    this.EQUIPMENT_CONFIG.cyber_helmet.image.src = "cyber_helmet.png";
    this.EQUIPMENT_CONFIG.nano_armor.image.src = "nano_armor.png";
    this.EQUIPMENT_CONFIG.tactical_belt.image.src = "tactical_belt.png";
    this.EQUIPMENT_CONFIG.cyber_pants.image.src = "cyber_pants.png";
    this.EQUIPMENT_CONFIG.speed_boots.image.src = "speed_boots.png";
    this.EQUIPMENT_CONFIG.tech_gloves.image.src = "tech_gloves.png";
    this.EQUIPMENT_CONFIG.plasma_rifle.image.src = "plasma_rifle.png";
    this.EQUIPMENT_CONFIG.knuckles.image.src = "knuckles.png";
    this.EQUIPMENT_CONFIG.knife.image.src = "knife.png";
    this.EQUIPMENT_CONFIG.bat.image.src = "bat.png";

    // Добавляем src для torn_ предметов
    this.EQUIPMENT_CONFIG.torn_baseball_cap_of_health.image.src =
      "torn_baseball_cap_of_health.png";
    this.EQUIPMENT_CONFIG.torn_health_t_shirt.image.src =
      "torn_health_t_shirt.png";
    this.EQUIPMENT_CONFIG.torn_health_gloves.image.src =
      "torn_health_gloves.png";
    this.EQUIPMENT_CONFIG.torn_belt_of_health.image.src =
      "torn_belt_of_health.png";
    this.EQUIPMENT_CONFIG.torn_pants_of_health.image.src =
      "torn_pants_of_health.png";
    this.EQUIPMENT_CONFIG.torn_health_sneakers.image.src =
      "torn_health_sneakers.png";
    this.EQUIPMENT_CONFIG.torn_energy_cap.image.src = "torn_energy_cap.png";
    this.EQUIPMENT_CONFIG.torn_energy_t_shirt.image.src =
      "torn_energy_t_shirt.png";
    this.EQUIPMENT_CONFIG.torn_gloves_of_energy.image.src =
      "torn_gloves_of_energy.png";
    this.EQUIPMENT_CONFIG.torn_energy_belt.image.src = "torn_energy_belt.png";
    this.EQUIPMENT_CONFIG.torn_pants_of_energy.image.src =
      "torn_pants_of_energy.png";
    this.EQUIPMENT_CONFIG.torn_sneakers_of_energy.image.src =
      "torn_sneakers_of_energy.png";
    this.EQUIPMENT_CONFIG.torn_cap_of_gluttony.image.src =
      "torn_cap_of_gluttony.png";
    this.EQUIPMENT_CONFIG.torn_t_shirt_of_gluttony.image.src =
      "torn_t_shirt_of_gluttony.png";
    this.EQUIPMENT_CONFIG.torn_gloves_of_gluttony.image.src =
      "torn_gloves_of_gluttony.png";
    this.EQUIPMENT_CONFIG.torn_belt_of_gluttony.image.src =
      "torn_belt_of_gluttony.png";
    this.EQUIPMENT_CONFIG.torn_pants_of_gluttony.image.src =
      "torn_pants_of_gluttony.png";
    this.EQUIPMENT_CONFIG.torn_sneakers_of_gluttony.image.src =
      "torn_sneakers_of_gluttony.png";
    this.EQUIPMENT_CONFIG.torn_cap_of_thirst.image.src =
      "torn_cap_of_thirst.png";
    this.EQUIPMENT_CONFIG.torn_t_shirt_of_thirst.image.src =
      "torn_t_shirt_of_thirst.png";
    this.EQUIPMENT_CONFIG.torn_gloves_of_thirst.image.src =
      "torn_gloves_of_thirst.png";
    this.EQUIPMENT_CONFIG.torn_belt_of_thirst.image.src =
      "torn_belt_of_thirst.png";
    this.EQUIPMENT_CONFIG.torn_pants_of_thirst.image.src =
      "torn_pants_of_thirst.png";
    this.EQUIPMENT_CONFIG.torn_sneakers_of_thirst.image.src =
      "torn_sneakers_of_thirst.png";

    // Создаем изображение для кнопки экипировки (БЕЗ ИЗМЕНЕНИЙ)
    const equipmentBtn = document.createElement("img");
    equipmentBtn.id = "equipmentBtn";
    equipmentBtn.className = "cyber-btn-img";
    equipmentBtn.src = "images/equipment.png";
    equipmentBtn.alt = "Equipment";
    equipmentBtn.style.position = "absolute";
    equipmentBtn.style.right = "10px";
    document.getElementById("gameContainer").appendChild(equipmentBtn);

    // ИЗМЕНЁННЫЙ HTML: ДОБАВЛЕН #damageDisplay
    const equipmentContainer = document.createElement("div");
    equipmentContainer.id = "equipmentContainer";
    equipmentContainer.style.display = "none";
    equipmentContainer.innerHTML = `
      <div id="equipmentGrid"></div>
      <div id="equipmentScreen"></div>
      <div id="damageDisplay" style="color: lime; font-weight: bold; font-size: 14px; margin-top: 10px; padding: 5px; background: rgba(0,0,0,0.7); border-radius: 5px; text-align: center;">Урон: 5-10</div>
    `;
    document.getElementById("gameContainer").appendChild(equipmentContainer);

    // Создаем ячейки экипировки (БЕЗ ИЗМЕНЕНИЙ)
    this.setupEquipmentGrid();

    // Обработчик кнопки
    equipmentBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.toggleEquipment();
    });

    // Синхронизация экипировки при загрузке
    const me = players.get(myId);

    this.isInitialized = true; // Устанавливаем флаг инициализации

    // ИНИЦИАЛИЗАЦИЯ ОТОБРАЖЕНИЯ УРОНА
    this.updateDamageDisplay();
  },

  setupEquipmentGrid: function () {
    const equipmentGrid = document.getElementById("equipmentGrid");
    equipmentGrid.style.display = "grid";
    equipmentGrid.style.gridTemplateAreas = `
        ". head ."
        "gloves chest weapon"
        ". belt ."
        ". pants ."
        ". boots ."
      `;
    equipmentGrid.style.gap = "8px";
    equipmentGrid.style.padding = "10px";

    const slots = [
      { name: "head", label: "Головной убор" },
      { name: "chest", label: "Броня" },
      { name: "belt", label: "Пояс" },
      { name: "pants", label: "Штаны" },
      { name: "boots", label: "Обувь" },
      { name: "weapon", label: "Оружие" },
      { name: "gloves", label: "Перчатки" },
    ];

    slots.forEach((slot) => {
      const slotEl = document.createElement("div");
      slotEl.className = "equipment-slot";
      slotEl.style.gridArea = slot.name;
      slotEl.title = slot.label;
      slotEl.addEventListener("click", () =>
        this.selectEquipmentSlot(slot.name)
      );
      slotEl.addEventListener("dblclick", () => {
        this.unequipItem(slot.name);
      });
      equipmentGrid.appendChild(slotEl);
    });
  },

  unequipItem: function (slotName) {
    const me = players.get(myId);
    const item = this.equipmentSlots[slotName];
    if (!item) {
      return;
    }

    if (!me || !me.inventory) {
      return;
    }

    // Ищем свободный слот в инвентаре
    const freeSlot = me.inventory.findIndex((slot) => slot === null);
    if (freeSlot === -1) {
      alert("Инвентарь полон! Освободите место.");
      return;
    }

    // Перемещаем предмет в инвентарь (с учётом quantity для stackable)
    const isStackable = ITEM_CONFIG[item.type]?.stackable;
    me.inventory[freeSlot] = {
      type: item.type,
      quantity: isStackable ? item.quantity || 1 : 1,
      itemId: item.itemId, // Сохраняем itemId для синхронизации с сервером
    };
    this.equipmentSlots[slotName] = null;

    // Синхронизируем глобальную inventory с me.inventory
    inventory = me.inventory.map((slot) => (slot ? { ...slot } : null));
    players.set(myId, me);

    // Применяем эффекты экипировки после снятия
    this.applyEquipmentEffects(me);

    // Проверяем, инициализирован ли интерфейс инвентаря
    const inventoryGrid = document.getElementById("inventoryGrid");
    if (inventoryGrid) {
      updateInventoryDisplay();
    } else {
      setTimeout(() => {
        if (document.getElementById("inventoryGrid")) {
          updateInventoryDisplay();
        }
      }, 100);
    }

    // Обновляем отображение экипировки И УРОНА
    this.updateEquipmentDisplay();

    // Обновляем статы
    updateStatsDisplay();

    // Отправляем обновление на сервер
    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "unequipItem",
          slotName,
          inventorySlot: freeSlot,
          itemId: item.itemId,
        })
      );
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "updateInventory",
          inventory: me.inventory,
        })
      );
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "updateEquipment",
          equipment: this.equipmentSlots,
        })
      );
    }
  },

  toggleEquipment: function () {
    this.isEquipmentOpen = !this.isEquipmentOpen;
    const equipmentContainer = document.getElementById("equipmentContainer");
    equipmentContainer.style.display = this.isEquipmentOpen ? "block" : "none";
    const equipmentBtn = document.getElementById("equipmentBtn");
    equipmentBtn.classList.toggle("active", this.isEquipmentOpen);

    if (this.isEquipmentOpen) {
      this.updateEquipmentDisplay(); // Обновляет и урон
    } else {
      document.getElementById("equipmentScreen").innerHTML = "";
    }
  },

  selectEquipmentSlot: function (slotName) {
    const screen = document.getElementById("equipmentScreen");
    if (this.equipmentSlots[slotName]) {
      screen.textContent =
        this.EQUIPMENT_CONFIG[this.equipmentSlots[slotName].type].description;
    } else {
      screen.textContent = `Слот ${slotName} пуст`;
    }
  },

  // ИЗМЕНЁННО: В КОНЦЕ ОБНОВЛЯЕТ УРОН
  updateEquipmentDisplay: function () {
    const equipmentGrid = document.getElementById("equipmentGrid");
    const screen = document.getElementById("equipmentScreen");

    if (!equipmentGrid || !screen) {
      return;
    }

    const slots = equipmentGrid.children;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const slotName = slot.style.gridArea;
      slot.innerHTML = "";

      if (this.equipmentSlots[slotName]) {
        const item = this.equipmentSlots[slotName];
        const config = this.EQUIPMENT_CONFIG[item.type];
        if (!config || !config.image || !config.image.src) {
          // Заглушка на случай отсутствия конфига или изображения
          const placeholder = document.createElement("div");
          placeholder.style.width = "100%";
          placeholder.style.height = "100%";
          placeholder.style.backgroundColor = "gray";
          slot.appendChild(placeholder);
          continue;
        }
        const img = document.createElement("img");
        img.src = config.image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        slot.appendChild(img);

        slot.onmouseover = () => {
          const currentItem = this.equipmentSlots[slotName];
          if (currentItem && this.EQUIPMENT_CONFIG[currentItem.type]) {
            screen.textContent =
              this.EQUIPMENT_CONFIG[currentItem.type].description;
          }
        };
        slot.onmouseout = () => {
          screen.textContent = "";
        };
      } else {
        slot.onmouseover = null;
        slot.onmouseout = null;
      }
    }

    // ДОБАВЛЕНО: ДИНАМИЧЕСКОЕ ОБНОВЛЕНИЕ УРОНА
    this.updateDamageDisplay();
  },

  equipItem: function (slotIndex) {
    const item = inventory[slotIndex];
    if (!item || !this.EQUIPMENT_CONFIG[item.type]) {
      return;
    }

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
    if (this.equipmentSlots[slotName]) {
      oldItem = this.equipmentSlots[slotName];
      const freeSlot = inventory.findIndex((slot) => slot === null);
      if (freeSlot === -1) {
        alert("Инвентарь полон! Освободите место.");
        return;
      }
      inventory[freeSlot] = oldItem;
    }

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

  applyEquipmentEffects: function (player) {
    // Базовые значения из levelSystem
    const baseMaxStats = { ...window.levelSystem.maxStats };

    // Сбрасываем maxStats и урон
    player.maxStats = { ...baseMaxStats };
    player.damage = 0;

    // Применяем эффекты экипировки (БЕЗ ИЗМЕНЕНИЙ ДЛЯ ЭФФЕКТОВ, Т.К. УРОН МЕЛЕЕ РАСЧЁТ В GETCURRENTMELEEDAMAGE)
    Object.values(this.equipmentSlots).forEach((item) => {
      if (item && this.EQUIPMENT_CONFIG[item.type]) {
        const effect = this.EQUIPMENT_CONFIG[item.type].effect;
        if (effect.armor) player.maxStats.armor += effect.armor;
        if (effect.health) player.maxStats.health += effect.health;
        if (effect.energy) player.maxStats.energy += effect.energy;
        if (effect.food) player.maxStats.food += effect.food;
        if (effect.water) player.maxStats.water += effect.water;
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
};

window.equipmentSystem = equipmentSystem;
