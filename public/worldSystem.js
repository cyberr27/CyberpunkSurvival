const worldSystem = {
  // Определяем массив миров
  worlds: [
    {
      id: 0,
      width: 3135,
      height: 3300,
      backgroundImage: new Image(),
      vegetationImage: new Image(),
      rocksImage: new Image(),
      cloudsImage: new Image(),
      name: "Пустоши",
    },
    {
      id: 1,
      width: 3135,
      height: 3300,
      backgroundImage: new Image(),
      vegetationImage: new Image(),
      rocksImage: new Image(),
      cloudsImage: new Image(),
      name: "Неоновый Город",
    },
    {
      id: 2,
      width: 3135,
      height: 3300,
      backgroundImage: new Image(),
      vegetationImage: new Image(),
      rocksImage: new Image(),
      cloudsImage: new Image(),
      name: "Токсичные Джунгли",
    },
  ],

  // Текущий мир
  currentWorldId: 0,

  // Зоны перехода
  transitionZones: [],

  // Инициализация системы миров
  initialize() {
    // Устанавливаем пути к изображениям для каждого мира
    this.worlds[0].backgroundImage.src = "backgr.png";
    this.worlds[0].vegetationImage.src = "vegetation.png";
    this.worlds[0].rocksImage.src = "rocks.png";
    this.worlds[0].cloudsImage.src = "clouds.png";

    this.worlds[1].backgroundImage.src = "toxic_jungle_background.png";
    this.worlds[1].vegetationImage.src = "toxic_jungle_vegetation.png";
    this.worlds[1].rocksImage.src = "toxic_jungle_rocks.png";
    this.worlds[1].cloudsImage.src = "toxic_jungle_clouds.png";

    this.worlds[2].backgroundImage.src = "neon_city_background.png";
    this.worlds[2].vegetationImage.src = "neon_city_vegetation.png";
    this.worlds[2].rocksImage.src = "neon_city_rocks.png";
    this.worlds[2].cloudsImage.src = "neon_city_clouds.png";

    // Отслеживаем загрузку изображений
    let imagesLoaded = 0;
    const totalImages = this.worlds.length * 4; // 4 изображения на мир
    const onImageLoad = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        console.log("Все изображения миров загружены");
      }
    };

    this.worlds.forEach((world) => {
      world.backgroundImage.onload = onImageLoad;
      world.vegetationImage.onload = onImageLoad;
      world.rocksImage.onload = onImageLoad;
      world.cloudsImage.onload = onImageLoad;
    });

    // Создаём тестовые зоны перехода
    this.createTransitionZone(1056, 2487, 50, 1, 0); // Переход из мира 0 в мир 1
    this.createTransitionZone(1622, 2719, 50, 0, 1); // Переход из мира 1 в мир 0
    this.createTransitionZone(1906, 3123, 50, 2, 1); // Переход из мира 1 в мир 2
    this.createTransitionZone(2481, 3108, 50, 1, 2); // Переход из мира 2 в мир 1
  },

  // Функция создания зоны перехода
  createTransitionZone(x, y, radius, targetWorldId, sourceWorldId) {
    if (!this.worlds.find((world) => world.id === targetWorldId)) {
      console.error(`Мир с ID ${targetWorldId} не существует`);
      return;
    }
    if (!this.worlds.find((world) => world.id === sourceWorldId)) {
      console.error(`Мир с ID ${sourceWorldId} не существует`);
      return;
    }
    if (radius <= 0) {
      console.error("Радиус зоны должен быть положительным");
      return;
    }
    this.transitionZones.push({
      x,
      y,
      radius,
      targetWorldId,
      sourceWorldId,
    });
    console.log(
      `Создана зона перехода: x=${x}, y=${y}, radius=${radius}, из мира ${sourceWorldId} в мир ${targetWorldId}`
    );
  },

  // Проверка попадания игрока в зону перехода
  checkTransitionZones(playerX, playerY) {
    const me = players.get(myId);
    if (!me) return;

    const currentWorld = this.worlds[this.currentWorldId];
    for (const zone of this.transitionZones) {
      if (zone.sourceWorldId !== this.currentWorldId) continue;
      const dx = playerX - zone.x;
      const dy = playerY - zone.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < zone.radius) {
        // Отправляем серверу сообщение о переходе
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "worldTransition",
            targetWorldId: zone.targetWorldId,
            x: playerX,
            y: playerY,
          })
        );
        break;
      }
    }
  },

  // Переключение мира
  switchWorld(targetWorldId, player, newX, newY) {
    if (targetWorldId === this.currentWorldId) return;
    if (!this.worlds.find((world) => world.id === targetWorldId)) {
      console.error(`Попытка перейти в несуществующий мир ${targetWorldId}`);
      return;
    }

    // Сохраняем текущие координаты игрока
    const prevWorld = this.worlds[this.currentWorldId];
    player.prevWorldX = player.x;
    player.prevWorldY = player.y;
    player.prevWorldId = this.currentWorldId;

    // Переключаем мир
    this.currentWorldId = targetWorldId;
    const newWorld = this.worlds[targetWorldId];

    // Устанавливаем координаты
    if (newX !== undefined && newY !== undefined) {
      player.x = newX;
      player.y = newY;
    } else if (
      player.worldPositions &&
      player.worldPositions[targetWorldId] &&
      player.worldPositions[targetWorldId].x !== undefined &&
      player.worldPositions[targetWorldId].y !== undefined
    ) {
      player.x = player.worldPositions[targetWorldId].x;
      player.y = player.worldPositions[targetWorldId].y;
    } else {
      player.x = newWorld.width / 2;
      player.y = newWorld.height / 2;
    }

    // Сохраняем координаты
    if (!player.worldPositions) player.worldPositions = {};
    player.worldPositions[targetWorldId] = { x: player.x, y: player.y };

    // Обновляем worldId игрока
    player.worldId = targetWorldId;

    // Очищаем игроков из других миров, сохраняя текущего
    const currentPlayer = players.get(myId);
    if (currentPlayer) {
      players.clear();
      players.set(myId, { ...currentPlayer, ...player });
      console.log(
        `Очищен список players, сохранён игрок ${myId} в мире ${targetWorldId}`
      );
    } else {
      console.warn(`Игрок ${myId} не найден в players перед очисткой`);
    }

    // Запрашиваем синхронизацию игроков
    this.syncPlayers();

    // Эффект перехода
    this.showTransitionEffect();

    console.log(
      `Игрок ${player.id} перешёл в мир ${newWorld.name} (ID: ${targetWorldId}) на координаты x=${player.x}, y=${player.y}`
    );
  },

  syncPlayers() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "syncPlayers",
          worldId: this.currentWorldId,
        })
      );
      console.log(
        `Отправлен запрос syncPlayers для мира ${this.currentWorldId}`
      );
    } else {
      console.error("WebSocket не готов для отправки syncPlayers");
    }
  },

  // Получение текущего мира
  getCurrentWorld() {
    return this.worlds[this.currentWorldId];
  },

  // Эффект перехода между мирами
  showTransitionEffect() {
    const transitionOverlay = document.createElement("div");
    transitionOverlay.style.position = "fixed";
    transitionOverlay.style.top = "0";
    transitionOverlay.style.left = "0";
    transitionOverlay.style.width = "100%";
    transitionOverlay.style.height = "100%";
    transitionOverlay.style.background = "rgba(0, 0, 0, 0)";
    transitionOverlay.style.zIndex = "1000";
    transitionOverlay.style.transition = "background 1s";
    document.body.appendChild(transitionOverlay);

    // Затемнение
    setTimeout(() => {
      transitionOverlay.style.background = "rgba(0, 0, 0, 1)";
    }, 0);

    // Плавное осветление
    setTimeout(() => {
      transitionOverlay.style.background = "rgba(0, 0, 0, 0)";
    }, 1000);

    // Удаляем оверлей
    setTimeout(() => {
      document.body.removeChild(transitionOverlay);
    }, 2000);
  },

  // Отрисовка зон перехода (для визуальной отладки)
  drawTransitionZones() {
    if (!window.movementSystem || !window.movementSystem.getCamera) {
      console.error("movementSystem или getCamera не определены");
      return;
    }
    const camera = window.movementSystem.getCamera();
    this.transitionZones.forEach((zone) => {
      if (zone.sourceWorldId !== this.currentWorldId) return;
      const screenX = zone.x - camera.x;
      const screenY = zone.y - camera.y;
      if (
        screenX + zone.radius > 0 &&
        screenX - zone.radius < canvas.width &&
        screenY + zone.radius > 0 &&
        screenY - zone.radius < canvas.height
      ) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, zone.radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
        ctx.fill();
      }
    });
  },
};

// Экспортируем систему миров
window.worldSystem = worldSystem;
