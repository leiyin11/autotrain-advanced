// Cross-platform input: keyboard for desktop, on-screen buttons for touch.
// Both feed the same five-boolean input the engine consumes.

// Pure mapping from a KeyboardEvent.code to a game action (or null). Exported so
// it can be unit-tested without a DOM.
export function keyToAction(code) {
  switch (code) {
    case 'ArrowLeft':
    case 'KeyA':
      return 'left';
    case 'ArrowRight':
    case 'KeyD':
      return 'right';
    case 'ArrowUp':
    case 'KeyW':
    case 'Space':
      return 'jump';
    case 'ShiftLeft':
    case 'ShiftRight':
    case 'KeyL':
      return 'dash';
    case 'KeyJ':
    case 'KeyF':
      return 'shoot';
    default:
      return null;
  }
}

export class InputController {
  constructor() {
    this.state = { left: false, right: false, jump: false, dash: false, shoot: false };
    this._onKeyDown = (e) => {
      const a = keyToAction(e.code);
      if (a) {
        this.state[a] = true;
        e.preventDefault();
      }
    };
    this._onKeyUp = (e) => {
      const a = keyToAction(e.code);
      if (a) {
        this.state[a] = false;
        e.preventDefault();
      }
    };
  }

  attachKeyboard(target = window) {
    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp);
  }

  // Wire an on-screen button element to an action using pointer events so it
  // works for touch and mouse, and survives the pointer leaving the button.
  bindButton(el, action) {
    if (!el) return;
    const set = (v) => (e) => {
      this.state[action] = v;
      e.preventDefault();
    };
    el.addEventListener('pointerdown', set(true));
    el.addEventListener('pointerup', set(false));
    el.addEventListener('pointerleave', set(false));
    el.addEventListener('pointercancel', set(false));
    // Prevent long-press context menus / text selection on mobile.
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  bindTouchControls(root = document) {
    const map = [
      ['btn-left', 'left'],
      ['btn-right', 'right'],
      ['btn-jump', 'jump'],
      ['btn-dash', 'dash'],
      ['btn-shoot', 'shoot'],
    ];
    for (const [id, action] of map) {
      this.bindButton(root.getElementById(id), action);
    }
  }

  getInput() {
    return { ...this.state };
  }
}
