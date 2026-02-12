import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import HomePage from './pages/HomePage'; 
import Lobby from './pages/Lobby'; 
import GamePage from './pages/GamePage';
import RoomPage from './pages/RoomPage'; // ✅ Import

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false); 
  const [roomData, setRoomData] = useState(null);
  const [user, setUser] = useState(null);
  
  // Vues possibles: 'HOME', 'ROOMS', 'LOBBY', 'GAME'
  const [currentView, setCurrentView] = useState('HOME');

  const [gameOffers, setGameOffers] = useState([]);

  useEffect(() => {
    return () => {
      if (socket) socket.disconnect();
    };
  }, [socket]);

  // Authentification HTTP
  const authenticateUser = async (name) => {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Erreur auth");
      return await response.json();
    } catch (error) {
      console.error(error);
      alert("Erreur d'authentification");
      return null;
    }
  };

  // Initialisation Socket
  const initSocket = (userData) => {
    if (socket) return socket;

    const newSocket = io(BACKEND_URL, {
      auth: { token: userData.token }
    });

    newSocket.on("connect", () => setIsConnected(true));
    newSocket.on("disconnect", () => setIsConnected(false));
    
    // Si on rejoint une room via la liste ou création
    newSocket.on("room:update", (data) => {
      setRoomData(data);
      if (currentView !== 'GAME') setCurrentView('LOBBY');
    });

    // Si le jeu commence
    newSocket.on("game:choosing", () => {
      setCurrentView('GAME');
    });

    newSocket.on("game:offers", (data) => {
      console.log("Offres reçues dans App:", data.offers);
      setGameOffers(data.offers || []);
    });

    setSocket(newSocket);
    return newSocket;
  };

  // --- HANDLERS ---

  const handleCreate = async (username) => {
    const userData = await authenticateUser(username);
    if (!userData) return;
    setUser(userData);
    const s = initSocket(userData);
    s.emit("room:create");
  };

  //  Gère le clic sur "RESEARCH ROOM"
  const handleGoToRooms = async (username) => {
    const userData = await authenticateUser(username);
    if (!userData) return;
    setUser(userData);
    
    // On connecte le socket pour pouvoir lister les rooms
    const s = initSocket(userData);
    
    // On change la vue une fois connecté (ou presque)
    setCurrentView('ROOMS');
  };

  //  Gère le "JOIN" depuis la RoomPage
  const handleJoinRoomId = (roomId) => {
    if (!socket) return;
    socket.emit("room:join", { roomId }, (ack) => {
      if (!ack.ok) alert("Impossible de rejoindre : " + ack.error);
    });
  };

  const handleStartGame = (durationSec) => {
    if (!socket || !roomData) return;

    socket.emit(
      "game:start",
      { roomId: roomData.room.roomId, durationSec },
      (ack) => {
        if (!ack?.ok) alert("Erreur start: " + (ack?.error || "GAME_START_FAILED"));
      }
    );
  };

  const handleLeave = () => {
    if (socket) {
      socket.emit("room:leave");
      socket.disconnect(); 
    }
    setRoomData(null);
    setSocket(null);
    setIsConnected(false);
    setCurrentView('HOME');
  };

  const handleBackToHome = () => {
    // Si on quitte la page Rooms sans se déconnecter, on garde le socket ouvert ou on le ferme, au choix.
    // Ici je déconnecte pour revenir à l'état initial clean.
    handleLeave();
  };

  // --- RENDER ---

  return (
    <div>
      <div style={{ position: 'fixed', bottom: 10, right: 10, zIndex: 9999, color: '#fff' }}>
        NET: <span style={{ color: isConnected ? '#0f0' : '#f00' }}>{isConnected ? 'ON' : 'OFF'}</span>
      </div>

      {currentView === 'HOME' && (
        <HomePage 
            onCreate={handleCreate} 
            onGoRooms={handleGoToRooms} 
        />
      )}

      {currentView === 'ROOMS' && (
        <RoomPage 
            socket={socket}
            onBack={handleBackToHome}
            onJoin={handleJoinRoomId}
        />
      )}

      {currentView === 'LOBBY' && roomData && (
        <Lobby 
          roomData={roomData} 
          currentUserId={user?.userId} 
          onLeave={handleLeave}
          onStart={handleStartGame} 
        />
      )}

      {currentView === 'GAME' && (
        <GamePage 
            socket={socket} 
            roomData={roomData} 
            currentUser={user}
            initialOffers={gameOffers}
            onBack={handleLeave}
        />
      )}
    </div>
  );
}

export default App;

