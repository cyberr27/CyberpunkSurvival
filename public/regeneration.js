window.regenerationSystem = {
  interval: null,
  lastDamageTime: 0, // ← когда последний раз получили урон
  REGEN_DELAY_AFTER_DAMAGE: 30000, // 30 секунд после урона

  start() {
    if (this.interval) clearInterval(this.interval);

    this.interval = setInterval(() => {
      const now = Date.now();

      // 1. Самая первая проверка — вышли из боя?
      if (now - this.lastDamageTime < this.REGEN_DELAY_AFTER_DAMAGE) {
        return; // ещё в боевом режиме — реген не работает
      }

      const me = players.get(myId);
      if (!me) return; // игрок пропал из карты

      const maxHp = me.maxStats?.health || 100;

      // 2. Почти полное здоровье? Не беспокоим сервер
      const missing = maxHp - me.health;
      if (missing < 3) return;

      // 3. Мёртв или уже полный хп? Выходим
      if (me.health <= 0 || me.health >= maxHp) {
        return;
      }

      // 4. Проверяем навык (самое тяжёлое — find)
      const regSkill = me.skills?.find((s) => s.id === 2);
      if (!regSkill || regSkill.level < 1) {
        this.stop(); // навык пропал или =0 → выключаем систему
        return;
      }

      // 5. Расчёт лечения
      const percent = 5 + (regSkill.level - 1);
      let heal = Math.floor((maxHp * percent) / 100);

      if (heal <= 0) return;

      heal = Math.min(heal, missing);

      if (heal <= 0) return;

      // 6. Отправляем запрос
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

  // Вызывается при получении урона (см. ниже)
  resetTimerOnDamage() {
    this.lastDamageTime = Date.now();
  },
};
