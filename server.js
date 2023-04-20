const dotenv = require("dotenv").config();
const express = require("express");
const { Server } = require("socket.io");
const colors = require("colors");
const { createServer } = require("http");

/* -------------------------------- Variables ------------------------------- */
const app = express();
const httpServer = createServer();
const socketServerOptions = {
  cors: {
    origin: "*",
  },
};
const io = new Server(httpServer, socketServerOptions);
const CONFIG = {
  EXPRESS_PORT: process.env.EXPRESS_PORT || 3000,
  WSS_PORT: process.env.WSS_PORT || 5000,
};

//Middleware
io.on("connect", (socket) => {
  const { id } = socket;
  console.log("🚀 ~ file: server.js:24 ~ io.on ~ id:", id);
  socket.emit("socketId", id);

  /* -------------------------------- joinRoom -------------------------------- */
  socket.on("joinRoom", (roomId) => {
    console.log(colors.bgWhite("Socket: ", id, " joined room: ", roomId));

    socket.join(roomId);

    const socketIdsInRoom = [...socket.adapter.rooms.get(roomId)];

    io.to(roomId).emit("members", socketIdsInRoom);
  });

  /* ---------------------------------- offer --------------------------------- */
  socket.on("offer", (payload) => {
    console.log("🚀 ~ file: server.js:40 ~ socket.on ~ payload:", payload);
    io.to(payload.target).emit("offer", payload);
  });

  socket.on("answer", (payload) => {
    console.log("🚀 ~ file: server.js:46 ~ socket.on ~ payload:", payload);
    io.to(payload.target).emit("answer", payload);
  });

  socket.on("candidate", (payload) => {
    console.log("🚀 ~ file: server.js:50 ~ socket.on ~ payload:", payload);
    io.to(payload.target).emit("candidate", payload);
  });
});

/* ------------------------------- middleware ------------------------------- */
app.use(express.static("public"));

/* --------------------------- server init/listen --------------------------- */
io.listen(CONFIG.WSS_PORT);
app.listen(CONFIG.EXPRESS_PORT, () =>
  console.log(
    colors.bgGreen(
      "😀 Server started at:",
      new Date(),
      "On port:",
      CONFIG.EXPRESS_PORT
    )
  )
);
