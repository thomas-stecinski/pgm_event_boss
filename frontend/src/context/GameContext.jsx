import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const STORAGE_KEY = "super_click_session";
const BROWSER_ID_KEY = "scb_browser_id";

function getBrowserId() {
  let id = localStorage.getItem(BROWSER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(BROWSER_ID_KEY, id);
  }
  return id;
}

const GameContext = createContext(null);

export const GameProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [roomData, setRoomData] = useState(null);
  
  const [gameState, setGameState] = useState({
    phase: "IDLE",
    scores: { A: 0, B: 0 },
    timer: 0,
    personalScore: 0,
    offers: [],
    myTeam: null,
    winner: null,
    finalScores: null
  });
  
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Restauration Session
  useEffect(() => {
    const savedSession = sessionStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.user) setUser(parsed.user);
        if (parsed.user?.token) connectSocket(parsed.user.token);
      } catch (e) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Sauvegarde Session (User uniquement)
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ user }));
  }, [user]);

  const connectSocket = (token) => {
    if (socket) return;

    const newSocket = io(BACKEND_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connecté");
      setIsConnected(true);
      setError(null);
    });

    newSocket.on("connect_error", () => {
      setIsConnected(false);
      setError("Connexion impossible.");
    });

    newSocket.on("disconnect", (reason) => {
      setIsConnected(false);
      if (reason === "io server disconnect") {
        setError("Kicked by server.");
        newSocket.disconnect();
      }
    });

    // --- EVENTS JEU ---

    newSocket.on("room:update", (data) => {
      setRoomData(data);
      // Calcul team local si nécessaire
      if (user && data.players) {
        const me = data.players.find(p => p.userId === user.userId);
        if (me?.team) setGameState(prev => ({ ...prev, myTeam: me.team }));
      }
    });

    newSocket.on("room:deleted", () => {
      alert("La room a été fermée par l'hôte.");
      setRoomData(null);
      setGameState(prev => ({ ...prev, phase: "IDLE" }));
    });

    // L'event clé pour l'assignation rapide
    newSocket.on("game:myTeam", (data) => {
      setGameState(prev => ({ ...prev, myTeam: data.team }));
    });

    newSocket.on("game:choosing", () => setGameState(prev => ({ ...prev, phase: "CHOOSING" })));
    newSocket.on("game:offers", (data) => setGameState(prev => ({ ...prev, offers: data.offers || [] })));
    newSocket.on("game:play", () => setGameState(prev => ({ ...prev, phase: "PLAYING" })));
    
    // Si on rejoint en cours de route, le timer nous remet en phase de jeu
    newSocket.on("game:timer", (data) => {
      setGameState(prev => ({ 
        ...prev, 
        timer: data.timeLeftMs,
        phase: data.phase || prev.phase 
      }));
    });

    newSocket.on("game:score:update", (data) => setGameState(prev => ({ ...prev, scores: data.scores })));
    newSocket.on("game:personalScore:update", (data) => setGameState(prev => ({ ...prev, personalScore: data.personalScore })));
    
    newSocket.on("game:end", (data) => {
      setGameState(prev => ({ 
        ...prev, 
        phase: "ENDED", 
        winner: data.winner, 
        finalScores: data.scores 
      }));
    });

    setSocket(newSocket);
  };

  const login = async (username) => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username, browserId: getBrowserId() }),
      });
      if (res.status === 409) {
        alert("Pseudo déjà utilisé")
        return false;
      }
      if (!res.ok) throw new Error("Erreur auth");
      const data = await res.json();
      setUser(data);
      connectSocket(data.token);
      return true;
    } catch (e) {
      setError("Erreur Auth");
      return false;
    }
  };

  const logout = () => {
    if (socket) socket.disconnect();
    setSocket(null);
    setUser(null);
    setRoomData(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };
  
  const leaveRoom = () => {
    if (socket) socket.emit("room:leave");
    setRoomData(null);
    setGameState(prev => ({ ...prev, phase: "IDLE", scores: {A:0, B:0}, timer: 0 }));
  };

  const value = {
    socket, user, roomData, gameState, error, isConnected,
    login, logout, leaveRoom, setGameState
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext);