import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const STORAGE_KEY = "super_click_session";

const LAST_ROOM_KEY = "scb_last_room"; // 🔑 Clé pour se souvenir de la room
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

  // Ref pour accès immédiat dans les listeners
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // --- 1. CHARGEMENT INITIAL ---
  useEffect(() => {
    const savedSession = sessionStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.user) setUser(parsed.user);
        // On ne restaure PAS roomData ici car on veut forcer la reconnexion propre via socket
        if (parsed.user?.token) connectSocket(parsed.user.token);
      } catch (e) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // --- 2. SAUVEGARDE STATE ---
  useEffect(() => {
    const sessionData = { user, roomData, gameState };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
  }, [user, roomData, gameState]);

  // --- 3. SOCKET ---
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

    // --- LOGIQUE METIER ---

    newSocket.on("room:update", (data) => {
      setRoomData(data);
      
      // 💾 SAUVEGARDE L'ID DE LA ROOM DÈS QU'ON REÇOIT UNE UPDATE
      if (data.room && data.room.roomId) {
        localStorage.setItem(LAST_ROOM_KEY, data.room.roomId);
      }

      // Calcul de la team
      if (user && data.players) {
        const me = data.players.find(p => p.userId === user.userId);
        if (me?.team) setGameState(prev => ({ ...prev, myTeam: me.team }));
      }
    });

    newSocket.on("game:choosing", () => setGameState(prev => ({ ...prev, phase: "CHOOSING" })));
    newSocket.on("game:offers", (data) => setGameState(prev => ({ ...prev, offers: data.offers || [] })));
    newSocket.on("game:play", () => setGameState(prev => ({ ...prev, phase: "PLAYING" })));
    
    // ⏱️ C'EST ICI QUE LA MAGIE DU "RESUME" OPÈRE
    // Si on rejoint une partie en cours, le serveur envoie le timer.
    // On met à jour la phase immédiatement. App.jsx basculera sur GamePage.
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
      // Partie finie normalement -> on oublie la room
      localStorage.removeItem(LAST_ROOM_KEY);
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
      setError("Erreur auth");
      return false;
    }
  };

  const logout = () => {
    if (socket) socket.disconnect();
    setSocket(null);
    setUser(null);
    setRoomData(null);
    setGameState({ phase: "IDLE", scores: {A:0, B:0}, timer: 0, offers: [], personalScore: 0, myTeam: null, winner: null, finalScores: null });
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_ROOM_KEY);
  };
  
  const leaveRoom = () => {
    if (socket) socket.emit("room:leave");
    setRoomData(null);
    setGameState(prev => ({ ...prev, phase: "IDLE", scores: {A:0, B:0}, timer: 0, personalScore: 0 }));
    // 👋 Départ volontaire -> on supprime la clé de reconnexion
    localStorage.removeItem(LAST_ROOM_KEY);
  };

  const value = {
    socket, user, roomData, gameState, error, isConnected,
    login, logout, leaveRoom, setGameState
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext);