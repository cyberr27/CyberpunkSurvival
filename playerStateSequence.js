// playerStateSequence.js

/** @typedef {Object} SequenceState
 *  @property {number} clientSeq
 *  @property {number} serverSeq
 *  @property {Array<{seq:number, type:string, data:any, receivedAt:number}>} pendingQueue
 *  @property {boolean} isProcessing
 */

/** @type {Map<string, SequenceState>} */
const playerSequences = new Map();

function initSequenceForPlayer(playerId) {
  playerSequences.set(playerId, {
    clientSeq: -1,
    serverSeq: 0,
    pendingQueue: [],
    isProcessing: false,
  });
}

/**
 * Проверяет, стоит ли принимать сообщение в очередь
 * @returns {boolean}
 */
function shouldEnqueueClientMessage(playerId, incomingClientSeq, messageType) {
  const state = playerSequences.get(playerId);
  if (!state) return true;

  if (messageType === "move" || messageType === "update") {
    return incomingClientSeq > state.clientSeq;
  }

  return incomingClientSeq >= state.clientSeq - 5;
}

/**
 * Кладёт сообщение в очередь и запускает обработку
 * @param {string} playerId
 * @param {number} incomingClientSeq
 * @param {string} messageType
 * @param {any} data
 * @param {(playerId: string, type: string, payload: any, seq: number) => Promise<boolean>} applyCallback
 */
function enqueueClientMessage(
  playerId,
  incomingClientSeq,
  messageType,
  data,
  applyCallback,
) {
  let state = playerSequences.get(playerId);
  if (!state) {
    initSequenceForPlayer(playerId);
    state = playerSequences.get(playerId);
  }

  // Защита от вызова без callback (на случай, если забудешь передать)
  if (typeof applyCallback !== "function") {
    console.error(`[QUEUE] Нет applyCallback для ${playerId} / ${messageType}`);
    return;
  }

  state.pendingQueue.push({
    seq: incomingClientSeq,
    type: messageType,
    data,
    receivedAt: Date.now(),
  });

  state.pendingQueue.sort((a, b) => a.seq - b.seq);

  if (!state.isProcessing) {
    processQueueAsync(playerId, applyCallback);
  }
}

/**
 * Обрабатывает очередь асинхронно
 * @param {string} playerId
 * @param {(playerId: string, type: string, payload: any, seq: number) => Promise<boolean>} applyCallback
 */
async function processQueueAsync(playerId, applyCallback) {
  const state = playerSequences.get(playerId);
  if (!state || state.isProcessing) return;

  state.isProcessing = true;

  while (state.pendingQueue.length > 0) {
    const msg = state.pendingQueue[0];

    if (Date.now() - msg.receivedAt > 15000) {
      state.pendingQueue.shift();
      continue;
    }

    // ← Вот где мы наконец применяем!
    const applied = await applyCallback(playerId, msg.type, msg.data, msg.seq);

    if (applied) {
      state.clientSeq = Math.max(state.clientSeq, msg.seq);
      state.serverSeq += 1;
      state.pendingQueue.shift();
    } else {
      // Не применилось — отбрасываем (можно добавить retry позже)
      state.pendingQueue.shift();
    }
  }

  state.isProcessing = false;
}

function getNextServerSeq(playerId) {
  return playerSequences.get(playerId)?.serverSeq ?? 0;
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
