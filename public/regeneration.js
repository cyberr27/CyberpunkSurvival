window.regenerationSystem = {
  interval: null,
  lastDamageTime: 0, // когда последний раз получили урон
  REGEN_DELAY_AFTER_DAMAGE: 30000, // 30 секунд после урона

  start() {
    if (this.interval) clearInterval(this.interval);

    this.interval = setInterval(() => {
      const now = Date.now();

      // 1. Проверяем, прошло ли 30 секунд после последнего урона
      if (now - this.lastDamageTime < this.REGEN_DELAY_AFTER_DAMAGE) {
        return; // ещё в "боевом" режиме — реген не работает
      }

      const me = players.get(myId);
      if (!me) return; // игрок пропал

      const maxHp = me.maxStats?.health || 100;

      // 2. Мёртв или уже полный? Выходим
      if (me.health <= 0 || me.health >= maxHp) {
        return;
      }

      // 3. Проверяем навык
      const regSkill = me.skills?.find((s) => s.id === 2);
      if (!regSkill || regSkill.level < 1) {
        this.stop(); // навык пропал → выключаем
        return;
      }

      // 4. Расчёт лечения — до максимума
      const percent = 5 + (regSkill.level - 1);
      let heal = Math.floor((maxHp * percent) / 100);

      if (heal <= 0) return;

      const missing = maxHp - me.health;
      heal = Math.min(heal, missing);

      if (heal <= 0) return;

      // 5. Отправляем запрос
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
};
