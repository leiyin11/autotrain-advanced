// Shared, deterministic game constants. Used by both client prediction and the
// authoritative server simulation so behaviour matches everywhere.

export const TICK_RATE = 60; // simulation steps per second
export const DT = 1 / TICK_RATE; // fixed timestep (seconds)

// World physics
export const GRAVITY = 2200; // px/s^2
export const MAX_FALL_SPEED = 1400; // px/s

// Horizontal movement
export const MOVE_SPEED = 320; // px/s target run speed
export const GROUND_ACCEL = 3600; // px/s^2
export const AIR_ACCEL = 1800; // px/s^2 (less control in air)
export const GROUND_FRICTION = 2600; // px/s^2 decel when no input

// Jumping — beyond Mario: multi-jump + coyote time + jump buffering
export const JUMP_VELOCITY = 760; // px/s initial jump impulse
export const MAX_JUMPS = 2; // double jump
export const COYOTE_TIME = 0.1; // s after leaving ledge you can still jump
export const JUMP_BUFFER = 0.12; // s a jump press is remembered before landing
export const JUMP_CUT = 0.45; // velocity retained when jump released early (variable height)

// Dash — a fast horizontal burst on a cooldown
export const DASH_SPEED = 720; // px/s
export const DASH_DURATION = 0.16; // s
export const DASH_COOLDOWN = 0.6; // s

// Combat
export const PROJECTILE_SPEED = 620; // px/s
export const SHOOT_COOLDOWN = 0.35; // s
export const STOMP_BOUNCE = 520; // px/s upward bounce after stomping an enemy
export const PLAYER_MAX_HEALTH = 3;
export const INVULN_TIME = 1.2; // s of invulnerability after taking a hit
export const RESPAWN_TIME = 2.0; // s before a downed player respawns

// Entity sizes
export const PLAYER_W = 28;
export const PLAYER_H = 40;
export const ENEMY_W = 32;
export const ENEMY_H = 32;
export const PROJECTILE_W = 10;
export const PROJECTILE_H = 6;
export const PICKUP_W = 20;
export const PICKUP_H = 20;

// Scoring
export const SCORE_COIN = 100;
export const SCORE_STOMP = 200;
export const SCORE_SHOOT = 150;
export const SCORE_GOAL = 1000;
