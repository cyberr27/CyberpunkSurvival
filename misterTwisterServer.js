// misterTwisterServer.js — НОВЫЕ ВЫИГРЫШИ + 11 лампочек

const REEL_STRIP = [
  0, 1, 2, 3, 3, 4, 5, 6, 7, 8, 9, 1, 2, 4, 5, 6, 8, 9, 0, 3, 3, 7,
];

const REEL_LENGTH = REEL_STRIP.length;

const twisterState = {
  bonusPoints: 0,
  playersWhoGavePointThisCycle: new Set(),
};

const TRIPLE_PAYOUTS = {
  0: 100, // 000 ×100
  1: 30, // 111 ×30
  2: 30, // 222 ×30
  3: 30, // 333 ×30
  4: 80, // 444 ×80
  5: 50, // 555 ×50
  6: 60, // 666 ×60
  7: 200, // 777 ×200 (редко!)
  8: 80, // 888 ×80
  9: 75, // 999 ×75
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
      const resultTextBase = `${s1} ${s2} ${s3}`;

      let winAmount = 0;
      let giveBonusPoint = false;
      let resultText = resultTextBase;
      let isJackpot = false;

      // 1. ТРОЙКИ — главная фича
      if (s1 === s2 && s2 === s3) {
        giveBonusPoint = true;
        winAmount = TRIPLE_PAYOUTS[s1] || 30;
        resultText = `${s1} ${s2} ${s3} ×${winAmount}`;
      }

      // 2. СУММА 7, 14, 21 — дополнительный выигрыш
      if ([7, 14, 21].includes(sum)) {
        const sumBonus = 15;
        winAmount += sumBonus;
        giveBonusPoint = true;
        resultText += ` (сумма ${sum}! +${sumBonus})`;

        // Если тройка И сумма=7 → оба приза суммируются (редко, но возможно!)
        if (s1 === s2 && s2 === s3 && sum === 7) {
          resultText += " ДВОЙНОЙ БОНУС!";
        }
      }

      // 3. ДЖЕКПОТ — ЛЮБАЯ ТРОЙКА при 11/11
      if (twisterState.bonusPoints >= 11 && s1 === s2 && s2 === s3) {
        winAmount = 75;
        isJackpot = true;
        resultText = `🎰 ДЖЕКПОТ! ${s1}${s2}${s3} → 75 баляров! 🎰`;

        // СБРОС ШКАЛЫ
        twisterState.bonusPoints = 0;
        twisterState.playersWhoGavePointThisCycle.clear();

        broadcastToWorld(
          wss,
          clients,
          players,
          player.worldId,
          JSON.stringify({
            type: "notification",
            message: `${player.id} СОРВАЛ ДЖЕКПОТ! 75 баляров! 🎰`,
            color: "#ffff00",
          }),
        );
      }

      // Начисляем выигрыш
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

      // Даём очко бонуса (один раз за цикл)
      if (
        giveBonusPoint &&
        !twisterState.playersWhoGavePointThisCycle.has(playerId)
      ) {
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
              message: "ШКАЛА ЗАПОЛНЕНА! Лови любую тройку для ДЖЕКПОТА!",
              color: "#ffaa00",
            }),
          );
        }
      }

      saveUserDatabase(dbCollection, playerId, player);

      // ← ОТПРАВЛЯЕМ ТОЧНО КАК БЫЛО — для анимации!
      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: isJackpot ? "bonusWin" : "spinResult",
          balance: player.inventory[balyarySlotIndex]?.quantity || 0,
          bonusPoints: twisterState.bonusPoints,
          myBonusPointGiven:
            twisterState.playersWhoGavePointThisCycle.has(playerId),
          result: resultText, // ← Клиент парсит это для анимации!
          won: winAmount > 0,
          shouldAnimate: true,
          wonAmount: winAmount, // ← Для нотификации
        }),
      );

      // Бroadcast состояния лампочек
      if (giveBonusPoint) {
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
