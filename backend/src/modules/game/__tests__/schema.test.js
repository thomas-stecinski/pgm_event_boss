const { gameChoosePowerSchema, gameStartSchema, gameClickSchema } = require("../schema");

describe("gameChoosePowerSchema", () => {
  test("accepte un powerId valide", () => {
    const valid = [
      "double_impact",
      "rafale_instable",
      "bombe",
      "retardement",
      "chance_critique",
      "furie_cyclique",
    ];
    for (const powerId of valid) {
      const result = gameChoosePowerSchema.parse({ powerId });
      expect(result.powerId).toBe(powerId);
    }
  });

  test("accepte un roomId optionnel", () => {
    const result = gameChoosePowerSchema.parse({
      powerId: "bombe",
      roomId: "abc123",
    });
    expect(result.roomId).toBe("abc123");
    expect(result.powerId).toBe("bombe");
  });

  test("rejette un powerId invalide", () => {
    expect(() => gameChoosePowerSchema.parse({ powerId: "fake_power" })).toThrow();
  });

  test("rejette sans powerId", () => {
    expect(() => gameChoosePowerSchema.parse({})).toThrow();
  });

  test("rejette un roomId trop court", () => {
    expect(() =>
      gameChoosePowerSchema.parse({ powerId: "bombe", roomId: "ab" })
    ).toThrow();
  });
});

describe("gameStartSchema", () => {
  test("accepte un payload vide", () => {
    const result = gameStartSchema.parse({});
    expect(result.roomId).toBeUndefined();
  });

  test("accepte un roomId valide", () => {
    const result = gameStartSchema.parse({ roomId: "abc123" });
    expect(result.roomId).toBe("abc123");
  });
});

describe("gameClickSchema", () => {
  test("accepte un payload vide", () => {
    const result = gameClickSchema.parse({});
    expect(result.roomId).toBeUndefined();
  });
});
