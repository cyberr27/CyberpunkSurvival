// wsSystem.js
// Модуль WebSocket для Cyberpunk Survival

let ws;

// Здесь должны быть все функции работы с WebSocket, обработка сообщений, отправка, инициализация соединения
// Например:
// function initializeWebSocket(url) { ... }
// function sendMessage(msg) { ... }
// function handleMessage(event) { ... }
// ... и другие связанные функции ...

window.wsSystem = {
  // initializeWebSocket,
  // sendMessage,
  // handleMessage,
  // ...
};

let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 2000;

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

function reconnectWebSocket() {
  // ...реализация reconnectWebSocket из code.js...
}

function initializeWebSocket() {
  // ...реализация initializeWebSocket из code.js...
}

function handleAuthMessage(event) {
  // ...реализация handleAuthMessage из code.js...
}

function handleGameMessage(event) {
  // ...реализация handleGameMessage из code.js...
}

window.wsSystem = {
  ws,
  sendWhenReady,
  reconnectWebSocket,
  initializeWebSocket,
  handleAuthMessage,
  handleGameMessage,
};
