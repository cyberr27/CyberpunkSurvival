// inventory.js
// Модуль инвентаря для Cyberpunk Survival

let inventory = Array(20).fill(null);
let isInventoryOpen = false;
let selectedSlot = null;
let inventoryAtomTimer = null;
const ATOM_FRAMES = 40;
const ATOM_FRAME_DURATION = 180;

function toggleInventory() {
  isInventoryOpen = !isInventoryOpen;
  const inventoryContainer = document.getElementById("inventoryContainer");
  inventoryContainer.style.display = isInventoryOpen ? "grid" : "none";
  const inventoryBtn = document.getElementById("inventoryBtn");
  inventoryBtn.classList.toggle("active", isInventoryOpen);
  if (isInventoryOpen) {
    if (!inventoryAtomTimer) {
      inventoryAtomTimer = setInterval(() => {
        // ...анимация атома...
      }, ATOM_FRAME_DURATION);
    }
    updateInventoryDisplay();
  } else {
    if (inventoryAtomTimer) {
      clearInterval(inventoryAtomTimer);
      inventoryAtomTimer = null;
    }
    const screen = document.getElementById("inventoryScreen");
    screen.innerHTML = "";
    selectedSlot = null;
    const useBtn = document.getElementById("useBtn");
    const dropBtn = document.getElementById("dropBtn");
    useBtn.textContent = "Использовать";
    useBtn.disabled = true;
    dropBtn.disabled = true;
    window.atomAnimations = [];
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
  screen.textContent =
    window.resourceLoader.ITEM_CONFIG[inventory[slotIndex].type].description;
  useBtn.textContent = "Использовать";
  useBtn.disabled =
    window.resourceLoader.ITEM_CONFIG[inventory[slotIndex].type].balyary;
  dropBtn.disabled = false;
}

function useItem(slotIndex) {
  // ...реализация useItem (аналогично code.js)...
}

function dropItem(slotIndex) {
  // ...реализация dropItem (аналогично code.js)...
}

function updateInventoryDisplay() {
  // ...реализация updateInventoryDisplay (аналогично code.js)...
}

window.inventorySystem = {
  toggleInventory,
  selectSlot,
  useItem,
  dropItem,
  updateInventoryDisplay,
  getInventory: () => inventory,
  isInventoryOpen: () => isInventoryOpen,
  getSelectedSlot: () => selectedSlot,
};
