// misterTwisterServer.js

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
  0o0: 100,
  555: 50,
  444: 80,
  666: 60,
  888: 80,
  999: 75,
  111: 30,
  222: 30,
  333: 30,
};

const twisterState = {
  bonusPoints: 0,
  playersWhoGavePointThisCycle: new Set(),
  lastBonusWinner: null,
};

function getRandomReelPosition() {
  return Math.floor(Math.random() * REEL_LENGTH);
}

function getSymbolAt(position) {
  return REEL_STRIP[position];
}

function handleTwisterMessage(
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

      // снимаем 1 баляр
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

      // 1. Три одинаковые
      if (isTriple) {
        giveBonusPoint = true;
        if (comboStr in JACKPOT_MULTIPLIERS) {
          winAmount += JACKPOT_MULTIPLIERS[comboStr];
        }
        // 777 даёт ещё +15 от суммы
        if (comboStr === "777") {
          winAmount += 15;
        }
      }
      // 2. НЕ тройка, но сумма 7/14/21
      else if (sum === 7 || sum === 14 || sum === 21) {
        winAmount += 15;
        giveBonusPoint = true;
      }

      // Большой джекпот (80) — любая тройка при 11/11
      if (twisterState.bonusPoints >= 11 && JACKPOT_TRIGGERS.has(comboStr)) {
        winAmount = 80;
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
            message: `Игрок ${player.id || playerId} сорвал БОЛЬШОЙ ДЖЕКПОТ 80 баляров!`,
            color: "#ffff00",
          }),
        );
      }

      // Добавляем выигрыш
      if (winAmount > 0) {
        if (balyarySlotIndex !== -1) {
          player.inventory[balyarySlotIndex].quantity =
            (player.inventory[balyarySlotIndex].quantity || 1) + winAmount;
        } else {
          const free = player.inventory.findIndex((s) => s === null);
          if (free !== -1) {
            player.inventory[free] = { type: "balyary", quantity: winAmount };
          }
        }
      }

      // Даём пункт в шкалу (если не джекпот)
      if (giveBonusPoint && !isBigJackpot) {
        if (!twisterState.playersWhoGavePointThisCycle.has(playerId)) {
          twisterState.playersWhoGavePointThisCycle.add(playerId);
          twisterState.bonusPoints = Math.min(11, twisterState.bonusPoints + 1);

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
      }

      saveUserDatabase(dbCollection, playerId, player);

      // Ответ клиенту: символы для анимации + чистая сумма
      const resultSymbols = `${s1} ${s2} ${s3}`;

      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: isBigJackpot ? "bonusWin" : "spinResult",
          balance:
            winAmount > 0
              ? player.inventory[balyarySlotIndex]?.quantity || 0
              : undefined,
          bonusPoints: twisterState.bonusPoints,
          myBonusPointGiven:
            twisterState.playersWhoGavePointThisCycle.has(playerId),
          symbols: resultSymbols, // ← для анимации
          winAmount: winAmount, // ← чистое число
          won: winAmount > 0,
          shouldAnimate: true,
        }),
      );

      // Если пункт добавлен — обновляем шкалу всем
      if (giveBonusPoint && !isBigJackpot) {
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
      }

      break;
    }

    default:
      console.log("Неизвестный подтип twister:", message.subtype);
  }
}

module.exports = { handleTwisterMessage };
