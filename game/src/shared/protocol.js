// Wire protocol shared by client and server. Messages are small JSON objects
// tagged with `t`. Snapshots carry only what the renderer needs, keeping
// bandwidth low enough for mobile networks.

export const MSG = {
  // client -> server
  JOIN: 'join',
  INPUT: 'input',
  ADD_BOT: 'addBot',
  REMOVE_BOT: 'removeBot',
  RESTART: 'restart',
  PING: 'ping',
  // server -> client
  WELCOME: 'welcome',
  STATE: 'state',
  PONG: 'pong',
};

// Produce a compact, JSON-serializable snapshot of the world for clients.
export function snapshot(world) {
  const players = {};
  for (const id in world.players) {
    const p = world.players[id];
    players[id] = {
      id: p.id,
      name: p.name,
      x: round(p.x),
      y: round(p.y),
      vx: round(p.vx),
      vy: round(p.vy),
      facing: p.facing,
      health: p.health,
      lives: p.lives,
      score: p.score,
      alive: p.alive,
      invuln: round(p.invuln),
      dashTimer: round(p.dashTimer),
      onGround: p.onGround,
      isBot: p.isBot,
      reachedGoal: !!p.reachedGoal,
    };
  }
  return {
    tick: world.tick,
    status: world.status,
    winnerId: world.winnerId,
    players,
    enemies: world.enemies.map((e) => ({
      id: e.id,
      x: round(e.x),
      y: round(e.y),
      alive: e.alive,
    })),
    pickups: world.pickups
      .filter((c) => !c.collected)
      .map((c) => ({ id: c.id, x: c.x, y: c.y, kind: c.kind })),
    projectiles: world.projectiles.map((pr) => ({
      id: pr.id,
      x: round(pr.x),
      y: round(pr.y),
    })),
  };
}

function round(n) {
  // Two decimals is plenty of precision for rendering and keeps JSON small.
  return Math.round(n * 100) / 100;
}

export function encode(msg) {
  return JSON.stringify(msg);
}

export function decode(data) {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Normalize any client-supplied input into exactly the five booleans the engine
// understands — never trust raw network data.
export function sanitizeInput(raw) {
  const r = raw || {};
  return {
    left: !!r.left,
    right: !!r.right,
    jump: !!r.jump,
    dash: !!r.dash,
    shoot: !!r.shoot,
  };
}
