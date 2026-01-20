// misterTwisterServer.js

const REEL_STRIP = [
  0, 1, 2, 3, 3, 4, 5, 6, 7, 8, 9, 1, 2, 4, 5, 6, 8, 9, 0, 3, 3, 7,
];

const REEL_LENGTH = REEL_STRIP.length;

const BONUS_TRIGGER_COMBOS = new Set(["555", "666", "888"]);

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

function addBalyaryToPlayer(player, amount) {
  if (amount <= 0) return;

  // 1. Ищем существующий слот
  let slotIdx = player.inventory.findIndex((s) => s?.type === "balyary");

  if (slotIdx !== -1) {
    player.inventory[slotIdx].quantity =
      (player.inventory[slotIdx].quantity || 1) + amount;
    return;
  }

  // 2. Ищем свободный слот
  const freeIdx = player.inventory.findIndex((s) => s === null);
  if (freeIdx !== -1) {
    player.inventory[freeIdx] = { type: "balyary", quantity: amount };
    return;
  }

  // 3. Инвентарь полон — пока просто логируем
  console.warn(
    `Не удалось добавить ${amount} баляров игроку ${player.id} — инвентарь полон`,
  );
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
  broadcastToWorld, // ← добавили сюда
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
      let resultText = `${s1} ${s2} ${s3}`;
      let bonusWon = false;

      if (s1 === s2 && s2 === s3) {
        giveBonusPoint = true;

        if (s1 === 7) winAmount = 10;
        else if (s1 === 0) winAmount = 50;
        else if (s1 === 3) winAmount = 20;
        else if (s1 === 4) winAmount = 25;
        else if (s1 === 9) winAmount = 30;
        else winAmount = 10;
      } else if (sum === 7) {
        winAmount = 5;
        giveBonusPoint = true;
        resultText += " (сумма 7!)";
      }

      if (
        twisterState.bonusPoints >= 11 &&
        BONUS_TRIGGER_COMBOS.has(comboStr)
      ) {
        winAmount = 75;
        bonusWon = true;
        resultText = `БОЛЬШОЙ БОНУС! ${s1} ${s2} ${s3} → 75 баляров!`;
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
            message: `Игрок сорвал БОНУСНЫЙ ДЖЕКПОТ 75 баляров!`,
            color: "#ffff00",
          }),
        );
      }

      if (winAmount > 0) {
        addBalyaryToPlayer(player, winAmount);
      }

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
              message: "Бонусная шкала заполнена! Лови 555/666/888!",
              color: "#ffaa00",
            }),
          );
        }
      }

      saveUserDatabase(dbCollection, playerId, player);

      // пересчитываем актуальный баланс
      const currentBalyarySlot = player.inventory.findIndex(
        (s) => s?.type === "balyary",
      );
      const currentBalance =
        currentBalyarySlot !== -1
          ? player.inventory[currentBalyarySlot]?.quantity || 0
          : 0;

      ws.send(
        JSON.stringify({
          type: "twister",
          subtype: bonusWon ? "bonusWin" : "spinResult",
          balance: currentBalance,
          bonusPoints: twisterState.bonusPoints,
          myBonusPointGiven:
            twisterState.playersWhoGavePointThisCycle.has(playerId),
          result: resultText,
          won: winAmount > 0,
          shouldAnimate: true,
        }),
      );

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
