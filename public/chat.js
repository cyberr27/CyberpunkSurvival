// Получаем элементы DOM для чата
chatBtn = document.getElementById("chatBtn");
chatContainer = document.getElementById("chatContainer");
chatMessages = document.getElementById("chatMessages");
chatInput = document.getElementById("chatInput");

// Создаём глобальный объект для системы чата
window.chatSystem = window.chatSystem || {};

// Инициализация чата
window.chatSystem.initializeChat = function (webSocket) {
  // Настройка кнопки Chat
  chatBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const isChatVisible = chatContainer.style.display === "flex";
    chatContainer.style.display = isChatVisible ? "none" : "flex";
    chatBtn.classList.toggle("active", !isChatVisible);
    if (!isChatVisible) chatInput.focus();
    else chatInput.blur();
  });

  // Закрытие чата по Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chatContainer.style.display === "flex") {
      chatContainer.style.display = "none";
      chatInput.blur();
    }
  });

  // Отправка сообщения по Enter
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && chatInput.value.trim()) {
      sendWhenReady(
        webSocket,
        JSON.stringify({ type: "chat", message: chatInput.value.trim() })
      );
      chatInput.value = "";
    }
  });
};

// Функция для отправки данных, когда WebSocket готов
function sendWhenReady(webSocket, message) {
  if (webSocket.readyState === WebSocket.OPEN) {
    webSocket.send(message);
  } else if (webSocket.readyState === WebSocket.CONNECTING) {
    const checkInterval = setInterval(() => {
      if (webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(message);
        clearInterval(checkInterval);
      }
    }, 100);
    setTimeout(() => clearInterval(checkInterval), 5000);
  }
}

// Функция для отправки данных, когда WebSocket готов
function sendWhenReady(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message);
  } else if (ws.readyState === WebSocket.CONNECTING) {
    const checkInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        clearInterval(checkInterval);
      }
    }, 100);
    setTimeout(() => clearInterval(checkInterval), 5000);
  }
}

// Обработка входящих сообщений чата
window.chatSystem.handleChatMessage = function (data) {
  const messageEl = document.createElement("div");
  messageEl.textContent = `${data.id}: ${data.message}`;
  messageEl.classList.add("chat-message");
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};
