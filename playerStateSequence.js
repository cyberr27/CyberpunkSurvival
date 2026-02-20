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

async function applyMessage(playerId, msgType, payload, clientSeq) {
  const player = players.get(playerId);
  if (!player) return false;

  let success = false;

  switch (msgType) {
    case "move":
    case "update": {
      const oldX = player.x;
      const oldY = player.y;

      // Применяем только разрешённые поля
      if (payload.x !== undefined) player.x = Number(payload.x);
      if (payload.y !== undefined) player.y = Number(payload.y);
      if (payload.direction) player.direction = payload.direction;
      if (payload.state) player.state = payload.state;
      if (payload.attackFrame !== undefined)
        player.attackFrame = Number(payload.attackFrame);
      if (payload.attackFrameTime !== undefined)
        player.attackFrameTime = Number(payload.attackFrameTime);
      if (payload.frame !== undefined) player.frame = Number(payload.frame);

      // Ограничиваем статы
      if (payload.health !== undefined)
        player.health = Math.max(
          0,
          Math.min(player.maxStats?.health || 100, Number(payload.health)),
        );
      if (payload.energy !== undefined)
        player.energy = Math.max(
          0,
          Math.min(player.maxStats?.energy || 100, Number(payload.energy)),
        );
      if (payload.food !== undefined)
        player.food = Math.max(
          0,
          Math.min(player.maxStats?.food || 100, Number(payload.food)),
        );
      if (payload.water !== undefined)
        player.water = Math.max(
          0,
          Math.min(player.maxStats?.water || 100, Number(payload.water)),
        );
      if (payload.armor !== undefined) player.armor = Number(payload.armor);
      if (payload.distanceTraveled !== undefined)
        player.distanceTraveled = Number(payload.distanceTraveled);

      // Проверка препятствий
      let positionValid = true;
      if (payload.x !== undefined || payload.y !== undefined) {
        for (const obs of obstacles) {
          if (obs.worldId !== player.worldId) continue;
          if (
            segmentsIntersect(
              oldX,
              oldY,
              player.x,
              player.y,
              obs.x1,
              obs.y1,
              obs.x2,
              obs.y2,
            )
          ) {
            positionValid = false;
            break;
          }
        }
      }

      if (!positionValid) {
        player.x = oldX;
        player.y = oldY;

        // Ищем ws этого игрока и форсируем позицию
        const ws = [...wss.clients].find((c) => clients.get(c) === playerId);
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "forcePosition",
              x: oldX,
              y: oldY,
              reason: "collision",
            }),
          );
        }
      }

      success = true;
      break;
    }

    // Пока оставляем заглушку — потом добавим useItem, equipItem и т.д.
    default:
      console.warn(`applyMessage: не реализован тип ${msgType}`);
      success = false;
  }

  if (success) {
    players.set(playerId, { ...player });

    userDatabase.set(playerId, { ...player });
    saveUserDatabase(dbCollection, playerId, player).catch((e) =>
      console.error("DB save failed:", e),
    );

    const updateData = {
      id: playerId,
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
      serverSeq: getNextServerSeq(playerId),
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
      JSON.stringify({
        type: "update",
        player: updateData,
      }),
    );

    // Опционально — подтверждение клиенту
    const ws = [...wss.clients].find((c) => clients.get(c) === playerId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "actionConfirmed",
          seq: clientSeq,
          serverSeq: getNextServerSeq(playerId),
        }),
      );
    }
  }

  return success;
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
