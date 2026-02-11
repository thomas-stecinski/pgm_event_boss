import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../config";

const GameSessionContext = createContext(null);

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

async function authenticateUser(name) {
  const res = await fetch(`${BACKEND_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  const data = await res.json().catch(async () => ({ message: await res.text() }));
  if (!res.ok) throw new Error(data?.message || "Erreur auth");
  return data; // { token, userId, name }
}

export function GameSessionProvider({ children }) {
  const socketRef = useRef(null);

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  const connectSocketWithToken = async (token) => {
    // réutilise si déjà connecté
    if (socketRef.current?.connected) return socketRef.current;

    socketRef.current?.disconnect();

    const s = io(BACKEND_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    s.on("connect", () => setIsConnected(true));
    s.on("disconnect", () => setIsConnected(false));
    s.on("connect_error", (err) => {
      console.error("[front] connect_error:", err.message, err.data);
      alert("Connexion socket impossible");
    });
    s.on("room:update", (data) => {
      setRoomData(data);
    });

    socketRef.current = s;
    setSocket(s);

    await waitForConnect(s);
    return s;
  };

  // Auth + connect (utile pour /rooms)
  const ensureConnected = async (username) => {
    const name = (username || "").trim();
    if (!name) throw new Error("Il faut un pseudo !");

    // si on a déjà un socket connecté, OK
    if (socketRef.current?.connected && user?.token) return;

    const userData = await authenticateUser(name);
    setUser(userData);

    await connectSocketWithToken(userData.token);
  };

  const createRoom = async (username) => {
    await ensureConnected(username);

    const s = socketRef.current;
    const ack = await emitAck(s, "room:create", {});
    if (!ack?.ok) throw new Error(ack?.error || "CREATE_ROOM_FAILED");

    return ack;
  };

  const joinRoom = async (roomId) => {
    const rid = (roomId || "").trim();
    if (!rid) throw new Error("Il faut un ROOM ID !");
    if (!socketRef.current?.connected) throw new Error("Socket non connectée.");

    const ack = await emitAck(socketRef.current, "room:join", { roomId: rid });
    if (!ack?.ok) throw new Error(ack?.error || "JOIN_ROOM_FAILED");

    return ack;
  };

  const listRooms = async ({ onlyWaiting = true } = {}) => {
    if (!socketRef.current?.connected) throw new Error("Socket non connectée.");

    const ack = await emitAck(socketRef.current, "room:list", { onlyWaiting });
    if (!ack?.ok) throw new Error(ack?.error || "LIST_ROOMS_FAILED");

    const list = Array.isArray(ack.rooms) ? ack.rooms : [];
    list.sort((a, b) => Number(b?.createdAt || 0) - Number(a?.createdAt || 0));
    return list;
  };

  const leaveRoom = async () => {
    try {
      if (socketRef.current?.connected) {
        await emitAck(socketRef.current, "room:leave", {}).catch(() => {});
      }
      socketRef.current?.disconnect();
    } finally {
      socketRef.current = null;
      setSocket(null);
      setRoomData(null);
      setUser(null);
      setIsConnected(false);
    }
  };

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      roomData,
      user,
      ensureConnected,
      createRoom,
      joinRoom,
      listRooms,
      leaveRoom,
    }),
    [socket, isConnected, roomData, user]
  );

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
}

export function useGameSession() {
  const ctx = useContext(GameSessionContext);
  if (!ctx) throw new Error("useGameSession must be used within GameSessionProvider");
  return ctx;
}