// misterTwisterServer.js — обновлённые правила выплат 2025

const REEL_STRIP = [
  0, 1, 2, 3, 3, 4, 5, 6, 7, 8, 9, 1, 2, 4, 5, 6, 8, 9, 0, 3, 3, 7,
];

const REEL_LENGTH = REEL_STRIP.length;

const JACKPOT_TRIGGER_COMBOS = new Set([
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

function getWinTextAndAmount(s1, s2, s3) {
  const combo = `${s1}${s2}${s3}`;
  const isTriple = s1 === s2 && s2 === s3;
  const sum = s1 + s2 + s3;

  let amount = 0;
  let parts = [];

  if (isTriple) {
    if (s1 === 7) amount += 200;
    else if (s1 === 0) amount += 100;
    else if (s1 === 5) amount += 50;
    else if (s1 === 4) amount += 80;
    else if (s1 === 6) amount += 60;
    else if (s1 === 8) amount += 80;
    else if (s1 === 9) amount += 75;
    else amount += 30; // 111,222,333

    parts.push(`${combo} ×${amount}`);
  }

  // Доп. бонус за сумму (независимо от тройки)
  if (sum === 7 || sum === 14 || sum === 21) {
    amount += 15;
    parts.push(`сумма ${sum} +15`);
  }

  if (parts.length === 0) {
    return { amount: 0, text: `${s1} ${s2} ${s3}` };
  }

  return {
    amount,
    text: parts.join(" + ") + ` → +${amount} баляров!`,
  };
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
  broadcastToWorld, // ← теперь функция передаётся четвёртым аргументом
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
      const { amount: winAmount, text: resultText } = getWinTextAndAmount(
        s1,
        s2,
        s3,
      );

      let giveBonusPoint =
        (s1 === s2 && s2 === s3) || [7, 14, 21].includes(s1 + s2 + s3);
      let bonusWon = false;

      // Большой джекпот
      if (
        twisterState.bonusPoints >= 11 &&
        JACKPOT_TRIGGER_COMBOS.has(comboStr)
      ) {
        winAmount = 75;
        bonusWon = true;
        resultText = `БОЛЬШОЙ ДЖЕКПОТ! ${comboStr} → 75 баляров!`;
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
            message: `Игрок ${playerId} сорвал БОЛЬШОЙ ДЖЕКПОТ 75 баляров!`,
            color: "#ff9900",
          }),
        );
      }

      // Зачисляем выигрыш
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

      // Даём бонусный пункт (кроме случая большого джекпота — там уже обнулили)
      if (
        giveBonusPoint &&
        !bonusWon &&
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

        // Рассылаем обновление шкалы всем
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

      saveUserDatabase(dbCollection, playerId, player);

      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: bonusWon ? "bonusWin" : "spinResult",
          balance: player.inventory[balyarySlotIndex]?.quantity || 0,
          bonusPoints: twisterState.bonusPoints,
          myBonusPointGiven:
            twisterState.playersWhoGavePointThisCycle.has(playerId),
          result: `${s1} ${s2} ${s3}`,
          displayResult: resultText,
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

module.exports = { handleTwisterMessage };
