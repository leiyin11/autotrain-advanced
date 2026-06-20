// A Room owns one authoritative world: human players, CPU bots, and the fixed
// simulation step. Timers live in the caller (index.js), so the Room itself is
// pure logic and fully unit-testable.

import { createWorld, addPlayer, removePlayer, stepWorld } from '../engine/engine.js';
import { computeBotInput } from '../engine/ai.js';
import { sanitizeInput } from '../shared/protocol.js';
import * as C from '../shared/constants.js';

let botCounter = 0;

export class Room {
  constructor(level) {
    this.level = level;
    this.world = createWorld(level);
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

  restart() {
    const prev = this.world;
    this.world = createWorld(this.level);
    // Re-add every existing player (humans and bots) at fresh spawns.
    for (const id in prev.players) {
      const old = prev.players[id];
      addPlayer(this.world, { id, name: old.name, isBot: old.isBot });
    }
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
