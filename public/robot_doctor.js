// robot_doctor.js
// Робот-Доктор в Неоновом городе (worldId 0) — координаты 2673, 2296
// Анимация идёт всегда, останавливается только при близком подходе игрока

window.robotDoctorSystem = (function () {
  const DOCTOR_X = 2673;
  const DOCTOR_Y = 2296;
  const PROXIMITY_DISTANCE = 50; // пикселей — зона показа кнопок
  const SPRITE_WIDTH = 70;
  const SPRITE_HEIGHT = 70;
  const FRAME_COUNT = 13;
  const FRAME_DURATION = 120; // ms на кадр (≈8.3 FPS)

  let sprite = null;
  let frame = 0;
  let frameTime = 0;
  let buttonsContainer = null;
  let isVisible = false;
  let isNear = false; // флаг: игрок в зоне 50px

  function initialize(doctorSprite) {
    sprite = doctorSprite;
    createButtons();
  }

  function createButtons() {
    buttonsContainer = document.createElement("div");
    buttonsContainer.className = "npc-buttons-container";
    buttonsContainer.style.display = "none";

    const talkBtn = document.createElement("div");
    talkBtn.className = "npc-button npc-talk-btn";
    talkBtn.textContent = "Говорить";
    talkBtn.onclick = () => openDialog("talk");

    const questsBtn = document.createElement("div");
    questsBtn.className = "npc-button npc-quests-btn";
    questsBtn.textContent = "Лечение";
    questsBtn.onclick = () => openDialog("heal");

    buttonsContainer.appendChild(talkBtn);
    buttonsContainer.appendChild(questsBtn);
    document.body.appendChild(buttonsContainer);
  }

  function openDialog(mode) {
    const dialog = document.createElement("div");
    dialog.className = "npc-dialog";
    dialog.innerHTML = `
      <div class="npc-dialog-header">
        <img src="robot_doctor_photo.png" class="npc-photo" alt="Робот-Доктор">
        <h2 class="npc-title">Робот-Доктор v3.7</h2>
      </div>
      <div class="npc-dialog-content">
        ${mode === "talk" ? getTalkText() : getHealOptions()}
      </div>
      <button class="neon-btn" onclick="this.parentElement.remove()">Закрыть</button>
    `;
    document.body.appendChild(dialog);
  }

  function getTalkText() {
    const lines = [
      "Системы в норме. Жизненные показатели: стабильны.",
      "Я — медицинский дрон серии MedBot-3000. Моя задача — поддерживать выживших в строю.",
      "Не забудь пополнить аптечку. Здесь радиация не щадит даже киборгов.",
      "Ты выглядишь... приемлемо. Для человека.",
    ];
    return `<p class="npc-text fullscreen">${
      lines[Math.floor(Math.random() * lines.length)]
    }</p>`;
  }

  function getHealOptions() {
    return `
      <div style="text-align:center; padding:20px;">
        <p class="npc-text">Выберите услугу:</p>
        <button class="neon-btn" style="margin:10px; background:#00ff44;" onclick="healPlayer(50, 100)">Лечение +50 HP — 100 баляров</button><br>
        <button class="neon-btn" style="margin:10px; background:#00ffff;" onclick="healPlayer(100, 250)">Полное восстановление — 250 баляров</button><br>
        <button class="neon-btn" style="margin:10px; background:#ff00ff;" onclick="cureRadiation()">Очистка от радиации — 150 баляров</button>
      </div>
    `;
  }

  // Глобальные функции для кнопок
  window.healPlayer = function (hp, cost) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "robotDoctorHeal",
          healAmount: hp,
          cost: cost,
        })
      );
    }
    document.querySelector(".npc-dialog")?.remove();
  };

  window.cureRadiation = function () {
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "robotDoctorCureRadiation",
          cost: 150,
        })
      );
    }
    document.querySelector(".npc-dialog")?.remove();
  };

  function update(deltaTime) {
    if (!sprite || !sprite.complete) return;

    const me = players.get(myId);
    if (!me || me.worldId !== 0) {
      buttonsContainer.style.display = "none";
      isVisible = false;
      isNear = false;
      return;
    }

    const dx = me.x + 35 - DOCTOR_X;
    const dy = me.y + 35 - DOCTOR_Y;
    const distance = Math.hypot(dx, dy);

    // === АНИМАЦИЯ ===
    // Всегда анимируем, НО если игрок слишком близко — замираем на первом кадре
    if (distance <= PROXIMITY_DISTANCE) {
      if (!isNear) {
        isNear = true;
        frame = 0; // фиксируем на первом кадре
        frameTime = 0; // сбрасываем таймер
      }
      // Больше не обновляем frameTime — анимация остановлена
    } else {
      if (isNear) {
        isNear = false;
        // Можно оставить текущий кадр или сбросить — оставляем как есть
      }
      // Анимация идёт всегда, когда игрок не рядом
      frameTime += deltaTime;
      while (frameTime >= FRAME_DURATION) {
        frameTime -= FRAME_DURATION;
        frame = (frame + 1) % FRAME_COUNT;
      }
    }

    // === КНОПКИ ===
    if (distance < PROXIMITY_DISTANCE) {
      if (!isVisible) {
        isVisible = true;
        buttonsContainer.style.display = "flex";
      }
      const screenX = DOCTOR_X - window.movementSystem.getCamera().x + 35;
      const screenY = DOCTOR_Y - window.movementSystem.getCamera().y - 60;
      buttonsContainer.style.left = screenX + "px";
      buttonsContainer.style.top = screenY + "px";
    } else {
      if (isVisible) {
        isVisible = false;
        buttonsContainer.style.display = "none";
      }
    }
  }

  function draw() {
    if (!sprite || !sprite.complete) return;
    const me = players.get(myId);
    if (!me || me.worldId !== 0) return;

    const camera = window.movementSystem.getCamera();
    const screenX = DOCTOR_X - camera.x;
    const screenY = DOCTOR_Y - camera.y;

    ctx.drawImage(
      sprite,
      frame * SPRITE_WIDTH,
      0,
      SPRITE_WIDTH,
      SPRITE_HEIGHT,
      screenX,
      screenY,
      SPRITE_WIDTH,
      SPRITE_HEIGHT
    );
  }

  return {
    initialize,
    update,
    draw,
  };
})();
