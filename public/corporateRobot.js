// corporateRobot.js
// Робот «Воспитатель Корпорации» — координаты 2120×1800, мир 0

window.corporateRobotSystem = (function () {
  const ROBOT_X = 2120;
  const ROBOT_Y = 1800;
  const INTERACTION_RADIUS = 50;

  let sprite = null;
  let isInitialized = false;

  const robotData = {
    name: "Воспитатель Корпорации",
    dialogues: [
      "Добро пожаловать, дитя корпорации.",
      "Ты — будущее. Мы следим за тобой.",
      "Не забывай пить воду. Гидратация — ключ к производительности.",
      "Слушай старших. Слушай корпорацию.",
      "Твои показатели в норме. Продолжай в том же духе.",
      "Корпорация гордится тобой.",
    ],
    quests: [
      {
        id: "corp_tutorial_1",
        title: "Первое задание воспитателя",
        description: "Принеси 5 баляров — докажи свою преданность.",
        reward: { xp: 50, balyary: 10 },
        requiredItem: "balyary",
        requiredCount: 5,
      },
    ],
  };

  let currentDialogueIndex = 0;
  let playerInRange = false;
  let dialogContainer = null;
  let buttonsContainer = null;

  function createUI() {
    if (dialogContainer) return;

    dialogContainer = document.createElement("div");
    dialogContainer.className = "npc-dialog";
    dialogContainer.style.display = "none";
    document.body.appendChild(dialogContainer);

    const nameEl = document.createElement("div");
    nameEl.className = "npc-name";
    nameEl.textContent = robotData.name;
    dialogContainer.appendChild(nameEl);

    const photoEl = document.createElement("img");
    photoEl.className = "npc-photo";
    photoEl.src = "fotoQuestNPC.png";
    dialogContainer.appendChild(photoEl);

    const textEl = document.createElement("div");
    textEl.className = "npc-text";
    textEl.id = "corporateRobotText";
    dialogContainer.appendChild(textEl);

    buttonsContainer = document.createElement("div");
    buttonsContainer.className = "npc-buttons";
    dialogContainer.appendChild(buttonsContainer);

    const talkBtn = document.createElement("button");
    talkBtn.className = "cyber-btn";
    talkBtn.textContent = "Говорить";
    talkBtn.onclick = showNextDialogue;
    buttonsContainer.appendChild(talkBtn);

    const questBtn = document.createElement("button");
    questBtn.className = "cyber-btn";
    questBtn.textContent = "Задания";
    questBtn.onclick = openQuests;
    buttonsContainer.appendChild(questBtn);

    const closeBtn = document.createElement("button");
    closeBtn.className = "cyber-btn close";
    closeBtn.textContent = "×";
    closeBtn.onclick = hideDialog;
    dialogContainer.appendChild(closeBtn);
  }

  function showNextDialogue() {
    const el = document.getElementById("corporateRobotText");
    if (!el) return;
    el.textContent = robotData.dialogues[currentDialogueIndex];
    currentDialogueIndex =
      (currentDialogueIndex + 1) % robotData.dialogues.length;
  }

  function openQuests() {
    const el = document.getElementById("corporateRobotText");
    const q = robotData.quests[0];
    el.innerHTML = `
      <strong>Доступное задание:</strong><br><br>
      ${q.title}<br>
      ${q.description}<br><br>
      Награда: ${q.reward.xp} XP + ${q.reward.balyary} баляров
    `;

    if (buttonsContainer.children.length === 2) {
      const accept = document.createElement("button");
      accept.className = "cyber-btn accept";
      accept.textContent = "Взять задание";
      accept.onclick = () => {
        if (ws?.readyState === WebSocket.OPEN) {
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "acceptCorporateQuest",
              questId: robotData.quests[0].id,
            })
          );
        }
        showNotification("Задание принято: Принеси 5 баляров", "#00ffff");
        hideDialog();
      };
      buttonsContainer.appendChild(accept);
    }
  }

  function showDialog() {
    if (!dialogContainer) return;
    dialogContainer.style.display = "block";
    currentDialogueIndex = 0;
    showNextDialogue();
  }

  function hideDialog() {
    if (dialogContainer) {
      dialogContainer.style.display = "none";
    }
    if (buttonsContainer?.children.length > 2) {
      buttonsContainer.removeChild(buttonsContainer.lastChild);
    }
  }

  function checkPlayerProximity() {
    const me = players.get(myId);
    if (!me || window.worldSystem.currentWorldId !== 0) {
      if (playerInRange) {
        playerInRange = false;
        hideDialog();
      }
      return;
    }

    const dx = me.x + 35 - ROBOT_X;
    const dy = me.y + 35 - ROBOT_Y;
    const dist = Math.hypot(dx, dy);

    if (dist <= INTERACTION_RADIUS) {
      if (!playerInRange) {
        playerInRange = true;
        showDialog();
      }
    } else if (playerInRange) {
      playerInRange = false;
      hideDialog();
    }
  }

  return {
    initialize: function (robotSprite) {
      if (isInitialized) return;
      sprite = robotSprite;
      createUI();
      isInitialized = true;
      // новенькое: флаг, что игрок в зоне диалога
      this.isPlayerInteracting = false;
    },

    update: function (deltaTime) {
      checkPlayerProximity();
      this.isPlayerInteracting =
        playerInRange && dialogContainer?.style.display === "block";
    },

    draw: function () {
      if (window.worldSystem.currentWorldId !== 0 || !sprite?.complete) return;

      const cam = window.movementSystem.getCamera();
      const sx = ROBOT_X - cam.x;
      const sy = ROBOT_Y - cam.y;

      let frame;

      if (this.isPlayerInteracting) {
        // Игрок рядом и диалог открыт → замираем на ПЕРВОМ кадре (0)
        frame = 0;
      } else {
        // Обычная анимация: 13 кадров, одна строка, 70×70
        // скорость подбери под вкус — сейчас ~10 fps (120мс на кадр)
        frame = Math.floor(performance.now() / 120) % 13;
      }

      ctx.drawImage(
        sprite,
        frame * 70, // смещение по X в спрайтшите
        0, // Y = 0, всё в одной строке
        70,
        70, // размер кадра
        sx - 35,
        sy - 35, // позиция на экране
        70,
        70 // размер отрисовки
      );

      // Подпись — без изменений
      ctx.font = "bold 16px 'Courier New'";
      ctx.fillStyle = "#00ffff";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;
      ctx.textAlign = "center";
      ctx.strokeText("Воспитатель", sx, sy - 50);
      ctx.fillText("Воспитатель", sx, sy - 50);
    },
  };
})();
