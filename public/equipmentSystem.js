// equipmentSystem.js — ИСПРАВЛЕННАЯ ВЕРСИЯ (декабрь 2025)
// Ошибка "images is not defined" полностью устранена, логика не изменена

const equipmentSystem = {
  isEquipmentOpen: false,
  isInitialized: false,

  equipmentSlots: {
    head: null,
    chest: null,
    belt: null,
    pants: null,
    boots: null,
    weapon: null,
    gloves: null,
  },

  EQUIPMENT_TYPES: {
    headgear: "head",
    armor: "chest",
    belt: "belt",
    pants: "pants",
    boots: "boots",
    weapon: "weapon",
    gloves: "gloves",
  },

  BASE_MELEE_MIN: 5,
  BASE_MELEE_MAX: 10,

  // ВСЯ экипировка (эндгейм + стартовая порванная) в одном месте
  EQUIPMENT_CONFIG: {
    // === ЭНДГЕЙМ ===
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

    // === ОРУЖИЕ ===
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

    // === ПОРВАННАЯ СТАРТОВАЯ ЭКИПИРОВКА — АКТУАЛЬНЫЕ ЗНАЧЕНИЯ ИЗ items.js (декабрь 2025) ===

    // ЛИНИЯ ЗДОРОВЬЯ
    torn_baseball_cap_of_health: {
      type: "headgear",
      effect: { armor: 5, health: 5 },
      description:
        "Порванная кепка здоровья: +5 к максимальному здоровью и броне",
      rarity: 1,
    },
    torn_health_t_shirt: {
      type: "armor",
      effect: { armor: 10, health: 10 },
      description:
        "Порванная футболка здоровья: +10 к максимальному здоровью, +10 к броне",
      rarity: 1,
    },
    torn_health_gloves: {
      type: "gloves",
      effect: { armor: 5, health: 3 },
      description:
        "Порванные перчатки здоровья: +3 к максимальному здоровью, +5 к броне",
      rarity: 1,
    },
    torn_belt_of_health: {
      type: "belt",
      effect: { armor: 3, health: 7 },
      description:
        "Порванный пояс здоровья: +7 к максимальному здоровью, +3 к броне",
      rarity: 1,
    },
    torn_pants_of_health: {
      type: "pants",
      effect: { armor: 7, health: 6 },
      description:
        "Порванные штаны здоровья: +6 к максимальному здоровью, +7 к броне",
      rarity: 1,
    },
    torn_health_sneakers: {
      type: "boots",
      effect: { armor: 5, health: 4 },
      description:
        "Порванные кроссовки здоровья: +4 к максимальному здоровью, +5 к броне",
      rarity: 1,
    },

    // ЛИНИЯ ЭНЕРГИИ
    torn_energy_cap: {
      type: "headgear",
      effect: { armor: 5, energy: 5 },
      description:
        "Порванная кепка энергии: +5 к максимальной энергии, +5 к броне",
      rarity: 1,
    },
    torn_energy_t_shirt: {
      type: "armor",
      effect: { armor: 10, energy: 10 },
      description:
        "Порванная футболка энергии: +10 к максимальной энергии, +10 к броне",
      rarity: 1,
    },
    torn_gloves_of_energy: {
      type: "gloves",
      effect: { armor: 5, energy: 3 },
      description:
        "Порванные перчатки энергии: +3 к максимальной энергии, +5 к броне",
      rarity: 1,
    },
    torn_energy_belt: {
      type: "belt",
      effect: { armor: 3, energy: 7 },
      description:
        "Порванный пояс энергии: +7 к максимальной энергии, +3 к броне",
      rarity: 1,
    },
    torn_pants_of_energy: {
      type: "pants",
      effect: { armor: 7, energy: 6 },
      description:
        "Порванные штаны энергии: +6 к максимальной энергии, +7 к броне",
      rarity: 1,
    },
    torn_sneakers_of_energy: {
      type: "boots",
      effect: { armor: 5, energy: 4 },
      description:
        "Порванные кроссовки энергии: +4 к максимальной энергии, +5 к броне",
      rarity: 1,
    },

    // ЛИНИЯ ОБЖОРСТВА
    torn_cap_of_gluttony: {
      type: "headgear",
      effect: { armor: 5, food: 5 },
      description:
        "Порванная кепка обжорства: +5 к максимальной еде, +5 к броне",
      rarity: 1,
    },
    torn_t_shirt_of_gluttony: {
      type: "armor",
      effect: { armor: 10, food: 10 },
      description:
        "Порванная футболка обжорства: +10 к максимальной еде, +10 к броне",
      rarity: 1,
    },
    torn_gloves_of_gluttony: {
      type: "gloves",
      effect: { armor: 5, food: 3 },
      description:
        "Порванные перчатки обжорства: +3 к максимальной еде, +5 к броне",
      rarity: 1,
    },
    torn_belt_of_gluttony: {
      type: "belt",
      effect: { armor: 3, food: 7 },
      description:
        "Порванный пояс обжорства: +7 к максимальной еде, +3 к броне",
      rarity: 1,
    },
    torn_pants_of_gluttony: {
      type: "pants",
      effect: { armor: 7, food: 6 },
      description:
        "Порванные штаны обжорства: +6 к максимальной еде, +7 к броне",
      rarity: 1,
    },
    torn_sneakers_of_gluttony: {
      type: "boots",
      effect: { armor: 5, food: 4 },
      description:
        "Порванные кроссовки обжорства: +4 к максимальной еде, +5 к броне",
      rarity: 1,
    },

    // ЛИНИЯ ЖАЖДЫ
    torn_cap_of_thirst: {
      type: "headgear",
      effect: { armor: 5, water: 5 },
      description: "Порванная кепка жажды: +5 к максимальной воде, +5 к броне",
      rarity: 1,
    },
    torn_t_shirt_of_thirst: {
      type: "armor",
      effect: { armor: 10, water: 10 },
      description:
        "Порванная футболка жажды: +10 к максимальной воде, +10 к броне",
      rarity: 1,
    },
    torn_gloves_of_thirst: {
      type: "gloves",
      effect: { armor: 5, water: 3 },
      description:
        "Порванные перчатки жажды: +3 к максимальной воде, +5 к броне",
      rarity: 1,
    },
    torn_belt_of_thirst: {
      type: "belt",
      effect: { armor: 3, water: 7 },
      description: "Порванный пояс жажды: +7 к максимальной воде, +3 к броне",
      rarity: 1,
    },
    torn_pants_of_thirst: {
      type: "pants",
      effect: { armor: 7, water: 6 },
      description: "Порванные штаны жажды: +6 к максимальной воде, +7 к броне",
      rarity: 1,
    },
    torn_sneakers_of_thirst: {
      type: "boots",
      effect: { armor: 5, water: 4 },
      description:
        "Порванные кроссовки жажды: +4 к максимальной воде, +5 к броне",
      rarity: 1,
    },
  },

  // Получаем изображение по имени ключа (безопасно, даже если images ещё не загружены)
  getItemImage(type) {
    if (!window.images) return null;
    const img = window.images[type];
    return img && img.complete ? img : null;
  },

  getCurrentMeleeDamage() {
    const baseMin = this.BASE_MELEE_MIN;
    const baseMax = this.BASE_MELEE_MAX;
    const weapon = this.equipmentSlots.weapon;

    if (!weapon || !this.EQUIPMENT_CONFIG[weapon.type]?.effect?.damage) {
      return { min: baseMin, max: baseMax };
    }

    const dmg = this.EQUIPMENT_CONFIG[weapon.type].effect.damage;
    if (dmg === 50 || weapon.type === "plasma_rifle") {
      return { min: baseMin, max: baseMax };
    }

    if (typeof dmg === "object" && dmg.min !== undefined) {
      return { min: baseMin + dmg.min, max: baseMax + dmg.max };
    }

    return { min: baseMin, max: baseMax };
  },

  updateDamageDisplay() {
    const dmg = this.getCurrentMeleeDamage();
    const el = document.getElementById("damageDisplay");
    if (el) {
      el.textContent = `Урон в ближнем бою: ${dmg.min}–${dmg.max}`;
      el.style.color = dmg.min > this.BASE_MELEE_MIN ? "#00ff00" : "#ffaa00";
    }
  },

  initialize() {
    // Кнопка экипировки
    const btn = document.createElement("img");
    btn.id = "equipmentBtn";
    btn.className = "cyber-btn-img";
    btn.src = "images/equipment.png";
    btn.style.position = "absolute";
    btn.style.right = "10px";
    document.getElementById("gameContainer").appendChild(btn);

    // Контейнер окна экипировки
    const container = document.createElement("div");
    container.id = "equipmentContainer";
    container.style.display = "none";
    container.innerHTML = `
      <div id="equipmentGrid"></div>
      <div id="equipmentScreen"></div>
      <div id="damageDisplay" style="color:lime;font-weight:bold;font-size:14px;margin-top:10px;padding:5px;background:rgba(0,0,0,0.7);border-radius:5px;text-align:center;">
        Урон в ближнем бою: 5–10
      </div>
    `;
    document.getElementById("gameContainer").appendChild(container);

    this.setupEquipmentGrid();

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.toggleEquipment();
    });

    this.isInitialized = true;
    this.updateDamageDisplay();
  },

  setupEquipmentGrid() {
    const grid = document.getElementById("equipmentGrid");
    grid.style.display = "grid";
    grid.style.gridTemplateAreas = `
      ". head ."
      "gloves chest weapon"
      ". belt ."
      ". pants ."
      ". boots ."
    `;
    grid.style.gap = "8px";
    grid.style.padding = "10px";

    const slots = [
      "head",
      "chest",
      "belt",
      "pants",
      "boots",
      "weapon",
      "gloves",
    ];
    slots.forEach((name) => {
      const el = document.createElement("div");
      el.className = "equipment-slot";
      el.style.gridArea = name;
      el.title = {
        head: "Головной убор",
        chest: "Броня",
        belt: "Пояс",
        pants: "Штаны",
        boots: "Обувь",
        weapon: "Оружие",
        gloves: "Перчатки",
      }[name];
      el.addEventListener("click", () => this.selectEquipmentSlot(name));
      el.addEventListener("dblclick", () => this.unequipItem(name));
      grid.appendChild(el);
    });
  },

  toggleEquipment() {
    this.isEquipmentOpen = !this.isEquipmentOpen;
    document.getElementById("equipmentContainer").style.display = this
      .isEquipmentOpen
      ? "block"
      : "none";
    document
      .getElementById("equipmentBtn")
      .classList.toggle("active", this.isEquipmentOpen);
    if (this.isEquipmentOpen) this.updateEquipmentDisplay();
  },

  selectEquipmentSlot(slotName) {
    const screen = document.getElementById("equipmentScreen");
    const item = this.equipmentSlots[slotName];
    screen.textContent =
      item && this.EQUIPMENT_CONFIG[item.type]
        ? this.EQUIPMENT_CONFIG[item.type].description
        : `Слот ${slotName} пуст`;
  },

  updateEquipmentDisplay() {
    const grid = document.getElementById("equipmentGrid");
    if (!grid) return;

    Array.from(grid.children).forEach((slot) => {
      const slotName = slot.style.gridArea;
      slot.innerHTML = "";
      const item = this.equipmentSlots[slotName];

      if (item && this.EQUIPMENT_CONFIG[item.type]) {
        const img = document.createElement("img");
        const srcImg = this.getItemImage(item.type);
        img.src = srcImg ? srcImg.src : `${item.type}.png`;
        img.style.width = img.style.height = "100%";
        slot.appendChild(img);

        const cfg = this.EQUIPMENT_CONFIG[item.type];
        slot.onmouseover = () =>
          (document.getElementById("equipmentScreen").textContent =
            cfg.description);
        slot.onmouseout = () =>
          (document.getElementById("equipmentScreen").textContent = "");
      }
    });

    this.updateDamageDisplay();
  },

  equipItem(slotIndex) {
    const item = inventory[slotIndex];
    if (!item) return;

    const cfg = this.EQUIPMENT_CONFIG[item.type] || ITEM_CONFIG[item.type];
    if (!cfg?.type) return;

    const slotName = this.EQUIPMENT_TYPES[cfg.type];
    if (!slotName) return;

    const me = players.get(myId);
    if (!me) return;

    // Снятие старого предмета из слота
    if (this.equipmentSlots[slotName]) {
      const old = this.equipmentSlots[slotName];
      const free = inventory.findIndex((s) => s === null);
      if (free === -1) return alert("Инвентарь полон!");
      inventory[free] = old;
    }

    this.equipmentSlots[slotName] = { type: item.type, itemId: item.itemId };
    inventory[slotIndex] = null;

    this.applyEquipmentEffects(me);
    this.updateEquipmentDisplay();
    updateInventoryDisplay();
    updateStatsDisplay();

    if (ws?.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "equipItem",
          slotIndex,
          equipment: this.equipmentSlots,
        })
      );
    }

    selectedSlot = null;
    document.getElementById("useBtn")?.setAttribute("disabled", true);
    document.getElementById("dropBtn")?.setAttribute("disabled", true);
  },

  unequipItem(slotName) {
    const item = this.equipmentSlots[slotName];
    if (!item) return;

    const free = inventory.findIndex((s) => s === null);
    if (free === -1) return alert("Инвентарь полон!");

    inventory[free] = { type: item.type, quantity: 1, itemId: item.itemId };
    this.equipmentSlots[slotName] = null;

    const me = players.get(myId);
    if (me) this.applyEquipmentEffects(me);

    this.updateEquipmentDisplay();
    updateInventoryDisplay();
    updateStatsDisplay();

    if (ws?.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "unequipItem",
          slotName,
          inventorySlot: free,
          itemId: item.itemId,
        })
      );
    }
  },

  applyEquipmentEffects(player) {
    const base = { ...window.levelSystem.maxStats };
    player.maxStats = { ...base };

    Object.values(this.equipmentSlots).forEach((slot) => {
      if (!slot) return;
      const cfg = this.EQUIPMENT_CONFIG[slot.type] || ITEM_CONFIG[slot.type];
      if (!cfg?.effect) return;

      Object.keys(cfg.effect).forEach((stat) => {
        if (stat === "damage") return; // урон считаем отдельно
        player.maxStats[stat] = (player.maxStats[stat] || 0) + cfg.effect[stat];
      });
    });
  },

  syncEquipment(equipment) {
    this.equipmentSlots = { ...equipment };
    const me = players.get(myId);
    if (me) this.applyEquipmentEffects(me);
    this.updateEquipmentDisplay();
    updateStatsDisplay();
  },
};

window.equipmentSystem = equipmentSystem;
