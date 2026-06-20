// Computer-controlled players. The bot reads the same world state a human sees
// and produces the same input object a human would, so bots and humans are
// fully interchangeable in the simulation.

import { emptyInput } from './engine.js';
import { aabbIntersect } from './physics.js';

const SHOOT_RANGE = 340;
const ENEMY_AVOID = 90;

function pointSolid(x, y, solids) {
  const probe = { x: x - 1, y: y - 1, w: 2, h: 2 };
  for (const s of solids) if (aabbIntersect(probe, s)) return true;
  return false;
}

function nearestAliveEnemy(world, p) {
  let best = null;
  let bestD = Infinity;
  for (const e of world.enemies) {
    if (!e.alive) continue;
    const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

// Is there any solid ground ahead within `reach` px (a place to land)?
function landingAhead(p, dir, solids, reach) {
  for (let dx = 40; dx <= reach; dx += 30) {
    const x = dir > 0 ? p.x + p.w + dx : p.x - dx;
    // Scan a vertical band from head height to a bit below the feet.
    for (let dy = -10; dy <= 80; dy += 20) {
      if (pointSolid(x, p.y + p.h + dy, solids)) return true;
    }
  }
  return false;
}

export function computeBotInput(world, id) {
  const input = emptyInput();
  const p = world.players[id];
  if (!p || !p.alive) return input;

  const solids = world.solids;

  // Always head toward the goal — never backtrack (pickups are grabbed en route).
  const dir = world.goal.x >= p.x + p.w * 0.5 ? 1 : -1;
  if (dir > 0) input.right = true;
  else input.left = true;

  const footY = p.y + p.h + 6;
  const aheadX = dir > 0 ? p.x + p.w + 14 : p.x - 14;
  const aheadX2 = dir > 0 ? p.x + p.w + 40 : p.x - 40;

  // Wall directly ahead at body height -> hop over / climb it.
  const wallAhead =
    pointSolid(aheadX, p.y + p.h * 0.5, solids) ||
    pointSolid(aheadX, p.y + p.h - 4, solids);
  // No ground just ahead while grounded -> a gap is coming, jump to clear it.
  const groundAhead = pointSolid(aheadX, footY, solids) || pointSolid(aheadX2, footY, solids);
  const groundHere = pointSolid(p.x + p.w * 0.5, footY, solids);

  if (p.onGround && (wallAhead || (!groundAhead && groundHere))) {
    input.jump = true;
    if (!groundAhead && p.dashCooldown <= 0) input.dash = true; // burst across wide gaps
  }

  // Airborne over a gap and starting to fall short -> use the double jump (and a
  // dash) to stretch toward the next ledge.
  const groundBelow = pointSolid(p.x + p.w * 0.5, p.y + p.h + 30, solids);
  if (!p.onGround && p.vy > 120 && !groundBelow && p.jumpsLeft > 0) {
    if (landingAhead(p, dir, solids, 200)) {
      input.jump = true;
      if (p.dashCooldown <= 0) input.dash = true;
    }
  }

  // Enemy handling.
  const enemy = nearestAliveEnemy(world, p);
  if (enemy) {
    const dx = enemy.x - p.x;
    const dy = enemy.y - p.y;
    const ahead = (dir > 0 && dx > 0) || (dir < 0 && dx < 0);
    const sameLevel = Math.abs(dy) < p.h;
    if (ahead && sameLevel && Math.abs(dx) < SHOOT_RANGE && p.shootCooldown <= 0) {
      input.shoot = true;
    }
    // Enemy right in front and roughly level: hop to stomp it instead of walking in.
    if (ahead && Math.abs(dx) < ENEMY_AVOID && sameLevel && p.onGround) {
      input.jump = true;
    }
  }

  return input;
}
