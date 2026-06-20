import { describe, it, expect } from 'vitest';
import {
  aabbIntersect,
  sweptResolve,
  clamp,
  approach,
} from '../src/engine/physics.js';

describe('clamp', () => {
  it('keeps a value inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('approach', () => {
  it('moves toward the target by at most maxDelta', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(0, 2, 3)).toBe(2); // does not overshoot
    expect(approach(10, 0, 3)).toBe(7);
    expect(approach(10, 0, 100)).toBe(0); // clamps to target
  });
});

describe('aabbIntersect', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  it('detects overlap', () => {
    expect(aabbIntersect(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });
  it('rejects separated boxes', () => {
    expect(aabbIntersect(a, { x: 20, y: 0, w: 10, h: 10 })).toBe(false);
  });
  it('treats edge-touching as non-overlap', () => {
    expect(aabbIntersect(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });
});

describe('sweptResolve', () => {
  it('stops a falling body on top of a platform and reports ground contact', () => {
    // Body falling onto a floor at y=100.
    const body = { x: 0, y: 90, w: 10, h: 10, vx: 0, vy: 600 };
    const floor = { x: -100, y: 100, w: 400, h: 20 };
    const r = sweptResolve(body, [floor], 1 / 60);
    expect(r.onGround).toBe(true);
    expect(body.vy).toBe(0);
    // Body's bottom should rest exactly on the floor top.
    expect(body.y + body.h).toBeCloseTo(100, 5);
  });

  it('stops upward motion when hitting a ceiling', () => {
    const body = { x: 0, y: 45, w: 10, h: 10, vx: 0, vy: -600 };
    const ceil = { x: -100, y: 30, w: 400, h: 10 };
    const r = sweptResolve(body, [ceil], 1 / 60);
    expect(body.vy).toBe(0);
    expect(body.y).toBeCloseTo(40, 5); // ceiling bottom is at y=40
    expect(r.hitCeiling).toBe(true);
  });

  it('blocks horizontal motion into a wall', () => {
    const body = { x: 0, y: 0, w: 10, h: 10, vx: 600, vy: 0 };
    const wall = { x: 15, y: -100, w: 10, h: 400 };
    const r = sweptResolve(body, [wall], 1 / 60);
    expect(body.vx).toBe(0);
    expect(body.x + body.w).toBeCloseTo(15, 5); // rests against the wall's left face
    expect(r.hitWallRight).toBe(true);
  });

  it('does nothing when there is no collision', () => {
    const body = { x: 0, y: 0, w: 10, h: 10, vx: 10, vy: 10 };
    const r = sweptResolve(body, [{ x: 500, y: 500, w: 10, h: 10 }], 1 / 60);
    expect(r.onGround).toBe(false);
    expect(body.x).toBeCloseTo(10 / 60, 5);
    expect(body.y).toBeCloseTo(10 / 60, 5);
  });
});
