import { useEffect, useMemo, useRef, useState } from "react";
import "./HomePage.css";
import "./RoomPage.css";

const RoomPage = ({ socket, onBack, onJoin }) => {
  const [rooms, setRooms] = useState([]);
  const [roomIdInput, setRoomIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // petit feedback visuel “LIVE”
  const [pulse, setPulse] = useState(false);
  const pulseTimeoutRef = useRef(null);

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

    // ✅ 1) sync initial
    fetchRooms();

    // ✅ 2) LIVE updates depuis backend
    const onListUpdate = (payload) => {
      setRooms(payload?.rooms || []);
      setError("");
      setLoading(false);

      // pulse propre (pas de fuite)
      setPulse(true);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = setTimeout(() => setPulse(false), 220);
    };

    // ✅ 3) reconnect => resync
    const onConnect = () => fetchRooms();

    socket.on("room:list:update", onListUpdate);
    socket.on("connect", onConnect);

    return () => {
      socket.off("room:list:update", onListUpdate);
      socket.off("connect", onConnect);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const handleJoin = (rid) => {
    const finalId = (rid || roomIdInput || "").trim();
    if (!finalId) return;
    onJoin?.(finalId);
  };

  const onEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleJoin();
    }
  };

  const canUse = !!socket?.connected;
  const canGo = canUse && roomIdInput.trim().length > 0;

  return (
    <div className="game-container">
      <div className="game-card room-card">
        <h1 className="game-title">
          RESEARCH<br />ROOMS
        </h1>

        <div className="room-subtitle">
          Join with an ID, or pick a waiting room below.
        </div>

        {/* INPUT + GO */}
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
            disabled={!canGo}
            title={!canUse ? "Not connected" : !roomIdInput.trim() ? "Enter a room ID" : ""}
          >
            GO
          </button>
        </div>

        {/* header liste */}
        <div className="room-list-head">
          <div className="room-list-title">
            WAITING ROOMS{" "}
            <span className={`room-live ${pulse ? "pulse" : ""}`}>● LIVE</span>
          </div>
          <div className="room-count">({sortedRooms.length})</div>
        </div>

        {error ? <div className="room-error">{error}</div> : null}

        {/* LIST */}
        <div className="room-list">
          {loading ? (
            <div className="room-empty">LOADING...</div>
          ) : sortedRooms.length === 0 ? (
            <div className="room-empty">NO WAITING ROOMS</div>
          ) : (
            sortedRooms.map((r) => {
              const pc = Number(r.playersCount ?? 0);
              const label = pc === 1 ? "PLAYER" : "PLAYERS";

              return (
                <div className="room-row" key={r.roomId}>
                  <div className="room-left">
                    <div className="room-code">Code: {r.roomId}</div>

                    <div className="room-badges">
                      <span className="room-badge">
                        {pc} {label}
                      </span>
                      <span className="room-badge room-badge-waiting">WAITING</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="retro-btn-go room-join"
                    onClick={() => handleJoin(r.roomId)}
                    disabled={!canUse}
                  >
                    JOIN
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER (BACK centré) */}
        <div className="room-footer-center">
          <button type="button" className="retro-btn room-back-btn" onClick={onBack}>
            BACK
          </button>
        </div>

        {!canUse ? <div className="room-net">NET: OFF</div> : null}
      </div>
    </div>
  );
};

export default RoomPage;