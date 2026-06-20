// Authoritative game simulation. Pure and deterministic given the same inputs,
// so it runs identically on the server and in client-side prediction.

import * as C from '../shared/constants.js';
import { sweptResolve, aabbIntersect, approach } from './physics.js';
import {
  createPlayer,
  createEnemy,
  createPickup,
  createProjectile,
} from './entities.js';

export function emptyInput() {
  return { left: false, right: false, jump: false, dash: false, shoot: false };
}

export function createWorld(level) {
  return {
    level,
    width: level.width,
    height: level.height,
    tick: 0,
    status: 'playing', // 'playing' | 'won'
    winnerId: null,
    solids: level.solids.map((s) => ({ ...s })),
    goal: { ...level.goal },
    players: {}, // id -> player
    enemies: level.enemies.map((e, i) => createEnemy({ id: `e${i}`, ...e })),
    pickups: level.pickups.map((c, i) => createPickup({ id: `c${i}`, ...c })),
    projectiles: [],
    nextSpawn: 0,
  };
}

export function addPlayer(world, { id, name = 'Player', isBot = false } = {}) {
  const spawns = world.level.spawns;
  const spot = spawns[world.nextSpawn % spawns.length];
  world.nextSpawn += 1;
  const p = createPlayer({ id, name, x: spot.x, y: spot.y });
  p.isBot = isBot;
  world.players[p.id] = p;
  return p;
}

export function removePlayer(world, id) {
  delete world.players[id];
}

function findPlayer(world, id) {
  return world.players[id];
}

function damagePlayer(p, instant = false) {
  if (instant) {
    p.health = 0;
  } else if (p.invuln <= 0) {
    p.health -= 1;
    p.invuln = C.INVULN_TIME;
    p.vy = -300; // knockback pop
  } else {
    return;
  }
  if (p.health <= 0) {
    p.lives -= 1;
    p.alive = false;
    p.respawn = C.RESPAWN_TIME;
  }
}

function respawnPlayer(p) {
  if (p.lives <= 0) p.lives = 3; // endless play: never fully eliminated
  p.x = p.spawnX;
  p.y = p.spawnY;
  p.vx = 0;
  p.vy = 0;
  p.health = C.PLAYER_MAX_HEALTH;
  p.alive = true;
  p.invuln = C.INVULN_TIME;
  p.respawn = 0;
  p.jumpsLeft = C.MAX_JUMPS;
}

function updatePlayer(p, input, world, dt) {
  if (!p.alive) {
    p.respawn -= dt;
    if (p.respawn <= 0) respawnPlayer(p);
    return;
  }

  // Timers
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.shootCooldown = Math.max(0, p.shootCooldown - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  if (p.coyote > 0) p.coyote -= dt;
  if (p.jumpBuffer > 0) p.jumpBuffer -= dt;

  // Facing
  if (input.left && !input.right) p.facing = -1;
  else if (input.right && !input.left) p.facing = 1;

  // Dash start
  if (input.dash && p.dashCooldown <= 0 && p.dashTimer <= 0) {
    p.dashTimer = C.DASH_DURATION;
    p.dashCooldown = C.DASH_COOLDOWN;
    p.invuln = Math.max(p.invuln, C.DASH_DURATION);
  }

  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.vx = p.facing * C.DASH_SPEED;
    p.vy = 0; // air-dash floats horizontally
  } else {
    const accel = p.onGround ? C.GROUND_ACCEL : C.AIR_ACCEL;
    let target = 0;
    if (input.left && !input.right) target = -C.MOVE_SPEED;
    else if (input.right && !input.left) target = C.MOVE_SPEED;
    if (target !== 0) {
      p.vx = approach(p.vx, target, accel * dt);
    } else if (p.onGround) {
      p.vx = approach(p.vx, 0, C.GROUND_FRICTION * dt);
    } else {
      p.vx = approach(p.vx, 0, C.AIR_ACCEL * 0.5 * dt);
    }
  }

  // Jump buffering: remember a fresh press briefly.
  if (input.jump && !p.jumpHeld) p.jumpBuffer = C.JUMP_BUFFER;
  p.jumpHeld = input.jump;

  const canGroundJump = p.onGround || p.coyote > 0;
  if (p.jumpBuffer > 0 && (canGroundJump || p.jumpsLeft > 0)) {
    p.vy = -C.JUMP_VELOCITY;
    p.jumpBuffer = 0;
    p.coyote = 0;
    p.onGround = false;
    if (canGroundJump) p.jumpsLeft = C.MAX_JUMPS - 1;
    else p.jumpsLeft -= 1;
  }

  // Variable jump height: releasing jump cuts upward velocity.
  if (!input.jump && p.vy < 0) {
    p.vy = Math.max(p.vy, -C.JUMP_VELOCITY * C.JUMP_CUT);
  }

  // Gravity (skipped during a dash).
  if (p.dashTimer <= 0) {
    p.vy = Math.min(p.vy + C.GRAVITY * dt, C.MAX_FALL_SPEED);
  }

  // Shooting
  if (input.shoot && p.shootCooldown <= 0) {
    const px = p.facing > 0 ? p.x + p.w : p.x - C.PROJECTILE_W;
    world.projectiles.push(
      createProjectile({ owner: p.id, x: px, y: p.y + p.h * 0.4, dir: p.facing })
    );
    p.shootCooldown = C.SHOOT_COOLDOWN;
  }

  // Collision against world geometry.
  const contact = sweptResolve(p, world.solids, dt);
  if (contact.onGround) {
    p.onGround = true;
    p.coyote = C.COYOTE_TIME;
    p.jumpsLeft = C.MAX_JUMPS;
  } else {
    p.onGround = false;
  }

  // Fell into the void.
  if (p.y > world.height + 200) damagePlayer(p, true);
}

function updateEnemy(e, world, dt) {
  if (!e.alive) return;
  e.vy = Math.min(e.vy + C.GRAVITY * dt, C.MAX_FALL_SPEED);
  const c = sweptResolve(e, world.solids, dt);
  if (c.hitWallLeft) e.vx = Math.abs(e.vx);
  if (c.hitWallRight) e.vx = -Math.abs(e.vx);
  // Patrol bounds.
  if (e.x <= e.minX) {
    e.x = e.minX;
    e.vx = Math.abs(e.vx);
  }
  if (e.x + e.w >= e.maxX) {
    e.x = e.maxX - e.w;
    e.vx = -Math.abs(e.vx);
  }
  if (e.y > world.height + 200) e.alive = false;
}

function updateProjectiles(world, dt) {
  for (const pr of world.projectiles) {
    if (pr.dead) continue;
    pr.life -= dt;
    if (pr.life <= 0) {
      pr.dead = true;
      continue;
    }
    pr.x += pr.vx * dt;
    for (const s of world.solids) {
      if (aabbIntersect(pr, s)) {
        pr.dead = true;
        break;
      }
    }
    if (pr.dead) continue;
    for (const e of world.enemies) {
      if (e.alive && aabbIntersect(pr, e)) {
        e.alive = false;
        pr.dead = true;
        const owner = findPlayer(world, pr.owner);
        if (owner) owner.score += C.SCORE_SHOOT;
        break;
      }
    }
  }
  world.projectiles = world.projectiles.filter((p) => !p.dead);
}

function resolveInteractions(world) {
  for (const id in world.players) {
    const p = world.players[id];
    if (!p.alive) continue;

    // Enemies: stomp from above, otherwise take damage.
    for (const e of world.enemies) {
      if (!e.alive) continue;
      if (!aabbIntersect(p, e)) continue;
      const fallingOnto = p.vy > 0 && p.y + p.h - e.y < e.h * 0.6;
      if (fallingOnto) {
        e.alive = false;
        p.vy = -C.STOMP_BOUNCE;
        p.score += C.SCORE_STOMP;
        p.jumpsLeft = C.MAX_JUMPS;
      } else {
        damagePlayer(p);
      }
    }

    // Pickups.
    for (const c of world.pickups) {
      if (c.collected) continue;
      if (aabbIntersect(p, c)) {
        c.collected = true;
        p.score += c.kind === 'star' ? C.SCORE_COIN * 5 : C.SCORE_COIN;
      }
    }

    // Goal.
    if (aabbIntersect(p, world.goal)) {
      if (!p.reachedGoal) {
        p.reachedGoal = true;
        p.score += C.SCORE_GOAL;
      }
      world.status = 'won';
      world.winnerId = p.id;
    }
  }
}

// Advance the world one fixed step. `inputsById` maps player id -> input object.
export function stepWorld(world, inputsById = {}, dt = C.DT) {
  world.tick += 1;
  for (const id in world.players) {
    const input = inputsById[id] || emptyInput();
    updatePlayer(world.players[id], input, world, dt);
  }
  for (const e of world.enemies) updateEnemy(e, world, dt);
  updateProjectiles(world, dt);
  resolveInteractions(world);
  return world;
}
