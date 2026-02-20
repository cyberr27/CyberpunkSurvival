// playerStateSequence.js

/** @typedef {Object} SequenceState
 *  @property {number} clientSeq           - последний seq, принятый от клиента
 *  @property {number} serverSeq           - seq, который сервер присвоил последнему валидному состоянию
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

  // Для остальных действий — разрешаем, если seq не сильно устарел
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

  // Сортируем очередь по seq (на случай перепутанных пакетов)
  state.pendingQueue.sort((a, b) => a.seq - b.seq);

  // Запускаем обработку, если ещё не идёт
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

    // Пропускаем устаревшие пакеты (опционально)
    if (Date.now() - msg.receivedAt > 15000) {
      state.pendingQueue.shift();
      continue;
    }

    // ← Здесь будет вызов applyMessage (она теперь в websocket.js)
    const applied = await applyMessage(playerId, msg.type, msg.data, msg.seq);

    if (applied) {
      state.clientSeq = Math.max(state.clientSeq, msg.seq);
      state.serverSeq += 1;
      state.pendingQueue.shift();
    } else {
      // Не применилось → отбрасываем (можно улучшить позже)
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
};
