// Level definitions. A level is pure data: solid rectangles, enemy/pickup spawn
// points, player spawns and a goal. Keeping it data means new levels need no code.

export const LEVEL_1 = {
  id: 'nebula-1',
  name: 'Nebula Gardens',
  width: 3200,
  height: 720,
  // Background gravity well colour theme (used by the renderer).
  theme: { sky: '#0b1026', far: '#1b2350', near: '#2d3a7a' },
  spawns: [
    { x: 80, y: 560 },
    { x: 140, y: 560 },
    { x: 200, y: 560 },
    { x: 260, y: 560 },
  ],
  // Solid platforms / ground (x, y, w, h).
  solids: [
    { x: 0, y: 660, w: 1200, h: 60 }, // ground segment 1
    { x: 1320, y: 660, w: 700, h: 60 }, // ground segment 2 (gap before it)
    { x: 2140, y: 660, w: 1060, h: 60 }, // ground segment 3
    { x: 360, y: 520, w: 160, h: 24 }, // floating platform
    { x: 620, y: 430, w: 160, h: 24 },
    { x: 900, y: 360, w: 200, h: 24 },
    { x: 1500, y: 500, w: 180, h: 24 },
    { x: 1800, y: 400, w: 160, h: 24 },
    { x: 2300, y: 520, w: 200, h: 24 },
    { x: 2650, y: 420, w: 200, h: 24 },
    { x: 2980, y: 660, w: 40, h: 60 }, // small wall near goal
  ],
  enemies: [
    { x: 700, y: 628, minX: 620, maxX: 1100 },
    { x: 1600, y: 628, minX: 1320, maxX: 1980 },
    { x: 2400, y: 628, minX: 2140, maxX: 2900 },
    { x: 950, y: 328, minX: 900, maxX: 1080 },
  ],
  pickups: [
    { x: 410, y: 480, kind: 'coin' },
    { x: 680, y: 390, kind: 'coin' },
    { x: 980, y: 320, kind: 'star' },
    { x: 1560, y: 460, kind: 'coin' },
    { x: 1860, y: 360, kind: 'coin' },
    { x: 2360, y: 480, kind: 'coin' },
    { x: 2720, y: 380, kind: 'star' },
    { x: 500, y: 620, kind: 'coin' },
    { x: 1400, y: 620, kind: 'coin' },
    { x: 2200, y: 620, kind: 'coin' },
  ],
  goal: { x: 3080, y: 540, w: 40, h: 120 },
};

export const LEVEL_2 = {
  id: 'nebula-2',
  name: 'Crystal Caverns',
  width: 3600,
  height: 720,
  theme: { sky: '#11071f', far: '#2a1146', near: '#5a2a8a' },
  spawns: [
    { x: 80, y: 560 },
    { x: 140, y: 560 },
    { x: 200, y: 560 },
    { x: 260, y: 560 },
  ],
  solids: [
    { x: 0, y: 660, w: 560, h: 60 },
    { x: 740, y: 660, w: 360, h: 60 },
    { x: 1260, y: 660, w: 360, h: 60 },
    { x: 1820, y: 660, w: 520, h: 60 },
    { x: 2520, y: 660, w: 1080, h: 60 },
    // Staircase of crystal ledges.
    { x: 420, y: 540, w: 130, h: 22 },
    { x: 600, y: 450, w: 130, h: 22 },
    { x: 820, y: 380, w: 150, h: 22 },
    { x: 1080, y: 470, w: 150, h: 22 },
    { x: 1380, y: 400, w: 150, h: 22 },
    { x: 1640, y: 320, w: 150, h: 22 },
    { x: 1960, y: 430, w: 160, h: 22 },
    { x: 2240, y: 360, w: 160, h: 22 },
    { x: 2560, y: 470, w: 160, h: 22 },
    { x: 2860, y: 380, w: 160, h: 22 },
    { x: 3180, y: 300, w: 180, h: 22 },
    { x: 3420, y: 640, w: 40, h: 80 }, // wall before goal
  ],
  enemies: [
    { x: 300, y: 628, minX: 0, maxX: 560 },
    { x: 900, y: 628, minX: 740, maxX: 1100 },
    { x: 1400, y: 628, minX: 1260, maxX: 1620 },
    { x: 2000, y: 628, minX: 1820, maxX: 2340 },
    { x: 2800, y: 628, minX: 2520, maxX: 3380 },
    { x: 1680, y: 288, minX: 1640, maxX: 1790 },
    { x: 2280, y: 328, minX: 2240, maxX: 2400 },
  ],
  pickups: [
    { x: 470, y: 500, kind: 'coin' },
    { x: 650, y: 410, kind: 'coin' },
    { x: 880, y: 340, kind: 'star' },
    { x: 1140, y: 430, kind: 'coin' },
    { x: 1440, y: 360, kind: 'coin' },
    { x: 1700, y: 280, kind: 'star' },
    { x: 2020, y: 390, kind: 'coin' },
    { x: 2300, y: 320, kind: 'coin' },
    { x: 2620, y: 430, kind: 'coin' },
    { x: 2920, y: 340, kind: 'coin' },
    { x: 3230, y: 260, kind: 'star' },
    { x: 820, y: 620, kind: 'coin' },
    { x: 1900, y: 620, kind: 'coin' },
  ],
  goal: { x: 3500, y: 540, w: 40, h: 120 },
};

export const LEVEL_3 = {
  id: 'nebula-3',
  name: 'Solar Spire',
  width: 4000,
  height: 720,
  theme: { sky: '#1a0a05', far: '#4a1c0a', near: '#a8521a' },
  spawns: [
    { x: 80, y: 560 },
    { x: 140, y: 560 },
    { x: 200, y: 560 },
    { x: 260, y: 560 },
  ],
  solids: [
    { x: 0, y: 660, w: 480, h: 60 },
    { x: 660, y: 660, w: 280, h: 60 },
    { x: 1120, y: 660, w: 240, h: 60 },
    { x: 1560, y: 660, w: 240, h: 60 },
    { x: 2000, y: 660, w: 280, h: 60 },
    { x: 2480, y: 660, w: 240, h: 60 },
    { x: 2920, y: 660, w: 1080, h: 60 },
    // Floating gauntlet.
    { x: 360, y: 540, w: 120, h: 20 },
    { x: 560, y: 440, w: 120, h: 20 },
    { x: 780, y: 360, w: 120, h: 20 },
    { x: 1000, y: 300, w: 120, h: 20 },
    { x: 1240, y: 380, w: 120, h: 20 },
    { x: 1460, y: 300, w: 120, h: 20 },
    { x: 1700, y: 240, w: 120, h: 20 },
    { x: 1940, y: 320, w: 120, h: 20 },
    { x: 2180, y: 260, w: 120, h: 20 },
    { x: 2420, y: 360, w: 120, h: 20 },
    { x: 2660, y: 280, w: 120, h: 20 },
    { x: 3000, y: 480, w: 160, h: 20 },
    { x: 3300, y: 380, w: 160, h: 20 },
    { x: 3600, y: 280, w: 160, h: 20 },
  ],
  enemies: [
    { x: 250, y: 628, minX: 0, maxX: 480 },
    { x: 800, y: 628, minX: 660, maxX: 940 },
    { x: 1650, y: 628, minX: 1560, maxX: 1800 },
    { x: 2100, y: 628, minX: 2000, maxX: 2280 },
    { x: 3200, y: 628, minX: 2920, maxX: 3900 },
    { x: 1040, y: 268, minX: 1000, maxX: 1120 },
    { x: 1740, y: 208, minX: 1700, maxX: 1820 },
    { x: 2220, y: 228, minX: 2180, maxX: 2300 },
    { x: 2700, y: 248, minX: 2660, maxX: 2780 },
  ],
  pickups: [
    { x: 410, y: 500, kind: 'coin' },
    { x: 610, y: 400, kind: 'coin' },
    { x: 830, y: 320, kind: 'coin' },
    { x: 1050, y: 260, kind: 'star' },
    { x: 1290, y: 340, kind: 'coin' },
    { x: 1510, y: 260, kind: 'coin' },
    { x: 1750, y: 200, kind: 'star' },
    { x: 1990, y: 280, kind: 'coin' },
    { x: 2230, y: 220, kind: 'coin' },
    { x: 2470, y: 320, kind: 'coin' },
    { x: 2710, y: 240, kind: 'star' },
    { x: 3060, y: 440, kind: 'coin' },
    { x: 3360, y: 340, kind: 'coin' },
    { x: 3660, y: 240, kind: 'star' },
  ],
  goal: { x: 3860, y: 160, w: 40, h: 120 },
};

// Ordered campaign. Progression walks this array.
export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3];

export function levelCount() {
  return LEVELS.length;
}

// Get a level by campaign index (clamped to the last level).
export function getLevel(index) {
  const i = Math.max(0, Math.min(index, LEVELS.length - 1));
  return LEVELS[i];
}

// Index of the next level, or null if `index` is the final level.
export function nextLevelIndex(index) {
  return index + 1 < LEVELS.length ? index + 1 : null;
}
