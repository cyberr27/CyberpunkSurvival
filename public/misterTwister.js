// misterTwister.js — цифровые табло с перебором и замедлением

const MISTER_TWISTER = {
  x: 500,
  y: 2800,
  width: 70,
  height: 100,
};

const CONFIG = {
  frameCount: 13,
  frameWidth: 70,
  frameHeight: 100,
  animationDuration: 5000,
  pauseDuration: 10000,
  interactionRadiusSq: 4900, // ~70px радиус
};

let sprite = null;
let spriteReady = false;
let animationStart = 0;
let isMenuOpen = false;
let menuElement = null;
let wasInRangeLastFrame = false;

let isSpinning = false;
let balance = 0;
let bonusPoints = 0;
let myBonusPointGiven = false;

function initializeMisterTwister() {
  sprite = new Image();
  sprite.src = "mister_twister.png";

  sprite.onload = () => {
    spriteReady = true;
  };

  animationStart = performance.now();
}

function checkMisterTwisterProximity() {
  if (window.worldSystem.currentWorldId !== 0) {
    if (isMenuOpen) hideTwisterMenu();
    wasInRangeLastFrame = false;
    return;
  }

  const me = players.get(myId);
  if (!me) return;

  const dx = me.x + 35 - (MISTER_TWISTER.x + 35);
  const dy = me.y + 50 - (MISTER_TWISTER.y + 50);

  const nowInRange = dx * dx + dy * dy < CONFIG.interactionRadiusSq;

  if (!nowInRange && !wasInRangeLastFrame) return;

  if (nowInRange && !wasInRangeLastFrame) {
    showTwisterMenu();
  } else if (!nowInRange && wasInRangeLastFrame) {
    hideTwisterMenu();
  }

  wasInRangeLastFrame = nowInRange;
}

function updateLocalBalanceDisplay() {
  if (!isMenuOpen) return;

  const balyarySlot = window.inventory.findIndex(
    (slot) => slot && slot.type === "balyary",
  );
  const count =
    balyarySlot !== -1 ? window.inventory[balyarySlot]?.quantity || 1 : 0;

  const el = document.getElementById("twister-balance");
  if (el) {
    el.textContent = count;
    el.dataset.count = count;
  }
}

function showTwisterMenu() {
  if (isMenuOpen) return;
  isMenuOpen = true;

  menuElement = document.createElement("div");
  menuElement.className = "npc-dialog open twister-full-window";

  menuElement.innerHTML = `
    <div class="npc-dialog-content">
      <p class="npc-text" style="text-align:center; margin: 12px 0;">
        Стоимость спина — <strong>1 баляр</strong><br>
        Баланс: <span id="twister-balance">загружается...</span>
      </p>

      <div class="slot-displays">
        <div class="digital-display" id="display1">?</div>
        <div class="digital-display" id="display2">?</div>
        <div class="digital-display" id="display3">?</div>
      </div>

      <button class="spin-button" id="twister-spin-btn">КРУТИТЬ!</button>

      <p id="twister-result" style="text-align:center; min-height:2.2em; margin-top:16px;"></p>
    </div>

    <div class="bonus-lights" id="bonus-lights">
      ${Array(11).fill('<div class="bonus-light"></div>').join("")}
    </div>
  `;

  document.body.appendChild(menuElement);

  // Перехват обновления инвентаря
  const originalUpdate = window.inventorySystem.updateInventoryDisplay;
  window.inventorySystem.updateInventoryDisplay = function (...args) {
    originalUpdate.apply(this, args);
    if (isMenuOpen) updateLocalBalanceDisplay();
  };

  // Кнопка спина
  const spinBtn = document.getElementById("twister-spin-btn");
  spinBtn.addEventListener("click", () => {
    if (isSpinning) return;

    const currentBalance = Number(
      document.getElementById("twister-balance")?.dataset.count || 0,
    );
    if (currentBalance < 1) {
      document.getElementById("twister-result").textContent =
        "Недостаточно баляров!";
      return;
    }

    isSpinning = true;
    spinBtn.disabled = true;
    document.getElementById("twister-result").textContent = "";

    // Отправляем запрос на сервер
    if (window.ws?.readyState === WebSocket.OPEN) {
      window.ws.send(
        JSON.stringify({
          type: "twister",
          subtype: "spin",
        }),
      );
    }
  });

  // Первичное обновление баланса
  updateLocalBalanceDisplay();
}

function hideTwisterMenu() {
  if (menuElement) {
    menuElement.remove();
    menuElement = null;
  }
  isMenuOpen = false;
  isSpinning = false;
}

function animateDigitalDisplays(finalSymbols) {
  const displays = [
    document.getElementById("display1"),
    document.getElementById("display2"),
    document.getElementById("display3"),
  ];

  if (!displays[0]) return;

  // Разные длительности и задержки остановки для каждого табло
  const timings = [
    { totalDuration: 3200 + Math.random() * 400, stopAfter: 0 },
    { totalDuration: 3600 + Math.random() * 500, stopAfter: 500 },
    { totalDuration: 4100 + Math.random() * 600, stopAfter: 1100 },
  ];

  displays.forEach((el, index) => {
    if (!el) return;

    el.classList.add("running");
    el.textContent = "?";

    let start = performance.now();
    let current = 0;

    const timer = setInterval(() => {
      const elapsed = performance.now() - start;
      const config = timings[index];

      if (elapsed >= config.totalDuration + config.stopAfter) {
        clearInterval(timer);
        el.textContent = finalSymbols[index];
        el.classList.remove("running");
        el.classList.add("stopped");
        return;
      }

      // Плавное замедление (cubic ease-out)
      const progress = Math.min(1, elapsed / config.totalDuration);
      const eased = 1 - Math.pow(1 - progress, 3);

      // Скорость от очень быстрой → почти остановка
      const speed = 18 * (1 - eased) + 1.2;

      current = (current + Math.floor(Math.random() * 4 + speed)) % 10;
      el.textContent = current;
    }, 55); // ~18 fps — достаточно плавно и не нагружает
  });
}

function updateTwisterState(data) {
  if (!isMenuOpen) return;

  if (data.balance !== undefined) {
    balance = data.balance;
    const el = document.getElementById("twister-balance");
    if (el) {
      el.textContent = balance;
      el.dataset.count = balance;
    }
  }

  bonusPoints = Math.min(11, data.bonusPoints ?? 0);
  myBonusPointGiven = data.myBonusPointGiven ?? false;

  const lights = document.querySelectorAll(".bonus-light");
  lights.forEach((el, i) => {
    el.classList.toggle("active", i < bonusPoints);
  });

  const resultEl = document.getElementById("twister-result");
  if (data.result) {
    resultEl.innerHTML = data.result;
    resultEl.style.color = data.won ? "#00ff88" : "#ff6666";
  } else if (data.error) {
    resultEl.textContent = data.error;
    resultEl.style.color = "#ff6666";
  }

  if (data.shouldAnimate && data.symbols?.length === 3) {
    // Запускаем красивую анимацию цифрового перебора
    animateDigitalDisplays(data.symbols.map(String));
  }
}

function handleTwisterMessage(data) {
  switch (data.subtype) {
    case "state":
    case "spinResult":
      updateTwisterState(data);
      if (data.shouldAnimate) {
        // Кнопку возвращаем в активное состояние после завершения анимации
        setTimeout(() => {
          const btn = document.getElementById("twister-spin-btn");
          if (btn) {
            btn.disabled = false;
            isSpinning = false;
          }
        }, 5200); // чуть больше максимальной длительности анимации
      }
      break;

    case "bonusWin":
      showNotification("БОЛЬШОЙ БОНУС! 75 баляров!", "#ffff00", 6000);
      updateTwisterState(data);
      break;

    default:
      updateTwisterState(data);
  }
}

// Отрисовка автомата на карте (без изменений)
function drawMisterTwister() {
  if (window.worldSystem.currentWorldId !== 0) return;
  if (!spriteReady || !sprite?.complete) return;

  const camera = window.movementSystem.getCamera();
  const sx = MISTER_TWISTER.x - camera.x;
  const sy = MISTER_TWISTER.y - camera.y;

  if (
    sx + 90 < 0 ||
    sx > canvas.width + 30 ||
    sy + 130 < 0 ||
    sy > canvas.height + 30
  )
    return;

  const now = performance.now();
  const cycleTime = CONFIG.animationDuration + CONFIG.pauseDuration;
  const t = (now - animationStart) % cycleTime;

  let frame = 0;
  if (t < CONFIG.animationDuration) {
    frame = Math.floor((t * CONFIG.frameCount) / CONFIG.animationDuration);
  }

  ctx.drawImage(
    sprite,
    frame * CONFIG.frameWidth,
    0,
    CONFIG.frameWidth,
    CONFIG.frameHeight,
    sx,
    sy,
    MISTER_TWISTER.width,
    MISTER_TWISTER.height,
  );
}

window.misterTwister = {
  initialize: initializeMisterTwister,
  checkProximity: checkMisterTwisterProximity,
  draw: drawMisterTwister,
  hideMenu: hideTwisterMenu,
  handleMessage: handleTwisterMessage,
  updateState: updateTwisterState,
};
