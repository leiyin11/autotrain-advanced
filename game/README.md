# 🚀 Nebula Knights

A cross-platform, multiplayer 2D platformer that goes **beyond Super Mario** —
built with test-driven development and a fully automated CI pipeline.

Play it in **any browser** on **desktop or mobile**, solo against CPU bots, or
online with your team in real time.

![tests](https://img.shields.io/badge/tests-68%20passing-brightgreen)
![coverage](https://img.shields.io/badge/engine%20coverage-96%25-brightgreen)
![pwa](https://img.shields.io/badge/PWA-installable%20on%20iPhone-46e3ff)

## 📱 Play now

**On your iPhone or any browser:** https://leiyin11.github.io/autotrain-advanced/

Add it to your Home Screen (Share → *Add to Home Screen*) to play full-screen
like a native app — it even works offline. Single-player and vs-CPU run entirely
in the browser; online multiplayer needs the self-hosted server (below).

---

## ✨ Features that go beyond Mario

| Mario | Nebula Knights |
| --- | --- |
| Single jump | **Double jump + coyote time + jump buffering** |
| — | **Air dash** with i-frames and cooldown |
| Stomp only | **Stomp _and_ a ranged blaster** |
| Single player / local | **Real-time online multiplayer** over WebSockets |
| — | **CPU bots** that play the level alongside you |
| Keyboard | **Keyboard _and_ touch controls** (true mobile support) |
| Fixed feel | **Variable jump height**, smooth follow camera, parallax starfield |

- 🎮 **One codebase, every device** — responsive HTML5 canvas, on-screen touch
  pad on phones, keyboard on desktop, installable PWA with offline support.
- 🗺️ **A 3-level campaign** — Nebula Gardens → Crystal Caverns → Solar Spire,
  with carried-over scoring and automatic level progression.
- 🤝 **Play with people or computers** — humans and AI bots are fully
  interchangeable in the simulation.
- 🔊 **Juice** — procedural Web Audio SFX (no asset files), particle bursts and
  screen shake on stomps, hits and wins.
- 🧪 **Test-driven** — a deterministic, DOM-free engine core with 68 unit,
  integration and end-to-end tests (incl. an AI-beatability test per level).
- 🤖 **Fully automated** — lint + multi-Node test matrix + production build +
  GitHub Pages deploy on every push via GitHub Actions.

## 🕹️ Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | `←` `→` / `A` `D` | ◀ ▶ pad |
| Jump / Double-jump | `Space` / `W` / `↑` | ⤒ |
| Dash | `Shift` / `L` | » |
| Shoot | `J` / `F` | ✷ |

Stomp enemies from above for a bounce, or blast them from range. Grab coins and
stars, then reach the glowing **Nebula Gate** to win.

## 🚀 Quick start

```bash
cd game
npm install

# Option A — instant local play (single player + bots), no server needed:
npm run dev          # open the printed http://localhost:5173

# Option B — online multiplayer:
npm run build        # bundle the client
npm start            # authoritative server on http://localhost:3000
```

Open the URL on your phone and computer (same network) and pick
**🌐 Online Multiplayer** to play together. Use **+ CPU** to add bots.

## 🧪 Development & testing (TDD)

```bash
npm test             # run all tests once
npm run test:watch   # TDD watch mode
npm run coverage     # coverage report
npm run lint         # eslint
```

The engine is written test-first. Because the simulation is **deterministic and
free of any DOM/Node dependency**, the exact same `stepWorld()` runs in:

- the browser (offline play + client prediction),
- the Node server (authoritative multiplayer),
- the test suite.

## 🏗️ Architecture

```
src/
  shared/      constants.js  · protocol.js          (used by client + server)
  engine/      physics.js · entities.js · level.js · engine.js · ai.js
               └─ pure, deterministic, fully unit-tested simulation
  server/      room.js (game-room logic) · index.js (Express + ws)
  client/      input.js · renderer.js · net.js · main.js · style.css
tests/         physics · engine · ai · room · protocol · input
               · server.e2e (real WebSocket) · client.dom (jsdom)
```

**Networking model:** the server runs the authoritative simulation at 60 Hz and
broadcasts compact world snapshots at 30 Hz. Clients send only their 5-button
input, and interpolate between snapshots for smooth motion. All network input is
sanitized to exactly five booleans server-side — never trusted raw.

## 🤖 CI / automation

`.github/workflows/game-ci.yml` runs on every push touching `game/`:

1. **Lint** (ESLint)
2. **Test** across Node 18 / 20 / 22
3. **Build** the production bundle
4. **Coverage** report uploaded as an artifact

## 📦 Deploy

Any Node host works:

```bash
npm ci && npm run build && npm start   # serves dist/ + WebSocket on $PORT
```

`GET /healthz` returns `{ "ok": true }` for health checks.

## 📄 License

MIT
