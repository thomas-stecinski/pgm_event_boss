import { useState } from "react";
import "./HomePage.css";

const HomePage = ({ onAuth, onJoin, onCreate, isAuthed }) => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");

  // GO sur PLAYER NAME -> AUTH ONLY
  const handlePlayerGoClick = (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) return alert("Il faut un pseudo !");
    onAuth(name);
  };

  // GO pour rejoindre une room
  const handleJoinClick = (e) => {
    e.preventDefault();
    const rid = roomId.trim();
    if (!rid) return alert("Il faut un ID de room pour rejoindre !");
    onJoin(rid); // ✅ ici on ne renvoie plus username, déjà auth
  };

  // CREATE ROOM
  const handleCreateClick = (e) => {
    e.preventDefault();
    onCreate(); // ✅ déjà auth
  };

  return (
    <div className="game-container">
      <div className="game-card">
        <h1 className="game-title">
          SUPER CLICK<br />BROS
        </h1>

        <form>
          {/* PLAYER NAME + GO */}
          <div className="input-group">
            <input
              type="text"
              className="retro-input"
              placeholder="PLAYER NAME"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={12}
              required
            />
            <button
              type="button"
              onClick={handlePlayerGoClick}
              className="retro-btn-go"
            >
              GO
            </button>
          </div>

          {/* ROOM JOIN */}
          <div className="input-group">
            <input
              type="text"
              className="retro-input"
              placeholder="ROOM ID (ex: Xk29aB)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button
              type="button"
              onClick={handleJoinClick}
              className="retro-btn-go"
              disabled={!isAuthed}
              title={!isAuthed ? "Fais GO sur PLAYER NAME d'abord" : ""}
            >
              GO
            </button>
          </div>

          {/* CREATE ROOM */}
          <button
            type="button"
            onClick={handleCreateClick}
            className="retro-btn"
            disabled={!isAuthed}
            title={!isAuthed ? "Fais GO sur PLAYER NAME d'abord" : ""}
          >
            CREATE ROOM
          </button>
        </form>
      </div>
    </div>
  );
};

export default HomePage;