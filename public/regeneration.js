window.regenerationSystem = {
  interval: null,

  start() {
    if (this.interval) clearInterval(this.interval);

    this.interval = setInterval(() => {
      const me = players.get(myId);
      if (!me || me.health <= 0 || me.health >= (me.maxStats?.health || 100)) {
        return;
      }

      // Ищем навык регенерации (id = 2)
      const regSkill = me.skills?.find((s) => s.id === 2);
      if (!regSkill || regSkill.level < 1) return;

      const percent = 5 + (regSkill.level - 1); // 5% → 31% на 27 уровне
      const maxHp = me.maxStats?.health || 100;
      let heal = Math.floor((maxHp * percent) / 100);

      if (heal <= 0) return;

      const missing = maxHp - me.health;
      heal = Math.min(heal, missing);

      if (heal <= 0) return;

      // Отправляем запрос на лечение серверу
      if (ws?.readyState === WebSocket.OPEN) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "requestRegeneration",
            amount: heal,
            currentHealth: me.health, // для проверки сервером
            skillLevel: regSkill.level,
          }),
        );
      }
    }, 30000); // каждые 30 секунд
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },
};
