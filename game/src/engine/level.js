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

export const LEVELS = { [LEVEL_1.id]: LEVEL_1 };
