// misterTwisterServer.js — логика игрового автомата (серверная часть, источник правды)

let jackpot = 0;         // Накопительный джекпот
let bonusSteps = 0;      // Текущие бонусные ступени (0–10)
const MAX_BONUS_STEPS = 10;
const NUM_SYMBOLS = 40;  // 0–39

function playTwister(player, inventoryUpdateCallback) {
  // Проверяем наличие 1 баляра
  const balyarIndex = player.inventory.findIndex(
    slot => slot && slot.type === "balyary" && slot.quantity >= 1
  );

  if (balyarIndex === -1) {
    return { success: false, error: "Недостаточно баляров" };
  }

  // Снимаем 1 баляр
  player.inventory[balyarIndex].quantity -= 1;
  if (player.inventory[balyarIndex].quantity <= 0) {
    player.inventory[balyarIndex] = null;
  }

  // Джекпот растёт с каждой игры
  jackpot += 1;

  // Генерируем барабаны
  const reel1 = Math.floor(Math.random() * NUM_SYMBOLS);
  const reel2 = Math.floor(Math.random() * NUM_SYMBOLS);
  const reel3 = Math.floor(Math.random() * NUM_SYMBOLS);
  const reels = [reel1, reel2, reel3];

  let win = 0;
  let message = "Проигрыш";
  let jackpotWon = false;

  const isTriple = reel1 === reel2 && reel2 === reel3;

  if (isTriple) {
    if (reel1 === 0) {
      win = 50;
      message = "★★★ ТРИ НУЛЯ! 50× ★★★";
      bonusSteps += 1;
    } else if (reel1 === 7) {
      win = 200;
      message = "★★★ ТРИ СЕМЁРКИ! 200× ★★★";
      bonusSteps += 1;
    } else {
      win = 10;
      message = "Три одинаковые — 10×";
    }

    // Проверка на джекпот
    if (bonusSteps > MAX_BONUS_STEPS && (reel1 === 0 || reel1 === 7)) {
      win += jackpot;
      message += `\nДжекпот ${jackpot} баляров твой!`;
      jackpotWon = true;
      jackpot = 0;
      bonusSteps = 0;
    }
  }

  // Начисляем выигрыш балярами
  if (win > 0) {
    let balyarSlot = player.inventory.findIndex(slot => slot && slot.type === "balyary");
    if (balyarSlot === -1) {
      balyarSlot = player.inventory.findIndex(slot => slot === null);
      if (balyarSlot !== -1) {
        player.inventory[balyarSlot] = { type: "balyary", quantity: win };
      }
    } else {
      player.inventory[balyarSlot].quantity += win;
    }
  }

  // Обновляем инвентарь игрока на сервере
  inventoryUpdateCallback?.();

  return {
    success: true,
    reels,
    win,
    message,
    jackpot,
    bonusSteps,
    jackpotWon,
  };
}

function getCurrentState() {
  return { jackpot, bonusSteps };
}

function resetForTests() {
  jackpot = 0;
  bonusSteps = 0;
}

module.exports = {
  playTwister,
  getCurrentState,
  resetForTests,
};