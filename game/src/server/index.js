// Authoritative multiplayer server: serves the client and runs the simulation,
// broadcasting world snapshots to all connected players.

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import { WebSocketServer } from 'ws';

import { Room } from './room.js';
import { MSG, encode, decode, snapshot } from '../shared/protocol.js';
import * as C from '../shared/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PORT = process.env.PORT || 3000;
const BROADCAST_EVERY = 2; // network ticks: 60Hz sim / 2 = 30Hz snapshots

const app = express();
// Prefer the production build; fall back to the raw public/src for `npm start`
// without a build step.
const dist = path.join(ROOT, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
} else {
  app.use(express.static(path.join(ROOT, 'public')));
  app.use('/src', express.static(path.join(ROOT, 'src')));
}
app.get('/healthz', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const room = new Room(0);
const clients = new Map(); // ws -> playerId
let nextClient = 0;

function levelMeta(level) {
  return {
    id: level.id,
    name: level.name,
    width: level.width,
    height: level.height,
    theme: level.theme,
    solids: level.solids,
    goal: level.goal,
  };
}

function broadcast(payload) {
  for (const ws of clients.keys()) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

wss.on('connection', (ws) => {
  const id = `h-${++nextClient}`;
  clients.set(ws, id);
  room.addHuman(id, `Player ${nextClient}`);
  ws.send(
    encode({ t: MSG.WELCOME, id, tickRate: C.TICK_RATE, level: levelMeta(room.level) })
  );

  ws.on('message', (data) => {
    const msg = decode(data.toString());
    if (!msg) return;
    switch (msg.t) {
      case MSG.JOIN:
        if (typeof msg.name === 'string' && room.world.players[id]) {
          room.world.players[id].name = msg.name.slice(0, 16);
        }
        break;
      case MSG.INPUT:
        room.setInput(id, msg.input);
        break;
      case MSG.ADD_BOT:
        if (room.playerCount() < 8) room.addBot();
        break;
      case MSG.REMOVE_BOT:
        room.removeBot();
        break;
      case MSG.RESTART:
        room.restart();
        break;
      case MSG.PING:
        ws.send(encode({ t: MSG.PONG, time: msg.time }));
        break;
    }
  });

  ws.on('close', () => {
    room.removeHuman(id);
    clients.delete(ws);
  });
  ws.on('error', () => {
    room.removeHuman(id);
    clients.delete(ws);
  });
});

const LEVEL_HOLD = 4 * C.TICK_RATE; // ticks to celebrate a win before advancing
let frame = 0;
let wonTicks = 0;
const interval = setInterval(() => {
  room.tick(C.DT);
  frame += 1;

  // Campaign progression: after a short victory pause, load the next level and
  // tell everyone about the new geometry.
  if (room.world.status === 'won') {
    wonTicks += 1;
    if (wonTicks >= LEVEL_HOLD) {
      wonTicks = 0;
      if (room.advanceLevel()) {
        broadcast(encode({ t: MSG.LEVEL, level: levelMeta(room.level) }));
      }
    }
  } else {
    wonTicks = 0;
  }

  if (frame % BROADCAST_EVERY === 0) {
    broadcast(encode({ t: MSG.STATE, snap: snapshot(room.world) }));
  }
}, 1000 / C.TICK_RATE);

server.listen(PORT, () => {
  console.log(`Nebula Knights server listening on http://localhost:${PORT}`);
});

function shutdown() {
  clearInterval(interval);
  wss.close();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { app, server };
