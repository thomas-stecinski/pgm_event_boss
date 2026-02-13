import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import "./Lobby.css";

const DEFAULT_DURATION = 90;
const MIN_DURATION = 10;
const MAX_DURATION = 300;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));


const Lobby = () => {
  const { roomData, user, socket, leaveRoom } = useGame();
  const navigate = useNavigate();
  
  // Protection si roomData est null (ne devrait pas arriver grâce à App.jsx)
  if (!roomData) return null;

  const { room, players } = roomData;

  console.log("Render Lobby", { room, players });
  const isHost = room?.hostUserId === user?.userId;

  const [copied, setCopied] = useState(false);
  const [durationInput, setDurationInput] = useState(String(DEFAULT_DURATION));

  const durationSec = useMemo(() => {
    const n = Number(durationInput);
    if (!Number.isFinite(n)) return DEFAULT_DURATION;
    return clamp(Math.floor(n), MIN_DURATION, MAX_DURATION);
  }, [durationInput]);

  useEffect(() => {
    setDurationInput(String(DEFAULT_DURATION));
  }, [room.roomId]);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(room.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 600);
    } catch (e) { console.error("Copy failed", e); }
  };

  const handleStart = () => {
    if (!socket) return;
    socket.emit("game:start", { roomId: room.roomId, durationSec }, (ack) => {
      if (!ack?.ok) return alert("Erreur start: " + (ack?.error || "FAILED"));
      navigate("/game");
    });
  };

  if (!roomData?.room || !user) return null;
  return (
    <div className="game-container">
      <div className="lobby-card">
        <div className="lobby-header">
          <h2 className={`room-title ${copied ? "copied" : ""}`}>Room:{room.roomId}</h2>
          <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={copyRoomId} title="Copier l'ID">
            {copied ? "✔" : "📋"}
          </button>
        </div>

        <div className="status-bar">
          STATUS: <span className={room.status === "WAITING" ? "blink" : ""}>{room.status}</span>
        </div>

        {isHost && (
          <div className="time-panel">
            <div className="time-label">GAME TIME</div>
            <div className="time-row">
              <input
                className="time-input"
                type="number"
                min={MIN_DURATION}
                max={MAX_DURATION}
                step={5}
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)} 
                onBlur={() => {
                  const n = Number(durationInput);
                  if (!Number.isFinite(n)) return setDurationInput(String(DEFAULT_DURATION));
                  setDurationInput(String(clamp(Math.floor(n), MIN_DURATION, MAX_DURATION)));
                }}
              />
              <div className="time-badge">SEC</div>
            </div>
          </div>
        )}

        <div className="players-list">
          <h3>PLAYERS ({players.length})</h3>
          <ul>
            {players.map((p) => (
              <li key={p.userId} className={p.userId === user.userId ? "me" : ""}>
                <span className="player-icon">{p.userId === room.hostUserId ? "👑" : "🍄"}</span>
                {p.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="actions">
          {isHost && (
            <button className="retro-btn start-btn" disabled={players.length < 2} onClick={handleStart}>
              START GAME
            </button>
          )}
          <button
            onClick={() => {
              leaveRoom();
              navigate("/rooms");
            }}
            className="retro-btn leave-btn"
          >
            EXIT ROOM
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;