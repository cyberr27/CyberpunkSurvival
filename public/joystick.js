// joystick.js
(function () {
  let isMobile = window.innerWidth < 768 || "ontouchstart" in window; // Простая проверка на мобильные (можно уточнить)
  let joystickContainer, outer, inner;
  let centerX, centerY;
  let dx = 0,
    dy = 0;
  let isActive = false;
  const radius = 60; // Радиус внешнего круга (пиксели)
  const innerRadius = 30; // Радиус внутреннего стика

  function initialize() {
    if (!isMobile) return; // Только для мобильных

    // Создаём DOM-элементы джойстика
    joystickContainer = document.createElement("div");
    joystickContainer.id = "joystickContainer";
    joystickContainer.classList.add("joystick-container");
    document.body.appendChild(joystickContainer);

    outer = document.createElement("div");
    outer.classList.add("joystick-outer");
    joystickContainer.appendChild(outer);

    inner = document.createElement("div");
    inner.classList.add("joystick-inner");
    outer.appendChild(inner);

    // Центр джойстика
    centerX = radius;
    centerY = radius;

    // Обработчики touch
    outer.addEventListener("touchstart", handleTouchStart);
    outer.addEventListener("touchmove", handleTouchMove);
    outer.addEventListener("touchend", handleTouchEnd);
    outer.addEventListener("touchcancel", handleTouchEnd);
  }

  function handleTouchStart(e) {
    e.preventDefault();
    isActive = true;
    handleTouchMove(e); // Немедленный расчёт на старте
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (!isActive) return;

    const touch = e.touches[0];
    const rect = outer.getBoundingClientRect();
    let touchX = touch.clientX - rect.left;
    let touchY = touch.clientY - rect.top;

    // Ограничиваем стик внутри круга
    const dist = Math.sqrt((touchX - centerX) ** 2 + (touchY - centerY) ** 2);
    if (dist > radius) {
      const angle = Math.atan2(touchY - centerY, touchX - centerX);
      touchX = centerX + radius * Math.cos(angle);
      touchY = centerY + radius * Math.sin(angle);
    }

    // Позиционируем inner
    inner.style.left = `${touchX - innerRadius}px`;
    inner.style.top = `${touchY - innerRadius}px`;

    // Расчёт dx/dy (нормализованные от -1 до 1)
    dx = (touchX - centerX) / radius;
    dy = (touchY - centerY) / radius;
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    isActive = false;
    dx = 0;
    dy = 0;

    // Сбрасываем позицию inner в центр
    inner.style.left = `${centerX - innerRadius}px`;
    inner.style.top = `${centerY - innerRadius}px`;
  }

  function getDirection() {
    return { dx, dy };
  }

  window.joystickSystem = {
    initialize,
    getDirection,
    isMobile,
  };
})();
