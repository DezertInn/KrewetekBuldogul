import type { Actions, Vec2 } from '../game/types';

/** Prototype defaults are data so future profile/rebinding UI can replace them. */
export const DEFAULT_BINDINGS = {
  keyboard: {
    move: { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'] },
    aim: { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'] },
    dash: ['Space'], pause: ['Escape'], confirm: ['Enter'], back: ['Escape'], restart: ['KeyR'],
    menuUp: ['ArrowUp', 'KeyW'], menuDown: ['ArrowDown', 'KeyS'],
  },
  mouse: { attack: 0, back: 2 },
  gamepad: {
    moveAxes: [0, 1], aimAxes: [2, 3], attack: 7, dash: 6, pause: 9,
    confirm: 0, back: 1, menuUp: 12, menuDown: 13,
    deadzone: 0.18, buttonThreshold: 0.5, menuThreshold: 0.55,
  },
  menuRepeat: { delayMs: 360, intervalMs: 140 },
  promptSwitch: { dwellMs: 220, pointerDistancePx: 5 },
} as const;

export type InputFamily = 'keyboard' | 'xbox' | 'playstation' | 'gamepad';
export interface PadLike {
  id: string;
  index: number;
  connected: boolean;
  mapping: string;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}

type PadAction = 'attack' | 'dash' | 'pause' | 'confirm' | 'back';
export interface PadState {
  move: Vec2;
  aim: Vec2;
  buttons: Record<PadAction, boolean>;
  menu: number;
}
export interface PadFrame extends PadState { pressed: Record<PadAction, boolean> }
const padActions: PadAction[] = ['attack', 'dash', 'pause', 'confirm', 'back'];
const zero = (): Vec2 => ({ x: 0, z: 0 });
const emptyButtons = (): Record<PadAction, boolean> => ({ attack: false, dash: false, pause: false, confirm: false, back: false });
const emptyPad = (): PadState => ({ move: zero(), aim: zero(), buttons: emptyButtons(), menu: 0 });

/** Rescales outside a circular dead zone, preserving analog speed and direction. */
export function radialDeadzone(x: number, y: number, deadzone: number = DEFAULT_BINDINGS.gamepad.deadzone): Vec2 {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return zero();
  const length = Math.hypot(x, y);
  const threshold = Math.max(0, Math.min(0.99, deadzone));
  if (length <= threshold || length === 0) return zero();
  const magnitude = Math.min(1, (length - threshold) / (1 - threshold));
  return { x: x / length * magnitude, z: y / length * magnitude };
}

export function controllerFamily(id: string): Exclude<InputFamily, 'keyboard'> {
  if (/dualshock|dualsense|playstation|sony|054c/i.test(id)) return 'playstation';
  if (/xbox|xinput|045e/i.test(id)) return 'xbox';
  return 'gamepad';
}

/** Neutral labels use one-based numbers; no Xbox glyphs are assumed for unknown pads. */
export function gamepadButtonLabel(index: number, family: InputFamily): string {
  const xbox = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Xbox'];
  const playstation = ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'PS'];
  const labels = family === 'xbox' ? xbox : family === 'playstation' ? playstation : [];
  return labels[index] ?? `Button ${index + 1}`;
}

export function gamepadAxesLabel(axes: readonly [number, number], family: InputFamily): string {
  if (family === 'xbox' || family === 'playstation') {
    if (axes[0] === 0 && axes[1] === 1) return 'Left stick';
    if (axes[0] === 2 && axes[1] === 3) return 'Right stick';
  }
  return `Axes ${axes[0] + 1} / ${axes[1] + 1}`;
}

/** Only the browser's standardized mapping has trusted physical semantics. */
export function mapStandardGamepad(pad: PadLike | null): PadState {
  if (!pad?.connected || pad.mapping !== 'standard') return emptyPad();
  const binding = DEFAULT_BINDINGS.gamepad;
  const down = (index: number): boolean => {
    const button = pad.buttons[index];
    return Boolean(button && (button.value >= binding.buttonThreshold || button.pressed));
  };
  const move = radialDeadzone(pad.axes[binding.moveAxes[0]] ?? 0, pad.axes[binding.moveAxes[1]] ?? 0);
  const aim = radialDeadzone(pad.axes[binding.aimAxes[0]] ?? 0, pad.axes[binding.aimAxes[1]] ?? 0);
  const menu = Number(down(binding.menuDown)) - Number(down(binding.menuUp));
  return {
    move, aim,
    buttons: { attack: down(binding.attack), dash: down(binding.dash), pause: down(binding.pause), confirm: down(binding.confirm), back: down(binding.back) },
    menu: menu || (Math.abs(move.z) >= binding.menuThreshold ? Math.sign(move.z) : 0),
  };
}

/** A per-control neutral-release gate prevents a pause/reconnect press replay. */
export class PadGate {
  private blocked = new Set<PadAction>();
  private blockMove = false;
  private blockAim = false;
  private blockMenu = false;
  private previous = emptyButtons();

  clear(raw: PadState): void {
    for (const action of padActions) if (raw.buttons[action]) this.blocked.add(action);
    this.blockMove ||= Math.hypot(raw.move.x, raw.move.z) > 0;
    this.blockAim ||= Math.hypot(raw.aim.x, raw.aim.z) > 0;
    this.blockMenu ||= raw.menu !== 0;
    this.previous = emptyButtons();
  }

  sample(raw: PadState): PadFrame {
    const buttons = emptyButtons();
    const pressed = emptyButtons();
    for (const action of padActions) {
      if (!raw.buttons[action]) this.blocked.delete(action);
      buttons[action] = raw.buttons[action] && !this.blocked.has(action);
      pressed[action] = buttons[action] && !this.previous[action];
    }
    if (Math.hypot(raw.move.x, raw.move.z) === 0) this.blockMove = false;
    if (Math.hypot(raw.aim.x, raw.aim.z) === 0) this.blockAim = false;
    if (raw.menu === 0) this.blockMenu = false;
    this.previous = { ...buttons };
    return { buttons, pressed, move: this.blockMove ? zero() : raw.move, aim: this.blockAim ? zero() : raw.aim, menu: this.blockMenu ? 0 : raw.menu };
  }
}

export interface ControlFrame {
  actions: Actions;
  pausePressed: boolean;
  confirmPressed: boolean;
  backPressed: boolean;
  restartPressed: boolean;
  menuDirection: number;
  family: InputFamily;
  controllerStatus: string;
}
interface Callbacks {
  screenDirection: (x: number, y: number) => Vec2;
  pointerAim: (x: number, y: number) => Vec2 | null;
  onSafetyPause: (reason: string) => void;
}

export class Controls {
  private keys = new Set<string>();
  private keyEdges = new Set<string>();
  private blockedKeys = new Set<string>();
  private mouse = new Set<number>();
  private mouseEdges = new Set<number>();
  private blockedMouse = new Set<number>();
  private pointer: { x: number; y: number } | null = null;
  private pointerAnchor: { x: number; y: number } | null = null;
  private family: InputFamily = 'keyboard';
  private lastSwitch = -Infinity;
  private activePad: { index: number; id: string } | null = null;
  private gate = new PadGate();
  private lastRawPad = emptyPad();
  private menuHeld = 0;
  private menuRepeatAt = 0;
  private focused = document.hasFocus();
  private disposers: (() => void)[] = [];
  private controllerStatus = 'No controller detected. Press a controller button to connect.';

  constructor(private canvas: HTMLCanvasElement, private callbacks: Callbacks) {
    this.listen(window, 'keydown', ((event: KeyboardEvent) => {
      if (this.isTextEntry(event.target)) return;
      if (this.isBoundKey(event.code)) event.preventDefault();
      if (this.blockedKeys.has(event.code) || event.repeat) return;
      if (!this.keys.has(event.code)) this.keyEdges.add(event.code);
      this.keys.add(event.code);
      if (this.isBoundKey(event.code)) this.setFamily('keyboard', true);
    }) as EventListener);
    this.listen(window, 'keyup', ((event: KeyboardEvent) => {
      this.keys.delete(event.code);
      this.blockedKeys.delete(event.code);
    }) as EventListener);
    this.listen(canvas, 'pointerdown', ((event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      this.pointer = { x: event.clientX, y: event.clientY };
      if (!this.blockedMouse.has(event.button)) {
        this.mouse.add(event.button);
        this.mouseEdges.add(event.button);
      }
      this.setFamily('keyboard', true);
    }) as EventListener);
    this.listen(window, 'pointerup', ((event: PointerEvent) => {
      this.mouse.delete(event.button);
      this.blockedMouse.delete(event.button);
    }) as EventListener);
    this.listen(canvas, 'pointermove', ((event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      this.pointer = { x: event.clientX, y: event.clientY };
      if (!this.pointerAnchor) { this.pointerAnchor = { ...this.pointer }; return; }
      if (Math.hypot(event.clientX - this.pointerAnchor.x, event.clientY - this.pointerAnchor.y) >= DEFAULT_BINDINGS.promptSwitch.pointerDistancePx) {
        this.pointerAnchor = { ...this.pointer };
        this.setFamily('keyboard');
      }
    }) as EventListener);
    this.listen(canvas, 'contextmenu', (event) => event.preventDefault());
    this.listen(window, 'pointercancel', () => this.safetyPause('Pointer input interrupted'));
    this.listen(window, 'blur', () => { this.focused = false; this.safetyPause('Window lost focus'); });
    this.listen(window, 'focus', () => { this.focused = true; });
    this.listen(document, 'visibilitychange', () => {
      if (document.hidden) this.safetyPause('Tab hidden');
    });
    this.listen(window, 'gamepaddisconnected', ((event: GamepadEvent) => {
      if (event.gamepad.index === this.activePad?.index) this.disconnect();
    }) as EventListener);
  }

  poll(): ControlFrame {
    const now = performance.now();
    const pad = this.pollPad();
    const raw = mapStandardGamepad(pad);
    if (!this.focused || document.hidden) this.gate.clear(raw);
    const state = this.gate.sample(raw);
    const axisActivity = Math.hypot(raw.move.x - this.lastRawPad.move.x, raw.move.z - this.lastRawPad.move.z) > 0.15
      || Math.hypot(raw.aim.x - this.lastRawPad.aim.x, raw.aim.z - this.lastRawPad.aim.z) > 0.15;
    if (pad && (Object.values(state.pressed).some(Boolean) || (axisActivity && (Math.hypot(state.move.x, state.move.z) > 0 || Math.hypot(state.aim.x, state.aim.z) > 0)) || state.menu !== 0 && state.menu !== this.lastRawPad.menu)) {
      this.setFamily(controllerFamily(pad.id), Object.values(state.pressed).some(Boolean));
    }
    this.lastRawPad = raw;
    const binding = DEFAULT_BINDINGS.keyboard;
    const held = (codes: readonly string[]) => codes.some((code) => this.keys.has(code));
    const edge = (codes: readonly string[]) => codes.some((code) => this.keyEdges.has(code));
    const keyVector = (directions: typeof binding.move | typeof binding.aim): Vec2 => {
      const x = Number(held(directions.right)) - Number(held(directions.left));
      const z = Number(held(directions.down)) - Number(held(directions.up));
      const length = Math.hypot(x, z) || 1;
      return { x: x / length, z: z / length };
    };
    const keyMove = keyVector(binding.move);
    const move = keyMove.x || keyMove.z ? keyMove : state.move;
    const keyAim = keyVector(binding.aim);
    let aim: Vec2 | null = null;
    if (keyAim.x || keyAim.z) aim = this.callbacks.screenDirection(keyAim.x, keyAim.z);
    else if (this.family === 'keyboard' && this.pointer) aim = this.callbacks.pointerAim(this.pointer.x, this.pointer.y);
    else if (state.aim.x || state.aim.z) aim = this.callbacks.screenDirection(state.aim.x, state.aim.z);
    const direction = Number(held(binding.menuDown)) - Number(held(binding.menuUp)) || state.menu;
    let menuDirection = 0;
    if (direction !== this.menuHeld) {
      menuDirection = direction;
      this.menuRepeatAt = now + DEFAULT_BINDINGS.menuRepeat.delayMs;
    } else if (direction && now >= this.menuRepeatAt) {
      menuDirection = direction;
      this.menuRepeatAt = now + DEFAULT_BINDINGS.menuRepeat.intervalMs;
    }
    // A full keyboard tap can occur between render polls; keep its menu edge too.
    if (!direction) menuDirection = Number(edge(binding.menuDown)) - Number(edge(binding.menuUp));
    this.menuHeld = direction;
    const result: ControlFrame = {
      actions: {
        move: this.callbacks.screenDirection(move.x, move.z), aim,
        attackHeld: this.mouse.has(DEFAULT_BINDINGS.mouse.attack) || state.buttons.attack,
        attackPressed: this.mouseEdges.has(DEFAULT_BINDINGS.mouse.attack) || state.pressed.attack,
        dashPressed: edge(binding.dash) || state.pressed.dash,
      },
      pausePressed: edge(binding.pause) || state.pressed.pause,
      confirmPressed: edge(binding.confirm) || state.pressed.confirm,
      backPressed: edge(binding.back) || this.mouseEdges.has(DEFAULT_BINDINGS.mouse.back) || state.pressed.back,
      restartPressed: edge(binding.restart), menuDirection, family: this.family, controllerStatus: this.controllerStatus,
    };
    this.keyEdges.clear();
    this.mouseEdges.clear();
    if (!this.focused || document.hidden) {
      result.actions = { move: zero(), aim: null, attackHeld: false, attackPressed: false, dashPressed: false };
      result.pausePressed = result.confirmPressed = result.backPressed = result.restartPressed = false;
      result.menuDirection = 0;
    }
    return result;
  }

  clear(): void {
    for (const code of this.keys) this.blockedKeys.add(code);
    for (const button of this.mouse) this.blockedMouse.add(button);
    this.keys.clear(); this.keyEdges.clear(); this.mouse.clear(); this.mouseEdges.clear();
    this.pointer = null;
    this.menuHeld = 0;
    this.menuRepeatAt = 0;
    // Query fresh state: clear can run between rendering polls after a native click.
    const pad = this.readPads().find((value) => value && value.index === this.activePad?.index && value.id === this.activePad?.id);
    this.gate.clear(mapStandardGamepad(pad ?? null));
  }

  dispose(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
    this.clear();
  }

  private listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener);
    this.disposers.push(() => target.removeEventListener(type, listener));
  }

  private isTextEntry(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  }

  private isBoundKey(code: string): boolean {
    const binding = DEFAULT_BINDINGS.keyboard;
    return [...Object.values(binding.move).flat(), ...Object.values(binding.aim).flat(), ...binding.dash, ...binding.pause, ...binding.confirm, ...binding.back, ...binding.restart, ...binding.menuUp, ...binding.menuDown].includes(code as never);
  }

  private setFamily(family: InputFamily, force = false): void {
    const now = performance.now();
    if (this.family !== family && (force || now - this.lastSwitch >= DEFAULT_BINDINGS.promptSwitch.dwellMs)) {
      this.family = family;
      this.lastSwitch = now;
    }
  }

  private readPads(): (Gamepad | null)[] {
    if (typeof navigator.getGamepads !== 'function') {
      this.controllerStatus = 'Gamepad API unavailable; keyboard and mouse are available.';
      return [];
    }
    try { return Array.from(navigator.getGamepads()); }
    catch {
      this.controllerStatus = 'Browser blocked controller access; use keyboard and mouse.';
      return [];
    }
  }

  private pollPad(): Gamepad | null {
    const pads = this.readPads().filter((pad): pad is Gamepad => Boolean(pad?.connected));
    let pad = pads.find((value) => value.index === this.activePad?.index && value.id === this.activePad?.id && value.mapping === 'standard');
    if (this.activePad && !pad) this.disconnect();
    if (!pad) {
      pad = pads.find((value) => value.mapping === 'standard');
      if (pad) {
        this.activePad = { index: pad.index, id: pad.id };
        this.gate = new PadGate();
        this.gate.clear(mapStandardGamepad(pad));
      }
    }
    if (pad) {
      this.controllerStatus = `${controllerFamily(pad.id) === 'playstation' ? 'PlayStation' : controllerFamily(pad.id) === 'xbox' ? 'Xbox' : 'Controller'} detected · standard mapping${pads.length > 1 ? ' · first supported controller active' : ''}`;
      return pad;
    }
    if (pads.length) this.controllerStatus = 'Controller detected with unsupported mapping. Use keyboard/mouse; custom mapping is a later milestone.';
    else if (typeof navigator.getGamepads === 'function' && !this.controllerStatus.startsWith('Browser blocked')) this.controllerStatus = 'No controller detected. Press a controller button to connect.';
    return null;
  }

  private safetyPause(reason: string): void {
    this.clear();
    this.callbacks.onSafetyPause(reason);
  }

  private disconnect(): void {
    this.activePad = null;
    this.gate = new PadGate();
    this.lastRawPad = emptyPad();
    this.safetyPause('Controller disconnected');
  }
}
