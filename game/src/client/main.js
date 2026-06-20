// Client entry point: menu, game modes (offline vs online), the render loop,
// HUD, audio, particles and campaign progression. Browser-only glue around the
// tested engine + renderer.

import { createWorld, addPlayer, stepWorld } from '../engine/engine.js';
import { computeBotInput } from '../engine/ai.js';
import { getLevel, nextLevelIndex } from '../engine/level.js';
import { Renderer } from './renderer.js';
import { InputController } from './input.js';
import { NetClient } from './net.js';
import { ParticleSystem, detectEvents } from './effects.js';
import { Audio } from './audio.js';
import * as C from '../shared/constants.js';

const PLAYER_W = C.PLAYER_W;
const PLAYER_H = C.PLAYER_H;
const INTERP_DELAY = 100; // ms of buffering for smooth online interpolation
const WIN_HOLD = 3.5; // seconds to celebrate before advancing a level offline

const els = {};
['menu', 'canvas', 'hud', 'scoreboard', 'banner', 'status', 'touch', 'nameInput', 'level']
  .forEach((k) => (els[k] = document.getElementById(k)));

const input = new InputController();
input.attachKeyboard(window);
input.bindTouchControls(document);

const audio = new Audio();
const particles = new ParticleSystem();

let mode = null; // 'offline' | 'online'
let renderer = null;
let raf = null;
let prevSummary = null; // for event detection (audio/particles)
let prevInput = { jump: false, dash: false, shoot: false };

// ----- Offline mode -----
let world = null;
let levelIndex = 0;
let botCountWanted = 1;
let acc = 0;
let last = 0;
let winTimer = 0;

function buildOfflineWorld() {
  const level = getLevel(levelIndex);
  const carry = world ? captureScores(world) : null;
  world = createWorld(level);
  const me = addPlayer(world, { id: 'me', name: playerName(), isBot: false });
  world._bots = [];
  for (let i = 0; i < botCountWanted; i++) {
    const b = addPlayer(world, { id: `bot${i}`, name: `CPU ${i + 1}`, isBot: true });
    world._bots.push(b.id);
  }
  if (carry) {
    if (carry.me != null) me.score = carry.me;
    world._bots.forEach((id, i) => {
      if (carry.bots[i] != null) world.players[id].score = carry.bots[i];
    });
  }
  renderer = new Renderer(els.canvas, level);
  renderer.resize();
  prevSummary = null;
  winTimer = 0;
}

function captureScores(w) {
  return {
    me: w.players.me ? w.players.me.score : 0,
    bots: (w._bots || []).map((id) => (w.players[id] ? w.players[id].score : 0)),
  };
}

function startOffline(botCount) {
  stop();
  mode = 'offline';
  levelIndex = 0;
  botCountWanted = botCount;
  world = null;
  audio.resume();
  buildOfflineWorld();
  showGame();
  last = performance.now();
  acc = 0;
  loopOffline();
}

function loopOffline() {
  const now = performance.now();
  let frame = (now - last) / 1000;
  last = now;
  if (frame > 0.1) frame = 0.1; // clamp after tab switches
  acc += frame;
  const inp = input.getInput();
  while (acc >= C.DT) {
    const inputs = { me: inp };
    for (const id of world._bots) inputs[id] = computeBotInput(world, id);
    stepWorld(world, inputs, C.DT);
    acc -= C.DT;
  }

  reactToEvents(world, 'me', inp);
  particles.update(frame);
  renderer.render(world, 'me', particles);
  updateHud(world, 'me', getLevel(levelIndex));

  // Campaign progression: pause on a win, then advance to the next level.
  if (world.status === 'won') {
    winTimer += frame;
    const next = nextLevelIndex(levelIndex);
    if (winTimer >= WIN_HOLD && next != null) {
      levelIndex = next;
      buildOfflineWorld();
    }
  }

  raf = requestAnimationFrame(loopOffline);
}

// ----- Online mode -----
let net = null;
let snaps = []; // [{snap, t}]

function startOnline() {
  stop();
  mode = 'online';
  audio.resume();
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  net = new NetClient(`${proto}://${location.host}/ws`);
  net.onStatus = (c) => setStatus(c ? 'Connected' : 'Reconnecting…');
  net.onWelcome = (m) => {
    renderer = new Renderer(els.canvas, m.level);
    renderer.resize();
    net.join(playerName());
    prevSummary = null;
    showGame();
  };
  net.onLevel = (level) => {
    renderer = new Renderer(els.canvas, level);
    renderer.resize();
    snaps = [];
    prevSummary = null;
  };
  net.onState = (snap) => {
    snaps.push({ snap, t: performance.now() });
    if (snaps.length > 8) snaps.shift();
  };
  net.connect();
  setStatus('Connecting…');
  last = performance.now();
  loopOnline();
}

let lastInputSent = 0;
function loopOnline() {
  raf = requestAnimationFrame(loopOnline);
  const now = performance.now();
  const frame = Math.min((now - last) / 1000, 0.1);
  last = now;
  const inp = input.getInput();
  if (net && net.connected && now - lastInputSent > 1000 / 30) {
    net.sendInput(inp);
    lastInputSent = now;
  }
  if (!renderer || snaps.length === 0) return;
  const renderWorld = buildInterpolatedWorld(now - INTERP_DELAY);
  if (renderWorld) {
    reactToEvents(renderWorld, net.id, inp);
    particles.update(frame);
    renderer.render(renderWorld, net.id, particles);
    updateHud(renderWorld, net.id, renderer.level);
  }
}

// Reconstruct a render-ready world by interpolating between the two snapshots
// that straddle `targetTime`.
function buildInterpolatedWorld(targetTime) {
  if (snaps.length === 1) return toRenderWorld(snaps[0].snap, snaps[0].snap, 0);
  let a = snaps[0];
  let b = snaps[snaps.length - 1];
  for (let i = 0; i < snaps.length - 1; i++) {
    if (snaps[i].t <= targetTime && snaps[i + 1].t >= targetTime) {
      a = snaps[i];
      b = snaps[i + 1];
      break;
    }
  }
  const span = b.t - a.t || 1;
  const alpha = Math.max(0, Math.min(1, (targetTime - a.t) / span));
  return toRenderWorld(a.snap, b.snap, alpha);
}

const lerp = (x, y, a) => x + (y - x) * a;

function toRenderWorld(sa, sb, alpha) {
  const players = {};
  for (const id in sb.players) {
    const pb = sb.players[id];
    const pa = sa.players[id] || pb;
    players[id] = {
      ...pb,
      x: lerp(pa.x, pb.x, alpha),
      y: lerp(pa.y, pb.y, alpha),
      w: PLAYER_W,
      h: PLAYER_H,
    };
  }
  const enemiesA = Object.fromEntries(sa.enemies.map((e) => [e.id, e]));
  const enemies = sb.enemies.map((eb) => {
    const ea = enemiesA[eb.id] || eb;
    return { ...eb, x: lerp(ea.x, eb.x, alpha), y: lerp(ea.y, eb.y, alpha) };
  });
  return {
    players,
    enemies,
    pickups: sb.pickups,
    projectiles: sb.projectiles,
    status: sb.status,
    winnerId: sb.winnerId,
  };
}

// ----- Audio + particles driven by state changes -----
function summarize(w) {
  const players = {};
  for (const id in w.players) {
    const p = w.players[id];
    players[id] = { x: p.x, y: p.y, health: p.health };
  }
  return {
    players,
    enemies: w.enemies.map((e) => ({ id: e.id, x: e.x, y: e.y, alive: e.alive })),
    pickups: (w.pickups || []).map((c) => ({
      id: c.id, x: c.x, y: c.y, kind: c.kind, collected: !!c.collected,
    })),
    status: w.status,
    winnerId: w.winnerId,
  };
}

function reactToEvents(w, selfId, inp) {
  const summary = summarize(w);
  for (const ev of detectEvents(prevSummary, summary)) {
    if (ev.type === 'coin') {
      particles.burst(ev.x, ev.y, {
        count: 10, color: ev.kind === 'star' ? '#fff7ad' : '#ffd166', speed: 150, life: 0.5,
      });
      audio.play(ev.kind === 'star' ? 'star' : 'coin');
    } else if (ev.type === 'enemy') {
      particles.burst(ev.x, ev.y, { count: 16, color: '#ff5470', speed: 220, life: 0.6 });
      particles.addShake(6);
      audio.play('stomp');
    } else if (ev.type === 'hurt') {
      particles.burst(ev.x, ev.y, { count: 14, color: '#ff3b3b', speed: 200, life: 0.6 });
      if (ev.id === selfId) particles.addShake(12);
      audio.play('hurt');
    } else if (ev.type === 'win') {
      particles.burst(ev.x, ev.y, { count: 40, color: '#7CFC97', speed: 260, life: 1.0 });
      particles.addShake(10);
      audio.play('win');
    }
  }
  prevSummary = summary;

  // Local-player action sounds from input edges (gated by the player's state).
  const me = w.players[selfId];
  if (me) {
    if (inp.jump && !prevInput.jump && (me.onGround || me.jumpsLeft > 0)) audio.play('jump');
    if (inp.dash && !prevInput.dash && (me.dashCooldown == null || me.dashCooldown <= 0))
      audio.play('dash');
    if (inp.shoot && !prevInput.shoot && (me.shootCooldown == null || me.shootCooldown <= 0))
      audio.play('shoot');
  }
  prevInput = { jump: inp.jump, dash: inp.dash, shoot: inp.shoot };
}

// ----- Shared UI -----
function updateHud(w, selfId, level) {
  const list = Object.values(w.players).sort((a, b) => b.score - a.score);
  els.scoreboard.innerHTML = list
    .map((p) => {
      const me = p.id === selfId ? ' me' : '';
      const tag = p.isBot ? '🤖' : '🧑';
      return `<div class="row${me}"><span>${tag} ${escapeHtml(p.name)}</span>
        <span>${'❤'.repeat(Math.max(0, p.health))} · ${p.score}</span></div>`;
    })
    .join('');
  if (els.level && level) els.level.textContent = level.name || '';

  if (w.status === 'won') {
    const winner = w.players[w.winnerId];
    const last = mode === 'offline' ? nextLevelIndex(levelIndex) == null : false;
    els.banner.classList.remove('hidden');
    els.banner.querySelector('.title').textContent = last
      ? `🏆 Campaign complete! ${winner ? winner.name : ''} wins!`
      : winner
        ? `${winner.name} reached the Nebula Gate! 🎉`
        : 'Level Complete!';
  } else {
    els.banner.classList.add('hidden');
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function playerName() {
  const v = (els.nameInput && els.nameInput.value.trim()) || '';
  return (v || 'Player').slice(0, 16);
}

function setStatus(t) {
  els.status.textContent = t;
}

function showGame() {
  els.menu.classList.add('hidden');
  els.hud.classList.remove('hidden');
  els.touch.classList.remove('hidden');
}

function showMenu() {
  stop();
  els.menu.classList.remove('hidden');
  els.hud.classList.add('hidden');
  els.touch.classList.add('hidden');
  els.banner.classList.add('hidden');
}

function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
  if (net) {
    net.close();
    net = null;
  }
  snaps = [];
  prevSummary = null;
  mode = null;
}

// ----- Wiring -----
function restart() {
  if (mode === 'offline') {
    levelIndex = 0;
    world = null;
    buildOfflineWorld();
  } else if (mode === 'online' && net) {
    net.restart();
  }
}
function addBot() {
  if (mode === 'online' && net) {
    net.addBot();
  } else if (mode === 'offline') {
    botCountWanted += 1;
    buildOfflineWorld();
  }
}

window.addEventListener('resize', () => renderer && renderer.resize());
document.getElementById('play-solo').addEventListener('click', () => startOffline(1));
document.getElementById('play-coop').addEventListener('click', () => startOffline(3));
// On a static host (e.g. GitHub Pages) there is no WebSocket server, so explain
// rather than spin forever on "Reconnecting…".
const staticHost =
  typeof location !== 'undefined' && /github\.io$/i.test(location.hostname);
document.getElementById('play-online').addEventListener('click', () => {
  if (staticHost) {
    const note = document.getElementById('online-note');
    if (note) note.classList.remove('hidden');
  } else {
    startOnline();
  }
});
document.getElementById('btn-restart').addEventListener('click', restart);
document.getElementById('btn-addbot').addEventListener('click', addBot);
document.getElementById('btn-menu').addEventListener('click', showMenu);
document.getElementById('banner-restart').addEventListener('click', restart);
document.getElementById('banner-menu').addEventListener('click', showMenu);
const muteBtn = document.getElementById('btn-mute');
if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    audio.resume();
    muteBtn.textContent = audio.toggleMute() ? '🔇' : '🔊';
  });
}

setStatus('Ready');

// Register the service worker for offline / installable play (best-effort).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(base + 'sw.js').catch(() => {});
  });
}
