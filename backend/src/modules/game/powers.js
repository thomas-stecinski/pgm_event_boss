const POWERS = {
  double_impact: {
    name: "Double Impact",
    desc: "Chaque clic inflige x2 degats",
  },
  rafale_instable: {
    name: "Rafale Instable",
    desc: "Chaque clic inflige entre 0 et 5 degats aleatoires",
  },
  bombe: {
    name: "Bombe",
    desc: "Tous les 50 clics, explosion de 75 degats",
  },
  retardement: {
    name: "Retardement",
    desc: "x4 degats apres 60% du temps ecoule",
  },
  chance_critique: {
    name: "Chance Critique",
    desc: "8% de chance d'infliger 15 degats",
  },
  furie_cyclique: {
    name: "Furie Cyclique",
    desc: "Degats en boucle : -1, 0, 1, 2, 3, 4, 5",
  },
  apoutchou: {
    name: "Apoutchou",
    desc: "Plus l'ecart entre 2 clics est grand, plus le clic est fort (+2 par 0,1s)",
  },
  all_in: {
    name: "All In",
    desc: "1 clic = 0.5 pts en moyenne, 1% chance de 5000 pts d'un coup",
  },
  tanaland: {
    name: "Tanaland",
    desc: "Tous les 69 clics, +1 degat permanent au clic",
  },
  prince: {
    name: "Prince",
    desc: "Gagne 40 pts automatiquement toutes les 5s (vole aux pauvres)",
  },
};

const POWER_IDS = Object.keys(POWERS);

const DEFAULT_POWER = "double_impact";

const FURIE_CYCLE = [-1, 0, 1, 2, 3, 4, 5];

/**
 * Calcule les degats infliges par un clic selon le pouvoir du joueur.
 * Tout est calcule cote serveur (anti-triche).
 *
 * @param {string} powerId - ID du pouvoir
 * @param {number} clickCount - Nombre de clics effectues par le joueur (apres increment)
 * @param {number} gameProgress - Progression du jeu entre 0 et 1
 * @param {number} lastClickGapMs - Ecart en ms depuis le dernier clic (0 si premier clic)
 * @returns {number} degats infliges
 */
function calculateDamage(powerId, clickCount, gameProgress, lastClickGapMs = 0) {
  switch (powerId) {
    case "double_impact":
      return 2;

    case "rafale_instable":
      return Math.floor(Math.random() * 6); // 0 a 5

    case "bombe":
      return clickCount % 50 === 0 ? 75 : 1;

    case "retardement":
      return gameProgress >= 0.6 ? 4 : 1;

    case "chance_critique":
      return Math.random() < 0.10 ? 15 : 1;

    case "furie_cyclique":
      return FURIE_CYCLE[(clickCount - 1) % FURIE_CYCLE.length];

    case "apoutchou":
      return Math.max(2, Math.floor(lastClickGapMs / 50));

    case "all_in":
      if (Math.random() < 0.01) return 5000;
      return clickCount % 2 === 0 ? 1 : 0; // moyenne 0.5 pts

    case "tanaland":
      return 1 + Math.floor(clickCount / 69); // +1 degat tous les 69 clics

    case "prince":
      return 1; // clic normal, le passif est gere par le timer

    default:
      return 1;
  }
}

/**
 * Tire N pouvoirs aleatoires parmi les 6 disponibles (sans doublon).
 * Utilise Fisher-Yates shuffle sur une copie du tableau.
 */
function getRandomOffers(count = 3) {
  const shuffled = [...POWER_IDS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

module.exports = { POWERS, POWER_IDS, DEFAULT_POWER, calculateDamage, getRandomOffers };
