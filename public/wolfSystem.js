// В начало файла, после определения wolfSystem
const wolfSystem = {
  wolves: new Map(),
  wolfSprite: null,
  wolfSkinImage: null,
  FRAME_DURATION: 400,
  lastSpawnDistance: 0, // Последнее расстояние, при котором спавнился волк
  nextSpawnDistance: 500, // Расстояние до следующего спавна (инициализируем 500)

  initialize(wolfSprite, wolfSkinImage) {
    this.wolfSprite = wolfSprite;
    this.wolfSkinImage = wolfSkinImage;
    console.log("WolfSystem инициализирован");
  },

  // Новый метод для очистки волков при смене мира
  clearWolves() {
    this.wolves.clear();
    console.log("Все волки очищены при смене мира");
  },

  update(deltaTime) {
    const me = players.get(myId);
    if (!me || me.worldId !== 1) return; // Волки только в Пустошах

    // Проверка дистанции для спавна волков
    const distanceTraveled = me.distanceTraveled || 0;
    if (distanceTraveled >= this.lastSpawnDistance + this.nextSpawnDistance) {
      const wolfId = `wolf_${Date.now()}_${Math.random()}`;
      const camera = window.movementSystem.getCamera();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const spawnMargin = 50; // Отступ за пределами видимой зоны

      // Выбираем случайный край (0: верх, 1: низ, 2: лево, 3: право)
      const edge = Math.floor(Math.random() * 4);
      let wolfX, wolfY;

      switch (edge) {
        case 0: // Верх
          wolfX = me.x + (Math.random() * canvasWidth - canvasWidth / 2);
          wolfY = me.y - canvasHeight / 2 - spawnMargin;
          break;
        case 1: // Низ
          wolfX = me.x + (Math.random() * canvasWidth - canvasWidth / 2);
          wolfY = me.y + canvasHeight / 2 + spawnMargin;
          break;
        case 2: // Лево
          wolfX = me.x - canvasWidth / 2 - spawnMargin;
          wolfY = me.y + (Math.random() * canvasHeight - canvasHeight / 2);
          break;
        case 3: // Право
          wolfX = me.x + canvasWidth / 2 + spawnMargin;
          wolfY = me.y + (Math.random() * canvasHeight - canvasHeight / 2);
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
        targetPlayerId: myId, // Волк привязан к игроку, который вызвал спавн
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
          targetPlayerId: myId,
        })
      );
      console.log(`Волк ${wolfId} создан на x:${wolf.x}, y:${wolf.y}`);
      this.lastSpawnDistance = distanceTraveled;
      this.nextSpawnDistance = 500 + Math.random() * 500; // 500–1000 пикселей
    }

    // Обновление волков (без изменений)
    this.wolves.forEach((wolf, id) => {
      if (wolf.state === "walking") {
        // Находим ближайшего игрока
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
          // Двигаем волка к ближайшему игроку
          const dx = closestPlayer.x - wolf.x;
          const dy = closestPlayer.y - wolf.y;
          const angle = Math.atan2(dy, dx);
          const speed = 2; // Скорость волка (пикселей за кадр)
          wolf.x += Math.cos(angle) * speed * (deltaTime / 16.67);
          wolf.y += Math.sin(angle) * speed * (deltaTime / 16.67);

          // Определяем направление волка
          if (Math.abs(dx) > Math.abs(dy)) {
            wolf.direction = dx > 0 ? "right" : "left";
          } else {
            wolf.direction = dy > 0 ? "down" : "up";
          }

          // Отправляем обновление волка на сервер
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
          // Волк рядом с игроком, атакуем
          wolf.state = "attacking";
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "wolfAttack",
              wolfId: id,
              targetId: closestPlayer.id,
              damage: 5, // Урон волка
              worldId: 1,
            })
          );
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
          wolf.state = "walking"; // Возвращаем в состояние ходьбы после атаки
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
      this.clearWolves(); // Очищаем волков, если не в Пустошах
      return;
    }

    this.wolves.clear();
    wolvesData.forEach((wolf) => {
      if (wolf.worldId === 1) {
        // Проверяем, что волк в Пустошах
        this.wolves.set(wolf.id, {
          id: wolf.id,
          x: wolf.x,
          y: wolf.y,
          health: wolf.health,
          direction: wolf.direction,
          state: wolf.state,
          frame: wolf.frame || 0,
          frameTime: 0,
        });
      }
    });
    console.log(`Синхронизировано ${this.wolves.size} волков в Пустошах`);
  },

  updateWolf(wolfData) {
    const currentWorldId = window.worldSystem.currentWorldId;
    if (currentWorldId !== 1 || wolfData.worldId !== 1) return; // Игнорируем, если не в Пустошах

    if (wolfData.health <= 0 && this.wolves.has(wolfData.id)) {
      // Волк мёртв, вызываем обработчик смерти
      this.handleWolfDeath(wolfData.id, wolfData.killerId || myId);
      return;
    }

    if (this.wolves.has(wolfData.id)) {
      const existingWolf = this.wolves.get(wolfData.id);
      this.wolves.set(wolfData.id, {
        ...existingWolf,
        ...wolfData,
        frameTime: existingWolf.frameTime || 0,
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

    // Устанавливаем состояние смерти
    wolf.state = "dying";
    wolf.frame = 0;
    wolf.frameTime = 0;
    this.wolves.set(wolfId, wolf);

    // Отправляем обновление волка на сервер
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

    // Начисление опыта игроку, убившему волка
    const killer = players.get(killerId);
    if (killer) {
      let xpGain = 1; // Базовый опыт
      if (killer.level <= 1) {
        xpGain = 5; // 0–1 уровень: 5 XP
      } else if (killer.level <= 3) {
        xpGain = 3; // 2–3 уровень: 3 XP
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

    // Дроп предмета с шансом 1/10
    if (Math.random() < 0.1) {
      const items = ["knuckles", "knife", "bat"];
      const itemType = items[Math.floor(Math.random() * items.length)];
      const itemId = `${itemType}_${Date.now()}`;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 30; // Радиус дропа 30 пикселей
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
