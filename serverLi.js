const NPC_LI_CONFIG = {
  quests: [
    { id: 1, reward: { xp: 5, balyary: 2 } },
    { id: 2, reward: { xp: 15, balyary: 5 } },
    { id: 3, reward: { xp: 30, balyary: 10 } },
    { id: 4, reward: { xp: 5, balyary: 3 } },
    { id: 5, reward: { xp: 15, balyary: 10 } },
    { id: 6, reward: { xp: 50, balyary: 15 } },
    { id: 7, reward: { xp: 15, balyary: 5 } },
    { id: 8, reward: { xp: 5, balyary: 2 } },
    { id: 9, reward: { xp: 25, balyary: 15 } },
    { id: 10, reward: { balyary: 10 } },
  ],
};

function setupLiWebSocket(
  wss,
  dbCollection,
  clients,
  players,
  userDatabase,
  items
) {
  wss.on("connection", (ws) => {
    ws.on("message", async (message) => {
      let data;
      try {
        data = JSON.parse(message);
      } catch (e) {
        console.error("Неверный JSON:", e);
        return;
      }

      if (data.type === "meetNPCLi") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          player.npcLiMet = data.npcMet;
          if (data.npcMet && data.availableQuests) {
            player.availableLiQuests = data.availableQuests;
          }
          players.set(id, { ...player });
          userDatabase.set(id, { ...player });
          await saveUserDatabase(dbCollection, id, player);
          console.log(
            `Игрок ${id} познакомился с NPC Li: npcLiMet=${data.npcMet}, задания: ${player.availableLiQuests}`
          );
        }
      } else if (data.type === "claimLiReward") {
        const id = clients.get(ws);
        if (id) {
          const player = players.get(id);
          const quest = NPC_LI_CONFIG.quests.find((q) => q.id === data.questId);
          if (quest && player.availableLiQuests.includes(data.questId)) {
            player.xp = (player.xp || 0) + (quest.reward.xp || 0);
            if (quest.reward.balyary) {
              const balyarySlot = player.inventory.findIndex(
                (slot) => slot && slot.type === "balyary"
              );
              if (balyarySlot !== -1) {
                player.inventory[balyarySlot].quantity =
                  (player.inventory[balyarySlot].quantity || 1) +
                  quest.reward.balyary;
              } else {
                const freeSlot = player.inventory.findIndex(
                  (slot) => slot === null
                );
                if (freeSlot !== -1) {
                  player.inventory[freeSlot] = {
                    type: "balyary",
                    quantity: quest.reward.balyary,
                    itemId: `balyary_${Date.now()}`,
                  };
                }
              }
            }
            player.availableLiQuests = player.availableLiQuests.filter(
              (qId) => qId !== data.questId
            );
            players.set(id, { ...player });
            userDatabase.set(id, { ...player });
            await saveUserDatabase(dbCollection, id, player);
            ws.send(
              JSON.stringify({ type: "update", player: { id, ...player } })
            );
            console.log(
              `Игрок ${id} получил награду за задание ${data.questId}: XP +${
                quest.reward.xp || 0
              }, Баляры +${quest.reward.balyary || 0}`
            );
          }
        }
      }
    });
  });
}

module.exports = { setupLiWebSocket };
