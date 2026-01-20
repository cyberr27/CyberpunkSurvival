// misterTwisterServer.js

const REEL_STRIP = [
  0, 1, 2, 3, 3, 4, 5, 6, 7, 8, 9, 1, 2, 4, 5, 6, 8, 9, 0, 3, 3, 7,
];

const REEL_LENGTH = REEL_STRIP.length;

const twisterState = {
  bonusPoints: 0,
  playersWhoGavePointThisCycle: new Set(),
  lastJackpotWinner: null,
};

const JACKPOT_COMBO_REQUIRED_POINTS = 11;
const JACKPOT_AMOUNT = 75;

const TRIPLE_PAYOUTS = {
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
  broadcastFn,
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
      let balyarySlotIndex = player.inventory.findIndex(
        (s) => s?.type === "balyary",
      );
      let balyaryCount =
        balyarySlotIndex !== -1
          ? player.inventory[balyarySlotIndex]?.quantity || 1
          : 0;

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

      const combo = [s1, s2, s3];
      const comboStr = `${s1}${s2}${s3}`;
      const sum = s1 + s2 + s3;

      let winAmount = 0;
      let giveBonusPoint = false;
      let resultText = `${s1} ${s2} ${s3}`;
      let isJackpot = false;

      const isTriple = s1 === s2 && s2 === s3;

      if (isTriple) {
        giveBonusPoint = true;
        winAmount = TRIPLE_PAYOUTS[s1] || 30;
        resultText = `${s1} ${s2} ${s3} × ${winAmount}`;
      }

      // сумма 7, 14, 21
      if ([7, 14, 21].includes(sum)) {
        winAmount += 15;
        giveBonusPoint = true;
        resultText +=
          sum === 7
            ? " (сумма 7!)"
            : sum === 14
              ? " (сумма 14!)"
              : " (сумма 21!)";
      }

      // Джекпот — только при 11 очках И тройка
      if (
        twisterState.bonusPoints >= JACKPOT_COMBO_REQUIRED_POINTS &&
        isTriple
      ) {
        winAmount = JACKPOT_AMOUNT;
        isJackpot = true;
        resultText = `ДЖЕКПОТ! ${comboStr} → ${JACKPOT_AMOUNT} баляров!`;

        twisterState.bonusPoints = 0;
        twisterState.playersWhoGavePointThisCycle.clear();
        twisterState.lastJackpotWinner = playerId;

        broadcastFn(
          wss,
          clients,
          players,
          player.worldId,
          JSON.stringify({
            type: "notification",
            message: `Игрок ${player.id} СОРВАЛ ДЖЕКПОТ МИСТЕРА ТВИСТЕРА — ${JACKPOT_AMOUNT} баляров!`,
            color: "#ffff00",
            duration: 8000,
          }),
        );
      }

      // Начисляем выигрыш
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

      // Даём очко бонуса (если ещё не давал в этом цикле)
      if (
        giveBonusPoint &&
        !twisterState.playersWhoGavePointThisCycle.has(playerId)
      ) {
        twisterState.playersWhoGavePointThisCycle.add(playerId);
        twisterState.bonusPoints = Math.min(
          JACKPOT_COMBO_REQUIRED_POINTS,
          twisterState.bonusPoints + 1,
        );

        if (twisterState.bonusPoints === JACKPOT_COMBO_REQUIRED_POINTS) {
          broadcastFn(
            wss,
            clients,
            players,
            player.worldId,
            JSON.stringify({
              type: "notification",
              message: "Шкала Мистера Твистера заполнена! Лови любую тройку!",
              color: "#ffaa00",
              duration: 5000,
            }),
          );
        }
      }

      saveUserDatabase(dbCollection, playerId, player);

      // Отправляем клиенту результат анимации
      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: "spinResult",
          balance:
            player.inventory.find((s) => s?.type === "balyary")?.quantity || 0,
          bonusPoints: twisterState.bonusPoints,
          myBonusPointGiven:
            twisterState.playersWhoGavePointThisCycle.has(playerId),
          shouldAnimate: true,
          symbols: [s1, s2, s3],
        }),
      );

      // После того как клиент доиграет анимацию — он запросит финальный результат
      break;
    }

    case "getResultAfterAnim": {
      // Клиент запросил финальный текст после остановки анимации
      const lastBalance =
        player.inventory.find((s) => s?.type === "balyary")?.quantity || 0;

      // Здесь можно было бы хранить последний результат на сервере, но для простоты
      // просто отправляем текущий state + сообщение что анимация закончена
      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: "finalResult",
          shouldShowResult: true,
          resultText: "", // клиент сам знает символы, сервер только подтверждает
          wonAmount: 0, // ← здесь должно быть реальное значение, но для упрощения оставляем 0
          balance: lastBalance,
          bonusPoints: twisterState.bonusPoints,
        }),
      );

      break;
    }

    default:
      console.log("Неизвестный подтип twister:", message.subtype);
  }
}

module.exports = { handleTwisterMessage };
