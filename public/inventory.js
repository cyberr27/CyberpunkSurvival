(function () {
  // Загрузка изображений для предметов
  const energyDrinkImage = new Image();
  energyDrinkImage.src = "energy_drink.png";
  const nutImage = new Image();
  nutImage.src = "nut.png";
  const waterBottleImage = new Image();
  waterBottleImage.src = "water_bottle.png";
  const appleImage = new Image();
  appleImage.src = "apple.png";
  const berriesImage = new Image();
  berriesImage.src = "berries.png";
  const carrotImage = new Image();
  carrotImage.src = "carrot.png";
  const cannedMeatImage = new Image();
  cannedMeatImage.src = "canned_meat.png";
  const mushroomImage = new Image();
  mushroomImage.src = "mushroom.png";
  const sausageImage = new Image();
  sausageImage.src = "sausage.png";
  const bloodPackImage = new Image();
  bloodPackImage.src = "blood_pack.png";
  const breadImage = new Image();
  breadImage.src = "bread.png";
  const vodkaBottleImage = new Image();
  vodkaBottleImage.src = "vodka_bottle.png";
  const meatChunkImage = new Image();
  meatChunkImage.src = "meat_chunk.png";
  const bloodSyringeImage = new Image();
  bloodSyringeImage.src = "blood_syringe.png";
  const milkImage = new Image();
  milkImage.src = "milk.png";
  const condensedMilkImage = new Image();
  condensedMilkImage.src = "condensed_milk.png";
  const driedFishImage = new Image();
  driedFishImage.src = "dried_fish.png";
  const balyaryImage = new Image();
  balyaryImage.src = "balyary.png";

  // Определение ITEM_CONFIG
  const ITEM_CONFIG = {
    energy_drink: {
      effect: { energy: 20, water: 5 },
      image: energyDrinkImage,
      description: "Энергетик: +20 энергии, +5 воды.",
      rarity: 2,
    },
    nut: {
      effect: { food: 7 },
      image: nutImage,
      description: "Орех: +7 еды.",
      rarity: 3,
    },
    water_bottle: {
      effect: { water: 30 },
      image: waterBottleImage,
      description: "Вода: +30 воды.",
      rarity: 3,
    },
    apple: {
      effect: { food: 8, water: 5 },
      image: appleImage,
      description: "Яблоко: +8 еды, +5 воды.",
      rarity: 3,
    },
    berries: {
      effect: { food: 6, water: 6 },
      image: berriesImage,
      description: "Ягоды: +6 еды, +6 воды.",
      rarity: 3,
    },
    carrot: {
      effect: { food: 5, energy: 3 },
      image: carrotImage,
      description: "Морковь: +5 еды, +3 энергии.",
      rarity: 3,
    },
    canned_meat: {
      effect: { food: 20 },
      image: cannedMeatImage,
      description: "Банка тушёнки: +20 еды.",
      rarity: 1,
    },
    mushroom: {
      effect: { food: 5, energy: 15 },
      image: mushroomImage,
      description: "Гриб прущий: +15 энергии, +5 еды.",
      rarity: 1,
    },
    sausage: {
      effect: { food: 16, energy: 3 },
      image: sausageImage,
      description: "Колбаса: +16 еды, +3 энергии.",
      rarity: 2,
    },
    blood_pack: {
      effect: { health: 40 },
      image: bloodPackImage,
      description: "Пакет крови: +40 здоровья.",
      rarity: 1,
    },
    bread: {
      effect: { food: 13, water: -2 },
      image: breadImage,
      description: "Хлеб: +13 еды, -2 воды.",
      rarity: 2,
    },
    vodka_bottle: {
      effect: { health: 5, energy: -2, water: 1, food: 2 },
      image: vodkaBottleImage,
      description: "Водка: +5 здоровья, -2 энергии, +1 воды, +2 еды.",
      rarity: 2,
    },
    meat_chunk: {
      effect: { food: 20, energy: 5, water: -2 },
      image: meatChunkImage,
      description: "Кусок мяса: +20 еды, +5 энергии, -2 воды.",
      rarity: 2,
    },
    blood_syringe: {
      effect: { health: 10 },
      image: bloodSyringeImage,
      description: "Шприц с кровью: +10 здоровья.",
      rarity: 2,
    },
    milk: {
      effect: { water: 15, food: 5 },
      image: milkImage,
      description: "Молоко: +15 воды, +5 еды.",
      rarity: 2,
    },
    condensed_milk: {
      effect: { water: 5, food: 11, energy: 2 },
      image: condensedMilkImage,
      description: "Сгущёнка: +11 еды, +5 воды, +2 энергии.",
      rarity: 2,
    },
    dried_fish: {
      effect: { food: 10, water: -3 },
      image: driedFishImage,
      description: "Сушёная рыба: +10 еды, -3 воды.",
      rarity: 2,
    },
    balyary: {
      effect: {},
      image: balyaryImage,
      description: "Баляр: игровая валюта.",
      stackable: true,
      rarity: 2,
    },
  };

  window.ITEM_CONFIG = ITEM_CONFIG; // Делаем ITEM_CONFIG глобально доступным

  window.inventorySystem = {
    inventory: Array(20).fill(null),
    pendingPickups: new Set(),
    isInventoryOpen: false,
    selectedSlot: null,

    setInventory(newInventory) {
      this.inventory = newInventory || Array(20).fill(null);
      this.updateInventoryDisplay();
    },

    toggleInventory() {
      this.isInventoryOpen = !this.isInventoryOpen;
      const inventoryContainer = document.getElementById("inventoryContainer");
      inventoryContainer.style.display = this.isInventoryOpen ? "grid" : "none";
      if (this.isInventoryOpen) {
        this.updateInventoryDisplay();
      }
      const inventoryBtn = document.getElementById("inventoryBtn");
      inventoryBtn.classList.toggle("active", this.isInventoryOpen);

      if (!this.isInventoryOpen) {
        const screen = document.getElementById("inventoryScreen");
        screen.innerHTML = "";
        this.selectedSlot = null;
        const useBtn = document.getElementById("useBtn");
        const dropBtn = document.getElementById("dropBtn");
        useBtn.textContent = "Использовать";
        useBtn.disabled = true;
        dropBtn.disabled = true;
      }
    },

    selectSlot(slotIndex, slotElement) {
      if (!this.inventory[slotIndex]) return;
      const screen = document.getElementById("inventoryScreen");
      const useBtn = document.getElementById("useBtn");
      const dropBtn = document.getElementById("dropBtn");

      if (this.selectedSlot === slotIndex) {
        this.selectedSlot = null;
        screen.innerHTML = "";
        useBtn.textContent = "Использовать";
        useBtn.disabled = true;
        dropBtn.disabled = true;
        return;
      }

      this.selectedSlot = slotIndex;
      screen.textContent = ITEM_CONFIG[this.inventory[slotIndex].type].description;
      useBtn.textContent = "Использовать";
      useBtn.disabled = this.inventory[slotIndex].type === "balyary";
      dropBtn.disabled = false;
    },

    useItem(slotIndex) {
      const item = this.inventory[slotIndex];
      if (!item || item.type === "balyary") return;
      const me = players.get(myId);
      const effect = ITEM_CONFIG[item.type].effect;

      if (effect.health)
        me.health = Math.min(levelSystem.maxStats.health, Math.max(0, me.health + effect.health));
      if (effect.energy)
        me.energy = Math.min(levelSystem.maxStats.energy, Math.max(0, me.energy + effect.energy));
      if (effect.food)
        me.food = Math.min(levelSystem.maxStats.food, Math.max(0, me.food + effect.food));
      if (effect.water)
        me.water = Math.min(levelSystem.maxStats.water, Math.max(0, me.water + effect.water));

      this.inventory[slotIndex] = null;
      this.selectedSlot = null;

      sendWhenReady(
        ws,
        JSON.stringify({
          type: "useItem",
          slotIndex,
          health: me.health,
          energy: me.energy,
          food: me.food,
          water: me.water,
        })
      );

      document.getElementById("useBtn").disabled = true;
      document.getElementById("dropBtn").disabled = true;
      document.getElementById("inventoryScreen").textContent = "";
      updateStatsDisplay();
      this.updateInventoryDisplay();
    },

    dropItem(slotIndex) {
      const item = this.inventory[slotIndex];
      if (!item) return;
      const me = players.get(myId);
      const screen = document.getElementById("inventoryScreen");
      const useBtn = document.getElementById("useBtn");
      const dropBtn = document.getElementById("dropBtn");

      if (item.type === "balyary") {
        screen.innerHTML = `
          <div class="balyary-drop-form">
            <p class="cyber-text">Сколько выкинуть?</p>
            <input type="number" id="balyaryAmount" class="cyber-input" min="1" max="${
              item.quantity || 1
            }" placeholder="0" value="" autofocus />
            <p id="balyaryError" class="error-text"></p>
            <button id="confirmDropBtn" class="action-btn confirm-btn">Подтвердить</button>
          </div>
        `;
        const input = document.getElementById("balyaryAmount");
        const errorEl = document.getElementById("balyaryError");
        const confirmBtn = document.getElementById("confirmDropBtn");

        requestAnimationFrame(() => {
          input.focus();
          input.select();
        });

        input.addEventListener("input", () => {
          input.value = input.value.replace(/[^0-9]/g, "");
          if (input.value === "") input.value = "";
        });

        const confirmDrop = () => {
          const amount = parseInt(input.value) || 0;
          const currentQuantity = item.quantity || 1;

          if (amount <= 0) {
            errorEl.textContent = "Введи нормальное число, братишка!";
            return;
          }

          if (amount > currentQuantity) {
            errorEl.textContent = "Не хватает Баляр!";
            return;
          }

          sendWhenReady(
            ws,
            JSON.stringify({
              type: "dropItem",
              slotIndex,
              x: me.x,
              y: me.y,
              quantity: amount,
            })
          );

          if (amount === currentQuantity) {
            this.inventory[slotIndex] = null;
          } else {
            this.inventory[slotIndex].quantity -= amount;
          }

          this.selectedSlot = null;
          screen.innerHTML = "";
          useBtn.textContent = "Использовать";
          useBtn.disabled = true;
          dropBtn.disabled = true;
          this.updateInventoryDisplay();
        };

        confirmBtn.addEventListener("click", (e) => {
          e.preventDefault();
          confirmDrop();
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirmDrop();
          }
        });
      } else {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "dropItem",
            slotIndex,
            x: me.x,
            y: me.y,
            quantity: 1,
          })
        );

        this.inventory[slotIndex] = null;
        this.selectedSlot = null;
        screen.innerHTML = "";
        useBtn.disabled = true;
        dropBtn.disabled = true;
        this.updateInventoryDisplay();
      }
    },

    initializeInventory() {
      const inventoryContainer = document.getElementById("inventoryContainer");
      inventoryContainer.style.display = "none";

      const inventoryGrid = document.createElement("div");
      inventoryGrid.id = "inventoryGrid";
      inventoryContainer.insertBefore(
        inventoryGrid,
        document.getElementById("inventoryActions")
      );

      for (let i = 0; i < 20; i++) {
        const slot = document.createElement("div");
        slot.className = "inventory-slot";
        inventoryGrid.appendChild(slot);
      }

      const useBtn = document.getElementById("useBtn");
      const dropBtn = document.getElementById("dropBtn");

      useBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.selectedSlot !== null) this.useItem(this.selectedSlot);
      });

      dropBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.selectedSlot !== null) this.dropItem(this.selectedSlot);
      });

      const inventoryBtn = document.getElementById("inventoryBtn");
      inventoryBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggleInventory();
      });
    },

    updateInventoryDisplay() {
      const inventoryGrid = document.getElementById("inventoryGrid");
      const slots = inventoryGrid.children;
      const screen = document.getElementById("inventoryScreen");
      const useBtn = document.getElementById("useBtn");
      const dropBtn = document.getElementById("dropBtn");

      const isBalyaryFormActive =
        this.selectedSlot !== null &&
        this.inventory[this.selectedSlot] &&
        this.inventory[this.selectedSlot].type === "balyary" &&
        screen.querySelector(".balyary-drop-form");

      if (isBalyaryFormActive) {
        // Сохраняем форму выброса "Баляр"
      } else if (this.selectedSlot === null) {
        screen.innerHTML = "";
      } else if (this.inventory[this.selectedSlot]) {
        screen.textContent = ITEM_CONFIG[this.inventory[this.selectedSlot].type].description;
      }

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        slot.innerHTML = "";
        if (this.inventory[i]) {
          const img = document.createElement("img");
          img.src = ITEM_CONFIG[this.inventory[i].type].image.src;
          img.style.width = "100%";
          img.style.height = "100%";
          slot.appendChild(img);

          if (this.inventory[i].type === "balyary" && this.inventory[i].quantity > 1) {
            const quantityEl = document.createElement("div");
            quantityEl.textContent = this.inventory[i].quantity;
            quantityEl.className = "quantity-label";
            slot.appendChild(quantityEl);
          }

          slot.onmouseover = () => {
            if (this.inventory[i] && this.selectedSlot !== i) {
              if (
                this.inventory[this.selectedSlot] &&
                this.inventory[this.selectedSlot].type === "balyary" &&
                screen.querySelector(".balyary-drop-form")
              ) {
                return;
              }
              screen.textContent = ITEM_CONFIG[this.inventory[i].type].description;
            }
          };
          slot.onmouseout = () => {
            if (
              this.selectedSlot === null ||
              (this.inventory[this.selectedSlot] &&
                this.inventory[this.selectedSlot].type === "balyary" &&
                screen.querySelector(".balyary-drop-form"))
            ) {
              return;
            }
            screen.textContent =
              this.inventory[this.selectedSlot] && this.selectedSlot !== null
                ? ITEM_CONFIG[this.inventory[this.selectedSlot].type].description
                : "";
          };
          slot.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.selectSlot(i, slot);
          };

          img.style.pointerEvents = "none";
        } else {
          slot.onmouseover = null;
          slot.onmouseout = null;
          slot.onclick = null;
        }
      }
    },

    handleInventoryInput() {
      const me = players.get(myId);
      if (!me || me.health <= 0) return;

      document.addEventListener("keydown", (e) => {
        if (e.key === "i") {
          this.toggleInventory();
          e.preventDefault();
        }
      });
    },

    checkItemCollisions() {
      const me = players.get(myId);
      if (!me || me.health <= 0) return;

      items.forEach((item, id) => {
        if (!items.has(id) || this.pendingPickups.has(id)) return;
        const dx = me.x + 20 - (item.x + 10);
        const dy = me.y + 20 - (item.y + 10);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 30) {
          this.pendingPickups.add(id);
          sendWhenReady(ws, JSON.stringify({ type: "pickup", itemId: id }));
        }
      });
    },

    drawItems() {
      const camera = window.movementSystem.getCamera();
      items.forEach((item, itemId) => {
        if (!items.has(itemId)) return;
        const screenX = item.x - camera.x;
        const screenY = item.y - camera.y;
        if (
          screenX >= -20 &&
          screenX <= canvas.width + 20 &&
          screenY >= -20 &&
          screenY <= canvas.height + 20
        ) {
          const itemImage = ITEM_CONFIG[item.type]?.image;
          if (itemImage && itemImage.complete) {
            ctx.drawImage(itemImage, screenX + 10, screenY + 10, 20, 20);
          } else {
            ctx.fillStyle = "yellow";
            ctx.fillRect(screenX + 7.5, screenY + 7.5, 5, 5);
          }
        }
      });
    },

    getPendingPickups() {
      return this.pendingPickups;
    },
  };
})();