// test-game.js
const { io } = require("socket.io-client"); // si ça marche chez toi, garde
// sinon remplace par: const io = require("socket.io-client");

const URL = "http://localhost:3001";
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJKZzRJX2ZwcGZYIiwibmFtZSI6Im1hcmllIiwiaWF0IjoxNzcwNzk4NTE4LCJleHAiOjE3NzA4MDU3MTh9.klaDPPPnQejiypqngXDxv4_O1IJXjUHnxHTLydz1CEM";

const socket = io(URL, {
  transports: ["websocket"],
  auth: { token },
});

let roomId = null;

// 1) Connexion
socket.on("connect", () => {
  console.log("✅ connected", socket.id);

  // 2) Créer une room
  socket.emit("room:create", {}, (ack) => {
    console.log("ACK room:create =", ack);
    if (!ack?.ok) return;

    roomId = ack.roomId;

    // 3) Lancer la game (host-only, donc OK car tu es le créateur)
    socket.emit("game:start", { roomId }, (ackStart) => {
      console.log("ACK game:start =", ackStart);
      if (!ackStart?.ok) return;

      // 4) Simuler des clics réguliers (toutes les 120ms)
      // (chez toi, rate-limit = 50ms, donc 120ms passe tranquille)
      startClickSpam(120);
    });
  });
});

// 5) Events serveur
socket.on("room:update", (data) => {
  console.log("room:update =", data);
});

socket.on("game:start", (data) => {
  console.log("🎮 game:start =", data);
});

socket.on("game:timer", (data) => {
  // pour éviter de spam la console, tu peux afficher 1 fois par seconde
  if (data.timeLeftMs % 1000 < 600) {
    console.log("⏱️ game:timer =", data.timeLeftMs, "ms left");
  }
});

socket.on("game:score:update", (data) => {
  console.log("📊 game:score:update =", data);
});

socket.on("game:personalScore:update", (data) => {
  console.log("🙋 game:personalScore:update =", data);
});

socket.on("game:end", (data) => {
  console.log("🏁 game:end =", data);
  stopClickSpam();
  socket.disconnect();
});

socket.on("connect_error", (err) => {
  console.error("❌ connect_error:", err.message);
});

socket.on("disconnect", (reason) => {
  console.log("⚠️ disconnected:", reason);
});

// --- Click loop
let clickInterval = null;

function startClickSpam(everyMs) {
  if (clickInterval) return;
  console.log(`🖱️ starting clicks every ${everyMs}ms...`);

  clickInterval = setInterval(() => {
    // tu peux envoyer {} si socket.data.currentRoomId est bien set,
    // mais là on envoie roomId explicitement pour être sûr.
    socket.emit("game:click", { roomId }, (ackClick) => {
      if (!ackClick?.ok && ackClick?.error !== "RATE_LIMIT") {
        console.log("ACK game:click =", ackClick);
      }
    });
  }, everyMs);
}

function stopClickSpam() {
  if (!clickInterval) return;
  clearInterval(clickInterval);
  clickInterval = null;
}
