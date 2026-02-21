/**
 * @typedef {Object} SequenceState
 * @property {number} clientSeq           Последний успешно применённый seq от клиента
 * @property {number} serverSeq           Последний выданный сервером seq (для подтверждений)
 * @property {{seq: number, type: string, data: any, receivedAt: number}[]} pendingQueue
 * @property {boolean} isProcessing       Флаг, что очередь уже обрабатывается (предотвращает параллельные processQueue)
 */

/** @type {Map<string, SequenceState>} */
const playerSequences = new Map();

/**
 * Инициализация состояния последовательности для нового игрока
 * @param {string} playerId
 */
function initSequenceForPlayer(playerId) {
  if (!playerSequences.has(playerId)) {
    playerSequences.set(playerId, {
      clientSeq: -1,
      serverSeq: 0,
      pendingQueue: [],
      isProcessing: false,
    });
  }
}

/**
 * Нужно ли ставить сообщение в очередь на обработку
 * @param {string} playerId
 * @param {number} incomingSeq
 * @param {string} messageType
 * @returns {boolean}
 */
function shouldEnqueueClientMessage(playerId, incomingSeq, messageType) {
  const state = playerSequences.get(playerId);
  if (!state) return false;

  // Критически важные для порядка сообщения — только строго по возрастанию
  const strictOrderTypes = new Set(["move", "update"]);

  if (strictOrderTypes.has(messageType)) {
    return incomingSeq > state.clientSeq;
  }

  // Остальные действия допускают небольшое отставание (защита от очень старых пакетов)
  return (
    incomingSeq >= state.clientSeq - 5 && incomingSeq <= state.clientSeq + 50
  );
}

/**
 * Добавить сообщение в очередь игрока
 * @param {string} playerId
 * @param {number} seq
 * @param {string} type
 * @param {any} data
 * @param {(playerId: string, type: string, payload: any, clientSeq: number) => Promise<boolean>} applyCallback
 */
function enqueueClientMessage(playerId, seq, type, data, applyCallback) {
  const state = playerSequences.get(playerId);
  if (!state) return;

  state.pendingQueue.push({
    seq,
    type,
    data,
    receivedAt: Date.now(),
  });

  // Сортируем очередь по seq (на случай получения пакетов не по порядку)
  state.pendingQueue.sort((a, b) => a.seq - b.seq);

  // Запускаем обработку очереди, если она ещё не запущена
  if (!state.isProcessing) {
    processQueueAsync(playerId, applyCallback).catch((err) => {
      console.error(`Ошибка обработки очереди для ${playerId}:`, err);
    });
  }
}

/**
 * Асинхронная обработка очереди сообщений игрока
 * @param {string} playerId
 * @param {(playerId: string, type: string, payload: any, clientSeq: number) => Promise<boolean>} applyCallback
 */
async function processQueueAsync(playerId, applyCallback) {
  const state = playerSequences.get(playerId);
  if (!state || state.isProcessing) return;

  state.isProcessing = true;

  try {
    const now = Date.now();

    while (state.pendingQueue.length > 0) {
      const msg = state.pendingQueue[0];

      // Удаляем очень старые пакеты (> 15 секунд)
      if (now - msg.receivedAt > 15_000) {
        state.pendingQueue.shift();
        console.warn(
          `Слишком старый пакет отброшен для ${playerId} seq=${msg.seq}`,
        );
        continue;
      }

      // Проверяем, можем ли уже применить этот пакет
      if (msg.seq <= state.clientSeq) {
        // Дубликат или уже обработанный → пропускаем
        state.pendingQueue.shift();
        continue;
      }

      // Пробуем применить
      const success = await applyCallback(
        playerId,
        msg.type,
        msg.data,
        msg.seq,
      );

      if (success) {
        state.clientSeq = msg.seq;
        state.serverSeq += 1;
        state.pendingQueue.shift();
      } else {
        // Не удалось применить (например, инвентарь полон, нет денег и т.д.)
        // Оставляем в очереди → будем пытаться снова на следующем тике
        break;
      }
    }
  } catch (err) {
    console.error(
      `Критическая ошибка в processQueueAsync для ${playerId}:`,
      err,
    );
  } finally {
    state.isProcessing = false;

    // Если в очереди что-то осталось — пробуем обработать снова
    if (state.pendingQueue.length > 0) {
      setImmediate(() => processQueueAsync(playerId, applyCallback));
    }
  }
}

/**
 * Получить следующий serverSeq для подтверждения клиенту
 * @param {string} playerId
 * @returns {number}
 */
function getNextServerSeq(playerId) {
  const state = playerSequences.get(playerId);
  return state ? state.serverSeq + 1 : 0;
}

/**
 * Очистка состояния при дисконнекте
 * @param {string} playerId
 */
function cleanupSequence(playerId) {
  playerSequences.delete(playerId);
}

module.exports = {
  initSequenceForPlayer,
  shouldEnqueueClientMessage,
  enqueueClientMessage,
  processQueueAsync,
  getNextServerSeq,
  cleanupSequence,
};
