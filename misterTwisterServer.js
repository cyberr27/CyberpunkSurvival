// misterTwisterServer.js — с сохранением bonusPoints + новые правила 7-ок

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

const JACKPOT_MULTIPLIERS = {
  777: 200,
  "000": 100,
  555: 50,
  444: 80,
  666: 60,
  888: 80,
  999: 75,
  111: 30,
  222: 30,
  333: 30,
};

// Глобальное состояние (должно сохраняться между рестартами)
let twisterState = {
  bonusPoints: 0,
  playersWhoGavePointThisCycle: new Set(),
  lastBonusWinner: null,
};

// ───────────────────────────────────────────────
// Функция загрузки состояния из базы при старте сервера
// Вызывается один раз при запуске сервера (добавьте вызов в основной файл)
// ───────────────────────────────────────────────
async function loadTwisterState(dbCollection) {
  try {
    const doc = await dbCollection.findOne({ _id: "twister_global_state" });
    if (doc) {
      twisterState.bonusPoints = doc.bonusPoints || 0;
      // playersWhoGavePointThisCycle НЕ сохраняем — это цикл до 11
      console.log(
        `[Twister] Загружено bonusPoints = ${twisterState.bonusPoints}`,
      );
    }
  } catch (err) {
    console.error("[Twister] Ошибка загрузки состояния:", err);
  }
}

// ───────────────────────────────────────────────
// Функция сохранения состояния (вызывается после каждого изменения)
// ───────────────────────────────────────────────
async function saveTwisterState(dbCollection) {
  try {
    await dbCollection.updateOne(
      { _id: "twister_global_state" },
      {
        $set: {
          bonusPoints: twisterState.bonusPoints,
          lastUpdate: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error("[Twister] Ошибка сохранения состояния:", err);
  }
}

function getRandomReelPosition() {
  return Math.floor(Math.random() * REEL_LENGTH);
}

function getSymbolAt(position) {
  return REEL_STRIP[position];
}

function hasSeven(s1, s2, s3) {
  return s1 === 7 || s2 === 7 || s3 === 7;
}

function hasTwoSevens(s1, s2, s3) {
  const count = [s1, s2, s3].filter((x) => x === 7).length;
  return count === 2;
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
          balance: balyaryCount,
          bonusPoints: twisterState.bonusPoints,
          myBonusPointGiven:
            twisterState.playersWhoGavePointThisCycle.has(playerId),
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

      // Сбрасываем множество, если шкала была полной
      if (twisterState.bonusPoints >= 11) {
        twisterState.playersWhoGavePointThisCycle.clear();
      }

      const countOfSevens = [s1, s2, s3].filter((x) => x === 7).length;

      // ─── 1. Специальные правила только для 1 или 2 семёрок (кроме 777) ───
      if (countOfSevens === 2 && !isTriple) {
        winAmount = 2;
        giveBonusPoint = false;
      } else if (countOfSevens === 1) {
        winAmount = 1;
        giveBonusPoint = false;
      }

      // ─── 2. 777 — всегда особый случай ───
      else if (isTriple && comboStr === "777") {
        winAmount = 200;
        giveBonusPoint = true;
      }

      // ─── 3. Большой джекпот при полной шкале ───
      else if (
        twisterState.bonusPoints >= 11 &&
        JACKPOT_TRIGGERS.has(comboStr)
      ) {
        winAmount = JACKPOT_MULTIPLIERS[comboStr] || 80;
        isBigJackpot = true;
        twisterState.bonusPoints = 0;
        twisterState.playersWhoGavePointThisCycle.clear();
        twisterState.lastBonusWinner = playerId;

        broadcastToWorld(
          wss,
          clients,
          players,
          player.worldId,
          JSON.stringify({
            type: "notification",
            message: `Игрок ${player.id || playerId} сорвал БОЛЬШОЙ ДЖЕКПОТ ${winAmount} баляров!`,
            color: "#ffff00",
          }),
        );
      }

      // ─── 4. Обычные тройки (кроме 777, уже обработано выше) ───
      else if (isTriple && comboStr in JACKPOT_MULTIPLIERS) {
        winAmount = JACKPOT_MULTIPLIERS[comboStr];
        giveBonusPoint = true;
      }

      // ─── 5. Правила по сумме — только если ничего выше не сработало ───
      else if (sum === 7) {
        winAmount = 3;
        giveBonusPoint = true;
      } else if (sum === 14) {
        winAmount = 6;
        giveBonusPoint = true;
      } else if (sum === 21) {
        winAmount = 9;
        giveBonusPoint = true;
      }

      // Добавляем выигрыш в инвентарь
      if (winAmount > 0) {
        if (balyarySlotIndex !== -1 && player.inventory[balyarySlotIndex]) {
          player.inventory[balyarySlotIndex].quantity =
            (player.inventory[balyarySlotIndex].quantity || 0) + winAmount;
        } else {
          const free = player.inventory.findIndex((s) => s === null);
          if (free !== -1) {
            player.inventory[free] = { type: "balyary", quantity: winAmount };
          }
        }
      }

      if (giveBonusPoint && !isBigJackpot) {
        twisterState.bonusPoints = Math.min(11, twisterState.bonusPoints + 1);
        // Сохраняем в базу после каждого добавления
        await saveTwisterState(dbCollection);
        // Рассылка всем в мире (обновление шкалы)
        broadcastToWorld(
          wss,
          clients,
          players,
          player.worldId,
          JSON.stringify({
            type: "twister",
            subtype: "state",
            bonusPoints: twisterState.bonusPoints,
          }),
        );

        // Уведомление, когда шкала заполнена
        if (twisterState.bonusPoints === 11) {
          broadcastToWorld(
            wss,
            clients,
            players,
            player.worldId,
            JSON.stringify({
              type: "notification",
              message: "Бонусная шкала заполнена! Лови любую тройку!",
              color: "#ffaa00",
            }),
          );
        }
      }

      // Сохраняем игрока
      await saveUserDatabase(dbCollection, playerId, player);

      const resultSymbols = `${s1} ${s2} ${s3}`;

      // Отправляем результат + актуальный баланс
      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: isBigJackpot ? "bonusWin" : "spinResult",
          balance:
            player.inventory.find((s) => s?.type === "balyary")?.quantity || 0,
          bonusPoints: twisterState.bonusPoints,
          myBonusPointGiven:
            twisterState.playersWhoGavePointThisCycle.has(playerId),
          symbols: resultSymbols,
          winAmount,
          won: winAmount > 0,
          shouldAnimate: true,
        }),
      );

      break;
    }

    default:
      console.log("Неизвестный подтип twister:", message.subtype);
  }
}

module.exports = {
  handleTwisterMessage,
  loadTwisterState, // ← добавьте вызов в основной файл сервера
  saveTwisterState,
};
