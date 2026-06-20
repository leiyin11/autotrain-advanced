import { describe, it, expect } from 'vitest';
import {
  snapshot,
  encode,
  decode,
  sanitizeInput,
  MSG,
} from '../src/shared/protocol.js';
import { createWorld, addPlayer } from '../src/engine/engine.js';
import { LEVEL_1 } from '../src/engine/level.js';
import { resetIds } from '../src/engine/entities.js';

describe('snapshot', () => {
  it('captures players, enemies, pickups and meta, and survives JSON round-trip', () => {
    resetIds();
    const world = createWorld(LEVEL_1);
    addPlayer(world, { id: 'p1', name: 'Ada' });
    const snap = snapshot(world);
    expect(snap.players.p1.name).toBe('Ada');
    expect(snap.enemies.length).toBe(LEVEL_1.enemies.length);
    expect(snap.pickups.length).toBe(LEVEL_1.pickups.length);
    expect(snap.status).toBe('playing');

    const round = decode(encode({ t: MSG.STATE, snap }));
    expect(round.snap.players.p1.x).toBe(snap.players.p1.x);
  });

  it('omits collected pickups', () => {
    resetIds();
    const world = createWorld(LEVEL_1);
    world.pickups[0].collected = true;
    const snap = snapshot(world);
    expect(snap.pickups.length).toBe(LEVEL_1.pickups.length - 1);
  });
});

describe('decode', () => {
  it('returns null on malformed JSON instead of throwing', () => {
    expect(decode('{not json')).toBe(null);
  });
});

describe('sanitizeInput', () => {
  it('coerces arbitrary data into exactly five booleans', () => {
    const s = sanitizeInput({ left: 1, right: 'yes', jump: 0, extra: 'evil' });
    expect(s).toEqual({
      left: true,
      right: true,
      jump: false,
      dash: false,
      shoot: false,
    });
    expect('extra' in s).toBe(false);
  });

  it('handles null/undefined input', () => {
    expect(sanitizeInput(null)).toEqual({
      left: false,
      right: false,
      jump: false,
      dash: false,
      shoot: false,
    });
  });
});
