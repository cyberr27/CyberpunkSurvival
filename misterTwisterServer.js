// misterTwisterServer.js — обновлённые выплаты по новым правилам 23.01.2026

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

// Новые базовые выплаты для любых троек (когда шкала НЕ полная)
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

// Дополнительные 80 баляров при полной шкале + тройка
const BIG_JACKPOT_BONUS = 80;

let twisterState = {
  bonusPoints: 0,
  playersWhoGavePointThisCycle: new Set(),
  lastBonusWinner: null,
};

async function loadTwisterState(dbCollection) {
  try {
    const doc = await dbCollection.findOne({ _id: "twister_global_state" });
    if (doc) {
      twisterState.bonusPoints = doc.bonusPoints || 0;
      console.log(
        `[Twister] Загружено bonusPoints = ${twisterState.bonusPoints}`,
      );
    }
  } catch (err) {
    console.error("[Twister] Ошибка загрузки состояния:", err);
  }
}

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

      // Сбрасываем множество, если шкала была полной (на всякий случай)
      if (twisterState.bonusPoints >= 11) {
        twisterState.playersWhoGavePointThisCycle.clear();
      }

      const countOfSevens = [s1, s2, s3].filter((x) => x === 7).length;

      // ─── Старые правила для 1 и 2 семёрок (остаются без изменений) ───
      if (countOfSevens === 2 && !isTriple) {
        winAmount = 2;
        giveBonusPoint = false;
      } else if (countOfSevens === 1) {
        winAmount = 1;
        giveBonusPoint = false;
      }

      // ─── НОВАЯ ЛОГИКА ТРОЕК ────────────────────────────────────────────────
      else if (isTriple && JACKPOT_TRIGGERS.has(comboStr)) {
        // Базовая выплата по таблице
        winAmount = BASE_TRIPLE_PAYOUTS[comboStr];

        // Даём +1 очко бонуса (если НЕ большой джекпот)
        giveBonusPoint = true;

        // Если шкала полная → большой джекпот +80
        if (twisterState.bonusPoints >= 11) {
          winAmount += BIG_JACKPOT_BONUS;
          isBigJackpot = true;
          giveBonusPoint = false; // не даём лишнее очко при большом джекпоте
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
      }

      // ─── Правила по сумме (остаются как были) ──────────────────────────────
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
        let balyarySlot = player.inventory.find((s) => s?.type === "balyary");
        if (balyarySlot) {
          balyarySlot.quantity = (balyarySlot.quantity || 0) + winAmount;
        } else {
          const free = player.inventory.findIndex((s) => s === null);
          if (free !== -1) {
            player.inventory[free] = { type: "balyary", quantity: winAmount };
          }
        }

        // ─── +XP равный выигрышу в балярах ───────────────────────────────
        player.xp = (player.xp || 0) + winAmount;

        // Здесь можно добавить вызов level-up проверки, если она есть
        // (но по твоим инструкциям — не трогаем лишнего)
      }

      // Добавляем бонус-очко, если положено
      if (giveBonusPoint && !isBigJackpot) {
        twisterState.bonusPoints = Math.min(11, twisterState.bonusPoints + 1);
        await saveTwisterState(dbCollection);

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

      // Сохраняем игрока (включая новый xp и баляры)
      await saveUserDatabase(dbCollection, playerId, player);

      const updatePayload = {
        type: "update",
        player: {
          id: playerId,
          inventory: player.inventory,
          xp: player.xp,
        },
      };

      broadcastToWorld(
        wss,
        clients,
        players,
        player.worldId,
        JSON.stringify(updatePayload),
      );

      const resultSymbols = `${s1} ${s2} ${s3}`;

      // Формируем ответ
      const balanceAfter =
        player.inventory.find((s) => s?.type === "balyary")?.quantity || 0;

      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: isBigJackpot ? "bonusWin" : "spinResult",
          balance: balanceAfter,
          bonusPoints: twisterState.bonusPoints,
          myBonusPointGiven:
            twisterState.playersWhoGavePointThisCycle.has(playerId),
          symbols: resultSymbols,
          winAmount,
          won: winAmount > 0,
          shouldAnimate: true,
          xpGained: winAmount > 0 ? winAmount : 0, // ← для клиента
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
  loadTwisterState,
  saveTwisterState,
};
