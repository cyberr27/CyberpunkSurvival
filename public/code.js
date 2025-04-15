// Загрузка изображений
const backgroundImage = new Image();
backgroundImage.src = "backgr.png";
const vegetationImage = new Image();
vegetationImage.src = "vegetation.png";
const rocksImage = new Image();
rocksImage.src = "rocks.png";
const cloudsImage = new Image();
cloudsImage.src = "clouds.png";
const playerSprite = new Image();
playerSprite.src = "playerSprite.png";
const wolfSprite = new Image();
wolfSprite.src = "wolfSprite.png";
const energyDrinkImage = new Image();
energyDrinkImage.src = "energy_drink.png";
const nutImage = new Image();
nutImage.src = "nut.png";
const waterBottleImage = new Image();
waterBottleImage.src = "water_bottle.png";
const cannedMeatImage = new Image();
cannedMeatImage.src = "canned_meat.png";
const mushroomImage = new Image();
mushroomImage.src = "mushroom.png";
const sausageImage = new Image();
sausageImage.src = "sausage.png";
const bloodPackImage = new Image();
bloodPackImage.src = "blood_pack.png";
const breadImage = new Image();
breadImage.src = "bread.png";
const vodkaBottleImage = new Image();
vodkaBottleImage.src = "vodka_bottle.png";
const meatChunkImage = new Image();
meatChunkImage.src = "meat_chunk.png";
const bloodSyringeImage = new Image();
bloodSyringeImage.src = "blood_syringe.png";
const milkImage = new Image();
milkImage.src = "milk.png";
const condensedMilkImage = new Image();
condensedMilkImage.src = "condensed_milk.png";
const driedFishImage = new Image();
driedFishImage.src = "dried_fish.png";
const balyaryImage = new Image();
balyaryImage.src = "balyary.png";
const appleImage = new Image();
appleImage.src = "apple.png";
const berriesImage = new Image();
berriesImage.src = "berry.png";
const carrotImage = new Image();
carrotImage.src = "carrot.png";

// Добавляем зависимость от inventoryModule
function startGame() {
  updateOnlineCount();

  // Инициализируем инвентарь и торговлю
  inventoryModule.initializeInventory(ws, myId, players);

  // Обработчик клавиш
  document.addEventListener("keydown", (e) => {
    const me = players.get(myId);
    if (!me || me.health <= 0) return;

    if (e.key === "Escape") {
      if (chatContainer.style.display === "flex") {
        chatContainer.style.display = "none";
        chatInput.blur();
      }
      if (inventoryModule.isInventoryOpen) {
        inventoryModule.toggleInventory();
      }
      e.preventDefault();
      return;
    }

    if (
      document.activeElement === chatInput ||
      document.activeElement === document.getElementById("balyaryAmount")
    ) {
      console.log("Фокус на balyaryAmount, пропускаем keydown:", e.key);
      return;
    }

    switch (e.key) {
      case " ":
        shoot();
        e.preventDefault();
        break;
      case "c":
        const isChatVisible = chatContainer.style.display === "flex";
        chatContainer.style.display = isChatVisible ? "none" : "flex";
        if (!isChatVisible) chatInput.focus();
        else chatInput.blur();
        e.preventDefault();
        break;
      case "i":
        inventoryModule.toggleInventory();
        e.preventDefault();
        break;
    }
  });

  // Обработчик кликов по канвасу
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      const me = players.get(myId);
      if (!me || me.health <= 0) return;

      const inventoryContainer = document.getElementById("inventoryContainer");
      const rect = inventoryContainer.getBoundingClientRect();
      if (
        inventoryModule.isInventoryOpen &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const slots = inventoryContainer.children[0].children;
        for (let i = 0; i < slots.length; i++) {
          const slotRect = slots[i].getBoundingClientRect();
          if (
            e.clientX >= slotRect.left &&
            e.clientX <= slotRect.right &&
            e.clientY >= slotRect.top &&
            e.clientY <= slotRect.bottom &&
            inventoryModule.inventory[i]
          ) {
            console.log(
              `Клик по слоту ${i} (x:${e.clientX}, y:${e.clientY}), предмет: ${inventoryModule.inventory[i].type}`
            );
            inventoryModule.selectSlot(i, slots[i]);
            return;
          }
        }
        console.log(
          `Клик вне слотов инвентаря (x:${e.clientX}, y:${e.clientY})`
        );
        return;
      }

      isMoving = true;
      targetX = e.clientX + camera.x;
      targetY = e.clientY + camera.y;
    }
  });

  // Обработчик правого клика
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const me = players.get(myId);
    if (!me || me.health <= 0) return;

    const inventoryContainer = document.getElementById("inventoryContainer");
    const chatContainer = document.getElementById("chatContainer");
    if (
      (inventoryModule.isInventoryOpen &&
        inventoryContainer.contains(e.target)) ||
      (chatContainer.style.display === "flex" &&
        chatContainer.contains(e.target))
    ) {
      return;
    }

    const clickX = e.clientX + camera.x;
    const clickY = e.clientY + camera.y;

    let closestPlayer = null;
    let minDistance = Infinity;

    players.forEach((player, id) => {
      if (id === myId || player.health <= 0) return;
      const dx = clickX - (player.x + 20);
      const dy = clickY - (player.y + 20);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 50 && distance < minDistance) {
        closestPlayer = id;
        minDistance = distance;
      }
    });

    if (closestPlayer) {
      inventoryModule.selectedPlayerId = closestPlayer;
      document.getElementById("tradeBtn").disabled = false;
      console.log(
        `Выбран игрок для обмена: ${inventoryModule.selectedPlayerId}`
      );
    } else {
      inventoryModule.selectedPlayerId = null;
      document.getElementById("tradeBtn").disabled = true;
      console.log("Игрок для обмена не выбран");
    }
  });

  // Обработчик длительного касания
  let touchTimer = null;
  canvas.addEventListener("touchstart", (e) => {
    const me = players.get(myId);
    if (!me || me.health <= 0) return;

    const touch = e.touches[0];
    const inventoryContainer = document.getElementById("inventoryContainer");
    const chatContainer = document.getElementById("chatContainer");
    if (
      (inventoryModule.isInventoryOpen &&
        inventoryContainer.contains(
          document.elementFromPoint(touch.clientX, touch.clientY)
        )) ||
      (chatContainer.style.display === "flex" &&
        chatContainer.contains(
          document.elementFromPoint(touch.clientX, touch.clientY)
        ))
    ) {
      return;
    }

    touchTimer = setTimeout(() => {
      const touchX = touch.clientX + camera.x;
      const touchY = touch.clientY + camera.y;

      let closestPlayer = null;
      let minDistance = Infinity;

      players.forEach((player, id) => {
        if (id === myId || player.health <= 0) return;
        const dx = touchX - (player.x + 20);
        const dy = touchY - (player.y + 20);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 50 && distance < minDistance) {
          closestPlayer = id;
          minDistance = distance;
        }
      });

      if (closestPlayer) {
        inventoryModule.selectedPlayerId = closestPlayer;
        document.getElementById("tradeBtn").disabled = false;
        console.log(
          `Выбран игрок для обмена (тач): ${inventoryModule.selectedPlayerId}`
        );
      } else {
        inventoryModule.selectedPlayerId = null;
        document.getElementById("tradeBtn").disabled = true;
        console.log("Игрок для обмена не выбран (тач)");
      }
    }, 500);
  });

  canvas.addEventListener("touchend", () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
  });

  canvas.addEventListener("touchcancel", () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
  });

  // Обработчик тач-событий
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const me = players.get(myId);
    if (!me || me.health <= 0) return;

    const touch = e.touches[0];
    const inventoryContainer = document.getElementById("inventoryContainer");
    const rect = inventoryContainer.getBoundingClientRect();

    if (
      inventoryModule.isInventoryOpen &&
      touch.clientX >= rect.left &&
      touch.clientX <= rect.right &&
      touch.clientY >= rect.top &&
      touch.clientY <= rect.bottom
    ) {
      const slots = inventoryContainer.children[0].children;
      for (let i = 0; i < slots.length; i++) {
        const slotRect = slots[i].getBoundingClientRect();
        if (
          touch.clientX >= slotRect.left &&
          touch.clientX <= slotRect.right &&
          touch.clientY >= slotRect.top &&
          touch.clientY <= slotRect.bottom &&
          inventoryModule.inventory[i]
        ) {
          console.log(
            `Тач по слоту ${i} (x:${touch.clientX}, y:${touch.clientY}), предмет: ${inventoryModule.inventory[i].type}`
          );
          inventoryModule.selectSlot(i, slots[i]);
          return;
        }
      }
      console.log(
        `Тач вне слотов инвентаря (x:${touch.clientX}, y:${touch.clientY})`
      );
    } else {
      isMoving = true;
      targetX = touch.clientX + camera.x;
      targetY = touch.clientY + camera.y;
    }
  });

  // Настройка кнопки Fire
  const fireBtn = document.getElementById("fireBtn");
  fireBtn.addEventListener("click", (e) => {
    e.preventDefault();
    shoot();
  });

  // Настройка кнопки Chat
  const chatBtn = document.getElementById("chatBtn");
  chatBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const isChatVisible = chatContainer.style.display === "flex";
    chatContainer.style.display = isChatVisible ? "none" : "flex";
    chatBtn.classList.toggle("active", !isChatVisible);
    if (!isChatVisible) chatInput.focus();
    else chatInput.blur();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chatContainer.style.display === "flex") {
      chatContainer.style.display = "none";
      chatInput.blur();
    }
  });

  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && chatInput.value.trim()) {
      sendWhenReady(
        ws,
        JSON.stringify({ type: "chat", message: chatInput.value.trim() })
      );
      chatInput.value = "";
    }
  });

  requestAnimationFrame(gameLoop);
}

// Обновляем handleGameMessage
function handleGameMessage(event) {
  try {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "newPlayer":
        players.set(data.player.id, { ...data.player, frameTime: 0 });
        updateOnlineCount();
        break;
      case "playerLeft":
        players.delete(data.id);
        updateOnlineCount();
        break;
      case "syncItems":
        items.clear();
        data.items.forEach((item) =>
          items.set(item.itemId, {
            x: item.x,
            y: item.y,
            type: item.type,
            spawnTime: item.spawnTime,
          })
        );
        data.items.forEach((item) => {
          if (pendingPickups.has(item.itemId)) {
            console.log(
              `Предмет ${item.itemId} всё ещё в мире, убираем из pendingPickups`
            );
            pendingPickups.delete(item.itemId);
          }
        });
        break;
      case "itemPicked":
        items.delete(data.itemId);
        pendingPickups.delete(data.itemId);
        console.log(`Предмет ${data.itemId} удалён из мира (itemPicked)`);
        const me = players.get(myId);
        if (me && data.playerId === myId && data.item) {
          if (data.item.type === "balyary") {
            const balyarySlot = inventoryModule.inventory.findIndex(
              (slot) => slot && slot.type === "balyary"
            );
            if (balyarySlot !== -1) {
              inventoryModule.inventory[balyarySlot].quantity =
                (inventoryModule.inventory[balyarySlot].quantity || 1) + 1;
              console.log(
                `Добавлено 1 Баляр, теперь их ${inventoryModule.inventory[balyarySlot].quantity}`
              );
            } else {
              const freeSlot = inventoryModule.inventory.findIndex(
                (slot) => slot === null
              );
              if (freeSlot !== -1) {
                inventoryModule.inventory[freeSlot] = {
                  type: "balyary",
                  quantity: 1,
                  itemId:
                    data.itemId ||
                    `${data.item.type}_${Date.now()}_${freeSlot}`,
                };
                console.log(
                  `Баляры добавлены в слот ${freeSlot}, количество: 1, ID: ${inventoryModule.inventory[freeSlot].itemId}`
                );
              }
            }
          } else {
            const freeSlot = inventoryModule.inventory.findIndex(
              (slot) => slot === null
            );
            if (freeSlot !== -1) {
              inventoryModule.inventory[freeSlot] = {
                type: data.item.type,
                itemId:
                  data.item.itemId ||
                  `${data.item.type}_${Date.now()}_${freeSlot}`,
              };
              console.log(
                `Предмет ${data.item.type} добавлен в слот ${freeSlot}, ID: ${inventoryModule.inventory[freeSlot].itemId}`
              );
            }
          }
          inventoryModule.updateInventoryDisplay();
        }
        inventoryModule.updateStatsDisplay();
        break;
      case "itemNotFound":
        items.delete(data.itemId);
        pendingPickups.delete(data.itemId);
        console.log(
          `Предмет ${data.itemId} не найден на сервере, удалён из локального items`
        );
        break;
      case "inventoryFull":
        console.log(`Инвентарь полон, предмет ${data.itemId} не поднят`);
        pendingPickups.delete(data.itemId);
        break;
      case "update":
        const existingPlayer = players.get(data.player.id);
        players.set(data.player.id, {
          ...existingPlayer,
          ...data.player,
          frameTime: existingPlayer.frameTime || 0,
        });
        if (data.player.id === myId) {
          inventoryModule.inventory =
            data.player.inventory || inventoryModule.inventory;
          inventoryModule.updateStatsDisplay();
          inventoryModule.updateInventoryDisplay();
        }
        break;
      case "itemDropped":
        console.log(
          `Получено itemDropped: itemId=${data.itemId}, type=${data.type}, x=${data.x}, y=${data.y}`
        );
        items.set(data.itemId, {
          x: data.x,
          y: data.y,
          type: data.type,
          spawnTime: data.spawnTime,
        });
        inventoryModule.updateInventoryDisplay();
        break;
      case "chat":
        const messageEl = document.createElement("div");
        messageEl.textContent = `${data.id}: ${data.message}`;
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        break;
      case "shoot":
        console.log(`Получена пуля ${data.bulletId} от ${data.shooterId}`);
        bullets.set(data.bulletId, {
          x: data.x,
          y: data.y,
          dx: data.dx,
          dy: data.dy,
          spawnTime: Date.now(),
          life: GAME_CONFIG.BULLET_LIFE,
          shooterId: data.shooterId,
        });
        break;
      case "bulletRemoved":
        bullets.delete(data.bulletId);
        console.log(`Пуля ${data.bulletId} удалена`);
        break;
      case "tradeCompleted":
        if (
          inventoryModule.tradeSession &&
          inventoryModule.tradeSession.partnerId === data.partnerId
        ) {
          inventoryModule.finalizeTrade();
          console.log(`Обмен с ${data.partnerId} завершён на клиенте`);
        }
        break;
      case "tradeRequest":
        console.log(`Получен запрос на обмен от ${data.fromId}`);
        inventoryModule.showTradeRequest(data.fromId);
        break;
      case "tradeDeclined":
        if (data.fromId === inventoryModule.selectedPlayerId) {
          console.log(`Игрок ${data.fromId} отклонил обмен`);
          document.getElementById("tradeBtn").disabled = false;
          inventoryModule.selectedPlayerId = null;
        }
        break;
      case "tradeAccepted":
        if (data.fromId === inventoryModule.selectedPlayerId) {
          console.log(`Игрок ${data.fromId} принял обмен`);
          inventoryModule.tradeSession = {
            partnerId: data.fromId,
            myItem: null,
            partnerItem: null,
            myConfirmed: false,
            partnerConfirmed: false,
          };
          inventoryModule.openTradeInventory();
          document.getElementById("tradeBtn").disabled = true;
        }
        break;
      case "tradeItemPlaced":
        if (
          inventoryModule.tradeSession &&
          inventoryModule.tradeSession.partnerId === data.fromId
        ) {
          inventoryModule.tradeSession.partnerItem = data.item;
          inventoryModule.updateTradeInventory();
          console.log(
            `Партнёр ${data.fromId} предложил предмет: ${
              data.item?.type || "ничего"
            }`
          );
        }
        break;
      case "tradeConfirmed":
        if (
          inventoryModule.tradeSession &&
          inventoryModule.tradeSession.partnerId === data.fromId
        ) {
          inventoryModule.tradeSession.partnerConfirmed = true;
          const useBtn = document.getElementById("useBtn");
          const dropBtn = document.getElementById("dropBtn");
          useBtn.textContent = "Обмен";
          useBtn.disabled = inventoryModule.tradeSession.myConfirmed;
          dropBtn.textContent = "Отмена";
          dropBtn.disabled = false;
          inventoryModule.updateTradeInventory();
          if (inventoryModule.tradeSession.myConfirmed) {
            inventoryModule.finalizeTrade();
          }
          console.log(`Партнёр ${data.fromId} подтвердил обмен`);
        }
        break;
      case "tradeCancelled":
        if (
          inventoryModule.tradeSession &&
          inventoryModule.tradeSession.partnerId === data.fromId
        ) {
          inventoryModule.cancelTrade();
          console.log(`Обмен с ${data.fromId} отменён`);
        }
        break;
    }
  } catch (error) {
    console.error("Ошибка в handleGameMessage:", error);
  }
}

// Обновляем draw для использования selectedPlayerId из inventoryModule
function draw(deltaTime) {
  // ... (остальной код без изменений)
  players.forEach((player) => {
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    if (player.id !== myId) {
      if (player.state === "walking") {
        player.frameTime += deltaTime;
        if (player.frameTime >= GAME_CONFIG.FRAME_DURATION / 7) {
          player.frameTime -= GAME_CONFIG.FRAME_DURATION / 7;
          player.frame = (player.frame + 1) % 7;
        }
      } else if (player.state === "dying") {
        player.frameTime += deltaTime;
        if (player.frameTime >= GAME_CONFIG.FRAME_DURATION / 7) {
          player.frameTime = 0;
          if (player.frame < 6) player.frame += 1;
        }
      } else {
        player.frame = 0;
        player.frameTime = 0;
      }
    }

    let spriteX = player.frame * 40;
    let spriteY =
      player.state === "dying"
        ? 160
        : { up: 0, down: 40, left: 80, right: 120 }[player.direction] || 40;

    if (player.id === inventoryModule.selectedPlayerId) {
      ctx.beginPath();
      ctx.arc(screenX + 20, screenY + 20, 25, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 255, 0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.drawImage(
      playerSprite,
      spriteX,
      spriteY,
      40,
      40,
      screenX,
      screenY,
      40,
      40
    );
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(player.id, screenX + 20, screenY - 20);
    ctx.fillStyle = "red";
    ctx.fillRect(screenX, screenY - 15, 40, 5);
    ctx.fillStyle = "green";
    ctx.fillRect(screenX, screenY - 15, (player.health / 100) * 40, 5);
  });

  wolves.forEach((wolf) => {
    const screenX = wolf.x - camera.x;
    const screenY = wolf.y - camera.y;
    let spriteX = wolf.frame * 40;
    let spriteY =
      wolf.state === "dying"
        ? 160
        : { up: 0, down: 40, left: 80, right: 120 }[wolf.direction] || 40;
    ctx.drawImage(
      wolfSprite,
      spriteX,
      spriteY,
      40,
      40,
      screenX,
      screenY,
      15,
      15
    );
  });

  items.forEach((item, itemId) => {
    if (!items.has(itemId)) {
      console.log(
        `Предмет ${itemId} пропущен при отрисовке, так как уже удалён`
      );
      return;
    }
    const screenX = item.x - camera.x;
    const screenY = item.y - camera.y;
    // Уменьшаем область проверки видимости, так как размер теперь 20x20
    if (
      screenX >= -20 &&
      screenX <= canvas.width + 20 &&
      screenY >= -20 &&
      screenY <= canvas.height + 20
    ) {
      const itemImage = ITEM_CONFIG[item.type]?.image;
      if (itemImage && itemImage.complete) {
        // Меняем размер отрисовки с 40x40 на 20x20 и корректируем позицию,
        // чтобы центр предмета оставался на месте
        ctx.drawImage(itemImage, screenX + 10, screenY + 10, 20, 20);
      } else {
        // Уменьшаем заглушку до 5x5 для согласованности
        ctx.fillStyle = "yellow";
        ctx.fillRect(screenX + 7.5, screenY + 7.5, 5, 5);
      }
    }
  });

  obstacles.forEach((obstacle) => {
    if (obstacle.isLine) {
      const startX = obstacle.x1 - camera.x;
      const startY = obstacle.y1 - camera.y;
      const endX = obstacle.x2 - camera.x;
      const endY = obstacle.y2 - camera.y;
      if (
        (startX > 0 || endX > 0) &&
        (startX < canvas.width || endX < canvas.width) &&
        (startY > 0 || endY > 0) &&
        (startY < canvas.height || endY < canvas.height)
      ) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = obstacle.thickness;
        ctx.strokeStyle = "rgba(255, 0, 150, 0.5)";
        ctx.stroke();
      }
    }
  });

  bullets.forEach((bullet) => {
    const screenX = bullet.x - camera.x;
    const screenY = bullet.y - camera.y;
    console.log(`Отрисовка пули ${bullet.id} на x:${screenX}, y:${screenY}`);
    drawBullet(screenX, screenY);
  });

  ctx.drawImage(
    vegetationImage,
    vegetationOffsetX,
    camera.y * vegetationSpeed,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  ctx.drawImage(
    cloudsImage,
    cloudsOffsetX,
    camera.y * cloudsSpeed,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
}

function drawBullet(x, y) {
  const gradient = ctx.createRadialGradient(x, y, 2, x, y, 5);
  gradient.addColorStop(0, "rgb(0, 75, 75)");
  gradient.addColorStop(1, "rgba(0, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function checkCollisions() {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  items.forEach((item, id) => {
    // Проверяем, существует ли предмет и не отправляли ли мы уже запрос
    if (!items.has(id)) {
      console.log(`Предмет ${id} уже удалён из items, пропускаем`);
      return;
    }
    if (pendingPickups.has(id)) {
      console.log(
        `Предмет ${id} в процессе поднятия (pendingPickups), пропускаем`
      );
      return;
    }
    // Центр предмета теперь смещён, так как размер 20x20
    const dx = me.x + 20 - (item.x + 10);
    const dy = me.y + 20 - (item.y + 10);
    const distance = Math.sqrt(dx * dx + dy * dy);
    console.log(
      `Проверка столкновения с ${item.type} (ID: ${id}), расстояние: ${distance}`
    );
    if (distance < 30) {
      // Уменьшено с 40 до 30
      console.log(
        `Игрок ${myId} пытается подобрать предмет ${item.type} (ID: ${id})`
      );
      if (ws.readyState === WebSocket.OPEN) {
        pendingPickups.add(id);
        sendWhenReady(ws, JSON.stringify({ type: "pickup", itemId: id }));
        console.log(`Отправлено сообщение pickup для ${id}`);
      } else {
        console.error("WebSocket не открыт, предмет не отправлен на сервер");
      }
    }
  });
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  update(deltaTime);
  draw(deltaTime);
  requestAnimationFrame(gameLoop);
}

// Инициализация изображений (без изменений)
let imagesLoaded = 0;
function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === 24) window.addEventListener("resize", resizeCanvas);
}
