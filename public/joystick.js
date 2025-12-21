// joystick.js
(function () {
  // Глобальные переменные джойстика
  let joystickContainer;
  let outerCircle;
  let innerCircle;
  let centerX = 0;
  let centerY = 0;
  let maxRadius = 50; // Радиус внешнего круга
  let touchId = null; // Для отслеживания конкретного touch
  let direction = { dx: 0, dy: 0 }; // Текущее направление (нормализованное)
  let isActive = false;

  // Функция инициализации джойстика
  function initializeJoystick() {
    // Проверяем, является ли устройство мобильным (по ширине экрана)
    if (window.innerWidth >= 768) return; // Не показываем на десктопах

    // Создаём контейнер джойстика динамически
    joystickContainer = document.createElement("div");
    joystickContainer.id = "joystickContainer";
    joystickContainer.style.position = "fixed";
    joystickContainer.style.bottom = "20%"; // Нижняя левая позиция
    joystickContainer.style.left = "5%";
    joystickContainer.style.width = "150px";
    joystickContainer.style.height = "150px";
    joystickContainer.style.zIndex = "100"; // Над canvas, но ниже UI
    joystickContainer.style.pointerEvents = "auto"; // Разрешаем события
    joystickContainer.style.opacity = "0.5"; // Полупрозрачный для видимости игры
    document.body.appendChild(joystickContainer);

    // Внешний круг
    outerCircle = document.createElement("div");
    outerCircle.id = "outerCircle";
    outerCircle.style.width = "100px";
    outerCircle.style.height = "100px";
    outerCircle.style.borderRadius = "50%";
    outerCircle.style.background = "rgba(0, 255, 255, 0.3)"; // Неоновый циан
    outerCircle.style.border = "2px solid #00ffff";
    outerCircle.style.position = "absolute";
    outerCircle.style.top = "50%";
    outerCircle.style.left = "50%";
    outerCircle.style.transform = "translate(-50%, -50%)";
    joystickContainer.appendChild(outerCircle);

    // Внутренний круг (джойстик)
    innerCircle = document.createElement("div");
    innerCircle.id = "innerCircle";
    innerCircle.style.width = "50px";
    innerCircle.style.height = "50px";
    innerCircle.style.borderRadius = "50%";
    innerCircle.style.background = "rgba(255, 0, 255, 0.5)"; // Неоновый magenta
    innerCircle.style.border = "2px solid #ff00ff";
    innerCircle.style.position = "absolute";
    innerCircle.style.top = "50%";
    innerCircle.style.left = "50%";
    innerCircle.style.transform = "translate(-50%, -50%)";
    joystickContainer.appendChild(innerCircle);

    // Центр джойстика
    centerX = joystickContainer.offsetLeft + joystickContainer.offsetWidth / 2;
    centerY = joystickContainer.offsetTop + joystickContainer.offsetHeight / 2;

    // Обработчики touch событий
    joystickContainer.addEventListener("touchstart", handleTouchStart);
    joystickContainer.addEventListener("touchmove", handleTouchMove);
    joystickContainer.addEventListener("touchend", handleTouchEnd);
    joystickContainer.addEventListener("touchcancel", handleTouchEnd);
  }

  // Обработчик начала touch
  function handleTouchStart(e) {
    e.preventDefault();
    if (touchId !== null) return; // Уже есть активный touch

    const touch = e.changedTouches[0];
    touchId = touch.identifier;
    updateDirection(touch.clientX, touch.clientY);
  }

  // Обработчик движения touch
  function handleTouchMove(e) {
    e.preventDefault();
    if (touchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchId) {
        updateDirection(touch.clientX, touch.clientY);
        break;
      }
    }
  }

  // Обработчик окончания touch
  function handleTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchId) {
        resetJoystick();
        break;
      }
    }
  }

  // Обновление направления и позиции внутреннего круга
  function updateDirection(clientX, clientY) {
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Ограничиваем расстояние максимальным радиусом
    if (distance > maxRadius) {
      direction.dx = (dx / distance) * maxRadius;
      direction.dy = (dy / distance) * maxRadius;
    } else {
      direction.dx = dx;
      direction.dy = dy;
    }

    // Нормализуем для направления (dx, dy в диапазоне -1..1)
    direction.normDx = direction.dx / maxRadius;
    direction.normDy = direction.dy / maxRadius;

    // Обновляем позицию внутреннего круга
    innerCircle.style.transform = `translate(calc(-50% + ${direction.dx}px), calc(-50% + ${direction.dy}px))`;

    isActive = true;
  }

  // Сброс джойстика
  function resetJoystick() {
    direction = { dx: 0, dy: 0, normDx: 0, normDy: 0 };
    innerCircle.style.transform = "translate(-50%, -50%)";
    touchId = null;
    isActive = false;
  }

  // API: Получение нормализованного направления (для интеграции в movement.js)
  function getDirection() {
    return { dx: direction.normDx || 0, dy: direction.normDy || 0, isActive };
  }

  // Инициализируем джойстик при загрузке
  window.addEventListener("load", initializeJoystick);

  // Экспортируем API для других модулей
  window.joystickSystem = {
    getDirection,
  };
})();
