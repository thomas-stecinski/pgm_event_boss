import { useEffect, useState } from "react";
import "./HomePage.css";

const LS_USERNAME_KEY = "scb_username";

const HomePage = ({ onCreate, onGoRooms }) => {
  const [username, setUsername] = useState("");

  //  restaure le dernier pseudo si présent
  useEffect(() => {
    const saved = localStorage.getItem(LS_USERNAME_KEY);
    if (saved && saved.trim()) {
      setUsername(saved);
    }
  }, []);

  //  sauvegarde automatique du dernier pseudo
  useEffect(() => {
    const clean = (username || "").trim();

    if (clean) {
      localStorage.setItem(LS_USERNAME_KEY, clean);
    } else {
      localStorage.removeItem(LS_USERNAME_KEY);
    }
  }, [username]);

  const handleCreateClick = (e) => {
    e.preventDefault();

    const name = username.trim();
    if (!name) {
      alert("Entre un pseudo !");
      return;
    }

    onCreate?.(name);
  };

  const handleResearchClick = (e) => {
    e.preventDefault();

    const name = username.trim();
    if (!name) {
      alert("Entre un pseudo !");
      return;
    }

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