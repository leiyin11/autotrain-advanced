import { describe, it, expect } from 'vitest';
import {
  LEVELS,
  getLevel,
  levelCount,
  nextLevelIndex,
} from '../src/engine/level.js';
import { createWorld, addPlayer, stepWorld } from '../src/engine/engine.js';
import { computeBotInput } from '../src/engine/ai.js';
import { resetIds } from '../src/engine/entities.js';
import * as C from '../src/shared/constants.js';

describe('level helpers', () => {
  it('exposes an ordered campaign', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(3);
    expect(levelCount()).toBe(LEVELS.length);
  });
  it('getLevel clamps out-of-range indices', () => {
    expect(getLevel(-5)).toBe(LEVELS[0]);
    expect(getLevel(999)).toBe(LEVELS[LEVELS.length - 1]);
  });
  it('nextLevelIndex advances then returns null on the last level', () => {
    expect(nextLevelIndex(0)).toBe(1);
    expect(nextLevelIndex(LEVELS.length - 1)).toBe(null);
  });
  it('every level has a unique id', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(LEVELS.map((l, i) => [l.name, i]))('level "%s"', (_name, idx) => {
  const level = LEVELS[idx];

  it('is structurally valid', () => {
    expect(level.width).toBeGreaterThan(0);
    expect(level.height).toBeGreaterThan(0);
    expect(level.spawns.length).toBeGreaterThan(0);
    expect(level.solids.length).toBeGreaterThan(0);
    for (const s of level.spawns) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(level.width);
      expect(s.y).toBeLessThan(level.height);
    }
    for (const e of level.enemies) {
      expect(e.minX).toBeLessThan(e.maxX);
    }
    expect(level.goal.x).toBeGreaterThan(0);
    expect(level.goal.x).toBeLessThanOrEqual(level.width);
  });

  it('lets an AI player make strong forward progress (not soft-locked)', () => {
    resetIds();
    const world = createWorld(level);
    const bot = addPlayer(world, { id: 'b', name: 'CPU', isBot: true });
    const startX = bot.x;
    let maxX = startX;
    // Up to ~50 simulated seconds.
    for (let i = 0; i < 50 * C.TICK_RATE && world.status !== 'won'; i++) {
      stepWorld(world, { b: computeBotInput(world, 'b') }, C.DT);
      if (world.players.b.x > maxX) maxX = world.players.b.x;
    }
    // The bot should clear well past the halfway point of the level, proving the
    // early/mid platforming is traversable.
    expect(maxX).toBeGreaterThan(startX + level.width * 0.5);
  });
});
