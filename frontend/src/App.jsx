import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import Lobby from "./pages/Lobby";
import { GameSessionProvider, useGameSession } from "./context/GameSession";

function NetBadge() {
  const { isConnected } = useGameSession();
  return (
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
  );
}

function HomeRoute() {
  const navigate = useNavigate();
  const { createRoom, ensureConnected } = useGameSession();

  const onCreate = async (username) => {
    try {
      await createRoom(username);
      navigate("/lobby");
    } catch (e) {
      alert(`Create: ${e.message}`);
    }
  };

  const onGoRooms = async (username) => {
    try {
      await ensureConnected(username);
      navigate("/rooms");
    } catch (e) {
      alert(`Rooms: ${e.message}`);
    }
  };

  return <HomePage onCreate={onCreate} onGoRooms={onGoRooms} />;
}

function RoomsRoute() {
  const navigate = useNavigate();
  const { user } = useGameSession();

  if (!user) return <Navigate to="/" replace />;

  return <RoomPage onBack={() => navigate("/")} onJoined={() => navigate("/lobby")} />;
}

function LobbyRoute() {
  const navigate = useNavigate();
  const { roomData, user, leaveRoom } = useGameSession();

  if (!roomData) return <Navigate to="/" replace />;

  const onLeave = async () => {
    await leaveRoom();
    navigate("/", { replace: true });
  };

  return <Lobby roomData={roomData} currentUserId={user?.userId} onLeave={onLeave} />;
}

export default function App() {
  return (
    <GameSessionProvider>
      <BrowserRouter>
        <NetBadge />
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/rooms" element={<RoomsRoute />} />
          <Route path="/lobby" element={<LobbyRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GameSessionProvider>
  );
}