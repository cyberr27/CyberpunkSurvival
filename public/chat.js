// Получаем элементы DOM для чата
const chatBtn = document.getElementById("chatBtn");
const chatContainer = document.getElementById("chatContainer");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");

// WebSocket соединение (будет передаваться из code.js)
let ws;

// Инициализация чата
function initializeChat(webSocket) {
  ws = webSocket;

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
      sendWhenReady(ws, JSON.stringify({ type: "chat", message: chatInput.value.trim() }));
      chatInput.value = "";
    }
  });
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
  } else {
    console.error("WebSocket не готов для отправки:", ws.readyState);
  }
}

// Обработка входящих сообщений чата
function handleChatMessage(data) {
  const messageEl = document.createElement("div");
  messageEl.textContent = `${data.id}: ${data.message}`;
  messageEl.classList.add("chat-message");
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

export { initializeChat, handleChatMessage };