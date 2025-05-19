// В начало файла, после определения wolfSystem
const wolfSystem = {
  wolves: new Map(),
  wolfSprite: null,
  wolfSkinImage: null,
  FRAME_DURATION: 400,

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

    this.wolves.forEach((wolf, id) => {
      if (wolf.state === "walking") {
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
      });
    }
  },

  removeWolf(wolfId) {
    if (this.wolves.has(wolfId)) {
      this.wolves.delete(wolfId);
      console.log(`Волк ${wolfId} удалён`);
    }
  },
};

window.wolfSystem = wolfSystem;
