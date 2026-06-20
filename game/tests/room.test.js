import { describe, it, expect, beforeEach } from 'vitest';
import { Room } from '../src/server/room.js';
import { LEVEL_1, LEVELS } from '../src/engine/level.js';
import { resetIds } from '../src/engine/entities.js';
import * as C from '../src/shared/constants.js';

let room;
beforeEach(() => {
  resetIds();
  room = new Room(LEVEL_1);
});

describe('Room membership', () => {
  it('adds and removes humans', () => {
    room.addHuman('h1', 'Grace');
    expect(room.humanCount()).toBe(1);
    expect(room.world.players.h1.name).toBe('Grace');
    room.removeHuman('h1');
    expect(room.humanCount()).toBe(0);
  });

  it('adds and removes bots', () => {
    const id = room.addBot();
    expect(room.botIds.has(id)).toBe(true);
    expect(room.playerCount()).toBe(1);
    const removed = room.removeBot();
    expect(removed).toBe(id);
    expect(room.playerCount()).toBe(0);
  });
});

describe('Room input handling', () => {
  it('applies sanitized input on the next tick', () => {
    room.addHuman('h1', 'Grace');
    const startX = room.world.players.h1.x;
    room.setInput('h1', { right: true, evil: 'x' });
    for (let i = 0; i < 60; i++) room.tick(C.DT);
    expect(room.world.players.h1.x).toBeGreaterThan(startX);
  });

  it('ignores input for unknown players', () => {
    expect(() => room.setInput('nobody', { right: true })).not.toThrow();
  });
});

describe('Room simulation', () => {
  it('advances the world tick on each step', () => {
    room.addBot();
    room.tick(C.DT);
    room.tick(C.DT);
    expect(room.world.tick).toBe(2);
  });

  it('drives bots automatically toward progress', () => {
    const id = room.addBot();
    const startX = room.world.players[id].x;
    for (let i = 0; i < 300; i++) room.tick(C.DT);
    expect(room.world.players[id].x).toBeGreaterThan(startX);
  });

  it('advances levels, carrying score, until the campaign ends', () => {
    room.addHuman('h1', 'Grace');
    room.world.players.h1.score = 500;
    expect(room.levelIndex).toBe(0);

    const ok = room.advanceLevel();
    expect(ok).toBe(true);
    expect(room.levelIndex).toBe(1);
    expect(room.level).toBe(LEVELS[1]);
    expect(room.world.players.h1.score).toBe(500); // carried over
    expect(room.world.tick).toBe(0); // fresh level

    // Walk to the final level.
    while (room.advanceLevel()) {
      /* keep advancing */
    }
    expect(room.levelIndex).toBe(LEVELS.length - 1);
    expect(room.advanceLevel()).toBe(false); // no level past the last
  });

  it('restart resets the world but keeps all players', () => {
    room.addHuman('h1', 'Grace');
    room.addBot();
    room.setInput('h1', { right: true });
    for (let i = 0; i < 120; i++) room.tick(C.DT);
    const movedX = room.world.players.h1.x;
    room.restart();
    expect(room.world.tick).toBe(0);
    expect(room.playerCount()).toBe(2);
    expect(room.world.players.h1.name).toBe('Grace');
    expect(room.world.players.h1.x).not.toBe(movedX); // back at spawn
  });
});
