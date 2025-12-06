// robot_doctor.js
// Робот-Доктор в Неоновом городе (worldId 0) — координаты 2673, 2296
// Оптимизированная версия: минимум аллокаций, кэширование, меньше проверок в кадре

window.robotDoctorSystem = (function () {
  const DOCTOR_X = 2673;
  const DOCTOR_Y = 2296;
  const PROXIMITY_DISTANCE = 50;
  const PROXIMITY_SQ = PROXIMITY_DISTANCE * PROXIMITY_DISTANCE; // сравниваем квадраты

  const SPRITE_WIDTH = 70;
  const SPRITE_HEIGHT = 70;
  const FRAME_COUNT = 13;
  const FRAME_DURATION = 140; // ms

  let sprite = null;
  let frame = 0;
  let frameTime = 0;
  let isNear = false;
  let isVisible = false;

  // Кэшируем DOM-элементы и шаблоны один раз
  let buttonsContainer = null;
  const buttonsHTML = `
    <div class="npc-button npc-talk-btn">Говорить</div>
    <div class="npc-button npc-quests-btn">Лечение</div>
  `;

  const talkLines = [
    "Системы в норме. Жизненные показатели: стабильны.",
    "Я — медицинский дрон серии MedBot-3000. Моя задача — поддерживать выживших в строю.",
    "Не забудь пополнить аптечку. Здесь радиация не щадит даже киборгов.",
    "Ты выглядишь... приемлемо. Для человека.",
  ];

  const healButtonsHTML = `
    <div style="text-align:center;padding:20px">
      <p class="npc-text">Выберите услугу:</p>
      <button class="neon-btn" style="margin:10px;background:#00ff44" data-heal="50" data-cost="100">Лечение +50 HP — 100 баляров</button><br>
      <button class="neon-btn" style="margin:10px;background:#00ffff" data-heal="100" data-cost="250">Полное восстановление — 250 баляров</button><br>
      <button class="neon-btn" style="margin:10px;background:#ff00ff" data-action="cure">Очистка от радиации — 150 баляров</button>
    </div>
  `;

  function initialize(doctorSprite) {
    sprite = doctorSprite;

    // Создаём контейнер кнопок один раз
    buttonsContainer = document.createElement("div");
    buttonsContainer.className = "npc-buttons-container";
    buttonsContainer.innerHTML = buttonsHTML;
    buttonsContainer.style.display = "none";
    document.body.appendChild(buttonsContainer);

    // Делегируем клики — не вешаем по 2 обработчика каждый кадр
    buttonsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".npc-button");
      if (!btn) return;

      if (btn.classList.contains("npc-talk-btn")) openDialog("talk");
      if (btn.classList.contains("npc-quests-btn")) openDialog("heal");
    });
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
        ${
          mode === "talk"
            ? `<p class="npc-text fullscreen">${
                talkLines[Math.floor(Math.random() * talkLines.length)]
              }</p>`
            : healButtonsHTML
        }
      </div>
      <button class="neon-btn close-dialog">Закрыть</button>
    `;

    // Один обработчик на закрытие
    dialog.querySelector(".close-dialog").onclick = () => dialog.remove();

    // Обработка лечения без создания новых функций каждый раз
    if (mode === "heal") {
      dialog.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-heal]");
        if (btn) {
          const hp = +btn.dataset.heal;
          const cost = +btn.dataset.cost;
          healPlayer(hp, cost);
          dialog.remove();
          return;
        }
        if (e.target.closest("[data-action='cure']")) {
          cureRadiation();
          dialog.remove();
        }
      });
    }

    document.body.appendChild(dialog);
  }

  // Глобальные функции (остаются в window для совместимости)
  window.healPlayer = function (hp, cost) {
    if (ws?.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "robotDoctorHeal",
          healAmount: hp,
          cost,
        })
      );
    }
  };

  window.cureRadiation = function () {
    if (ws?.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "robotDoctorCureRadiation",
          cost: 150,
        })
      );
    }
  };

  function update(deltaTime) {
    if (!sprite?.complete) return;

    const me = players.get(myId);
    if (!me || me.worldId !== 0) {
      if (isVisible) {
        isVisible = false;
        buttonsContainer.style.display = "none";
      }
      return;
    }

    // Быстрый расчёт дистанции через квадрат (без Math.hypot и Math.sqrt)
    const dx = me.x + 35 - DOCTOR_X;
    const dy = me.y + 35 - DOCTOR_Y;
    const distSq = dx * dx + dy * dy;
    const nearNow = distSq <= PROXIMITY_SQ;

    // === АНИМАЦИЯ ===
    if (nearNow) {
      if (!isNear) {
        isNear = true;
        frame = 0;
        frameTime = 0;
      }
      // Анимация заморожена — не тратим время на таймер
    } else {
      if (isNear) isNear = false;

      frameTime += deltaTime;
      while (frameTime >= FRAME_DURATION) {
        frameTime -= FRAME_DURATION;
        frame = (frame + 1) % FRAME_COUNT;
      }
    }

    // === КНОПКИ ===
    if (nearNow) {
      if (!isVisible) {
        isVisible = true;
        buttonsContainer.style.display = "flex";
      }

      const camera = window.movementSystem.getCamera();
      const screenX = DOCTOR_X - camera.x + 35;
      const screenY = DOCTOR_Y - camera.y - 60;

      buttonsContainer.style.left = screenX + "px";
      buttonsContainer.style.top = screenY + "px";
    } else if (isVisible) {
      isVisible = false;
      buttonsContainer.style.display = "none";
    }
  }

  function draw() {
    if (!sprite?.complete) return;

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
    2000;
  }

  return {
    initialize,
    update,
    draw,
  };
})();
