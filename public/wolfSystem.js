// wolfSystem.js – оптимизированная версия
const wolfSystem = {
  wolves: new Map(),
  wolfSprite: null,
  wolfSkinImage: null,
  FRAME_DURATION: 400, // длительность кадра в мс
  SPRITE_SIZE: 40,
  _totalTime: 0, // накопленное время для анимации
  _isWasteland: false, // кэш текущего мира
  _cachedWorldId: null,
  _me: null,
  _spriteReady: false,

  // Направления → Y-координата в спрайт-листе
  _DIRECTION_Y: { up: 0, down: 40, left: 80, right: 120 },

  initialize(wolfSprite, wolfSkinImage) {
    this.wolfSprite = wolfSprite;
    this.wolfSkinImage = wolfSkinImage;
    this._spriteReady = wolfSprite.complete;
    wolfSprite.onload = () => (this._spriteReady = true);
  },

  clearWolves() {
    this.wolves.clear();
    this._totalTime = 0;
  },

  _updateWorldCache() {
    const worldId = window.worldSystem.currentWorldId;
    if (this._cachedWorldId !== worldId) {
      this._cachedWorldId = worldId;
      this._isWasteland = worldId === 1;
      // УБРАЛИ: if (!this._isWasteland) this.clearWolves();
      // → Теперь волки не удаляются при смене мира!
    }
    this._me = players.get(myId);
  },

  update(deltaTime) {
    this._updateWorldCache();
    if (!this._isWasteland || !this._me) return;

    this._totalTime += deltaTime;

    const frameDuration = this.FRAME_DURATION / 4;
    const animTime = this._totalTime;

    for (const [id, wolf] of this.wolves) {
      if (wolf.state === "walking") {
        const localTime = (wolf._offsetTime ?? 0) + animTime;
        wolf.frame = Math.floor(localTime / frameDuration) % 4;
      } else if (wolf.state === "dying") {
        const localTime = (wolf._offsetTime ?? 0) + animTime;
        const frame = Math.floor(localTime / frameDuration);
        wolf.frame = frame < 4 ? frame : 3;
      } else {
        wolf.frame = 0;
      }
    }
  },

  draw(ctx, camera) {
    if (!this._isWasteland || !this._spriteReady) return;

    const { width, height } = canvas;
    const offscreen = this.SPRITE_SIZE;

    for (const wolf of this.wolves.values()) {
      const screenX = wolf.x - camera.x;
      const screenY = wolf.y - camera.y;

      if (
        screenX < -offscreen ||
        screenX > width + offscreen ||
        screenY < -offscreen ||
        screenY > height + offscreen
      ) {
        continue;
      }

      const spriteY =
        wolf.state === "dying" ? 160 : this._DIRECTION_Y[wolf.direction] ?? 40;
      const spriteX = wolf.frame * this.SPRITE_SIZE;

      ctx.drawImage(
        this.wolfSprite,
        spriteX,
        spriteY,
        this.SPRITE_SIZE,
        this.SPRITE_SIZE,
        screenX,
        screenY,
        this.SPRITE_SIZE,
        this.SPRITE_SIZE
      );

      // HP бар
      const barY = screenY - 10;
      ctx.fillStyle = "red";
      ctx.fillRect(screenX, barY, this.SPRITE_SIZE, 5);
      ctx.fillStyle = "green";
      ctx.fillRect(screenX, barY, (wolf.health / 100) * this.SPRITE_SIZE, 5);
    }
  },

  syncWolves(wolvesData) {
    this._updateWorldCache();

    // НЕ УДАЛЯЕМ ВОЛКОВ, если не в Пустоши — просто игнорируем новые данные
    if (!this._isWasteland) {
      return; // ← УБРАЛИ clearWolves()!
    }

    const newMap = new Map();

    for (const data of wolvesData) {
      // Принимаем ТОЛЬКО волков из мира 1
      if (data.worldId !== 1) continue;

      const existing = this.wolves.get(data.id);
      const offset =
        existing?._offsetTime ?? Math.random() * this.FRAME_DURATION * 4;

      newMap.set(data.id, {
        id: data.id,
        x: data.x,
        y: data.y,
        health: data.health,
        direction: data.direction || "down",
        state: data.state || "walking",
        frame: data.frame ?? 0,
        _offsetTime: offset,
      });
    }

    // Только если мы в Пустоши — обновляем
    if (this._isWasteland) {
      this.wolves = newMap;
    }
  },

  updateWolf(wolfData) {
    this._updateWorldCache();
    if (!this._isWasteland || wolfData.worldId !== 1) return;

    const wolf = this.wolves.get(wolfData.id);
    if (!wolf) return;

    // Обновляем только нужные поля
    Object.assign(wolf, {
      x: wolfData.x,
      y: wolfData.y,
      health: wolfData.health,
      direction: wolfData.direction,
      state: wolfData.state,
      frame: wolfData.frame ?? wolf.frame,
    });
  },

  removeWolf(wolfId) {
    this._updateWorldCache();
    if (!this._isWasteland) return;
    this.wolves.delete(wolfId);
  },
};

window.wolfSystem = wolfSystem;
