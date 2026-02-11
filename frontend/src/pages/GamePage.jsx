import { useEffect, useState } from "react";
import "./GamePage.css";
import MarioImg from "../assets/Mario.png";
import BowserImg from "../assets/Bowser.png";
import imgChampignon from "../assets/champignon-mario.webp";
import imgCycle from "../assets/cycle-mario.webp";
import imgBombe from "../assets/bombe-mario.jpg";
import imgEtoile from "../assets/etoile-mario.webp";
import imgCarapace from "../assets/carapace-bleu.webp";
import imgFurie from "../assets/furie-mario.webp";

const POWER_DETAILS = {
  double_impact: { label: "DOUBLE IMPACT", img: imgChampignon, desc: "D\u00e9g\u00e2ts constants x2" },
  rafale_instable: { label: "RAFALE", img: imgCycle, desc: "D\u00e9g\u00e2ts al\u00e9atoires (0-5)" },
  bombe: { label: "BOMBE", img: imgBombe, desc: "50 clics = BOOM (65 dmg)" },
  retardement: { label: "RETARDEMENT", img: imgEtoile, desc: "x4 d\u00e9g\u00e2ts apr\u00e8s 60%" },
  chance_critique: { label: "CRITIQUE", img: imgCarapace, desc: "10% chance de x15" },
  furie_cyclique: { label: "FURIE", img: imgFurie, desc: "Cycle: -1, 0, 1... 5" },
  default: { label: "NORMAL", img: null, desc: "D\u00e9g\u00e2ts classiques" }
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

  // Scores individuels de tous les joueurs { [userId]: { name, team, personalScore, clickCount } }
  const [playerScores, setPlayerScores] = useState({});

  const [connectionError, setConnectionError] = useState(null);

  // Determiner ma team
  const myTeam = (() => {
    if (!roomData?.players || !currentUser) return "A";
    const me = roomData.players.find(p => p.userId === currentUser.userId);
    return me?.team || "A";
  })();

  // Synchronisation des offres (Props -> State)
  useEffect(() => {
    if (initialOffers && initialOffers.length > 0) {
      setOffers(initialOffers);
    }
  }, [initialOffers]);

  useEffect(() => {
    if (!socket) {
      setConnectionError("Socket non initialis\u00e9.");
      return;
    }

    const handleOffers = (data) => setOffers(data.offers || []);

    socket.on("game:offers", handleOffers);
    socket.on("game:play", () => setPhase("PLAYING"));

    socket.on("game:timer", (data) => {
      setTimer(data.timeLeftMs);
      if (data.phase && data.phase !== phase) setPhase(data.phase);
    });

    socket.on("game:score:update", (d) => setScores(d.scores));
    socket.on("game:personalScore:update", (d) => setPersonalScore(d.personalScore));

    socket.on("game:playerClick", (d) => {
      setPlayerScores(prev => ({
        ...prev,
        [d.userId]: {
          name: d.name,
          team: d.team,
          personalScore: d.personalScore,
          clickCount: d.clickCount,
        }
      }));

      // Afficher un clic flottant pour les AUTRES joueurs
      if (d.userId !== currentUser?.userId) {
        const isAlly = d.team === myTeam;
        createOtherPlayerClickEffect(d.damage, isAlly);
      }
    });

    socket.on("game:end", (d) => {
      setPhase("ENDED");
      setResult({ winner: d.winner, finalScores: d.scores });
    });

    socket.on("disconnect", (reason) => {
      let msg = "Connexion perdue...";
      if (reason === "io server disconnect") msg = "Le serveur a ferm\u00e9 la connexion.";
      if (reason === "transport close") msg = "Le serveur ne r\u00e9pond plus.";
      setConnectionError(msg);
    });

    socket.on("connect_error", () => {
      setConnectionError("Impossible de rejoindre le serveur.");
    });

    socket.on("connect", () => {
      setConnectionError(null);
    });

    return () => {
      socket.off("game:offers", handleOffers);
      socket.off("game:play");
      socket.off("game:timer");
      socket.off("game:score:update");
      socket.off("game:personalScore:update");
      socket.off("game:playerClick");
      socket.off("game:end");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("connect");
    };
  }, [socket, phase]);

  const handleChoosePower = (powerId) => {
    if (connectionError) return;

    socket.emit("game:choosePower", { roomId: roomData.room.roomId, powerId }, (ack) => {
      if (ack?.ok) {
        setSelectedPower(powerId);
        setHasChosen(true);
      }
    });
  };

  const handleClick = (e) => {
    if (phase !== "PLAYING" || connectionError) return;

    socket.emit("game:click", { roomId: roomData.room.roomId }, (ack) => {
      if (ack?.ok) {
        createClickEffect(e.clientX, e.clientY, ack.damage, ack.powerId);
      }
    });
  };

  const createClickEffect = (x, y, damage, powerId) => {
    const el = document.createElement("div");
    el.className = "click-feedback";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    if (powerId === "chance_critique" && damage === 15) {
      el.innerText = "CRIT";
      el.classList.add("crit-effect");
    } else if (powerId === "bombe" && damage === 65) {
      el.innerText = "BOOM";
      el.classList.add("boom-effect");
    } else {
      el.innerText = damage >= 0 ? `+${damage}` : `${damage}`;
    }

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);
  };

  const createOtherPlayerClickEffect = (damage, isAlly) => {
    const el = document.createElement("div");
    el.className = `click-feedback other-click ${isAlly ? "ally-click" : "enemy-click"}`;
    // Position aleatoire sur l'ecran
    const x = Math.random() * (window.innerWidth - 100) + 50;
    const y = Math.random() * (window.innerHeight - 200) + 100;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.innerText = damage >= 0 ? `+${damage}` : `${damage}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 500);
  };

  const handleQuit = (e) => {
    e.stopPropagation();
    onBack();
  };

  // --- COMPUTED ---
  const totalScore = scores.A + scores.B;
  const secondsLeft = Math.ceil(timer / 1000);
  const activePowerInfo = POWER_DETAILS[selectedPower] || POWER_DETAILS["default"];

  // Mario (A) toujours a gauche, Bowser (B) toujours a droite
  const percentA = totalScore === 0 ? 50 : (scores.A / totalScore) * 100;
  const labelA = myTeam === "A" ? "Your team" : "Challenger";
  const labelB = myTeam === "B" ? "Your team" : "Challenger";
  const labelClassA = myTeam === "A" ? "your-team" : "challenger";
  const labelClassB = myTeam === "B" ? "your-team" : "challenger";

  // Leaderboard : top 10 joueurs tries par score, melange des 2 equipes
  const leaderboard = Object.entries(playerScores)
    .map(([uid, p]) => ({ uid, ...p }))
    .sort((a, b) => b.personalScore - a.personalScore)
    .slice(0, 10);

  return (
    <div className="game-container game-page" onClick={handleClick}>

      {/* BOUTON QUIT */}
      <button className="quit-btn" onClick={handleQuit} title="Abandonner la partie">
        EXIT
      </button>

      {/* HUD HAUT : ligne 1 = scores + barre */}
      <div className="hud-top">
        <div className="hud-row-1">
          <div className="score-box team-a">
            <span>MARIO</span>
            <span className="score-val">{scores.A}</span>
            <span className={`team-label ${labelClassA}`}>{labelA}</span>
          </div>

          <div className="progress-container">
            <div className="progress-bar-fill team-a-bg" style={{ width: `${percentA}%` }} />
            <div className="progress-bar-fill team-b-bg" style={{ width: `${100 - percentA}%` }} />
            <div className="progress-divider" style={{ left: `${percentA}%` }}></div>
          </div>

          <div className="score-box team-b">
            <span>BOWSER</span>
            <span className="score-val">{scores.B}</span>
            <span className={`team-label ${labelClassB}`}>{labelB}</span>
          </div>
        </div>

        {/* ligne 2 = timer centre */}
        <div className="hud-row-2">
          <div className="timer-box">
            {phase === "CHOOSING" ? "CHOOSE!" : secondsLeft + "s"}
          </div>
        </div>
      </div>

      <img src={MarioImg} alt="Mario" className="char-img char-left" />
      <img src={BowserImg} alt="Bowser" className="char-img char-right" />

      {/* ZONE GAUCHE : mon pouvoir + mes clics */}
      {phase === "PLAYING" && (
        <div className="hud-left">
          <div className="active-power-indicator">
            {activePowerInfo.img && <img src={activePowerInfo.img} alt={activePowerInfo.label} className="power-img-sm" />}
            <div className="power-info-col">
              <div className="power-label-sm">{activePowerInfo.label}</div>
              <div className="power-desc-sm">{activePowerInfo.desc}</div>
            </div>
          </div>
        </div>
      )}

      {/* ZONE DROITE : mini leaderboard */}
      {phase === "PLAYING" && (
        <div className="hud-right">
          <div className="leaderboard">
            <div className="lb-my-score">
              <span className="lb-my-label">MY SCORE</span>
              <span className="lb-my-val">{personalScore}</span>
            </div>
            <div className="lb-list">
              {leaderboard.map((p, i) => {
                const isMe = p.uid === currentUser?.userId;
                const isAlly = p.team === myTeam;
                return (
                  <div
                    key={p.uid}
                    className={`lb-row ${isMe ? "lb-row-me" : ""}`}
                  >
                    <span className="lb-rank">{i + 1}.</span>
                    <span className={`lb-name ${isAlly ? "green-text" : "red-text"} ${isMe ? "lb-me-bold" : ""}`}>
                      {p.name}
                    </span>
                    <span className={`lb-score ${isAlly ? "green-text" : "red-text"} ${isMe ? "lb-me-bold" : ""}`}>
                      {p.personalScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
                >
                  {details.img && <img src={details.img} alt={details.label} className="power-card-img" />}
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
          <h2 className="winner-announce">{result.winner === "DRAW" ? "DRAW!" : `WINNER: ${result.winner === myTeam ? "YOUR TEAM" : "CHALLENGER"}`}</h2>
          <div className="final-scores">
             <p>MARIO: {result.finalScores.A}</p>
             <p>BOWSER: {result.finalScores.B}</p>
          </div>
          <button className="retro-btn" onClick={onBack}>LOBBY</button>
        </div>
      )}

      {/* OVERLAY ERREUR */}
      {connectionError && (
        <div className="overlay error-overlay">
          <div className="error-box">
            <h1>ERROR</h1>
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
