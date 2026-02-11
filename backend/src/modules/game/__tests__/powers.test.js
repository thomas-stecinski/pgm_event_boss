const { calculateDamage, POWERS, POWER_IDS, DEFAULT_POWER, getRandomOffers } = require("../powers");

describe("powers module", () => {
  test("exporte les 6 pouvoirs", () => {
    expect(POWER_IDS).toHaveLength(6);
    expect(POWER_IDS).toContain("double_impact");
    expect(POWER_IDS).toContain("rafale_instable");
    expect(POWER_IDS).toContain("bombe");
    expect(POWER_IDS).toContain("retardement");
    expect(POWER_IDS).toContain("chance_critique");
    expect(POWER_IDS).toContain("furie_cyclique");
  });

  test("chaque pouvoir a un nom et une description", () => {
    for (const id of POWER_IDS) {
      expect(POWERS[id].name).toBeTruthy();
      expect(POWERS[id].desc).toBeTruthy();
    }
  });

  test("DEFAULT_POWER est double_impact", () => {
    expect(DEFAULT_POWER).toBe("double_impact");
  });
});

describe("calculateDamage", () => {
  describe("double_impact", () => {
    test("retourne toujours 2", () => {
      expect(calculateDamage("double_impact", 1, 0)).toBe(2);
      expect(calculateDamage("double_impact", 50, 0.5)).toBe(2);
      expect(calculateDamage("double_impact", 100, 1)).toBe(2);
    });
  });

  describe("rafale_instable", () => {
    test("retourne un entier entre 0 et 5", () => {
      for (let i = 0; i < 100; i++) {
        const dmg = calculateDamage("rafale_instable", i + 1, 0.5);
        expect(dmg).toBeGreaterThanOrEqual(0);
        expect(dmg).toBeLessThanOrEqual(5);
        expect(Number.isInteger(dmg)).toBe(true);
      }
    });
  });

  describe("bombe", () => {
    test("retourne 1 pour les clics normaux", () => {
      expect(calculateDamage("bombe", 1, 0)).toBe(1);
      expect(calculateDamage("bombe", 49, 0)).toBe(1);
      expect(calculateDamage("bombe", 51, 0)).toBe(1);
    });

    test("retourne 65 tous les 50 clics", () => {
      expect(calculateDamage("bombe", 50, 0)).toBe(65);
      expect(calculateDamage("bombe", 100, 0)).toBe(65);
      expect(calculateDamage("bombe", 150, 0.5)).toBe(65);
    });
  });

  describe("retardement", () => {
    test("retourne 1 avant 60% du temps", () => {
      expect(calculateDamage("retardement", 1, 0)).toBe(1);
      expect(calculateDamage("retardement", 1, 0.3)).toBe(1);
      expect(calculateDamage("retardement", 1, 0.59)).toBe(1);
    });

    test("retourne 4 a partir de 60% du temps", () => {
      expect(calculateDamage("retardement", 1, 0.6)).toBe(4);
      expect(calculateDamage("retardement", 1, 0.8)).toBe(4);
      expect(calculateDamage("retardement", 1, 1.0)).toBe(4);
    });
  });

  describe("chance_critique", () => {
    test("retourne 1 ou 15 uniquement", () => {
      for (let i = 0; i < 200; i++) {
        const dmg = calculateDamage("chance_critique", i + 1, 0.5);
        expect([1, 15]).toContain(dmg);
      }
    });

    test("produit des critiques sur un grand echantillon", () => {
      let crits = 0;
      const N = 10000;
      for (let i = 0; i < N; i++) {
        if (calculateDamage("chance_critique", i + 1, 0.5) === 15) crits++;
      }
      // 8% +/- marge (entre 4% et 12%)
      expect(crits / N).toBeGreaterThan(0.04);
      expect(crits / N).toBeLessThan(0.12);
    });
  });

  describe("furie_cyclique", () => {
    test("suit le cycle [-1, 0, 1, 2, 3, 4, 5]", () => {
      const expected = [-1, 0, 1, 2, 3, 4, 5];
      for (let i = 1; i <= 14; i++) {
        expect(calculateDamage("furie_cyclique", i, 0)).toBe(expected[(i - 1) % 7]);
      }
    });

    test("le cycle se repete correctement", () => {
      // clic 1 -> index 0 -> -1
      expect(calculateDamage("furie_cyclique", 1, 0)).toBe(-1);
      // clic 8 -> index 0 -> -1 (nouveau cycle)
      expect(calculateDamage("furie_cyclique", 8, 0)).toBe(-1);
      // clic 7 -> index 6 -> 5
      expect(calculateDamage("furie_cyclique", 7, 0)).toBe(5);
    });
  });

  describe("pouvoir inconnu", () => {
    test("retourne 1 par defaut", () => {
      expect(calculateDamage("inexistant", 1, 0)).toBe(1);
      expect(calculateDamage(undefined, 1, 0)).toBe(1);
    });
  });
});

describe("getRandomOffers", () => {
  test("retourne 3 pouvoirs par defaut", () => {
    const offers = getRandomOffers();
    expect(offers).toHaveLength(3);
  });

  test("retourne le nombre demande", () => {
    expect(getRandomOffers(2)).toHaveLength(2);
    expect(getRandomOffers(5)).toHaveLength(5);
  });

  test("ne contient que des pouvoirs valides", () => {
    for (let i = 0; i < 50; i++) {
      const offers = getRandomOffers(3);
      for (const id of offers) {
        expect(POWER_IDS).toContain(id);
      }
    }
  });

  test("pas de doublons", () => {
    for (let i = 0; i < 50; i++) {
      const offers = getRandomOffers(3);
      const unique = new Set(offers);
      expect(unique.size).toBe(offers.length);
    }
  });

  test("les offres varient entre appels (aleatoire)", () => {
    const results = new Set();
    for (let i = 0; i < 50; i++) {
      results.add(getRandomOffers(3).join(","));
    }
    // Sur 50 tirages de 3 parmi 6, on attend plus d'une combinaison
    expect(results.size).toBeGreaterThan(1);
  });
});
