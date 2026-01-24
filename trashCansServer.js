const { saveUserDatabase } = require("./database");
const { ITEM_CONFIG } = require("./items");

const TRASH_CAN_COUNT = 5;
const FILL_COOLDOWN = 5 * 60 * 1000; // 5 минут
const WRONG_GUESS_COOLDOWN = 3 * 60 * 1000; // 3 минуты

// Состояние каждого бака (индекс 0..4)
const trashCansState = Array(TRASH_CAN_COUNT)
  .fill(null)
  .map(() => ({
    lastFilled: 0,
    guessed: false,
    secretSuit: null, // "spades" | "hearts" | "diamonds" | "clubs"
    nextAttemptAfter: 0, // timestamp, когда можно снова пытаться
    loot: [], // массив {type, quantity}
  }));

const SUITS = ["spades", "hearts", "diamonds", "clubs"];
const SUIT_EMOJI = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

function getRandomLoot(playerCount = 1) {
  const items = [];
  const roll = Math.random();

  // шанс найти что-то полезное
  if (roll < 0.5) {
    // 50% — ничего или мусор
    if (Math.random() < 0.4) items.push({ type: "trash", quantity: 1 });
  } else if (roll < 0.8) {
    // 30% — обычная еда
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
    // 15% — редкая еда / баляры
    const rare = ["canned_meat", "mushroom", "vodka_bottle", "blood_pack"];
    items.push({
      type: rare[Math.floor(Math.random() * rare.length)],
      quantity: 1,
    });
  } else {
    // 5% — порванная экипировка
    const torn = Object.keys(ITEM_CONFIG).filter((k) => k.startsWith("torn_"));
    items.push({
      type: torn[Math.floor(Math.random() * torn.length)],
      quantity: 1,
    });
  }

  // + баляры и опыт почти всегда
  const balyaryCount = Math.floor(Math.random() * 3) + 1; // 1–3
  if (balyaryCount > 0) {
    items.push({ type: "balyary", quantity: balyaryCount });
  }

  return items;
}

function refillTrashCan(index, now = Date.now()) {
  const state = trashCansState[index];
  state.lastFilled = now;
  state.guessed = false;
  state.secretSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
  state.nextAttemptAfter = 0;
  state.loot = getRandomLoot();
}

function initializeTrashCans() {
  const now = Date.now();
  trashCansState.forEach((state, i) => {
    refillTrashCan(i, now - i * 60000); // небольшой разброс по времени
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

  // Проверяем кулдаун
  if (now < state.nextAttemptAfter) {
    ws.send(
      JSON.stringify({
        type: "trashGuessResult",
        success: false,
        error: "Слишком рано! Подожди немного...",
        waitUntil: state.nextAttemptAfter,
      }),
    );
    return;
  }

  // Проверяем, открыт ли уже
  if (state.guessed) {
    ws.send(
      JSON.stringify({
        type: "trashGuessResult",
        success: false,
        error: "Этот бак уже открыт кем-то другим.",
      }),
    );
    return;
  }

  // Проверяем время заполнения
  if (now - state.lastFilled > FILL_COOLDOWN) {
    // Можно перезаполнить
    refillTrashCan(trashIndex, now);
  }

  const correct = suit === state.secretSuit;

  if (correct) {
    // Успех — забираем лут
    state.guessed = true;
    state.nextAttemptAfter = now + FILL_COOLDOWN;

    // Добавляем игроку лут
    let addedXP = 0;
    state.loot.forEach((it) => {
      if (it.type === "balyary") {
        // баляры
        let slot = player.inventory.findIndex((s) => s?.type === "balyary");
        if (slot !== -1) {
          player.inventory[slot].quantity += it.quantity;
        } else {
          slot = player.inventory.findIndex((s) => !s);
          if (slot !== -1) {
            player.inventory[slot] = { type: "balyary", quantity: it.quantity };
          }
        }
      } else if (ITEM_CONFIG[it.type]) {
        // обычный предмет
        let slot = player.inventory.findIndex((s) => !s);
        if (slot !== -1) {
          player.inventory[slot] = {
            type: it.type,
            quantity: it.quantity || 1,
          };
        }
      }

      if (it.type === "balyary") {
        addedXP += it.quantity; // 1 баляр = 1 XP
      }
    });

    if (addedXP > 0) {
      player.xp = (player.xp || 0) + addedXP;
      // здесь можно добавить проверку левел-апа как в других местах
    }

    // Сохраняем игрока
    players.set(playerId, player);
    userDatabase.set(playerId, player);
    saveUserDatabase(dbCollection, playerId, player);

    // Уведомляем игрока
    ws.send(
      JSON.stringify({
        type: "trashGuessResult",
        success: true,
        loot: state.loot,
        xpGained: addedXP,
        message: "Угадал! Забирай всё.",
      }),
    );

    // Уведомляем всех в мире (опционально)
    broadcastToWorld(
      wss,
      clients,
      players,
      player.worldId,
      JSON.stringify({
        type: "trashCanOpened",
        trashIndex,
        playerId,
      }),
    );

    // Перезаполним через FILL_COOLDOWN
    setTimeout(() => {
      refillTrashCan(trashIndex);
    }, FILL_COOLDOWN);
  } else {
    // Не угадал
    state.nextAttemptAfter = now + WRONG_GUESS_COOLDOWN;

    ws.send(
      JSON.stringify({
        type: "trashGuessResult",
        success: false,
        message: `Не-а, это ${SUIT_EMOJI[state.secretSuit]}. Следующая попытка через 3 минуты.`,
      }),
    );
  }
}

module.exports = {
  initializeTrashCans,
  handleTrashGuess,
  trashCansState,
  SUITS,
  SUIT_EMOJI,
};
