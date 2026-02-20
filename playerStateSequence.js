// playerStateSequence.js

/**
 * @typedef {Object} SequenceState
 * @property {number} clientSeq - последний seq, принятый от клиента
 * @property {number} serverSeq - seq, который сервер присвоил последнему валидному состоянию
 */

/** @type {Map<string, SequenceState>} */
const playerSequences = new Map();

function initSequenceForPlayer(playerId) {
  playerSequences.set(playerId, {
    clientSeq: -1,
    serverSeq: 0,
  });
}

function shouldAcceptClientUpdate(playerId, incomingClientSeq) {
  const state = playerSequences.get(playerId);
  if (!state) return true; // первый пакет после логина

  // Принимаем только строго возрастающие seq
  return incomingClientSeq > state.clientSeq;
}

function acceptClientUpdate(playerId, incomingClientSeq) {
  const state = playerSequences.get(playerId);
  if (!state) {
    initSequenceForPlayer(playerId);
    return;
  }

  state.clientSeq = incomingClientSeq;
  state.serverSeq += 1;
}

function getNextServerSeq(playerId) {
  const state = playerSequences.get(playerId);
  if (!state) {
    initSequenceForPlayer(playerId);
    return 0;
  }
  return state.serverSeq;
}

function getCurrentServerSeq(playerId) {
  return playerSequences.get(playerId)?.serverSeq ?? 0;
}

function cleanupSequence(playerId) {
  playerSequences.delete(playerId);
}

module.exports = {
  shouldAcceptClientUpdate,
  acceptClientUpdate,
  getNextServerSeq,
  getCurrentServerSeq,
  cleanupSequence,
  initSequenceForPlayer,
};
