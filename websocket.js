const { saveUserDatabase } = require("./database");
const { generateEnemyDrop } = require("./dropGenerator");
const { handleTwisterMessage } = require("./misterTwisterServer");
const {
  initializeTrashCans,
  handleTrashGuess,
  trashCansState,
} = require("./trashCansServer");
const { handleTorestosUpgrade } = require("./torestosServer");
const {
  handleHomelessRentRequest,
  handleHomelessRentConfirm,
  handleHomelessStorageAction,
} = require("./homelessServer");
const { handleSkillUpgrade } = require("./toremidosServer");
const { obstacles } = require("./obstacles");
const { calculateMaxStats, EQUIPMENT_TYPES } = require("./calculateMaxStats");
const { spawnNewEnemy } = require("./spawnNewEnemy");

function broadcastToWorld(wss, clients, players, worldId, message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const playerId = clients.get(client);
      const player = players.get(playerId);
      if (player && player.worldId === worldId) {
        client.send(message);
      }
    }
  });
}

function broadcastTradeCancelled(wss, clients, playerAId, playerBId) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const id = clients.get(client);
      if (id === playerAId || id === playerBId) {
        client.send(JSON.stringify({ type: "tradeCancelled" }));
      }
    }
  });
}

const tradeRequests = new Map();
const tradeOffers = new Map();

const ENEMY_SPEED = 2;
const AGGRO_RANGE = 300;
const ATTACK_RANGE = 50;
const ENEMY_ATTACK_COOLDOWN = 1000;
const BLOOD_EYE_SPEED = 3.2;
const BLOOD_EYE_AGGRO = 300;
const BLOOD_EYE_COOLDOWN = 2000;
const BLOOD_EYE_PROJ_SPEED = 5; // px/s
const BLOOD_EYE_DAMAGE_MIN = 12;
const BLOOD_EYE_DAMAGE_MAX = 18;

function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

function calculateXPToNextLevel(level) {
  if (level >= 100) return 0;
  return 100 * Math.pow(2, level);
}

function setupWebSocket(
  wss,
  dbCollection,
  clients,
  players,
  userDatabase,
  items,
  lights,
  worlds,
  ITEM_CONFIG,
  INACTIVITY_TIMEOUT,
  enemies,
) {
  function checkCollisionServer(x, y) {
    return false;
  }

  wss.on("connection", (ws) => {
    console.log("Client connected");

    let inactivityTimer = setTimeout(() => {
      console.log("Client disconnected due to inactivity");
      ws.close(4000, "Inactivity timeout");
    }, INACTIVITY_TIMEOUT);

    ws.on("message", async (message) => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.log("Client disconnected due to inactivity");
        ws.close(4000, "Inactivity timeout");
      }, INACTIVITY_TIMEOUT);

      let data;
      try {
        data = JSON.parse(message);
      } catch (e) {
        console.error("Invalid JSON:", e);
        return;
      }

      if (!ws.registerQueue) {
        ws.registerQueue = [];
        ws.isProcessingRegister = false;
      }

      if (data.type === "register") {
        ws.registerQueue.push(data);
        processRegisterQueue(ws);
        return;
      }
      if (!ws.transitionQueue) {
        ws.transitionQueue = [];
        ws.isProcessingTransition = false;
      }

      if (data.type === "worldTransition") {
        ws.transitionQueue.push(data);
        processWorldTransitionQueue(ws);
        return;
      }
      if (!ws.syncQueue) {
        ws.syncQueue = [];
        ws.isProcessingSync = false;
      }

      if (data.type === "syncPlayers") {
        ws.syncQueue.push(data);
        processSyncQueue(ws);
        return;
      }
      if (!ws.loginQueue) {
        ws.loginQueue = [];
        ws.isProcessingLogin = false;
      }

      if (data.type === "login") {
        ws.loginQueue.push(data);
        processLoginQueue(ws);
        return;
      }
      if (!ws.updateQueue) {
        ws.updateQueue = [];
        ws.isProcessingUpdate = false;
      }

      if (data.type === "update" || data.type === "move") {
        ws.updateQueue.push(data);
        processUpdateQueue(ws);
        return;
      }
      if (!ws.pickupQueue) {
        ws.pickupQueue = [];
        ws.isProcessingPickup = false;
      }

      if (data.type === "pickup") {
        ws.pickupQueue.push(data);
        processPickupQueue(ws);
        return;
      }
      if (!ws.dropQueue) {
        ws.dropQueue = [];
        ws.isProcessingDrop = false;
      }

      if (data.type === "dropItem") {
        ws.dropQueue.push(data);
        processDropQueue(ws);
        return;
      }
      if (!ws.useItemQueue) {
        ws.useItemQueue = [];
        ws.isProcessingUseItem = false;
      }

      if (data.type === "useItem") {
        ws.useItemQueue.push(data);
        processUseItemQueue(ws);
        return;
      }
      if (!ws.equipQueue) {
        ws.equipQueue = [];
        ws.isProcessingEquip = false;
      }

      if (data.type === "equipItem") {
        ws.equipQueue.push(data);
        processEquipQueue(ws);
        return;
      }
      if (!ws.unequipQueue) {
        ws.unequipQueue = [];
        ws.isProcessingUnequip = false;
      }

      if (data.type === "unequipItem") {
        ws.unequipQueue.push(data);
        processUnequipQueue(ws);
        return;
      }
      if (!ws.tradeRequestQueue) {
        ws.tradeRequestQueue = [];
        ws.isProcessingTradeRequest = false;
      }

      if (data.type === "tradeRequest") {
        ws.tradeRequestQueue.push(data);
        processTradeRequestQueue(ws);
        return;
      }
      if (!ws.tradeAcceptedQueue) {
        ws.tradeAcceptedQueue = [];
        ws.isProcessingTradeAccepted = false;
      }

      if (data.type === "tradeAccepted") {
        ws.tradeAcceptedQueue.push(data);
        processTradeAcceptedQueue(ws);
        return;
      }
      if (!ws.tradeOfferQueue) {
        ws.tradeOfferQueue = [];
        ws.isProcessingTradeOffer = false;
      }

      if (data.type === "tradeOffer") {
        ws.tradeOfferQueue.push(data);
        processTradeOfferQueue(ws);
        return;
      }
      if (!ws.tradeConfirmedQueue) {
        ws.tradeConfirmedQueue = [];
        ws.isProcessingTradeConfirmed = false;
      }

      if (data.type === "tradeConfirmed") {
        ws.tradeConfirmedQueue.push(data);
        processTradeConfirmedQueue(ws);
        return;
      }
      if (!ws.tradeCompletedQueue) {
        ws.tradeCompletedQueue = [];
        ws.isProcessingTradeCompleted = false;
      }

      if (data.type === "tradeCompleted") {
        ws.tradeCompletedQueue.push(data);
        processTradeCompletedQueue(ws);
        return;
      }
      if (!ws.tradeCancelledQueue) {
        ws.tradeCancelledQueue = [];
        ws.isProcessingTradeCancelled = false;
      }

      if (data.type === "tradeCancelled") {
        ws.tradeCancelledQueue.push(data);
        processTradeCancelledQueue(ws);
        return;
      }
      if (!ws.tradeChatQueue) {
        ws.tradeChatQueue = [];
        ws.isProcessingTradeChat = false;
      }

      if (data.type === "tradeChatMessage") {
        ws.tradeChatQueue.push(data);
        processTradeChatQueue(ws);
        return;
      }
      if (!ws.robotDoctorFreeHealQueue) {
        ws.robotDoctorFreeHealQueue = [];
        ws.isProcessingRobotDoctorFreeHeal = false;
      }

      if (data.type === "robotDoctorFreeHeal") {
        ws.robotDoctorFreeHealQueue.push(data);
        processRobotDoctorFreeHealQueue(ws);
        return;
      }
      if (!ws.completeDoctorQuestQueue) {
        ws.completeDoctorQuestQueue = [];
        ws.isProcessingCompleteDoctorQuest = false;
      }

      if (data.type === "completeDoctorQuest") {
        ws.completeDoctorQuestQueue.push(data);
        processCompleteDoctorQuestQueue(ws);
        return;
      }
      if (!ws.robotDoctorHeal20Queue) {
        ws.robotDoctorHeal20Queue = [];
        ws.isProcessingRobotDoctorHeal20 = false;
      }

      if (data.type === "robotDoctorHeal20") {
        ws.robotDoctorHeal20Queue.push(data);
        processRobotDoctorHeal20Queue(ws);
        return;
      }
      if (!ws.robotDoctorFullHealQueue) {
        ws.robotDoctorFullHealQueue = [];
        ws.isProcessingRobotDoctorFullHeal = false;
      }

      if (data.type === "robotDoctorFullHeal") {
        ws.robotDoctorFullHealQueue.push(data);
        processRobotDoctorFullHealQueue(ws);
        return;
      }
      if (!ws.buyWaterQueue) {
        ws.buyWaterQueue = [];
        ws.isProcessingBuyWater = false;
      }

      if (data.type === "buyWater") {
        ws.buyWaterQueue.push(data);
        processBuyWaterQueue(ws);
        return;
      }
      if (!ws.updateLevelQueue) {
        ws.updateLevelQueue = [];
        ws.isProcessingUpdateLevel = false;
      }

      if (data.type === "updateLevel") {
        ws.updateLevelQueue.push(data);
        processUpdateLevelQueue(ws);
        return;
      }
      if (!ws.updateMaxStatsQueue) {
        ws.updateMaxStatsQueue = [];
        ws.isProcessingUpdateMaxStats = false;
      }

      if (data.type === "updateMaxStats") {
        ws.updateMaxStatsQueue.push(data);
        processUpdateMaxStatsQueue(ws);
        return;
      }
      if (!ws.updateInventoryQueue) {
        ws.updateInventoryQueue = [];
        ws.isProcessingUpdateInventory = false;
      }

      if (data.type === "updateInventory") {
        ws.updateInventoryQueue.push(data);
        processUpdateInventoryQueue(ws);
        return;
      }
      if (!ws.neonQuestSyncQueue) {
        ws.neonQuestSyncQueue = [];
        ws.isProcessingNeonQuestSync = false;
      }

      if (data.type === "requestNeonQuestSync") {
        ws.neonQuestSyncQueue.push(data);
        processNeonQuestSyncQueue(ws);
        return;
      }
      if (!ws.neonQuestProgressQueue) {
        ws.neonQuestProgressQueue = [];
        ws.isProcessingNeonQuestProgress = false;
      }

      if (data.type === "neonQuestProgress") {
        ws.neonQuestProgressQueue.push(data);
        processNeonQuestProgressQueue(ws);
        return;
      }
      if (!ws.neonQuestCompleteQueue) {
        ws.neonQuestCompleteQueue = [];
        ws.isProcessingNeonQuestComplete = false;
      }

      if (data.type === "neonQuestComplete") {
        ws.neonQuestCompleteQueue.push(data);
        processNeonQuestCompleteQueue(ws);
        return;
      }
      if (!ws.updateQuestsQueue) {
        ws.updateQuestsQueue = [];
        ws.isProcessingUpdateQuests = false;
      }

      if (data.type === "updateQuests") {
        ws.updateQuestsQueue.push(data);
        processUpdateQuestsQueue(ws);
        return;
      }
      if (!ws.selectQuestQueue) {
        ws.selectQuestQueue = [];
        ws.isProcessingSelectQuest = false;
      }

      if (data.type === "selectQuest") {
        ws.selectQuestQueue.push(data);
        processSelectQuestQueue(ws);
        return;
      }
      if (!ws.neonQuestAcceptQueue) {
        ws.neonQuestAcceptQueue = [];
        ws.isProcessingNeonQuestAccept = false;
      }

      if (data.type === "neonQuestAccept") {
        ws.neonQuestAcceptQueue.push(data);
        processNeonQuestAcceptQueue(ws);
        return;
      }
      if (!ws.vacuumBalyaryQueue) {
        ws.vacuumBalyaryQueue = [];
        ws.isProcessingVacuumBalyary = false;
      }

      if (data.type === "vacuumBalyaryReward") {
        ws.vacuumBalyaryQueue.push(data);
        processVacuumBalyaryQueue(ws);
        return;
      }
      if (!ws.requestCaptainStampQueue) {
        ws.requestCaptainStampQueue = [];
        ws.isProcessingCaptainStamp = false;
      }

      if (data.type === "requestCaptainStamp") {
        ws.requestCaptainStampQueue.push(data);
        processRequestCaptainStampQueue(ws);
        return;
      }
      if (!ws.submitCorporateDocumentsQueue) {
        ws.submitCorporateDocumentsQueue = [];
        ws.isProcessingCorporateDocuments = false;
      }

      if (data.type === "submitCorporateDocuments") {
        ws.submitCorporateDocumentsQueue.push(data);
        processSubmitCorporateDocumentsQueue(ws);
        return;
      }
      if (!ws.thimbleriggerBetQueue) {
        ws.thimbleriggerBetQueue = [];
        ws.isProcessingThimbleriggerBet = false;
      }

      if (data.type === "thimbleriggerBet") {
        ws.thimbleriggerBetQueue.push(data);
        processThimbleriggerBetQueue(ws);
        return;
      }
      if (!ws.thimbleriggerGameResultQueue) {
        ws.thimbleriggerGameResultQueue = [];
        ws.isProcessingThimbleriggerGameResult = false;
      }

      if (data.type === "thimbleriggerGameResult") {
        ws.thimbleriggerGameResultQueue.push(data);
        processThimbleriggerGameResultQueue(ws);
        return;
      }
      if (!ws.buyFromJackQueue) {
        ws.buyFromJackQueue = [];
        ws.isProcessingBuyFromJack = false;
      }

      if (data.type === "buyFromJack") {
        ws.buyFromJackQueue.push(data);
        processBuyFromJackQueue(ws);
        return;
      }
      if (!ws.sellToJackQueue) {
        ws.sellToJackQueue = [];
        ws.isProcessingSellToJack = false;
      }

      if (data.type === "sellToJack") {
        ws.sellToJackQueue.push(data);
        processSellToJackQueue(ws);
        return;
      }
      if (!ws.twisterQueue) {
        ws.twisterQueue = [];
        ws.isProcessingTwister = false;
      }

      if (data.type === "twister") {
        ws.twisterQueue.push(data);
        processTwisterQueue(ws);
        return;
      }
      if (!ws.trashGuessQueue) {
        ws.trashGuessQueue = [];
        ws.isProcessingTrashGuess = false;
      }

      if (data.type === "trashGuess") {
        ws.trashGuessQueue.push(data);
        processTrashGuessQueue(ws);
        return;
      }
      if (!ws.getTrashStateQueue) {
        ws.getTrashStateQueue = [];
        ws.isProcessingGetTrashState = false;
      }

      if (data.type === "getTrashState") {
        ws.getTrashStateQueue.push(data);
        processGetTrashStateQueue(ws);
        return;
      }
      if (!ws.getAllTrashStatesQueue) {
        ws.getAllTrashStatesQueue = [];
        ws.isProcessingGetAllTrashStates = false;
      }

      if (data.type === "getAllTrashStates") {
        ws.getAllTrashStatesQueue.push(data);
        processGetAllTrashStatesQueue(ws);
        return;
      }
      if (!ws.torestosUpgradeQueue) {
        ws.torestosUpgradeQueue = [];
        ws.isProcessingTorestosUpgrade = false;
      }

      if (data.type === "torestosUpgrade") {
        ws.torestosUpgradeQueue.push(data);
        processTorestosUpgradeQueue(ws);
        return;
      }
      if (!ws.upgradeSkillQueue) {
        ws.upgradeSkillQueue = [];
        ws.isProcessingUpgradeSkill = false;
      }

      if (data.type === "upgradeSkill") {
        ws.upgradeSkillQueue.push(data);
        processUpgradeSkillQueue(ws);
        return;
      }
      if (!ws.homelessOpenStorageQueue) {
        ws.homelessOpenStorageQueue = [];
        ws.isProcessingHomelessOpenStorage = false;
      }

      if (data.type === "homelessOpenStorage") {
        ws.homelessOpenStorageQueue.push(data);
        processHomelessOpenStorageQueue(ws);
        return;
      }
      if (!ws.homelessRentConfirmQueue) {
        ws.homelessRentConfirmQueue = [];
        ws.isProcessingHomelessRentConfirm = false;
      }

      if (data.type === "homelessRentConfirm") {
        ws.homelessRentConfirmQueue.push(data);
        processHomelessRentConfirmQueue(ws);
        return;
      }
      if (!ws.homelessPutItemQueue) {
        ws.homelessPutItemQueue = [];
        ws.isProcessingHomelessPutItem = false;
      }

      if (data.type === "homelessPutItem") {
        ws.homelessPutItemQueue.push(data);
        processHomelessPutItemQueue(ws);
        return;
      }
      if (!ws.homelessTakeItemQueue) {
        ws.homelessTakeItemQueue = [];
        ws.isProcessingHomelessTakeItem = false;
      }

      if (data.type === "homelessTakeItem") {
        ws.homelessTakeItemQueue.push(data);
        processHomelessTakeItemQueue(ws);
        return;
      }
      if (!ws.requestRegenerationQueue) {
        ws.requestRegenerationQueue = [];
        ws.isProcessingRequestRegeneration = false;
      }

      if (data.type === "requestRegeneration") {
        ws.requestRegenerationQueue.push(data);
        processRequestRegenerationQueue(ws);
        return;
      }
      if (!ws.welcomeGuideSeenQueue) {
        ws.welcomeGuideSeenQueue = [];
        ws.isProcessingWelcomeGuideSeen = false;
      }

      if (data.type === "welcomeGuideSeen") {
        ws.welcomeGuideSeenQueue.push(data);
        processWelcomeGuideSeenQueue(ws);
        return;
      }
      if (!ws.chatQueue) {
        ws.chatQueue = [];
        ws.isProcessingChat = false;
        ws.chatTimestamps = [];
        ws.CHAT_RATE_LIMIT = 5;
        ws.CHAT_RATE_WINDOW = 3000;
      }

      if (data.type === "chat") {
        const now = Date.now();
        ws.chatTimestamps = ws.chatTimestamps.filter(
          (ts) => now - ts < ws.CHAT_RATE_WINDOW,
        );

        if (ws.chatTimestamps.length >= ws.CHAT_RATE_LIMIT) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "chatError",
                message: "Слишком быстро! Подожди пару секунд.",
              }),
            );
          }
          return;
        }

        ws.chatTimestamps.push(now);

        if (typeof data.message === "string") {
          data.message = data.message.trim().substring(0, 200);
        } else {
          data.message = "";
        }

        if (!data.message) return;

        ws.chatQueue.push(data);
        processChatQueue(ws);
        return;
      }
      if (!ws.meetNpcQueue) {
        ws.meetNpcQueue = [];
        ws.isProcessingMeetNpc = false;
      }

      if (
        data.type === "meetNPC" ||
        data.type === "meetJack" ||
        data.type === "meetNeonAlex" ||
        data.type === "meetCaptain" ||
        data.type === "meetThimblerigger" ||
        data.type === "meetTorestos" ||
        data.type === "meetToremidos"
      ) {
        ws.meetNpcQueue.push(data);
        processMeetNpcQueue(ws);
        return;
      } else if (data.type === "shoot") {
        const shooterId = clients.get(ws);
        if (shooterId && players.has(shooterId)) {
          const player = players.get(shooterId);
          if (player.worldId === data.worldId) {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                const clientPlayer = players.get(clients.get(client));
                if (clientPlayer && clientPlayer.worldId === data.worldId) {
                  client.send(
                    JSON.stringify({
                      type: "shoot",
                      bulletId: data.bulletId,
                      x: data.x,
                      y: data.y,
                      vx: data.vx,
                      vy: data.vy,
                      damage: data.damage,
                      range: data.range,
                      ownerId: data.ownerId,
                      spawnTime: data.spawnTime,
                      worldId: data.worldId,
                    }),
                  );
                }
              }
            });
          }
        }
      } else if (data.type === "bulletCollision") {
        if (data.worldId) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === data.worldId) {
                client.send(
                  JSON.stringify({
                    type: "bulletCollision",
                    bulletIds: data.bulletIds,
                    worldId: data.worldId,
                  }),
                );
              }
            }
          });
        }
      } else if (data.type === "removeBullet") {
        if (data.worldId) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === data.worldId) {
                client.send(
                  JSON.stringify({
                    type: "removeBullet",
                    bulletId: data.bulletId,
                    worldId: data.worldId,
                  }),
                );
              }
            }
          });
        }
      } else if (data.type === "attackPlayer") {
        const attackerId = clients.get(ws);
        if (
          attackerId &&
          players.has(attackerId) &&
          players.has(data.targetId)
        ) {
          const attacker = players.get(attackerId);
          const target = players.get(data.targetId);
          if (
            attacker.worldId === data.worldId &&
            target.worldId === data.worldId &&
            target.health > 0
          ) {
            target.health = Math.max(0, target.health - data.damage);
            players.set(data.targetId, { ...target });
            userDatabase.set(data.targetId, { ...target });
            await saveUserDatabase(dbCollection, data.targetId, target);

            // Broadcast update to all players in the same world
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                const clientPlayer = players.get(clients.get(client));
                if (clientPlayer && clientPlayer.worldId === target.worldId) {
                  client.send(
                    JSON.stringify({
                      type: "update",
                      player: { id: data.targetId, ...target },
                    }),
                  );
                }
              }
            });
          }
        }
      } else if (data.type === "attackEnemy") {
        const attackerId = clients.get(ws);
        if (!attackerId) return;

        const attacker = players.get(attackerId);
        const enemy = enemies.get(data.targetId);

        if (
          !attacker ||
          !enemy ||
          enemy.worldId !== data.worldId ||
          enemy.health <= 0
        )
          return;

        // Наносим урон
        enemy.health = Math.max(0, enemy.health - data.damage);

        // Если умер
        if (enemy.health <= 0) {
          enemies.delete(data.targetId);

          // Уведомляем всех о смерти
          broadcastToWorld(
            wss,
            clients,
            players,
            data.worldId,
            JSON.stringify({
              type: "enemyDied",
              enemyId: data.targetId,
            }),
          );

          // ───────────────────── НОВАЯ СИСТЕМА ДРОПА ─────────────────────
          const now = Date.now();
          const dropItems = generateEnemyDrop(
            enemy.type,
            enemy.x,
            enemy.y,
            data.worldId,
            now,
          );

          if (dropItems.length > 0) {
            // Добавляем все дропнутые предметы в глобальную карту items
            for (const drop of dropItems) {
              items.set(drop.itemId, {
                x: drop.x,
                y: drop.y,
                type: drop.type,
                quantity: drop.quantity || 1,
                spawnTime: drop.spawnTime,
                worldId: drop.worldId,
              });
            }

            // Отправляем одним сообщением весь дроп
            broadcastToWorld(
              wss,
              clients,
              players,
              data.worldId,
              JSON.stringify({
                type: "newItem",
                items: dropItems,
              }),
            );
          }
          // ──────────────────────────────────────────────────────────────

          // XP и level up
          let xpGained = 13;
          if (enemy.type === "scorpion") {
            xpGained = 20;
          }
          if (enemy.type === "blood_eye") {
            xpGained = 50;
          }
          attacker.xp = (attacker.xp || 0) + xpGained;

          const oldLevel = attacker.level;

          let levelUp = false;
          let xpToNext = calculateXPToNextLevel(attacker.level);

          while (attacker.xp >= xpToNext && attacker.level < 100) {
            attacker.level += 1;
            attacker.xp -= xpToNext;
            attacker.upgradePoints = (attacker.upgradePoints || 0) + 10;
            levelUp = true;
            xpToNext = calculateXPToNextLevel(attacker.level);
          }

          const levelsGained = attacker.level - oldLevel;

          if (levelsGained > 0) {
            attacker.skillPoints =
              (attacker.skillPoints || 0) + 3 * levelsGained;

            // Отправляем клиенту обновление (тот же тип сообщения, что и при прокачке)
            ws.send(
              JSON.stringify({
                type: "updateLevel",
                level: attacker.level,
                xp: attacker.xp,
                xpToNextLevel: xpToNext,
                upgradePoints: attacker.upgradePoints,
                skillPoints: attacker.skillPoints,
              }),
            );

            // Сохраняем в базу сразу
            players.set(attackerId, attacker);
            userDatabase.set(attackerId, attacker);
            await saveUserDatabase(dbCollection, attackerId, attacker);
          }

          // Уведомление атакующего (levelSyncAfterKill)
          ws.send(
            JSON.stringify({
              type: "levelSyncAfterKill",
              level: attacker.level,
              xp: attacker.xp,
              xpToNextLevel: xpToNext,
              upgradePoints: attacker.upgradePoints,
              xpGained,
            }),
          );

          // Прогресс квеста (только для мутантов)
          if (enemy.type === "mutant") {
            if (
              attacker.neonQuest &&
              attacker.neonQuest.currentQuestId === "neon_quest_1"
            ) {
              attacker.neonQuest.progress = attacker.neonQuest.progress || {};
              attacker.neonQuest.progress.killMutants =
                (attacker.neonQuest.progress.killMutants || 0) + 1;

              players.set(attackerId, attacker);
              userDatabase.set(attackerId, attacker);
              await saveUserDatabase(dbCollection, attackerId, attacker);

              ws.send(
                JSON.stringify({
                  type: "neonQuestProgressUpdate",
                  progress: attacker.neonQuest.progress,
                }),
              );
            }
          }

          // Респавн через 8–15 секунд
          setTimeout(
            () =>
              spawnNewEnemy(
                data.worldId,
                worlds,
                players,
                enemies,
                wss,
                clients,
                broadcastToWorld,
              ),
            8000 + Math.random() * 7000,
          );
        } else {
          // Если враг ещё жив — просто обновляем здоровье
          enemies.set(data.targetId, enemy);

          broadcastToWorld(
            wss,
            clients,
            players,
            data.worldId,
            JSON.stringify({
              type: "enemyUpdate",
              enemy: {
                id: data.targetId,
                health: enemy.health,
                x: enemy.x,
                y: enemy.y,
              },
            }),
          );
        }
      }
      async function processRegisterQueue(ws) {
        if (ws.isProcessingRegister) return;
        ws.isProcessingRegister = true;

        while (ws.registerQueue.length > 0) {
          const data = ws.registerQueue.shift();

          // ── старая логика регистрации — без изменений ─────────────────────
          if (userDatabase.has(data.username)) {
            ws.send(JSON.stringify({ type: "registerFail" }));
          } else {
            const newPlayer = {
              id: data.username,
              password: data.password,
              x: 474,
              y: 2474,
              health: 100,
              energy: 100,
              food: 100,
              water: 100,
              armor: 0,
              distanceTraveled: 0,
              lastResourceCheckDistance: 0,
              direction: "down",
              state: "idle",
              frame: 0,
              inventory: Array(20).fill(null),
              equipment: {
                head: null,
                chest: null,
                belt: null,
                pants: null,
                boots: null,
                weapon: null,
                offhand: null,
                gloves: null,
              },
              npcMet: false,
              jackMet: false,
              alexNeonMet: false,
              captainMet: false,
              thimbleriggerMet: false,
              torestosMet: false,
              toremidosMet: false,
              level: 0,
              xp: 0,
              upgradePoints: 0,
              availableQuests: [],
              worldId: 0,
              hasSeenWelcomeGuide: false,
              worldPositions: { 0: { x: 222, y: 3205 } },

              healthUpgrade: 0,
              energyUpgrade: 0,
              foodUpgrade: 0,
              waterUpgrade: 0,
              maxStats: {
                health: 100,
                energy: 100,
                food: 100,
                water: 100,
                armor: 0,
              },
              skills: Array.from({ length: 10 }, (_, i) => ({
                id: i + 1,
                level: 0,
              })),
              skillPoints: 0,
              neonQuest: {
                currentQuestId: null,
                progress: {},
                completed: [],
              },
              medicalCertificate: false,
              medicalCertificateStamped: false,
              corporateDocumentsSubmitted: false,

              chatBubble: null,
            };

            userDatabase.set(data.username, newPlayer);
            await saveUserDatabase(dbCollection, data.username, newPlayer);
            ws.send(JSON.stringify({ type: "registerSuccess" }));
          }
        }

        ws.isProcessingRegister = false;
      }
      async function processWorldTransitionQueue(ws) {
        if (ws.isProcessingTransition) return;
        ws.isProcessingTransition = true;

        while (ws.transitionQueue.length > 0) {
          const data = ws.transitionQueue.shift();

          const id = clients.get(ws);
          if (!id) continue; // игрок уже отключился — пропускаем

          const player = players.get(id);
          if (!player) continue;

          const oldWorldId = player.worldId;
          const targetWorldId = data.targetWorldId;

          // Проверяем существование мира
          if (!worlds.find((w) => w.id === targetWorldId)) {
            ws.send(
              JSON.stringify({
                type: "worldTransitionFail",
                reason: "invalid_world",
              }),
            );
            continue;
          }

          // ── Основная логика перехода (та же, что была раньше) ─────────────
          player.worldId = targetWorldId;
          player.x = data.x;
          player.y = data.y;
          player.worldPositions[targetWorldId] = { x: data.x, y: data.y };

          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Уведомляем всех в старом мире, что игрок ушёл
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === oldWorldId) {
                client.send(JSON.stringify({ type: "playerLeft", id }));
              }
            }
          });

          // Собираем данные нового мира
          const worldPlayers = Array.from(players.values()).filter(
            (p) => p.id !== id && p.worldId === targetWorldId,
          );

          const worldItems = Array.from(items.entries())
            .filter(([_, item]) => item.worldId === targetWorldId)
            .map(([itemId, item]) => ({
              itemId,
              x: item.x,
              y: item.y,
              type: item.type,
              spawnTime: item.spawnTime,
              worldId: item.worldId,
            }));

          const worldEnemies = Array.from(enemies.entries())
            .filter(([_, enemy]) => enemy.worldId === targetWorldId)
            .map(([enemyId, enemy]) => ({
              enemyId,
              x: enemy.x,
              y: enemy.y,
              health: enemy.health,
              direction: enemy.direction,
              state: enemy.state,
              frame: enemy.frame,
              worldId: enemy.worldId,
            }));

          // Отправляем успех текущему игроку + все данные нового мира
          ws.send(
            JSON.stringify({
              type: "worldTransitionSuccess",
              worldId: targetWorldId,
              x: player.x,
              y: player.y,
              lights:
                lights.get(targetWorldId)?.map(({ id, ...rest }) => rest) || [],
              players: worldPlayers,
              items: worldItems,
              enemies: worldEnemies,
            }),
          );

          // Уведомляем всех в новом мире о новом игроке
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === targetWorldId) {
                client.send(JSON.stringify({ type: "newPlayer", player }));
              }
            }
          });
        }

        ws.isProcessingTransition = false;
      }
      async function processSyncQueue(ws) {
        if (ws.isProcessingSync) return;
        ws.isProcessingSync = true;

        while (ws.syncQueue.length > 0) {
          const data = ws.syncQueue.shift();

          const id = clients.get(ws);
          if (!id) continue;

          const player = players.get(id);
          if (!player) continue;

          const worldId = data.worldId;

          // Проверяем, что запрос актуален (игрок всё ещё в этом мире)
          if (player.worldId !== worldId) {
            // Можно отправить ошибку, но чаще всего просто игнорируем
            continue;
          }

          // Собираем список других игроков в мире
          const worldPlayers = Array.from(players.values()).filter(
            (p) => p.id !== id && p.worldId === worldId,
          );

          // Отправляем только один раз — самый свежий
          ws.send(
            JSON.stringify({
              type: "syncPlayers",
              players: worldPlayers,
              worldId,
            }),
          );
        }

        ws.isProcessingSync = false;
      }
      async function processLoginQueue(ws) {
        if (ws.isProcessingLogin) return;
        ws.isProcessingLogin = true;

        while (ws.loginQueue.length > 0) {
          const data = ws.loginQueue.shift();

          const player = userDatabase.get(data.username);
          if (!player || player.password !== data.password) {
            ws.send(JSON.stringify({ type: "loginFail" }));
            continue;
          }

          // ── Основная логика логина (та же, что была раньше) ────────────────
          clients.set(ws, data.username);

          const playerData = {
            ...player,
            inventory: player.inventory || Array(20).fill(null),
            equipment: player.equipment || {
              head: null,
              chest: null,
              belt: null,
              pants: null,
              boots: null,
              weapon: null,
              gloves: null,
            },
            distanceTraveled: player.distanceTraveled || 0,
            lastResourceCheckDistance:
              player.lastResourceCheckDistance ?? player.distanceTraveled ?? 0,
            npcMet: player.npcMet || false,
            jackMet: player.jackMet || false,
            alexNeonMet: player.alexNeonMet || false,
            captainMet: player.captainMet || false,
            thimbleriggerMet: player.thimbleriggerMet || false,
            torestosMet: player.torestosMet || false,
            toremidosMet: player.toremidosMet || false,
            selectedQuestId: player.selectedQuestId || null,
            level: player.level || 0,
            xp: player.xp || 0,
            skills: player.skills || [],
            meleeDamageBonus: player.meleeDamageBonus || 0,
            skillPoints: player.skillPoints || 0,
            upgradePoints: player.upgradePoints || 0,
            availableQuests: player.availableQuests || [],
            worldId: player.worldId || 0,
            hasSeenWelcomeGuide: player.hasSeenWelcomeGuide || false,
            worldPositions: player.worldPositions || {
              0: { x: player.x, y: player.y },
            },

            healthUpgrade: player.healthUpgrade || 0,
            energyUpgrade: player.energyUpgrade || 0,
            foodUpgrade: player.foodUpgrade || 0,
            waterUpgrade: player.waterUpgrade || 0,
            neonQuest: player.neonQuest || {
              currentQuestId: null,
              progress: {},
              completed: [],
            },
            medicalCertificate: player.medicalCertificate || false,
            medicalCertificateStamped:
              player.medicalCertificateStamped || false,
            corporateDocumentsSubmitted:
              player.corporateDocumentsSubmitted || false,

            chatBubble: player.chatBubble || null,
          };

          playerData.maxStats = playerData.maxStats || {
            health: 100 + (playerData.healthUpgrade || 0),
            energy: 100 + (playerData.energyUpgrade || 0),
            food: 100 + (playerData.foodUpgrade || 0),
            water: 100 + (playerData.waterUpgrade || 0),
            armor: 0,
          };

          // Ограничиваем текущие значения
          playerData.health = Math.max(
            0,
            Math.min(playerData.health ?? 0, playerData.maxStats.health || 100),
          );
          playerData.energy = Math.max(
            0,
            Math.min(playerData.energy || 100, playerData.maxStats.energy),
          );
          playerData.food = Math.max(
            0,
            Math.min(playerData.food || 100, playerData.maxStats.food),
          );
          playerData.water = Math.max(
            0,
            Math.min(playerData.water || 100, playerData.maxStats.water),
          );
          playerData.armor = Math.max(
            0,
            Math.min(playerData.armor || 0, playerData.maxStats.armor),
          );

          calculateMaxStats(playerData, ITEM_CONFIG);
          playerData.health = Math.max(
            0,
            Math.min(playerData.health, playerData.maxStats.health),
          );

          players.set(data.username, playerData);

          // Отправляем успех + все данные
          ws.send(
            JSON.stringify({
              type: "loginSuccess",
              id: data.username,
              x: playerData.x,
              y: playerData.y,
              health: playerData.health,
              energy: playerData.energy,
              food: playerData.food,
              water: playerData.water,
              armor: playerData.armor,
              distanceTraveled: playerData.distanceTraveled || 0,
              lastResourceCheckDistance:
                playerData.lastResourceCheckDistance || 0,
              direction: playerData.direction || "down",
              state: playerData.state || "idle",
              frame: playerData.frame || 0,
              inventory: playerData.inventory,
              equipment: playerData.equipment,
              npcMet: playerData.npcMet,
              jackMet: playerData.jackMet,
              alexNeonMet: playerData.alexNeonMet,
              captainMet: playerData.captainMet,
              thimbleriggerMet: playerData.thimbleriggerMet,
              torestosMet: playerData.torestosMet || false,
              toremidosMet: playerData.toremidosMet,
              selectedQuestId: playerData.selectedQuestId,
              level: playerData.level,
              xp: playerData.xp,
              skills: playerData.skills,
              skillPoints: playerData.skillPoints,
              upgradePoints: playerData.upgradePoints,
              availableQuests: playerData.availableQuests,
              worldId: playerData.worldId,
              hasSeenWelcomeGuide: playerData.hasSeenWelcomeGuide || false,
              worldPositions: playerData.worldPositions,
              healthUpgrade: playerData.healthUpgrade,
              energyUpgrade: playerData.energyUpgrade,
              foodUpgrade: playerData.foodUpgrade,
              waterUpgrade: playerData.waterUpgrade,
              neonQuest: playerData.neonQuest,
              medicalCertificate: playerData.medicalCertificate || false,
              medicalCertificateStamped:
                playerData.medicalCertificateStamped || false,
              corporateDocumentsSubmitted:
                playerData.corporateDocumentsSubmitted || false,
              trashCooldowns: playerData.trashCooldowns || {},
              players: Array.from(players.values()).filter(
                (p) =>
                  p.id !== data.username && p.worldId === playerData.worldId,
              ),
              items: Array.from(items.entries())
                .filter(([_, item]) => item.worldId === playerData.worldId)
                .map(([itemId, item]) => ({
                  itemId,
                  x: item.x,
                  y: item.y,
                  type: item.type,
                  spawnTime: item.spawnTime,
                  worldId: item.worldId,
                })),
              enemies: Array.from(enemies.entries())
                .filter(([_, enemy]) => enemy.worldId === playerData.worldId)
                .map(([enemyId, enemy]) => ({
                  enemyId,
                  x: enemy.x,
                  y: enemy.y,
                  health: enemy.health,
                  direction: enemy.direction,
                  state: enemy.state,
                  frame: enemy.frame,
                  worldId: enemy.worldId,
                })),
              lights:
                lights
                  .get(playerData.worldId)
                  ?.map(({ id, ...rest }) => rest) || [],
            }),
          );

          // Отправляем состояние мусорок
          ws.send(
            JSON.stringify({
              type: "trashAllStates",
              states: trashCansState.map((st, idx) => ({
                index: idx,
                guessed: st.guessed,
                isOpened: st.isOpened || false,
                nextAttemptAfter: st.nextAttemptAfter || 0,
              })),
            }),
          );

          // Уведомляем других игроков в мире
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === playerData.worldId) {
                client.send(
                  JSON.stringify({
                    type: "newPlayer",
                    player: players.get(data.username),
                  }),
                );
              }
            }
          });
        }

        ws.isProcessingLogin = false;
      }
      async function processUpdateQueue(ws) {
        if (ws.isProcessingUpdate) return;
        ws.isProcessingUpdate = true;

        while (ws.updateQueue.length > 0) {
          const data = ws.updateQueue.shift();

          const playerId = clients.get(ws);

          // Защита: игрок не авторизован или уже отключился
          if (!playerId || !players.has(playerId)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated or session expired",
              }),
            );
            continue;
          }

          const player = players.get(playerId);
          const currentWorldId = player.worldId;

          // Сохраняем старую позицию для проверки коллизий
          const oldX = player.x;
          const oldY = player.y;

          // Принимаем только разрешённые поля (как было раньше)
          if (data.x !== undefined) player.x = Number(data.x);
          if (data.y !== undefined) player.y = Number(data.y);
          if (data.direction) player.direction = data.direction;
          if (data.state) player.state = data.state;
          if (data.attackFrame !== undefined)
            player.attackFrame = Number(data.attackFrame);
          if (data.attackFrameTime !== undefined)
            player.attackFrameTime = Number(data.attackFrameTime);
          if (data.frame !== undefined) player.frame = Number(data.frame);

          // Ограничиваем статы безопасными значениями
          if (data.health !== undefined)
            player.health = Math.max(
              0,
              Math.min(player.maxStats?.health || 100, Number(data.health)),
            );
          if (data.energy !== undefined)
            player.energy = Math.max(
              0,
              Math.min(player.maxStats?.energy || 100, Number(data.energy)),
            );
          if (data.food !== undefined)
            player.food = Math.max(
              0,
              Math.min(player.maxStats?.food || 100, Number(data.food)),
            );
          if (data.water !== undefined)
            player.water = Math.max(
              0,
              Math.min(player.maxStats?.water || 100, Number(data.water)),
            );
          if (data.armor !== undefined) player.armor = Number(data.armor);
          if (data.distanceTraveled !== undefined)
            player.distanceTraveled = Number(data.distanceTraveled);

          // ─── РАСХОД РЕСУРСОВ ПРИ ДВИЖЕНИИ ──────────────────────────────────────
          const currentDistance = Math.floor(player.distanceTraveled || 0);
          const prevDistance = player.lastResourceCheckDistance || 0;

          let resourcesChanged = false;

          // Вода: -1 каждые 500 px
          const waterLossNow = Math.floor(currentDistance / 500);
          const waterLossPrev = Math.floor(prevDistance / 500);
          if (waterLossNow > waterLossPrev) {
            player.water = Math.max(
              0,
              player.water - (waterLossNow - waterLossPrev),
            );
            resourcesChanged = true;
          }

          // Еда: -1 каждые 900 px
          const foodLossNow = Math.floor(currentDistance / 900);
          const foodLossPrev = Math.floor(prevDistance / 900);
          if (foodLossNow > foodLossPrev) {
            player.food = Math.max(
              0,
              player.food - (foodLossNow - foodLossPrev),
            );
            resourcesChanged = true;
          }

          // Энергия: -1 каждые 1300 px
          const energyLossNow = Math.floor(currentDistance / 1300);
          const energyLossPrev = Math.floor(prevDistance / 1300);
          if (energyLossNow > energyLossPrev) {
            player.energy = Math.max(
              0,
              player.energy - (energyLossNow - energyLossPrev),
            );
            resourcesChanged = true;
          }

          // Голод / жажда / усталость → урон по здоровью
          if (player.energy <= 0 || player.food <= 0 || player.water <= 0) {
            const healthLossNow = Math.floor(currentDistance / 200);
            const healthLossPrev = Math.floor(prevDistance / 200);
            if (healthLossNow > healthLossPrev) {
              player.health = Math.max(
                0,
                player.health - (healthLossNow - healthLossPrev),
              );
              resourcesChanged = true;
            }
          }

          // Запоминаем дистанцию, на которой последний раз считали расход
          player.lastResourceCheckDistance = currentDistance;

          // ─── Если что-то изменилось — сохраняем и рассылаем ─────────────────────
          if (resourcesChanged) {
            // Сохраняем в базу
            userDatabase.set(playerId, { ...player });
            await saveUserDatabase?.(dbCollection, playerId, player);

            // Готовим данные для рассылки (только изменённые поля + id)
            const updatePayload = {
              id: playerId,
              health: player.health,
              energy: player.energy,
              food: player.food,
              water: player.water,
              distanceTraveled: player.distanceTraveled, // на всякий случай
            };

            broadcastToWorld(
              wss,
              clients,
              players,
              player.worldId,
              JSON.stringify({
                type: "update",
                player: updatePayload,
              }),
            );
          }

          // ─── ПРОВЕРКА ПРЕПЯТСТВИЙ (как было) ────────────────────────────────
          let positionValid = true;

          if (data.x !== undefined || data.y !== undefined) {
            for (const obs of obstacles) {
              if (obs.worldId !== currentWorldId) continue;

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

            ws.send(
              JSON.stringify({
                type: "forcePosition",
                x: oldX,
                y: oldY,
                reason: "collision",
              }),
            );
          }

          // Сохраняем изменения в Map
          players.set(playerId, { ...player });

          // Готовим данные для broadcast (как было)
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
          };

          if (player.state === "attacking") {
            updateData.attackFrame = player.attackFrame ?? 0;
            updateData.attackFrameTime = player.attackFrameTime ?? 0;
          }

          // Рассылаем обновление всем в мире
          broadcastToWorld(
            wss,
            clients,
            players,
            currentWorldId,
            JSON.stringify({
              type: "update",
              player: updateData,
            }),
          );
        }

        ws.isProcessingUpdate = false;
      }
      async function processPickupQueue(ws) {
        if (ws.isProcessingPickup) return;
        ws.isProcessingPickup = true;

        while (ws.pickupQueue.length > 0) {
          const data = ws.pickupQueue.shift();

          const id = clients.get(ws);
          if (!id) continue;

          if (!items.has(data.itemId)) {
            ws.send(
              JSON.stringify({ type: "itemNotFound", itemId: data.itemId }),
            );
            continue;
          }

          const item = items.get(data.itemId);
          const player = players.get(id);

          if (!player) continue;

          // Защита квестовых предметов
          if (item.isQuestItem && item.questOwnerId !== id) {
            continue;
          }

          if (!player.inventory) player.inventory = Array(20).fill(null);

          let picked = false;

          // Стекируемые предметы (balyary, atom, кристаллы, рецепты и т.д.)
          if (
            item.type === "balyary" ||
            item.type === "atom" ||
            item.type === "blue_crystal" ||
            item.type === "green_crystal" ||
            item.type === "red_crystal" ||
            item.type === "white_crystal" ||
            item.type === "yellow_crystal" ||
            item.type === "chameleon_crystal" ||
            item.type === "nanofilament" ||
            item.type === "nanoalloy" ||
            (item.type.startsWith("recipe_") &&
              item.type.includes("_equipment"))
          ) {
            const quantityToAdd = item.quantity || 1;
            const stackSlot = player.inventory.findIndex(
              (slot) => slot && slot.type === item.type,
            );

            if (stackSlot !== -1) {
              player.inventory[stackSlot].quantity =
                (player.inventory[stackSlot].quantity || 1) + quantityToAdd;
              picked = true;
            } else {
              const freeSlot = player.inventory.findIndex(
                (slot) => slot === null,
              );
              if (freeSlot !== -1) {
                player.inventory[freeSlot] = {
                  type: item.type,
                  quantity: quantityToAdd,
                  itemId: data.itemId,
                };
                picked = true;
              }
            }
          } else {
            // Обычные предметы — один в слот
            const freeSlot = player.inventory.findIndex(
              (slot) => slot === null,
            );
            if (freeSlot !== -1) {
              player.inventory[freeSlot] = {
                type: item.type,
                itemId: data.itemId,
              };
              picked = true;
            }
          }

          if (!picked) {
            ws.send(
              JSON.stringify({ type: "inventoryFull", itemId: data.itemId }),
            );
            continue;
          }

          // Удаляем предмет с карты
          items.delete(data.itemId);

          // Сохраняем игрока
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Рассылаем всем в мире
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === item.worldId) {
                client.send(
                  JSON.stringify({
                    type: "itemPicked",
                    itemId: data.itemId,
                    playerId: id,
                    item: {
                      type: item.type,
                      itemId: data.itemId,
                      quantity: item.quantity || 1,
                      isDroppedByPlayer: item.isDroppedByPlayer || false,
                    },
                  }),
                );

                // Обновляем самого подобравшего
                if (clients.get(client) === id) {
                  client.send(
                    JSON.stringify({
                      type: "update",
                      player: { id, ...player },
                    }),
                  );
                }
              }
            }
          });

          // Респавн через 10 минут (как было)
          setTimeout(
            () => {
              const world = worlds.find((w) => w.id === item.worldId);
              if (!world) return;

              const newItemId = `${item.type}_${Date.now()}`;
              const newItem = {
                x: Math.random() * world.width,
                y: Math.random() * world.height,
                type: item.type,
                spawnTime: Date.now(),
                worldId: item.worldId,
              };

              items.set(newItemId, newItem);

              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  const clientPlayer = players.get(clients.get(client));
                  if (clientPlayer && clientPlayer.worldId === item.worldId) {
                    client.send(
                      JSON.stringify({
                        type: "newItem",
                        itemId: newItemId,
                        x: newItem.x,
                        y: newItem.y,
                        type: newItem.type,
                        spawnTime: newItem.spawnTime,
                        worldId: newItem.worldId,
                      }),
                    );
                  }
                }
              });
            },
            10 * 60 * 1000,
          );
        }

        ws.isProcessingPickup = false;
      }
      async function processDropQueue(ws) {
        if (ws.isProcessingDrop) return;
        ws.isProcessingDrop = true;

        while (ws.dropQueue.length > 0) {
          const data = ws.dropQueue.shift();

          const id = clients.get(ws);
          if (!id) continue;

          const player = players.get(id);
          if (!player) continue;

          const slotIndex = data.slotIndex;
          const item = player.inventory[slotIndex];
          if (!item) continue;

          let quantityToDrop = data.quantity || 1;
          if (ITEM_CONFIG[item.type]?.stackable) {
            const currentQuantity = item.quantity || 1;
            if (quantityToDrop > currentQuantity) {
              continue; // некорректный запрос — игнорируем
            }
          }

          let dropX,
            dropY,
            attempts = 0;
          const maxAttempts = 10;
          do {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 100;
            dropX = player.x + Math.cos(angle) * radius;
            dropY = player.y + Math.sin(angle) * radius;
            attempts++;
          } while (
            checkCollisionServer(dropX, dropY) &&
            attempts < maxAttempts
          );

          if (attempts >= maxAttempts) {
            // Не нашли место — просто пропускаем (можно отправить ошибку клиенту, но пока как было)
            continue;
          }

          const itemId = `${item.type}_${Date.now()}`;

          if (ITEM_CONFIG[item.type]?.stackable) {
            if (quantityToDrop === (item.quantity || 1)) {
              player.inventory[slotIndex] = null;
            } else {
              player.inventory[slotIndex].quantity -= quantityToDrop;
            }
            items.set(itemId, {
              x: dropX,
              y: dropY,
              type: item.type,
              spawnTime: Date.now(),
              quantity: quantityToDrop,
              isDroppedByPlayer: true,
              worldId: player.worldId,
            });
          } else {
            player.inventory[slotIndex] = null;
            items.set(itemId, {
              x: dropX,
              y: dropY,
              type: item.type,
              spawnTime: Date.now(),
              isDroppedByPlayer: true,
              worldId: player.worldId,
            });
          }

          // Сохраняем изменения
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Рассылаем всем в мире
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientPlayer = players.get(clients.get(client));
              if (clientPlayer && clientPlayer.worldId === player.worldId) {
                client.send(
                  JSON.stringify({
                    type: "itemDropped",
                    itemId,
                    x: dropX,
                    y: dropY,
                    type: item.type,
                    spawnTime: Date.now(),
                    quantity: ITEM_CONFIG[item.type]?.stackable
                      ? quantityToDrop
                      : undefined,
                    isDroppedByPlayer: true,
                    worldId: player.worldId,
                  }),
                );

                // Обновляем инвентарь и статы тому, кто дропнул
                if (clients.get(client) === id) {
                  client.send(
                    JSON.stringify({
                      type: "update",
                      player: { id, ...player },
                    }),
                  );
                }
              }
            }
          });
        }

        ws.isProcessingDrop = false;
      }
      async function processUseItemQueue(ws) {
        if (ws.isProcessingUseItem) return;
        ws.isProcessingUseItem = true;

        while (ws.useItemQueue.length > 0) {
          const data = ws.useItemQueue.shift();

          const id = clients.get(ws);
          if (!id || !players.has(id)) continue;

          const player = players.get(id);
          const slotIndex = data.slotIndex;

          // Проверяем, что слот существует и предмет есть
          if (
            slotIndex < 0 ||
            slotIndex >= player.inventory.length ||
            !player.inventory[slotIndex]
          ) {
            continue;
          }

          const item = player.inventory[slotIndex];
          if (!ITEM_CONFIG[item.type]?.effect) continue;

          const effect = ITEM_CONFIG[item.type].effect;

          // Применяем эффекты (как было)
          if (effect.health)
            player.health = Math.min(
              player.health + effect.health,
              player.maxStats.health,
            );
          if (effect.energy)
            player.energy = Math.min(
              player.energy + effect.energy,
              player.maxStats.energy,
            );
          if (effect.food)
            player.food = Math.min(
              player.food + effect.food,
              player.maxStats.food,
            );
          if (effect.water)
            player.water = Math.min(
              player.water + effect.water,
              player.maxStats.water,
            );
          if (effect.armor)
            player.armor = Math.min(
              player.armor + effect.armor,
              player.maxStats.armor,
            );

          // Жёсткие ограничения (как было)
          player.health = Math.max(
            0,
            Math.min(player.health, player.maxStats?.health || 100),
          );
          player.energy = Math.max(
            0,
            Math.min(player.energy, player.maxStats?.energy || 100),
          );
          player.food = Math.max(
            0,
            Math.min(player.food, player.maxStats?.food || 100),
          );
          player.water = Math.max(
            0,
            Math.min(player.water, player.maxStats?.water || 100),
          );
          player.armor = Math.max(
            0,
            Math.min(player.armor, player.maxStats?.armor || 0),
          );

          // Уменьшаем/удаляем предмет
          if (ITEM_CONFIG[item.type].stackable) {
            if (item.quantity > 1) {
              player.inventory[slotIndex].quantity -= 1;
            } else {
              player.inventory[slotIndex] = null;
            }
          } else {
            player.inventory[slotIndex] = null;
          }

          // Сохраняем изменения
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Отправляем успех клиенту (как было)
          ws.send(
            JSON.stringify({
              type: "useItemSuccess",
              stats: {
                health: player.health,
                energy: player.energy,
                food: player.food,
                water: player.water,
                armor: player.armor,
              },
              inventory: player.inventory,
            }),
          );
        }

        ws.isProcessingUseItem = false;
      }
      async function processEquipQueue(ws) {
        if (ws.isProcessingEquip) return;
        ws.isProcessingEquip = true;

        while (ws.equipQueue.length > 0) {
          const data = ws.equipQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) {
            ws.send(
              JSON.stringify({
                type: "equipItemFail",
                error: "Игрок не найден",
              }),
            );
            continue;
          }

          const player = players.get(playerId);
          const { slotIndex, slotName } = data;

          // Валидация слота инвентаря
          if (
            slotIndex < 0 ||
            slotIndex >= player.inventory.length ||
            !player.inventory[slotIndex]
          ) {
            ws.send(
              JSON.stringify({
                type: "equipItemFail",
                error: "Неверный слот инвентаря",
              }),
            );
            continue;
          }

          const item = player.inventory[slotIndex];
          const config = ITEM_CONFIG[item.type];

          if (!config || !config.type) {
            ws.send(
              JSON.stringify({
                type: "equipItemFail",
                error: "Некорректный предмет",
              }),
            );
            continue;
          }

          // Проверка уровня
          if (
            config.level !== undefined &&
            (player.level || 0) < config.level
          ) {
            ws.send(
              JSON.stringify({
                type: "equipItemFail",
                error: `Требуется уровень ${config.level} для экипировки этого предмета`,
              }),
            );
            continue;
          }

          // Определяем целевой слот экипировки
          let targetSlot = slotName;

          if (config.type === "weapon") {
            if (config.hands === "twohanded") {
              if (player.equipment.offhand !== null) {
                ws.send(
                  JSON.stringify({
                    type: "equipItemFail",
                    error:
                      "Снимите предмет со второй руки для двуручного оружия",
                  }),
                );
                continue;
              }
              targetSlot = "weapon";
            } else if (config.hands === "onehanded") {
              const currentWeapon = player.equipment.weapon;

              if (currentWeapon) {
                const currentConfig = ITEM_CONFIG[currentWeapon.type];
                if (currentConfig?.hands === "twohanded") {
                  // Если сейчас двуручное → новое одноручное ставим вместо него
                  targetSlot = "weapon";
                } else {
                  // Обычная логика одноручных
                  if (player.equipment.offhand === null) {
                    targetSlot = "offhand";
                  } else {
                    targetSlot = "weapon";
                  }
                }
              } else {
                targetSlot = "weapon";
              }
            }
          } else {
            targetSlot = EQUIPMENT_TYPES[config.type];
            if (!targetSlot) {
              ws.send(
                JSON.stringify({
                  type: "equipItemFail",
                  error: "Нельзя экипировать в этот слот",
                }),
              );
              continue;
            }
          }

          const oldItem = player.equipment[targetSlot];

          if (oldItem) {
            player.inventory[slotIndex] = {
              type: oldItem.type,
              itemId: oldItem.itemId,
            };
          } else {
            player.inventory[slotIndex] = null;
          }

          player.equipment[targetSlot] = {
            type: item.type,
            itemId: item.itemId,
          };

          if (oldItem) {
            const oldConfig = ITEM_CONFIG[oldItem.type];
            if (
              oldConfig?.type === "weapon" &&
              oldConfig.hands === "twohanded"
            ) {
              player.equipment.offhand = null;
            }
          }

          if (config.hands === "twohanded") {
            player.equipment.offhand = null;
          }

          // Пересчитываем статы
          calculateMaxStats(player, ITEM_CONFIG);

          // Сохраняем изменения
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Отправляем успех текущему игроку
          ws.send(
            JSON.stringify({
              type: "equipItemSuccess",
              inventory: player.inventory,
              equipment: player.equipment,
              maxStats: player.maxStats,
              stats: {
                health: player.health,
                energy: player.energy,
                food: player.food,
                water: player.water,
                armor: player.armor,
              },
            }),
          );

          // Рассылаем обновление статов всем в мире
          broadcastToWorld(
            wss,
            clients,
            players,
            player.worldId,
            JSON.stringify({
              type: "update",
              player: {
                id: playerId,
                maxStats: player.maxStats,
                health: player.health,
                energy: player.energy,
                food: player.food,
                water: player.water,
                armor: player.armor,
              },
            }),
          );
        }

        ws.isProcessingEquip = false;
      }
      async function processUnequipQueue(ws) {
        if (ws.isProcessingUnequip) return;
        ws.isProcessingUnequip = true;

        while (ws.unequipQueue.length > 0) {
          const data = ws.unequipQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId) {
            ws.send(
              JSON.stringify({
                type: "unequipItemFail",
                error: "Игрок не найден",
              }),
            );
            continue;
          }

          const player = players.get(playerId);
          if (!player?.equipment || !player?.inventory) {
            ws.send(
              JSON.stringify({
                type: "unequipItemFail",
                error: "Данные игрока недоступны",
              }),
            );
            continue;
          }

          const { slotName, inventorySlot, itemId } = data;

          const validSlots = [
            "head",
            "chest",
            "belt",
            "pants",
            "boots",
            "weapon",
            "offhand",
            "gloves",
          ];

          if (!validSlots.includes(slotName)) {
            ws.send(
              JSON.stringify({
                type: "unequipItemFail",
                error: "Недопустимый слот",
              }),
            );
            continue;
          }

          // Проверяем наличие предмета и совпадение itemId (защита от подмены)
          const equippedItem = player.equipment[slotName];
          if (!equippedItem || equippedItem.itemId !== itemId) {
            ws.send(
              JSON.stringify({
                type: "unequipItemFail",
                error: "Предмет не найден в слоте или неверный itemId",
              }),
            );
            continue;
          }

          // Проверяем, что указанный слот инвентаря действительно свободен
          if (
            inventorySlot < 0 ||
            inventorySlot >= player.inventory.length ||
            player.inventory[inventorySlot] !== null
          ) {
            ws.send(
              JSON.stringify({
                type: "unequipItemFail",
                error: "Указанный слот инвентаря недоступен или занят",
              }),
            );
            continue;
          }

          // Снимаем предмет и кладём ровно в тот слот инвентаря, который указал клиент
          player.inventory[inventorySlot] = {
            type: equippedItem.type,
            itemId: equippedItem.itemId,
            // quantity: equippedItem.quantity || 1,   // если в будущем будут стакающиеся предметы экипировки
          };

          player.equipment[slotName] = null;

          // Специальная обработка двуручного оружия
          const config = ITEM_CONFIG[equippedItem.type];
          if (config?.type === "weapon" && config.hands === "twohanded") {
            player.equipment.offhand = null;
          }

          // Пересчитываем характеристики
          calculateMaxStats(player, ITEM_CONFIG);

          // Сохраняем изменения
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Успешный ответ
          ws.send(
            JSON.stringify({
              type: "unequipItemSuccess",
              slotName,
              inventorySlot,
              inventory: player.inventory,
              equipment: player.equipment,
              maxStats: player.maxStats,
              stats: {
                health: player.health,
                energy: player.energy,
                food: player.food,
                water: player.water,
                armor: player.armor,
              },
            }),
          );

          // Рассылка обновления другим игрокам в мире
          broadcastToWorld(
            wss,
            clients,
            players,
            player.worldId,
            JSON.stringify({
              type: "update",
              player: {
                id: playerId,
                maxStats: player.maxStats,
                health: player.health,
                energy: player.energy,
                food: player.food,
                water: player.water,
                armor: player.armor,
              },
            }),
          );
        }

        ws.isProcessingUnequip = false;
      }
      async function processTradeRequestQueue(ws) {
        if (ws.isProcessingTradeRequest) return;
        ws.isProcessingTradeRequest = true;

        while (ws.tradeRequestQueue.length > 0) {
          const data = ws.tradeRequestQueue.shift();

          const fromId = clients.get(ws);
          if (!fromId) continue;

          const toId = data.toId;
          const playerA = players.get(fromId);
          const playerB = players.get(toId);

          // УБРАНЫ ПРОВЕРКИ НА РАССТОЯНИЕ И ЗДОРОВЬЕ (как было)
          if (!playerA || !playerB || playerA.worldId !== playerB.worldId)
            continue;

          // Всегда сортированный ключ (меньший ID первым) — защита от дубликатов
          const sortedIds = [fromId, toId].sort();
          const tradeKey = `${sortedIds[0]}-${sortedIds[1]}`;

          // Если уже есть активный запрос — не перезаписываем (можно добавить логику отказа, но пока как было)
          if (tradeRequests.has(tradeKey)) continue;

          tradeRequests.set(tradeKey, { status: "pending" });

          // Отправляем уведомление ТОЛЬКО целевому игроку
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              clients.get(client) === toId
            ) {
              client.send(
                JSON.stringify({ type: "tradeRequest", fromId, toId }),
              );
            }
          });
        }

        ws.isProcessingTradeRequest = false;
      }
      async function processTradeAcceptedQueue(ws) {
        if (ws.isProcessingTradeAccepted) return;
        ws.isProcessingTradeAccepted = true;

        while (ws.tradeAcceptedQueue.length > 0) {
          const data = ws.tradeAcceptedQueue.shift();

          const fromId = data.fromId; // кто принял (B)
          const toId = data.toId; // инициатор (A)

          // Всегда сортированный ключ (защита от дубликатов)
          const sortedIds = [fromId, toId].sort();
          const tradeKey = `${sortedIds[0]}-${sortedIds[1]}`;

          // Проверяем, что запрос существует и ещё pending
          if (
            !tradeRequests.has(tradeKey) ||
            tradeRequests.get(tradeKey).status !== "pending"
          ) {
            continue;
          }

          // Меняем статус и создаём офферы
          tradeRequests.set(tradeKey, { status: "accepted" });

          tradeOffers.set(tradeKey, {
            myOffer: Array(4).fill(null),
            partnerOffer: Array(4).fill(null),
            myConfirmed: false,
            partnerConfirmed: false,
          });

          // Уведомляем обоих о начале торговли
          // fromId в сообщении = инициатор (A) для обоих клиентов
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientId = clients.get(client);
              if (clientId === fromId || clientId === toId) {
                client.send(
                  JSON.stringify({
                    type: "tradeAccepted",
                    fromId: toId, // initiator
                    toId: fromId, // acceptor
                  }),
                );
              }
            }
          });
        }

        ws.isProcessingTradeAccepted = false;
      }
      async function processTradeOfferQueue(ws) {
        if (ws.isProcessingTradeOffer) return;
        ws.isProcessingTradeOffer = true;

        while (ws.tradeOfferQueue.length > 0) {
          const data = ws.tradeOfferQueue.shift();

          const fromId = clients.get(ws);
          if (!fromId) continue;

          const toId = data.toId;
          const tradeKey =
            fromId < toId ? `${fromId}-${toId}` : `${toId}-${fromId}`;

          if (!tradeOffers.has(tradeKey)) continue;

          // Получаем текущие офферы
          const offers = tradeOffers.get(tradeKey);

          // Обновляем нужную сторону
          if (fromId === tradeKey.split("-")[0]) {
            // fromId — инициатор (A)
            offers.myOffer = data.offer;
          } else {
            // fromId — второй игрок (B)
            offers.partnerOffer = data.offer;
          }

          // Сохраняем изменения
          tradeOffers.set(tradeKey, offers);

          // Отправляем обновление ТОЛЬКО партнёру
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              clients.get(client) === toId
            ) {
              client.send(
                JSON.stringify({
                  type: "tradeOffer",
                  fromId,
                  offer: data.offer,
                }),
              );
            }
          });
        }

        ws.isProcessingTradeOffer = false;
      }
      async function processTradeConfirmedQueue(ws) {
        if (ws.isProcessingTradeConfirmed) return;
        ws.isProcessingTradeConfirmed = true;

        while (ws.tradeConfirmedQueue.length > 0) {
          const data = ws.tradeConfirmedQueue.shift();

          const fromId = clients.get(ws);
          if (!fromId) continue;

          const toId = data.toId;
          const tradeKey =
            fromId < toId ? `${fromId}-${toId}` : `${toId}-${fromId}`;

          if (!tradeOffers.has(tradeKey)) continue;

          const offers = tradeOffers.get(tradeKey);

          // Обновляем флаг подтверждения
          if (fromId === tradeKey.split("-")[0]) {
            // fromId — инициатор (A)
            offers.myConfirmed = true;
          } else {
            // fromId — второй игрок (B)
            offers.partnerConfirmed = true;
          }

          // Сохраняем изменения
          tradeOffers.set(tradeKey, offers);

          // Отправляем подтверждение ТОЛЬКО партнёру
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              clients.get(client) === toId
            ) {
              client.send(
                JSON.stringify({
                  type: "tradeConfirmed",
                  fromId,
                }),
              );
            }
          });
        }

        ws.isProcessingTradeConfirmed = false;
      }
      async function processTradeCompletedQueue(ws) {
        if (ws.isProcessingTradeCompleted) return;
        ws.isProcessingTradeCompleted = true;

        while (ws.tradeCompletedQueue.length > 0) {
          const data = ws.tradeCompletedQueue.shift();

          const fromId = clients.get(ws);
          if (!fromId || !players.has(fromId)) continue;

          // Получаем второго участника
          let toId = data.toId;
          if (!toId || !players.has(toId)) {
            // Если toId не пришёл — ищем по активным трейдам
            for (const [key, offers] of tradeOffers.entries()) {
              const [id1, id2] = key.split("-");
              if (id1 === fromId || id2 === fromId) {
                toId = id1 === fromId ? id2 : id1;
                break;
              }
            }
          }
          if (!toId || !players.has(toId)) continue;

          // Нормализуем ключ (меньший ID первым)
          const tradeKey =
            fromId < toId ? `${fromId}-${toId}` : `${toId}-${fromId}`;
          if (!tradeOffers.has(tradeKey)) continue;

          const offers = tradeOffers.get(tradeKey);
          if (!offers.myConfirmed || !offers.partnerConfirmed) continue;

          // Определяем игроков
          const playerAId = tradeKey.split("-")[0]; // меньший ID
          const playerBId = tradeKey.split("-")[1];
          const playerA = players.get(playerAId);
          const playerB = players.get(playerBId);

          if (!playerA || !playerB || !playerA.inventory || !playerB.inventory)
            continue;

          // Определяем офферы (A — меньший ID)
          const offerFromA = offers.myOffer;
          const offerFromB = offers.partnerOffer;

          // ВАЛИДАЦИЯ: предметы на месте
          const validateOffer = (player, offer) => {
            return offer.every((item) => {
              if (!item) return true;
              const invItem = player.inventory[item.originalSlot];
              if (!invItem) return false;
              if (invItem.type !== item.type) return false;
              if (item.quantity && invItem.quantity < item.quantity)
                return false;
              return true;
            });
          };

          if (
            !validateOffer(playerA, offerFromA) ||
            !validateOffer(playerB, offerFromB)
          ) {
            broadcastTradeCancelled(wss, clients, playerAId, playerBId);
            tradeRequests.delete(tradeKey);
            tradeOffers.delete(tradeKey);
            continue;
          }

          // Проверка свободного места
          const calculateRequiredSlots = (player, incomingOffer) => {
            let required = 0;
            incomingOffer.forEach((item) => {
              if (!item) return;
              const type = item.type;
              const isStackable = ITEM_CONFIG[type]?.stackable;
              if (isStackable) {
                const hasStack = player.inventory.some(
                  (s) => s && s.type === type,
                );
                if (!hasStack) required += 1;
              } else {
                required += 1;
              }
            });
            return required;
          };

          const calculateFreedSlots = (player, ownOffer) => {
            let freed = 0;
            ownOffer.forEach((item) => {
              if (!item || item.originalSlot === undefined) return;
              const slotItem = player.inventory[item.originalSlot];
              if (!slotItem) return;
              if (ITEM_CONFIG[item.type]?.stackable && item.quantity) {
                const remaining = (slotItem.quantity || 1) - item.quantity;
                if (remaining <= 0) freed += 1;
              } else {
                freed += 1;
              }
            });
            return freed;
          };

          const freeSlotsA = playerA.inventory.filter((s) => s === null).length;
          const freeSlotsB = playerB.inventory.filter((s) => s === null).length;

          const freedByA = calculateFreedSlots(playerA, offerFromA);
          const freedByB = calculateFreedSlots(playerB, offerFromB);

          const totalAvailableA = freeSlotsA + freedByA;
          const totalAvailableB = freeSlotsB + freedByB;

          const requiredForA = calculateRequiredSlots(playerA, offerFromB);
          const requiredForB = calculateRequiredSlots(playerB, offerFromA);

          if (
            totalAvailableA < requiredForA ||
            totalAvailableB < requiredForB
          ) {
            broadcastTradeCancelled(wss, clients, playerAId, playerBId);
            tradeRequests.delete(tradeKey);
            tradeOffers.delete(tradeKey);
            continue;
          }

          // УДАЛЕНИЕ отданных предметов (с поддержкой частичного стака)
          offerFromA.forEach((item) => {
            if (item && item.originalSlot !== undefined) {
              const slotIndex = item.originalSlot;
              const invItem = playerA.inventory[slotIndex];
              if (!invItem || invItem.type !== item.type) return;
              if (ITEM_CONFIG[item.type]?.stackable && item.quantity) {
                invItem.quantity = (invItem.quantity || 1) - item.quantity;
                if (invItem.quantity <= 0) playerA.inventory[slotIndex] = null;
              } else {
                playerA.inventory[slotIndex] = null;
              }
            }
          });

          offerFromB.forEach((item) => {
            if (item && item.originalSlot !== undefined) {
              const slotIndex = item.originalSlot;
              const invItem = playerB.inventory[slotIndex];
              if (!invItem || invItem.type !== item.type) return;
              if (ITEM_CONFIG[item.type]?.stackable && item.quantity) {
                invItem.quantity = (invItem.quantity || 1) - item.quantity;
                if (invItem.quantity <= 0) playerB.inventory[slotIndex] = null;
              } else {
                playerB.inventory[slotIndex] = null;
              }
            }
          });

          // ДОБАВЛЕНИЕ полученных предметов (с поиском стака)
          const addItemsToPlayer = (player, itemsToAdd) => {
            itemsToAdd.forEach((item) => {
              if (!item) return;
              const type = item.type;
              const qty = item.quantity || 1;
              if (ITEM_CONFIG[type]?.stackable) {
                let added = false;
                for (let i = 0; i < player.inventory.length; i++) {
                  const slot = player.inventory[i];
                  if (slot && slot.type === type) {
                    slot.quantity = (slot.quantity || 1) + qty;
                    added = true;
                    break;
                  }
                }
                if (added) return;
              }
              const freeSlot = player.inventory.findIndex((s) => s === null);
              if (freeSlot !== -1) {
                player.inventory[freeSlot] = {
                  type,
                  quantity: qty,
                  itemId: `${type}_${Date.now()}_${Math.random()}`,
                };
              }
            });
          };

          addItemsToPlayer(playerA, offerFromB);
          addItemsToPlayer(playerB, offerFromA);

          // Сохранение
          players.set(playerAId, { ...playerA });
          players.set(playerBId, { ...playerB });
          userDatabase.set(playerAId, { ...playerA });
          userDatabase.set(playerBId, { ...playerB });
          await saveUserDatabase(dbCollection, playerAId, playerA);
          await saveUserDatabase(dbCollection, playerBId, playerB);

          // Отправка каждому новому инвентарю
          wss.clients.forEach((client) => {
            if (client.readyState !== WebSocket.OPEN) return;
            const clientId = clients.get(client);
            if (clientId === playerAId) {
              client.send(
                JSON.stringify({
                  type: "tradeCompleted",
                  newInventory: playerA.inventory,
                }),
              );
            } else if (clientId === playerBId) {
              client.send(
                JSON.stringify({
                  type: "tradeCompleted",
                  newInventory: playerB.inventory,
                }),
              );
            }
          });

          // Очистка
          tradeRequests.delete(tradeKey);
          tradeOffers.delete(tradeKey);
        }

        ws.isProcessingTradeCompleted = false;
      }
      async function processTradeCancelledQueue(ws) {
        if (ws.isProcessingTradeCancelled) return;
        ws.isProcessingTradeCancelled = true;

        while (ws.tradeCancelledQueue.length > 0) {
          const data = ws.tradeCancelledQueue.shift();

          const fromId = clients.get(ws);
          if (!fromId) continue;

          const toId = data.toId;
          if (!toId) continue;

          // Симметричный ключ (меньший ID первым)
          const tradeKey =
            fromId < toId ? `${fromId}-${toId}` : `${toId}-${fromId}`;

          // Очищаем состояние торговли
          tradeRequests.delete(tradeKey);
          tradeOffers.delete(tradeKey);

          // Уведомляем обоих участников об отмене
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientId = clients.get(client);
              if (clientId === fromId || clientId === toId) {
                client.send(JSON.stringify({ type: "tradeCancelled" }));
              }
            }
          });
        }

        ws.isProcessingTradeCancelled = false;
      }
      async function processTradeChatQueue(ws) {
        if (ws.isProcessingTradeChat) return;
        ws.isProcessingTradeChat = true;

        while (ws.tradeChatQueue.length > 0) {
          const data = ws.tradeChatQueue.shift();

          const fromId = clients.get(ws);
          if (!fromId) continue;

          const toId = data.toId;
          if (!toId || !players.has(toId)) continue;

          // Проверяем, что торговля всё ещё активна
          const sortedIds = [fromId, toId].sort();
          const tradeKey = `${sortedIds[0]}-${sortedIds[1]}`;

          if (!tradeOffers.has(tradeKey) && !tradeRequests.has(tradeKey)) {
            continue; // Торговля уже завершена/отменена — игнорируем
          }

          const messagePacket = JSON.stringify({
            type: "tradeChatMessage",
            fromId: fromId,
            message: data.message,
          });

          // Рассылаем сообщение обоим участникам (отправителю и получателю)
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientId = clients.get(client);
              if (clientId === toId || clientId === fromId) {
                client.send(messagePacket);
              }
            }
          });
        }

        ws.isProcessingTradeChat = false;
      }
      async function processRobotDoctorFreeHealQueue(ws) {
        if (ws.isProcessingRobotDoctorFreeHeal) return;
        ws.isProcessingRobotDoctorFreeHeal = true;

        while (ws.robotDoctorFreeHealQueue.length > 0) {
          const data = ws.robotDoctorFreeHealQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          const player = players.get(playerId);

          // Проверка условий (уровень ≤ 5 и здоровье не полное)
          if (player.level > 5 || player.health >= player.maxStats.health) {
            ws.send(
              JSON.stringify({
                type: "robotDoctorResult",
                success: false,
                error: "Условия не выполнены",
              }),
            );
            continue;
          }

          // Полное восстановление здоровья
          player.health = player.maxStats.health;

          // Сохраняем изменения
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Отправляем успешный результат
          ws.send(
            JSON.stringify({
              type: "robotDoctorResult",
              success: true,
              action: "freeHeal",
              health: player.health,
            }),
          );
        }

        ws.isProcessingRobotDoctorFreeHeal = false;
      }
      async function processCompleteDoctorQuestQueue(ws) {
        if (ws.isProcessingCompleteDoctorQuest) return;
        ws.isProcessingCompleteDoctorQuest = true;

        while (ws.completeDoctorQuestQueue.length > 0) {
          const data = ws.completeDoctorQuestQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId) continue;

          const player = players.get(playerId);
          if (!player) continue;

          // Проверяем, не получал ли уже справку
          if (player.medicalCertificate === true) {
            ws.send(JSON.stringify({ type: "doctorQuestAlreadyDone" }));
            continue;
          }

          // Ищем свободный слот
          const freeSlot = player.inventory.findIndex((slot) => slot === null);
          if (freeSlot === -1) {
            ws.send(JSON.stringify({ type: "inventoryFull" }));
            continue;
          }

          // Выдаём медицинскую справку
          player.inventory[freeSlot] = {
            type: "medical_certificate",
            quantity: 1,
          };

          // Ставим флаг навсегда
          player.medicalCertificate = true;

          // Сохраняем изменения
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Отправляем успешный результат клиенту
          ws.send(
            JSON.stringify({
              type: "doctorQuestCompleted",
              inventory: player.inventory,
              medicalCertificate: true,
            }),
          );
        }

        ws.isProcessingCompleteDoctorQuest = false;
      }
      async function processRobotDoctorHeal20Queue(ws) {
        if (ws.isProcessingRobotDoctorHeal20) return;
        ws.isProcessingRobotDoctorHeal20 = true;

        while (ws.robotDoctorHeal20Queue.length > 0) {
          const data = ws.robotDoctorHeal20Queue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          const player = players.get(playerId);

          // Ищем баляры
          const balyarySlot = player.inventory.findIndex(
            (s) => s && s.type === "balyary",
          );

          // Проверка наличия хотя бы 1 баляра
          if (
            balyarySlot === -1 ||
            (player.inventory[balyarySlot].quantity || 0) < 1
          ) {
            ws.send(
              JSON.stringify({
                type: "robotDoctorResult",
                success: false,
                error: "Нет баляров",
              }),
            );
            continue;
          }

          // Снимаем ровно 1 баляр
          if (player.inventory[balyarySlot].quantity === 1) {
            player.inventory[balyarySlot] = null;
          } else {
            player.inventory[balyarySlot].quantity -= 1;
          }

          // +20 HP, но не выше максимума
          player.health = Math.min(player.maxStats.health, player.health + 20);

          // Сохраняем изменения
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Отправляем успешный результат
          ws.send(
            JSON.stringify({
              type: "robotDoctorResult",
              success: true,
              action: "heal20",
              health: player.health,
              inventory: player.inventory,
            }),
          );
        }

        ws.isProcessingRobotDoctorHeal20 = false;
      }
      async function processRobotDoctorFullHealQueue(ws) {
        if (ws.isProcessingRobotDoctorFullHeal) return;
        ws.isProcessingRobotDoctorFullHeal = true;

        while (ws.robotDoctorFullHealQueue.length > 0) {
          const data = ws.robotDoctorFullHealQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          const player = players.get(playerId);

          const missingHP = player.maxStats.health - player.health;
          if (missingHP <= 0) {
            ws.send(
              JSON.stringify({
                type: "robotDoctorResult",
                success: false,
                error: "Здоровье уже полное",
              }),
            );
            continue;
          }

          const cost = Math.floor(missingHP / 20);

          // Ищем баляры
          const balyarySlot = player.inventory.findIndex(
            (s) => s && s.type === "balyary",
          );
          const balyaryCount =
            balyarySlot !== -1
              ? player.inventory[balyarySlot].quantity || 0
              : 0;

          if (balyaryCount < cost) {
            ws.send(
              JSON.stringify({
                type: "robotDoctorResult",
                success: false,
                error: "Недостаточно баляров",
              }),
            );
            continue;
          }

          // Снимаем ровно нужное количество баляров
          if (balyaryCount === cost) {
            player.inventory[balyarySlot] = null;
          } else {
            player.inventory[balyarySlot].quantity -= cost;
          }

          // Полное восстановление здоровья
          player.health = player.maxStats.health;

          // Сохраняем изменения
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Отправляем успешный результат
          ws.send(
            JSON.stringify({
              type: "robotDoctorResult",
              success: true,
              action: "fullHeal",
              health: player.health,
              cost: cost,
              inventory: player.inventory,
            }),
          );
        }

        ws.isProcessingRobotDoctorFullHeal = false;
      }
      async function processBuyWaterQueue(ws) {
        if (ws.isProcessingBuyWater) return;
        ws.isProcessingBuyWater = true;

        while (ws.buyWaterQueue.length > 0) {
          const data = ws.buyWaterQueue.shift();

          const id = clients.get(ws);
          if (!id) continue;

          const player = players.get(id);
          if (!player || !player.inventory) continue;

          const balyarySlot = player.inventory.findIndex(
            (slot) => slot && slot.type === "balyary",
          );
          const balyaryCount =
            balyarySlot !== -1
              ? player.inventory[balyarySlot].quantity || 0
              : 0;

          if (balyaryCount < data.cost) {
            ws.send(
              JSON.stringify({
                type: "buyWaterResult",
                success: false,
                error: "Not enough balyary!",
              }),
            );
            continue;
          }

          // Снимаем ровно data.cost баляров
          if (balyaryCount === data.cost) {
            player.inventory[balyarySlot] = null;
          } else {
            player.inventory[balyarySlot].quantity -= data.cost;
          }

          // Добавляем воду, но не выше максимума
          player.water = Math.min(
            player.maxStats.water,
            player.water + data.waterGain,
          );

          // Сохраняем изменения
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Отправляем успешный результат
          ws.send(
            JSON.stringify({
              type: "buyWaterResult",
              success: true,
              option: data.option,
              water: player.water,
              inventory: player.inventory,
              balyaryCount:
                balyarySlot !== -1
                  ? player.inventory[balyarySlot]?.quantity || 0
                  : 0,
            }),
          );
        }

        ws.isProcessingBuyWater = false;
      }
      async function processUpdateLevelQueue(ws) {
        if (ws.isProcessingUpdateLevel) return;
        ws.isProcessingUpdateLevel = true;

        while (ws.updateLevelQueue.length > 0) {
          const data = ws.updateLevelQueue.shift();

          const id = clients.get(ws);
          if (!id || !players.has(id)) continue;

          const player = players.get(id);

          // Обновляем значения с защитой от NaN и отрицательных
          player.level = Number(data.level) || player.level || 0;
          player.xp = Number(data.xp) || player.xp || 0;
          player.upgradePoints =
            Number(data.upgradePoints) || player.upgradePoints || 0;

          // Самое важное — skillPoints
          if (
            data.skillPoints !== undefined &&
            !isNaN(Number(data.skillPoints))
          ) {
            const newSkillPoints = Math.max(0, Number(data.skillPoints));
            if (newSkillPoints !== player.skillPoints) {
              console.log(
                `[LevelUp] Игрок ${id} получил skillPoints: ${player.skillPoints} → ${newSkillPoints}`,
              );
              player.skillPoints = newSkillPoints;
            }
          }

          // Сохраняем изменения
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Рассылаем обновление только этому игроку
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              clients.get(client) === id
            ) {
              client.send(
                JSON.stringify({
                  type: "update",
                  player: {
                    id,
                    level: player.level,
                    xp: player.xp,
                    upgradePoints: player.upgradePoints,
                    skillPoints: player.skillPoints,
                  },
                }),
              );
            }
          });
        }

        ws.isProcessingUpdateLevel = false;
      }
      async function processUpdateMaxStatsQueue(ws) {
        if (ws.isProcessingUpdateMaxStats) return;
        ws.isProcessingUpdateMaxStats = true;

        while (ws.updateMaxStatsQueue.length > 0) {
          const data = ws.updateMaxStatsQueue.shift();

          const id = clients.get(ws);
          if (!id) continue;

          const player = players.get(id);
          if (!player) continue;

          // Обновляем upgradePoints и upgrade-поля
          player.upgradePoints = data.upgradePoints;

          // СОХРАНЯЕМ UPGRADE ПОЛЯ (fallback на старое значение, если не пришло)
          player.healthUpgrade =
            data.healthUpgrade !== undefined
              ? data.healthUpgrade
              : player.healthUpgrade || 0;
          player.energyUpgrade =
            data.energyUpgrade !== undefined
              ? data.energyUpgrade
              : player.energyUpgrade || 0;
          player.foodUpgrade =
            data.foodUpgrade !== undefined
              ? data.foodUpgrade
              : player.foodUpgrade || 0;
          player.waterUpgrade =
            data.waterUpgrade !== undefined
              ? data.waterUpgrade
              : player.waterUpgrade || 0;

          // Сохраняем изменения
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Рассылаем обновление только этому игроку
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              clients.get(client) === id
            ) {
              client.send(
                JSON.stringify({
                  type: "update",
                  player: {
                    id,
                    upgradePoints: player.upgradePoints,
                    healthUpgrade: player.healthUpgrade,
                    energyUpgrade: player.energyUpgrade,
                    foodUpgrade: player.foodUpgrade,
                    waterUpgrade: player.waterUpgrade,
                    // Можно добавить maxStats/health/energy/food/water, если клиент их пересчитывает на основе upgrade
                    // maxStats: player.maxStats, // если пересчитывается на сервере
                  },
                }),
              );
            }
          });
        }

        ws.isProcessingUpdateMaxStats = false;
      }
      async function processUpdateInventoryQueue(ws) {
        if (ws.isProcessingUpdateInventory) return;
        ws.isProcessingUpdateInventory = true;

        while (ws.updateInventoryQueue.length > 0) {
          const data = ws.updateInventoryQueue.shift();

          const id = clients.get(ws);
          if (!id) continue;

          const player = players.get(id);
          if (!player) continue;

          // Полностью заменяем инвентарь новым массивом
          player.inventory = data.inventory;

          // Обновляем availableQuests, если пришло
          player.availableQuests =
            data.availableQuests !== undefined
              ? data.availableQuests
              : player.availableQuests;

          // Сохраняем изменения
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Рассылаем обновление только этому игроку
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              clients.get(client) === id
            ) {
              client.send(
                JSON.stringify({
                  type: "update",
                  player: {
                    id,
                    inventory: player.inventory,
                    availableQuests: player.availableQuests,
                    // Можно добавить другие поля, если клиент их ждёт
                  },
                }),
              );
            }
          });
        }

        ws.isProcessingUpdateInventory = false;
      }
      async function processNeonQuestSyncQueue(ws) {
        if (ws.isProcessingNeonQuestSync) return;
        ws.isProcessingNeonQuestSync = true;

        while (ws.neonQuestSyncQueue.length > 0) {
          const data = ws.neonQuestSyncQueue.shift();

          const id = clients.get(ws);
          if (!id) continue;

          const player = players.get(id);
          if (!player) continue;

          // Отправляем текущее состояние квеста (без изменений в базе)
          ws.send(
            JSON.stringify({
              type: "neonQuestSync",
              progress: player.neonQuest || {
                currentQuestId: null,
                progress: 0,
                completed: [],
              },
              isMet: player.alexNeonMet || false,
            }),
          );
        }

        ws.isProcessingNeonQuestSync = false;
      }
      async function processNeonQuestProgressQueue(ws) {
        if (ws.isProcessingNeonQuestProgress) return;
        ws.isProcessingNeonQuestProgress = true;

        while (ws.neonQuestProgressQueue.length > 0) {
          const data = ws.neonQuestProgressQueue.shift();

          const id = clients.get(ws);
          if (!id) continue;

          const player = players.get(id);
          if (!player) continue;

          // Проверяем, есть ли активный квест
          if (player.neonQuest && player.neonQuest.currentQuestId) {
            // Сливаем пришедший прогресс в существующий
            player.neonQuest.progress = {
              ...player.neonQuest.progress,
              ...data.progress,
            };

            // Сохраняем изменения
            players.set(id, { ...player });
            userDatabase.set(id, { ...player });
            await saveUserDatabase(dbCollection, id, player);
          }
          // Ничего не отправляем клиенту — обновление одностороннее
        }

        ws.isProcessingNeonQuestProgress = false;
      }
      async function processNeonQuestCompleteQueue(ws) {
        if (ws.isProcessingNeonQuestComplete) return;
        ws.isProcessingNeonQuestComplete = true;

        while (ws.neonQuestCompleteQueue.length > 0) {
          const data = ws.neonQuestCompleteQueue.shift();

          const id = clients.get(ws);
          if (!id || !players.has(id)) continue;

          const player = players.get(id);

          // Проверяем, что квест активен и именно "neon_quest_1"
          if (
            !player.neonQuest ||
            player.neonQuest.currentQuestId !== "neon_quest_1"
          ) {
            continue; // Нельзя сдать
          }

          const kills = player.neonQuest.progress?.killMutants || 0;
          if (kills < 3) {
            continue; // Нельзя сдать — прогресс не выполнен
          }

          // Даём награду
          player.xp = (player.xp || 0) + 150;

          let xpToNext = calculateXPToNextLevel(player.level);
          while (player.xp >= xpToNext && player.level < 100) {
            player.level += 1;
            player.xp -= xpToNext;
            player.upgradePoints = (player.upgradePoints || 0) + 10;
            xpToNext = calculateXPToNextLevel(player.level);
          }

          // Даём 50 баляров (ищем слот или свободный)
          let added = false;
          for (let i = 0; i < player.inventory.length; i++) {
            if (player.inventory[i]?.type === "balyary") {
              player.inventory[i].quantity =
                (player.inventory[i].quantity || 0) + 50;
              added = true;
              break;
            }
            if (!player.inventory[i]) {
              player.inventory[i] = { type: "balyary", quantity: 50 };
              added = true;
              break;
            }
          }

          // Если не добавили (инвентарь полный) — баляры потеряются (как было раньше)

          // Завершаем квест навсегда
          player.neonQuest.currentQuestId = null;
          if (!player.neonQuest.completed) player.neonQuest.completed = [];
          player.neonQuest.completed.push("neon_quest_1");
          player.neonQuest.progress = {};

          // Сохраняем изменения
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Отправляем успешное завершение клиенту
          ws.send(
            JSON.stringify({
              type: "neonQuestCompleted",
              reward: { xp: 150, balyary: 50 },
              level: player.level,
              xp: player.xp,
              xpToNextLevel: xpToNext,
              upgradePoints: player.upgradePoints,
              inventory: player.inventory,
            }),
          );
        }

        ws.isProcessingNeonQuestComplete = false;
      }
      async function processUpdateQuestsQueue(ws) {
        if (ws.isProcessingUpdateQuests) return;
        ws.isProcessingUpdateQuests = true;

        while (ws.updateQuestsQueue.length > 0) {
          const data = ws.updateQuestsQueue.shift();

          const id = clients.get(ws);
          if (!id) continue;

          const player = players.get(id);
          if (!player) continue;

          // Заменяем список доступных квестов (fallback на старый, если не пришло)
          player.availableQuests =
            data.availableQuests !== undefined
              ? data.availableQuests
              : player.availableQuests;

          // Сохраняем изменения
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Ничего не отправляем клиенту — обновление одностороннее
        }

        ws.isProcessingUpdateQuests = false;
      }
      async function processSelectQuestQueue(ws) {
        if (ws.isProcessingSelectQuest) return;
        ws.isProcessingSelectQuest = true;

        while (ws.selectQuestQueue.length > 0) {
          const data = ws.selectQuestQueue.shift();

          const id = clients.get(ws);
          if (!id) continue;

          const player = players.get(id);
          if (!player) continue;

          // Просто присваиваем выбранный ID квеста (без проверок, как было раньше)
          player.selectedQuestId = data.questId;

          // Сохраняем изменения
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
        }

        ws.isProcessingSelectQuest = false;
      }
      async function processNeonQuestAcceptQueue(ws) {
        if (ws.isProcessingNeonQuestAccept) return;
        ws.isProcessingNeonQuestAccept = true;

        while (ws.neonQuestAcceptQueue.length > 0) {
          const data = ws.neonQuestAcceptQueue.shift();

          const id = clients.get(ws);
          if (!id || !players.has(id)) continue;

          const player = players.get(id);

          // ГАРАНТИРУЕМ правильную структуру (как было раньше)
          player.neonQuest = {
            currentQuestId: "neon_quest_1",
            progress: { killMutants: 0 },
            completed: player.neonQuest?.completed || [], // сохраняем старые завершённые
          };

          // Сохраняем изменения
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          // Отправляем клиенту уведомление о начале квеста
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "neonQuestStarted" }));
          }
        }

        ws.isProcessingNeonQuestAccept = false;
      }
      async function processVacuumBalyaryQueue(ws) {
        if (ws.isProcessingVacuumBalyary) return;
        ws.isProcessingVacuumBalyary = true;

        while (ws.vacuumBalyaryQueue.length > 0) {
          const data = ws.vacuumBalyaryQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId) continue;

          const player = players.get(playerId);
          if (!player || !player.inventory) continue;

          // Проверяем слот (как было раньше)
          if (data.slot < 0 || data.slot >= 20) continue;

          if (data.isNewStack) {
            // Новый стек баляров
            player.inventory[data.slot] = {
              type: "balyary",
              quantity: data.quantity || 1,
            };
          } else {
            // Добавляем в существующий слот
            if (!player.inventory[data.slot]) {
              player.inventory[data.slot] = { type: "balyary", quantity: 0 };
            }
            player.inventory[data.slot].quantity = data.quantity || 1;
          }

          // Сохраняем изменения
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Отправляем клиенту обновлённый инвентарь (как useItemSuccess)
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "useItemSuccess",
                inventory: player.inventory,
              }),
            );
          }
        }

        ws.isProcessingVacuumBalyary = false;
      }
      async function processRequestCaptainStampQueue(ws) {
        if (ws.isProcessingCaptainStamp) return;
        ws.isProcessingCaptainStamp = true;

        while (ws.requestCaptainStampQueue.length > 0) {
          const data = ws.requestCaptainStampQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          const player = players.get(playerId);

          // Проверяем наличие обычной справки + флаг (как было раньше)
          const certSlot = player.inventory.findIndex(
            (item) => item && item.type === "medical_certificate",
          );

          if (certSlot === -1 || !player.medicalCertificate) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "captainStampResult",
                  success: false,
                  error: "У вас нет медицинской справки МД-07!",
                }),
              );
            }
            continue;
          }

          // Заменяем справку на проштампованную
          player.inventory[certSlot] = {
            type: "medical_certificate_stamped",
            quantity: 1,
          };

          // Главное — ставим флаг!
          player.medicalCertificateStamped = true;

          // Сохраняем всё
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Отправляем клиенту результат + обновлённый инвентарь + флаг
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "captainStampResult",
                success: true,
                inventory: player.inventory,
                medicalCertificateStamped: true,
              }),
            );
          }

          // Бродкастим событие в мир (для эффекта/звука у всех)
          broadcastToWorld(
            wss,
            clients,
            players,
            player.worldId,
            JSON.stringify({
              type: "playerGotStamp",
              playerId: playerId,
            }),
          );
        }

        ws.isProcessingCaptainStamp = false;
      }
      async function processSubmitCorporateDocumentsQueue(ws) {
        if (ws.isProcessingCorporateDocuments) return;
        ws.isProcessingCorporateDocuments = true;

        while (ws.submitCorporateDocumentsQueue.length > 0) {
          const data = ws.submitCorporateDocumentsQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          const player = players.get(playerId);

          // Проверяем все три условия (как было раньше)
          if (
            !player.medicalCertificate ||
            !player.medicalCertificateStamped ||
            !player.inventory.some(
              (item) => item && item.type === "medical_certificate_stamped",
            )
          ) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "corporateDocumentsResult",
                  success: false,
                  error: "Документы не соответствуют требованиям корпорации.",
                }),
              );
            }
            continue;
          }

          // Проверяем, не сдавал ли уже
          if (player.corporateDocumentsSubmitted) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "corporateDocumentsResult",
                  success: false,
                  error: "Вы уже сдали документы ранее.",
                }),
              );
            }
            continue;
          }

          // === УДАЛЯЕМ СПРАВКУ С ПЕЧАТЬЮ ИЗ ИНВЕНТАРЯ ===
          const certIndex = player.inventory.findIndex(
            (item) => item && item.type === "medical_certificate_stamped",
          );
          if (certIndex !== -1) {
            player.inventory[certIndex] = null;
          }

          // === ОПЫТ +66 ===
          player.xp = (player.xp || 0) + 66;

          let xpToNext = calculateXPToNextLevel(player.level);
          while (player.xp >= xpToNext && player.level < 100) {
            player.level += 1;
            player.xp -= xpToNext;
            player.upgradePoints = (player.upgradePoints || 0) + 10;
            xpToNext = calculateXPToNextLevel(player.level);
          }

          // === +10 БАЛЯРОВ ===
          let balyaryAdded = false;
          for (let i = 0; i < player.inventory.length; i++) {
            if (player.inventory[i]?.type === "balyary") {
              player.inventory[i].quantity =
                (player.inventory[i].quantity || 1) + 10;
              balyaryAdded = true;
              break;
            }
            if (!player.inventory[i]) {
              player.inventory[i] = { type: "balyary", quantity: 10 };
              balyaryAdded = true;
              break;
            }
          }

          // === НАБОР НОВИЧКА КОРПОРАЦИИ ===
          const starterArmor = [
            "torn_health_t_shirt",
            "torn_energy_t_shirt",
            "torn_t_shirt_of_thirst",
            "torn_t_shirt_of_gluttony",
          ];
          const starterPants = [
            "torn_pants_of_health",
            "torn_pants_of_energy",
            "torn_pants_of_thirst",
            "torn_pants_of_gluttony",
          ];
          const starterBoots = [
            "torn_health_sneakers",
            "torn_sneakers_of_energy",
            "torn_sneakers_of_thirst",
            "torn_sneakers_of_gluttony",
          ];

          const itemsToGive = [
            starterArmor[Math.floor(Math.random() * starterArmor.length)],
            starterPants[Math.floor(Math.random() * starterPants.length)],
            starterBoots[Math.floor(Math.random() * starterBoots.length)],
            "knuckles", // кастет — всегда
          ];

          const freeSlots = player.inventory.filter(
            (slot) => slot === null,
          ).length;

          if (freeSlots >= itemsToGive.length) {
            itemsToGive.forEach((type) => {
              for (let i = 0; i < player.inventory.length; i++) {
                if (!player.inventory[i]) {
                  player.inventory[i] = { type, quantity: 1 };
                  break;
                }
              }
            });
          } else {
            const radius = 30;

            itemsToGive.forEach((type, index) => {
              const angle = Math.random() * Math.PI * 2;
              const r = Math.random() * radius;

              const x = player.x + Math.cos(angle) * r;
              const y = player.y + Math.sin(angle) * r;

              const itemId = `quest_${type}_${playerId}_${Date.now()}_${index}`;

              const questItem = {
                x,
                y,
                type,
                spawnTime: Date.now(),
                worldId: player.worldId,
                questOwnerId: playerId,
                isQuestItem: true,
              };

              items.set(itemId, questItem);

              // 👁 Отправляем ТОЛЬКО этому игроку
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: "newItem",
                    items: [
                      {
                        itemId,
                        x,
                        y,
                        type,
                        worldId: player.worldId,
                        isQuestItem: true,
                      },
                    ],
                  }),
                );
              }
            });
          }

          // === ФЛАГ СДАЧИ ДОКУМЕНТОВ ===
          player.corporateDocumentsSubmitted = true;

          // === СОХРАНЯЕМ ===
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // === ОТПРАВЛЯЕМ КЛИЕНТУ ВСЁ ОБНОВЛЁННОЕ ===
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "corporateDocumentsResult",
                success: true,
                xpGained: 66,
                balyaryGained: 10,
                level: player.level,
                xp: player.xp,
                xpToNextLevel: xpToNext,
                upgradePoints: player.upgradePoints,
                inventory: player.inventory,
                corporateDocumentsSubmitted: true,
              }),
            );
          }
        }

        ws.isProcessingCorporateDocuments = false;
      }
      async function processThimbleriggerBetQueue(ws) {
        if (ws.isProcessingThimbleriggerBet) return;
        ws.isProcessingThimbleriggerBet = true;

        while (ws.thimbleriggerBetQueue.length > 0) {
          const data = ws.thimbleriggerBetQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          const player = players.get(playerId);
          const bet = data.bet;

          // Находим слот с балярами
          let balyarySlot = player.inventory.findIndex(
            (item) => item && item.type === "balyary",
          );

          if (
            balyarySlot === -1 ||
            (player.inventory[balyarySlot].quantity || 0) < bet
          ) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "thimbleriggerBetResult",
                  success: false,
                  error: "Недостаточно баляров!",
                }),
              );
            }
            continue;
          }

          // Вычитаем ставку
          player.inventory[balyarySlot].quantity -= bet;
          if (player.inventory[balyarySlot].quantity <= 0) {
            player.inventory[balyarySlot] = null;
          }

          // Сохраняем изменения
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Отправляем успех + новый инвентарь
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "thimbleriggerBetResult",
                success: true,
                bet,
                inventory: player.inventory,
              }),
            );
          }
        }

        ws.isProcessingThimbleriggerBet = false;
      }
      async function processThimbleriggerGameResultQueue(ws) {
        if (ws.isProcessingThimbleriggerGameResult) return;
        ws.isProcessingThimbleriggerGameResult = true;

        while (ws.thimbleriggerGameResultQueue.length > 0) {
          const data = ws.thimbleriggerGameResultQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          const player = players.get(playerId);
          const { won, bet, selectedCup, correctCup } = data;

          // Вычисляем xpToNext заранее (как было)
          let xpToNext = calculateXPToNextLevel(player.level);

          // Валидация результата (защита от читов)
          const validatedWon = selectedCup === correctCup;
          if (won !== validatedWon) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "thimbleriggerGameResultSync",
                  success: false,
                  error: "Неверный результат! Игра отменена.",
                }),
              );
            }
            continue;
          }

          let xpGained = 0;
          if (won) {
            // Добавляем выигрыш bet*2 баляров
            let balyarySlot = player.inventory.findIndex(
              (item) => item && item.type === "balyary",
            );
            const winAmount = bet * 2;
            if (balyarySlot !== -1) {
              player.inventory[balyarySlot].quantity =
                (player.inventory[balyarySlot].quantity || 0) + winAmount;
            } else {
              balyarySlot = player.inventory.findIndex((item) => !item);
              if (balyarySlot !== -1) {
                player.inventory[balyarySlot] = {
                  type: "balyary",
                  quantity: winAmount,
                };
              }
            }

            // Добавляем XP = bet
            player.xp = (player.xp || 0) + bet;
            xpGained = bet;

            // Проверяем level up
            while (player.xp >= xpToNext && player.level < 100) {
              player.level += 1;
              player.xp -= xpToNext;
              player.upgradePoints = (player.upgradePoints || 0) + 10;
              xpToNext = calculateXPToNextLevel(player.level);
            }
          }

          // Сохраняем изменения
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Отправляем синхронизацию клиенту
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "thimbleriggerGameResultSync",
                success: true,
                won,
                inventory: player.inventory,
                xp: player.xp,
                level: player.level,
                upgradePoints: player.upgradePoints,
                xpToNext: xpToNext,
                xpGained,
              }),
            );
          }
        }

        ws.isProcessingThimbleriggerGameResult = false;
      }
      async function processBuyFromJackQueue(ws) {
        if (ws.isProcessingBuyFromJack) return;
        ws.isProcessingBuyFromJack = true;

        while (ws.buyFromJackQueue.length > 0) {
          const data = ws.buyFromJackQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "buyFromJackFail",
                  error: "Игрок не найден",
                }),
              );
            }
            continue;
          }

          const player = players.get(playerId);
          const type = data.itemType;
          const cfg = ITEM_CONFIG[type];
          if (!cfg) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "buyFromJackFail",
                  error: "Неверный тип предмета",
                }),
              );
            }
            continue;
          }

          // Проверка: это еда rarity 1-3, не оружие, не чёрный список
          const BLACKLIST = ["balyary", "atom", "blood_pack", "blood_syringe"];
          const isValid =
            cfg.rarity >= 1 &&
            cfg.rarity <= 3 &&
            !BLACKLIST.includes(type) &&
            cfg.category !== "weapon";
          if (!isValid) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "buyFromJackFail",
                  error: "Этот предмет нельзя купить у Джека",
                }),
              );
            }
            continue;
          }

          const price = cfg.rarity; // Цена = rarity
          if (data.price !== price) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "buyFromJackFail",
                  error: "Неверная цена",
                }),
              );
            }
            continue;
          }

          // Находим баляры
          const balyarySlot = player.inventory.findIndex(
            (s) => s && s.type === "balyary",
          );
          const balyaryQty =
            balyarySlot !== -1
              ? player.inventory[balyarySlot].quantity || 0
              : 0;
          if (balyaryQty < price) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "buyFromJackFail",
                  error: "Не хватает баляров",
                }),
              );
            }
            continue;
          }

          // Вычитаем баляры
          if (balyaryQty === price) {
            player.inventory[balyarySlot] = null;
          } else {
            player.inventory[balyarySlot].quantity -= price;
          }

          // Находим свободный слот
          const freeSlot = player.inventory.findIndex((s) => s === null);
          if (freeSlot === -1) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "buyFromJackFail",
                  error: "Инвентарь полон",
                }),
              );
            }
            continue;
          }

          // Добавляем предмет
          player.inventory[freeSlot] = {
            type,
            quantity: 1,
            itemId: `${type}_${Date.now()}`,
          };

          // Сохраняем изменения
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Отправляем успех с новым инвентарём
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "buyFromJackSuccess",
                inventory: player.inventory,
              }),
            );
          }
        }

        ws.isProcessingBuyFromJack = false;
      }
      async function processSellToJackQueue(ws) {
        if (ws.isProcessingSellToJack) return;
        ws.isProcessingSellToJack = true;

        while (ws.sellToJackQueue.length > 0) {
          const data = ws.sellToJackQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "sellToJackFail",
                  error: "Игрок не найден",
                }),
              );
            }
            continue;
          }

          const player = players.get(playerId);
          const slotIndex = data.slotIndex;
          if (slotIndex < 0 || slotIndex >= player.inventory.length) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "sellToJackFail",
                  error: "Неверный слот",
                }),
              );
            }
            continue;
          }

          const item = player.inventory[slotIndex];
          if (!item) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "sellToJackFail",
                  error: "Слот пустой",
                }),
              );
            }
            continue;
          }

          // Проверка: это еда (та же как в покупке)
          const cfg = ITEM_CONFIG[item.type];
          if (!cfg) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "sellToJackFail",
                  error: "Неверный тип предмета",
                }),
              );
            }
            continue;
          }

          const BLACKLIST = ["balyary", "atom", "blood_pack", "blood_syringe"];
          const isFood =
            cfg.rarity >= 1 &&
            cfg.rarity <= 3 &&
            !BLACKLIST.includes(item.type) &&
            cfg.category !== "weapon";
          if (!isFood) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "sellToJackFail",
                  error: "Джек покупает только продукты питания",
                }),
              );
            }
            continue;
          }

          // Удаляем предмет
          player.inventory[slotIndex] = null;

          // Добавляем +1 баляр
          let balyarySlot = player.inventory.findIndex(
            (s) => s && s.type === "balyary",
          );
          if (balyarySlot !== -1) {
            player.inventory[balyarySlot].quantity =
              (player.inventory[balyarySlot].quantity || 0) + 1;
          } else {
            const freeSlot = player.inventory.findIndex((s) => s === null);
            if (freeSlot !== -1) {
              player.inventory[freeSlot] = {
                type: "balyary",
                quantity: 1,
                itemId: `balyary_${Date.now()}`,
              };
            } else {
              // Если нет места для баляра (очень редкий случай)
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: "sellToJackFail",
                    error: "Нет места для баляра",
                  }),
                );
              }
              continue;
            }
          }

          // Сохраняем изменения
          players.set(playerId, { ...player });
          userDatabase.set(playerId, { ...player });
          await saveUserDatabase(dbCollection, playerId, player);

          // Отправляем успех с новым инвентарём
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "sellToJackSuccess",
                inventory: player.inventory,
              }),
            );
          }
        }

        ws.isProcessingSellToJack = false;
      }
      async function processTwisterQueue(ws) {
        if (ws.isProcessingTwister) return;
        ws.isProcessingTwister = true;

        while (ws.twisterQueue.length > 0) {
          const data = ws.twisterQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId) {
            console.warn("Twister сообщение без playerId");
            continue;
          }

          // Вызываем тот же обработчик, что и раньше
          handleTwisterMessage(
            ws,
            data,
            players,
            clients,
            wss,
            playerId,
            saveUserDatabase,
            dbCollection,
            broadcastToWorld,
          );
        }

        ws.isProcessingTwister = false;
      }
      async function processTrashGuessQueue(ws) {
        if (ws.isProcessingTrashGuess) return;
        ws.isProcessingTrashGuess = true;

        while (ws.trashGuessQueue.length > 0) {
          const data = ws.trashGuessQueue.shift();

          // Вызываем тот же обработчик, что и раньше — вся логика внутри handleTrashGuess
          handleTrashGuess(
            ws,
            data,
            players,
            clients,
            wss,
            userDatabase,
            dbCollection,
            broadcastToWorld,
          );
        }

        ws.isProcessingTrashGuess = false;
      }
      async function processGetTrashStateQueue(ws) {
        if (ws.isProcessingGetTrashState) return;
        ws.isProcessingGetTrashState = true;

        while (ws.getTrashStateQueue.length > 0) {
          const data = ws.getTrashStateQueue.shift();

          const idx = data.trashIndex;
          if (idx >= 0 && idx < trashCansState.length) {
            const st = trashCansState[idx];
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "trashState",
                  index: idx,
                  guessed: st.guessed,
                  isOpened: st.isOpened,
                  secretSuit: st.guessed ? st.secretSuit : null,
                  nextAttemptAfter: st.nextAttemptAfter,
                }),
              );
            }
          }
          // Если индекс неверный — просто молча игнорируем (как было раньше)
        }

        ws.isProcessingGetTrashState = false;
      }
      async function processGetAllTrashStatesQueue(ws) {
        if (ws.isProcessingGetAllTrashStates) return;
        ws.isProcessingGetAllTrashStates = true;

        while (ws.getAllTrashStatesQueue.length > 0) {
          const data = ws.getAllTrashStatesQueue.shift();

          // Отправляем текущее состояние всех баков (как было раньше)
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "trashAllStates",
                states: trashCansState.map((st, idx) => ({
                  index: idx,
                  guessed: st.guessed,
                  isOpened: st.isOpened,
                  nextAttemptAfter: st.nextAttemptAfter,
                })),
              }),
            );
          }
        }

        ws.isProcessingGetAllTrashStates = false;
      }
      async function processTorestosUpgradeQueue(ws) {
        if (ws.isProcessingTorestosUpgrade) return;
        ws.isProcessingTorestosUpgrade = true;

        while (ws.torestosUpgradeQueue.length > 0) {
          const data = ws.torestosUpgradeQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          const player = players.get(playerId);

          // Координаты Торестоса — те же, что и на клиенте
          const TORESTOS_X = 800;
          const TORESTOS_Y = 1200;
          const INTERACTION_RADIUS = 70; // чуть больше, чем на клиенте (50), чтобы был запас

          const dx = player.x - TORESTOS_X;
          const dy = player.y - TORESTOS_Y;
          const distance = Math.hypot(dx, dy);

          if (distance > INTERACTION_RADIUS) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "torestosUpgradeResult",
                  success: false,
                  error: "Подойди ближе к Торестосу",
                }),
              );
            }
            continue;
          }

          // Вызываем оригинальный обработчик — вся логика внутри handleTorestosUpgrade
          handleTorestosUpgrade(
            ws,
            data,
            player,
            players,
            userDatabase,
            dbCollection,
            saveUserDatabase,
          );
        }

        ws.isProcessingTorestosUpgrade = false;
      }
      async function processUpgradeSkillQueue(ws) {
        if (ws.isProcessingUpgradeSkill) return;
        ws.isProcessingUpgradeSkill = true;

        while (ws.upgradeSkillQueue.length > 0) {
          const data = ws.upgradeSkillQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          const player = players.get(playerId);

          // Вызываем оригинальный обработчик — вся логика внутри handleSkillUpgrade
          handleSkillUpgrade(
            ws,
            data,
            player,
            players,
            userDatabase,
            dbCollection,
            saveUserDatabase,
          );
        }

        ws.isProcessingUpgradeSkill = false;
      }
      async function processHomelessOpenStorageQueue(ws) {
        if (ws.isProcessingHomelessOpenStorage) return;
        ws.isProcessingHomelessOpenStorage = true;

        while (ws.homelessOpenStorageQueue.length > 0) {
          const data = ws.homelessOpenStorageQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          // Вызываем оригинальный обработчик — вся логика внутри handleHomelessRentRequest
          handleHomelessRentRequest(
            wss,
            clients,
            players,
            userDatabase,
            dbCollection,
            playerId,
          );
        }

        ws.isProcessingHomelessOpenStorage = false;
      }
      async function processHomelessRentConfirmQueue(ws) {
        if (ws.isProcessingHomelessRentConfirm) return;
        ws.isProcessingHomelessRentConfirm = true;

        while (ws.homelessRentConfirmQueue.length > 0) {
          const data = ws.homelessRentConfirmQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          const days = Number(data.days);
          if (isNaN(days) || days < 1) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "homelessError",
                  message: "Количество дней должно быть целым числом ≥ 1",
                }),
              );
            }
            continue;
          }

          // Вызываем оригинальный обработчик — вся логика внутри handleHomelessRentConfirm
          handleHomelessRentConfirm(
            wss,
            clients,
            players,
            userDatabase,
            dbCollection,
            playerId,
            days,
          );
        }

        ws.isProcessingHomelessRentConfirm = false;
      }
      async function processHomelessPutItemQueue(ws) {
        if (ws.isProcessingHomelessPutItem) return;
        ws.isProcessingHomelessPutItem = true;

        while (ws.homelessPutItemQueue.length > 0) {
          const data = ws.homelessPutItemQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          const { playerSlot, quantity } = data;

          if (typeof playerSlot !== "number" || playerSlot < 0) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "homelessError",
                  message: "Некорректный слот инвентаря",
                }),
              );
            }
            continue;
          }

          // Вызываем оригинальный обработчик — вся логика внутри handleHomelessStorageAction
          handleHomelessStorageAction(
            wss,
            clients,
            players,
            dbCollection,
            playerId,
            "put",
            playerSlot,
            null, // storageSlot не нужен при "put"
            quantity,
          );
        }

        ws.isProcessingHomelessPutItem = false;
      }
      async function processHomelessTakeItemQueue(ws) {
        if (ws.isProcessingHomelessTakeItem) return;
        ws.isProcessingHomelessTakeItem = true;

        while (ws.homelessTakeItemQueue.length > 0) {
          const data = ws.homelessTakeItemQueue.shift();

          const playerId = clients.get(ws);
          if (!playerId || !players.has(playerId)) continue;

          const { storageSlot, quantity } = data;

          if (typeof storageSlot !== "number" || storageSlot < 0) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "homelessError",
                  message: "Некорректный номер слота хранилища",
                }),
              );
            }
            continue;
          }

          // Вызываем оригинальный обработчик — вся логика внутри handleHomelessStorageAction
          handleHomelessStorageAction(
            wss,
            clients,
            players,
            dbCollection,
            playerId,
            "take",
            null, // playerSlot = null (сервер сам найдёт куда положить)
            storageSlot,
            quantity,
          );
        }

        ws.isProcessingHomelessTakeItem = false;
      }
      async function processRequestRegenerationQueue(ws) {
        if (ws.isProcessingRequestRegeneration) return;
        ws.isProcessingRequestRegeneration = true;

        while (ws.requestRegenerationQueue.length > 0) {
          const data = ws.requestRegenerationQueue.shift();

          const playerId = clients.get(ws);
          const player = players.get(playerId);
          if (!player) continue;

          const requestedHeal = Number(data.amount);
          if (
            !Number.isInteger(requestedHeal) ||
            requestedHeal <= 0 ||
            requestedHeal > 50
          ) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "regenerationRejected",
                  playerId,
                  reason: "invalid_amount",
                }),
              );
            }
            continue;
          }

          // Проверяем наличие и уровень навыка
          const regSkill = player.skills?.find((s) => s.id === 2);
          if (!regSkill || regSkill.level < 1) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "regenerationRejected",
                  playerId,
                  reason: "no_skill",
                }),
              );
            }
            continue;
          }

          // Проверяем допустимый процент лечения
          const allowedPercent = regSkill.level * 1;
          const maxAllowedHeal = Math.floor((100 * allowedPercent) / 100);

          if (requestedHeal > maxAllowedHeal + 2) {
            console.warn(
              `[AntiCheat] Игрок ${playerId} запросил слишком много регенерации: ${requestedHeal} > ${maxAllowedHeal}`,
            );
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "regenerationRejected",
                  playerId,
                  reason: "cheat_suspected",
                }),
              );
            }
            continue;
          }

          // Проверяем, что здоровье не превысит максимум
          const newHealth = Math.min(
            player.health + requestedHeal,
            player.maxStats?.health || 100,
          );

          if (newHealth <= player.health) {
            // Уже полное здоровье — молча игнорируем
            continue;
          }

          // Применяем
          player.health = newHealth;

          // Сохраняем в базу
          userDatabase.set(playerId, { ...player });
          saveUserDatabase?.(dbCollection, playerId, player);

          // Рассылаем обновление всем в мире
          const updatePayload = {
            id: playerId,
            health: player.health,
            // можно добавить и другие поля, если нужно
          };

          broadcastToWorld(
            wss,
            clients,
            players,
            player.worldId,
            JSON.stringify({
              type: "update",
              player: updatePayload,
            }),
          );

          // Подтверждаем игроку
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "regenerationApplied",
                playerId,
                newHealth: player.health,
              }),
            );
          }
        }

        ws.isProcessingRequestRegeneration = false;
      }
      async function processWelcomeGuideSeenQueue(ws) {
        if (ws.isProcessingWelcomeGuideSeen) return;
        ws.isProcessingWelcomeGuideSeen = true;

        while (ws.welcomeGuideSeenQueue.length > 0) {
          const data = ws.welcomeGuideSeenQueue.shift();

          const id = clients.get(ws);
          if (!id || !players.has(id)) continue;

          const player = players.get(id);

          // Если уже отмечено — можно просто пропустить (оптимизация)
          if (player.hasSeenWelcomeGuide === true) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "welcomeGuideSeenConfirm" }));
            }
            continue;
          }

          // Отмечаем
          player.hasSeenWelcomeGuide = true;

          // Обновляем в памяти
          players.set(id, player);

          // Сохраняем в базу
          userDatabase.set(id, player);
          await saveUserDatabase(dbCollection, id, player);

          // Подтверждаем клиенту
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "welcomeGuideSeenConfirm" }));
          }
        }

        ws.isProcessingWelcomeGuideSeen = false;
      }
      async function processChatQueue(ws) {
        if (ws.isProcessingChat) return;
        ws.isProcessingChat = true;

        while (ws.chatQueue.length > 0) {
          const data = ws.chatQueue.shift();

          const id = clients.get(ws);
          if (!id) continue;

          // Рассылаем всем подключённым (как было раньше)
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "chat",
                  id,
                  message: data.message,
                }),
              );
            }
          });
        }

        ws.isProcessingChat = false;
      }
      async function processMeetNpcQueue(ws) {
        if (ws.isProcessingMeetNpc) return;
        ws.isProcessingMeetNpc = true;

        while (ws.meetNpcQueue.length > 0) {
          const data = ws.meetNpcQueue.shift();

          const id = clients.get(ws);
          if (!id || !players.has(id)) continue;

          const player = players.get(id);

          let changed = false;

          switch (data.type) {
            case "meetNPC":
              if (data.npcMet !== undefined) {
                player.npcMet = data.npcMet;
                changed = true;
              }
              if (data.npcMet && data.availableQuests) {
                player.availableQuests = data.availableQuests;
                changed = true;
              }
              break;

            case "meetJack":
              if (!player.jackMet) {
                player.jackMet = true;
                changed = true;
              }
              break;

            case "meetNeonAlex":
              if (!player.alexNeonMet) {
                player.alexNeonMet = true;
                changed = true;

                // Бродкаст обновления всем в мире (как было)
                broadcastToWorld(
                  wss,
                  clients,
                  players,
                  player.worldId,
                  JSON.stringify({
                    type: "update",
                    player: {
                      id: player.id,
                      alexNeonMet: true,
                    },
                  }),
                );
              }
              break;

            case "meetCaptain":
              if (
                data.captainMet !== undefined &&
                player.captainMet !== data.captainMet
              ) {
                player.captainMet = data.captainMet;
                changed = true;
              }
              break;

            case "meetThimblerigger":
              if (!player.thimbleriggerMet) {
                player.thimbleriggerMet = true;
                changed = true;

                // Отправляем подтверждение клиенту (как было)
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({ type: "thimbleriggerMet", met: true }),
                  );
                }
              }
              break;

            case "meetTorestos":
              if (!player.torestosMet) {
                player.torestosMet = true;
                changed = true;

                // Отправляем подтверждение клиенту
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "torestosMet", met: true }));
                }

                // Опциональный бродкаст (как было)
                broadcastToWorld(
                  wss,
                  clients,
                  players,
                  player.worldId,
                  JSON.stringify({
                    type: "update",
                    player: { id: player.id, torestosMet: true },
                  }),
                );
              }
              break;

            case "meetToremidos":
              if (!player.toremidosMet) {
                player.toremidosMet = true;
                changed = true;

                // Отправляем подтверждение клиенту
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "toremidosMet", met: true }));
                }
              }
              break;
          }

          // Если ничего не изменилось — не сохраняем в базу
          if (!changed) continue;

          // Обновляем в памяти
          players.set(id, { ...player });

          // Сохраняем в базу
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
        }

        ws.isProcessingMeetNpc = false;
      }
    });

    // ================== ИНТЕРВАЛ ОБНОВЛЕНИЯ ВРАГОВ ==================
    const enemyUpdateInterval = setInterval(() => {
      const now = Date.now();

      enemies.forEach((enemy, enemyId) => {
        if (enemy.health <= 0) return;

        // === Определяем параметры в зависимости от типа врага ===
        let speed = ENEMY_SPEED;
        let aggroRange = AGGRO_RANGE;
        let attackRange = ATTACK_RANGE;
        let attackCooldown = ENEMY_ATTACK_COOLDOWN;
        let minDamage = 10;
        let maxDamage = 15;
        let isRanged = false;
        let projectileSpeed = 0;

        if (enemy.type === "scorpion") {
          speed = 4;
          attackCooldown = 1000;
          minDamage = 5;
          maxDamage = 10;
        } else if (enemy.type === "blood_eye") {
          speed = BLOOD_EYE_SPEED; // 3.2
          aggroRange = BLOOD_EYE_AGGRO; // 400
          attackCooldown = BLOOD_EYE_COOLDOWN; // 2000
          minDamage = BLOOD_EYE_DAMAGE_MIN; // 12
          maxDamage = BLOOD_EYE_DAMAGE_MAX; // 18
          isRanged = true;
          projectileSpeed = BLOOD_EYE_PROJ_SPEED; // 200 px/s
        }

        // === Поиск ближайшего живого игрока в радиусе аггро ===
        let closestPlayer = null;
        let minDist = aggroRange;

        players.forEach((player) => {
          if (player.worldId === enemy.worldId && player.health > 0) {
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.hypot(dx, dy);

            if (dist < minDist) {
              minDist = dist;
              closestPlayer = player;
            }
          }
        });

        // === Если есть цель ===
        if (closestPlayer) {
          const dx = closestPlayer.x - enemy.x;
          const dy = closestPlayer.y - enemy.y;
          const dist = Math.hypot(dx, dy);

          if (isRanged) {
            // ────────────────────── ЛОГИКА ДАЛЬНОБОЙНОГО ВРАГА (blood_eye) ──────────────────────
            // Стреляет раз в 2000 мс
            if (now - (enemy.lastAttackTime || 0) >= attackCooldown) {
              // ← добавляем сюда
              if (closestPlayer.health <= 0) {
                enemy.state = "idle";
                return;
              }

              enemy.lastAttackTime = now;
              enemy.state = "attacking";

              const angle = Math.atan2(dy, dx);
              const bulletId = `blood_proj_${enemyId}_${Date.now()}`;

              // Отправляем событие выстрела ВСЕМ в мире
              broadcastToWorld(
                wss,
                clients,
                players,
                enemy.worldId,
                JSON.stringify({
                  type: "enemyShoot",
                  enemyId: enemyId,
                  bulletId: bulletId,
                  x: enemy.x,
                  y: enemy.y,
                  angle: angle,
                  speed: projectileSpeed,
                  damage:
                    Math.floor(Math.random() * (maxDamage - minDamage + 1)) +
                    minDamage,
                  worldId: enemy.worldId,
                  spawnTime: now,
                }),
              );
            }

            // Движение: держим дистанцию ~150–200 пикселей
            const desiredDistance = 180; // можно подкрутить
            if (dist > desiredDistance + 30) {
              // Идём ближе
              enemy.x += (dx / dist) * speed;
              enemy.y += (dy / dist) * speed;
              enemy.state = "walking";
            } else if (dist < desiredDistance - 30) {
              // Отходим назад
              enemy.x -= (dx / dist) * speed * 0.8;
              enemy.y -= (dy / dist) * speed * 0.8;
              enemy.state = "walking";
            } else {
              // Стоим на месте и атакуем
              enemy.state = "attacking";
            }
          } else {
            // ────────────────────── ЛОГИКА БЛИЖНЕГО БОЯ (mutant, scorpion) ──────────────────────
            if (dist > attackRange) {
              // Идём к игроку
              enemy.x += (dx / dist) * speed;
              enemy.y += (dy / dist) * speed;
              enemy.state = "walking";

              // Направление движения
              if (Math.abs(dx) > Math.abs(dy)) {
                enemy.direction = dx > 0 ? "right" : "left";
              } else {
                enemy.direction = dy > 0 ? "down" : "up";
              }
            } else {
              // Атакуем в ближнем бою
              if (now - (enemy.lastAttackTime || 0) >= attackCooldown) {
                enemy.lastAttackTime = now;
                enemy.state = "attacking";

                const damage =
                  Math.floor(Math.random() * (maxDamage - minDamage + 1)) +
                  minDamage;

                // Защита: не наносим урон мёртвому
                if (closestPlayer.health <= 0) {
                  enemy.state = "idle"; // или "walking" — чтобы не замирал
                  return;
                }

                closestPlayer.health = Math.max(
                  0,
                  closestPlayer.health - damage,
                );

                players.set(closestPlayer.id, { ...closestPlayer });
                userDatabase.set(closestPlayer.id, { ...closestPlayer });
                saveUserDatabase(dbCollection, closestPlayer.id, closestPlayer);

                // Уведомляем всех о попадании
                broadcastToWorld(
                  wss,
                  clients,
                  players,
                  enemy.worldId,
                  JSON.stringify({
                    type: "enemyAttack",
                    targetId: closestPlayer.id,
                    damage: damage,
                    enemyId: enemyId,
                  }),
                );

                broadcastToWorld(
                  wss,
                  clients,
                  players,
                  enemy.worldId,
                  JSON.stringify({
                    type: "update",
                    player: { id: closestPlayer.id, ...closestPlayer },
                  }),
                );
              } else {
                enemy.state = "attacking"; // держим анимацию
              }
            }
          }
        } else {
          // Нет цели — idle + лёгкий wander
          enemy.state = "idle";
          if (Math.random() < 0.08) {
            // ~8% шанс каждый тик
            const wanderAngle = Math.random() * Math.PI * 2;
            enemy.x += Math.cos(wanderAngle) * speed * 0.5;
            enemy.y += Math.sin(wanderAngle) * speed * 0.5;
          }
        }

        // === Обновляем направление при движении (для всех типов) ===
        if (enemy.state === "walking" && closestPlayer) {
          const dx = closestPlayer.x - enemy.x;
          const dy = closestPlayer.y - enemy.y;

          if (Math.abs(dx) > Math.abs(dy)) {
            enemy.direction = dx > 0 ? "right" : "left";
          } else {
            enemy.direction = dy > 0 ? "down" : "up";
          }
        }

        // === Отправляем обновление врага ВСЕМ в мире ===
        broadcastToWorld(
          wss,
          clients,
          players,
          enemy.worldId,
          JSON.stringify({
            type: "enemyUpdate",
            enemy: {
              id: enemyId,
              x: enemy.x,
              y: enemy.y,
              state: enemy.state,
              direction: enemy.direction,
              health: enemy.health,
              lastAttackTime: enemy.lastAttackTime || 0,
            },
          }),
        );
      });
    }, 200); // 200 мс — оптимально

    // Очистка интервала при disconnect (в ws.on("close"))
    clearInterval(enemyUpdateInterval);

    ws.on("close", async (code, reason) => {
      const id = clients.get(ws);
      if (id) {
        const player = players.get(id);
        if (player) {
          player.hasSeenWelcomeGuide = player.hasSeenWelcomeGuide || false;
          if (player.health <= 0) {
            player.health = 0; // фиксируем смерть
          }
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);

          const itemsToRemove = [];
          items.forEach((item, itemId) => {
            if (item.spawnedBy === id) {
              itemsToRemove.push(itemId);
            }
          });

          itemsToRemove.forEach((itemId) => {
            items.delete(itemId);
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "itemPicked", itemId }));
              }
            });
          });
        }
        clients.delete(ws);
        players.delete(id);
        console.log("Client disconnected:", id);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "playerLeft", id }));
          }
        });
      }
      clearTimeout(inactivityTimer);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clearTimeout(inactivityTimer);
    });
  });
}

module.exports = { setupWebSocket };
