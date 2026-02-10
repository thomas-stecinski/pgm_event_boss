import { useState } from 'react';
import './HomePage.css';

const HomePage = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');

  // Fonction déclenchée par le bouton "GO" ou "Create"
  const handleAction = (e) => {
    e.preventDefault(); // Empêche le rechargement de page
    
    if (username.trim() && room.trim()) {
      onJoin({ username, room });
    } else {
      alert("Please enter a name and a room!");
    }
  };

  return (
    <div className="game-container">
      <div className="game-card">
        
        <h1 className="game-title">SUPER CLICK<br/>BROS</h1>
        
        {/* On met le onSubmit sur le formulaire global */}
        <form onSubmit={handleAction}>
          <input
            type="text"
            className="retro-input"
            placeholder="PLAYER NAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={12}
            required
          />
          
          {/* Zone Input + Bouton GO alignés */}
          <div className="input-group">
            <input
              type="text"
              className="retro-input"
              placeholder="JOIN ROOM (ID)"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              required
            />
            <button type="submit" className="retro-btn-go">
              GO
            </button>
          </div>

          <button type="submit" className="retro-btn">
            CREATE ROOM
          </button>
          
        </form>
      </div>
    </div>
  );
};

export default HomePage;