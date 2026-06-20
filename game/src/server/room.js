// A Room owns one authoritative world: human players, CPU bots, and the fixed
// simulation step. Timers live in the caller (index.js), so the Room itself is
// pure logic and fully unit-testable.

import { createWorld, addPlayer, removePlayer, stepWorld } from '../engine/engine.js';
import { computeBotInput } from '../engine/ai.js';
import { LEVELS, getLevel, nextLevelIndex } from '../engine/level.js';
import { sanitizeInput } from '../shared/protocol.js';
import * as C from '../shared/constants.js';

let botCounter = 0;

export class Room {
  // Accepts either a campaign index (number) or a level object (back-compat).
  constructor(levelOrIndex = 0) {
    if (typeof levelOrIndex === 'number') {
      this.levelIndex = levelOrIndex;
      this.level = getLevel(levelOrIndex);
    } else {
      this.level = levelOrIndex;
      this.levelIndex = Math.max(0, LEVELS.indexOf(levelOrIndex));
    }
    this.world = createWorld(this.level);
    this.inputs = {}; // playerId -> latest input
    this.botIds = new Set();
  }

  addHuman(id, name) {
    const p = addPlayer(this.world, { id, name, isBot: false });
    this.inputs[id] = null;
    return p;
  }

  removeHuman(id) {
    removePlayer(this.world, id);
    delete this.inputs[id];
  }

  addBot(name) {
    const id = `bot-${++botCounter}`;
    addPlayer(this.world, { id, name: name || `CPU ${botCounter}`, isBot: true });
    this.botIds.add(id);
    return id;
  }

  removeBot() {
    // Remove the most recently added bot, if any.
    const ids = [...this.botIds];
    const id = ids[ids.length - 1];
    if (!id) return null;
    removePlayer(this.world, id);
    this.botIds.delete(id);
    return id;
  }

  setInput(id, raw) {
    if (this.world.players[id]) this.inputs[id] = sanitizeInput(raw);
  }

  // Rebuild the current level, re-adding all players. `carryScore` keeps the
  // running campaign score (used when advancing levels, not on a plain restart).
  _reload(level, carryScore) {
    const prev = this.world;
    this.world = createWorld(level);
    for (const id in prev.players) {
      const old = prev.players[id];
      const np = addPlayer(this.world, { id, name: old.name, isBot: old.isBot });
      if (carryScore) {
        np.score = old.score;
        np.lives = old.lives;
      }
    }
  }

  restart() {
    this.levelIndex = 0;
    this.level = getLevel(0);
    this._reload(this.level, false);
  }

  // Advance to the next campaign level, carrying scores. Returns true if there
  // was a next level, false if the campaign is already on its final level.
  advanceLevel() {
    const next = nextLevelIndex(this.levelIndex);
    if (next == null) return false;
    this.levelIndex = next;
    this.level = getLevel(next);
    this._reload(this.level, true);
    return true;
  }

  playerCount() {
    return Object.keys(this.world.players).length;
  }

  humanCount() {
    return this.playerCount() - this.botIds.size;
  }

  // Advance the simulation one fixed step, driving bots with the AI.
  tick(dt = C.DT) {
    const frameInputs = {};
    for (const id in this.world.players) {
      if (this.botIds.has(id)) {
        frameInputs[id] = computeBotInput(this.world, id);
      } else {
        frameInputs[id] = this.inputs[id] || undefined;
      }
    }
    stepWorld(this.world, frameInputs, dt);
    return this.world;
  }
}
