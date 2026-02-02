// homelessServer.js — серверная логика аренды склада у Бездомного

const { saveUserDatabase } = require("./database");

const RENT_COST_PER_DAY = 50;
const STORAGE_SLOTS = 20;

// Храним аренды в памяти (можно перенести в БД позже)
const homelessRentals = new Map(); // playerId → { endTime: timestamp, items: Array(20) }

function initializeHomelessStorage() {
  // Можно загрузить из базы при старте сервера, если нужно
  console.log("[HomelessStorage] initialized");
}

function isStorageActive(playerId) {
  const rental = homelessRentals.get(playerId);
  if (!rental) return false;
  return Date.now() < rental.endTime;
}

function getRemainingTime(playerId) {
  const rental = homelessRentals.get(playerId);
  if (!rental) return 0;
  return Math.max(0, rental.endTime - Date.now());
}

function handleGetHomelessStorage(ws, player) {
  const playerId = player.id;

  let data = {
    isRented: false,
    endTime: 0,
    items: [],
  };

  if (isStorageActive(playerId)) {
    const rental = homelessRentals.get(playerId);
    data = {
      isRented: true,
      endTime: rental.endTime,
      items: rental.items || Array(STORAGE_SLOTS).fill(null),
    };
  }

  ws.send(
    JSON.stringify({
      type: "homelessStorageData",
      ...data,
    }),
  );
}

function handleRentHomelessStorage(ws, player, days) {
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    ws.send(
      JSON.stringify({
        type: "homelessRentResult",
        success: false,
        error: "Некорректное количество дней",
      }),
    );
    return;
  }

  const cost = days * RENT_COST_PER_DAY;

  if (player.balyary < cost) {
    ws.send(
      JSON.stringify({
        type: "homelessRentResult",
        success: false,
        error: "Недостаточно баляров",
      }),
    );
    return;
  }

  const now = Date.now();
  const endTime = now + days * 86400000;

  // Если уже была аренда — продлеваем
  let rental = homelessRentals.get(player.id) || {
    items: Array(STORAGE_SLOTS).fill(null),
  };

  rental.endTime = Math.max(rental.endTime || 0, endTime);
  homelessRentals.set(player.id, rental);

  player.balyary -= cost;
  saveUserDatabase(player.id, player);

  ws.send(
    JSON.stringify({
      type: "homelessRentResult",
      success: true,
      days,
      endTime: rental.endTime,
      message: `Арендовано на ${days} дней`,
    }),
  );
}

function handleMoveToHomelessStorage(ws, player, slotIndex) {
  if (!isStorageActive(player.id)) {
    ws.send(
      JSON.stringify({
        type: "homelessStorageMove",
        success: false,
        error: "Аренда склада истекла",
      }),
    );
    return;
  }

  const rental = homelessRentals.get(player.id);
  const items = rental.items || Array(STORAGE_SLOTS).fill(null);

  // Проверяем слот игрока
  if (!player.inventory || !player.inventory[slotIndex]) {
    ws.send(
      JSON.stringify({
        type: "homelessStorageMove",
        success: false,
        error: "Слот пуст",
      }),
    );
    return;
  }

  // Ищем свободный слот на складе
  const freeIndex = items.findIndex((it) => !it);
  if (freeIndex === -1) {
    ws.send(
      JSON.stringify({
        type: "homelessStorageMove",
        success: false,
        error: "Склад заполнен",
      }),
    );
    return;
  }

  // Переносим
  const item = { ...player.inventory[slotIndex] };
  player.inventory[slotIndex] = null;
  items[freeIndex] = item;

  rental.items = items;
  homelessRentals.set(player.id, rental);

  saveUserDatabase(player.id, player);

  ws.send(
    JSON.stringify({
      type: "homelessStorageMove",
      success: true,
      playerInventory: player.inventory,
      storageItems: items,
      message: "Предмет помещён на склад",
    }),
  );
}

function handleMoveFromHomelessStorage(ws, player, slotIndex) {
  if (!isStorageActive(player.id)) {
    ws.send(
      JSON.stringify({
        type: "homelessStorageMove",
        success: false,
        error: "Аренда склада истекла",
      }),
    );
    return;
  }

  const rental = homelessRentals.get(player.id);
  const items = rental.items || Array(STORAGE_SLOTS).fill(null);

  if (!items[slotIndex]) {
    ws.send(
      JSON.stringify({
        type: "homelessStorageMove",
        success: false,
        error: "Ячейка пуста",
      }),
    );
    return;
  }

  // Ищем свободный слот в инвентаре игрока
  const freeSlot = player.inventory.findIndex((it) => !it);
  if (freeSlot === -1) {
    ws.send(
      JSON.stringify({
        type: "homelessStorageMove",
        success: false,
        error: "Инвентарь заполнен",
      }),
    );
    return;
  }

  // Переносим
  const item = { ...items[slotIndex] };
  items[slotIndex] = null;
  player.inventory[freeSlot] = item;

  rental.items = items;
  homelessRentals.set(player.id, rental);

  saveUserDatabase(player.id, player);

  ws.send(
    JSON.stringify({
      type: "homelessStorageMove",
      success: true,
      playerInventory: player.inventory,
      storageItems: items,
      message: "Предмет забран со склада",
    }),
  );
}

// Подключаем в основной websocket-файл
function handleHomelessMessage(ws, player, data) {
  switch (data.type) {
    case "getHomelessStorage":
      handleGetHomelessStorage(ws, player);
      break;

    case "rentHomelessStorage":
      handleRentHomelessStorage(ws, player, data.days);
      break;

    case "moveToHomelessStorage":
      handleMoveToHomelessStorage(ws, player, data.slotIndex);
      break;

    case "moveFromHomelessStorage":
      handleMoveFromHomelessStorage(ws, player, data.slotIndex);
      break;
  }
}

module.exports = {
  initializeHomelessStorage,
  handleHomelessMessage,
  // Для очистки при дисконнекте можно добавить, если нужно
};
