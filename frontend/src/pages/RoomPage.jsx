import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import "./HomePage.css";
import "./RoomPage.css";

const RoomPage = () => {
  const { socket, logout } = useGame();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [roomIdInput, setRoomIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pulse, setPulse] = useState(false);
  const pulseTimeoutRef = useRef(null);

  // Tri des rooms
  const sortedRooms = useMemo(() => {
    return (rooms || [])
      .filter((r) => r && r.roomId)
      .filter((r) => r.status === "WAITING")
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }, [rooms]);

  const fetchRooms = () => {
    if (!socket) return;
    setLoading(true);
    setError("");

    socket.emit("room:list", { onlyWaiting: true }, (ack) => {
      setLoading(false);
      if (ack?.ok) {
        setRooms(ack.rooms || []);
      } else {
        setError(ack?.error || "LIST_ROOMS_FAILED");
      }
    });
  };

  useEffect(() => {
    if (!socket) return;
    fetchRooms();

    const onListUpdate = (payload) => {
      setRooms(payload?.rooms || []);
      setPulse(true);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = setTimeout(() => setPulse(false), 220);
    };

    socket.on("room:list:update", onListUpdate);
    return () => socket.off("room:list:update", onListUpdate);
  }, [socket]);

  const handleJoin = (rid) => {
    const finalId = (rid || roomIdInput || "").trim();
    if (!finalId) return;
    
    // On emit join, le context écoutera "room:update" et mettra à jour roomData
    socket.emit("room:join", { roomId: finalId }, (ack) => {
    if (!ack?.ok) return alert("Impossible de rejoindre : " + (ack?.error || "FAILED"));
    navigate("/lobby");
    });
  };

  const handleCreate = () => {
    socket.emit("room:create", {}, (ack) => {
    if (!ack?.ok) return alert("Erreur création : " + (ack?.error || "FAILED"));
    navigate("/lobby");
    });
  };

  const onEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleJoin();
    }
  };

  return (
    <div className="game-container">
      <div className="game-card room-card">
        <h1 className="game-title">RESEARCH<br />ROOMS</h1>
        
        {/* Barre d'action rapide */}
        <div className="room-footer-center room-joinbox">
        <button className="retro-btn room-back-btn" onClick={handleCreate}>
            + CREATE NEW ROOM
        </button>
        </div>

        <div className="room-subtitle">
          Join with an ID, or pick a waiting room.
        </div>

        <div className="room-grid room-joinbox">
          <input
            type="text"
            className="retro-input"
            placeholder="ROOM ID (ex: Xk29aB)"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            onKeyDown={onEnter}
          />
          <button
            type="button"
            className="retro-btn-go"
            onClick={() => handleJoin()}
            disabled={!roomIdInput.trim()}
          >
            GO
          </button>
        </div>

        <div className="room-list-head">
          <div className="room-list-title">
            WAITING ROOMS <span className={`room-live ${pulse ? "pulse" : ""}`}>● LIVE</span>
          </div>
          <div className="room-count">({sortedRooms.length})</div>
        </div>

        {error && <div className="room-error">{error}</div>}

        <div className="room-list">
          {loading ? (
            <div className="room-empty">LOADING...</div>
          ) : sortedRooms.length === 0 ? (
            <div className="room-empty">NO WAITING ROOMS</div>
          ) : (
            sortedRooms.map((r) => (
              <div className="room-row" key={r.roomId}>
                <div className="room-left">
                  <div className="room-code">Code: {r.roomId}</div>
                  <div className="room-badges">
                    <span className="room-badge">{r.playersCount} PLAYERS</span>
                    <span className="room-badge room-badge-waiting">WAITING</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="retro-btn-go room-join"
                  onClick={() => handleJoin(r.roomId)}
                >
                  JOIN
                </button>
              </div>
            ))
          )}
        </div>

        <div className="room-footer-center">
            <button
            type="button"
            className="retro-btn room-back-btn"
            onClick={() => {
                logout();
                navigate("/");
            }}
            >
            LOGOUT
            </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;