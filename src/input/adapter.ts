import type { Actions, Vec2 } from '../game/types';
import { controllerFamily, gamepadButtonLabel, type InputFamily, type PadLike } from './gamepad';
import { ACTIONS, ACTION_IDS, BindingCapture, SettingsStore, bindingKey, type ActionId, type Binding, type Context, type DeviceKind, type Profile } from './settings';

export interface ControlFrame {
  actions: Actions;
  pausePressed: boolean; confirmPressed: boolean; backPressed: boolean; restartPressed: boolean;
  settingsPressed: boolean; interactPressed: boolean; menuDirection: number; menuHorizontal: number; tabDirection: number; scrollDirection: number;
  family: InputFamily; controllerStatus: string;
}
interface Callbacks { screenDirection: (x: number, y: number) => Vec2; pointerAim: (x: number, y: number) => Vec2 | null; onSafetyPause: (reason: string) => void }
const zero = (): Vec2 => ({ x: 0, z: 0 });
const clamp = (n: number): number => Math.min(1, Math.max(0, n));
const normalize = (v: Vec2): Vec2 => { const length = Math.max(1, Math.hypot(v.x, v.z)); return { x: v.x / length, z: v.z / length }; };
export function bindingLabel(binding: Binding, family: InputFamily = 'keyboard'): string {
  if (binding.kind === 'key') return `${binding.shift ? 'Shift+' : ''}${binding.value.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, '').replace('Escape', 'Esc')}${binding.semantics === 'character' ? ' (character)' : ''}`;
  if (binding.kind === 'mouse') return `Mouse ${binding.button + 1}`;
  if (binding.kind === 'wheel') return `Wheel ${binding.direction < 0 ? 'up' : 'down'}`;
  if (binding.kind === 'button') return gamepadButtonLabel(binding.button, family);
  if ((family === 'xbox' || family === 'playstation') && binding.axis < 4) return `${binding.axis < 2 ? 'Left' : 'Right'} stick ${binding.axis % 2 ? binding.direction < 0 ? '↑' : '↓' : binding.direction < 0 ? '←' : '→'}`;
  return `Axis ${binding.axis + 1} ${binding.direction < 0 ? '−' : '+'}`;
}
export function calibratedVector(x: number, y: number, profile: Profile, aim = false): Vec2 {
  const c = profile.calibration; const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length <= c.innerDeadzone) return zero();
  const magnitude = clamp((length - c.innerDeadzone) / (1 - c.innerDeadzone - c.outerDeadzone) * (aim ? c.aimSensitivity : c.sensitivity));
  return { x: x / length * magnitude * ((aim ? c.invertAimX : c.invertMoveX) ? -1 : 1), z: y / length * magnitude * ((aim ? c.invertAimY : c.invertMoveY) ? -1 : 1) };
}
export class Controls {
  readonly settings: SettingsStore;
  context: Context = 'gameplay';
  capture: BindingCapture | null = null;
  private keys = new Map<string, { key: string; shift: boolean }>();
  private transient = new Map<string, Binding>();
  private mouse = new Set<number>();
  private blocked = new Set<string>();
  private previous = new Set<ActionId>();
  private repeats = new Map<ActionId, number>();
  private pointer: { x: number; y: number } | null = null;
  private pointerAnchor: { x: number; y: number } | null = null;
  private family: InputFamily = 'keyboard';
  private lastSwitch = -Infinity;
  private lastAxes: number[] = [];
  private activePad: { index: number; id: string } | null = null;
  private lastButtons = new Set<number>();
  private toggleAttack = false;
  private captureBackSince = 0;
  private smoothedAim: Vec2 | null = null;
  private lastPollTime = performance.now();
  private focused = document.hasFocus();
  private disposers: (() => void)[] = [];
  private controllerStatus = 'No controller detected. Press a controller button to connect.';
  constructor(private canvas: HTMLCanvasElement, private callbacks: Callbacks, settings?: SettingsStore) {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* Session-only settings still work. */ }
    this.settings = settings ?? new SettingsStore(storage);
    this.settings.onChange = () => this.clear();
    this.listen(window, 'keydown', ((event: KeyboardEvent) => {
      const physical: Binding = { kind: 'key', value: event.code, semantics: 'physical', shift: Boolean(event.shiftKey) };
      const character: Binding = { kind: 'key', value: event.key ?? event.code, semantics: 'character', shift: Boolean(event.shiftKey) };
      if (this.isTextEntry(event.target) && this.context !== 'capture') {
        const exits: ActionId[] = ['confirm', 'back', 'tabNext', 'tabPrevious'];
        if (!exits.some(a => this.settings.profile('keyboard').bindings[a].some(b => bindingKey(b) === bindingKey(physical) || bindingKey(b) === bindingKey(character)))) return;
      }
      const bound = this.isBound(physical) || this.isBound(character);
      if (bound || this.context !== 'gameplay') event.preventDefault();
      if (event.repeat) return;
      this.keys.set(event.code, { key: event.key ?? event.code, shift: Boolean(event.shiftKey) });
      for (const b of [physical, character]) if (!this.blocked.has(bindingKey(b))) this.transient.set(bindingKey(b), b);
      if (bound || this.context === 'capture') this.setFamily('keyboard', true);
    }) as EventListener);
    this.listen(window, 'keyup', ((event: KeyboardEvent) => {
      const existing = this.keys.get(event.code); this.keys.delete(event.code);
      for (const shift of [false, true]) {
        this.blocked.delete(bindingKey({ kind: 'key', value: event.code, semantics: 'physical', shift }));
        this.blocked.delete(bindingKey({ kind: 'key', value: existing?.key ?? event.key ?? event.code, semantics: 'character', shift }));
      }
    }) as EventListener);
    this.listen(window, 'pointerdown', ((event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      const onCanvas = event.target === canvas;
      const nativeControl = event.target instanceof HTMLElement && Boolean(event.target.closest?.('button,input,select,textarea,label'));
      if (!onCanvas && this.context !== 'capture' && event.button === 0 && nativeControl) return;
      if (!onCanvas && event.button !== 0) event.preventDefault();
      if (onCanvas) { event.preventDefault(); canvas.focus({ preventScroll: true }); }
      this.pointer = { x: event.clientX, y: event.clientY }; this.mouse.add(event.button);
      const b: Binding = { kind: 'mouse', button: event.button };
      if (!this.blocked.has(bindingKey(b))) this.transient.set(bindingKey(b), b);
      this.setFamily('keyboard', true);
    }) as EventListener);
    this.listen(window, 'pointerup', ((event: PointerEvent) => { this.mouse.delete(event.button); this.blocked.delete(bindingKey({ kind: 'mouse', button: event.button })); }) as EventListener);
    this.listen(canvas, 'pointermove', ((event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      this.pointer = { x: event.clientX, y: event.clientY };
      if (!this.pointerAnchor) { this.pointerAnchor = { ...this.pointer }; return; }
      if (Math.hypot(event.clientX - this.pointerAnchor.x, event.clientY - this.pointerAnchor.y) >= 5) { this.pointerAnchor = { ...this.pointer }; this.setFamily('keyboard'); }
    }) as EventListener);
    this.listen(window, 'wheel', ((event: WheelEvent) => {
      if (!event.deltaY) return;
      const b: Binding = { kind: 'wheel', direction: event.deltaY < 0 ? -1 : 1 };
      if (this.isBound(b) || this.context === 'capture') { event.preventDefault(); this.transient.set(bindingKey(b), b); this.setFamily('keyboard', true); }
    }) as EventListener, { passive: false });
    this.listen(window, 'contextmenu', event => { if (this.context === 'capture' || event.target === canvas || this.isBound({ kind: 'mouse', button: 2 })) event.preventDefault(); });
    this.listen(window, 'pointercancel', () => this.safetyPause('Pointer input interrupted'));
    this.listen(window, 'blur', () => { this.focused = false; this.safetyPause('Window lost focus'); this.keys.clear(); this.mouse.clear(); });
    this.listen(window, 'focus', () => { this.focused = true; this.clear(); });
    this.listen(document, 'visibilitychange', () => { if (document.hidden) this.safetyPause('Tab hidden'); });
    this.listen(window, 'gamepaddisconnected', ((event: GamepadEvent) => { if (event.gamepad.index === this.activePad?.index) this.disconnect(); }) as EventListener);
  }
  get revision(): number { return this.settings.revision; }
  get currentFamily(): InputFamily { return this.family === 'keyboard' ? 'keyboard' : this.settings.value.promptFamily === 'auto' ? this.family : this.settings.value.promptFamily; }
  label(action: ActionId, family = this.currentFamily): string { return this.settings.profile(family === 'keyboard' ? 'keyboard' : 'controller').bindings[action].map(b => bindingLabel(b, family)).join(' / ') || 'Unbound'; }
  setContext(context: Context): void { if (this.context !== context) { this.clear(); this.context = context; } }
  beginCapture(kind: DeviceKind, semantics: 'physical' | 'character'): void { this.setContext('capture'); this.captureBackSince = 0; this.capture = new BindingCapture(kind, semantics); }
  endCapture(): void { this.capture = null; this.setContext('menu'); }
  listControllers(): { index: number; id: string; mapping: string; active: boolean }[] { return this.readPads().map(p => ({ index: p.index, id: p.id, mapping: p.mapping, active: p.index === this.activePad?.index && p.id === this.activePad?.id })); }
  selectController(index: number): void {
    const pad = this.readPads().find(p => p.index === index); if (!pad) return;
    this.clear(); this.activePad = { index: pad.index, id: pad.id };
    for (const blocked of this.blocked) if (blocked.startsWith('button:') || blocked.startsWith('axis:')) this.blocked.delete(blocked);
    const assigned = this.settings.value.controllerAssignments[pad.id];
    if (assigned) { const next = structuredClone(this.settings.value); next.controllerProfile = assigned; this.settings.apply(next); }
    this.clear(); this.lastAxes = [...pad.axes]; this.lastButtons = new Set(pad.buttons.flatMap((b, i) => b.value > .1 || b.pressed ? [i] : []));
  }
  assignCurrentController(profileId: string): void { const next = structuredClone(this.settings.value); next.controllerProfile = profileId; if (this.activePad) next.controllerAssignments[this.activePad.id] = profileId; this.settings.apply(next); }
  calibrationSample(preview?: Profile): { axes: readonly number[]; buttons: readonly number[]; move: Vec2; aim: Vec2 } {
    const pad = this.readPads().find(p => p.index === this.activePad?.index && p.id === this.activePad.id); const profile = preview?.kind === 'controller' ? preview : this.settings.profile('controller');
    const value = (a: ActionId) => Math.max(0, ...profile.bindings[a].map(b => this.rawValue(b, pad ?? null)));
    return { axes: pad?.axes ?? [], buttons: pad?.buttons.map(b => b.value) ?? [], move: calibratedVector(value('moveRight') - value('moveLeft'), value('moveDown') - value('moveUp'), profile), aim: calibratedVector(value('aimRight') - value('aimLeft'), value('aimDown') - value('aimUp'), profile, true) };
  }
  poll(): ControlFrame {
    const now = performance.now(); const elapsed = Math.min(.1, Math.max(0, (now - this.lastPollTime) / 1000)); this.lastPollTime = now;
    const pad = this.pollPad(); const profiles = [this.settings.profile('keyboard'), this.settings.profile('controller')];
    const mappedPad = pad && (pad.mapping === 'standard' || this.settings.value.controllerAssignments[pad.id]) ? pad : null;
    const heldKeys = new Set(this.physicalBindings(pad, false).map(bindingKey));
    for (const blocked of this.blocked) if (!heldKeys.has(blocked)) this.blocked.delete(blocked);
    if (!this.focused || document.hidden) this.clear();
    const values = new Map<ActionId, number>(); const edges = new Set<ActionId>();
    if (pad) {
      const buttons = new Set(pad.buttons.flatMap((b, i) => (Number.isFinite(b.value) ? b.value >= profiles[1].calibration.triggerThreshold : b.pressed) ? [i] : []));
      const pressed = [...buttons].some(i => !this.lastButtons.has(i));
      const moved = pad.axes.some((a, i) => Math.abs(a) > Math.max(.35, profiles[1].calibration.innerDeadzone + .15) && Math.abs(a - (this.lastAxes[i] ?? 0)) > .15);
      if (pressed || moved) this.setFamily(pad.mapping === 'standard' ? controllerFamily(pad.id) : 'gamepad', pressed);
      this.lastAxes = [...pad.axes]; this.lastButtons = buttons;
    }
    if (this.capture && this.focused && !document.hidden) {
      const filter = (b: Binding) => b.kind !== 'key' || b.semantics === this.capture!.semantics;
      this.capture.sample([...this.physicalBindings(pad, this.capture.state === 'armed').filter(filter), ...[...this.transient.values()].filter(filter)]);
      const backHeld = profiles.some(p => p.bindings.back.some(b => this.rawValue(b, pad) >= .65));
      if (!backHeld) this.captureBackSince = 0;
      else if (!this.captureBackSince) this.captureBackSince = now;
      else if (now - this.captureBackSince >= 1200) edges.add('back');
    }
    for (const action of ACTION_IDS) {
      if (ACTIONS[action][1] !== this.context || !this.focused || document.hidden) continue;
      let value = 0; let tapped = false;
      for (const profile of profiles) for (const b of profile.bindings[action]) {
        if (this.blocked.has(bindingKey(b))) continue;
        let raw = this.rawValue(b, mappedPad); const isVector = action.startsWith('move') || action.startsWith('aim');
        if (b.kind === 'button') raw = raw >= profile.calibration.triggerThreshold ? 1 : 0;
        if (b.kind === 'axis' && !isVector) raw = raw >= (ACTIONS[action][1] === 'menu' ? profile.calibration.menuThreshold : profile.calibration.triggerThreshold) ? 1 : 0;
        value = Math.max(value, raw); tapped ||= this.transient.has(bindingKey(b));
      }
      values.set(action, value); if ((value > 0 && !this.previous.has(action)) || tapped) edges.add(action);
    }
    const down = (a: ActionId) => (values.get(a) ?? 0) > 0; const edge = (a: ActionId) => edges.has(a);
    const repeat = (a: ActionId): boolean => {
      const c = this.settings.profile(this.family === 'keyboard' ? 'keyboard' : 'controller').calibration;
      if (edge(a)) { this.repeats.set(a, now + c.repeatDelay); return true; }
      if (!down(a)) { this.repeats.delete(a); return false; }
      if (now >= (this.repeats.get(a) ?? Infinity)) { this.repeats.set(a, now + c.repeatInterval); return true; } return false;
    };
    const vector = (aim: boolean): Vec2 => {
      if (this.context !== 'gameplay' || !this.focused || document.hidden) return zero(); const prefix = aim ? 'aim' : 'move';
      const vectors = profiles.map(profile => {
        const raw = (a: ActionId) => Math.max(0, ...profile.bindings[a].filter(b => !this.blocked.has(bindingKey(b))).map(b => { const v = this.rawValue(b, mappedPad); return b.kind === 'button' ? Number(v >= profile.calibration.triggerThreshold) : v; }));
        const x = raw(`${prefix}Right`) - raw(`${prefix}Left`), z = raw(`${prefix}Down`) - raw(`${prefix}Up`);
        return profile.kind === 'controller' ? calibratedVector(x, z, profile, aim) : normalize({ x: x * ((aim ? profile.calibration.invertAimX : profile.calibration.invertMoveX) ? -1 : 1), z: z * ((aim ? profile.calibration.invertAimY : profile.calibration.invertMoveY) ? -1 : 1) });
      });
      return Math.hypot(vectors[0].x, vectors[0].z) > 0 ? vectors[0] : vectors[1];
    };
    const movement = vector(false), aimVector = vector(true);
    let aim: Vec2 | null = Math.hypot(aimVector.x, aimVector.z) > 0 ? this.callbacks.screenDirection(aimVector.x, aimVector.z) : null;
    if (aim && this.family !== 'keyboard') {
      // Rotate the actual aim direction at a configurable rate, independent of polling FPS.
      if (this.smoothedAim) {
        const from = Math.atan2(this.smoothedAim.z, this.smoothedAim.x), to = Math.atan2(aim.z, aim.x);
        const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
        const turn = Math.max(-1, Math.min(1, delta / Math.max(1e-8, Math.abs(delta)))) * Math.min(Math.abs(delta), Math.PI * 8 * profiles[1].calibration.aimSensitivity * elapsed);
        aim = { x: Math.cos(from + turn), z: Math.sin(from + turn) };
      }
      this.smoothedAim = aim;
    }
    if (!aim && this.context === 'gameplay' && this.family === 'keyboard' && profiles[0].calibration.pointerAim && this.pointer) aim = this.callbacks.pointerAim(this.pointer.x, this.pointer.y);
    const attackMode = this.settings.profile(this.family === 'keyboard' ? 'keyboard' : 'controller').calibration.attackMode;
    if (edge('attack') && attackMode === 'toggle') this.toggleAttack = !this.toggleAttack;
    const result: ControlFrame = {
      actions: { move: this.callbacks.screenDirection(movement.x, movement.z), aim, attackHeld: this.context === 'gameplay' && (attackMode === 'toggle' ? this.toggleAttack : down('attack')), attackPressed: edge('attack'), dashPressed: edge('dash'), reloadPressed: edge('reload'), interactPressed: edge('interact') },
      pausePressed: edge('pause'), confirmPressed: edge('confirm'), backPressed: edge('back'), restartPressed: edge('restart'), settingsPressed: edge('settings'), interactPressed: edge('interact'),
      menuDirection: Number(repeat('menuDown')) - Number(repeat('menuUp')), menuHorizontal: Number(repeat('menuRight')) - Number(repeat('menuLeft')),
      tabDirection: Number(repeat('tabNext')) - Number(repeat('tabPrevious')), scrollDirection: Number(repeat('scrollDown')) - Number(repeat('scrollUp')),
      family: this.currentFamily, controllerStatus: this.controllerStatus,
    };
    this.previous = new Set([...values].filter(([, value]) => value > 0).map(([a]) => a)); this.transient.clear(); return result;
  }
  clear(): void {
    const pad = this.readPads().find(p => p.index === this.activePad?.index && p.id === this.activePad.id);
    for (const b of this.physicalBindings(pad ?? null, false)) this.blocked.add(bindingKey(b));
    this.transient.clear(); this.previous.clear(); this.repeats.clear(); this.toggleAttack = false; this.pointer = null; this.smoothedAim = null;
  }
  dispose(): void { for (const dispose of this.disposers) dispose(); this.disposers = []; this.clear(); }
  private listen(target: EventTarget, type: string, listener: EventListener, options?: AddEventListenerOptions): void { target.addEventListener(type, listener, options); this.disposers.push(() => target.removeEventListener(type, listener, options)); }
  private isTextEntry(target: EventTarget | null): boolean { return target instanceof HTMLElement && (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' && /^(text|search|email|number)$/.test((target as HTMLInputElement).type)); }
  private isBound(binding: Binding): boolean { return ACTION_IDS.some(a => ACTIONS[a][1] === this.context && this.settings.profile('keyboard').bindings[a].some(b => bindingKey(b) === bindingKey(binding))); }
  private rawValue(binding: Binding, pad: PadLike | null): number {
    if (binding.kind === 'key') return Number([...this.keys].some(([code, key]) => (binding.semantics === 'physical' ? code : key.key) === binding.value && Boolean(binding.shift) === key.shift));
    if (binding.kind === 'mouse') return Number(this.mouse.has(binding.button)); if (binding.kind === 'wheel') return Number(this.transient.has(bindingKey(binding)));
    if (binding.kind === 'button') { const b = pad?.buttons[binding.button]; return b ? Number.isFinite(b.value) ? clamp(b.value) : Number(b.pressed) : 0; }
    return clamp((pad?.axes[binding.axis] ?? 0) * binding.direction);
  }
  private physicalBindings(pad: PadLike | null, intentional: boolean): Binding[] {
    const active: Binding[] = [];
    for (const [code, key] of this.keys) active.push({ kind: 'key', value: code, semantics: 'physical', shift: key.shift }, { kind: 'key', value: key.key, semantics: 'character', shift: key.shift });
    for (const button of this.mouse) active.push({ kind: 'mouse', button });
    pad?.buttons.forEach((b, button) => { if (Number.isFinite(b.value) ? b.value > (intentional ? .65 : .08) : b.pressed) active.push({ kind: 'button', button }); });
    pad?.axes.forEach((v, axis) => { if (Math.abs(v) > (intentional ? .65 : this.settings.profile('controller').calibration.innerDeadzone)) active.push({ kind: 'axis', axis, direction: v < 0 ? -1 : 1 }); });
    return active;
  }
  private setFamily(family: InputFamily, force = false): void { const now = performance.now(); if (this.family !== family && (force || now - this.lastSwitch >= 220)) { this.family = family; this.lastSwitch = now; } }
  private readPads(): PadLike[] {
    if (typeof navigator.getGamepads !== 'function') { this.controllerStatus = 'Gamepad API unavailable; keyboard and mouse remain available.'; return []; }
    try { return Array.from(navigator.getGamepads()).filter((p): p is Gamepad => Boolean(p?.connected)); }
    catch { this.controllerStatus = 'Browser blocked controller access; use keyboard and mouse.'; return []; }
  }
  private pollPad(): PadLike | null {
    const pads = this.readPads(); let pad = pads.find(p => p.index === this.activePad?.index && p.id === this.activePad.id);
    if (this.activePad && !pad) this.disconnect();
    if (!pad && pads.length) { this.selectController(pads[0].index); pad = pads[0]; }
    if (pad) this.controllerStatus = `${pad.mapping === 'standard' ? controllerFamily(pad.id) : 'Generic controller'} · ${pad.mapping === 'standard' ? 'standard mapping' : this.settings.value.controllerAssignments[pad.id] ? 'custom mapping selected' : 'unverified mapping: use guided setup; actions disabled'} · ${this.settings.profile('controller').name}`;
    else if (typeof navigator.getGamepads === 'function') this.controllerStatus = 'No controller detected. Press a controller button to connect.';
    return pad ?? null;
  }
  private safetyPause(reason: string): void {
    this.clear();
    if (this.capture) this.capture = new BindingCapture(this.capture.kind, this.capture.semantics);
    this.captureBackSince = 0;
    this.callbacks.onSafetyPause(reason);
  }
  private disconnect(): void { this.activePad = null; this.lastAxes = []; this.lastButtons.clear(); this.safetyPause('Controller disconnected'); }
}
