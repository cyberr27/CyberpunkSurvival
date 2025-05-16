const wolfSystem = {
  wolves: new Map(),
  wolfSprite: null,
  wolfSkinImage: null,
  FRAME_DURATION: 400,
  playerSpawnTrackers: new Map(), // Отслеживание дистанции для каждого игрока
  SPAWN_DISTANCE: 2000, // Спавн волка каждые 2000 пикселей
  WORLD_WIDTH: 4000, // Ширина мира Пустоши
  WORLD_HEIGHT: 4000, // Высота мира Пустоши

  initialize(wolfSprite, wolfSkinImage) {
    this.wolfSprite = wolfSprite;
    this.wolfSkinImage = wolfSkinImage;
    console.log("WolfSystem инициализирован");
  },

  // Очистка волков и сброс счетчиков при входе в Пустоши
  clearWolves() {
    this.wolves.clear();
    this.playerSpawnTrackers.clear(); // Сбрасываем счетчики расстояния
    console.log("Все волки и счетчики расстояния очищены");
  },

  // Сброс счетчика расстояния для конкретного игрока
  resetPlayerTracker(playerId) {
    const player = players.get(playerId);
    if (player) {
      this.playerSpawnTrackers.set(playerId, {
        lastSpawnDistance: 0,
        initialDistance: player.distanceTraveled || 0,
      });
      console.log(`Счетчик расстояния сброшен для игрока ${playerId}`);
    }
  },

  update(deltaTime) {
    const currentWorldId = window.worldSystem.currentWorldId;
    if (currentWorldId !== 1) return; // Волки только в Пустошах (id: 1)

    let wolfSpawnedThisFrame = false; // Флаг для ограничения спавна за кадр

    // Проверяем всех игроков в мире Пустоши
    for (const [playerId, player] of players) {
      if (player.worldId !== 1 || player.health <= 0) continue; // Пропускаем игроков не в Пустошах или мёртвых
      if (wolfSpawnedThisFrame) break; // Ограничиваем спавн одним волком за кадр

      const distanceTraveled = player.distanceTraveled || 0;
      let tracker = this.playerSpawnTrackers.get(playerId);
      if (!tracker) {
        tracker = {
          lastSpawnDistance: 0,
          initialDistance: distanceTraveled,
        };
        this.playerSpawnTrackers.set(playerId, tracker);
      }

      const distanceSinceEntry = distanceTraveled - tracker.initialDistance;
      if (distanceSinceEntry < this.SPAWN_DISTANCE) continue;

      // Проверяем, не превышает ли текущее количество campione волков лимит
      if (
        distanceSinceEntry >= tracker.lastSpawnDistance + this.SPAWN_DISTANCE &&
        this.wolves.size < 1 // Глобальный лимит на волков
      ) {
        // Проверяем, нет ли уже волка, привязанного к этому игроку
        let hasWolf = false;
        for (const wolf of this.wolves.values()) {
          if (wolf.targetPlayerId === playerId) {
            hasWolf = true;
            break;
          }
        }
        if (hasWolf) continue; // Пропускаем, если у игрока уже есть волк

        const wolfId = `wolf_${Date.now()}_${Math.random()}`;
        const edge = Math.floor(Math.random() * 4);
        let wolfX, wolfY;

        switch (edge) {
          case 0: // Верх
            wolfX = Math.random() * this.WORLD_WIDTH;
            wolfY = 0;
            break;
          case 1: // Низ
            wolfX = Math.random() * this.WORLD_WIDTH;
            wolfY = this.WORLD_HEIGHT;
            break;
          case 2: // Лево
            wolfX = 0;
            wolfY = Math.random() * this.WORLD_HEIGHT;
            break;
          case 3: // Право
            wolfX = this.WORLD_WIDTH;
            wolfY = Math.random() * this.WORLD_HEIGHT;
            break;
        }

        const wolf = {
          id: wolfId,
          x: wolfX,
          y: wolfY,
          health: 100,
          direction: "down",
          state: "walking",
          frame: 0,
          frameTime: 0,
          targetPlayerId: playerId,
        };
        this.wolves.set(wolfId, wolf);
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "spawnWolf",
            wolfId,
            x: wolf.x,
            y: wolf.y,
            health: wolf.health,
            direction: wolf.direction,
            state: wolf.state,
            worldId: 1,
            targetPlayerId: playerId,
          })
        );
        console.log(
          `Волк ${wolfId} создан для игрока ${playerId} на x:${wolf.x}, y:${wolf.y}`
        );
        tracker.lastSpawnDistance =
          tracker.lastSpawnDistance + this.SPAWN_DISTANCE;
        this.playerSpawnTrackers.set(playerId, tracker);
        wolfSpawnedThisFrame = true; // Устанавливаем флаг, чтобы больше не спавнить в этом кадре
      }
    }

    // Обновление волков (без изменений)
    this.wolves.forEach((wolf, id) => {
      if (wolf.state === "walking") {
        const targetPlayer = players.get(wolf.targetPlayerId);
        if (
          targetPlayer &&
          targetPlayer.health > 0 &&
          targetPlayer.worldId === 1
        ) {
          const dx = targetPlayer.x - wolf.x;
          const dy = targetPlayer.y - wolf.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 10) {
            const angle = Math.atan2(dy, dx);
            const speed = 2;
            wolf.x += Math.cos(angle) * speed * (deltaTime / 16.67);
            wolf.y += Math.sin(angle) * speed * (deltaTime / 16.67);

            if (Math.abs(dx) > Math.abs(dy)) {
              wolf.direction = dx > 0 ? "right" : "left";
            } else {
              wolf.direction = dy > 0 ? "down" : "up";
            }

            sendWhenReady(
              ws,
              JSON.stringify({
                type: "updateWolf",
                wolfId: id,
                x: wolf.x,
                y: wolf.y,
                health: wolf.health,
                direction: wolf.direction,
                state: wolf.state,
                worldId: 1,
              })
            );
          } else {
            wolf.state = "attacking";
            sendWhenReady(
              ws,
              JSON.stringify({
                type: "wolfAttack",
                wolfId: id,
                targetId: targetPlayer.id,
                damage: 5,
                worldId: 1,
              })
            );
          }
        } else {
          let closestPlayer = null;
          let minDistance = Infinity;
          players.forEach((player, playerId) => {
            if (player.health > 0 && player.worldId === 1) {
              const dx = wolf.x - player.x;
              const dy = wolf.y - player.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < minDistance) {
                minDistance = distance;
                closestPlayer = player;
              }
            }
          });

          if (closestPlayer && minDistance > 10) {
            const dx = closestPlayer.x - wolf.x;
            const dy = closestPlayer.y - wolf.y;
            const angle = Math.atan2(dy, dx);
            const speed = 2;
            wolf.x += Math.cos(angle) * speed * (deltaTime / 16.67);
            wolf.y += Math.sin(angle) * speed * (deltaTime / 16.67);

            if (Math.abs(dx) > Math.abs(dy)) {
              wolf.direction = dx > 0 ? "right" : "left";
            } else {
              wolf.direction = dy > 0 ? "down" : "up";
            }

            sendWhenReady(
              ws,
              JSON.stringify({
                type: "updateWolf",
                wolfId: id,
                x: wolf.x,
                y: wolf.y,
                health: wolf.health,
                direction: wolf.direction,
                state: wolf.state,
                worldId: 1,
              })
            );
          } else if (closestPlayer) {
            wolf.state = "attacking";
            sendWhenReady(
              ws,
              JSON.stringify({
                type: "wolfAttack",
                wolfId: id,
                targetId: closestPlayer.id,
                damage: 5,
                worldId: 1,
              })
            );
          }
        }

        wolf.frameTime += deltaTime;
        if (wolf.frameTime >= this.FRAME_DURATION / 4) {
          wolf.frameTime -= this.FRAME_DURATION / 4;
          wolf.frame = (wolf.frame + 1) % 4;
        }
      } else if (wolf.state === "dying") {
        wolf.frameTime += deltaTime;
        if (wolf.frameTime >= this.FRAME_DURATION / 4) {
          wolf.frameTime = 0;
          if (wolf.frame < 3) wolf.frame += 1;
          else {
            this.wolves.delete(id);
            sendWhenReady(
              ws,
              JSON.stringify({
                type: "removeWolf",
                wolfId: id,
                worldId: 1,
              })
            );
          }
        }
      } else if (wolf.state === "attacking") {
        wolf.frameTime += deltaTime;
        if (wolf.frameTime >= this.FRAME_DURATION / 4) {
          wolf.frameTime -= this.FRAME_DURATION / 4;
          wolf.frame = (wolf.frame + 1) % 4;
          wolf.state = "walking";
        }
      } else {
        wolf.frame = 0;
        wolf.frameTime = 0;
      }
    });
  },

  draw(ctx, camera) {
    const currentWorldId = window.worldSystem.currentWorldId;
    if (currentWorldId !== 1) return; // Рисуем только в Пустошах

    this.wolves.forEach((wolf) => {
      const screenX = wolf.x - camera.x;
      const screenY = wolf.y - camera.y;

      if (
        screenX < -40 ||
        screenX > canvas.width + 40 ||
        screenY < -40 ||
        screenY > canvas.height + 40
      ) {
        return;
      }

      let spriteY;
      if (wolf.state === "dying") {
        spriteY = 160;
      } else {
        spriteY =
          {
            up: 0,
            down: 40,
            left: 80,
            right: 120,
          }[wolf.direction] || 40;
      }

      const spriteX = wolf.frame * 40;

      if (this.wolfSprite.complete) {
        ctx.drawImage(
          this.wolfSprite,
          spriteX,
          spriteY,
          40,
          40,
          screenX,
          screenY,
          40,
          40
        );

        ctx.fillStyle = "red";
        ctx.fillRect(screenX, screenY - 10, 40, 5);
        ctx.fillStyle = "green";
        ctx.fillRect(screenX, screenY - 10, (wolf.health / 100) * 40, 5);
      }
    });
  },

  syncWolves(wolvesData) {
    const currentWorldId = window.worldSystem.currentWorldId;
    if (currentWorldId !== 1) {
      this.clearWolves();
      return;
    }

    // Синхронизируем волков с сервера
    this.wolves.clear();
    wolvesData.forEach((wolf) => {
      this.wolves.set(wolf.id, {
        id: wolf.id,
        x: wolf.x,
        y: wolf.y,
        health: wolf.health,
        direction: wolf.direction,
        state: wolf.state,
        frame: 0,
        frameTime: 0,
        targetPlayerId: wolf.targetPlayerId || null,
      });
    });
    console.log(`Синхронизировано ${wolvesData.length} волков в Пустошах`);
  },

  updateWolf(wolfData) {
    const currentWorldId = window.worldSystem.currentWorldId;
    if (currentWorldId !== 1 || wolfData.worldId !== 1) return;

    if (wolfData.health <= 0 && this.wolves.has(wolfData.id)) {
      this.handleWolfDeath(wolfData.id, wolfData.killerId || myId);
      return;
    }

    if (this.wolves.has(wolfData.id)) {
      const existingWolf = this.wolves.get(wolfData.id);
      this.wolves.set(wolfData.id, {
        ...existingWolf,
        ...wolfData,
        frameTime: existingWolf.frameTime || 0,
        targetPlayerId: wolfData.targetPlayerId || existingWolf.targetPlayerId,
      });
    } else {
      this.wolves.set(wolfData.id, {
        id: wolfData.id,
        x: wolfData.x,
        y: wolfData.y,
        health: wolfData.health,
        direction: wolfData.direction,
        state: wolfData.state,
        frame: wolfData.frame || 0,
        frameTime: 0,
        targetPlayerId: wolfData.targetPlayerId || null,
      });
    }
  },

  removeWolf(wolfId) {
    if (this.wolves.has(wolfId)) {
      this.wolves.delete(wolfId);
      console.log(`Волк ${wolfId} удалён`);
    }
  },

  handleWolfDeath(wolfId, killerId) {
    const wolf = this.wolves.get(wolfId);
    if (!wolf) return;

    wolf.state = "dying";
    wolf.frame = 0;
    wolf.frameTime = 0;
    this.wolves.set(wolfId, wolf);

    sendWhenReady(
      ws,
      JSON.stringify({
        type: "updateWolf",
        wolfId,
        x: wolf.x,
        y: wolf.y,
        health: wolf.health,
        direction: wolf.direction,
        state: wolf.state,
        worldId: 1,
      })
    );

    const killer = players.get(killerId);
    if (killer) {
      let xpGain = 1;
      if (killer.level <= 1) {
        xpGain = 5;
      } else if (killer.level <= 3) {
        xpGain = 3;
      }
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "addXP",
          playerId: killerId,
          xp: xpGain,
        })
      );
      console.log(
        `Игрок ${killerId} получил ${xpGain} XP за убийство волка ${wolfId}`
      );
    }

    if (Math.random() < 0.1) {
      const items = ["knuckles", "knife", "bat"];
      const itemType = items[Math.floor(Math.random() * items.length)];
      const itemId = `${itemType}_${Date.now()}`;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 30;
      const dropX = wolf.x + Math.cos(angle) * radius;
      const dropY = wolf.y + Math.sin(angle) * radius;

      sendWhenReady(
        ws,
        JSON.stringify({
          type: "dropItem",
          itemId,
          x: dropX,
          y: dropY,
          type: itemType,
          worldId: 1,
        })
      );
      console.log(
        `Предмет ${itemType} выброшен на x:${dropX}, y:${dropY} из волка ${wolfId}`
      );
    }
  },
};

window.wolfSystem = wolfSystem;
