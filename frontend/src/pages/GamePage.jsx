import React, { useEffect, useState, useRef } from "react";
import "./GamePage.css";
import MarioImg from "../assets/Mario.png";
import BowserImg from "../assets/Bowser.png";

const POWER_DETAILS = {
  double_impact: { label: "DOUBLE IMPACT", icon: "💥", desc: "Dégâts constants x2" },
  rafale_instable: { label: "RAFALE", icon: "🎲", desc: "Dégâts aléatoires (0-5)" },
  bombe: { label: "BOMBE", icon: "💣", desc: "50 clics = BOOM (65 dmg)" },
  retardement: { label: "RETARDEMENT", icon: "⏳", desc: "x4 dégâts après 60%" },
  chance_critique: { label: "CRITIQUE", icon: "🎯", desc: "10% chance de x15" },
  furie_cyclique: { label: "FURIE", icon: "🌀", desc: "Cycle: -1, 0, 1... 5" },
  default: { label: "NORMAL", icon: "👊", desc: "Dégâts classiques" }
};

const GamePage = ({ socket, roomData, currentUser, onBack, initialOffers }) => {
  const [phase, setPhase] = useState("CHOOSING");
  const [timer, setTimer] = useState(0);
  const [scores, setScores] = useState({ A: 0, B: 0 });
  const [personalScore, setPersonalScore] = useState(0);
  
  const [offers, setOffers] = useState(initialOffers || []);
  const [selectedPower, setSelectedPower] = useState("double_impact"); 
  const [hasChosen, setHasChosen] = useState(false);
  const [result, setResult] = useState(null);

  // État pour gérer les erreurs de connexion
  const [connectionError, setConnectionError] = useState(null);

  // Synchronisation des offres (Props -> State)
  useEffect(() => {
    if (initialOffers && initialOffers.length > 0) {
      setOffers(initialOffers);
    }
  }, [initialOffers]);

  useEffect(() => {
    if (!socket) {
      setConnectionError("Socket non initialisé.");
      return;
    }

    // --- LISTENERS JEU ---
    const handleOffers = (data) => setOffers(data.offers || []);
    
    socket.on("game:offers", handleOffers);
    socket.on("game:play", () => setPhase("PLAYING"));
    
    socket.on("game:timer", (data) => {
      setTimer(data.timeLeftMs);
      if (data.phase && data.phase !== phase) setPhase(data.phase);
    });

    socket.on("game:score:update", (d) => setScores(d.scores));
    socket.on("game:personalScore:update", (d) => setPersonalScore(d.personalScore));
    socket.on("game:end", (d) => {
      setPhase("ENDED");
      setResult({ winner: d.winner, finalScores: d.scores });
    });

    // --- ✅ LISTENERS CONNEXION (Gestion des pannes) ---
    
    // 1. Déconnexion brutale (Internet coupé, Serveur crashé)
    socket.on("disconnect", (reason) => {
      console.warn("Déconnexion détectée:", reason);
      let msg = "Connexion perdue...";
      if (reason === "io server disconnect") msg = "Le serveur a fermé la connexion.";
      if (reason === "transport close") msg = "Le serveur ne répond plus.";
      
      setConnectionError(msg);
    });

    // 2. Erreur de connexion (Tentative de reconnexion échouée)
    socket.on("connect_error", (err) => {
      console.error("Erreur de connexion:", err.message);
      setConnectionError("Impossible de rejoindre le serveur.");
    });

    // 3. Reconnexion réussie (Ouf !)
    socket.on("connect", () => {
      console.log("Reconnexion réussie !");
      setConnectionError(null); // On enlève le message d'erreur
      // Optionnel : redemander l'état du jeu au serveur ici si nécessaire
    });

    return () => {
      socket.off("game:offers", handleOffers);
      socket.off("game:play");
      socket.off("game:timer");
      socket.off("game:score:update");
      socket.off("game:personalScore:update");
      socket.off("game:end");
      
      // Nettoyage listeners connexion
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("connect");
    };
  }, [socket, phase]);

  const handleChoosePower = (powerId) => {
    if (hasChosen || connectionError) return; // Bloquer si erreur

    socket.emit("game:choosePower", { roomId: roomData.room.roomId, powerId }, (ack) => {
      if (ack?.ok) {
        setSelectedPower(powerId);
        setHasChosen(true);
      }
    });
  };

  const handleClick = (e) => {
    // Si pas en jeu ou si erreur de connexion, on ne clique pas
    if (phase !== "PLAYING" || connectionError) return;

    createClickEffect(e.clientX, e.clientY);
    socket.emit("game:click", { roomId: roomData.room.roomId }, () => {});
  };

  const createClickEffect = (x, y) => {
    const el = document.createElement("div");
    el.className = "click-feedback";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.innerText = "POW!";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);
  };

  // Gestionnaire pour le bouton Quitter/Abandonner
  const handleQuit = (e) => {
    e.stopPropagation(); // Empêche de déclencher un clic de jeu
    // On force le retour même si le socket est mort
    onBack(); 
  };

  // --- RENDER ---
  const totalScore = scores.A + scores.B;
  const percentA = totalScore === 0 ? 50 : (scores.A / totalScore) * 100;
  const secondsLeft = Math.ceil(timer / 1000);
  const activePowerInfo = POWER_DETAILS[selectedPower] || POWER_DETAILS["default"];

  return (
    <div className="game-container game-page" onClick={handleClick}>
      
      {/* BOUTON QUIT PERMANENT (En haut à droite) */}
      <button className="quit-btn" onClick={handleQuit} title="Abandonner la partie">
        EXIT ✖
      </button>

      {/* HUD HAUT */}
      <div className="hud-top">
        <div className="score-box team-a">
          <span>MARIO</span><span className="score-val">{scores.A}</span>
        </div>
        <div className="progress-container">
          <div className="progress-bar-fill team-a-bg" style={{ width: `${percentA}%` }} />
          <div className="progress-bar-fill team-b-bg" style={{ width: `${100 - percentA}%` }} />
          <div className="progress-divider" style={{ left: `${percentA}%` }}></div>
        </div>
        <div className="score-box team-b">
          <span>BOWSER</span><span className="score-val">{scores.B}</span>
        </div>
      </div>

      <img src={MarioImg} alt="Mario" className="char-img char-left" />
      <img src={BowserImg} alt="Bowser" className="char-img char-right" />

      {/* HUD CENTRE */}
      <div className="hud-center">
        <div className="timer-box">
          {phase === "CHOOSING" ? "CHOOSE!" : "TIME"}
          <div className="timer-val">{secondsLeft}s</div>
        </div>

        {phase === "PLAYING" && (
          <div className="active-power-indicator">
            <div className="power-icon-sm">{activePowerInfo.icon}</div>
            <div className="power-info-col">
              <div className="power-label-sm">{activePowerInfo.label}</div>
              <div className="power-desc-sm">{activePowerInfo.desc}</div>
            </div>
          </div>
        )}

        <div className="personal-score-box">CLICKS: {personalScore}</div>
      </div>

      {/* OVERLAY CHOOSING */}
      {phase === "CHOOSING" && !connectionError && (
        <div className="overlay choosing-overlay">
          <h2>CHOOSE POWER</h2>
          <div className="cards-container">
            {offers.length === 0 && <p>Loading powers...</p>}
            {offers.map((powerId) => {
              const details = POWER_DETAILS[powerId] || POWER_DETAILS["default"];
              const isSelected = selectedPower === powerId && hasChosen;
              return (
                <button 
                  key={powerId} 
                  className={`power-card ${isSelected ? "selected" : ""}`}
                  onClick={(e) => { e.stopPropagation(); handleChoosePower(powerId); }}
                  disabled={hasChosen}
                >
                  <div className="power-icon">{details.icon}</div>
                  <div className="power-label">{details.label}</div>
                  <div className="power-desc">{details.desc}</div>
                </button>
              );
            })}
          </div>
          <div className="timer-bar-container">
             <div className="timer-bar-fill"></div>
          </div>
        </div>
      )}

      {/* OVERLAY ENDED */}
      {phase === "ENDED" && result && !connectionError && (
        <div className="overlay end-overlay">
          <h1>GAME OVER</h1>
          <h2 className="winner-announce">{result.winner === "DRAW" ? "DRAW!" : `WINNER: ${result.winner}`}</h2>
          <div className="final-scores">
             <p>MARIO: {result.finalScores.A}</p>
             <p>BOWSER: {result.finalScores.B}</p>
          </div>
          <button className="retro-btn" onClick={onBack}>LOBBY</button>
        </div>
      )}

      {/* OVERLAY ERREUR DE CONNEXION (Prioritaire sur tout le reste) */}
      {connectionError && (
        <div className="overlay error-overlay">
          <div className="error-box">
            <h1>⚠️ ERROR ⚠️</h1>
            <p className="error-msg">{connectionError}</p>
            <div className="error-loader">Reconnexion en cours...</div>
            
            <button className="retro-btn quit-force-btn" onClick={handleQuit}>
              ABANDONNER / QUITTER
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default GamePage;