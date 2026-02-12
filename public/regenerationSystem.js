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
      let healAmount = Math.floor((maxHp * percent) / 100);

      if (healAmount <= 0) return;

      const oldHealth = me.health;

      // Самое важное — НЕ даём превысить максимум
      const canHeal = maxHp - me.health;
      healAmount = Math.min(healAmount, canHeal);

      if (healAmount <= 0) return; // уже полный или почти полный

      me.health += healAmount;
      // health уже ≤ maxHp, потому что мы обрезали healAmount

      const gained = healAmount;

      showNotification(`Регенерация: +${gained} HP`, "#44ff88");

      console.log(
        `[Реген] +${gained} → ${me.health}/${maxHp}   (навык ур. ${skill.level})`,
      );

      if (ws?.readyState === WebSocket.OPEN) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "update",
            player: {
              id: myId,
              health: me.health,
              // pendingRegen больше НЕ отправляем — он больше не нужен
            },
          }),
        );
      }

      updateStatsDisplay();
    }, 30000);
  },

  // Вызывается клиентом после получения подтверждения от сервера
  clearPendingRegen() {
    this.pendingRegen = 0;
    console.log("[Regeneration] pendingRegen сброшен после синхронизации");
  },
};

window.regenerationSystem = regenerationSystem;
