

const REEL_STRIP = [
  0, 1, 2, 3, 3, 4, 5, 6, 7, 8, 9, 1, 2, 4, 5, 6, 8, 9, 0, 3, 3, 7,
];

const REEL_LENGTH = REEL_STRIP.length;

const twisterState = {
  bonusPoints: 0,
  playersWhoGavePointThisCycle: new Set(),
  lastJackpotWinner: null,
};

function getRandomReelPosition() {
  return Math.floor(Math.random() * REEL_LENGTH);
}

function getSymbolAt(position) {
  return REEL_STRIP[position % REEL_LENGTH];
}

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
        balyaryCount = slot ? slot.quantity || 0 : 0;
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
          balyaryCount = player.inventory[balyarySlotIndex]?.quantity || 0;
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
      let resultText = `${s1} ${s2} ${s3}`;
      let isJackpot = false;

      // ─── ТРОЙКИ ───────────────────────────────────────
      if (s1 === s2 && s2 === s3) {
        giveBonusPoint = true;

        const payouts = {
          0: 100,
          1: 30,
          2: 30,
          3: 30,
          4: 80,
          5: 50,
          6: 60,
          7: 200,
          8: 80,
          9: 75,
        };

        winAmount += payouts[s1] || 30;
        resultText = `${s1}${s1}${s1} × ${payouts[s1] || 30}`;
      }

      // ─── Сумма 7, 14, 21 ───────────────────────────────
      if ([7, 14, 21].includes(sum)) {
        winAmount += 15;
        giveBonusPoint = true;

        if (resultText.includes("×")) {
          resultText += ` + сумма ${sum} → +15`;
        } else {
          resultText += ` (сумма ${sum} → +15)`;
        }
      }

      // ─── ДЖЕКПОТ ───────────────────────────────────────
      if (twisterState.bonusPoints >= 11 && JACKPOT_TRIGGERS.has(comboStr)) {
        isJackpot = true;
        winAmount = 75;
        resultText = `ДЖЕКПОТ! ${comboStr} → 75 баляров!`;

        twisterState.bonusPoints = 0;
        twisterState.playersWhoGavePointThisCycle.clear();
        twisterState.lastJackpotWinner = playerId;

        broadcastToWorld(
          wss,
          clients,
          players,
          player.worldId,
          JSON.stringify({
            type: "notification",
            message: `Игрок ${player.id} сорвал ДЖЕКПОТ 75 баляров!`,
            color: "#ffff00",
          }),
        );
      }

      // Добавляем выигранные баляры
      if (winAmount > 0) {
        if (balyarySlotIndex !== -1) {
          player.inventory[balyarySlotIndex].quantity =
            (player.inventory[balyarySlotIndex].quantity || 0) + winAmount;
        } else {
          const free = player.inventory.findIndex((s) => s === null);
          if (free !== -1) {
            player.inventory[free] = { type: "balyary", quantity: winAmount };
          }
        }
      }

      // ─── Бонусное очко ─────────────────────────────────
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
              message: "Бонусная шкала заполнена! Лови любую тройку!",
              color: "#ffaa00",
            }),
          );
        }
      }

      saveUserDatabase(dbCollection, playerId, player);

      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: isJackpot ? "bonusWin" : "spinResult",
          balance:
            winAmount > 0
              ? player.inventory[balyarySlotIndex]?.quantity || 0
              : undefined,
          bonusPoints: twisterState.bonusPoints,
          myBonusPointGiven:
            twisterState.playersWhoGavePointThisCycle.has(playerId),
          result: resultText,
          winAmount,
          finalSymbols: [s1, s2, s3],
          shouldAnimate: true,
          jackpot: isJackpot,
        }),
      );

      // Если давали очко — рассылаем всем обновление шкалы
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
