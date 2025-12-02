// clockSystem.js — ФИНАЛЬНАЯ ВЕРСИЯ (100% без глюков)

const clockSystem = {
  clocks: [
    { x: 758, y: 2633, worldId: 0 },
    { x: 897, y: 447, worldId: 0 },
  ],

  sprite: null,
  dialogOpen: false,
  dialogElement: null,
  timeInterval: null,

  initialize(spriteImage) {
    this.sprite = spriteImage || window.images?.oclocSprite;
    this.createDialog();
    this.dialogElement.style.display = "none"; // ГАРАНТИРОВАННО скрываем при старте
  },

  createDialog() {
    // Если уже есть — не создаём заново
    if (this.dialogElement) return;

    const dialog = document.createElement("div");
    dialog.id = "clockDialog";
    dialog.className = "npc-dialog";

    dialog.innerHTML = `
      <div class="npc-dialog-header">
        <div class="npc-title">ХРОНОМЕТР</div>
      </div>
      <div class="npc-dialog-content" style="
        display:flex; 
        flex-direction:column; 
        justify-content:center; 
        align-items:center;
        gap:25px; 
        padding:30px 20px;
        flex:1;
      ">
        <div id="clockTime" style="
          font-size:52px; 
          letter-spacing:5px; 
          color:#00ffff; 
          text-shadow:0 0 20px #00ffff;
        ">88:88</div>
        <div id="clockDate" style="
          font-size:28px; 
          color:#00ff88; 
          text-shadow:0 0 12px #00ff88;
        ">88.88.8888</div>
      </div>
    `;

    document.body.appendChild(dialog);
    this.dialogElement = dialog;
  },

  openDialog() {
    if (this.dialogOpen) return;
    this.dialogOpen = true;
    this.dialogElement.style.display = "flex";
    this.updateTime();
    this.timeInterval = setInterval(() => this.updateTime(), 1000);
  },

  closeDialog() {
    if (!this.dialogOpen) return;
    this.dialogOpen = false;
    this.dialogElement.style.display = "none";
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
    }
  },

  updateTime() {
    const now = new Date();
    const futureYear = now.getFullYear() + 200;

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const timeEl = document.getElementById("clockTime");
    const dateEl = document.getElementById("clockDate");
    if (timeEl) timeEl.textContent = `${hours}:${minutes}`;
    if (dateEl) dateEl.textContent = `${day}.${month}.${futureYear}`;
  },

  isPlayerNearAnyClock(me) {
    if (!me) return false;
    const currentWorldId = window.worldSystem?.currentWorldId ?? 0;

    for (const clock of this.clocks) {
      if (clock.worldId !== currentWorldId) continue;
      const dx = me.x + 35 - clock.x;
      const dy = me.y + 35 - clock.y;
      if (dx * dx + dy * dy < 50 * 50) {
        return true;
      }
    }
    return false;
  },

  update(deltaTime) {
    // ЕСЛИ ЕЩЁ НЕ В ИГРЕ — НИЧЕГО НЕ ДЕЛАЕМ
    if (!myId || !players.has(myId)) {
      if (this.dialogOpen) this.closeDialog();
      return;
    }

    const me = players.get(myId);
    if (!me || me.health <= 0) {
      if (this.dialogOpen) this.closeDialog();
      return;
    }

    const inRange = this.isPlayerNearAnyClock(me);

    if (inRange && !this.dialogOpen) {
      this.openDialog();
    } else if (!inRange && this.dialogOpen) {
      this.closeDialog();
    }
  },

  draw() {
    if (!this.sprite?.complete) return;

    const camera = window.movementSystem?.getCamera?.() || { x: 0, y: 0 };
    const currentWorldId = window.worldSystem?.currentWorldId ?? 0;

    this.clocks.forEach((clock) => {
      if (clock.worldId !== currentWorldId) return;

      const screenX = clock.x - camera.x - 35;
      const screenY = clock.y - camera.y - 65;
      const frame = Math.floor(performance.now() / 120) % 13;

      ctx.drawImage(
        this.sprite,
        frame * 70,
        0,
        70,
        70,
        screenX,
        screenY,
        100,
        100
      );
    });
  },
};

// === Инициализация без ошибок и без глюков ===
(function () {
  window.clockSystem = clockSystem;

  const tryInit = () => {
    if (window.images?.oclocSprite) {
      clockSystem.initialize(window.images.oclocSprite);
      return true;
    }
    return false;
  };

  if (!tryInit()) {
    const waiter = setInterval(() => {
      if (tryInit()) clearInterval(waiter);
    }, 50);
  }
})();
