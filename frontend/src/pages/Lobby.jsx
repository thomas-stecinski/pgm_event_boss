import React from 'react';
import './Lobby.css'; 

const Lobby = ({ roomData, currentUserId, onLeave }) => {
  const { room, players } = roomData;
  const isHost = room.hostUserId === currentUserId;

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.roomId);
    alert("ID copié dans le presse-papier !"); 
  };

  return (
    <div className="game-container">
      <div className="lobby-card">
        <div className="lobby-header">
          <h2 className="room-title">WORLD {room.roomId}</h2>
          <button className="copy-btn" onClick={copyRoomId} title="Copier l'ID">📋</button>
        </div>

        <div className="status-bar">
           STATUS: <span className={room.status === "WAITING" ? "blink" : ""}>{room.status}</span>
        </div>

        <div className="players-list">
          <h3>PLAYERS ({players.length})</h3>
          <ul>
            {players.map((p) => (
              <li key={p.userId} className={p.userId === currentUserId ? "me" : ""}>
                <span className="player-icon">
                  {p.userId === room.hostUserId ? "👑" : "🍄"}
                </span>
                {p.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="actions">
          {isHost && (
            <button className="retro-btn start-btn" disabled={players.length < 2}>
              START GAME
            </button>
          )}
          <button onClick={onLeave} className="retro-btn leave-btn">
            EXIT PIPE
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;