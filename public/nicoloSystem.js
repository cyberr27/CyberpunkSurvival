// nicoloSystem.js
// NPC Nicolo — бездомный сталкер в мире 0
// Координаты: X=169, Y=3003
// Загрузка изображений — как у всех NPC (через images из code.js)

window.nicoloSystem = (function () {
  const NICOLO_X = 201;
  const NICOLO_Y = 3093;
  const INTERACTION_RADIUS = 100;
  const DIALOG_RADIUS = 50;

  let nicoloFrame = 0;
  let nicoloFrameTime = 0;
  const NICOLO_FRAME_DURATION = 100; // ~384 мс × 13 = ~5 секунд полный цикл
  const NICOLO_TOTAL_FRAMES = 40; // у тебя 13 кадров в строке вниз

  let nicoloDialog = null;
  let nicoloButtonsContainer = null;
  let isNearNicolo = false;
  let hasMetNicolo = false;

  // Безопасно берём изображения — как у всех NPC
  function getNicoloSprite() {
    const img = images.nicoloSprite || images.johnSprite;
    return img && img.complete ? img : null;
  }

  function getNicoloPhoto() {
    const img = images.nicoloPhoto || images.fotoQuestNPC || images.johnSprite;
    return img && img.complete ? img : null;
  }

  function init() {
    createDialogElements();
    updateMetStatusFromPlayer();
  }

  function createDialogElements() {
    nicoloDialog = document.createElement("div");
    nicoloDialog.className = "npc-dialog";
    nicoloDialog.id = "nicoloDialog";
    nicoloDialog.style.display = "none";
    document.body.appendChild(nicoloDialog);

    nicoloButtonsContainer = document.createElement("div");
    nicoloButtonsContainer.className = "npc-buttons-container";
    nicoloButtonsContainer.id = "nicoloButtonsContainer";
    nicoloButtonsContainer.style.display = "none";
    document.body.appendChild(nicoloButtonsContainer);
  }

  function updateMetStatusFromPlayer() {
    const me = players.get(myId);
    if (me?.nicoloMet !== undefined) {
      hasMetNicolo = !!me.nicoloMet;
    }
  }

  function showIntroDialog() {
    const photo = getNicoloPhoto();
    const photoSrc = photo?.src || "fotoQuestNPC.png";

    nicoloDialog.innerHTML = `
      <div class="npc-dialog-header">
        <img src="${photoSrc}" class="npc-photo" alt="Nicolo">
        <h2 class="npc-title">Nicolo</h2>
      </div>
      <div class="npc-dialog-content">
        <p class="npc-text">Эй, братан... Я Nicolo. Сижу тут с тех пор, как всё пошло по пиздецу. Неон, мутанты, баляры... всё как обычно. Ты новенький?</p>
      </div>
      <div class="npc-dialog-actions">
        <button class="neon-btn" id="nicoloMeetOk">Хорошо</button>
      </div>
    `;
    nicoloDialog.style.display = "flex";

    document.getElementById("nicoloMeetOk").onclick = () => {
      sendWhenReady(ws, JSON.stringify({ type: "meetNicolo" }));
      hasMetNicolo = true;
      nicoloDialog.style.display = "none";
      showMainButtons();
    };
  }

  function showTalkDialog() {
    const photo = getNicoloPhoto();
    const photoSrc = photo?.src || "fotoQuestNPC.png";

    nicoloDialog.innerHTML = `
      <div class="npc-dialog-header">
        <img src="${photoSrc}" class="npc-photo" alt="Nicolo">
        <h2 class="npc-title">Nicolo</h2>
      </div>
      <div class="npc-dialog-content">
        <p class="npc-text">Чё надо, сталкер? Опять по пустошам шаришься?</p>
        <div class="talk-topics">
          <div class="talk-topic" data-topic="who">Кто ты такой?</div>
          <div class="talk-topic" data-topic="world">Что тут вообще происходит?</div>
          <div class="talk-topic" data-topic="balyary">Баляры есть?</div>
          <div class="talk-topic" data-topic="advice">Дай совет новичку</div>
        </div>
      </div>
      <div class="npc-dialog-actions">
        <button class="neon-btn" onclick="document.getElementById('nicoloDialog').style.display='none'">Закрыть</button>
      </div>
    `;
    nicoloDialog.style.display = "flex";

    document.querySelectorAll(".talk-topic").forEach((t) => {
      t.onclick = () => {
        let text = "";
        switch (t.dataset.topic) {
          case "who":
            text =
              "Я — Nicolo. Был хакером в старом городе. Потом всё сгорело. Теперь вот сижу, жду, когда мутанты сожрут.";
            break;
          case "world":
            text =
              "Мир сдох, братан. Остался только неон, радиация и мы — последние выжившие. Ищи баляры, еду, воду. И не доверяй никому.";
            break;
          case "balyary":
            text =
              "Ха! Если б были — я б тут не гнил. Дери с мутантов, сталкер. Или у других отжимай.";
            break;
          case "advice":
            text =
              "Не пей воду из луж. Не ешь жёлтые грибы. И если увидишь робота-пылесоса — беги. Он не тот, кем кажется.";
            break;
        }
        document.querySelector(".npc-dialog-content").innerHTML = `
          <p class="npc-text fullscreen">${text}</p>
          <button class="neon-btn" style="margin-top:20px" onclick="window.nicoloSystem.showTalkDialog()">Назад</button>
        `;
      };
    });
  }

  function showQuestDialog() {
    const photo = getNicoloPhoto();
    const photoSrc = photo?.src || "fotoQuestNPC.png";

    nicoloDialog.innerHTML = `
      <div class="npc-dialog-header">
        <img src="${photoSrc}" class="npc-photo" alt="Nicolo">
        <h2 class="npc-title">Nicolo — Дело</h2>
      </div>
      <div class="npc-dialog-content">
        <p class="npc-text">Слушай сюда, сталкер. У меня есть одно дельце...</p>
        <div class="quest-list">
          <div class="quest-item coming-soon">
            <span class="quest-marker">Lightning</span>
            <div><strong>Принеси еды</strong><br><small>Найди 3 банки тушёнки</small></div>
            <div class="quest-reward">+80 баляров</div>
          </div>
        </div>
        <p class="npc-text" style="margin-top:20px; font-style:italic; color:#ff00ff;">
          Квест в разработке. Скоро будет, братан.
        </p>
      </div>
      <div class="npc-dialog-actions">
        <button class="neon-btn" onclick="document.getElementById('nicoloDialog').style.display='none'">Закрыть</button>
      </div>
    `;
    nicoloDialog.style.display = "flex";
  }

  function showMainButtons() {
    if (!hasMetNicolo || !isNearNicolo) {
      nicoloButtonsContainer.style.display = "none";
      return;
    }

    nicoloButtonsContainer.innerHTML = `
      <button class="npc-button npc-talk-btn">Говорить</button>
      <button class="npc-button npc-quests-btn">Дело</button>
    `;
    nicoloButtonsContainer.querySelector(".npc-talk-btn").onclick =
      showTalkDialog;
    nicoloButtonsContainer.querySelector(".npc-quests-btn").onclick =
      showQuestDialog;
    nicoloButtonsContainer.style.display = "flex";
  }

  function update() {
    const me = players.get(myId);
    if (!me || me.worldId !== 0) {
      isNearNicolo = false;
      nicoloButtonsContainer.style.display = "none";
      if (nicoloDialog) nicoloDialog.style.display = "none";
      return;
    }

    if (me.nicoloMet !== undefined) hasMetNicolo = !!me.nicoloMet;

    const dx = me.x + 35 - NICOLO_X;
    const dy = me.y + 35 - NICOLO_Y;
    const distSq = dx * dx + dy * dy;

    const nearInteraction = distSq < INTERACTION_RADIUS * INTERACTION_RADIUS;
    const nearDialog = distSq < DIALOG_RADIUS * DIALOG_RADIUS;

    isNearNicolo = nearInteraction;

    if (nearDialog && !hasMetNicolo && nicoloDialog.style.display !== "flex") {
      showIntroDialog();
    }

    if (nearInteraction) {
      const cam = window.movementSystem.getCamera();
      const sx = NICOLO_X - cam.x + 35 - 60;
      const sy = NICOLO_Y - cam.y - 70;
      nicoloButtonsContainer.style.left = sx + "px";
      nicoloButtonsContainer.style.top = sy + "px";
      showMainButtons();
    } else {
      nicoloButtonsContainer.style.display = "none";
    }
  }

  function draw(deltaTime = 16) {
    // deltaTime будет приходить из gameLoop
    if (window.worldSystem.currentWorldId !== 0) return;

    const cam = window.movementSystem.getCamera();
    const sx = NICOLO_X - cam.x;
    const sy = NICOLO_Y - cam.y;

    const sprite = getNicoloSprite();
    if (!sprite || !sprite.complete) {
      // заглушка, если спрайт не загрузился
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(sx, sy, 70, 70);
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("NICOLO", sx + 35, sy + 40);
      return;
    }

    // === АНИМАЦИЯ 13 КАДРОВ В ОДНОЙ ГОРИЗОНТАЛЬНОЙ СТРОКЕ ===
    nicoloFrameTime += deltaTime;
    if (nicoloFrameTime >= NICOLO_FRAME_DURATION) {
      nicoloFrameTime -= NICOLO_FRAME_DURATION;
      nicoloFrame = (nicoloFrame + 1) % NICOLO_TOTAL_FRAMES; // 13 кадров
    }

    // Рисуем текущий кадр из горизонтальной строки (Y = 0)
    ctx.drawImage(
      sprite,
      nicoloFrame * 70, // X — текущий кадр (0, 70, 140 ... 840)
      0, // Y — первая (и единственная) строка
      70, // ширина кадра
      70, // высота кадра
      sx,
      sy,
      70,
      70
    );

    // Имя над головой
    ctx.fillStyle = "#ff00ff";
    ctx.font = "16px 'Courier New'";
    ctx.textAlign = "center";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.strokeText("Nicolo", sx + 35, sy - 15);
    ctx.fillText("Nicolo", sx + 35, sy - 15);
  }

  return { init, update, draw };
})();
