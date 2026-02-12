import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { GameProvider, useGame } from "./context/GameContext";

import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import Lobby from "./pages/Lobby";
import GamePage from "./pages/GamePage";

const isGamePhase = (phase) => phase === "CHOOSING" || phase === "PLAYING" || phase === "ENDED";


const AppGuard = ({ children }) => {
  const { user, roomData, gameState } = useGame();
  const location = useLocation();

  if (!user) {
    if (location.pathname !== "/") return <Navigate to="/" replace />;
    return children;
  }

  if (isGamePhase(gameState.phase)) {
    if (location.pathname !== "/game") return <Navigate to="/game" replace />;
    return children;
  }

  if (roomData) {
    if (location.pathname !== "/lobby") return <Navigate to="/lobby" replace />;
    return children;
  }

  if (location.pathname !== "/rooms") return <Navigate to="/rooms" replace />;

  return children;
};

const AppRoutes = () => {
  return (
    <AppGuard>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms" element={<RoomPage />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <NetworkStatus />
    </AppGuard>
  );
};

function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </GameProvider>
  );
}

const NetworkStatus = () => {
  const { isConnected, error } = useGame();
  return (
    <div
      style={{
        position: "fixed",
        bottom: 10,
        right: 10,
        zIndex: 9999,
        fontSize: "10px",
        color: "#fff",
        textShadow: "1px 1px 0 #000",
      }}
    >
      NET: <span style={{ color: isConnected ? "#0f0" : "#f00" }}>{isConnected ? "ON" : "OFF"}</span>
      {error && <span style={{ marginLeft: 10, color: "red", background: "#000" }}>{error}</span>}
    </div>
  );
};

export default App;