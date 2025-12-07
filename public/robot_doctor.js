// robot_doctor.js — НОВАЯ ВЕРСИЯ 2025 (умный доктор)
window.robotDoctorSystem = (function () {
  const DOCTOR_X = 2673;
  const DOCTOR_Y = 2296;
  const PROXIMITY = 50;
  const SPRITE_W = 70;
  const SPRITE_H = 70;
  const FRAME_COUNT = 13;
  const FRAME_MS = 140;

  let sprite = null;
  let frame = 0;
  let frameTime = 0;
  let isNear = false;

  let buttonsContainer = null;
  let currentDialog = null;

  function initialize(doctorSprite) {
    sprite = doctorSprite;
    createButtons();
  }

  function createButtons() {
    if (buttonsContainer) return;

    buttonsContainer = document.createElement("div");
    buttonsContainer.className = "npc-buttons-container";
    buttonsContainer.style.display = "none";

    const buttons = [
      { text: "Говорить", class: "npc-talk-btn", mode: "talk" },
      { text: "Лечение", class: "npc-quests-btn", mode: "heal" },
      { text: "Задания", class: "npc-quest-btn", mode: "quest" },
    ];

    buttons.forEach((btn) => {
      const el = document.createElement("div");
      el.className = `npc-button ${btn.class}`;
      el.textContent = btn.text;
      el.onclick = () => openDialog(btn.mode);
      buttonsContainer.appendChild(el);
    });

    document.body.appendChild(buttonsContainer);
  }

  function openDialog(mode) {
    closeDialog();

    currentDialog = document.createElement("div");
    currentDialog.className = "npc-dialog";

    const content =
      mode === "talk"
        ? getTalkText()
        : mode === "heal"
        ? getHealOptions()
        : getQuestContent();

    currentDialog.innerHTML = `
      <div class="npc-dialog-header">
        <img src="robot_doctor_photo.png" class="npc-photo" alt="Робот-Доктор">
        <h2 class="npc-title">Робот-Доктор v3.7</h2>
      </div>
      <div class="npc-dialog-content">${content}</div>
      <button class="neon-btn close-dialog">Закрыть</button>
    `;

    document.body.appendChild(currentDialog);
    currentDialog
      .querySelector(".close-dialog")
      .addEventListener("click", closeDialog);
  }

  function closeDialog() {
    if (currentDialog) {
      currentDialog.remove();
      currentDialog = null;
    }
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
    const me = players.get(myId);
    if (!me) return "<p>Ошибка: данные игрока недоступны</p>";

    const isBeginner = me.level <= 5;
    const missingHP = me.maxStats.health - me.health;
    const fullHealCost = Math.floor(missingHP / 20);

    return `
      <div style="text-align:center;padding:20px;line-height:1.8">
        <p class="npc-text" style="margin-bottom:20px"><strong>Выберите услугу:</strong></p>
        
        ${
          isBeginner
            ? `
          <button class="neon-btn" style="margin:10px;background:#00ff44;font-size:16px;padding:12px 20px" 
                  onclick="window.robotDoctorHealBeginner()">
            Осмотр для новичков (бесплатно до 5 уровня)
          </button><br>
        `
            : ""
        }

        <button class="neon-btn" style="margin:10px;background:#00ffff" 
                onclick="window.robotDoctorHeal20()">
          Восстановить +20 HP — 1 баляр
        </button><br>

        <button class="neon-btn" style="margin:10px;background:#ff00ff" 
                ${missingHP <= 0 ? "disabled" : ""}
                onclick="window.robotDoctorFullHeal(${fullHealCost})">
          Полное восстановление — ${fullHealCost} баляр(ов)
        </button>
      </div>
    `;
  }

  function getQuestContent() {
    const me = players.get(myId);
    const hasCert = me?.medicalCertificate;

    if (hasCert) {
      return `
        <div style="text-align:center;padding:20px">
          <h3 style="color:#00ff44;margin-bottom:15px">Получение мед. справки</h3>
          <p class="npc-text fullscreen">Справка формы МД-07 уже выдана. Повторная выдача не предусмотрена протоколом.</p>
        </div>`;
    }

    return `
      <div style="text-align:center;padding:20px">
        <h3 style="color:#00ffff;margin-bottom:15px">Получение мед. справки</h3>
        <p class="npc-text fullscreen" style="margin:20px 0">
          «Органические ткани в пределах нормы для постапокалиптического выжившего.<br>
          Мутаций не обнаружено. Зомби-вирус отсутствует.<br>
          Готов выдать официальную справку формы МД-07.»
        </p>
        <button class="neon-btn" style="background:#00ff44;padding:12px 24px;font-size:18px" 
                onclick="window.completeDoctorQuest()">Получить справку</button>
      </div>`;
  }

  // === Глобальные функции для кнопок ===
  window.robotDoctorHealBeginner = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      sendWhenReady(ws, JSON.stringify({ type: "robotDoctorHealBeginner" }));
    }
    closeDialog();
  };

  window.robotDoctorHeal20 = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      sendWhenReady(ws, JSON.stringify({ type: "robotDoctorHeal20" }));
    }
    closeDialog();
  };

  window.robotDoctorFullHeal = (cost) => {
    if (cost <= 0) return;
    if (ws?.readyState === WebSocket.OPEN) {
      sendWhenReady(ws, JSON.stringify({ type: "robotDoctorFullHeal" }));
    }
    closeDialog();
  };

  function update(deltaTime) {
    if (!sprite?.complete) return;

    const me = players.get(myId);
    if (!me || me.worldId !== 0) {
      buttonsContainer.style.display = "none";
      isNear = false;
      return;
    }

    const dx = me.x + 35 - DOCTOR_X;
    const dy = me.y + 35 - DOCTOR_Y;
    const dist = Math.hypot(dx, dy);
    const near = dist <= PROXIMITY;

    if (near) {
      if (!isNear) {
        frame = 0;
        frameTime = 0;
      }
      isNear = true;
    } else {
      if (isNear) isNear = false;
      frameTime += deltaTime;
      while (frameTime >= FRAME_MS) {
        frameTime -= FRAME_MS;
        frame = (frame + 1) % FRAME_COUNT;
      }
    }

    if (near) {
      buttonsContainer.style.display = "flex";
      const cam = window.movementSystem.getCamera();
      const sx = DOCTOR_X - cam.x + 35;
      const sy = DOCTOR_Y - cam.y - 60;
      buttonsContainer.style.left = sx + "px";
      buttonsContainer.style.top = sy + "px";
    } else {
      buttonsContainer.style.display = "none";
    }
  }

  function draw() {
    if (!sprite?.complete) return;
    const me = players.get(myId);
    if (!me || me.worldId !== 0) return;

    const cam = window.movementSystem.getCamera();
    const sx = DOCTOR_X - cam.x;
    const sy = DOCTOR_Y - cam.y;

    ctx.drawImage(
      sprite,
      frame * SPRITE_W,
      0,
      SPRITE_W,
      SPRITE_H,
      sx,
      sy,
      SPRITE_W,
      SPRITE_H
    );
  }

  return { initialize, update, draw };
})();
