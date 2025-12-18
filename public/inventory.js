// inventory.js
// Модуль инвентаря для Cyberpunk Survival

const inventoryEl = document.getElementById("items");
const items = new Map();
let inventoryAtomTimer = null;
let atomFrame = 0;
let atomFrameTime = 0;
const ATOM_FRAMES = 40;
const ATOM_FRAME_DURATION = 180;
const pendingPickups = new Set();

// Здесь должны быть все функции работы с инвентарём, анимацией атома, обработкой предметов и взаимодействием с инвентарём
// Например:
// function drawInventory() { ... }
// function addItemToInventory(item) { ... }
// function removeItemFromInventory(itemId) { ... }
// function animateAtomInInventory() { ... }
// ... и другие связанные функции ...

window.inventorySystem = {
  // drawInventory,
  // addItemToInventory,
  // removeItemFromInventory,
  // animateAtomInInventory,
  // ...
};
