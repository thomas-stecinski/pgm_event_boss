import { useEffect, useState } from "react";
import "./HomePage.css";
import "./RoomPage.css";

// On enlève useGameSession car on reçoit tout via les props maintenant
const RoomPage = ({ socket, onBack, onJoin }) => {
  const [rooms, setRooms] = useState([]);
  const [roomIdInput, setRoomIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fonction pour lister les rooms via le socket
  const fetchRooms = () => {
    if (!socket) return;
    setLoading(true);
    setError("");

    // On utilise le socket passé en props
    socket.emit("room:list", { onlyWaiting: true }, (ack) => {
      setLoading(false);
      if (ack.ok) {
        // Trie les rooms par date (récent en haut)
        const sorted = (ack.rooms || []).sort((a, b) => b.createdAt - a.createdAt);
        setRooms(sorted);
      } else {
        setError(ack.error || "Erreur chargement rooms");
      }
    });
  };

  // Charger la liste à l'arrivée
  useEffect(() => {
    fetchRooms();
    
    // Optionnel : rafraichir si le socket se reconnecte
    const onConnect = () => fetchRooms();
    socket?.on("connect", onConnect);
    return () => socket?.off("connect", onConnect);
  }, [socket]);

  const handleJoinClick = (rid) => {
    // Si on clique sur "GO" (input) ou "JOIN" (liste)
    const finalId = rid || roomIdInput;
    if (!finalId.trim()) return alert("Room ID vide");
    
    // On appelle la fonction du parent (App.jsx)
    onJoin?.(finalId);
  };

  return (
    <div className="game-container">
      <div className="game-card room-card">
        <h1 className="game-title">
          RESEARCH<br />ROOMS
        </h1>

        <div className="room-grid room-joinbox">
          <input
            type="text"
            className="retro-input"
            placeholder="ROOM ID (ex: Xk29aB)"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
          />
          <button
            type="button"
            className="retro-btn-go"
            onClick={() => handleJoinClick(roomIdInput)}
          >
            GO
          </button>
        </div>

        {error && <div className="room-error">{error}</div>}

        <div className="room-list">
          {loading ? (
            <div className="room-empty">LOADING...</div>
          ) : rooms.length === 0 ? (
            <div className="room-empty">NO WAITING ROOMS</div>
          ) : (
            rooms.map((r) => (
              <div className="room-item" key={r.roomId}>
                <div className="room-info">
                  <div className="room-id">#{r.roomId}</div>
                  <div className="room-sub">
                    <span className="room-chip">{r.playersCount}/2</span>
                    <span className="room-chip">WAITING</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="retro-btn-go"
                  onClick={() => handleJoinClick(r.roomId)}
                >
                  JOIN
                </button>
              </div>
            ))
          )}
        </div>

        <div className="room-grid room-footer">
          <button type="button" className="retro-btn room-back" onClick={onBack}>
            BACK
          </button>

          <button
            type="button"
            className="retro-btn-search room-refresh"
            onClick={fetchRooms}
            disabled={loading}
          >
            {loading ? "..." : "REFRESH"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;