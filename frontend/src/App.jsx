import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import HomePage from "./pages/HomePage";
import Lobby from "./pages/Lobby";

const BACKEND_URL = "http://localhost:3001";

function waitForConnect(socket, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    if (socket.connected) return resolve();

    const t = setTimeout(() => reject(new Error("SOCKET_CONNECT_TIMEOUT")), timeoutMs);

    const onConnect = () => {
      clearTimeout(t);
      cleanup();
      resolve();
    };
    const onErr = (err) => {
      clearTimeout(t);
      cleanup();
      reject(err || new Error("CONNECT_ERROR"));
    };
    const cleanup = () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onErr);
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onErr);
  });
}

function emitAck(socket, event, payload, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${event}_ACK_TIMEOUT`)), timeoutMs);
    socket.emit(event, payload, (ack) => {
      clearTimeout(t);
      resolve(ack);
    });
  });
}

export default function App() {
  const socketRef = useRef(null);
  const userRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const authenticateUser = async (name) => {
    const res = await fetch(`${BACKEND_URL}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await res.json().catch(async () => ({ message: await res.text() }));
    if (!res.ok) throw new Error(data?.message || "Erreur auth");
    return data; // { token, userId, name }
  };

  const connectSocketWithToken = async (token) => {
    // si socket déjà connectée, on la réutilise
    if (socketRef.current?.connected) return socketRef.current;

    socketRef.current?.disconnect();

    const s = io(BACKEND_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    s.on("connect", () => {
      setIsConnected(true);
      console.log("[front] connected socket.id=", s.id);
    });

    s.on("disconnect", (reason) => {
      setIsConnected(false);
      console.log("[front] disconnected:", reason);
    });

    s.on("connect_error", (err) => {
      console.error("[front] connect_error:", err.message, err.data);
      alert("Connexion socket impossible");
    });

    s.on("room:update", (data) => {
      console.log("[front] room:update:", data);
      setRoomData(data);
    });

    socketRef.current = s;
    await waitForConnect(s);
    return s;
  };

  // CREATE ROOM = auth + connect + create
  const handleCreate = async (username) => {
    try {
      const name = username.trim();
      if (!name) return alert("Il faut un pseudo !");

      const userData = await authenticateUser(name);
      userRef.current = userData;
      setUser(userData);

      const s = await connectSocketWithToken(userData.token);

      const ack = await emitAck(s, "room:create", {});
      console.log("ACK create:", ack);

      if (!ack?.ok) {
        alert(`Create failed: ${ack?.error || "CREATE_ROOM_FAILED"}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Create: ${e.message}`);
    }
  };

  // JOIN = auth + connect + join
  const handleJoin = async (username, roomId) => {
    try {
      const name = username.trim();
      const rid = roomId.trim();
      if (!name) return alert("Il faut un pseudo !");
      if (!rid) return alert("Il faut un ID de room pour rejoindre !");

      const userData = await authenticateUser(name);
      userRef.current = userData;
      setUser(userData);

      const s = await connectSocketWithToken(userData.token);

      const ack = await emitAck(s, "room:join", { roomId: rid });
      console.log("ACK join:", ack);

      if (!ack?.ok) {
        alert(`Join failed: ${ack?.error || "JOIN_ROOM_FAILED"}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Join: ${e.message}`);
    }
  };

  const handleLeave = async () => {
    try {
      if (socketRef.current?.connected) {
        await emitAck(socketRef.current, "room:leave", {}).catch(() => {});
      }
      socketRef.current?.disconnect();
    } finally {
      socketRef.current = null;
      userRef.current = null;
      setRoomData(null);
      setUser(null);
      setIsConnected(false);
    }
  };

  return (
    <div>
      <div
        style={{
          position: "fixed",
          bottom: 10,
          right: 10,
          padding: "5px 10px",
          background: "#000",
          color: "#fff",
          fontFamily: "monospace",
          fontSize: "10px",
          zIndex: 9999,
        }}
      >
        NET:{" "}
        <span style={{ color: isConnected ? "#0f0" : "#f00" }}>
          {isConnected ? "ONLINE" : "OFFLINE"}
        </span>
      </div>

      {!roomData ? (
        <HomePage onCreate={handleCreate} onJoin={handleJoin} />
      ) : (
        <Lobby roomData={roomData} currentUserId={user?.userId} onLeave={handleLeave} />
      )}
    </div>
  );
}