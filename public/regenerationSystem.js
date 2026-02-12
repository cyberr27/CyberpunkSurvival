// regenerationSystem.js

const regenerationSystem = {
  isInitialized: false,
  pendingRegen: 0, // ← НОВОЕ: накопленный реген, который ещё "висит"

  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.startRegeneration();

    document.addEventListener("statsUpdated", () => {
      this.applyPendingRegen();
    });

    console.log("[Regeneration] Система инициализирована (с pendingRegen)");
  },

  startRegeneration() {
    setInterval(() => {
      const me = players.get(myId);
      if (!me || me.health <= 0) return;

      const skill = me.skills?.find((s) => s.id === 2);
      if (!skill || skill.level < 1) return;

      const percent = 5 + (skill.level - 1);
      const maxHp = me.maxStats?.health || 100;
      const healAmount = Math.floor((maxHp * percent) / 100);

      if (healAmount <= 0) return;

      // Добавляем к pending, а не сразу к health
      this.pendingRegen += healAmount;

      const oldHealth = me.health;
      // Применяем сразу локально (для плавности)
      me.health = Math.min(maxHp + this.pendingRegen, me.health + healAmount);

      const gained = me.health - oldHealth;

      showNotification(`Регенерация: +${gained} HP`, "#44ff88");

      console.log(
        `[Реген] +${gained} (pending теперь ${this.pendingRegen}) → ${me.health}/${maxHp}`,
      );

      if (ws?.readyState === WebSocket.OPEN) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "update",
            player: {
              id: myId,
              health: me.health,
              pendingRegen: this.pendingRegen, // ← передаём на сервер
            },
          }),
        );
      }

      updateStatsDisplay();
    }, 30000);
  },

  applyPendingRegen() {
    const me = players.get(myId);
    if (!me || this.pendingRegen <= 0) return;

    const oldHealth = me.health;

    // Применяем накопленный реген поверх нового максимума
    me.health = Math.min(
      me.maxStats.health + this.pendingRegen,
      me.health + this.pendingRegen,
    );

    const applied = me.health - oldHealth;

    if (applied > 0) {
      console.log(`[Защита] Применён pending реген +${applied} → ${me.health}`);
      updateStatsDisplay();
    }

    // Не обнуляем pendingRegen здесь — только сервер может это сделать
  },

  // Вызывается клиентом после получения подтверждения от сервера
  clearPendingRegen() {
    this.pendingRegen = 0;
    console.log("[Regeneration] pendingRegen сброшен после синхронизации");
  },
};

window.regenerationSystem = regenerationSystem;
