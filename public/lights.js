// lights.js — обновлённая версия с поддержкой динамических огней (бочка и т.д.)

let lights = []; // Глобальный массив источников света

// Инициализация статичных огней Неонового Города
function initializeLights() {
  lights.length = 0;

  if (window.worldSystem.currentWorldId !== 0) {
    return; // Только в мире 0 (Неоновый Город)
  }

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
      color: "rgba(240, 109, 240,0.4)",
      radius: 850,
      baseRadius: 850,
      pulseSpeed: 0.001,
    },
  ];

  lights.push(...neonCityLights);
}

// Отрисовка всех огней
function drawLights(deltaTime) {
  // Рисуем ВСЕ огни, даже если не в мире 0 — потому что бочка может быть везде может
  // (но если хочешь — оставь проверку, просто убери её, чтобы бочка светила)

  lights.forEach((light) => {
    // Пульсация
    const pulse =
      Math.sin(Date.now() * (light.pulseSpeed || 0.001)) *
      (light.pulseAmplitude || 50);
    const currentRadius = (light.baseRadius || light.radius) + pulse;

    // Мерцание (flicker)
    let alpha = parseFloat(light.color.split(",")[3] || 0.4);
    if (light.flicker) {
      alpha += (Math.random() - 0.5) * 0.15;
      alpha = Math.max(0.2, Math.min(0.1, alpha));
    }

    const screenX = light.x - window.movementSystem.getCamera().x;
    const screenY = light.y - window.movementSystem.getCamera().y;

    if (
      screenX + currentRadius > -100 &&
      screenX - currentRadius < canvas.width + 100 &&
      screenY + currentRadius > -100 &&
      screenY - currentRadius < canvas.height + 100
    ) {
      const gradient = ctx.createRadialGradient(
        screenX,
        screenY,
        0,
        screenX,
        screenY,
        currentRadius
      );
      const colorWithAlpha = light.color.replace(/[\d\.]+\)$/, `${alpha})`);
      gradient.addColorStop(0, colorWithAlpha);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, currentRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// === НОВЫЕ МЕТОДЫ ДЛЯ ДИНАМИЧЕСКИХ ОГНЕЙ (бочка, факелы и т.д.) ===

function addLight(lightData) {
  // Удаляем старый, если уже был с таким id
  lights = lights.filter((l) => l.id !== lightData.id);
  lights.push({
    ...lightData,
    baseRadius: lightData.radius,
    pulseAmplitude: lightData.pulseAmplitude || 0,
    pulseSpeed: lightData.pulseSpeed || 0.001,
    flicker: lightData.flicker || false,
  });
}

function hasLight(id) {
  return lights.some((light) => light.id === id);
}

function updateLightPosition(id, x, y) {
  const light = lights.find((l) => l.id === id);
  if (light) {
    light.x = x;
    light.y = y;
  }
}

function removeLight(id) {
  lights = lights.filter((l) => l.id !== id);
}

// Сброс при смене мира
function resetLights(worldId) {
  // Удаляем только динамические огни (у которых есть id)
  lights = lights.filter((l) => !l.id);
  if (worldId === 0) {
    initializeLights();
  }
}

// Экспорт
window.lightsSystem = {
  initialize: initializeLights,
  draw: drawLights,
  reset: resetLights,
  addLight,
  hasLight,
  updateLightPosition,
  removeLight,
};
