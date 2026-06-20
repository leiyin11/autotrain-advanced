import { describe, it, expect } from 'vitest';
import { keyToAction, InputController } from '../src/client/input.js';

describe('keyToAction', () => {
  it('maps arrows and WASD to movement and jump', () => {
    expect(keyToAction('ArrowLeft')).toBe('left');
    expect(keyToAction('KeyA')).toBe('left');
    expect(keyToAction('ArrowRight')).toBe('right');
    expect(keyToAction('KeyD')).toBe('right');
    expect(keyToAction('Space')).toBe('jump');
    expect(keyToAction('KeyW')).toBe('jump');
  });

  it('maps dash and shoot keys', () => {
    expect(keyToAction('ShiftLeft')).toBe('dash');
    expect(keyToAction('KeyL')).toBe('dash');
    expect(keyToAction('KeyJ')).toBe('shoot');
    expect(keyToAction('KeyF')).toBe('shoot');
  });

  it('returns null for unmapped keys', () => {
    expect(keyToAction('KeyZ')).toBe(null);
    expect(keyToAction('Enter')).toBe(null);
  });
});

describe('InputController keyboard', () => {
  it('updates state on simulated key events', () => {
    const ctrl = new InputController();
    // Minimal fake target that records listeners.
    const handlers = {};
    const target = {
      addEventListener: (type, fn) => (handlers[type] = fn),
    };
    ctrl.attachKeyboard(target);

    handlers.keydown({ code: 'ArrowRight', preventDefault() {} });
    expect(ctrl.getInput().right).toBe(true);
    handlers.keyup({ code: 'ArrowRight', preventDefault() {} });
    expect(ctrl.getInput().right).toBe(false);

    // Unmapped keys are ignored.
    handlers.keydown({ code: 'KeyZ', preventDefault() {} });
    expect(ctrl.getInput()).toEqual({
      left: false,
      right: false,
      jump: false,
      dash: false,
      shoot: false,
    });
  });

  it('getInput returns a copy, not the live state', () => {
    const ctrl = new InputController();
    const snap = ctrl.getInput();
    snap.left = true;
    expect(ctrl.getInput().left).toBe(false);
  });
});
