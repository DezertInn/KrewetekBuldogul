import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { controllerFamily, Controls, DEFAULT_BINDINGS, gamepadAxesLabel, gamepadButtonLabel, mapStandardGamepad, PadGate, radialDeadzone, type PadLike } from '../src/input/controls';

function pad(options: { axes?: number[]; buttons?: number[]; id?: string; mapping?: string } = {}): PadLike {
  return {
    id: options.id ?? 'Xbox One Controller', index: 2, mapping: options.mapping ?? 'standard', connected: true,
    axes: options.axes ?? [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: options.buttons?.includes(index) ?? false, value: options.buttons?.includes(index) ? 1 : 0 })),
  };
}

test('radial deadzone removes drift, preserves direction and gives analog speed', () => {
  assert.deepEqual(radialDeadzone(0.08, -0.06), { x: 0, z: 0 });
  assert.deepEqual(radialDeadzone(0, 0), { x: 0, z: 0 });
  const half = radialDeadzone(0.59, 0);
  assert.ok(Math.abs(half.x - 0.5) < 1e-10);
  assert.equal(half.z, 0);
  const diagonal = radialDeadzone(1, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-10);
  assert.equal(diagonal.x, diagonal.z);
  assert.deepEqual(radialDeadzone(Number.NaN, 0), { x: 0, z: 0 });
});

test('standard mapping uses RT/LT for attack/dash and Menu/A/B for menus', () => {
  const value = mapStandardGamepad(pad({ axes: [0.59, 0, 0, -1], buttons: [7, 6, 9, 0, 1, 12] }));
  assert.ok(Math.abs(value.move.x - 0.5) < 1e-10);
  assert.deepEqual(value.aim, { x: 0, z: -1 });
  assert.deepEqual(value.buttons, { attack: true, dash: true, pause: true, confirm: true, back: true });
  assert.equal(value.menu, -1);
  assert.equal(mapStandardGamepad(pad({ buttons: [13] })).menu, 1);
});

test('DS4 uses the same browser standard mapping; unknown mappings do not guess controls', () => {
  const ds4 = pad({ id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)', buttons: [7, 0] });
  assert.equal(controllerFamily(ds4.id), 'playstation');
  assert.equal(controllerFamily('Xbox Series Controller'), 'xbox');
  assert.equal(controllerFamily('Example generic device'), 'gamepad');
  assert.equal(mapStandardGamepad(ds4).buttons.attack, true);
  assert.equal(mapStandardGamepad(ds4).buttons.confirm, true);
  const unsupported = mapStandardGamepad(pad({ mapping: '', axes: [1, 1, 1, 1], buttons: [7, 6, 0, 1, 9] }));
  assert.deepEqual(unsupported, mapStandardGamepad(null));
});

test('controller prompt labels follow binding indices and identified device family', () => {
  const bindings = DEFAULT_BINDINGS.gamepad;
  assert.equal(gamepadButtonLabel(bindings.attack, 'xbox'), 'RT');
  assert.equal(gamepadButtonLabel(bindings.attack, 'playstation'), 'R2');
  assert.equal(gamepadButtonLabel(bindings.confirm, 'playstation'), 'Cross');
  assert.equal(gamepadButtonLabel(bindings.pause, 'xbox'), 'Menu');
  assert.equal(gamepadButtonLabel(4, 'xbox'), 'LB', 'an edited attack binding uses its actual button label');
  assert.equal(gamepadButtonLabel(bindings.attack, 'gamepad'), 'Button 8');
  assert.equal(gamepadButtonLabel(20, 'playstation'), 'Button 21', 'unknown indices remain neutral');
  assert.equal(gamepadAxesLabel(bindings.moveAxes, 'xbox'), 'Left stick');
  assert.equal(gamepadAxesLabel(bindings.aimAxes, 'playstation'), 'Right stick');
  assert.equal(gamepadAxesLabel([2, 3], 'xbox'), 'Right stick', 'swapped movement axes update the label');
  assert.equal(gamepadAxesLabel([1, 0], 'xbox'), 'Axes 2 / 1');
  assert.equal(gamepadAxesLabel(bindings.aimAxes, 'gamepad'), 'Axes 3 / 4');
});

test('left-stick menus ignore drift; analogue triggers use a deliberate threshold', () => {
  assert.equal(mapStandardGamepad(pad({ axes: [0, 0.18, 0, 0] })).menu, 0);
  assert.equal(mapStandardGamepad(pad({ axes: [0, -1, 0, 0] })).menu, -1);
  const trigger = pad();
  const buttons = [...trigger.buttons];
  buttons[7] = { value: 0.3, pressed: false };
  assert.equal(mapStandardGamepad({ ...trigger, buttons }).buttons.attack, false);
  buttons[7] = { value: 0.7, pressed: false };
  assert.equal(mapStandardGamepad({ ...trigger, buttons }).buttons.attack, true);
});

test('button edges fire once while hold-to-attack persists', () => {
  const gate = new PadGate();
  const held = mapStandardGamepad(pad({ buttons: [7, 6] }));
  const first = gate.sample(held);
  assert.equal(first.buttons.attack, true);
  assert.equal(first.pressed.attack, true);
  assert.equal(first.pressed.dash, true);
  const second = gate.sample(held);
  assert.equal(second.buttons.attack, true);
  assert.equal(second.pressed.attack, false);
  assert.equal(second.pressed.dash, false);
  gate.sample(mapStandardGamepad(pad()));
  assert.equal(gate.sample(held).pressed.attack, true);
});

test('pause/reconnect clear suppresses held actions until each control is released', () => {
  const gate = new PadGate();
  const held = mapStandardGamepad(pad({ buttons: [7, 9, 0, 13], axes: [1, 0, 0, -1] }));
  gate.sample(held);
  gate.clear(held);
  for (let i = 0; i < 3; i++) {
    const blocked = gate.sample(held);
    assert.equal(blocked.buttons.attack, false);
    assert.equal(blocked.pressed.pause, false);
    assert.equal(blocked.pressed.confirm, false);
    assert.equal(blocked.menu, 0);
    assert.deepEqual(blocked.move, { x: 0, z: 0 });
    assert.deepEqual(blocked.aim, { x: 0, z: 0 });
  }
  // Releasing the menu button permits a new resume press even if RT is still held.
  gate.sample(mapStandardGamepad(pad({ buttons: [7] })));
  const resume = gate.sample(mapStandardGamepad(pad({ buttons: [7, 9] })));
  assert.equal(resume.pressed.pause, true);
  assert.equal(resume.buttons.attack, false);
  gate.sample(mapStandardGamepad(pad()));
  const newAttack = gate.sample(held);
  assert.equal(newAttack.pressed.attack, true);
  assert.equal(newAttack.move.x, 1);
});

test('first-seen controller activation press can be suppressed without losing a later press', () => {
  const gate = new PadGate();
  const activation = mapStandardGamepad(pad({ buttons: [0] }));
  gate.clear(activation);
  assert.equal(gate.sample(activation).pressed.confirm, false);
  gate.sample(mapStandardGamepad(pad()));
  assert.equal(gate.sample(activation).pressed.confirm, true);
  assert.equal(DEFAULT_BINDINGS.keyboard.restart[0], 'KeyR');
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
    fire(fakeWindow, 'keydown', { code: 'ArrowDown', repeat: false });
    fire(fakeWindow, 'keyup', { code: 'ArrowDown' });
    assert.equal(controls.poll().menuDirection, 1, 'quick menu tap survives until poll');
    assert.equal(controls.poll().menuDirection, 0, 'menu tap is consumed once');
    fire(fakeWindow, 'keydown', { code: 'ArrowUp', repeat: false });
    fire(fakeWindow, 'keyup', { code: 'ArrowUp' });
    assert.equal(controls.poll().menuDirection, -1, 'quick menu up tap is retained too');
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
