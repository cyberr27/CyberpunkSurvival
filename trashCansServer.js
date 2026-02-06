const { saveUserDatabase } = require("./database");
const { ITEM_CONFIG } = require("./items");

const TRASH_CAN_COUNT = 6;
const FILL_COOLDOWN = 5 * 60 * 1000; // 5 минут
const WRONG_GUESS_COOLDOWN = 3 * 60 * 1000; // 3 минуты

// Состояние каждого бака (индекс 0..5)
const trashCansState = Array(TRASH_CAN_COUNT)
  .fill(null)
  .map(() => ({
    lastFilled: 0,
    guessed: false,
    isOpened: false,
    secretSuit: null, // "spades" | "hearts" | "diamonds" | "clubs"
    loot: [],
    // nextAttemptAfter убрали — теперь кулдаун индивидуальный для каждого игрока
  }));

const SUITS = ["spades", "hearts", "diamonds", "clubs"];

function getRandomLoot(playerCount = 1) {
  const items = [];
  const roll = Math.random();

  if (roll < 0.5) {
    if (Math.random() < 0.4) items.push({ type: "trash", quantity: 1 });
  } else if (roll < 0.8) {
    const food = [
      "nut",
      "apple",
      "berries",
      "carrot",
      "water_bottle",
      "bread",
      "sausage",
    ];
    items.push({
      type: food[Math.floor(Math.random() * food.length)],
      quantity: 1,
    });
  } else if (roll < 0.95) {
    const rare = ["canned_meat", "mushroom", "vodka_bottle", "blood_pack"];
    items.push({
      type: rare[Math.floor(Math.random() * rare.length)],
      quantity: 1,
    });
  } else {
    const torn = Object.keys(ITEM_CONFIG).filter((k) => k.startsWith("torn_"));
    items.push({
      type: torn[Math.floor(Math.random() * torn.length)],
      quantity: 1,
    });
  }

  const balyaryCount = Math.floor(Math.random() * 3) + 1;
  if (balyaryCount > 0) {
    items.push({ type: "balyary", quantity: balyaryCount });
  }

  return items;
}

function refillTrashCan(index, now = Date.now()) {
  const state = trashCansState[index];
  state.lastFilled = now;
  state.guessed = false;
  state.isOpened = false;
  state.secretSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
  state.loot = getRandomLoot();
}

function initializeTrashCans() {
  const now = Date.now();
  trashCansState.forEach((state, i) => {
    refillTrashCan(i, now - i * 60000 - Math.random() * 120000);
  });
}

function handleTrashGuess(
  ws,
  data,
  players,
  clients,
  wss,
  userDatabase,
  dbCollection,
  broadcastToWorld,
) {
  const playerId = clients.get(ws);
  if (!playerId) return;

  const player = players.get(playerId);
  if (!player) return;

  const { trashIndex, suit } = data;
  if (trashIndex < 0 || trashIndex >= TRASH_CAN_COUNT) return;
  if (!SUITS.includes(suit)) return;

  const state = trashCansState[trashIndex];
  const now = Date.now();

  // 1. Проверяем, открыт ли уже бак кем-то другим
  if (state.isOpened || state.guessed) {
    ws.send(
      JSON.stringify({
        type: "trashGuessResult",
        success: false,
        error: "Этот бак уже открыт кем-то другим.",
      }),
    );
    return;
  }

  // 2. Проверяем персональный кулдаун этого игрока для этого бака
  const cooldownKey = trashIndex.toString();
  const playerCooldown = player.trashCooldowns?.[cooldownKey] || 0;

  if (now < playerCooldown) {
    ws.send(
      JSON.stringify({
        type: "trashGuessResult",
        success: false,
        message: `Не-а, это нет братан. Следующая попытка через ${Math.ceil((playerCooldown - now) / 1000)} сек`,
        waitUntil: playerCooldown,
      }),
    );
    return;
  }

  // 3. Можно перезаполнить, если давно не было активности
  if (now - state.lastFilled > FILL_COOLDOWN) {
    refillTrashCan(trashIndex, now);
  }

  const correct = suit === state.secretSuit;

  if (correct) {
    state.guessed = true;
    state.isOpened = true;

    let addedXP = 0;
    state.loot.forEach((it) => {
      if (it.type === "balyary") {
        let slot = player.inventory.findIndex((s) => s?.type === "balyary");
        if (slot !== -1) {
          player.inventory[slot].quantity =
            (player.inventory[slot].quantity || 0) + it.quantity;
        } else {
          slot = player.inventory.findIndex((s) => !s);
          if (slot !== -1) {
            player.inventory[slot] = { type: "balyary", quantity: it.quantity };
          }
        }
        addedXP += it.quantity;
      } else if (ITEM_CONFIG[it.type]) {
        let slot = player.inventory.findIndex((s) => !s);
        if (slot !== -1) {
          player.inventory[slot] = {
            type: it.type,
            quantity: it.quantity || 1,
          };
        }
      }
    });

    if (addedXP > 0) {
      player.xp = (player.xp || 0) + addedXP;
    }

    players.set(playerId, player);
    userDatabase.set(playerId, player);
    saveUserDatabase(dbCollection, playerId, player);

    ws.send(
      JSON.stringify({
        type: "trashGuessResult",
        success: true,
        loot: state.loot,
        xpGained: addedXP,
        message: "Угадал! Забирай всё.",
      }),
    );

    broadcastToWorld(
      wss,
      clients,
      players,
      player.worldId,
      JSON.stringify({
        type: "update",
        player: {
          id: playerId,
          inventory: player.inventory,
          xp: player.xp,
        },
      }),
    );

    // Главное обновление состояния для всех
    broadcastToWorld(
      wss,
      clients,
      players,
      player.worldId,
      JSON.stringify({
        type: "trashState",
        index: trashIndex,
        guessed: true,
        isOpened: true,
      }),
    );

    setTimeout(() => {
      refillTrashCan(trashIndex);
      broadcastToWorld(
        wss,
        clients,
        players,
        player.worldId,
        JSON.stringify({
          type: "trashRespawned",
          index: trashIndex,
          isOpened: false,
          guessed: false,
        }),
      );
    }, FILL_COOLDOWN);
  } else {
    // Не угадал → ставим кулдаун ТОЛЬКО этому игроку
    const nextAttempt = now + WRONG_GUESS_COOLDOWN;

    if (!player.trashCooldowns) {
      player.trashCooldowns = {};
    }
    player.trashCooldowns[cooldownKey] = nextAttempt;

    // Сохраняем изменения игрока
    players.set(playerId, player);
    userDatabase.set(playerId, player);
    saveUserDatabase(dbCollection, playerId, player);

    ws.send(
      JSON.stringify({
        type: "trashGuessResult",
        success: false,
        message: `Не-а, это нет братан. Следующая попытка через 3 минуты.`,
        waitUntil: nextAttempt,
      }),
    );
  }
}

module.exports = {
  initializeTrashCans,
  handleTrashGuess,
  trashCansState,
  SUITS,
};
