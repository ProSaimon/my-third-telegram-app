const WebSocket = require("ws");
const http = require("http");
const express = require("express");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Раздаем статические файлы (HTML, CSS, JS)
app.use(express.static("."));

// Храним подключения пользователей
const users = new Map();

wss.on("connection", (ws) => {
  console.log("Новое подключение");

  ws.send(
    JSON.stringify({
      type: "system",
      message: "Добро пожаловать в чат!",
    })
  );

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      console.error("Ошибка парсинга:", error);
    }
  });

  ws.on("close", () => {
    for (const [userId, userWs] of users.entries()) {
      if (userWs === ws) {
        users.delete(userId);
        broadcast({
          type: "system",
          message: `Пользователь ${userId} вышел из чата`,
        });
        break;
      }
    }
  });
});

function handleMessage(ws, message) {
  switch (message.type) {
    case "join":
      users.set(message.userId, ws);
      broadcast({
        type: "system",
        message: `Пользователь ${message.userId} присоединился к чату`,
      });
      break;

    case "message":
      broadcast({
        type: "chat",
        userId: message.userId,
        userName: message.userName,
        text: message.text,
        timestamp: new Date().toLocaleTimeString(),
      });
      break;
  }
}

function broadcast(message) {
  const data = JSON.stringify(message);
  users.forEach((userWs) => {
    if (userWs.readyState === WebSocket.OPEN) {
      userWs.send(data);
    }
  });
}

// Главная страница
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Страница чата
app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "chat.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
