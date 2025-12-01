// bonfireSystem.js — финальная версия: красиво, быстро, надёжно

window.bonfireSystem = (function () {
  let bonfireImage = null;

  const BONFIRES = [
    { x: 473, y: 3193 },
    { x: 862, y: 108 },
    { x: 3057, y: 510 },
    { x: 1892, y: 3176 },
    { x: 30, y: 1628 },
  ];

  const FRAME = { w: 70, h: 70 };
  const TOTAL_FRAMES = 13;
  const FRAME_DURATION = 110; // чуть быстрее — огонь живее

  // Один таймер на все бочки + смещение фазы
  let globalTime = 0;

  function initialize(sprite) {
    bonfireImage = sprite;

    BONFIRES.forEach((b, i) => {
      const lightId = `bonfire_light_${i}`;
      if (!window.lightsSystem.hasLight(lightId)) {
        window.lightsSystem.addLight({
          id: lightId,
          x: b.x + 35,
          y: b.y + 35,
          color: "rgba(255, 180, 0, 0.28)",
          radius: 135,
          pulseSpeed: 0.0017 + i * 0.0003, // разные скорости
          pulseAmplitude: 28,
          flicker: true,
        });
      }
    });
  }

  function update(deltaTime) {
    if (!bonfireImage) return;
    globalTime += deltaTime;
  }

  function draw() {
    if (!bonfireImage?.complete) return;

    const cam = window.movementSystem.getCamera();
    const { w, h } = FRAME;

    BONFIRES.forEach((b, i) => {
      const screenX = b.x - cam.x;
      const screenY = b.y - cam.y;

      // Жёсткий, но быстрый куллинг
      if (
        screenX < -100 ||
        screenX > canvas.width + 100 ||
        screenY < -100 ||
        screenY > canvas.height + 100
      )
        return;

      // Фаза анимации с индивидуальным смещением (экономим память — не храним 3 таймера)
      const phaseOffset = i * 1234; // магическое число для разной фазы
      const frameIndex =
        Math.floor((globalTime + phaseOffset) / FRAME_DURATION) % TOTAL_FRAMES;

      ctx.drawImage(
        bonfireImage,
        frameIndex * w, // sx
        0, // sy
        w, // sWidth
        h, // sHeight
        Math.round(screenX), // чуть быстрее, чем без round
        Math.round(screenY),
        w,
        h
      );
    });
  }

  return { initialize, update, draw };
})();
