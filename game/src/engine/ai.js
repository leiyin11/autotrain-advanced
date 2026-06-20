// Computer-controlled players. The bot reads the same world state a human sees
// and produces the same input object a human would, so bots and humans are
// fully interchangeable in the simulation.

import { emptyInput } from './engine.js';
import { aabbIntersect } from './physics.js';

const SHOOT_RANGE = 340;
const ENEMY_AVOID = 80;

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

// Pick a horizontal target: grab a nearby uncollected pickup if one is close,
// otherwise head for the goal.
function chooseTargetX(world, p) {
  let target = world.goal.x;
  let bestD = Infinity;
  for (const c of world.pickups) {
    if (c.collected) continue;
    const d = Math.abs(c.x - p.x) + Math.abs(c.y - p.y) * 0.5;
    if (d < bestD && d < 260) {
      bestD = d;
      target = c.x;
    }
  }
  return target;
}

export function computeBotInput(world, id) {
  const input = emptyInput();
  const p = world.players[id];
  if (!p || !p.alive) return input;

  const dir = chooseTargetX(world, p) >= p.x + p.w * 0.5 ? 1 : -1;
  if (dir > 0) input.right = true;
  else input.left = true;

  const solids = world.solids;
  const footY = p.y + p.h + 6;
  const aheadX = dir > 0 ? p.x + p.w + 14 : p.x - 14;

  // Wall directly ahead at body height -> hop over it.
  const wallAhead = pointSolid(aheadX, p.y + p.h * 0.5, solids);
  // No ground ahead while grounded -> a gap is coming, jump to clear it.
  const groundAhead = pointSolid(aheadX, footY, solids);
  const groundHere = pointSolid(p.x + p.w * 0.5, footY, solids);

  if (p.onGround && (wallAhead || (!groundAhead && groundHere))) {
    input.jump = true;
    // Dash across wide gaps when it's available.
    if (!groundAhead && p.dashCooldown <= 0) input.dash = true;
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
    // Enemy is right in front and roughly level: hop to stomp it instead of walking in.
    if (ahead && Math.abs(dx) < ENEMY_AVOID && sameLevel && p.onGround) {
      input.jump = true;
    }
  }

  return input;
}
