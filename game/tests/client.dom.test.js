// @vitest-environment jsdom
// Smoke test for the browser client glue: loads the real index.html body,
// stubs the canvas + rAF, and verifies the menu starts a single-player game.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fakeCtx() {
  const noop = () => {};
  return new Proxy(
    {
      createLinearGradient: () => ({ addColorStop: noop }),
      setTransform: noop,
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        // Any other property is either a drawing method (callable) or a style
        // field (assignable) — return a noop function that's also assignable.
        return noop;
      },
      set() {
        return true;
      },
    }
  );
}

beforeAll(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const body = html.split('<body>')[1].split('</body>')[0];
  document.body.innerHTML = body;

  // Stub canvas + animation frame so the render loop runs exactly one frame.
  HTMLCanvasElement.prototype.getContext = () => fakeCtx();
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { value: 800 });
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { value: 600 });
  global.requestAnimationFrame = vi.fn(() => 1);
  global.cancelAnimationFrame = vi.fn();
  if (!global.performance) global.performance = { now: () => Date.now() };

  await import('../src/client/main.js');
});

describe('client menu', () => {
  it('shows the menu and hides the HUD on load', () => {
    expect(document.getElementById('menu').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('hud').classList.contains('hidden')).toBe(true);
  });

  it('starts single player, swaps to the HUD and renders a frame', () => {
    document.getElementById('nameInput').value = 'Tester';
    document.getElementById('play-solo').click();

    expect(document.getElementById('menu').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('hud').classList.contains('hidden')).toBe(false);
    // The render loop scheduled the next frame.
    expect(requestAnimationFrame).toHaveBeenCalled();
    // The scoreboard reflects the human player.
    expect(document.getElementById('scoreboard').innerHTML).toContain('Tester');
  });

  it('returns to the menu when Menu is clicked', () => {
    document.getElementById('btn-menu').click();
    expect(document.getElementById('menu').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('hud').classList.contains('hidden')).toBe(true);
  });
});
