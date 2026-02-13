import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../context/GameContext";
import "./HomePage.css";
import "./RoomPage.css";

const RoomPage = () => {
  const { socket, logout } = useGame();

  const [waitingRooms, setWaitingRooms] = useState([]);
  const [playingRooms, setPlayingRooms] = useState([]); // 🆕 Liste des parties en cours où je suis
  
  const [roomIdInput, setRoomIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pulse, setPulse] = useState(false);
  const pulseTimeoutRef = useRef(null);

  // Tri des rooms
  const sortedWaitingRooms = useMemo(() => {
    return (waitingRooms || [])
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }, [waitingRooms]);

  // Fonction pour récupérer les listes au chargement
  const fetchRooms = () => {
    if (!socket) return;
    setLoading(true);
    setError("");

    // On demande toutes les rooms (le back va filtrer playingRooms pour mon userId)
    socket.emit("room:list", { onlyWaiting: false }, (ack) => {
      setLoading(false);
      if (ack?.ok) {
        // Le backend renvoie maintenant { waitingRooms, playingRooms }
        setWaitingRooms(ack.rooms?.waitingRooms || []);
        setPlayingRooms(ack.rooms?.playingRooms || []);
      } else {
        setError(ack?.error || "Erreur chargement rooms");
      }
    });
  };

  // Listeners Socket
  useEffect(() => {
    if (!socket) return;
    fetchRooms();

    const onListUpdate = (payload) => {
      // Mise à jour en temps réel des deux listes
      setWaitingRooms(payload?.rooms?.waitingRooms || []);
      setPlayingRooms(payload?.rooms?.playingRooms || []);
      
      // Petit effet visuel "Live"
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
    
    socket.emit("room:join", { roomId: finalId }, (ack) => {
      if (!ack.ok) {
        if (ack.error === "NOT_YOUR_ROOM") {
           alert("Cette partie est en cours et vous n'êtes pas sur la liste des joueurs.");
        } else {
           alert("Impossible de rejoindre : " + ack.error);
        }
      }
      // Si OK, le GameContext gérera la transition via "game:myTeam" ou "room:update"
    });
  };

  const handleCreate = () => {
    socket.emit("room:create", {}, (ack) => {
        if (!ack.ok) alert("Erreur création : " + ack.error);
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
        
        <div className="room-grid room-joinbox" style={{marginBottom: '20px'}}>
             <button className="retro-btn" onClick={handleCreate} style={{width:'100%'}}>+ CREATE NEW ROOM</button>
        </div>

        {/* 🆕 SECTION : MES PARTIES EN COURS (REJOIN) */}
        {playingRooms.length > 0 && (
          <div className="rejoin-section">
            <div className="room-list-title" style={{color: '#fbd000', marginBottom: '10px'}}>
              ⚠️ YOUR ACTIVE GAMES
            </div>
            
            {playingRooms.map(r => (
               <div className="room-row rejoin-row" key={r.roomId}>
                <div className="room-left">
                  <div className="room-code">Room: {r.roomId}</div>
                  <div className="room-badges">
                    <span className="room-badge">{r.playersCount} PLAYERS</span>
                    <span className="room-badge room-badge-rejoin">IN GAME</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="retro-btn-go room-join rejoin-btn"
                  onClick={() => handleJoin(r.roomId)}
                >
                  RESUME
                </button>
              </div>
            ))}
            <div className="room-divider"></div>
          </div>
        )}

        <div className="room-subtitle">
          Join with an ID, or pick a waiting room.
        </div>

        <div className="room-grid room-joinbox">
          <input
            type="text"
            className="retro-input"
            placeholder="ROOM ID"
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
          <div className="room-count">({sortedWaitingRooms.length})</div>
        </div>

        {error && <div className="room-error">{error}</div>}

        <div className="room-list">
          {loading ? (
            <div className="room-empty">LOADING...</div>
          ) : sortedWaitingRooms.length === 0 ? (
            <div className="room-empty">NO WAITING ROOMS</div>
          ) : (
            sortedWaitingRooms.map((r) => (
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
          <button type="button" className="retro-btn room-back-btn" onClick={logout}>
            LOGOUT
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;