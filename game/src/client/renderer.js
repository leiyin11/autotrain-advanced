// Canvas renderer with a follow camera and a parallax starfield. Draws from a
// plain world-or-snapshot object, so it works for both offline and online play.

import * as C from '../shared/constants.js';

const PLAYER_COLORS = ['#46e3ff', '#ff6ad5', '#ffd166', '#7CFC97', '#c792ff', '#ff8c42'];

export class Renderer {
  constructor(canvas, level) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.level = level;
    this.camX = 0;
    this.camY = 0;
    this.stars = this._makeStars(140);
  }

  _makeStars(n) {
    const stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * this.level.width,
        y: Math.random() * this.level.height,
        r: Math.random() * 1.6 + 0.4,
        d: Math.random() * 0.6 + 0.2, // parallax depth
      });
    }
    return stars;
  }

  resize() {
    // Cap device-pixel-ratio at 2: beyond that, mobile GPUs push far more pixels
    // for no visible gain, hurting frame rate.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewW = w;
    this.viewH = h;
    // Cache the sky gradient — it only changes when the viewport height does.
    const theme = this.level.theme || {};
    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, theme.sky || '#0b1026');
    grad.addColorStop(1, theme.far || '#1b2350');
    this.skyGrad = grad;
  }

  _follow(target) {
    const targetX = target ? target.x + target.w / 2 - this.viewW / 2 : this.camX;
    const targetY = target ? target.y + target.h / 2 - this.viewH / 2 : this.camY;
    // Smooth camera, clamped to level bounds.
    this.camX += (targetX - this.camX) * 0.12;
    this.camY += (targetY - this.camY) * 0.12;
    this.camX = Math.max(0, Math.min(this.camX, this.level.width - this.viewW));
    this.camY = Math.max(0, Math.min(this.camY, this.level.height - this.viewH));
    if (this.level.width < this.viewW) this.camX = (this.level.width - this.viewW) / 2;
    if (this.level.height < this.viewH) this.camY = (this.level.height - this.viewH) / 2;
  }

  render(world, selfId, particles = null) {
    const ctx = this.ctx;
    const theme = this.level.theme || {};
    const self = world.players[selfId];
    this._follow(self);

    // Screen shake offset.
    let shakeX = 0;
    let shakeY = 0;
    if (particles && particles.shake > 0) {
      shakeX = (Math.random() - 0.5) * particles.shake;
      shakeY = (Math.random() - 0.5) * particles.shake;
    }

    // Sky gradient (cached).
    ctx.fillStyle = this.skyGrad || theme.sky || '#0b1026';
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    // Parallax stars.
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      const sx = s.x - this.camX * s.d;
      const sy = s.y - this.camY * s.d;
      if (sx < -5 || sx > this.viewW + 5) continue;
      ctx.globalAlpha = 0.4 + s.d * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(-this.camX + shakeX, -this.camY + shakeY);

    // Visible-region bounds for culling (a little margin around the viewport).
    const viewL = this.camX - 60;
    const viewR = this.camX + this.viewW + 60;
    const onScreen = (x, w) => x + w >= viewL && x <= viewR;

    // Platforms (culled to what's on screen).
    for (const s of this.level.solids) {
      if (!onScreen(s.x, s.w)) continue;
      ctx.fillStyle = theme.near || '#2d3a7a';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(s.x, s.y, s.w, 4); // top highlight
    }

    // Goal portal.
    const g = this.level.goal;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
    ctx.fillStyle = `rgba(124,252,151,${0.4 + pulse * 0.4})`;
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = '#7CFC97';
    ctx.lineWidth = 3;
    ctx.strokeRect(g.x, g.y, g.w, g.h);

    // Pickups.
    for (const c of world.pickups) {
      if (c.collected) continue;
      if (!onScreen(c.x, C.PICKUP_W)) continue;
      const cx = c.x + C.PICKUP_W / 2;
      const cy = c.y + C.PICKUP_H / 2 + Math.sin(Date.now() / 300 + c.x) * 3;
      if (c.kind === 'star') {
        this._drawStar(cx, cy, 12, '#ffd166');
      } else {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Enemies.
    for (const e of world.enemies) {
      if (!e.alive) continue;
      if (!onScreen(e.x, C.ENEMY_W)) continue;
      ctx.fillStyle = '#ff5470';
      this._roundRect(e.x, e.y, C.ENEMY_W, C.ENEMY_H, 6);
      ctx.fill();
      // Eyes.
      ctx.fillStyle = '#fff';
      ctx.fillRect(e.x + 7, e.y + 9, 5, 6);
      ctx.fillRect(e.x + C.ENEMY_W - 12, e.y + 9, 5, 6);
    }

    // Projectiles.
    for (const pr of world.projectiles) {
      ctx.fillStyle = '#fff7ad';
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 8;
      ctx.fillRect(pr.x, pr.y, C.PROJECTILE_W, C.PROJECTILE_H);
      ctx.shadowBlur = 0;
    }

    // Players.
    let idx = 0;
    for (const id in world.players) {
      const p = world.players[id];
      const color = PLAYER_COLORS[hashIdx(id, idx++) % PLAYER_COLORS.length];
      this._drawPlayer(p, color, id === selfId);
    }

    // Particles (drawn in world space, on top of entities).
    if (particles) {
      for (const pt of particles.particles) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.max);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  _drawPlayer(p, color, isSelf) {
    const ctx = this.ctx;
    if (!p.alive) {
      ctx.globalAlpha = 0.25;
    } else if (p.invuln > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4; // blink while invulnerable
    }
    // Dash trail.
    if (p.dashTimer > 0) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(p.x - p.facing * 16, p.y, p.w, p.h);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = color;
    this._roundRect(p.x, p.y, p.w, p.h, 6);
    ctx.fill();
    // Face direction marker.
    ctx.fillStyle = '#0b1026';
    const eyeX = p.facing > 0 ? p.x + p.w - 10 : p.x + 5;
    ctx.fillRect(eyeX, p.y + 10, 5, 6);
    // Self indicator + name.
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const label = (p.isBot ? '🤖 ' : isSelf ? '★ ' : '') + (p.name || '');
    ctx.fillText(label, p.x + p.w / 2, p.y - 14);
    // Health pips.
    for (let i = 0; i < (p.health || 0); i++) {
      ctx.fillStyle = '#ff5470';
      ctx.fillRect(p.x + i * 8, p.y - 8, 6, 4);
    }
    ctx.globalAlpha = 1;
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  _drawStar(cx, cy, R, color) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? R : R / 2;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function hashIdx(id, fallback) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h || fallback);
}
