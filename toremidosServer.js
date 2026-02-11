// toremidosServer.js

function handleSkillUpgrade(
  ws,
  data,
  player,
  players,
  userDatabase,
  dbCollection,
  saveUserDatabase,
) {
  const skillId = Number(data.skillId);
  if (!Number.isInteger(skillId) || skillId < 1 || skillId > 10) {
    ws.send(
      JSON.stringify({
        type: "upgradeSkillResult",
        success: false,
        error: "Неверный ID навыка",
      }),
    );
    return;
  }

  // Проверяем наличие очков
  if (!player.skillPoints || player.skillPoints < 1) {
    ws.send(
      JSON.stringify({
        type: "upgradeSkillResult",
        success: false,
        error: "Нет доступных очков навыков",
      }),
    );
    return;
  }

  // Ищем навык
  let skill = player.skills.find((s) => s.id === skillId);
  if (!skill) {
    // Если навыка ещё нет — создаём с уровнем 0
    skill = { id: skillId, level: 0 };
    player.skills.push(skill);
  }

  if (skill.level >= 27) {
    ws.send(
      JSON.stringify({
        type: "upgradeSkillResult",
        success: false,
        error: "Навык уже достиг максимального уровня",
      }),
    );
    return;
  }

  // Прокачиваем
  skill.level += 1;
  player.skillPoints -= 1;

  // Сохраняем
  players.set(player.id, { ...player });
  userDatabase.set(player.id, { ...player });
  saveUserDatabase(dbCollection, player.id, player);

  // Отправляем клиенту успех
  ws.send(
    JSON.stringify({
      type: "upgradeSkillResult",
      success: true,
      skillId: skillId,
      newLevel: skill.level,
      remainingPoints: player.skillPoints,
      skills: player.skills,
    }),
  );

  // Опционально: уведомление
  ws.send(
    JSON.stringify({
      type: "showNotification",
      message: `Умение улучшено! ${skill.level}/27`,
      color: "#00ff88",
    }),
  );
}

module.exports = { handleSkillUpgrade };
