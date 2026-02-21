// playerStateSequence.js

/**
 * @typedef {Object} SequenceState
 * @property {number} clientSeq - последний успешно обработанный seq от клиента
 * @property {number} serverSeq - счётчик успешных применённых move/update от сервера
 * @property {Array<{seq: number, type: string, data: Object, receivedAt: number}>} pendingQueue
 * @property {boolean} isProcessing - очередь уже обрабатывается
 */

/** @type {Map<string, SequenceState>} */
const playerSequences = new Map();

function initSequenceForPlayer(playerId) {
  if (playerSequences.has(playerId)) return;
  playerSequences.set(playerId, {
    clientSeq: -1,
    serverSeq: 0,
    pendingQueue: [],
    isProcessing: false,
  });
}

function cleanupSequence(playerId) {
  playerSequences.delete(playerId);
}

function getNextServerSeq(playerId) {
  const state = playerSequences.get(playerId);
  if (!state) return 0;
  state.serverSeq += 1;
  return state.serverSeq;
}

function shouldEnqueueClientMessage(playerId, seq, messageType) {
  if (messageType !== "move" && messageType !== "update") return false;

  const state = playerSequences.get(playerId);
  if (!state) return false;

  const now = Date.now();

  // Слишком старый порядковый номер — отбрасываем
  if (seq >= 0 && state.clientSeq >= 0 && seq < state.clientSeq - 80) {
    return false;
  }

  // Пакет без seq → принимаем только если очередь пуста и игрок только что зашёл
  if (seq < 0) {
    return state.pendingQueue.length === 0 && state.clientSeq === -1;
  }

  return true;
}

function enqueueClientMessage(playerId, seq, type, data, applyCallback) {
  const state = playerSequences.get(playerId);
  if (!state) return;

  state.pendingQueue.push({
    seq,
    type,
    data,
    receivedAt: Date.now(),
  });

  // Сортировка на случай сильного переупорядочивания
  state.pendingQueue.sort((a, b) => a.seq - b.seq);

  if (!state.isProcessing) {
    processQueueAsync(playerId, applyCallback).catch(console.error);
  }
}

async function processQueueAsync(playerId, applyCallback) {
  const state = playerSequences.get(playerId);
  if (!state || state.isProcessing) return;

  state.isProcessing = true;

  try {
    while (state.pendingQueue.length > 0) {
      const entry = state.pendingQueue[0];

      // Удаляем устаревшие пакеты
      if (Date.now() - entry.receivedAt > 18000) {
        // 18 сек — чуть мягче
        state.pendingQueue.shift();
        continue;
      }

      // Уже обработанные пакеты
      if (entry.seq >= 0 && entry.seq <= state.clientSeq) {
        state.pendingQueue.shift();
        continue;
      }

      const success = await applyCallback(
        playerId,
        entry.type,
        entry.data,
        entry.seq,
      );

      if (success) {
        const newServerSeq = getNextServerSeq(playerId);

        // Сохраняем состояние
        const player = players.get(playerId);
        if (player) {
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Подготовка и рассылка update
          const updateData = {
            id: playerId,
            seq: newServerSeq,
            x: player.x,
            y: player.y,
            direction: player.direction,
            state: player.state,
            frame: player.frame,
            health: player.health,
            energy: player.energy,
            food: player.food,
            water: player.water,
            armor: player.armor,
            distanceTraveled: player.distanceTraveled,
            meleeDamageBonus: player.meleeDamageBonus || 0,
          };

          if (player.state === "attacking") {
            updateData.attackFrame = player.attackFrame ?? 0;
            updateData.attackFrameTime = player.attackFrameTime ?? 0;
          }

          broadcastToWorld(
            wss,
            clients,
            players,
            player.worldId,
            JSON.stringify({ type: "update", player: updateData }),
          );

          // Подтверждение конкретному клиенту
          const ws = [...wss.clients].find((c) => clients.get(c) === playerId);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "actionConfirmed",
                seq: entry.seq,
                serverSeq: newServerSeq,
              }),
            );
          }
        }

        if (entry.seq >= 0) {
          state.clientSeq = Math.max(state.clientSeq, entry.seq);
        }

        state.pendingQueue.shift();
      } else {
        // Коллизия / отклонение → ждём следующего пакета (клиент сам перешлёт корректные данные)
        break;
      }
    }
  } finally {
    state.isProcessing = false;
  }
}

module.exports = {
  initSequenceForPlayer,
  cleanupSequence,
  shouldEnqueueClientMessage,
  enqueueClientMessage,
  getNextServerSeq,
};
