import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorld,
  addPlayer,
  stepWorld,
  emptyInput,
} from '../src/engine/engine.js';
import { resetIds } from '../src/engine/entities.js';
import * as C from '../src/shared/constants.js';

// A tiny flat test level: one wide floor at y=600, a goal far to the right.
const TEST_LEVEL = {
  id: 'test',
  name: 'Test',
  width: 2000,
  height: 720,
  theme: {},
  spawns: [{ x: 100, y: 540 }],
  solids: [{ x: 0, y: 600, w: 2000, h: 120 }],
  enemies: [],
  pickups: [],
  goal: { x: 1900, y: 540, w: 40, h: 60 },
};

function press(over = {}) {
  return { ...emptyInput(), ...over };
}

function run(world, id, input, steps) {
  for (let i = 0; i < steps; i++) stepWorld(world, { [id]: input }, C.DT);
}

let world;
let p;
beforeEach(() => {
  resetIds();
  world = createWorld(TEST_LEVEL);
  p = addPlayer(world, { id: 'p1', name: 'Tester' });
});

describe('gravity & ground', () => {
  it('falls and lands on the floor', () => {
    run(world, 'p1', emptyInput(), 60); // ~1s
    expect(p.onGround).toBe(true);
    expect(p.y + p.h).toBeCloseTo(600, 3);
    expect(p.vy).toBe(0);
  });
});

describe('horizontal movement', () => {
  it('runs right toward max speed and stops with friction', () => {
    run(world, 'p1', emptyInput(), 30); // settle on ground
    run(world, 'p1', press({ right: true }), 40);
    expect(p.vx).toBeGreaterThan(C.MOVE_SPEED * 0.8);
    expect(p.x).toBeGreaterThan(100);
    const xAfter = p.x;
    run(world, 'p1', emptyInput(), 30); // release
    expect(Math.abs(p.vx)).toBeLessThan(20);
    expect(p.x).toBeGreaterThan(xAfter);
  });
});

describe('jumping', () => {
  it('jumps off the ground when grounded', () => {
    run(world, 'p1', emptyInput(), 30);
    expect(p.onGround).toBe(true);
    stepWorld(world, { p1: press({ jump: true }) }, C.DT);
    expect(p.vy).toBeLessThan(0); // launched upward
    expect(p.onGround).toBe(false);
  });

  it('allows a double jump but not a third', () => {
    run(world, 'p1', emptyInput(), 30);
    // First jump (press)
    stepWorld(world, { p1: press({ jump: true }) }, C.DT);
    // Release so the next press registers as a new jump.
    stepWorld(world, { p1: emptyInput() }, C.DT);
    expect(p.jumpsLeft).toBe(C.MAX_JUMPS - 1);
    // Second jump
    stepWorld(world, { p1: press({ jump: true }) }, C.DT);
    stepWorld(world, { p1: emptyInput() }, C.DT);
    expect(p.jumpsLeft).toBe(0);
    const vyBefore = p.vy;
    // Third press should do nothing.
    stepWorld(world, { p1: press({ jump: true }) }, C.DT);
    expect(p.vy).toBeGreaterThan(vyBefore - 1); // not re-launched (gravity only)
  });
});

describe('dash', () => {
  it('produces a horizontal burst and goes on cooldown', () => {
    run(world, 'p1', emptyInput(), 30);
    stepWorld(world, { p1: press({ right: true, dash: true }) }, C.DT);
    expect(Math.abs(p.vx)).toBeCloseTo(C.DASH_SPEED, 0);
    expect(p.dashCooldown).toBeGreaterThan(0);
    expect(p.invuln).toBeGreaterThan(0); // i-frames during dash
  });
});

describe('pickups & scoring', () => {
  it('collects a coin the player overlaps', () => {
    world.pickups.push({
      id: 'coinX',
      type: 'pickup',
      kind: 'coin',
      x: p.x,
      y: p.y,
      w: C.PICKUP_W,
      h: C.PICKUP_H,
      collected: false,
    });
    stepWorld(world, { p1: emptyInput() }, C.DT);
    const coin = world.pickups.find((c) => c.id === 'coinX');
    expect(coin.collected).toBe(true);
    expect(p.score).toBe(C.SCORE_COIN);
  });
});

describe('combat', () => {
  it('stomps an enemy from above and bounces', () => {
    world.enemies.push({
      id: 'eX',
      type: 'enemy',
      x: p.x,
      y: p.y + p.h, // directly below the player's feet
      w: C.ENEMY_W,
      h: C.ENEMY_H,
      vx: 0,
      vy: 0,
      minX: -Infinity,
      maxX: Infinity,
      alive: true,
    });
    // Give the player downward velocity so it counts as a stomp.
    p.vy = 200;
    stepWorld(world, { p1: emptyInput() }, C.DT);
    const e = world.enemies.find((x) => x.id === 'eX');
    expect(e.alive).toBe(false);
    expect(p.vy).toBeLessThan(0); // bounced up
    expect(p.score).toBeGreaterThanOrEqual(C.SCORE_STOMP);
  });

  it('shoots a projectile that destroys an enemy', () => {
    run(world, 'p1', emptyInput(), 30); // settle on the ground first
    world.enemies.push({
      id: 'eShoot',
      type: 'enemy',
      x: p.x + 120,
      y: p.y,
      w: C.ENEMY_W,
      h: C.ENEMY_H,
      vx: 0,
      vy: 0,
      minX: -Infinity,
      maxX: Infinity,
      alive: true,
    });
    p.facing = 1;
    stepWorld(world, { p1: press({ shoot: true }) }, C.DT);
    expect(world.projectiles.length).toBe(1);
    run(world, 'p1', emptyInput(), 30); // let the bolt travel
    const e = world.enemies.find((x) => x.id === 'eShoot');
    expect(e.alive).toBe(false);
    expect(p.score).toBeGreaterThanOrEqual(C.SCORE_SHOOT);
  });

  it('damages the player on side contact with an enemy', () => {
    world.enemies.push({
      id: 'eHit',
      type: 'enemy',
      x: p.x + p.w - 4,
      y: p.y, // same height -> side hit
      w: C.ENEMY_W,
      h: C.ENEMY_H,
      vx: 0,
      vy: 0,
      minX: -Infinity,
      maxX: Infinity,
      alive: true,
    });
    const hp = p.health;
    stepWorld(world, { p1: emptyInput() }, C.DT);
    expect(p.health).toBe(hp - 1);
    expect(p.invuln).toBeGreaterThan(0);
  });
});

describe('win condition', () => {
  it('marks the world won when a player reaches the goal', () => {
    p.x = world.goal.x;
    p.y = world.goal.y;
    stepWorld(world, { p1: emptyInput() }, C.DT);
    expect(world.status).toBe('won');
    expect(world.winnerId).toBe('p1');
    expect(p.score).toBeGreaterThanOrEqual(C.SCORE_GOAL);
  });
});

describe('respawn', () => {
  it('respawns the player after falling into the void', () => {
    p.y = world.height + 500;
    p.lives = 3;
    stepWorld(world, { p1: emptyInput() }, C.DT);
    expect(p.alive).toBe(false);
    // Wait out the respawn timer.
    run(world, 'p1', emptyInput(), Math.ceil(C.RESPAWN_TIME / C.DT) + 2);
    expect(p.alive).toBe(true);
    expect(p.x).toBe(p.spawnX);
  });
});

describe('determinism', () => {
  it('produces identical state from identical inputs', () => {
    resetIds();
    const w1 = createWorld(TEST_LEVEL);
    addPlayer(w1, { id: 'p1' });
    resetIds();
    const w2 = createWorld(TEST_LEVEL);
    addPlayer(w2, { id: 'p1' });
    const seq = [
      press({ right: true }),
      press({ right: true, jump: true }),
      press({ right: true }),
      press({ dash: true, right: true }),
      emptyInput(),
    ];
    for (let i = 0; i < 120; i++) {
      const input = seq[i % seq.length];
      stepWorld(w1, { p1: input }, C.DT);
      stepWorld(w2, { p1: input }, C.DT);
    }
    expect(w1.players.p1.x).toBe(w2.players.p1.x);
    expect(w1.players.p1.y).toBe(w2.players.p1.y);
    expect(w1.tick).toBe(w2.tick);
  });
});
