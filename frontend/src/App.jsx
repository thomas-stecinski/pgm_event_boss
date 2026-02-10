import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import HomePage from './pages/HomePage'; 
import Lobby from './pages/Lobby'; 

const BACKEND_URL = "http://localhost:3001";

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false); 
  const [roomData, setRoomData] = useState(null);
  const [user, setUser] = useState(null); 

  // Gestion de la déconnexion propre (Nettoyage)
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
      alert("Erreur de connexion au serveur d'auth");
      return null;
    }
  };

  // Initialisation Socket
  const initSocket = (userData) => {
    if (socket) return socket; // Évite les doublons

    const newSocket = io(BACKEND_URL, {
      auth: { token: userData.token }
    });

    newSocket.on("connect", () => setIsConnected(true));
    newSocket.on("disconnect", () => setIsConnected(false));
    
    newSocket.on("connect_error", (err) => {
      console.error("Erreur socket:", err.message);
      alert("Impossible de se connecter au serveur de jeu");
    });

    // LE COEUR DU SYSTÈME : Mise à jour de l'état
    newSocket.on("room:update", (data) => {
      console.log("Mise à jour reçue:", data);
      setRoomData(data); 
    });

    setSocket(newSocket);
    return newSocket;
  };

  // Actions
  const handleCreate = async (username) => {
    const userData = await authenticateUser(username);
    if (!userData) return;
    setUser(userData);

    const socketInstance = initSocket(userData);
    // On attend la connexion pour émettre
    socketInstance.emit("room:create");
  };

  const handleJoin = async (username, roomId) => {
    const userData = await authenticateUser(username);
    if (!userData) return;
    setUser(userData);

    const socketInstance = initSocket(userData);
    
    socketInstance.on("connect", () => {
       socketInstance.emit("room:join", { roomId }, (ack) => {
          if (!ack.ok) {
             alert("Impossible de rejoindre (Room pleine ou inexistante ?)");
             socketInstance.disconnect();
             setRoomData(null);
             setUser(null);
          }
       });
    });
  };

  const handleLeave = () => {
    if (socket) {
      socket.emit("room:leave");
      socket.disconnect(); 
    }
    setRoomData(null);
    setSocket(null);
    setIsConnected(false);
  };

  return (
    <div>
      {/* Indicateur de connexion (Petit point en bas à droite) */}
      <div style={{
        position: 'fixed', bottom: 10, right: 10, 
        padding: '5px 10px', background: '#000', color: '#fff',
        fontFamily: 'monospace', fontSize: '10px', zIndex: 9999
      }}>
        NET: <span style={{ color: isConnected ? '#0f0' : '#f00' }}>
          {isConnected ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      {!roomData ? (
        <HomePage onCreate={handleCreate} onJoin={handleJoin} />
      ) : (
        <Lobby 
          roomData={roomData} 
          currentUserId={user?.userId} 
          onLeave={handleLeave} 
        />
      )}
    </div>
  );
}

export default App; 