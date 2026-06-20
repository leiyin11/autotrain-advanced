import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addPlayer, stepWorld } from '../src/engine/engine.js';
import { computeBotInput } from '../src/engine/ai.js';
import { resetIds } from '../src/engine/entities.js';
import * as C from '../src/shared/constants.js';

const FLAT = {
  id: 'flat',
  name: 'Flat',
  width: 2000,
  height: 720,
  theme: {},
  spawns: [{ x: 100, y: 540 }],
  solids: [{ x: 0, y: 600, w: 2000, h: 120 }],
  enemies: [],
  pickups: [],
  goal: { x: 1900, y: 540, w: 40, h: 60 },
};

let world;
let bot;
beforeEach(() => {
  resetIds();
  world = createWorld(FLAT);
  bot = addPlayer(world, { id: 'bot1', name: 'CPU', isBot: true });
});

describe('computeBotInput', () => {
  it('returns a valid input object with all keys', () => {
    const input = computeBotInput(world, 'bot1');
    for (const k of ['left', 'right', 'jump', 'dash', 'shoot']) {
      expect(typeof input[k]).toBe('boolean');
    }
  });

  it('moves toward the goal when nothing else is around', () => {
    const input = computeBotInput(world, 'bot1');
    expect(input.right).toBe(true); // goal is to the right
    expect(input.left).toBe(false);
  });

  it('drives the bot meaningfully closer to the goal over time', () => {
    const startX = bot.x;
    for (let i = 0; i < 240; i++) {
      const input = computeBotInput(world, 'bot1');
      stepWorld(world, { bot1: input }, C.DT);
    }
    expect(bot.x).toBeGreaterThan(startX + 400);
  });

  it('returns a neutral input for a non-existent player', () => {
    const input = computeBotInput(world, 'ghost');
    expect(input.left).toBe(false);
    expect(input.right).toBe(false);
    expect(input.jump).toBe(false);
  });

  it('prefers shooting an enemy that is ahead at the same level', () => {
    world.enemies.push({
      id: 'eAhead',
      type: 'enemy',
      x: bot.x + 150,
      y: bot.y,
      w: C.ENEMY_W,
      h: C.ENEMY_H,
      vx: 0,
      vy: 0,
      minX: -Infinity,
      maxX: Infinity,
      alive: true,
    });
    bot.facing = 1;
    const input = computeBotInput(world, 'bot1');
    expect(input.shoot).toBe(true);
  });
});
