import { useState } from "react";
import "./HomePage.css";

const HomePage = ({ onJoin, onCreate }) => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");

  const handleJoinClick = (e) => {
    e.preventDefault();

    const name = username.trim();
    const rid = roomId.trim();

    if (!name) return alert("Il faut un pseudo !");
    if (!rid) return alert("Il faut un ID de room pour rejoindre !");

    onJoin(name, rid);
  };

  const handleCreateClick = (e) => {
    e.preventDefault();

    const name = username.trim();
    if (!name) return alert("Il faut un pseudo !");

    onCreate(name);
  };

  return (
    <div className="game-container">
      <div className="game-card">
        <h1 className="game-title">
          SUPER CLICK<br />BROS
        </h1>

        <form className="game-form">
          <input
            type="text"
            className="retro-input"
            placeholder="PLAYER NAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={12}
            required
          />

          <button type="button" onClick={handleCreateClick} className="retro-btn">
            CREATE ROOM
          </button>

          <div className="input-group">
            <input
              type="text"
              className="retro-input"
              placeholder="ROOM ID (ex: Xk29aB)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button type="button" onClick={handleJoinClick} className="retro-btn-go">
              GO
            </button>
          </div>

          <button type="button" onClick={handleJoinClick} className="retro-btn-search">
            RESEARCH ROOM
          </button>
        </form>
      </div>
    </div>
  );
};

export default HomePage;