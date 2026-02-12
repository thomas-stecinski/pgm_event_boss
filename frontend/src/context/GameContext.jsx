import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const STORAGE_KEY = "super_click_session";

const GameContext = createContext(null);

export const GameProvider = ({ children }) => {
  // --- ÉTATS GLOBAUX ---
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null); // { name, token, userId }
  const [roomData, setRoomData] = useState(null); // { room, players }
  
  // État spécifique au jeu
  const [gameState, setGameState] = useState({
    phase: "IDLE", // IDLE, CHOOSING, PLAYING, ENDED
    scores: { A: 0, B: 0 },
    timer: 0,
    personalScore: 0,
    offers: [], // Offres de pouvoirs
    myTeam: null,
    winner: null,
    finalScores: null
  });
  
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Ref pour accéder au state actuel dans les listeners socket (évite les problèmes de closure)
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // --- 1. CHARGEMENT INITIAL (Restaurer la session) ---
  useEffect(() => {
    const savedSession = sessionStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        console.log("🔄 Restauration session:", parsed);
        if (parsed.user) setUser(parsed.user);
        if (parsed.roomData) setRoomData(parsed.roomData);
        if (parsed.gameState) setGameState(parsed.gameState);
        
        // Si on a un token, on reconnecte le socket immédiatement
        if (parsed.user?.token) {
          connectSocket(parsed.user.token);
        }
      } catch (e) {
        console.error("Erreur lecture session storage", e);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // --- 2. SAUVEGARDE AUTOMATIQUE (Persistance) ---
  useEffect(() => {
    // On ne sauvegarde que les données Serializable (pas le socket)
    const sessionData = {
      user,
      roomData,
      gameState
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
  }, [user, roomData, gameState]);

  // --- 3. GESTION DU SOCKET ---
  const connectSocket = (token) => {
    if (socket) return; // Déjà connecté ou en cours

    const newSocket = io(BACKEND_URL, {
      auth: { token },
      transports: ["websocket"], // Force websocket pour performance
      reconnection: true,
    });

    // --- LISTENERS GLOBAUX ---

    newSocket.on("connect", () => {
      console.log("✅ Socket connecté:", newSocket.id);
      setIsConnected(true);
      setError(null);
      
      // Tentative de rejoindre la room si on en avait une (re-sync après refresh)
      // Note: Le backend doit gérer la reconnexion automatique via le token, 
      // ou on peut émettre un event ici si nécessaire.
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Erreur socket:", err.message);
      setIsConnected(false);
      setError("Connexion au serveur impossible.");
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("⚠️ Déconnecté:", reason);
      setIsConnected(false);
      if (reason === "io server disconnect") {
        setError("Déconnecté par le serveur.");
        newSocket.disconnect(); // Empêche reconnexion auto si ban/kick
      }
    });

    // --- LISTENERS DATA (Mise à jour du Context) ---

    // Mise à jour des infos de la room (joueurs, statut)
    newSocket.on("room:update", (data) => {
      console.log("🏠 Room update:", data);
      setRoomData(data);
      
      // Mise à jour de ma team si dispo dans la liste des joueurs
      if (user && data.players) {
        const me = data.players.find(p => p.userId === user.userId);
        if (me?.team) {
          setGameState(prev => ({ ...prev, myTeam: me.team }));
        }
      }
    });

    // Début phase CHOOSING
    newSocket.on("game:choosing", (data) => {
      setGameState(prev => ({ ...prev, phase: "CHOOSING" }));
    });

    // Réception des offres de pouvoirs
    newSocket.on("game:offers", (data) => {
      setGameState(prev => ({ ...prev, offers: data.offers || [] }));
    });

    // Début phase PLAYING
    newSocket.on("game:play", () => {
      setGameState(prev => ({ ...prev, phase: "PLAYING" }));
    });

    // Timer et phase
    newSocket.on("game:timer", (data) => {
      setGameState(prev => ({ 
        ...prev, 
        timer: data.timeLeftMs,
        phase: data.phase || prev.phase 
      }));
    });

    // Mise à jour des scores d'équipe
    newSocket.on("game:score:update", (data) => {
      setGameState(prev => ({ ...prev, scores: data.scores }));
    });

    // Mise à jour score personnel
    newSocket.on("game:personalScore:update", (data) => {
      setGameState(prev => ({ ...prev, personalScore: data.personalScore }));
    });

    // Fin de partie
    newSocket.on("game:end", (data) => {
      setGameState(prev => ({ 
        ...prev, 
        phase: "ENDED", 
        winner: data.winner, 
        finalScores: data.scores 
      }));
    });

    // Note: game:playerClick (animations) est géré localement dans GamePage 
    // pour éviter de re-render tout le contexte à chaque clic.

    setSocket(newSocket);
  };

  // --- ACTIONS ---

  const login = async (username) => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username }),
      });
      if (!res.ok) throw new Error("Erreur auth");
      
      const data = await res.json(); // { token, userId, name }
      setUser(data); // Sauvegarde user
      connectSocket(data.token); // Lance connexion
      return true;
    } catch (e) {
      console.error(e);
      setError("Erreur d'authentification");
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
  };
  
  // Helper pour quitter une room proprement
  const leaveRoom = () => {
    if (socket) socket.emit("room:leave");
    setRoomData(null);
    setGameState(prev => ({ ...prev, phase: "IDLE", scores: {A:0, B:0}, timer: 0, personalScore: 0 }));
  };

  // --- VALEUR DU CONTEXT ---
  const value = {
    socket,
    user,
    roomData,
    gameState,
    error,
    isConnected,
    login,
    logout,
    leaveRoom,
    // On expose setGameState si besoin ponctuel
    setGameState
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// Hook personnalisé pour utiliser le context facilement
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};