// homelessServer.js

const { saveUserDatabase } = require("./database");
const { ITEM_CONFIG } = require("./items.js");

const HOMELESS_STORAGE_COST_PER_DAY = 2;
const HOMELESS_STORAGE_SLOTS = 20;
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

function isStorageRented(player) {
  if (!player.storageRentUntil) return false;
  return Date.now() < player.storageRentUntil;
}

function getRemainingDays(player) {
  if (!isStorageRented(player)) return 0;
  const msLeft = player.storageRentUntil - Date.now();
  return Math.ceil(msLeft / MILLISECONDS_IN_DAY);
}

function handleHomelessRentRequest(
  wss,
  clients,
  players,
  userDatabase,
  dbCollection,
  playerId,
) {
  const player = players.get(playerId);
  if (!player) return;

  const rented = isStorageRented(player);

  // Отправляем клиенту текущее состояние
  const client = [...clients.entries()].find(
    ([ws, id]) => id === playerId,
  )?.[0];
  if (!client || client.readyState !== WebSocket.OPEN) return;

  client.send(
    JSON.stringify({
      type: "homelessStorageStatus",
      rented,
      rentUntil: player.storageRentUntil || null,
      remainingDays: getRemainingDays(player),
      storageItems:
        player.storageItems || Array(HOMELESS_STORAGE_SLOTS).fill(null),
    }),
  );
}

function handleHomelessRentConfirm(
  wss,
  clients,
  players,
  userDatabase,
  dbCollection,
  playerId,
  days,
) {
  const player = players.get(playerId);
  if (!player) return;

  if (days < 1 || !Number.isInteger(days)) {
    sendErrorToPlayer(
      clients,
      playerId,
      "Количество дней должно быть целым числом ≥ 1",
    );
    return;
  }

  const cost = days * HOMELESS_STORAGE_COST_PER_DAY;

  // Находим слот с балярами
  const balyaryIndex = player.inventory.findIndex(
    (item) => item?.type === "balyary",
  );
  if (
    balyaryIndex === -1 ||
    (player.inventory[balyaryIndex].quantity || 0) < cost
  ) {
    sendErrorToPlayer(clients, playerId, `Недостаточно баляров. Нужно ${cost}`);
    return;
  }

  // Снимаем баляры
  player.inventory[balyaryIndex].quantity -= cost;
  if (player.inventory[balyaryIndex].quantity <= 0) {
    player.inventory[balyaryIndex] = null;
  }

  // Устанавливаем или продлеваем аренду
  const now = Date.now();
  if (!player.storageRentUntil || player.storageRentUntil < now) {
    player.storageRentUntil = now + days * MILLISECONDS_IN_DAY;
  } else {
    player.storageRentUntil += days * MILLISECONDS_IN_DAY;
  }

  // Инициализируем хранилище если его ещё нет
  if (!player.storageItems) {
    player.storageItems = Array(HOMELESS_STORAGE_SLOTS).fill(null);
  }

  saveUserDatabase(dbCollection, playerId, player);

  // Отправляем успех
  const client = [...clients.entries()].find(
    ([ws, id]) => id === playerId,
  )?.[0];
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(
      JSON.stringify({
        type: "homelessRentSuccess",
        rentUntil: player.storageRentUntil,
        remainingDays: getRemainingDays(player),
        storageItems: player.storageItems,
      }),
    );
  }

  broadcastBalaryUpdate(wss, clients, players, playerId);
}

function handleHomelessStorageAction(
  wss,
  clients,
  players,
  dbCollection,
  playerId,
  action,
  playerSlot,
  storageSlot,
  quantity = 1,
) {
  const player = players.get(playerId);
  if (!player || !isStorageRented(player)) return;

  if (!player.storageItems) {
    player.storageItems = Array(HOMELESS_STORAGE_SLOTS).fill(null);
  }

  const client = [...clients.entries()].find(
    ([ws, id]) => id === playerId,
  )?.[0];
  if (!client || client.readyState !== WebSocket.OPEN) return;

  if (action === "put") {
    if (playerSlot < 0 || playerSlot >= player.inventory.length) return;
    if (storageSlot < 0 || storageSlot >= HOMELESS_STORAGE_SLOTS) return;

    let item = player.inventory[playerSlot];
    if (!item) return;

    const qty = Math.max(1, Math.min(Number(quantity), item.quantity || 1));

    // 1. ВСЕГДА сначала ищем существующий стек этого типа (даже если склад полный)
    const existingStackIndex = player.storageItems.findIndex(
      (slot) =>
        slot && slot.type === item.type && ITEM_CONFIG[item.type]?.stackable,
    );

    if (existingStackIndex !== -1) {
      // Нашли стек → добавляем к нему (это главный приоритет)
      const target = player.storageItems[existingStackIndex];
      target.quantity = (target.quantity || 1) + qty;

      // Уменьшаем или удаляем из инвентаря игрока
      if (qty >= (item.quantity || 1)) {
        player.inventory[playerSlot] = null;
      } else {
        item.quantity -= qty;
      }
    } else {
      // Стек этого типа не найден → теперь уже ищем свободное место
      // Пытаемся положить в указанный слот (если свободен)
      if (player.storageItems[storageSlot] === null) {
        player.storageItems[storageSlot] = { ...item, quantity: qty };

        if (qty >= (item.quantity || 1)) {
          player.inventory[playerSlot] = null;
        } else {
          item.quantity -= qty;
        }
      } else {
        // Указанный слот занят → ищем любой свободный слот
        const freeSlot = player.storageItems.findIndex((slot) => slot === null);

        if (freeSlot !== -1) {
          player.storageItems[freeSlot] = { ...item, quantity: qty };

          if (qty >= (item.quantity || 1)) {
            player.inventory[playerSlot] = null;
          } else {
            item.quantity -= qty;
          }
        } else {
          // Нет ни стека, ни свободных слотов → ошибка
          const client = [...clients.entries()].find(
            ([ws, id]) => id === playerId,
          )?.[0];
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "homelessError",
                message: "Хранилище заполнено",
              }),
            );
          }
          return;
        }
      }
    }

    // Сохраняем изменения и отправляем обновление клиенту
    saveUserDatabase(dbCollection, playerId, player);

    const client = [...clients.entries()].find(
      ([ws, id]) => id === playerId,
    )?.[0];
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "homelessStorageUpdate",
          inventory: player.inventory,
          storageItems: player.storageItems,
        }),
      );
    }
  } else if (action === "take") {
    if (storageSlot < 0 || storageSlot >= HOMELESS_STORAGE_SLOTS) return;

    let item = player.storageItems[storageSlot];
    if (!item) return;

    const qty = Math.max(1, Math.min(Number(quantity), item.quantity || 1));

    // Ищем существующий стек в инвентаре
    const existingStackIndex = player.inventory.findIndex(
      (slot) =>
        slot && slot.type === item.type && ITEM_CONFIG[item.type]?.stackable,
    );

    if (existingStackIndex !== -1) {
      const target = player.inventory[existingStackIndex];
      target.quantity = (target.quantity || 1) + qty;
    } else {
      // Нет стека → ищем свободный слот
      const freePlayerSlot = player.inventory.findIndex(
        (slot) => slot === null,
      );

      if (freePlayerSlot === -1) {
        const client = [...clients.entries()].find(
          ([ws, id]) => id === playerId,
        )?.[0];
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "homelessInventoryFull" }));
        }
        return;
      }

      player.inventory[freePlayerSlot] = { ...item, quantity: qty };
    }

    // Уменьшаем или удаляем из хранилища
    if (qty >= (item.quantity || 1)) {
      player.storageItems[storageSlot] = null;
    } else {
      item.quantity -= qty;
    }

    saveUserDatabase(dbCollection, playerId, player);

    const client = [...clients.entries()].find(
      ([ws, id]) => id === playerId,
    )?.[0];
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "homelessStorageUpdate",
          inventory: player.inventory,
          storageItems: player.storageItems,
        }),
      );
    }
  }
}

function sendErrorToPlayer(clients, playerId, message) {
  const client = [...clients.entries()].find(
    ([ws, id]) => id === playerId,
  )?.[0];
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(
      JSON.stringify({
        type: "homelessError",
        message,
      }),
    );
  }
}

function broadcastBalaryUpdate(wss, clients, players, changedPlayerId) {
  const player = players.get(changedPlayerId);
  if (!player) return;

  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      const id = clients.get(ws);
      if (id) {
        ws.send(
          JSON.stringify({
            type: "update",
            player: {
              id: changedPlayerId,
              inventory: player.inventory,
            },
          }),
        );
      }
    }
  });
}

module.exports = {
  handleHomelessRentRequest,
  handleHomelessRentConfirm,
  handleHomelessStorageAction,
};
