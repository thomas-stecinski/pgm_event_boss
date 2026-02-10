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

  const [isConnected, setIsConnected] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [user, setUser] = useState(null); // {token,userId,name}

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const authenticateUser = async (name) => {
    const response = await fetch(`${BACKEND_URL}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await response
      .json()
      .catch(async () => ({ message: await response.text() }));

    if (!response.ok) throw new Error(data?.message || "Erreur auth");
    return data;
  };

  // connecte/maintient la socket pour un user donné
  const ensureSocketConnected = async (userData) => {
    if (socketRef.current && socketRef.current.connected && user?.userId === userData.userId) {
      return socketRef.current;
    }

    socketRef.current?.disconnect();

    const s = io(BACKEND_URL, {
      auth: { token: userData.token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    s.on("connect", () => setIsConnected(true));
    s.on("disconnect", () => setIsConnected(false));

    s.on("connect_error", (err) => {
      console.error("connect_error:", err.message, err.data);
      alert("Connexion au serveur de jeu impossible (token ? serveur ?)");
    });

    // (tu peux laisser même si on s'en fout des rooms)
    s.on("room:update", (data) => setRoomData(data));

    socketRef.current = s;
    await waitForConnect(s);
    return s;
  };

  // ✅ GO USERNAME = AUTH + SOCKET ONLY (pas de room)
  const handleAuth = async (username) => {
    try {
      const name = username.trim();
      if (!name) return alert("Il faut un pseudo !");

      const userData = await authenticateUser(name);
      setUser(userData);

      await ensureSocketConnected(userData);

      // petit feedback
      console.log("AUTH OK:", userData);
      // optionnel : alert("Connecté !");
    } catch (e) {
      console.error(e);
      alert(`Auth: ${e.message}`);
    }
  };

  // rooms : on garde ton code si tu veux, mais ça ne dépend plus du GO pseudo
  const handleCreate = async () => {
    try {
      if (!user) return alert("Fais GO sur ton pseudo d'abord !");
      const s = socketRef.current;
      if (!s?.connected) return alert("Socket pas connectée. Refais GO sur ton pseudo.");

      const ack = await emitAck(s, "room:create", {});
      console.log("ACK create:", ack);

      if (!ack?.ok) alert(`Create failed: ${ack?.error || "CREATE_ROOM_FAILED"}`);
    } catch (e) {
      console.error(e);
      alert(`Create: ${e.message}`);
    }
  };

  const handleJoin = async (roomId) => {
    try {
      const rid = roomId.trim();
      if (!user) return alert("Fais GO sur ton pseudo d'abord !");
      if (!rid) return alert("Il faut un ID de room pour rejoindre !");

      const s = socketRef.current;
      if (!s?.connected) return alert("Socket pas connectée. Refais GO sur ton pseudo.");

      const ack = await emitAck(s, "room:join", { roomId: rid });
      console.log("ACK join:", ack);

      if (!ack?.ok) alert(`Join failed: ${ack?.error || "JOIN_ROOM_FAILED"}`);
    } catch (e) {
      console.error(e);
      alert(`Join: ${e.message}`);
    }
  };

  const handleLeave = async () => {
    try {
      const s = socketRef.current;
      if (s?.connected) {
        await emitAck(s, "room:leave", {}).catch(() => {});
      }
      s?.disconnect();
    } finally {
      socketRef.current = null;
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

      {/* Tant qu'on s'en fout des rooms, tu peux rester sur HomePage */}
      {!roomData ? (
        <HomePage
          onAuth={handleAuth}
          onCreate={handleCreate}
          onJoin={handleJoin}
          isAuthed={!!user}
        />
      ) : (
        <Lobby roomData={roomData} currentUserId={user?.userId} onLeave={handleLeave} />
      )}
    </div>
  );
}