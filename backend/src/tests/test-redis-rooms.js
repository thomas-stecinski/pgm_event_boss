const { io } = require("socket.io-client");
const jwt = require("jsonwebtoken");

const URL = "http://localhost:3001";
const ROOM_ID_1 = "test-room-1";
const ROOM_ID_2 = "test-room-2";
const ROOM_ID_3 = "test-host-leave";

// deux joueurs
const token1 = jwt.sign({ userId: "user1", name: "Alice" }, "dev_secret_change_me", { expiresIn: "1h" });
const token2 = jwt.sign({ userId: "user2", name: "Bob" }, "dev_secret_change_me", { expiresIn: "1h" });

const socket1 = io(URL, { transports: ["websocket"], auth: { token: token1 } });

socket1.on("room:update", (data) => {
  console.log("[socket1] room:update =", data);
});

socket1.on("connect", () => {
  console.log("[socket1] connected", socket1.id);

  // 1 - Creer la room 1
  socket1.emit("room:create", { roomId: ROOM_ID_1 }, (ack) => {
    console.log("ACK room:create (room1) =", ack);

    // 2 - socket2 se connecte et cree la room 2
    const socket2 = io(URL, { transports: ["websocket"], auth: { token: token2 } });

    socket2.on("room:update", (data) => {
      console.log("[socket2] room:update =", data);
    });

    socket2.on("connect", () => {
      console.log("[socket2] connected", socket2.id);

      socket2.emit("room:create", { roomId: ROOM_ID_2 }, (ack) => {
        console.log("ACK room:create (room2) =", ack);

        // 3 - Lister toutes les rooms via room:list
        socket1.emit("room:list", {}, (ack) => {
          console.log("\n--- room:list (toutes) ---");
          console.log("ACK room:list =", JSON.stringify(ack, null, 2));
        });

        // 4 - Lister uniquement les rooms WAITING
        socket1.emit("room:list", { onlyWaiting: true }, (ack) => {
          console.log("\n--- room:list (onlyWaiting) ---");
          console.log("ACK room:list =", JSON.stringify(ack, null, 2));

          // 5 - Cleanup des rooms 1 et 2
          socket1.disconnect();
          socket2.disconnect();
          console.log("\n--- Tests room:list termines ---");

          // 6 - Test : le host quitte -> la room est supprimee pour tout le monde
          setTimeout(() => testHostLeaveDeletesRoom(), 500);
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

// --- Test : si le host quitte, la room est supprimee ---
function testHostLeaveDeletesRoom() {
  console.log("\n========================================");
  console.log("TEST : host quitte -> room supprimee");
  console.log("========================================\n");

  const tokenHost = jwt.sign({ userId: "host1", name: "HostAlice" }, "dev_secret_change_me", { expiresIn: "1h" });
  const tokenPlayer = jwt.sign({ userId: "player1", name: "PlayerBob" }, "dev_secret_change_me", { expiresIn: "1h" });

  const hostSocket = io(URL, { transports: ["websocket"], auth: { token: tokenHost } });

  hostSocket.on("connect", () => {
    console.log("[host] connected", hostSocket.id);

    // Host cree la room
    hostSocket.emit("room:create", { roomId: ROOM_ID_3 }, (ack) => {
      console.log("[host] ACK room:create =", ack);
      if (!ack?.ok) return;

      // Player rejoint la room
      const playerSocket = io(URL, { transports: ["websocket"], auth: { token: tokenPlayer } });

      playerSocket.on("room:deleted", (data) => {
        console.log("[player] room:deleted =", data);
        if (data.reason === "HOST_LEFT") {
          console.log(">> PASS : le joueur a recu room:deleted avec reason HOST_LEFT");
        } else {
          console.log(">> FAIL : reason attendu HOST_LEFT, recu", data.reason);
        }

        // Verifier que la room n'existe plus via room:list
        playerSocket.emit("room:list", {}, (listAck) => {
          const roomStillExists = listAck?.rooms?.some((r) => r.roomId === ROOM_ID_3);
          if (!roomStillExists) {
            console.log(">> PASS : la room n'apparait plus dans room:list");
          } else {
            console.log(">> FAIL : la room apparait encore dans room:list");
          }

          playerSocket.disconnect();
          console.log("\ndone - tous les tests termines");
        });
      });

      playerSocket.on("connect", () => {
        console.log("[player] connected", playerSocket.id);

        playerSocket.emit("room:join", { roomId: ROOM_ID_3 }, (joinAck) => {
          console.log("[player] ACK room:join =", joinAck);

          // Le host quitte la room
          console.log("[host] le host quitte la room...");
          hostSocket.emit("room:leave", {}, (leaveAck) => {
            console.log("[host] ACK room:leave =", leaveAck);
            hostSocket.disconnect();
          });
        });
      });

      playerSocket.on("connect_error", (err) => {
        console.error("[player] connect_error:", err.message);
      });
    });
  });

  hostSocket.on("connect_error", (err) => {
    console.error("[host] connect_error:", err.message);
  });
}
