const { io } = require("socket.io-client");
const jwt = require("jsonwebtoken");

const URL = "http://localhost:3001";
const ROOM_ID = "test-room";

// deux joueurs
const token1 = jwt.sign({ userId: "user1", name: "Alice" }, "dev_secret_change_me", { expiresIn: "1h" });
const token2 = jwt.sign({ userId: "user2", name: "Bob" }, "dev_secret_change_me", { expiresIn: "1h" });

// socket2 ne se connecte pas tout de suite
const socket1 = io(URL, { transports: ["websocket"], auth: { token: token1 } });

// room:update listeners
socket1.on("room:update", (data) => {
  console.log("[socket1] room:update =", data);
});

socket1.on("connect", () => {
  console.log("[socket1] connected", socket1.id);

  // 1 - createRoom
  socket1.emit("room:create", { roomId: ROOM_ID }, (ack) => {
    console.log("ACK room:create =", ack);

    // 2 - socket2 se connecte et join
    const socket2 = io(URL, { transports: ["websocket"], auth: { token: token2 } });

    socket2.on("room:update", (data) => {
      console.log("[socket2] room:update =", data);
    });

    socket2.on("connect", () => {
      console.log("[socket2] connected", socket2.id);

      socket2.emit("room:join", { roomId: ROOM_ID }, (ack) => {
        console.log("ACK room:join =", ack);

        // 3 - leaveRoom avec socket2
        socket2.emit("room:leave", null, (ack) => {
          console.log("ACK room:leave =", ack);

          // 4 - disconnect
          socket1.disconnect();
          socket2.disconnect();
          console.log("done");
        });
      });
    });

    socket2.on("connect_error", (err) => {
      console.error("[socket2] connect_error:", err.message);
    });
  });
});

socket1.on("connect_error", (err) => {
  console.error("[socket1] connect_error:", err.message);
});
