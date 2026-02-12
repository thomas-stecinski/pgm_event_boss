const { io } = require("socket.io-client");

const URL = "http://localhost:3001"; 
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0aEFNSFVNVExBIiwibmFtZSI6Im1hcmllIiwiaWF0IjoxNzcwNzMyMDc5LCJleHAiOjE3NzA3MzkyNzl9.r1TgovLCNSV29ItMX5M7RmizCHVGvsL9P1CFg1xhyP4";

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