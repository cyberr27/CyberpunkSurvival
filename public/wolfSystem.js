const wolfSystem = {
  wolves: new Map(), // Хранит волков: id -> {x, y, health, direction, state, frame, frameTime}
  wolfSprite: null,
  wolfSkinImage: null,
  FRAME_DURATION: 400, // Длительность цикла анимации (мс)

  initialize(wolfSprite, wolfSkinImage) {
    this.wolfSprite = wolfSprite;
    this.wolfSkinImage = wolfSkinImage;
    console.log("WolfSystem инициализирован");
  },

  update(deltaTime) {
    const me = players.get(myId);
    if (!me || me.worldId !== 1) return; // Волки только в Пустошах (worldId: 1)

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

      // Пропускаем, если волк вне видимой области
      if (
        screenX < -40 ||
        screenX > canvas.width + 40 ||
        screenY < -40 ||
        screenY > canvas.height + 40
      ) {
        return;
      }

      // Определяем строку спрайта в зависимости от направления/состояния
      let spriteY;
      if (wolf.state === "dying") {
        spriteY = 160; // 5-я строка (смерть)
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

      // Рисуем волка
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

        // Рисуем здоровье
        ctx.fillStyle = "red";
        ctx.fillRect(screenX, screenY - 10, 40, 5);
        ctx.fillStyle = "green";
        ctx.fillRect(screenX, screenY - 10, (wolf.health / 100) * 40, 5);
      }
    });
  },

  syncWolves(wolvesData) {
    this.wolves.clear();
    wolvesData.forEach((wolf) => {
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
    });
    console.log(`Синхронизировано ${wolvesData.length} волков`);
  },

  updateWolf(wolfData) {
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
    this.wolves.delete(wolfId);
    console.log(`Волк ${wolfId} удалён`);
  },
};

window.wolfSystem = wolfSystem;
