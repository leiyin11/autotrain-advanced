import { describe, it, expect } from 'vitest';
import { ParticleSystem, detectEvents } from '../src/client/effects.js';

describe('ParticleSystem', () => {
  it('spawns the requested number of particles', () => {
    const ps = new ParticleSystem();
    ps.burst(0, 0, { count: 10 });
    expect(ps.particles.length).toBe(10);
  });

  it('ages and removes dead particles', () => {
    const ps = new ParticleSystem();
    ps.burst(0, 0, { count: 5, life: 0.1 });
    ps.update(0.05);
    expect(ps.particles.length).toBe(5);
    ps.update(0.1); // total 0.15 > 0.1 life
    expect(ps.particles.length).toBe(0);
  });

  it('decays screen shake toward zero and clamps the max', () => {
    const ps = new ParticleSystem();
    ps.addShake(100);
    expect(ps.shake).toBe(26); // clamped
    ps.update(0.5);
    expect(ps.shake).toBeLessThan(26);
    ps.update(10);
    expect(ps.shake).toBe(0);
  });
});

describe('detectEvents', () => {
  const base = {
    players: { p1: { x: 0, y: 0, health: 3 } },
    enemies: [{ id: 'e1', x: 50, y: 0, alive: true }],
    pickups: [{ id: 'c1', x: 10, y: 10, kind: 'coin' }],
    status: 'playing',
    winnerId: null,
  };

  it('detects a collected coin', () => {
    const next = { ...base, pickups: [] };
    const ev = detectEvents(base, next);
    expect(ev.some((e) => e.type === 'coin')).toBe(true);
  });

  it('detects an enemy death', () => {
    const next = { ...base, enemies: [{ id: 'e1', x: 50, y: 0, alive: false }] };
    const ev = detectEvents(base, next);
    expect(ev.some((e) => e.type === 'enemy')).toBe(true);
  });

  it('detects a player taking damage', () => {
    const next = { ...base, players: { p1: { x: 0, y: 0, health: 2 } } };
    const ev = detectEvents(base, next);
    expect(ev.find((e) => e.type === 'hurt').id).toBe('p1');
  });

  it('detects a win transition exactly once', () => {
    const won = { ...base, status: 'won', winnerId: 'p1' };
    expect(detectEvents(base, won).some((e) => e.type === 'win')).toBe(true);
    // Already won -> not re-fired.
    expect(detectEvents(won, won).some((e) => e.type === 'win')).toBe(false);
  });

  it('returns nothing when given a null state', () => {
    expect(detectEvents(null, base)).toEqual([]);
  });
});
