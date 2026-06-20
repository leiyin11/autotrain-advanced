// Visual juice: a lightweight particle system + screen shake, plus a pure event
// detector that derives "things just happened" by diffing two world states.
// detectEvents works for both the offline engine world and online snapshots, so
// audio and particles are driven the same way in both modes.

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shake = 0;
  }

  burst(x, y, { count = 12, color = '#ffd166', speed = 180, life = 0.5, gravity = 600 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.3,
        life,
        max: life,
        color,
        r: 2 + Math.random() * 2.5,
        gravity,
      });
    }
  }

  addShake(amount) {
    this.shake = Math.min(this.shake + amount, 26);
  }

  update(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.shake = Math.max(0, this.shake - 60 * dt);
  }
}

function activePickups(w) {
  const m = new Map();
  for (const c of w.pickups || []) {
    if (!c.collected) m.set(c.id, c);
  }
  return m;
}

function aliveEnemies(w) {
  const m = new Map();
  for (const e of w.enemies || []) {
    if (e.alive !== false) m.set(e.id, e);
  }
  return m;
}

// Diff two world/snapshot states and return a list of gameplay events worth
// reacting to. Pure — no side effects — so it is straightforward to unit test.
export function detectEvents(prev, curr) {
  const events = [];
  if (!prev || !curr) return events;

  const pPick = activePickups(prev);
  const cPick = activePickups(curr);
  for (const [id, c] of pPick) {
    if (!cPick.has(id)) {
      events.push({ type: 'coin', kind: c.kind, x: c.x + 10, y: c.y + 10 });
    }
  }

  const pEn = aliveEnemies(prev);
  const cEn = aliveEnemies(curr);
  for (const [id, e] of pEn) {
    if (!cEn.has(id)) events.push({ type: 'enemy', x: e.x + 16, y: e.y + 16 });
  }

  for (const id in curr.players) {
    const cp = curr.players[id];
    const pp = prev.players[id];
    if (pp && cp.health < pp.health) {
      events.push({ type: 'hurt', id, x: cp.x + 14, y: cp.y + 20 });
    }
  }

  if (prev.status !== 'won' && curr.status === 'won') {
    const w = curr.players[curr.winnerId];
    events.push({ type: 'win', x: w ? w.x : 0, y: w ? w.y : 0 });
  }
  return events;
}
