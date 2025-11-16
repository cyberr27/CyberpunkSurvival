// equipmentSystem.js

const equipmentSystem = {
  isEquipmentOpen: false,
  isInitialized: false, // ИСПРАВЛЕНИЕ: Добавь этот флаг
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

  // Конфигурация предметов экипировки
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
      effect: { damage: 15, range: 500 },
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
  },

  initialize: function () {
    // Загружаем изображения
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

    // Создаем изображение для кнопки экипировки
    const equipmentBtn = document.createElement("img");
    equipmentBtn.id = "equipmentBtn";
    equipmentBtn.className = "cyber-btn-img";
    equipmentBtn.src = "images/equipment.png";
    equipmentBtn.alt = "Equipment";
    equipmentBtn.style.position = "absolute";
    equipmentBtn.style.right = "10px";
    document.getElementById("gameContainer").appendChild(equipmentBtn);

    // Создаем контейнер экипировки
    const equipmentContainer = document.createElement("div");
    equipmentContainer.id = "equipmentContainer";
    equipmentContainer.style.display = "none";
    equipmentContainer.innerHTML = `
    <div id="equipmentGrid"></div>
    <div id="equipmentScreen"></div>
  `;

    equipmentContainer.innerHTML = `
  <div id="equipmentGrid"></div>
  <div id="equipmentScreen"></div>
  <div id="damageDisplay" style="color: red; font-size: 14px; padding: 5px;"></div>  // Новый div для урона
`;

    document.getElementById("gameContainer").appendChild(equipmentContainer);

    // Создаем ячейки экипировки
    this.setupEquipmentGrid();

    // Обработчик кнопки
    equipmentBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.toggleEquipment();
    });

    // Синхронизация экипировки при загрузке
    const me = players.get(myId);

    this.isInitialized = true; // Устанавливаем флаг инициализации
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

    // Обновляем отображение экипировки
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
      this.updateEquipmentDisplay();
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
        const img = document.createElement("img");
        img.src = this.EQUIPMENT_CONFIG[item.type].image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        slot.appendChild(img);

        slot.onmouseover = () => {
          screen.textContent = this.EQUIPMENT_CONFIG[item.type].description;
        };
        slot.onmouseout = () => {
          screen.textContent = "";
        };
      } else {
        slot.onmouseover = null;
        slot.onmouseout = null;
      }
    }
    const damageDisplay = document.getElementById("damageDisplay");
    if (damageDisplay) {
      const me = players.get(myId);
      if (me && me.damage) {
        let damageText;
        if (typeof me.damage === "object" && me.damage.min && me.damage.max) {
          damageText = `${me.damage.min} - ${me.damage.max}`;
        } else {
          damageText = `${me.damage}`;
        }
        damageDisplay.textContent = `Урон: ${damageText}`;
      } else {
        damageDisplay.textContent = `Урон: 5 - 10`; // Fallback
      }
    }
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
    this.updateEquipmentDisplay();

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
    this.updateEquipmentDisplay();
  },

  applyEquipmentEffects: function (player) {
    // Базовые значения из levelSystem
    const baseMaxStats = { ...window.levelSystem.maxStats };

    // Сбрасываем maxStats и урон
    player.maxStats = { ...baseMaxStats };
    player.damage = { min: 5, max: 10 }; // Базовый урон по умолчанию (melee-style)

    // Применяем эффекты экипировки
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
            player.damage = {
              min: player.damage.min + effect.damage.min,
              max: player.damage.max + effect.damage.max,
            };
          } else {
            player.damage = effect.damage; // Для ranged: перезаписываем как число (сила выстрела)
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
    this.updateEquipmentDisplay();

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
