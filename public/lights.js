let lights = []; // Глобальный массив источников света

// Инициализация источников света
function initializeLights() {
  lights.length = 0; // Очищаем массив перед инициализацией

  if (window.worldSystem.currentWorldId !== 0) {
    console.log(`Свет отключён для мира ${window.worldSystem.currentWorldId}`);
    return; // Инициализируем только в "Неоновом Городе"
  }

  // Список источников света для "Неонового Города"
  const neonCityLights = [
    {
      x: 2445,
      y: 1540,
      color: "rgba(0, 255, 255, 0.4)",
      radius: 1000,
      baseRadius: 1000,
      pulseSpeed: 0.001,
    },
    {
      x: 1314,
      y: 332,
      color: "rgba(255, 0, 255, 0.4)",
      radius: 1000,
      baseRadius: 1000,
      pulseSpeed: 0.0012,
    },
    {
      x: 506,
      y: 2246,
      color: "rgba(148, 0, 211, 0.4)",
      radius: 1000,
      baseRadius: 1000,
      pulseSpeed: 0.0008,
    },
    {
      x: 950,
      y: 3115,
      color: "rgba(255, 0, 255, 0.4)",
      radius: 850,
      baseRadius: 850,
      pulseSpeed: 0.001,
    },
    {
      x: 50,
      y: 3120,
      color: "rgba(214, 211, 4, 0.5)",
      radius: 850,
      baseRadius: 850,
      pulseSpeed: 0.0011,
    },
    {
      x: 264,
      y: 1173,
      color: "rgba(214, 211, 4, 0.4)",
      radius: 950,
      baseRadius: 950,
      pulseSpeed: 0.0009,
    },
    {
      x: 2314,
      y: 2756,
      color: "rgba(194, 0, 10, 0.4)",
      radius: 850,
      baseRadius: 850,
      pulseSpeed: 0.001,
    },
    {
      x: 1605,
      y: 2151,
      color: "rgba(2, 35, 250, 0.4)",
      radius: 950,
      baseRadius: 950,
      pulseSpeed: 0.0012,
    },
    {
      x: 3095,
      y: 2335,
      color: "rgba(28, 186, 55, 0.4)",
      radius: 950,
      baseRadius: 950,
      pulseSpeed: 0.0008,
    },
    {
      x: 2605,
      y: 509,
      color: "rgba(2, 35, 250, 0.4)",
      radius: 950,
      baseRadius: 950,
      pulseSpeed: 0.001,
    },
    {
      x: 1083,
      y: 1426,
      color: "rgba(109, 240, 194, 0.4)",
      radius: 750,
      baseRadius: 750,
      pulseSpeed: 0.0011,
    },
    {
      x: 2000,
      y: 900,
      color: "rgba(240, 109, 240, 0.4)",
      radius: 850,
      baseRadius: 850,
      pulseSpeed: 0.0009,
    },
    {
      x: 133,
      y: 373,
      color: "rgba(240, 109, 240, 0.4)",
      radius: 850,
      baseRadius: 850,
      pulseSpeed: 0.001,
    },
  ];

  lights.push(...neonCityLights);
  console.log(
    `Инициализировано ${lights.length} источников света в Неоновом Городе`
  );
}

// Отрисовка источников света с анимацией пульсации
function drawLights(deltaTime) {
  if (window.worldSystem.currentWorldId !== 0) return; // Отрисовываем только в "Неоновом Городе"

  lights.forEach((light) => {
    // Анимация пульсации радиуса
    light.radius =
      light.baseRadius + Math.sin(Date.now() * light.pulseSpeed) * 50; // Радиус колеблется ±50

    const screenX = light.x - window.movementSystem.getCamera().x;
    const screenY = light.y - window.movementSystem.getCamera().y;
    if (
      screenX + light.radius > 0 &&
      screenX - light.radius < canvas.width &&
      screenY + light.radius > 0 &&
      screenY - light.radius < canvas.height
    ) {
      const gradient = ctx.createRadialGradient(
        screenX,
        screenY,
        0,
        screenX,
        screenY,
        light.radius
      );
      gradient.addColorStop(0, light.color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, light.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// Сброс и реинициализация света при смене мира
function resetLights(worldId) {
  lights.length = 0; // Очищаем массив света
  if (worldId === 0) {
    initializeLights(); // Инициализируем только для "Неонового Города"
  } else {
    console.log(`Свет очищен для мира ${worldId}`);
  }
}

// Экспортируем функции
window.lightsSystem = {
  initialize: initializeLights,
  draw: drawLights,
  reset: resetLights,
};
