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

let inventory = Array(20).fill(null);
let isInventoryOpen = false;
let selectedSlot = null;
let pendingPickups = new Set();

function initializeInventory() {
  const inventoryStyles = `
      #inventoryContainer {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, rgba(10, 10, 10, 0.95), rgba(20, 20, 20, 0.9));
        border: 2px solid #00ffff;
        border-radius: 10px;
        padding: 15px;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.5), 0 0 30px rgba(255, 0, 255, 0.3);
        animation: neonPulse 2s infinite alternate;
        z-index: 1000;
        display: none;
        max-width: 450px;
        width: 90%;
      }
      #inventoryGrid {
        display: grid;
        grid-template-columns: repeat(5, 60px);
        gap: 8px;
        margin-bottom: 15px;
      }
      .inventory-slot {
        width: 60px;
        height: 60px;
        background: rgba(0, 0, 0, 0.85);
        border: 1px solid #00ffff;
        border-radius: 5px;
        position: relative;
        box-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
        transition: all 0.3s ease;
        cursor: pointer;
      }
      .inventory-slot:hover {
        border-color: #ff00ff;
        box-shadow: 0 0 15px rgba(255, 0, 255, 0.7);
        transform: scale(1.05);
      }
      #inventoryScreen {
        min-height: 60px;
        background: rgba(10, 10, 10, 0.9);
        border: 1px solid #ff00ff;
        border-radius: 5px;
        padding: 10px;
        color: #00ffff;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        text-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
        margin-bottom: 10px;
      }
      #inventoryActions {
        display: flex;
        gap: 10px;
        justify-content: center;
      }
      .action-btn {
        padding: 10px 20px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        background: linear-gradient(135deg, #00ffff, #ff00ff);
        border: none;
        color: #000;
        border-radius: 5px;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
        transition: all 0.3s;
        text-transform: uppercase;
      }
      .action-btn:disabled {
        background: linear-gradient(135deg, #333, #555);
        color: #777;
        box-shadow: none;
        cursor: not-allowed;
      }
      .action-btn:hover:not(:disabled) {
        box-shadow: 0 0 20px rgba(0, 255, 255, 1);
        transform: scale(1.05);
      }
      .balyary-drop-form {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }
      .cyber-text {
        color: #00ffff;
        font-size: 14px;
        text-shadow: 0 0 5px rgba(0, 255, 255, 0.7);
      }
      .cyber-input {
        background: rgba(0, 0, 0, 0.85);
        border: 1px solid #00ffff;
        color: #00ffff;
        font-family: 'Courier New', monospace;
        padding: 8px;
        border-radius: 5px;
        width: 100px;
        text-align: center;
        box-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
      }
      .cyber-input:focus {
        outline: none;
        border-color: #ff00ff;
        box-shadow: 0 0 15px rgba(255, 0, 255, 0.7);
      }
      .error-text {
        color: #ff00ff;
        font-size: 12px;
        text-shadow: 0 0 5px rgba(255, 0, 255, 0.7);
      }
      @keyframes neonPulse {
        0% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(255, 0, 255, 0.3); }
        100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.8), 0 0 30px rgba(255, 0, 255, 0.5); }
      }
      @media (max-width: 500px) {
        #inventoryContainer {
          bottom: 10px;
          right: 10px;
          padding: 10px;
        }
        #inventoryGrid {
          grid-template-columns: repeat(5, 50px);
          gap: 6px;
        }
        .inventory-slot {
          width: 50px;
          height: 50px;
        }
        .action-btn {
          padding: 8px 16px;
          font-size: 12px;
        }
        .cyber-input {
          width: 80px;
        }
      }
    `;
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = inventoryStyles;
  document.head.appendChild(styleSheet);

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
    if (selectedSlot !== null) useItem(selectedSlot);
  });

  dropBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (selectedSlot !== null) dropItem(selectedSlot);
  });

  const inventoryBtn = document.getElementById("inventoryBtn");
  inventoryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleInventory();
  });
}

function toggleInventory() {
  isInventoryOpen = !isInventoryOpen;
  const inventoryContainer = document.getElementById("inventoryContainer");
  inventoryContainer.style.display = isInventoryOpen ? "grid" : "none";
  if (isInventoryOpen) updateInventoryDisplay();
  const inventoryBtn = document.getElementById("inventoryBtn");
  inventoryBtn.classList.toggle("active", isInventoryOpen);

  if (!isInventoryOpen) {
    const screen = document.getElementById("inventoryScreen");
    screen.innerHTML = "";
    selectedSlot = null;
    const useBtn = document.getElementById("useBtn");
    const dropBtn = document.getElementById("dropBtn");
    useBtn.textContent = "Использовать";
    useBtn.disabled = true;
    dropBtn.disabled = true;
  }
}

function selectSlot(slotIndex, slotElement) {
  if (!inventory[slotIndex]) return;
  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  if (selectedSlot === slotIndex) {
    selectedSlot = null;
    screen.innerHTML = "";
    useBtn.textContent = "Использовать";
    useBtn.disabled = true;
    dropBtn.disabled = true;
    return;
  }

  selectedSlot = slotIndex;
  screen.textContent = ITEM_CONFIG[inventory[slotIndex].type].description;
  useBtn.textContent = "Использовать";
  useBtn.disabled = inventory[slotIndex].type === "balyary";
  dropBtn.disabled = false;
}

function useItem(slotIndex) {
  const item = inventory[slotIndex];
  if (!item || item.type === "balyary") return;
  const me = players.get(myId);
  const effect = ITEM_CONFIG[item.type].effect;

  if (effect.health)
    me.health = Math.min(
      levelSystem.maxStats.health,
      Math.max(0, me.health + effect.health)
    );
  if (effect.energy)
    me.energy = Math.min(
      levelSystem.maxStats.energy,
      Math.max(0, me.energy + effect.energy)
    );
  if (effect.food)
    me.food = Math.min(
      levelSystem.maxStats.food,
      Math.max(0, me.food + effect.food)
    );
  if (effect.water)
    me.water = Math.min(
      levelSystem.maxStats.water,
      Math.max(0, me.water + effect.water)
    );

  inventory[slotIndex] = null;

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

  selectedSlot = null;
  document.getElementById("useBtn").disabled = true;
  document.getElementById("dropBtn").disabled = true;
  document.getElementById("inventoryScreen").textContent = "";
  window.inventorySystem.updateStatsDisplay();
  updateInventoryDisplay();
}

function dropItem(slotIndex) {
  const item = inventory[slotIndex];
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
        </div>
      `;
    const input = document.getElementById("balyaryAmount");
    const errorEl = document.getElementById("balyaryError");

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-9]/g, "");
      if (input.value === "") input.value = "";
    });

    useBtn.textContent = "Подтвердить";
    useBtn.disabled = false;
    dropBtn.disabled = true;

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmDrop();
      }
    });

    useBtn.onclick = (e) => {
      e.preventDefault();
      confirmDrop();
    };

    function confirmDrop() {
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
        inventory[slotIndex] = null;
      } else {
        inventory[slotIndex].quantity -= amount;
      }

      useBtn.textContent = "Использовать";
      useBtn.disabled = true;
      dropBtn.disabled = true;
      useBtn.onclick = () => useItem(slotIndex);
      selectedSlot = null;
      screen.innerHTML = "";
      updateInventoryDisplay();
    }
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

    inventory[slotIndex] = null;

    selectedSlot = null;
    useBtn.disabled = true;
    dropBtn.disabled = true;
    screen.innerHTML = "";
    updateInventoryDisplay();
  }
}

function updateInventoryDisplay() {
  const inventoryGrid = document.getElementById("inventoryGrid");
  const slots = inventoryGrid.children;
  const screen = document.getElementById("inventoryScreen");
  const useBtn = document.getElementById("useBtn");
  const dropBtn = document.getElementById("dropBtn");

  const isBalyaryFormActive =
    selectedSlot !== null &&
    inventory[selectedSlot] &&
    inventory[selectedSlot].type === "balyary" &&
    screen.querySelector(".balyary-drop-form");

  if (isBalyaryFormActive) {
  } else if (selectedSlot === null) {
    screen.innerHTML = "";
  } else if (inventory[selectedSlot]) {
    screen.textContent = ITEM_CONFIG[inventory[selectedSlot].type].description;
  }

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    slot.innerHTML = "";
    if (inventory[i]) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[inventory[i].type].image.src;
      img.style.width = "100%";
      img.style.height = "100%";
      slot.appendChild(img);

      if (inventory[i].type === "balyary" && inventory[i].quantity > 1) {
        const quantityEl = document.createElement("div");
        quantityEl.textContent = inventory[i].quantity;
        quantityEl.style.position = "absolute";
        quantityEl.style.top = "0";
        quantityEl.style.right = "0";
        quantityEl.style.color = "#00ffff";
        quantityEl.style.fontSize = "14px";
        quantityEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
        slot.appendChild(quantityEl);
      }

      slot.onmouseover = () => {
        if (inventory[i] && selectedSlot !== i) {
          if (
            inventory[selectedSlot] &&
            inventory[selectedSlot].type === "balyary" &&
            screen.querySelector(".balyary-drop-form")
          ) {
            return;
          }
          screen.textContent = ITEM_CONFIG[inventory[i].type].description;
        }
      };
      slot.onmouseout = () => {
        if (
          selectedSlot === null ||
          (inventory[selectedSlot] &&
            inventory[selectedSlot].type === "balyary" &&
            screen.querySelector(".balyary-drop-form"))
        ) {
          return;
        }
        screen.textContent =
          inventory[selectedSlot] && selectedSlot !== null
            ? ITEM_CONFIG[inventory[selectedSlot].type].description
            : "";
      };
      slot.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectSlot(i, slot);
      };

      img.style.pointerEvents = "none";
    } else {
      slot.onmouseover = null;
      slot.onmouseout = null;
      slot.onclick = null;
    }
  }
}

function handleInventoryInput() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  document.addEventListener("keydown", (e) => {
    if (e.key === "i") {
      toggleInventory();
      e.preventDefault();
    }
  });
}

function checkItemCollisions() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  items.forEach((item, id) => {
    if (!items.has(id) || pendingPickups.has(id)) return;
    const dx = me.x + 20 - (item.x + 10);
    const dy = me.y + 20 - (item.y + 10);
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 30) {
      pendingPickups.add(id);
      sendWhenReady(ws, JSON.stringify({ type: "pickup", itemId: id }));
    }
  });
}

function drawItems() {
  const camera = window.movementSystem.getCamera();
  items.forEach((item, itemId) => {
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
}

window.inventorySystem = {
  initialize: initializeInventory,
  toggleInventory,
  updateInventoryDisplay,
  handleInventoryInput,
  checkItemCollisions,
  drawItems,
  setInventory: (newInventory) => {
    inventory = newInventory || Array(20).fill(null);
    updateInventoryDisplay();
  },
  getPendingPickups: () => pendingPickups,
};
