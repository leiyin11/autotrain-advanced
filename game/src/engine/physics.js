// Deterministic 2D physics helpers: AABB math and a fixed-step,
// move-and-resolve collision integrator. No DOM, no randomness — safe to run
// identically on the server and inside client-side prediction.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Move `value` toward `target`, changing it by at most `maxDelta`.
export function approach(value, target, maxDelta) {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return value;
}

// Strict AABB overlap. Edge-touching boxes are NOT considered overlapping.
export function aabbIntersect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// Advance a body by its velocity over `dt`, resolving collisions against a list
// of static solids. Resolution is done one axis at a time (X then Y) which keeps
// it simple and free of corner-tunneling for the speeds this game uses.
//
// Mutates `body` (x, y, vx, vy) and returns a contact report.
export function sweptResolve(body, solids, dt) {
  const result = {
    onGround: false,
    hitCeiling: false,
    hitWallLeft: false,
    hitWallRight: false,
  };

  // --- X axis ---
  body.x += body.vx * dt;
  for (const s of solids) {
    if (!aabbIntersect(body, s)) continue;
    if (body.vx > 0) {
      body.x = s.x - body.w; // rest against left face of solid
      result.hitWallRight = true;
      body.vx = 0;
    } else if (body.vx < 0) {
      body.x = s.x + s.w; // rest against right face of solid
      result.hitWallLeft = true;
      body.vx = 0;
    }
  }

  // --- Y axis ---
  body.y += body.vy * dt;
  for (const s of solids) {
    if (!aabbIntersect(body, s)) continue;
    if (body.vy > 0) {
      body.y = s.y - body.h; // land on top
      result.onGround = true;
      body.vy = 0;
    } else if (body.vy < 0) {
      body.y = s.y + s.h; // bonk head on bottom
      result.hitCeiling = true;
      body.vy = 0;
    }
  }

  return result;
}
