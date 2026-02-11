import { useEffect, useState } from "react";
import "./HomePage.css";
import "./RoomPage.css";
import { useGameSession } from "../context/GameSession";

const LS_USERNAME_KEY = "scb_username";

const RoomPage = ({ onBack, onJoined }) => {
  const { socket, listRooms, joinRoom } = useGameSession();

  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const fetchRooms = async () => {
    try {
      setLoadingList(true);
      setError("");
      const list = await listRooms({ onlyWaiting: true });
      setRooms(list);
    } catch (e) {
      setRooms([]);
      setError(e?.message || "LIST_ROOMS_FAILED");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => fetchRooms();
    if (socket.connected) fetchRooms();

    socket.on("connect", onConnect);
    return () => socket.off("connect", onConnect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const handleJoin = async (rid) => {
    const clean = (rid ?? roomId).trim();
    if (!clean) return alert("Entre un ROOM ID !");

    try {
      setJoining(true);
      setError("");
      await joinRoom(clean);
      onJoined?.();
    } catch (e) {
      setError(e?.message || "JOIN_ROOM_FAILED");
    } finally {
      setJoining(false);
    }
  };

  const handleBack = () => {
    const existing = localStorage.getItem(LS_USERNAME_KEY);
    if (!existing) localStorage.setItem(LS_USERNAME_KEY, "");
    onBack?.();
  };

  const canClick = !!socket?.connected && !joining;

  return (
    <div className="game-container">
      <div className="game-card room-card">
        <h1 className="game-title">
          RESEARCH<br />ROOMS
        </h1>

        {/* ✅ Grille 2 colonnes (input + bouton) */}
        <div className="room-grid room-joinbox">
          <input
            type="text"
            className="retro-input"
            placeholder="ROOM ID (ex: Xk29aB)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button
            type="button"
            className="retro-btn-go"
            onClick={() => handleJoin()}
            disabled={!canClick}
          >
            {joining ? "..." : "GO"}
          </button>
        </div>

        {error ? <div className="room-error">{error}</div> : null}

        <div className="room-list">
          {loadingList ? (
            <div className="room-empty">LOADING...</div>
          ) : rooms.length === 0 ? (
            <div className="room-empty">NO WAITING ROOMS</div>
          ) : (
            rooms.map((r) => (
              <div className="room-item" key={r.roomId}>
                <div className="room-info">
                  <div className="room-id">#{r.roomId}</div>
                  <div className="room-sub">
                    <span className="room-chip">{r.playersCount ?? 0} PLAYER(S)</span>
                    <span className="room-chip">WAITING</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="retro-btn-go"
                  onClick={() => handleJoin(r.roomId)}
                  disabled={!canClick}
                >
                  JOIN
                </button>
              </div>
            ))
          )}
        </div>

        {/* ✅ Footer sur la MÊME grille */}
        <div className="room-grid room-footer">
          <button type="button" className="retro-btn room-back" onClick={handleBack}>
            BACK
          </button>

          <button
            type="button"
            className="retro-btn-search room-refresh"
            onClick={fetchRooms}
            disabled={loadingList}
          >
            {loadingList ? "..." : "REFRESH"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;