// End-to-end test of the real HTTP + WebSocket server: a client connects,
// receives a welcome + level, sends input, and gets world snapshots back.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';

import { Room } from '../src/server/room.js';
import { LEVEL_1 } from '../src/engine/level.js';
import { MSG, encode, decode, snapshot } from '../src/shared/protocol.js';
import * as C from '../src/shared/constants.js';

// Minimal stand-up of the same wiring as src/server/index.js, on an ephemeral
// port, so the test is hermetic and fast.
function startTestServer() {
  const server = http.createServer();
  const wss = new WebSocketServer({ server, path: '/ws' });
  const room = new Room(LEVEL_1);
  const clients = new Map();
  let n = 0;

  wss.on('connection', (ws) => {
    const id = `h-${++n}`;
    clients.set(ws, id);
    room.addHuman(id, `Player ${n}`);
    ws.send(encode({ t: MSG.WELCOME, id, level: { id: LEVEL_1.id, name: LEVEL_1.name } }));
    ws.on('message', (data) => {
      const m = decode(data.toString());
      if (m && m.t === MSG.INPUT) room.setInput(id, m.input);
      if (m && m.t === MSG.ADD_BOT) room.addBot();
    });
    ws.on('close', () => room.removeHuman(id));
  });

  const interval = setInterval(() => {
    room.tick(C.DT);
    const payload = encode({ t: MSG.STATE, snap: snapshot(room.world) });
    for (const ws of clients.keys()) if (ws.readyState === ws.OPEN) ws.send(payload);
  }, 1000 / C.TICK_RATE);

  return new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      resolve({ port, room, close: () => { clearInterval(interval); wss.close(); server.close(); } });
    });
  });
}

let srv;
beforeAll(async () => {
  srv = await startTestServer();
});
afterAll(() => srv && srv.close());

function connect(port) {
  return new WebSocket(`ws://localhost:${port}/ws`);
}

describe('server e2e', () => {
  it('welcomes a connecting client with an id and level', async () => {
    const ws = connect(srv.port);
    const welcome = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no welcome')), 2000);
      ws.on('message', (d) => {
        const m = decode(d.toString());
        if (m.t === MSG.WELCOME) {
          clearTimeout(timer);
          resolve(m);
        }
      });
      ws.on('error', reject);
    });
    expect(welcome.id).toMatch(/^h-/);
    expect(welcome.level.id).toBe(LEVEL_1.id);
    ws.close();
  });

  it('moves the player on the server when input is sent', async () => {
    const ws = connect(srv.port);
    const myId = await new Promise((resolve) => {
      ws.on('message', (d) => {
        const m = decode(d.toString());
        if (m.t === MSG.WELCOME) resolve(m.id);
      });
    });
    const startX = srv.room.world.players[myId].x;

    // Hold right for a bit.
    const holdRight = setInterval(
      () => ws.send(encode({ t: MSG.INPUT, input: { right: true } })),
      16
    );

    // Collect a few snapshots.
    const moved = await new Promise((resolve) => {
      let lastX = startX;
      ws.on('message', (d) => {
        const m = decode(d.toString());
        if (m.t === MSG.STATE && m.snap.players[myId]) {
          lastX = m.snap.players[myId].x;
          if (lastX > startX + 30) resolve(lastX);
        }
      });
      setTimeout(() => resolve(lastX), 1500);
    });

    clearInterval(holdRight);
    ws.close();
    expect(moved).toBeGreaterThan(startX + 20);
  });

  it('adds a CPU bot on request', async () => {
    const ws = connect(srv.port);
    await new Promise((resolve) => {
      ws.on('message', (d) => {
        const m = decode(d.toString());
        if (m.t === MSG.WELCOME) resolve(m.id);
      });
    });
    const before = srv.room.playerCount();
    ws.send(encode({ t: MSG.ADD_BOT }));
    await new Promise((r) => setTimeout(r, 150));
    expect(srv.room.playerCount()).toBe(before + 1);
    ws.close();
  });
});
