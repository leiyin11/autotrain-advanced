// Client entry point: menu, game modes (offline vs online), the render loop,
// HUD and win handling. Browser-only glue around the tested engine + renderer.

import { createWorld, addPlayer, stepWorld } from '../engine/engine.js';
import { computeBotInput } from '../engine/ai.js';
import { LEVEL_1 } from '../engine/level.js';
import { Renderer } from './renderer.js';
import { InputController } from './input.js';
import { NetClient } from './net.js';
import * as C from '../shared/constants.js';

const PLAYER_W = C.PLAYER_W;
const PLAYER_H = C.PLAYER_H;
const INTERP_DELAY = 100; // ms of buffering for smooth online interpolation

const els = {};
['menu', 'canvas', 'hud', 'scoreboard', 'banner', 'status', 'touch', 'nameInput']
  .forEach((k) => (els[k] = document.getElementById(k)));

const input = new InputController();
input.attachKeyboard(window);
input.bindTouchControls(document);

let mode = null; // 'offline' | 'online'
let renderer = null;
let raf = null;

// ----- Offline mode -----
let world = null;
let acc = 0;
let last = 0;

function startOffline(botCount) {
  stop();
  mode = 'offline';
  world = createWorld(LEVEL_1);
  addPlayer(world, { id: 'me', name: playerName(), isBot: false });
  world._bots = [];
  for (let i = 0; i < botCount; i++) {
    const b = addPlayer(world, { id: `bot${i}`, name: `CPU ${i + 1}`, isBot: true });
    world._bots.push(b.id);
  }
  renderer = new Renderer(els.canvas, LEVEL_1);
  renderer.resize();
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
  renderer.render(world, 'me');
  updateHud(world, 'me');
  raf = requestAnimationFrame(loopOffline);
}

// ----- Online mode -----
let net = null;
let snaps = []; // [{snap, t}]

function startOnline() {
  stop();
  mode = 'online';
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  net = new NetClient(`${proto}://${location.host}/ws`);
  net.onStatus = (c) => setStatus(c ? 'Connected' : 'Reconnecting…');
  net.onWelcome = (m) => {
    renderer = new Renderer(els.canvas, m.level);
    renderer.resize();
    net.join(playerName());
    showGame();
  };
  net.onState = (snap) => {
    snaps.push({ snap, t: performance.now() });
    if (snaps.length > 8) snaps.shift();
  };
  net.connect();
  setStatus('Connecting…');
  loopOnline();
}

let lastInputSent = 0;
function loopOnline() {
  raf = requestAnimationFrame(loopOnline);
  const now = performance.now();
  if (net && net.connected && now - lastInputSent > 1000 / 30) {
    net.sendInput(input.getInput());
    lastInputSent = now;
  }
  if (!renderer || snaps.length === 0) return;
  const renderWorld = buildInterpolatedWorld(now - INTERP_DELAY);
  if (renderWorld) {
    renderer.render(renderWorld, net.id);
    updateHud(renderWorld, net.id);
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

// ----- Shared UI -----
function updateHud(w, selfId) {
  const list = Object.values(w.players).sort((a, b) => b.score - a.score);
  els.scoreboard.innerHTML = list
    .map((p) => {
      const me = p.id === selfId ? ' me' : '';
      const tag = p.isBot ? '🤖' : '🧑';
      return `<div class="row${me}"><span>${tag} ${escapeHtml(p.name)}</span>
        <span>${'❤'.repeat(Math.max(0, p.health))} · ${p.score}</span></div>`;
    })
    .join('');

  if (w.status === 'won') {
    const winner = w.players[w.winnerId];
    els.banner.classList.remove('hidden');
    els.banner.querySelector('.title').textContent = winner
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
  mode = null;
}

// ----- Wiring -----
function restart() {
  if (mode === 'offline') startOffline(world ? world._bots.length : 1);
  else if (mode === 'online' && net) net.restart();
}
function addBot() {
  if (mode === 'online' && net) net.addBot();
  else if (mode === 'offline') startOffline((world ? world._bots.length : 0) + 1);
}

window.addEventListener('resize', () => renderer && renderer.resize());
document.getElementById('play-solo').addEventListener('click', () => startOffline(1));
document.getElementById('play-coop').addEventListener('click', () => startOffline(3));
document.getElementById('play-online').addEventListener('click', startOnline);
document.getElementById('btn-restart').addEventListener('click', restart);
document.getElementById('btn-addbot').addEventListener('click', addBot);
document.getElementById('btn-menu').addEventListener('click', showMenu);
document.getElementById('banner-restart').addEventListener('click', restart);
document.getElementById('banner-menu').addEventListener('click', showMenu);

setStatus('Ready');
