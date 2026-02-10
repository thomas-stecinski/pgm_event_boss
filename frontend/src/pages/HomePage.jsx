import { useState } from 'react';
import './HomePage.css';

const HomePage = ({ onJoin, onCreate }) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  // Gestion du bouton "GO" (Rejoindre)
  const handleJoinClick = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert("Il faut un pseudo !");
      return;
    }
    if (!roomId.trim()) {
      alert("Il faut un ID de room pour rejoindre !");
      return;
    }
    // On passe les infos au parent
    onJoin(username, roomId);
  };

  // Gestion du bouton "CREATE ROOM"
  const handleCreateClick = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert("Il faut un pseudo !");
      return;
    }
    // Pour créer, pas besoin d'ID de room
    onCreate(username);
  };

  return (
    <div className="game-container">
      <div className="game-card">
        
        <h1 className="game-title">SUPER CLICK<br/>BROS</h1>
        
        <form>
          <input
            type="text"
            className="retro-input"
            placeholder="PLAYER NAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={12}
            required
          />
          
          {/* Groupe Rejoindre */}
          <div className="input-group">
            <input
              type="text"
              className="retro-input"
              placeholder="ROOM ID (ex: Xk29aB)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button onClick={handleJoinClick} className="retro-btn-go">
              GO
            </button>
          </div>

          {/* Bouton Créer */}
          <button onClick={handleCreateClick} className="retro-btn">
            CREATE ROOM
          </button>
          
        </form>
      </div>
    </div>
  );
};

export default HomePage;