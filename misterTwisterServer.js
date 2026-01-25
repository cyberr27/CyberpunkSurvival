// misterTwisterServer.js — поддержка нескольких независимых Twister-автоматов

const REEL_STRIP = [
  0, 1, 2, 3, 3, 4, 5, 6, 7, 8, 9, 1, 2, 4, 5, 6, 8, 9, 0, 3, 3, 7,
];

const REEL_LENGTH = REEL_STRIP.length;

const JACKPOT_TRIGGERS = new Set([
  "000",
  "111",
  "222",
  "333",
  "444",
  "555",
  "666",
  "777",
  "888",
  "999",
]);

const BASE_TRIPLE_PAYOUTS = {
  "000": 100,
  111: 30,
  222: 30,
  333: 30,
  444: 70,
  555: 50,
  666: 60,
  777: 200,
  888: 70,
  999: 75,
};

const BIG_JACKPOT_BONUS = 80;

// ---------------------- МНОЖЕСТВЕННЫЕ АВТОМАТЫ ----------------------
const TWISTER_LOCATIONS = [
  { id: "twister_0", name: "Главный", x: 219, y: 2656 },
  { id: "twister_1", name: "Верхний", x: 391, y: 159 },
  { id: "twister_2", name: "Нижний", x: 1684, y: 421 },
];

const twisterStates = {};

TWISTER_LOCATIONS.forEach((loc) => {
  twisterStates[loc.id] = {
    bonusPoints: 0,
    playersWhoGavePointThisCycle: new Set(),
    lastBonusWinner: null,
  };
});

async function loadTwisterStates(dbCollection) {
  for (const loc of TWISTER_LOCATIONS) {
    try {
      const doc = await dbCollection.findOne({
        _id: `twister_state_${loc.id}`,
      });
      if (doc) {
        twisterStates[loc.id].bonusPoints = doc.bonusPoints || 0;
        console.log(
          `[Twister ${loc.id}] Загружено bonusPoints = ${twisterStates[loc.id].bonusPoints}`,
        );
      }
    } catch (err) {
      console.error(`[Twister ${loc.id}] Ошибка загрузки:`, err);
    }
  }
}

async function saveTwisterState(dbCollection, twisterId) {
  try {
    await dbCollection.updateOne(
      { _id: `twister_state_${twisterId}` },
      {
        $set: {
          bonusPoints: twisterStates[twisterId].bonusPoints,
          lastUpdate: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error(`[Twister ${twisterId}] Ошибка сохранения:`, err);
  }
}

function getRandomReelPosition() {
  return Math.floor(Math.random() * REEL_LENGTH);
}

function getSymbolAt(position) {
  return REEL_STRIP[position];
}

async function handleTwisterMessage(
  ws,
  message,
  players,
  clients,
  wss,
  playerId,
  saveUserDatabase,
  dbCollection,
  broadcastToWorld,
) {
  const player = players.get(playerId);
  if (!player) return;

  const twisterId = message.twisterId || "twister_0"; // по умолчанию главный
  if (!twisterStates[twisterId]) {
    ws.send(
      JSON.stringify({
        type: "twister",
        subtype: "error",
        error: "Неизвестный автомат",
      }),
    );
    return;
  }

  const state = twisterStates[twisterId];

  switch (message.subtype) {
    case "getState": {
      let balyaryCount = 0;
      if (player.inventory) {
        const slot = player.inventory.find((s) => s?.type === "balyary");
        balyaryCount = slot ? slot.quantity || 1 : 0;
      }

      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: "state",
          twisterId,
          balance: balyaryCount,
          bonusPoints: state.bonusPoints,
          myBonusPointGiven: state.playersWhoGavePointThisCycle.has(playerId),
          shouldAnimate: false,
        }),
      );
      break;
    }

    case "spin": {
      let balyarySlotIndex = -1;
      let balyaryCount = 0;

      if (player.inventory) {
        balyarySlotIndex = player.inventory.findIndex(
          (s) => s?.type === "balyary",
        );
        if (balyarySlotIndex !== -1) {
          balyaryCount = player.inventory[balyarySlotIndex]?.quantity || 1;
        }
      }

      if (balyaryCount < 1) {
        ws.send(
          JSON.stringify({
            type: "twister",
            subtype: "spinResult",
            twisterId,
            error: "Недостаточно баляров",
            balance: balyaryCount,
          }),
        );
        return;
      }

      // Снимаем 1 баляр
      if (balyaryCount === 1) {
        player.inventory[balyarySlotIndex] = null;
      } else {
        player.inventory[balyarySlotIndex].quantity -= 1;
      }

      const pos1 = getRandomReelPosition();
      const pos2 = getRandomReelPosition();
      const pos3 = getRandomReelPosition();

      const s1 = getSymbolAt(pos1);
      const s2 = getSymbolAt(pos2);
      const s3 = getSymbolAt(pos3);

      const comboStr = `${s1}${s2}${s3}`;
      const sum = s1 + s2 + s3;

      let winAmount = 0;
      let giveBonusPoint = false;
      let isBigJackpot = false;

      const isTriple = s1 === s2 && s2 === s3;

      if (state.bonusPoints >= 11) {
        state.playersWhoGavePointThisCycle.clear();
      }

      const countOfSevens = [s1, s2, s3].filter((x) => x === 7).length;

      if (countOfSevens === 2 && !isTriple) {
        winAmount = 2;
      } else if (countOfSevens === 1) {
        winAmount = 1;
      } else if (isTriple && JACKPOT_TRIGGERS.has(comboStr)) {
        winAmount = BASE_TRIPLE_PAYOUTS[comboStr];
        giveBonusPoint = true;

        if (state.bonusPoints >= 11) {
          winAmount += BIG_JACKPOT_BONUS;
          isBigJackpot = true;
          giveBonusPoint = false;
          state.bonusPoints = 0;
          state.playersWhoGavePointThisCycle.clear();
          state.lastBonusWinner = playerId;

          broadcastToWorld(
            wss,
            clients,
            players,
            player.worldId,
            JSON.stringify({
              type: "notification",
              message: `Игрок ${player.id || playerId} сорвал БОЛЬШОЙ ДЖЕКПОТ ${winAmount} баляров на ${TWISTER_LOCATIONS.find((l) => l.id === twisterId)?.name || twisterId}!`,
              color: "#ffff00",
            }),
          );
        }
      } else if (sum === 7) {
        winAmount = 3;
        giveBonusPoint = true;
      } else if (sum === 14) {
        winAmount = 6;
        giveBonusPoint = true;
      } else if (sum === 21) {
        winAmount = 9;
        giveBonusPoint = true;
      }

      if (winAmount > 0) {
        let balyarySlot = player.inventory.find((s) => s?.type === "balyary");
        if (balyarySlot) {
          balyarySlot.quantity = (balyarySlot.quantity || 0) + winAmount;
        } else {
          const free = player.inventory.findIndex((s) => s === null);
          if (free !== -1) {
            player.inventory[free] = { type: "balyary", quantity: winAmount };
          }
        }
        player.xp = (player.xp || 0) + winAmount;
      }

      if (giveBonusPoint && !isBigJackpot) {
        state.bonusPoints = Math.min(11, state.bonusPoints + 1);
        await saveTwisterState(dbCollection, twisterId);

        broadcastToWorld(
          wss,
          clients,
          players,
          player.worldId,
          JSON.stringify({
            type: "twister",
            subtype: "state",
            twisterId,
            bonusPoints: state.bonusPoints,
          }),
        );

        if (state.bonusPoints === 11) {
          broadcastToWorld(
            wss,
            clients,
            players,
            player.worldId,
            JSON.stringify({
              type: "notification",
              message: `Бонусная шкала заполнена на автомате ${TWISTER_LOCATIONS.find((l) => l.id === twisterId)?.name || twisterId}! Лови любую тройку!`,
              color: "#ffaa00",
            }),
          );
        }
      }

      await saveUserDatabase(dbCollection, playerId, player);

      const resultSymbols = `${s1} ${s2} ${s3}`;
      const balanceAfter =
        player.inventory.find((s) => s?.type === "balyary")?.quantity || 0;

      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: isBigJackpot ? "bonusWin" : "spinResult",
          twisterId,
          balance: balanceAfter,
          bonusPoints: state.bonusPoints,
          myBonusPointGiven: state.playersWhoGavePointThisCycle.has(playerId),
          symbols: resultSymbols,
          winAmount,
          won: winAmount > 0,
          shouldAnimate: true,
          xpGained: winAmount > 0 ? winAmount : 0,
        }),
      );

      break;
    }

    default:
      console.log(
        `Неизвестный подтип twister (${twisterId}):`,
        message.subtype,
      );
  }
}

module.exports = {
  handleTwisterMessage,
  loadTwisterStates,
  saveTwisterState, // если где-то вызывается — можно оставить
  TWISTER_LOCATIONS, // для удобства на клиенте
};
