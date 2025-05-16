const { saveUserDatabase } = require("./database");

function checkCollisionServer(x, y) {
  return false; // Пока оставляем как есть
}

function runGameLoop(
  wss,
  dbCollection,
  clients,
  players,
  items,
  wolves,
  worlds,
  ITEM_CONFIG,
  userDatabase
) {
  setInterval(() => {
    const currentTime = Date.now();
    const playerCountPerWorld = new Map();
    worlds.forEach((world) => {
      playerCountPerWorld.set(
        world.id,
        Array.from(players.values()).filter((p) => p.worldId === world.id)
          .length
      );
    });

    const totalPlayers = players.size;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({ type: "totalOnline", count: totalPlayers })
        );
      }
    });

    items.forEach((item, itemId) => {
      if (currentTime - item.spawnTime > 10 * 60 * 1000) {
        items.delete(itemId);
        console.log(
          `Предмет ${item.type} (${itemId}) в мире ${item.worldId} исчез из-за таймаута`
        );
        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            players.get(clients.get(client))?.worldId === item.worldId
          ) {
            client.send(JSON.stringify({ type: "itemPicked", itemId }));
          }
        });
      }
    });

    worlds.forEach((world) => {
      const playerCount = playerCountPerWorld.get(world.id);
      const worldItems = Array.from(items.values()).filter(
        (item) => item.worldId === world.id
      );

      const itemCounts = {};
      for (const [type] of Object.entries(ITEM_CONFIG)) {
        itemCounts[type] = worldItems.filter(
          (item) => item.type === type
        ).length;
      }

      const rareItems = Object.entries(ITEM_CONFIG)
        .filter(([_, config]) => config.rarity === 1)
        .map(([type]) => type);
      const mediumItems = Object.entries(ITEM_CONFIG)
        .filter(([_, config]) => config.rarity === 2)
        .map(([type]) => type);
      const commonItems = Object.entries(ITEM_CONFIG)
        .filter(([_, config]) => config.rarity === 3)
        .map(([type]) => type);

      const desiredTotalItems = playerCount * 10;
      const currentTotalItems = worldItems.length;

      if (currentTotalItems < desiredTotalItems) {
        const itemsToSpawn = desiredTotalItems - currentTotalItems;

        let rareCount = playerCount * 2;
        let mediumCount = playerCount * 3;
        let commonCount = playerCount * 5;

        for (let i = 0; i < itemsToSpawn; i++) {
          let type;
          if (
            rareCount > 0 &&
            rareItems.length > 0 &&
            itemCounts[rareItems[rareCount % rareItems.length]] < rareCount
          ) {
            type = rareItems[Math.floor(Math.random() * rareItems.length)];
            rareCount--;
          } else if (
            mediumCount > 0 &&
            mediumItems.length > 0 &&
            itemCounts[mediumItems[mediumCount % mediumItems.length]] <
              mediumCount
          ) {
            type = mediumItems[Math.floor(Math.random() * mediumItems.length)];
            mediumCount--;
          } else if (
            commonCount > 0 &&
            commonItems.length > 0 &&
            itemCounts[commonItems[commonCount % commonItems.length]] <
              commonCount
          ) {
            type = commonItems[Math.floor(Math.random() * commonItems.length)];
            commonCount--;
          } else {
            const allTypes = Object.keys(ITEM_CONFIG).filter(
              (type) => ITEM_CONFIG[type].rarity !== 4
            );
            type = allTypes[Math.floor(Math.random() * allTypes.length)];
          }

          let x,
            y,
            attempts = 0;
          const maxAttempts = 10;
          do {
            x = Math.random() * world.width;
            y = Math.random() * world.height;
            attempts++;
          } while (checkCollisionServer(x, y) && attempts < maxAttempts);

          if (attempts < maxAttempts) {
            const itemId = `${type}_${Date.now()}_${i}`;
            const newItem = {
              x,
              y,
              type,
              spawnTime: currentTime,
              worldId: world.id,
            };
            items.set(itemId, newItem);
            console.log(
              `Создан предмет ${type} (${itemId}) в мире ${world.id} на x:${newItem.x}, y:${newItem.y}`
            );

            wss.clients.forEach((client) => {
              if (
                client.readyState === WebSocket.OPEN &&
                players.get(clients.get(client))?.worldId === world.id
              ) {
                client.send(
                  JSON.stringify({
                    type: "newItem",
                    itemId: itemId,
                    x: newItem.x,
                    y: newItem.y,
                    type: newItem.type,
                    spawnTime: newItem.spawnTime,
                    worldId: world.id,
                  })
                );
              }
            });
          } else {
            console.log(
              `Не удалось найти место для спавна предмета ${type} в мире ${world.id}`
            );
          }
        }
      }

      if (world.id === 1) {
        const maxWolves = Math.max(1, playerCount * 2);
        const currentWolves = Array.from(wolves.values()).filter(
          (w) => w.worldId === world.id
        ).length;

        if (currentWolves < maxWolves) {
          const wolvesToSpawn = maxWolves - currentWolves;
          for (let i = 0; i < wolvesToSpawn; i++) {
            let x,
              y,
              attempts = 0;
            const maxAttempts = 10;
            const player = Array.from(players.values()).find(
              (p) => p.worldId === world.id
            );
            if (!player) continue;

            do {
              const edge = Math.floor(Math.random() * 4);
              switch (edge) {
                case 0:
                  x = player.x + (Math.random() - 0.5) * 1000;
                  y = player.y - 500;
                  break;
                case 1:
                  x = player.x + (Math.random() - 0.5) * 1000;
                  y = player.y + 500;
                  break;
                case 2:
                  x = player.x - 500;
                  y = player.y + (Math.random() - 0.5) * 1000;
                  break;
                case 3:
                  x = player.x + 500;
                  y = player.y + (Math.random() - 0.5) * 1000;
                  break;
              }
              attempts++;
            } while (checkCollisionServer(x, y) && attempts < maxAttempts);

            if (attempts < maxAttempts) {
              const wolfId = `wolf_${Date.now()}_${i}`;
              const wolf = {
                id: wolfId,
                x,
                y,
                health: 100,
                direction: "down",
                state: "walking",
                worldId: world.id,
                lastAttackTime: 0,
              };
              wolves.set(wolfId, wolf);
              console.log(
                `Создан волк ${wolfId} в мире ${world.id} на x:${x}, y:${y}`
              );

              wss.clients.forEach((client) => {
                if (
                  client.readyState === WebSocket.OPEN &&
                  players.get(clients.get(client))?.worldId === world.id
                ) {
                  client.send(
                    JSON.stringify({
                      type: "updateWolf",
                      worldId: world.id,
                      wolf,
                    })
                  );
                }
              });
            }
          }
        }
      }

      if (world.id === 1) {
        wolves.forEach((wolf, wolfId) => {
          if (wolf.worldId !== world.id) return;

          let closestPlayer = null;
          let minDistance = Infinity;
          players.forEach((player) => {
            if (player.worldId === world.id && player.health > 0) {
              const dx = wolf.x - player.x;
              const dy = wolf.y - player.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < minDistance) {
                minDistance = distance;
                closestPlayer = player;
              }
            }
          });

          if (closestPlayer) {
            const dx = closestPlayer.x - wolf.x;
            const dy = closestPlayer.y - wolf.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const speed = 2;

            if (distance > 40) {
              const angle = Math.atan2(dy, dx);
              wolf.x += Math.cos(angle) * speed;
              wolf.y += Math.sin(angle) * speed;
              wolf.state = "walking";
              wolf.direction =
                Math.abs(dx) > Math.abs(dy)
                  ? dx > 0
                    ? "right"
                    : "left"
                  : dy > 0
                  ? "down"
                  : "up";
            } else {
              const currentTime = Date.now();
              if (currentTime - wolf.lastAttackTime >= 3000) {
                const damage = Math.floor(Math.random() * 10) + 1;
                closestPlayer.health = Math.max(
                  0,
                  closestPlayer.health - damage
                );
                wolf.lastAttackTime = currentTime;
                console.log(
                  `Волк ${wolfId} атаковал игрока ${closestPlayer.id}, урон: ${damage}`
                );

                players.set(closestPlayer.id, { ...closestPlayer });
                userDatabase.set(closestPlayer.id, { ...closestPlayer });
                saveUserDatabase(dbCollection, closestPlayer.id, closestPlayer);

                wss.clients.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    const clientPlayer = players.get(clients.get(client));
                    if (clientPlayer && clientPlayer.worldId === world.id) {
                      client.send(
                        JSON.stringify({
                          type: "update",
                          player: closestPlayer,
                        })
                      );
                    }
                  }
                });
              }
            }

            if (wolf.health <= 0 && wolf.state !== "dying") {
              wolf.state = "dying";
              wolf.frame = 0;
            }

            wolves.set(wolfId, { ...wolf });
            wss.clients.forEach((client) => {
              if (
                client.readyState === WebSocket.OPEN &&
                players.get(clients.get(client))?.worldId === world.id
              ) {
                client.send(
                  JSON.stringify({
                    type: "updateWolf",
                    worldId: world.id,
                    wolf,
                  })
                );
              }
            });

            if (wolf.state === "dying" && wolf.frame >= 3) {
              wolves.delete(wolfId);
              const itemId = `wolf_skin_${Date.now()}`;
              items.set(itemId, {
                x: wolf.x,
                y: wolf.y,
                type: "wolf_skin",
                spawnTime: Date.now(),
                worldId: world.id,
                isDroppedByPlayer: false,
              });

              wss.clients.forEach((client) => {
                if (
                  client.readyState === WebSocket.OPEN &&
                  players.get(clients.get(client))?.worldId === world.id
                ) {
                  client.send(
                    JSON.stringify({
                      type: "removeWolf",
                      worldId: world.id,
                      wolfId,
                    })
                  );
                  client.send(
                    JSON.stringify({
                      type: "itemDropped",
                      itemId,
                      x: wolf.x,
                      y: wolf.y,
                      type: "wolf_skin",
                      spawnTime: Date.now(),
                      worldId: world.id,
                    })
                  );
                }
              });
              console.log(
                `Волк ${wolfId} умер, дропнута волчья шкура ${itemId}`
              );
            }
          }
        });
      }

      const allItems = Array.from(items.entries())
        .filter(([_, item]) => item.worldId === world.id)
        .map(([itemId, item]) => ({
          itemId,
          x: item.x,
          y: item.y,
          type: item.type,
          spawnTime: item.spawnTime,
          worldId: item.worldId,
        }));
      wss.clients.forEach((client) => {
        if (
          client.readyState === WebSocket.OPEN &&
          players.get(clients.get(client))?.worldId === world.id
        ) {
          client.send(
            JSON.stringify({
              type: "syncItems",
              items: allItems,
              worldId: world.id,
            })
          );
        }
      });
    });
  }, 10 * 1000);
}

module.exports = { runGameLoop };
