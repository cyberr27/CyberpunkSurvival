const equipmentSystem = {
  isEquipmentOpen: false,
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
    plasma_rifle: {
      type: "weapon",
      effect: { damage: 15 },
      description: "Плазменная винтовка: +15 урона",
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
  },

  initialize: function () {
    // Загружаем изображения
    this.EQUIPMENT_CONFIG.cyber_helmet.image.src = "cyber_helmet.png";
    this.EQUIPMENT_CONFIG.nano_armor.image.src = "nano_armor.png";
    this.EQUIPMENT_CONFIG.tactical_belt.image.src = "tactical_belt.png";
    this.EQUIPMENT_CONFIG.cyber_pants.image.src = "cyber_pants.png";
    this.EQUIPMENT_CONFIG.speed_boots.image.src = "speed_boots.png";
    this.EQUIPMENT_CONFIG.plasma_rifle.image.src = "plasma_rifle.png";
    this.EQUIPMENT_CONFIG.tech_gloves.image.src = "tech_gloves.png";

    // Создаем кнопку экипировки
    const equipmentBtn = document.createElement("button");
    equipmentBtn.id = "equipmentBtn";
    equipmentBtn.className = "cyber-btn";
    equipmentBtn.textContent = "Экипировка";
    equipmentBtn.style.position = "fixed";
    equipmentBtn.style.top = "110px";
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
    if (me && me.equipment) {
      this.equipmentSlots = me.equipment;
      this.updateEquipmentDisplay();
    }
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
      equipmentGrid.appendChild(slotEl);
    });
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

    // Проверяем, существует ли equipmentGrid
    if (!equipmentGrid || !screen) {
      console.warn(
        "equipmentGrid или equipmentScreen не найдены, откладываем обновление экипировки"
      );
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
  },

  equipItem: function (slotIndex) {
    const item = inventory[slotIndex];
    if (!item || !this.EQUIPMENT_CONFIG[item.type]) return;

    const me = players.get(myId);
    const slotName = this.EQUIPMENT_TYPES[item.type];
    if (!slotName) return;

    // Проверяем, есть ли уже предмет в слоте
    let oldItem = null;
    if (this.equipmentSlots[slotName]) {
      oldItem = this.equipmentSlots[slotName];
      // Возвращаем старый предмет в инвентарь
      const freeSlot = inventory.findIndex((slot) => slot === null);
      if (freeSlot === -1) {
        alert("Инвентарь полон! Освободите место.");
        return;
      }
      inventory[freeSlot] = oldItem;
    }

    // Экипируем новый предмет
    this.equipmentSlots[slotName] = { type: item.type, itemId: item.itemId };
    inventory[slotIndex] = null;

    // Обновляем характеристики игрока
    this.applyEquipmentEffects(me);

    // Отправляем на сервер
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "equipItem",
        slotIndex,
        equipment: this.equipmentSlots,
        health: me.health,
        energy: me.energy,
        food: me.food,
        water: me.water,
        armor: me.armor,
      })
    );

    // Обновляем отображение
    selectedSlot = null;
    document.getElementById("useBtn").disabled = true;
    document.getElementById("dropBtn").disabled = true;
    document.getElementById("inventoryScreen").textContent = "";
    updateStatsDisplay();
    updateInventoryDisplay();
    this.updateEquipmentDisplay();
  },

  applyEquipmentEffects: function (player) {
    // Сбрасываем текущие бонусы от экипировки
    player.armor = 0;
    player.maxStats.health = 100;
    player.maxStats.energy = 100;
    player.maxStats.food = 100;
    player.maxStats.water = 100;

    // Применяем эффекты от всех экипированных предметов
    Object.values(this.equipmentSlots).forEach((item) => {
      if (item && this.EQUIPMENT_CONFIG[item.type]) {
        const effect = this.EQUIPMENT_CONFIG[item.type].effect;
        if (effect.armor) player.armor += effect.armor;
        if (effect.health) player.maxStats.health += effect.health;
        if (effect.energy) player.maxStats.energy += effect.energy;
        if (effect.food) player.maxStats.food += effect.food;
        if (effect.water) player.maxStats.water += effect.water;
        if (effect.damage) player.damage = (player.damage || 0) + effect.damage;
      }
    });

    // Ограничиваем текущие характеристики
    player.health = Math.min(player.health, player.maxStats.health);
    player.energy = Math.min(player.energy, player.maxStats.energy);
    player.food = Math.min(player.food, player.maxStats.food);
    player.water = Math.min(player.water, player.maxStats.water);
  },

  syncEquipment: function (equipment) {
    this.equipmentSlots = equipment;
    const me = players.get(myId);
    this.applyEquipmentEffects(me);

    // Проверяем, инициализирован ли интерфейс
    if (document.getElementById("equipmentGrid")) {
      this.updateEquipmentDisplay();
    } else {
      // Откладываем обновление до полной инициализации
      setTimeout(() => this.updateEquipmentDisplay(), 100);
    }
    updateStatsDisplay();
  },
};

window.equipmentSystem = equipmentSystem;
