import React, { useEffect, useMemo, useState } from "react";
import "./Lobby.css";

const DEFAULT_DURATION = 90;
const MIN_DURATION = 10;
const MAX_DURATION = 300;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const Lobby = ({ roomData, currentUserId, onLeave, onStart }) => {
  const { room, players } = roomData;
  const isHost = room.hostUserId === currentUserId;

  const [copied, setCopied] = useState(false);

  const [durationInput, setDurationInput] = useState(String(DEFAULT_DURATION));

  const durationSec = useMemo(() => {
    const n = Number(durationInput);
    if (!Number.isFinite(n)) return DEFAULT_DURATION;
    return clamp(Math.floor(n), MIN_DURATION, MAX_DURATION);
  }, [durationInput]);

  //  reset when changing room
  useEffect(() => {
    setDurationInput(String(DEFAULT_DURATION));
  }, [room.roomId]);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(room.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 600);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  //  clamp uniquement quand on quitte le champ
  const handleDurationBlur = () => {
    const raw = durationInput;

    if (raw === "" || raw == null) {
      setDurationInput(String(DEFAULT_DURATION));
      return;
    }

    const n = Number(raw);

    // invalide -> default
    if (!Number.isFinite(n)) {
      setDurationInput(String(DEFAULT_DURATION));
      return;
    }

    const fixed = clamp(Math.floor(n), MIN_DURATION, MAX_DURATION);
    setDurationInput(String(fixed));
  };

  const handleStart = () => {
    //  start with validated duration
    onStart?.(durationSec);
  };

  return (
    <div className="game-container">
      <div className="lobby-card">
        <div className="lobby-header">
          <h2 className={`room-title ${copied ? "copied" : ""}`}>Room:{room.roomId}</h2>

          <button
            className={`copy-btn ${copied ? "copied" : ""}`}
            onClick={copyRoomId}
            title="Copier l'ID"
            type="button"
          >
            {copied ? "✔" : "📋"}
          </button>
        </div>

        <div className="status-bar">
          STATUS:{" "}
          <span className={room.status === "WAITING" ? "blink" : ""}>{room.status}</span>
        </div>

        {/*  GAME TIME: host only */}
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
                onBlur={handleDurationBlur} 
              />
              <div className="time-badge">SEC</div>
            </div>

            <div className="time-hint">
              Min {MIN_DURATION}s · Max {MAX_DURATION}s
            </div>
          </div>
        )}

        <div className="players-list">
          <h3>PLAYERS ({players.length})</h3>
          <ul>
            {players.map((p) => (
              <li key={p.userId} className={p.userId === currentUserId ? "me" : ""}>
                <span className="player-icon">{p.userId === room.hostUserId ? "👑" : "🍄"}</span>
                {p.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="actions">
          {isHost && (
            <button
              className="retro-btn start-btn"
              disabled={players.length < 2}
              onClick={handleStart}
              type="button"
            >
              START GAME
            </button>
          )}

          <button onClick={onLeave} className="retro-btn leave-btn" type="button">
            EXIT ROOM
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;