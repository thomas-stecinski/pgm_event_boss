import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Home from './pages/HomePage';

const socket = io('http://localhost:3000'); // Ton futur backend

function App() {
  const [userData, setUserData] = useState(null); // Stocke {username, room}

  const handleJoin = (data) => {
    setUserData(data);
    // On informe le serveur
    socket.emit('join_room', data);
  };

  return (
    <div>
      {!userData ? (
        <Home onJoin={handleJoin} />
      ) : (
        <div style={{ padding: '20px' }}>
          <h2>Room: {userData.room}</h2>
          <p>Connecté en tant que : <strong>{userData.username}</strong></p>
          {/* Ton futur composant de Chat ira ici */}
          <button onClick={() => window.location.reload()}>Quitter</button>
        </div>
      )}
    </div>
  );
}

export default App;