import { useEffect, useState } from "react";
import "./HomePage.css";

const LS_USERNAME_KEY = "scb_username";

const HomePage = ({ onCreate, onGoRooms }) => {
  const [username, setUsername] = useState("");

  // ✅ restaure pseudo ou met "Player" par défaut
  useEffect(() => {
    const saved = localStorage.getItem(LS_USERNAME_KEY);

    if (saved && saved.trim()) {
      setUsername(saved);
    } else {
      setUsername("Player");
      localStorage.setItem(LS_USERNAME_KEY, "Player");
    }
  }, []);

  // ✅ sauvegarde automatique
  useEffect(() => {
    const clean = (username || "").trim();
    if (!clean) {
      localStorage.removeItem(LS_USERNAME_KEY);
    } else {
      localStorage.setItem(LS_USERNAME_KEY, clean);
    }
  }, [username]);

  const handleCreateClick = (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) return alert("Il faut un pseudo !");
    onCreate?.(name);
  };

  const handleResearchClick = (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) return alert("Il faut un pseudo !");
    onGoRooms?.(name);
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

          <button type="button" onClick={handleResearchClick} className="retro-btn-search">
            RESEARCH ROOM
          </button>
        </form>
      </div>
    </div>
  );
};

export default HomePage;