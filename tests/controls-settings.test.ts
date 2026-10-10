import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ACTION_IDS, BindingCapture, GOOD_KEY, STORAGE_KEY, SettingsStore, bindingKey, conflicts, convertKeySemantics, defaultProfile, defaultSettings, rebind, validateProfile, validateSettings, type Binding, type StorageLike } from '../src/input/settings';
import { Controls, bindingLabel, calibratedVector } from '../src/input/adapter';
import type { PadLike } from '../src/input/gamepad';

const key = (value: string): Binding => ({ kind: 'key', value, semantics: 'physical' });
class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}
test('default profiles cover every semantic action and keep reload separate from menu restart', () => {
  const defaults = defaultSettings(); assert.equal(validateSettings(defaults), true);
  for (const profile of defaults.profiles) for (const action of ACTION_IDS) assert.ok(profile.bindings[action].length, `${profile.kind} ${action}`);
  const keyboard = defaults.profiles[0]; assert.equal(bindingKey(keyboard.bindings.reload[0]), bindingKey(key('KeyR')));
  assert.notEqual(bindingKey(keyboard.bindings.restart[0]), bindingKey(key('KeyR')));
  assert.deepEqual(conflicts(keyboard, 'reload', key('KeyW')), ['moveUp']);
  assert.deepEqual(conflicts(keyboard, 'confirm', key('KeyR')), [], 'different contexts may reuse an input');
});
test('binding transactions support cancel, replace, swap, alternatives and essential navigation validation', () => {
  const profile = defaultProfile('keyboard');
  assert.equal(rebind(profile, 'reload', key('Space')).profile, undefined);
  const replaced = rebind(profile, 'reload', key('Space'), 'replace').profile!;
  assert.deepEqual(replaced.bindings.dash, []); assert.deepEqual(replaced.bindings.reload, [key('Space')]);
  assert.deepEqual(profile.bindings.reload, [key('KeyR')], 'source profile remains untouched');
  const swapped = rebind(profile, 'confirm', key('Escape'), 'swap').profile!;
  assert.deepEqual(swapped.bindings.confirm, [key('Escape')]);
  assert.ok(swapped.bindings.back.some(b => bindingKey(b) === bindingKey(key('Enter'))));
  assert.deepEqual(validateProfile(swapped), []);
  assert.equal(rebind(profile, 'back', null).profile, undefined, 'cannot remove essential back action');
  assert.equal(rebind(profile, 'restart', key('Enter'), 'replace').profile, undefined, 'replacement cannot strand confirmation');
  const alternative = rebind(profile, 'attack', key('KeyJ'), 'cancel', true).profile!;
  assert.equal(alternative.bindings.attack.length, 2);
  assert.deepEqual(rebind(profile, 'attack', null).profile!.bindings.attack, []);
});
test('key semantics convert the whole profile and reject mixed position/character collisions', () => {
  const profile = defaultProfile('keyboard'); profile.bindings.reload = [{ kind: 'key', value: 'w', semantics: 'character' }];
  assert.ok(validateProfile(profile).some(e => e.includes('semantics')));
  const converted = defaultProfile('keyboard');
  assert.deepEqual(convertKeySemantics(converted, 'character', new Map([['KeyW', 'z'], ['KeyZ', 'w']])), []);
  assert.deepEqual(validateProfile(converted), []);
  assert.deepEqual(converted.bindings.moveUp, [{ kind: 'key', value: 'z', semantics: 'character' }]);
  assert.deepEqual(convertKeySemantics(converted, 'physical', new Map([['KeyW', 'z'], ['KeyZ', 'w']])), []);
  assert.equal(bindingKey(converted.bindings.moveUp[0]), bindingKey(key('KeyW')));
});
test('capture requires initiating release, deliberate input and subsequent neutral before preview', () => {
  const capture = new BindingCapture('controller', 'physical'); const axis: Binding = { kind: 'axis', axis: 3, direction: -1 };
  capture.sample([{ kind: 'button', button: 0 }]); assert.equal(capture.state, 'release');
  capture.sample([]); assert.equal(capture.state, 'armed');
  capture.sample([key('KeyW')]); assert.equal(capture.state, 'armed', 'other device does not bind');
  capture.sample([axis]); assert.equal(capture.state, 'neutral'); assert.deepEqual(capture.candidate, axis);
  capture.sample([axis]); assert.equal(capture.state, 'neutral'); capture.sample([]); assert.equal(capture.state, 'preview');
});
test('settings round-trip, named profile selection and reset preserve unrelated stored data', () => {
  const storage = new MemoryStorage(); storage.setItem('display-settings', '{"scale":1.5}');
  const store = new SettingsStore(storage); const edited = rebind(store.profile('keyboard'), 'reload', key('KeyJ')).profile!;
  assert.deepEqual(store.applyProfile(edited), []);
  assert.equal(bindingKey(new SettingsStore(storage).profile('keyboard').bindings.reload[0]), bindingKey(key('KeyJ')));
  const custom = defaultProfile('controller', 'my-pad'); custom.name = 'My pad'; store.applyProfile(custom);
  const next = structuredClone(store.value); next.controllerProfile = custom.id; next.controllerAssignments['Generic Device'] = custom.id; store.apply(next);
  const loaded = new SettingsStore(storage); assert.equal(loaded.profile('controller').id, custom.id);
  loaded.restoreProfile(loaded.profile('keyboard').id); assert.equal(bindingKey(loaded.profile('keyboard').bindings.reload[0]), bindingKey(key('KeyR')));
  assert.equal(loaded.profile('controller').id, custom.id); assert.equal(storage.getItem('display-settings'), '{"scale":1.5}');
  assert.equal(storage.values.size, 3, 'only isolated controls and recovery keys are written');
});
test('last-known-good recovery survives invalid current data, and corrupt backup does not discard valid current', () => {
  const storage = new MemoryStorage(); const store = new SettingsStore(storage);
  store.applyProfile(rebind(store.profile('keyboard'), 'reload', key('KeyJ')).profile!);
  store.applyProfile(rebind(store.profile('keyboard'), 'reload', key('KeyK')).profile!);
  storage.setItem(STORAGE_KEY, '{ broken'); const recovered = new SettingsStore(storage);
  assert.equal(bindingKey(recovered.profile('keyboard').bindings.reload[0]), bindingKey(key('KeyJ')));
  storage.setItem(STORAGE_KEY, JSON.stringify(store.value)); storage.setItem(GOOD_KEY, '{ broken');
  const valid = new SettingsStore(storage); assert.equal(bindingKey(valid.profile('keyboard').bindings.reload[0]), bindingKey(key('KeyK')));
  valid.recover(); assert.equal(validateSettings(valid.value), true);
});
test('unavailable, quota-failing, incompatible and malformed storage remain playable', () => {
  const blocked: StorageLike = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
  const store = new SettingsStore(blocked); assert.equal(validateSettings(store.value), true);
  const next = rebind(store.profile('keyboard'), 'attack', key('KeyJ')).profile!; assert.deepEqual(store.applyProfile(next), []);
  assert.equal(bindingKey(store.profile('keyboard').bindings.attack[0]), bindingKey(key('KeyJ'))); assert.match(store.status, /Could not save/);
  for (const value of [{ version: 99 }, { ...defaultSettings(), profiles: [null] }, { ...defaultSettings(), promptFamily: 'unsafe' }]) {
    const storage = new MemoryStorage(); storage.setItem(STORAGE_KEY, JSON.stringify(value)); assert.equal(validateSettings(new SettingsStore(storage).value), true);
  }
});
test('calibration validates usable dead zones, analog magnitude, inversion and labels', () => {
  const profile = defaultProfile('controller'); assert.deepEqual(calibratedVector(.08, -.05, profile), { x: 0, z: 0 });
  assert.ok(Math.abs(calibratedVector(.59, 0, profile).x - .5) < 1e-9);
  profile.calibration.outerDeadzone = .1; assert.ok(Math.abs(calibratedVector(.9, 0, profile).x - 1) < 1e-9);
  profile.calibration.invertMoveX = true; assert.equal(calibratedVector(1, 0, profile).x, -1);
  profile.calibration.innerDeadzone = .8; profile.calibration.outerDeadzone = .4; assert.ok(validateProfile(profile).length);
  assert.equal(bindingLabel({ kind: 'button', button: 7 }, 'playstation'), 'R2');
  assert.equal(bindingLabel({ kind: 'axis', axis: 2, direction: -1 }, 'gamepad'), 'Axis 3 −');
  assert.match(bindingLabel({ kind: 'key', value: 'ż', semantics: 'character' }), /character/);
});

function pad(options: { mapping?: string; id?: string; index?: number; axes?: number[]; buttons?: Record<number, number> } = {}): PadLike {
  return { id: options.id ?? 'Xbox Controller', mapping: options.mapping ?? 'standard', index: options.index ?? 3, connected: true, axes: options.axes ?? [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ value: options.buttons?.[i] ?? 0, pressed: (options.buttons?.[i] ?? 0) >= .5 })) };
}
function harness(run: (api: { controls: Controls; setPads: (pads: PadLike[]) => void; fire: (name: string, fields?: Record<string, unknown>) => void; advance: (ms: number) => void; safety: string[] }) => void): void {
  const fakeWindow = new EventTarget();
  class FakeElement extends EventTarget { tagName = 'CANVAS'; isContentEditable = false; focus() { fakeWindow.dispatchEvent(new Event('focus')); } }
  const fakeDocument = Object.assign(new EventTarget(), { hidden: false, hasFocus: () => true });
  let pads: PadLike[] = []; let now = 1000;
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [name, value] of Object.entries({ window: fakeWindow, document: fakeDocument, HTMLElement: FakeElement, navigator: { getGamepads: () => pads }, performance: { now: () => now } })) { originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, value }); }
  const safety: string[] = []; const controls = new Controls(new FakeElement() as unknown as HTMLCanvasElement, { screenDirection: (x, y) => ({ x, z: y }), pointerAim: (x, y) => ({ x, z: y }), onSafetyPause: reason => safety.push(reason) }, new SettingsStore(new MemoryStorage()));
  try { run({ controls, setPads: value => { pads = value; }, advance: ms => { now += ms; }, fire: (name, fields = {}) => fakeWindow.dispatchEvent(Object.assign(new Event(name, { cancelable: true }), fields)), safety }); }
  finally { controls.dispose(); for (const [name, original] of originals) { if (original) Object.defineProperty(globalThis, name, original); else Reflect.deleteProperty(globalThis, name); } }
}
test('semantic contexts isolate reload/restart/menu confirmation and remapped inputs update labels immediately', () => harness(({ controls, fire }) => {
  fire('keydown', { code: 'KeyR' }); assert.equal(controls.poll().actions.reloadPressed, true); assert.equal(controls.poll().restartPressed, false); fire('keyup', { code: 'KeyR' });
  controls.setContext('menu'); fire('keydown', { code: 'KeyR' }); assert.equal(controls.poll().actions.reloadPressed, false); fire('keyup', { code: 'KeyR' });
  fire('keydown', { code: 'F5' }); assert.equal(controls.poll().restartPressed, true); fire('keyup', { code: 'F5' });
  controls.settings.applyProfile(rebind(controls.settings.profile('keyboard'), 'confirm', key('KeyJ')).profile!);
  assert.equal(controls.label('confirm', 'keyboard'), 'J'); fire('keydown', { code: 'Enter' }); assert.equal(controls.poll().confirmPressed, false); fire('keyup', { code: 'Enter' });
  fire('keydown', { code: 'KeyJ' }); const frame = controls.poll(); assert.equal(frame.confirmPressed, true); assert.equal(frame.actions.attackPressed, false);
}));
test('toggle attack, settings application and context transitions require released inputs', () => harness(({ controls, fire }) => {
  const profile = rebind(controls.settings.profile('keyboard'), 'attack', key('KeyJ')).profile!; profile.calibration.attackMode = 'toggle'; controls.settings.applyProfile(profile);
  fire('keydown', { code: 'KeyJ' }); assert.equal(controls.poll().actions.attackHeld, true); fire('keyup', { code: 'KeyJ' }); assert.equal(controls.poll().actions.attackHeld, true);
  controls.setContext('menu'); assert.equal(controls.poll().actions.attackHeld, false); controls.setContext('gameplay'); assert.equal(controls.poll().actions.attackHeld, false);
  fire('keydown', { code: 'KeyJ' }); assert.equal(controls.poll().actions.attackHeld, true); controls.settings.applyProfile(profile); assert.equal(controls.poll().actions.attackHeld, false);
  fire('keyup', { code: 'KeyJ' }); controls.poll(); fire('keydown', { code: 'KeyJ' }); assert.equal(controls.poll().actions.attackHeld, true);
}));
test('axis capture ignores drift, waits for real neutral and permits binding the current back key', () => harness(({ controls, setPads, fire }) => {
  setPads([pad()]); controls.poll(); controls.beginCapture('controller', 'physical'); controls.poll();
  setPads([pad({ axes: [.3, 0, 0, 0] })]); controls.poll(); assert.equal(controls.capture?.state, 'armed');
  setPads([pad({ axes: [.8, 0, 0, 0] })]); controls.poll(); assert.equal(controls.capture?.state, 'neutral');
  setPads([pad({ axes: [.4, 0, 0, 0] })]); controls.poll(); assert.equal(controls.capture?.state, 'neutral');
  setPads([pad()]); controls.poll(); assert.equal(controls.capture?.state, 'preview'); controls.endCapture();
  controls.beginCapture('keyboard', 'physical'); controls.poll(); fire('keydown', { code: 'Escape', key: 'Escape' }); controls.poll(); fire('keyup', { code: 'Escape', key: 'Escape' }); controls.poll();
  assert.equal(controls.capture?.state, 'preview'); assert.equal(bindingKey(controls.capture!.candidate!), bindingKey(key('Escape')));
  fire('blur'); fire('keydown', { code: 'KeyJ' }); controls.poll();
  assert.equal(controls.capture?.state, 'release', 'background input cannot complete a capture');
  fire('focus'); controls.poll(); assert.equal(controls.capture?.state, 'release', 'refocus still requires release');
  fire('keyup', { code: 'KeyJ' }); controls.poll(); assert.equal(controls.capture?.state, 'armed');
}));
test('holding the currently mapped back action cancels capture without reserving its tap', () => harness(({ controls, fire, advance }) => {
  controls.beginCapture('keyboard', 'physical'); controls.poll(); fire('keydown', { code: 'Escape' }); assert.equal(controls.poll().backPressed, false); advance(1300); assert.equal(controls.poll().backPressed, true);
}));
test('gamepad selection, nonstandard opt-in, trigger thresholds and prompt overrides are honored', () => harness(({ controls, setPads }) => {
  setPads([pad({ id: 'Unknown device', mapping: '', index: 2 }), pad({ index: 5 })]); controls.poll();
  setPads([pad({ id: 'Unknown device', mapping: '', index: 2, buttons: { 7: 1 } }), pad({ index: 5 })]); assert.equal(controls.poll().actions.attackHeld, false);
  controls.assignCurrentController('controller'); assert.equal(controls.poll().actions.attackHeld, false, 'selection clears held input');
  setPads([pad({ id: 'Unknown device', mapping: '', index: 2 }), pad({ index: 5 })]); controls.poll();
  setPads([pad({ id: 'Unknown device', mapping: '', index: 2, buttons: { 7: 1 } }), pad({ index: 5 })]); assert.equal(controls.poll().actions.attackPressed, true);
  controls.selectController(5); assert.equal(controls.listControllers().find(p => p.active)?.index, 5);
  const next = structuredClone(controls.settings.value); next.promptFamily = 'playstation'; next.profiles.find(p => p.id === 'controller')!.calibration.triggerThreshold = .9; controls.settings.apply(next);
  setPads([pad({ index: 5, buttons: { 7: .6 } })]); assert.equal(controls.poll().actions.attackPressed, false, 'pressed boolean cannot override analog threshold');
  setPads([pad({ index: 5, buttons: { 7: 1 } })]); assert.equal(controls.poll().actions.attackPressed, true); assert.equal(controls.poll().family, 'playstation'); assert.equal(controls.label('attack'), 'R2');
}));
test('stick aim sensitivity changes actual turn speed; dead zones and menu repeat use settings', () => harness(({ controls, setPads, advance }) => {
  setPads([pad()]); controls.poll(); advance(250); setPads([pad({ axes: [0, 0, 1, 0] })]); controls.poll();
  const next = structuredClone(controls.settings.profile('controller')); next.calibration.aimSensitivity = .25; controls.settings.applyProfile(next);
  setPads([pad()]); controls.poll(); advance(16); setPads([pad({ axes: [0, 0, 1, 0] })]); controls.poll();
  advance(16); setPads([pad({ axes: [0, 0, 0, 1] })]); const turned = controls.poll().actions.aim!; assert.ok(turned.x > .9 && turned.z > 0 && turned.z < .2);
  setPads([pad()]); controls.setContext('menu'); controls.poll(); setPads([pad({ buttons: { 13: 1 } })]); assert.equal(controls.poll().menuDirection, 1);
  advance(100); assert.equal(controls.poll().menuDirection, 0); advance(270); assert.equal(controls.poll().menuDirection, 1); advance(50); assert.equal(controls.poll().menuDirection, 0); advance(100); assert.equal(controls.poll().menuDirection, 1);
}));
