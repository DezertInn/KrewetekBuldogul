import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Controls, controllerFamily, gamepadButtonLabel, type PadLike } from '../src/input/controls';

function pad(options: { axes?: number[]; buttons?: number[]; id?: string; mapping?: string } = {}): PadLike {
  return { id: options.id ?? 'Xbox One Controller', index: 2, mapping: options.mapping ?? 'standard', connected: true, axes: options.axes ?? [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: options.buttons?.includes(index) ?? false, value: options.buttons?.includes(index) ? 1 : 0 })) };
}

test('controller prompt labels use device families with neutral unknown controls', () => {
  assert.equal(controllerFamily('Wireless Controller (Vendor: 054c Product: 09cc)'), 'playstation');
  assert.equal(controllerFamily('Xbox Series Controller'), 'xbox');
  assert.equal(controllerFamily('Unknown device'), 'gamepad');
  assert.equal(gamepadButtonLabel(7, 'playstation'), 'R2');
  assert.equal(gamepadButtonLabel(7, 'xbox'), 'RT');
  assert.equal(gamepadButtonLabel(7, 'gamepad'), 'Button 8');
  assert.equal(gamepadButtonLabel(22, 'playstation'), 'Button 23');
});

test('browser adapter retains quick edges, ignores pointer noise, and safely handles blur/disconnect', () => {
  class FakeElement extends EventTarget {
    tagName = 'CANVAS';
    isContentEditable = false;
    focus() { fakeWindow.dispatchEvent(new Event('focus')); }
  }
  const fakeWindow = new EventTarget();
  const fakeDocument = Object.assign(new EventTarget(), { hidden: false, hasFocus: () => true });
  const canvas = new FakeElement();
  let pads: (PadLike | null)[] = [null, null, pad()];
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: fakeWindow, document: fakeDocument, HTMLElement: FakeElement, navigator: { getGamepads: () => pads } })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  const safety: string[] = [];
  const controls = new Controls(canvas as unknown as HTMLCanvasElement, {
    screenDirection: (x, y) => ({ x, z: y }), pointerAim: (x, y) => ({ x, z: y }), onSafetyPause: (reason) => safety.push(reason),
  });
  const fire = (target: EventTarget, name: string, fields: Record<string, unknown> = {}) => target.dispatchEvent(Object.assign(new Event(name, { cancelable: true }), fields));
  try {
    controls.poll();
    fire(fakeWindow, 'keydown', { code: 'Space', repeat: false });
    fire(fakeWindow, 'keyup', { code: 'Space' });
    assert.equal(controls.poll().actions.dashPressed, true, 'quick press survives until poll');
    assert.equal(controls.poll().actions.dashPressed, false, 'edge is consumed once');
    controls.setContext('menu');
    fire(fakeWindow, 'keydown', { code: 'ArrowDown', repeat: false });
    fire(fakeWindow, 'keyup', { code: 'ArrowDown' });
    assert.equal(controls.poll().menuDirection, 1, 'quick menu tap survives until poll');
    assert.equal(controls.poll().menuDirection, 0, 'menu tap is consumed once');
    fire(fakeWindow, 'keydown', { code: 'ArrowUp', repeat: false });
    fire(fakeWindow, 'keyup', { code: 'ArrowUp' });
    assert.equal(controls.poll().menuDirection, -1, 'quick menu up tap is retained too');
    controls.setContext('gameplay');
    fire(fakeWindow, 'keydown', { code: 'KeyW', repeat: false });
    fire(fakeWindow, 'keydown', { code: 'KeyD', repeat: false });
    const diagonal = controls.poll().actions.move;
    assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-10);
    fire(fakeWindow, 'keyup', { code: 'KeyW' });
    fire(fakeWindow, 'keyup', { code: 'KeyD' });
    pads = [null, null, pad({ buttons: [7] })];
    assert.equal(controls.poll().family, 'xbox');
    fire(canvas, 'pointermove', { clientX: 100, clientY: 100, pointerType: 'mouse' });
    fire(canvas, 'pointermove', { clientX: 102, clientY: 101, pointerType: 'mouse' });
    assert.equal(controls.poll().family, 'xbox', 'tiny pointer drift does not steal controller prompts');
    controls.clear();
    assert.equal(controls.poll().actions.attackHeld, false, 'held trigger suppressed at menu transition');
    pads = [null, null, pad()]; controls.poll();
    pads = [null, null, pad({ buttons: [7] })];
    assert.equal(controls.poll().actions.attackPressed, true);
    fire(fakeWindow, 'blur');
    assert.equal(safety.at(-1), 'Window lost focus');
    assert.equal(controls.poll().actions.attackHeld, false);
    fire(fakeWindow, 'focus');
    assert.equal(controls.poll().actions.attackHeld, false, 'refocus does not replay held trigger');
    pads = []; controls.poll();
    assert.equal(safety.at(-1), 'Controller disconnected');
    pads = [null, null, pad({ buttons: [0, 7] })];
    const reconnect = controls.poll();
    assert.equal(reconnect.confirmPressed, false, 'reconnect activation does not resume');
    assert.equal(reconnect.actions.attackHeld, false);
    const count = safety.length;
    controls.dispose();
    fire(fakeWindow, 'blur');
    assert.equal(safety.length, count, 'dispose removes listeners');
  } finally {
    controls.dispose();
    for (const [key, original] of originals) {
      if (original) Object.defineProperty(globalThis, key, original);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
