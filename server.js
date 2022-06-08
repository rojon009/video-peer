const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const users = {};
const peoples = [];

io.on("connection", (socket) => {
  if (!users[socket.id]) {
    users[socket.id] = socket.id;
  }

  socket.emit("yourID", socket.id);

  io.sockets.emit("allUsers", users);

  socket.on("disconnect", function () {
    console.log("DISCONNESSO!!! ");
    delete users[socket.id];
    io.sockets.emit("allUsers", users);
  });

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("hey", { signal: data.signalData, from: data.from });
  });

  socket.on("acceptCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });

  socket.on("endCall", (data) => {
    console.log(data);
    io.to(data.to).emit("callEnded", data.from);
  });
});

server.listen(8000, () => console.log("server is running on port 8000"));
