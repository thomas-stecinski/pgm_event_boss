const { io } = require("socket.io-client");

const URL = "http://localhost:3001"; 
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJKZzRJX2ZwcGZYIiwibmFtZSI6Im1hcmllIiwiaWF0IjoxNzcwNzk4NTE4LCJleHAiOjE3NzA4MDU3MTh9.klaDPPPnQejiypqngXDxv4_O1IJXjUHnxHTLydz1CEM";

const socket = io(URL, {
  transports: ["websocket"], 
  auth: { token },          
});

socket.on("connect", () => {
  console.log("connected", socket.id);

  socket.emit("room:create", {roomId : 1}, (ack) => {
    console.log("ACK room:create =", ack);
  });
});

socket.on("room:update", (data) => {
  console.log("room:update =", data);
});

socket.on("connect_error", (err) => {
  console.error("connect_error:", err.message);
});
