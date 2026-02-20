// playerStateSequence.js

/** @typedef {Object} SequenceState
 *  @property {number} clientSeq
 *  @property {number} serverSeq
 *  @property {Array<{seq:number, type:string, data:any, receivedAt:number}>} pendingQueue
 *  @property {boolean} isProcessing
 *  @property {Object|null} lastAppliedSnapshot
 */

/** @type {Map<string, SequenceState>} */
const playerSequences = new Map();

function initSequenceForPlayer(playerId) {
  playerSequences.set(playerId, {
    clientSeq: -1,
    serverSeq: 0,
    pendingQueue: [],
    isProcessing: false,
    lastAppliedSnapshot: null,
  });
}

function shouldEnqueueClientMessage(playerId, incomingClientSeq, messageType) {
  const state = playerSequences.get(playerId);
  if (!state) return true;

  // Для move/update — строгая последовательность
  if (messageType === "move" || messageType === "update") {
    return incomingClientSeq > state.clientSeq;
  }

  // Для остальных действий — разрешаем, если seq не сильно устарел (защита от очень старых пакетов)
  return incomingClientSeq >= state.clientSeq - 5;
}

function enqueueClientMessage(playerId, incomingClientSeq, messageType, data) {
  const state = playerSequences.get(playerId);
  if (!state) {
    initSequenceForPlayer(playerId);
    return;
  }

  state.pendingQueue.push({
    seq: incomingClientSeq,
    type: messageType,
    data,
    receivedAt: Date.now(),
  });

  // Сортируем очередь по seq (на случай, если пакеты пришли не по порядку)
  state.pendingQueue.sort((a, b) => a.seq - b.seq);

  // Запускаем обработку, если ещё не запущена
  if (!state.isProcessing) {
    processQueueAsync(playerId);
  }
}

async function processQueueAsync(playerId) {
  const state = playerSequences.get(playerId);
  if (!state || state.isProcessing) return;

  state.isProcessing = true;

  while (state.pendingQueue.length > 0) {
    const msg = state.pendingQueue[0];

    // Пропускаем слишком старые пакеты (опционально, защита)
    if (Date.now() - msg.receivedAt > 15000) {
      state.pendingQueue.shift();
      continue;
    }

    // Здесь будет вызываться реальная логика применения (см. ниже)
    const applied = await applyMessage(playerId, msg.type, msg.data, msg.seq);

    if (applied) {
      state.clientSeq = Math.max(state.clientSeq, msg.seq);
      state.serverSeq += 1;
      state.pendingQueue.shift();

      // Можно сохранить снапшот после успешного применения
      // state.lastAppliedSnapshot = getPlayerSnapshot(playerId);
    } else {
      // Если не удалось применить — ждём следующего тика или отбрасываем
      // Для простоты — отбрасываем и идём дальше
      state.pendingQueue.shift();
    }
  }

  state.isProcessing = false;
}

function getNextServerSeq(playerId) {
  const state = playerSequences.get(playerId);
  return state ? state.serverSeq : 0;
}

function getCurrentServerSeq(playerId) {
  return playerSequences.get(playerId)?.serverSeq ?? 0;
}

function cleanupSequence(playerId) {
  playerSequences.delete(playerId);
}

module.exports = {
  initSequenceForPlayer,
  shouldEnqueueClientMessage,
  enqueueClientMessage,
  getNextServerSeq,
  getCurrentServerSeq,
  cleanupSequence,
  // processQueueAsync и applyMessage НЕ экспортируем — они внутренние
};
