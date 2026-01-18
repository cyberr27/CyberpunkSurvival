// misterTwisterServer.js

const twisterState = {
  bonusPoints: 0, // глобальный счётчик 0..11
  playersWhoGavePoint: new Set(), // кто уже давал очко в текущем цикле
  lastBonusWinner: null,
};

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
      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: "state",
          balance: Math.floor(player.balyary || 0),
          bonusPoints: twisterState.bonusPoints,
          myBonusPointGiven: twisterState.playersWhoGavePoint.has(playerId),
          shouldAnimate: false,
        }),
      );
      break;
    }

    case "spin": {
      if ((player.balyary || 0) < 1) {
        ws.send(
          JSON.stringify({
            type: "twister",
            subtype: "spinResult",
            error: "Недостаточно баляров",
            balance: player.balyary || 0,
          }),
        );
        return;
      }

      // Снимаем ставку
      player.balyary = Math.max(0, (player.balyary || 0) - 1);
      saveUserDatabase(dbCollection, playerId, player);

      // Генерация результата (честный RNG на сервере)
      const r1 = Math.floor(Math.random() * 10);
      const r2 = Math.floor(Math.random() * 10);
      const r3 = Math.floor(Math.random() * 10);

      let winMultiplier = 0;
      let giveBonusPoint = false;
      let resultText = `${r1} ${r2} ${r3}`;
      let isJackpot = false;
      let isBonusTrigger = false;

      if (r1 === r2 && r2 === r3) {
        giveBonusPoint = true;
        if (r1 === 7) {
          winMultiplier = 100;
          isJackpot = true;
          resultText = "ДЖЕКПОТ! 7-7-7 ×100!";
        } else if (r1 === 3) {
          winMultiplier = 30;
          resultText = "Три тройки! ×30";
        } else {
          winMultiplier = 20;
          resultText = `Три ${r1}! ×20`;
        }
      } else if (r1 + r2 + r3 === 7) {
        winMultiplier = 8;
        resultText = "Сумма 7! ×8";
      }

      let winAmount = winMultiplier > 0 ? winMultiplier : 0;

      // Бонус ×3, если счётчик заполнен и это триплет
      if (twisterState.bonusPoints >= 11 && giveBonusPoint) {
        winAmount *= 3;
        isBonusTrigger = true;
        resultText += " + БОНУС ×3!";
        twisterState.bonusPoints = 0;
        twisterState.playersWhoGavePoint.clear();
        twisterState.lastBonusWinner = playerId;
      }

      if (winAmount > 0) {
        player.balyary += winAmount;
        saveUserDatabase(dbCollection, playerId, player);
      }

      // Обновление бонусного счётчика
      if (giveBonusPoint && !twisterState.playersWhoGavePoint.has(playerId)) {
        twisterState.playersWhoGavePoint.add(playerId);
        twisterState.bonusPoints = Math.min(11, twisterState.bonusPoints + 1);

        // Уведомление о заполнении (всем в мире)
        if (twisterState.bonusPoints === 11) {
          broadcastToWorld(
            wss,
            clients,
            players,
            player.worldId,
            JSON.stringify({
              type: "notification",
              message: "Бонусная шкала заполнена! Следующий триплет — ×3!",
              color: "#ffaa00",
            }),
          );
        }
      }

      // Ответ игроку
      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: isJackpot
            ? "jackpot"
            : isBonusTrigger
              ? "bonusWin"
              : "spinResult",
          balance: player.balyary,
          bonusPoints: twisterState.bonusPoints,
          myBonusPointGiven: twisterState.playersWhoGavePoint.has(playerId),
          result: resultText,
          won: winMultiplier > 0,
          shouldAnimate: true,
        }),
      );

      // Рассылка обновления бонус-счётчика всем в мире
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

module.exports = {
  handleTwisterMessage,
};
