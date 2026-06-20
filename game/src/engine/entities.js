// Entity factories. Every entity is a plain serializable object so the whole
// world can be JSON-encoded and shipped to clients each tick.

import * as C from '../shared/constants.js';

let nextId = 1;
// Deterministic id generator (reset between worlds for reproducible tests).
export function resetIds() {
  nextId = 1;
}
function genId(prefix) {
  return `${prefix}${nextId++}`;
}

export function createPlayer({ id, name = 'Player', x = 0, y = 0 } = {}) {
  return {
    id: id ?? genId('p'),
    type: 'player',
    name,
    x,
    y,
    w: C.PLAYER_W,
    h: C.PLAYER_H,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    jumpsLeft: C.MAX_JUMPS,
    coyote: 0,
    jumpBuffer: 0,
    jumpHeld: false,
    dashTimer: 0,
    dashCooldown: 0,
    shootCooldown: 0,
    health: C.PLAYER_MAX_HEALTH,
    lives: 3,
    score: 0,
    invuln: 0,
    alive: true,
    respawn: 0,
    spawnX: x,
    spawnY: y,
    isBot: false,
  };
}

// Patrolling enemy that walks back and forth between [minX, maxX].
export function createEnemy({ id, x = 0, y = 0, minX = -Infinity, maxX = Infinity, dir = 1 } = {}) {
  return {
    id: id ?? genId('e'),
    type: 'enemy',
    x,
    y,
    w: C.ENEMY_W,
    h: C.ENEMY_H,
    vx: 70 * dir,
    vy: 0,
    minX,
    maxX,
    alive: true,
  };
}

export function createPickup({ id, x = 0, y = 0, kind = 'coin' } = {}) {
  return {
    id: id ?? genId('c'),
    type: 'pickup',
    kind,
    x,
    y,
    w: C.PICKUP_W,
    h: C.PICKUP_H,
    collected: false,
  };
}

export function createProjectile({ owner, x, y, dir }) {
  return {
    id: genId('proj'),
    type: 'projectile',
    owner,
    x,
    y,
    w: C.PROJECTILE_W,
    h: C.PROJECTILE_H,
    vx: C.PROJECTILE_SPEED * dir,
    vy: 0,
    life: 1.4, // seconds before it fizzles
    dead: false,
  };
}
