import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import "./HomePage.css";

const LS_USERNAME_KEY = "scb_username";

const HomePage = () => {
  const [username, setUsername] = useState("");
  const { login } = useGame();
  const navigate = useNavigate();

  // Restaure le dernier pseudo
  useEffect(() => {
    const saved = localStorage.getItem(LS_USERNAME_KEY);
    if (saved && saved.trim()) {
      setUsername(saved);
    }
  }, []);

  // Sauvegarde auto
  useEffect(() => {
    const clean = (username || "").trim();
    if (clean) {
      localStorage.setItem(LS_USERNAME_KEY, clean);
    } else {
      localStorage.removeItem(LS_USERNAME_KEY);
    }
  }, [username]);

  const handleGo = async (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) {
      alert("Entre un pseudo !");
      return;
    }
    
    // login gère le fetch + la connexion socket + la mise à jour du state
    // App.jsx détectera le changement et affichera RoomPage
    await login(name);
    navigate("/rooms");
  };

  return (
    <div className="game-container">
      <div className="game-card">
        <h1 className="game-title">
          SUPER CLICK<br />BROS
        </h1>

        <form className="game-form" onSubmit={handleGo}>
          <input
            type="text"
            className="retro-input"
            placeholder="PLAYER NAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={12}
          />

          <button type="button" onClick={handleGo} className="retro-btn">
            ENTER GAME
          </button>
        </form>
      </div>
    </div>
  );
};

export default HomePage;