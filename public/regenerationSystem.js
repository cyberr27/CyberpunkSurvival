// regeneration.js

window.regenerationSystem = {
  interval: null,
  lastDamageTime: 0,
  REGEN_DELAY_AFTER_DAMAGE: 30000, // 30 секунд после урона

  start() {
    if (this.interval) clearInterval(this.interval);

    this.interval = setInterval(() => {
      const now = Date.now();

      // 1. Проверяем, прошло ли 30 секунд после последнего урона
      if (now - this.lastDamageTime < this.REGEN_DELAY_AFTER_DAMAGE) {
        return;
      }

      const me = players.get(myId);
      if (!me || me.health <= 0 || me.health >= (me.maxStats?.health || 100)) {
        return;
      }

      // 2. Проверяем наличие и уровень навыка
      const regSkill = me.skills?.find((s) => s.id === 2);
      if (!regSkill || regSkill.level < 1) {
        this.stop();
        return;
      }

      // НОВАЯ ФОРМУЛА: 1% за каждый уровень навыка
      const percent = regSkill.level * 1; // 1%, 2%, 3% ...
      const maxHp = me.maxStats?.health || 100;
      let heal = Math.floor((maxHp * percent) / 100);

      if (heal <= 0) return;

      const missing = maxHp - me.health;
      heal = Math.min(heal, missing);

      if (heal <= 0) return;

      if (ws?.readyState === WebSocket.OPEN) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "requestRegeneration",
            amount: heal,
            currentHealth: me.health,
            skillLevel: regSkill.level,
          }),
        );
      }
    }, 30000);
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },

  resetTimerOnDamage() {
    this.lastDamageTime = Date.now();
  },

  // Вызывается один раз после загрузки игрока (или можно в initialize)
  tryStart() {
    const me = players.get(myId);
    if (me?.skills?.find((s) => s.id === 2)?.level >= 1) {
      this.start();
    }
  },
};
