import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import HomePage from './pages/HomePage'; 
import Lobby from './pages/Lobby'; 
import GamePage from './pages/GamePage';
import RoomPage from './pages/RoomPage';

const AppContent = () => {
  const { user, roomData, gameState, isConnected, error } = useGame();

  // Logique de routing
  if (!user) {
    return <HomePage />;
  }

  // Si on est en phase de jeu (même si on reload la page, gameState.phase sera restauré du storage)
  if (gameState.phase === "CHOOSING" || gameState.phase === "PLAYING" || gameState.phase === "ENDED") {
    return <GamePage />;
  }

  // Si on est dans une room (Lobby)
  if (roomData) {
    return <Lobby />;
  }

  // Sinon, liste des rooms
  return <RoomPage />;
};

function App() {
  return (
    <GameProvider>
      <AppContent />
      {/* Indicateur résau global */}
      <NetworkStatus />
    </GameProvider>
  );
}

const NetworkStatus = () => {
  const { isConnected, error } = useGame();
  return (
    <div style={{ position: 'fixed', bottom: 10, right: 10, zIndex: 9999, fontSize: '10px', color: '#fff', textShadow: '1px 1px 0 #000' }}>
      NET: <span style={{ color: isConnected ? '#0f0' : '#f00' }}>{isConnected ? 'ON' : 'OFF'}</span>
      {error && <span style={{ marginLeft: 10, color: 'red', background:'#000' }}>{error}</span>}
    </div>
  );
};

export default App;