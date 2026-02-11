// Mock Redis avec factory pour eviter le chargement reel (REDIS_URL)
jest.mock("../redis", () => ({
  getRoom: jest.fn(),
  getPlayers: jest.fn(),
  getPlayer: jest.fn(),
  setPlayerTeam: jest.fn(),
  setRoomStatus: jest.fn(),
  setRoomEndsAt: jest.fn(),
  setRoomChoosingEndsAt: jest.fn(),
  resetScores: jest.fn(),
  getScores: jest.fn(),
  incrScore: jest.fn(),
  getLastClickTs: jest.fn(),
  setLastClickTs: jest.fn(),
  resetPlayerScores: jest.fn(),
  getPlayerScore: jest.fn(),
  incrPlayerScore: jest.fn(),
  getAllPlayerScores: jest.fn(),
  setPlayerPower: jest.fn(),
  getPlayerPower: jest.fn(),
  resetPowers: jest.fn(),
  setPlayerOffers: jest.fn(),
  getPlayerOffers: jest.fn(),
  resetOffers: jest.fn(),
  incrClickCount: jest.fn(),
  resetClickCounts: jest.fn(),
}));

const gameRedis = require("../redis");
const { registerGameHandlers, stopRoomTimer } = require("../handlers");

// Helpers pour creer des mocks socket/io
function createMockSocket(userId = "user1", name = "Player1") {
  const handlers = {};
  const socket = {
    user: { userId, name },
    data: { currentRoomId: "room1" },
    on: jest.fn((event, handler) => {
      handlers[event] = handler;
    }),
    emit: jest.fn(),
  };
  return { socket, handlers };
}

function createMockIo() {
  const roomEmit = jest.fn();
  const mockSocket = { user: { userId: "user1" }, emit: jest.fn() };
  return {
    to: jest.fn(() => ({ emit: roomEmit })),
    in: jest.fn(() => ({ fetchSockets: jest.fn().mockResolvedValue([mockSocket]) })),
    _roomEmit: roomEmit,
    _mockSocket: mockSocket,
  };
}

// Room de base pour les tests
const BASE_ROOM = {
  roomId: "room1",
  hostUserId: "user1",
  status: "WAITING",
};

const BASE_PLAYER = { userId: "user1", name: "Player1", team: "A" };

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();

  // Defaults des mocks Redis
  gameRedis.getRoom.mockResolvedValue(BASE_ROOM);
  gameRedis.getPlayers.mockResolvedValue([BASE_PLAYER]);
  gameRedis.getPlayer.mockResolvedValue(BASE_PLAYER);
  gameRedis.getScores.mockResolvedValue({ A: 0, B: 0 });
  gameRedis.setRoomStatus.mockResolvedValue();
  gameRedis.setRoomEndsAt.mockResolvedValue();
  gameRedis.setRoomChoosingEndsAt.mockResolvedValue();
  gameRedis.resetScores.mockResolvedValue();
  gameRedis.resetPlayerScores.mockResolvedValue();
  gameRedis.resetPowers.mockResolvedValue();
  gameRedis.resetOffers.mockResolvedValue();
  gameRedis.resetClickCounts.mockResolvedValue();
  gameRedis.setPlayerPower.mockResolvedValue();
  gameRedis.getPlayerPower.mockResolvedValue(null);
  gameRedis.setPlayerOffers.mockResolvedValue();
  gameRedis.getPlayerOffers.mockResolvedValue(["double_impact", "bombe", "retardement"]);
  gameRedis.incrClickCount.mockResolvedValue(1);
  gameRedis.incrPlayerScore.mockResolvedValue(2);
  gameRedis.incrScore.mockResolvedValue(2);
  gameRedis.getLastClickTs.mockResolvedValue(null);
  gameRedis.setLastClickTs.mockResolvedValue();
});

afterEach(() => {
  jest.useRealTimers();
  stopRoomTimer("room1");
});

describe("game:start", () => {
  test("lance la partie avec phase de choix de 6 secondes", async () => {
    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:start"]({}, ack);

    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        roomId: "room1",
        choosingEndsAt: expect.any(Number),
        endsAt: expect.any(Number),
      })
    );

    const { choosingEndsAt, endsAt } = ack.mock.calls[0][0];
    expect(endsAt - choosingEndsAt).toBe(90_000);

    expect(gameRedis.setRoomStatus).toHaveBeenCalledWith("room1", "IN_GAME");
    expect(gameRedis.setRoomChoosingEndsAt).toHaveBeenCalled();
    expect(gameRedis.resetScores).toHaveBeenCalledWith("room1");
    expect(gameRedis.resetPlayerScores).toHaveBeenCalledWith("room1");
    expect(gameRedis.resetPowers).toHaveBeenCalledWith("room1");
    expect(gameRedis.resetOffers).toHaveBeenCalledWith("room1");
    expect(gameRedis.resetClickCounts).toHaveBeenCalledWith("room1");

    expect(io._roomEmit).toHaveBeenCalledWith(
      "game:choosing",
      expect.objectContaining({
        roomId: "room1",
        durationMs: 90_000,
      })
    );
  });

  test("genere 3 offres aleatoires par joueur", async () => {
    gameRedis.getPlayers.mockResolvedValue([
      { userId: "user1", name: "P1", team: "A" },
      { userId: "user2", name: "P2", team: "B" },
    ]);

    const io = createMockIo();
    io.in.mockReturnValue({
      fetchSockets: jest.fn().mockResolvedValue([
        { user: { userId: "user1" }, emit: jest.fn() },
        { user: { userId: "user2" }, emit: jest.fn() },
      ]),
    });

    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    await handlers["game:start"]({}, jest.fn());

    // setPlayerOffers appele pour chaque joueur
    expect(gameRedis.setPlayerOffers).toHaveBeenCalledTimes(2);

    // Verifie que les offres sont des tableaux de 3 pouvoirs valides
    const call1 = gameRedis.setPlayerOffers.mock.calls[0];
    expect(call1[0]).toBe("room1");
    expect(call1[1]).toBe("user1");
    expect(call1[2]).toHaveLength(3);
  });

  test("envoie game:offers a chaque socket individuellement", async () => {
    const s1 = { user: { userId: "user1" }, emit: jest.fn() };
    const io = createMockIo();
    io.in.mockReturnValue({ fetchSockets: jest.fn().mockResolvedValue([s1]) });

    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    await handlers["game:start"]({}, jest.fn());

    expect(s1.emit).toHaveBeenCalledWith("game:offers", {
      roomId: "room1",
      offers: expect.any(Array),
    });
  });

  test("refuse si pas le host", async () => {
    const io = createMockIo();
    const { socket, handlers } = createMockSocket("user2", "NotHost");
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:start"]({}, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: "FORBIDDEN_HOST_ONLY" });
  });

  test("refuse si room pas en WAITING", async () => {
    gameRedis.getRoom.mockResolvedValue({ ...BASE_ROOM, status: "IN_GAME" });

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:start"]({}, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: "ROOM_NOT_WAITING" });
  });

  test("refuse si room introuvable", async () => {
    gameRedis.getRoom.mockResolvedValue(null);

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:start"]({}, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: "ROOM_NOT_FOUND" });
  });
});

describe("game:choosePower", () => {
  test("enregistre le pouvoir choisi parmi les offres", async () => {
    const now = Date.now();
    gameRedis.getRoom.mockResolvedValue({
      ...BASE_ROOM,
      status: "IN_GAME",
      choosingEndsAt: String(now + 5000),
    });
    gameRedis.getPlayerOffers.mockResolvedValue(["bombe", "retardement", "furie_cyclique"]);

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:choosePower"]({ powerId: "bombe" }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: true, powerId: "bombe" });
    expect(gameRedis.setPlayerPower).toHaveBeenCalledWith("room1", "user1", "bombe");
  });

  test("refuse un pouvoir qui n'est pas dans les offres", async () => {
    const now = Date.now();
    gameRedis.getRoom.mockResolvedValue({
      ...BASE_ROOM,
      status: "IN_GAME",
      choosingEndsAt: String(now + 5000),
    });
    gameRedis.getPlayerOffers.mockResolvedValue(["bombe", "retardement", "furie_cyclique"]);

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:choosePower"]({ powerId: "double_impact" }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: "POWER_NOT_OFFERED" });
    expect(gameRedis.setPlayerPower).not.toHaveBeenCalled();
  });

  test("refuse apres la phase de choix", async () => {
    const now = Date.now();
    gameRedis.getRoom.mockResolvedValue({
      ...BASE_ROOM,
      status: "IN_GAME",
      choosingEndsAt: String(now - 1000),
    });

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:choosePower"]({ powerId: "bombe" }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: "CHOOSING_PHASE_ENDED" });
    expect(gameRedis.setPlayerPower).not.toHaveBeenCalled();
  });

  test("refuse un powerId invalide (validation Zod)", async () => {
    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:choosePower"]({ powerId: "fake_power" }, ack);

    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false })
    );
  });

  test("refuse si pas en jeu", async () => {
    gameRedis.getRoom.mockResolvedValue({ ...BASE_ROOM, status: "WAITING" });

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:choosePower"]({ powerId: "bombe" }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: "NOT_IN_GAME" });
  });
});

describe("game:click", () => {
  const IN_GAME_ROOM = {
    ...BASE_ROOM,
    status: "IN_GAME",
    choosingEndsAt: String(Date.now() - 10000),
    endsAt: String(Date.now() + 80000),
  };

  beforeEach(() => {
    gameRedis.getRoom.mockResolvedValue(IN_GAME_ROOM);
  });

  test("applique le pouvoir double_impact (x2)", async () => {
    gameRedis.getPlayerPower.mockResolvedValue("double_impact");
    gameRedis.incrPlayerScore.mockResolvedValue(2);

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:click"]({}, ack);

    expect(ack).toHaveBeenCalledWith({ ok: true, damage: 2 });
    expect(gameRedis.incrPlayerScore).toHaveBeenCalledWith("room1", "user1", 2);
    expect(gameRedis.incrScore).toHaveBeenCalledWith("room1", "A", 2);
  });

  test("utilise le premier pouvoir offert si aucun choisi", async () => {
    gameRedis.getPlayerPower.mockResolvedValue(null);
    gameRedis.getPlayerOffers.mockResolvedValue(["bombe", "retardement", "furie_cyclique"]);
    gameRedis.incrPlayerScore.mockResolvedValue(1);

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:click"]({}, ack);

    // Premier pouvoir offert = "bombe", clic 1 -> 1 degat
    expect(ack).toHaveBeenCalledWith({ ok: true, damage: 1 });
    expect(gameRedis.incrPlayerScore).toHaveBeenCalledWith("room1", "user1", 1);
  });

  test("fallback double_impact si pas d'offres ni de choix", async () => {
    gameRedis.getPlayerPower.mockResolvedValue(null);
    gameRedis.getPlayerOffers.mockResolvedValue(null);
    gameRedis.incrPlayerScore.mockResolvedValue(2);

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:click"]({}, ack);

    // Fallback = double_impact = 2 degats
    expect(ack).toHaveBeenCalledWith({ ok: true, damage: 2 });
  });

  test("applique le pouvoir bombe (65 au 50e clic)", async () => {
    gameRedis.getPlayerPower.mockResolvedValue("bombe");
    gameRedis.incrClickCount.mockResolvedValue(50);
    gameRedis.incrPlayerScore.mockResolvedValue(65);

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:click"]({}, ack);

    expect(ack).toHaveBeenCalledWith({ ok: true, damage: 65 });
    expect(gameRedis.incrPlayerScore).toHaveBeenCalledWith("room1", "user1", 65);
    expect(gameRedis.incrScore).toHaveBeenCalledWith("room1", "A", 65);
  });

  test("applique le pouvoir bombe (1 hors 50e clic)", async () => {
    gameRedis.getPlayerPower.mockResolvedValue("bombe");
    gameRedis.incrClickCount.mockResolvedValue(49);

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:click"]({}, ack);

    expect(ack).toHaveBeenCalledWith({ ok: true, damage: 1 });
  });

  test("refuse les clics pendant la phase de choix", async () => {
    gameRedis.getRoom.mockResolvedValue({
      ...BASE_ROOM,
      status: "IN_GAME",
      choosingEndsAt: String(Date.now() + 5000),
      endsAt: String(Date.now() + 95000),
    });

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:click"]({}, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: "CHOOSING_PHASE" });
    expect(gameRedis.incrPlayerScore).not.toHaveBeenCalled();
  });

  test("refuse si la partie est terminee", async () => {
    gameRedis.getRoom.mockResolvedValue({
      ...BASE_ROOM,
      status: "IN_GAME",
      choosingEndsAt: String(Date.now() - 100000),
      endsAt: String(Date.now() - 1000),
    });

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:click"]({}, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: "GAME_ALREADY_ENDED" });
  });

  test("rate limit (50ms entre clics)", async () => {
    gameRedis.getLastClickTs.mockResolvedValue(Date.now() - 10);

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:click"]({}, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, error: "RATE_LIMIT" });
  });

  test("diffuse le score a toute la room apres un clic", async () => {
    gameRedis.getPlayerPower.mockResolvedValue("double_impact");
    gameRedis.getScores.mockResolvedValue({ A: 10, B: 5 });

    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    const ack = jest.fn();
    await handlers["game:click"]({}, ack);

    expect(io.to).toHaveBeenCalledWith("room1");
    expect(io._roomEmit).toHaveBeenCalledWith("game:score:update", {
      roomId: "room1",
      scores: { A: 10, B: 5 },
    });

    expect(socket.emit).toHaveBeenCalledWith("game:personalScore:update", {
      roomId: "room1",
      userId: "user1",
      personalScore: expect.any(Number),
    });
  });

  test("incremente le compteur de clics bruts", async () => {
    const io = createMockIo();
    const { socket, handlers } = createMockSocket();
    registerGameHandlers(io, socket);

    await handlers["game:click"]({}, jest.fn());

    expect(gameRedis.incrClickCount).toHaveBeenCalledWith("room1", "user1");
  });
});
