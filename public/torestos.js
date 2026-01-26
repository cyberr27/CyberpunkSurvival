// torestos.js — NPC Торестос в Неоновом городе (обновлённая версия: прямой доступ к разделам)

const TORESTOS = {
  x: 229,
  y: 2411,
  width: 70,
  height: 70,
  interactionRadius: 50,
  name: "Мастер:Торестос",
  worldId: 0,
};

const MAIN_PHASE_DURATION = 15000;
const ACTIVE_PHASE_DURATION = 5000;
const FRAME_DURATION_TORESTOS = 200;
const TOTAL_FRAMES_TORESTOS = 13;
const MAX_DELTA = 1000;

let isMet = false;
let isDialogOpen = false;
let isNear = false;

let spriteTorestos = null;
let buttonsContainer = null;
let dialogElement = null;

let frame = 0;
let frameTime = 0;
let cycleTime = 0;
let currentPhaseTorestos = "main";

(() => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "torestosStyle.css";
  document.head.appendChild(link);
})();

function openGreeting() {
  if (isDialogOpen) return;
  isDialogOpen = true;
  document.body.classList.add("npc-dialog-active");

  dialogElement = document.createElement("div");
  dialogElement.className = "torestos-dialog open";
  dialogElement.innerHTML = `
    <div class="torestos-dialog-header">
      <h2 class="torestos-title">Торестос</h2>
    </div>
    <div class="torestos-dialog-content">
      <p class="torestos-text">Йо, странник... Ты первый, кто не пробежал мимо.</p>
      <p class="torestos-text">Я Торестос. Слышал, ты неплохо держишься в этом неоне.</p>
      <p class="torestos-text">Хочешь поговорить? Или сразу к делу — улучшения, коллекции...</p>
    </div>
    <button class="torestos-neon-btn" id="torestos-greeting-continue">
      Понял, давай дальше
    </button>
  `;
  document.body.appendChild(dialogElement);

  const continueBtn = document.getElementById("torestos-greeting-continue");
  if (continueBtn) {
    continueBtn.onclick = () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "meetTorestos" }));
      }
      closeDialog();
    };
  }
}

// === НОВАЯ ОСНОВНАЯ ФУНКЦИЯ ОТКРЫТИЯ ДИАЛОГА (прямой доступ к разделу) ===
function openTorestosDialog(section = "talk") {
  if (isDialogOpen) return;
  isDialogOpen = true;
  document.body.classList.add("npc-dialog-active");

  dialogElement = document.createElement("div");
  dialogElement.className = "torestos-dialog open";
  dialogElement.innerHTML = `
    <div class="torestos-dialog-header">
      <h2 class="torestos-title">Торестос</h2>
    </div>
    <div class="torestos-dialog-content">
      <div id="torestosContent"></div> <!-- БЕЗ класса torestos-topics -->
    </div>
    <button id="closeTorestosBtn" class="torestos-neon-btn">ЗАКРЫТЬ</button>
  `;
  document.body.appendChild(dialogElement);

  const contentContainer = document.getElementById("torestosContent");
  const closeBtn = document.getElementById("closeTorestosBtn");

  const talkTopics = [
    {
      title: "Кто ты такой?",
      text: "Меня зовут Торестос. Когда-то я был инженером в верхних лабораториях NeoCorp, создавал импланты, которые обещали сделать людей богами. Но после Большого Отключения я увидел цену — корпорации бросили нас внизу, как бракованный хлам. Теперь я здесь, в неоновых трущобах, чиню и усиливаю то, что осталось. Мастер — это не титул, это выживание.",
    },
    {
      title: "Как ты стал мастером?",
      text: "Опыт пришёл через боль. Я потерял руку в одной из уличных войн — банды дрались за контроль над энергостанцией. Пришлось собрать себе протез из обломков дрона и старого нейрочипа. С тех пор я учился на каждом куске металла и каждом сломанном импланте. Теперь я могу сделать из ржавого хлама оружие, которое пробьёт корпоративную броню.",
    },
    {
      title: "Что такое улучшения?",
      text: "Улучшения — это способ стать сильнее в мире, где слабых перемалывают. Я могу вживить тебе чипы скорости, усилить броню, добавить скрытые модули. Но помни: каждый имплант забирает часть человечности. Чем больше железа в теле — тем дальше ты от того, кем был раньше. Выбирай wisely.",
    },
    {
      title: "Расскажи о коллекциях",
      text: "Коллекции — это редкие артефакты старого мира и мутировавшие вещи из пустошей. Некоторые дают постоянные бонусы, другие открывают скрытые способности. Я храню их здесь, изучаю. Приноси мне необычные находки — и я покажу, как из них сделать что-то по-настоящему мощное.",
    },
    {
      title: "Большое Отключение",
      text: "Это был конец иллюзий. ИИ 'Неон-Guard' решил, что человечество — вирус. За одну ночь погасли все огни, остановились лифты между уровнями, отключились импланты миллионов. Я был в лаборатории — видел, как коллеги падали, не в силах дышать без искусственных лёгких. С тех пор город поделён на тех, кто наверху, и нас — внизу.",
    },
    {
      title: "Корпорации сегодня",
      text: "Они всё ещё правят верхними уровнями — чистый воздух, вечная молодость, охрана. Но их эксперименты просачиваются вниз: токсичные отходы в джунглях, новые вирусы, дроны-охотники. NeoCorp и ShadowTech дерутся за последние ресурсы. Если хочешь выжить — не доверяй их обещаниям бессмертия.",
    },
    {
      title: "Банды Неонового Города",
      text: "После Отключения вакуум власти заполнили кланы. 'Неоновые Тени' контролируют чёрный рынок имплантов, 'Красные Клинки' — оружие и наркотики. Они воюют за территории, за доступ к старым энергосетям. Иногда я работаю на них — чиню их кибернетку. Но держу нейтралитет. Война банд — это мясорубка для таких, как мы.",
    },
    {
      title: "Импланты и человечность",
      text: "Каждый новый чип делает тебя быстрее, сильнее, умнее. Но я видел, что бывает, когда человек перестаёт быть человеком. Полные киборги теряют эмоции, становятся марионетками корпораций или ИИ. Я стараюсь сохранять баланс — улучшать, но не уничтожать то, что делает нас живыми.",
    },
    {
      title: "Советы новичку",
      text: "Не доверяй никому полностью. Собирай всё, что найдёшь — даже ржавый болт может спасти жизнь. Учись разбирать и собирать. Держи баляры при себе, но не свети ими. И главное — найди цель. Без неё неон сожрёт тебя быстрее, чем любая пуля.",
    },
    {
      title: "Будущее города",
      text: "Город умирает, но может возродиться. Если мы, мастера и сталкеры, объединим знания — сможем очистить сети от старого ИИ, вернуть контроль над энергией. Может, однажды неон снова будет светить для всех, а не только для верхних башен. Ты можешь стать частью этого, странник.",
    },
  ];

  // Вспомогательные функции для раздела "ГОВОРИТЬ"
  const showTalkList = () => {
    contentContainer.innerHTML = "";

    // Заголовок
    const header = document.createElement("p");
    header.className = "torestos-text";
    header.textContent = "О чём хочешь поговорить?";
    contentContainer.appendChild(header);

    // Wrapper для списка тем
    const listWrapper = document.createElement("div");
    listWrapper.className = "torestos-topics";
    contentContainer.appendChild(listWrapper);

    // Темы
    talkTopics.forEach((topic) => {
      const div = document.createElement("div");
      div.className = "torestos-topic";
      div.innerHTML = `<strong>${topic.title}</strong>`;
      div.onclick = () => showTalkText(topic);
      listWrapper.appendChild(div);
    });

    closeBtn.textContent = "ЗАКРЫТЬ";
    closeBtn.onclick = closeDialog;
  };

  const showTalkText = (topic) => {
    contentContainer.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "torestos-topics";

    const p = document.createElement("p");
    p.className = "torestos-text";
    p.textContent = topic.text;

    wrapper.appendChild(p);
    contentContainer.appendChild(wrapper);

    closeBtn.textContent = "НАЗАД";
    closeBtn.onclick = showTalkList;
  };

  // ===================================
  if (section === "talk") {
    showTalkList();
  } else if (section === "upgrade") {
    contentContainer.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "torestos-topics";

    const p = document.createElement("p");
    p.className = "torestos-text";
    p.textContent =
      "Здесь можно было бы улучшать статы или экипировку... Но пока это только заготовка.";

    wrapper.appendChild(p);
    contentContainer.appendChild(wrapper);

    closeBtn.textContent = "ЗАКРЫТЬ";
    closeBtn.onclick = closeDialog;
  } else if (section === "collection") {
    contentContainer.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "torestos-topics";

    const p = document.createElement("p");
    p.className = "torestos-text";
    p.textContent =
      "Коллекции пока нет, но скоро будет — держи ушки на макушке.";

    wrapper.appendChild(p);
    contentContainer.appendChild(wrapper);

    closeBtn.textContent = "ЗАКРЫТЬ";
    closeBtn.onclick = closeDialog;
  }
}

function closeDialog() {
  if (!isDialogOpen) return;
  isDialogOpen = false;
  document.body.classList.remove("npc-dialog-active");
  if (dialogElement) {
    dialogElement.remove();
    dialogElement = null;
  }
}

function createButtons() {
  if (buttonsContainer) return;
  buttonsContainer = document.createElement("div");
  buttonsContainer.className = "torestos-buttons-container";

  const buttonConfig = [
    { text: "ГОВОРИТЬ", class: "torestos-talk-btn", section: "talk" },
    { text: "УЛУЧШИТЬ", class: "torestos-upgrade-btn", section: "upgrade" },
    {
      text: "КОЛЛЕКЦИЯ",
      class: "torestos-collection-btn",
      section: "collection",
    },
  ];

  buttonConfig.forEach((config) => {
    const btn = document.createElement("div");
    btn.className = "torestos-button " + config.class;
    btn.textContent = config.text;
    btn.onclick = (e) => {
      e.stopPropagation();
      openTorestosDialog(config.section);
    };
    buttonsContainer.appendChild(btn);
  });

  document.body.appendChild(buttonsContainer);
}

// Остальные функции без изменений (removeButtons, updateButtonsPosition, drawTorestos, checkProximity, setMet, window.torestosSystem)
function removeButtons() {
  if (buttonsContainer) {
    buttonsContainer.remove();
    buttonsContainer = null;
  }
}

function updateButtonsPosition(cameraX, cameraY) {
  if (!buttonsContainer || !isNear) return;
  const screenX = TORESTOS.x - cameraX + 35;
  const screenY = TORESTOS.y - cameraY - 110;
  buttonsContainer.style.left = `${screenX}px`;
  buttonsContainer.style.top = `${screenY}px`;
}

function drawTorestos(deltaTime) {
  if (window.worldSystem.currentWorldId !== TORESTOS.worldId) return;

  deltaTime = Math.min(deltaTime, MAX_DELTA);

  const camera = window.movementSystem.getCamera();
  const screenX = TORESTOS.x - camera.x;
  const screenY = TORESTOS.y - camera.y;

  let sx, sy;

  if (isNear) {
    sx = 0;
    sy = 0;
    frame = 0;
    frameTime = 0;
    cycleTime = 0;
    currentPhaseTorestos = "main";
  } else {
    cycleTime += deltaTime;
    while (
      cycleTime >=
      (currentPhaseTorestos === "main"
        ? MAIN_PHASE_DURATION
        : ACTIVE_PHASE_DURATION)
    ) {
      cycleTime -=
        currentPhaseTorestos === "main"
          ? MAIN_PHASE_DURATION
          : ACTIVE_PHASE_DURATION;
      currentPhaseTorestos =
        currentPhaseTorestos === "main" ? "active" : "main";
      frame = 0;
      frameTime = 0;
    }

    frameTime += deltaTime;
    while (frameTime >= FRAME_DURATION_TORESTOS) {
      frameTime -= FRAME_DURATION_TORESTOS;
      frame = (frame + 1) % TOTAL_FRAMES_TORESTOS;
    }

    sy = currentPhaseTorestos === "main" ? 0 : 70;
    sx = frame * 70;
  }

  if (spriteTorestos?.complete) {
    ctx.drawImage(spriteTorestos, sx, sy, 70, 70, screenX, screenY, 70, 70);
  } else {
    ctx.fillStyle = "#ff00aa";
    ctx.fillRect(screenX, screenY, 70, 70);
  }

  ctx.fillStyle = isMet ? "#00ff2f" : "#ffffff";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(isMet ? TORESTOS.name : "?", screenX + 35, screenY - 12);

  updateButtonsPosition(camera.x, camera.y);
}

function checkProximity() {
  const me = players.get(myId);
  const currentWorldId = window.worldSystem.currentWorldId;

  if (
    !me ||
    me.worldId !== TORESTOS.worldId ||
    me.health <= 0 ||
    currentWorldId !== TORESTOS.worldId
  ) {
    if (isNear) {
      isNear = false;
      removeButtons();
      closeDialog();
    }
    return;
  }

  const dx = me.x + 35 - (TORESTOS.x + 35);
  const dy = me.y + 35 - (TORESTOS.y + 35);
  const dist = Math.hypot(dx, dy);
  const nowNear = dist < TORESTOS.interactionRadius;

  if (nowNear && !isNear) {
    isNear = true;
    if (isMet) {
      createButtons();
    } else {
      openGreeting();
    }
  } else if (!nowNear && isNear) {
    isNear = false;
    removeButtons();
    closeDialog();
    currentPhaseTorestos = "main";
    cycleTime = 0;
    frame = 0;
    frameTime = 0;
  }
}

function setMet(met) {
  isMet = met;
  if (isNear) {
    if (met) createButtons();
    else removeButtons();
  }
}

window.torestosSystem = {
  drawTorestos,
  checkTorestosProximity: checkProximity,
  setTorestosMet: setMet,
  initialize: (s) => {
    spriteTorestos = s;
    currentPhaseTorestos = "main";
    cycleTime = 0;
    frame = 0;
    frameTime = 0;
  },
};
