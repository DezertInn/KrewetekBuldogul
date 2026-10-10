export type Context = 'gameplay' | 'menu' | 'capture';
export type DeviceKind = 'keyboard' | 'controller';
export type Binding =
  | { kind: 'key'; value: string; semantics: 'physical' | 'character'; shift?: boolean }
  | { kind: 'mouse'; button: number }
  | { kind: 'wheel'; direction: -1 | 1 }
  | { kind: 'button'; button: number }
  | { kind: 'axis'; axis: number; direction: -1 | 1 };
export const ACTIONS = {
  moveUp: ['Move up', 'gameplay'], moveDown: ['Move down', 'gameplay'], moveLeft: ['Move left', 'gameplay'], moveRight: ['Move right', 'gameplay'],
  aimUp: ['Aim up', 'gameplay'], aimDown: ['Aim down', 'gameplay'], aimLeft: ['Aim left', 'gameplay'], aimRight: ['Aim right', 'gameplay'],
  attack: ['Primary attack', 'gameplay'], dash: ['Dash', 'gameplay'], reload: ['Reload rifle', 'gameplay'], interact: ['Interact / preparation', 'gameplay'], pause: ['Pause', 'gameplay'],
  menuUp: ['Menu up', 'menu'], menuDown: ['Menu down', 'menu'], menuLeft: ['Menu left / decrease', 'menu'], menuRight: ['Menu right / increase', 'menu'],
  confirm: ['Confirm / apply', 'menu'], back: ['Back / cancel', 'menu'], restart: ['Restart session', 'menu'], settings: ['Open controls', 'menu'],
  tabNext: ['Next tab / focus', 'menu'], tabPrevious: ['Previous tab / focus', 'menu'], scrollUp: ['Scroll up', 'menu'], scrollDown: ['Scroll down', 'menu'],
} as const;
export type ActionId = keyof typeof ACTIONS;
export const ACTION_IDS = Object.keys(ACTIONS) as ActionId[];
const ESSENTIAL: ActionId[] = ['menuUp', 'menuDown', 'menuLeft', 'menuRight', 'confirm', 'back'];
export interface Calibration {
  innerDeadzone: number; outerDeadzone: number; sensitivity: number; aimSensitivity: number;
  invertMoveX: boolean; invertMoveY: boolean; invertAimX: boolean; invertAimY: boolean;
  triggerThreshold: number; menuThreshold: number; repeatDelay: number; repeatInterval: number;
  pointerAim: boolean; attackMode: 'hold' | 'toggle'; keySemantics: 'physical' | 'character';
}
export interface Profile { id: string; name: string; kind: DeviceKind; bindings: Record<ActionId, Binding[]>; calibration: Calibration }
export interface Settings {
  version: 2; profiles: Profile[]; keyboardProfile: string; controllerProfile: string;
  controllerAssignments: Record<string, string>; promptFamily: 'auto' | 'xbox' | 'playstation' | 'gamepad';
}
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const STORAGE_KEY = 'krewetekbuldogul.controls.v2';
export const GOOD_KEY = `${STORAGE_KEY}.last-good`;
const key = (value: string, shift = false): Binding => ({ kind: 'key', value, semantics: 'physical', ...(shift ? { shift } : {}) });
const button = (value: number): Binding => ({ kind: 'button', button: value });
const axis = (value: number, direction: -1 | 1): Binding => ({ kind: 'axis', axis: value, direction });

export function defaultProfile(kind: DeviceKind, id: string = kind): Profile {
  const bindings = Object.fromEntries(ACTION_IDS.map(action => [action, [] as Binding[]])) as Record<ActionId, Binding[]>;
  const values: Partial<Record<ActionId, Binding[]>> = kind === 'keyboard' ? {
    moveUp: [key('KeyW')], moveDown: [key('KeyS')], moveLeft: [key('KeyA')], moveRight: [key('KeyD')],
    aimUp: [key('ArrowUp')], aimDown: [key('ArrowDown')], aimLeft: [key('ArrowLeft')], aimRight: [key('ArrowRight')],
    attack: [{ kind: 'mouse', button: 0 }], dash: [key('Space')], reload: [key('KeyR')], interact: [key('KeyE')], pause: [key('Escape')],
    menuUp: [key('ArrowUp'), key('KeyW')], menuDown: [key('ArrowDown'), key('KeyS')], menuLeft: [key('ArrowLeft'), key('KeyA')], menuRight: [key('ArrowRight'), key('KeyD')],
    confirm: [key('Enter')], back: [key('Escape'), { kind: 'mouse', button: 2 }], restart: [key('F5')], settings: [key('F2')],
    tabNext: [key('Tab')], tabPrevious: [key('Tab', true)], scrollUp: [key('PageUp'), { kind: 'wheel', direction: -1 }], scrollDown: [key('PageDown'), { kind: 'wheel', direction: 1 }],
  } : {
    moveUp: [axis(1, -1)], moveDown: [axis(1, 1)], moveLeft: [axis(0, -1)], moveRight: [axis(0, 1)],
    aimUp: [axis(3, -1)], aimDown: [axis(3, 1)], aimLeft: [axis(2, -1)], aimRight: [axis(2, 1)],
    attack: [button(7)], dash: [button(6)], reload: [button(2)], interact: [button(0)], pause: [button(9)],
    menuUp: [button(12), axis(1, -1)], menuDown: [button(13), axis(1, 1)], menuLeft: [button(14), axis(0, -1)], menuRight: [button(15), axis(0, 1)],
    confirm: [button(0)], back: [button(1)], restart: [button(3)], settings: [button(8)], tabNext: [button(5)], tabPrevious: [button(4)], scrollUp: [axis(3, -1)], scrollDown: [axis(3, 1)],
  };
  Object.assign(bindings, values);
  return { id, name: kind === 'keyboard' ? 'Keyboard + mouse' : 'Controller', kind, bindings, calibration: {
    innerDeadzone: 0.18, outerDeadzone: 0, sensitivity: 1, aimSensitivity: 1, invertMoveX: false, invertMoveY: false, invertAimX: false, invertAimY: false,
    triggerThreshold: 0.5, menuThreshold: 0.55, repeatDelay: 360, repeatInterval: 140, pointerAim: true, attackMode: 'hold', keySemantics: 'physical',
  } };
}
export function defaultSettings(): Settings {
  return { version: 2, profiles: [defaultProfile('keyboard'), defaultProfile('controller')], keyboardProfile: 'keyboard', controllerProfile: 'controller', controllerAssignments: {}, promptFamily: 'auto' };
}
export function bindingKey(binding: Binding): string {
  if (binding.kind === 'key') return `key:${binding.semantics}:${binding.value}:${Boolean(binding.shift)}`;
  if (binding.kind === 'axis') return `axis:${binding.axis}:${binding.direction}`;
  if (binding.kind === 'wheel') return `wheel:${binding.direction}`;
  return `${binding.kind}:${binding.button}`;
}
export function conflicts(profile: Profile, action: ActionId, binding: Binding): ActionId[] {
  return ACTION_IDS.filter(other => other !== action && ACTIONS[other][1] === ACTIONS[action][1] && profile.bindings[other].some(value => bindingKey(value) === bindingKey(binding)));
}
/** Profiles use one keyboard semantic so layout-dependent mixed bindings cannot collide silently. */
export function convertKeySemantics(profile: Profile, semantics: 'physical' | 'character', layout?: ReadonlyMap<string, string>): string[] {
  const errors: string[] = [];
  const special = new Set(['Enter', 'Escape', 'Tab', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ...Array.from({ length: 24 }, (_, i) => `F${i + 1}`)]);
  for (const action of ACTION_IDS) for (const binding of profile.bindings[action]) {
    if (binding.kind !== 'key' || binding.semantics === semantics) continue;
    let value: string | undefined;
    if (special.has(binding.value)) value = binding.value;
    else if (semantics === 'character') {
      value = layout?.get(binding.value) ?? (/^Key[A-Z]$/.test(binding.value) ? binding.value.slice(3).toLowerCase() : /^Digit[0-9]$/.test(binding.value) ? binding.value.slice(5) : binding.value === 'Space' ? ' ' : undefined);
      if (binding.shift && value) value = value.toUpperCase();
    } else {
      value = [...(layout?.entries() ?? [])].find(([, char]) => char.toLowerCase() === binding.value.toLowerCase())?.[0]
        ?? (/^[a-z]$/i.test(binding.value) ? `Key${binding.value.toUpperCase()}` : /^[0-9]$/.test(binding.value) ? `Digit${binding.value}` : binding.value === ' ' ? 'Space' : undefined);
    }
    if (!value) errors.push(`Cannot translate ${binding.value}; restore this action before changing keyboard semantics.`);
    else { binding.value = value; binding.semantics = semantics; }
  }
  profile.calibration.keySemantics = semantics;
  return errors;
}
function validBinding(value: unknown, kind: DeviceKind): value is Binding {
  if (!value || typeof value !== 'object') return false;
  const b = value as Binding;
  if (b.kind === 'key') return kind === 'keyboard' && typeof b.value === 'string' && b.value.length > 0 && b.value.length < 64 && ['physical', 'character'].includes(b.semantics) && (b.shift === undefined || typeof b.shift === 'boolean');
  if (b.kind === 'wheel') return kind === 'keyboard' && (b.direction === -1 || b.direction === 1);
  if (b.kind === 'axis') return kind === 'controller' && Number.isInteger(b.axis) && b.axis >= 0 && b.axis < 32 && (b.direction === -1 || b.direction === 1);
  return (b.kind === 'mouse' && kind === 'keyboard' && Number.isInteger(b.button) && b.button >= 0 && b.button < 5) || (b.kind === 'button' && kind === 'controller' && Number.isInteger(b.button) && b.button >= 0 && b.button < 64);
}
export function validateProfile(profile: Profile): string[] {
  if (!profile || !['keyboard', 'controller'].includes(profile.kind) || typeof profile.id !== 'string' || !profile.id || typeof profile.name !== 'string' || !profile.name.trim() || profile.name.length > 80) return ['Invalid profile identity.'];
  if (!profile.bindings || !profile.calibration) return ['Incomplete profile.'];
  for (const action of ACTION_IDS) if (!Array.isArray(profile.bindings[action]) || profile.bindings[action].length > 8 || !profile.bindings[action].every(b => validBinding(b, profile.kind))) return [`Invalid binding for ${ACTIONS[action][0]}.`];
  const errors = ESSENTIAL.filter(action => !profile.bindings[action].length).map(action => `${ACTIONS[action][0]} needs a binding.`);
  for (const action of ACTION_IDS) for (const binding of profile.bindings[action]) if (conflicts(profile, action, binding).length) errors.push(`${ACTIONS[action][0]} shares a binding in its context.`);
  const c = profile.calibration;
  if (ACTION_IDS.some(a => profile.bindings[a].some(b => b.kind === 'key' && b.semantics !== c.keySemantics))) errors.push('All keys in a profile must use its chosen keyboard semantics.');
  const ranges: [keyof Calibration, number, number][] = [['innerDeadzone', 0, .8], ['outerDeadzone', 0, .4], ['sensitivity', .25, 2], ['aimSensitivity', .25, 2], ['triggerThreshold', .1, .95], ['menuThreshold', .3, .95], ['repeatDelay', 150, 1000], ['repeatInterval', 60, 500]];
  for (const [name, min, max] of ranges) if (typeof c[name] !== 'number' || !Number.isFinite(c[name]) || (c[name] as number) < min || (c[name] as number) > max) errors.push(`Invalid ${name}.`);
  if (c.innerDeadzone + c.outerDeadzone >= .95) errors.push('Dead zones leave too little usable axis travel.');
  for (const name of ['invertMoveX', 'invertMoveY', 'invertAimX', 'invertAimY', 'pointerAim'] as const) if (typeof c[name] !== 'boolean') errors.push(`Invalid ${name}.`);
  if (!['hold', 'toggle'].includes(c.attackMode) || !['physical', 'character'].includes(c.keySemantics)) errors.push('Invalid input behavior.');
  return [...new Set(errors)];
}
export function validateSettings(value: unknown): value is Settings {
  if (!value || typeof value !== 'object') return false;
  const s = value as Settings;
  if (s.version !== 2 || !Array.isArray(s.profiles) || s.profiles.length < 2 || s.profiles.length > 20 || s.profiles.some(p => validateProfile(p).length)) return false;
  if (new Set(s.profiles.map(p => p.id)).size !== s.profiles.length) return false;
  if (!s.profiles.some(p => p.id === s.keyboardProfile && p.kind === 'keyboard') || !s.profiles.some(p => p.id === s.controllerProfile && p.kind === 'controller')) return false;
  if (!['auto', 'xbox', 'playstation', 'gamepad'].includes(s.promptFamily) || !s.controllerAssignments || typeof s.controllerAssignments !== 'object' || Array.isArray(s.controllerAssignments)) return false;
  return Object.values(s.controllerAssignments).every(id => s.profiles.some(p => p.kind === 'controller' && p.id === id));
}
/** Compute the entire transaction before committing, including swap and required navigation. */
export function rebind(profile: Profile, action: ActionId, binding: Binding | null, resolution: 'cancel' | 'replace' | 'swap' = 'cancel', append = false): { profile?: Profile; errors: string[]; conflicts: ActionId[] } {
  const next = structuredClone(profile);
  const collision = binding ? conflicts(profile, action, binding) : [];
  if (collision.length && resolution === 'cancel') return { errors: ['Choose Replace, Swap, or Cancel.'], conflicts: collision };
  if (collision.length && resolution === 'swap' && (collision.length !== 1 || !profile.bindings[action].length)) return { errors: ['Swap needs one conflicting action and an existing binding.'], conflicts: collision };
  for (const other of collision) {
    next.bindings[other] = next.bindings[other].filter(b => bindingKey(b) !== bindingKey(binding!));
    if (resolution === 'swap') next.bindings[other].push(...profile.bindings[action]);
  }
  next.bindings[action] = binding ? (append ? [...profile.bindings[action].filter(b => bindingKey(b) !== bindingKey(binding)), binding] : [binding]) : [];
  const errors = validateProfile(next);
  return { profile: errors.length ? undefined : next, errors, conflicts: collision };
}

export class SettingsStore {
  value: Settings = defaultSettings();
  lastGood: Settings = defaultSettings();
  status = 'Controls saved locally.';
  revision = 0;
  onChange: (() => void) | undefined;
  constructor(private storage?: StorageLike) {
    let backupProblem = false;
    try {
      const good = storage?.getItem(GOOD_KEY);
      if (good) { const value: unknown = JSON.parse(good); if (validateSettings(value)) this.lastGood = value; else backupProblem = true; }
    } catch { backupProblem = true; }
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) { const value: unknown = JSON.parse(raw); if (!validateSettings(value)) throw new Error('Invalid or incompatible controls'); this.value = value; }
      else this.value = structuredClone(this.lastGood);
      if (backupProblem) this.status = 'Loaded valid controls; previous recovery data was unavailable.';
      if (!storage) this.status = 'Storage unavailable; controls work for this session.';
    } catch { this.value = structuredClone(this.lastGood); this.status = 'Stored controls could not be read. Recovered a valid profile; controls remain usable.'; }
  }
  profile(kind: DeviceKind): Profile { return this.value.profiles.find(p => p.id === (kind === 'keyboard' ? this.value.keyboardProfile : this.value.controllerProfile))!; }
  apply(value: Settings): string[] {
    if (!validateSettings(value)) return ['Settings are invalid or remove essential controls.'];
    const previous = structuredClone(this.value);
    this.lastGood = previous;
    this.value = structuredClone(value);
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      this.storage.setItem(GOOD_KEY, JSON.stringify(previous));
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.value));
      this.status = 'Controls saved locally. Previous valid controls remain recoverable.';
    } catch { this.status = 'Could not save controls. Changes work this session; previous saved controls are retained where possible.'; }
    this.revision++; this.onChange?.();
    return [];
  }
  applyProfile(profile: Profile): string[] {
    const errors = validateProfile(profile); if (errors.length) return errors;
    const next = structuredClone(this.value); const index = next.profiles.findIndex(p => p.id === profile.id);
    if (index < 0) next.profiles.push(profile); else next.profiles[index] = profile;
    return this.apply(next);
  }
  restoreProfile(id: string): string[] {
    const profile = this.value.profiles.find(p => p.id === id); if (!profile) return ['Profile not found.'];
    const defaults = defaultProfile(profile.kind, profile.id); defaults.name = profile.name;
    return this.applyProfile(defaults);
  }
  recover(): void { this.apply(structuredClone(this.lastGood)); }
}

/** Capture arms only after release; a deliberate input must also return to neutral. */
export class BindingCapture {
  state: 'release' | 'armed' | 'neutral' | 'preview' = 'release';
  candidate: Binding | null = null;
  constructor(readonly kind: DeviceKind, readonly semantics: 'physical' | 'character') {}
  sample(active: Binding[]): void {
    const relevant = active.filter(b => this.kind === 'controller' ? b.kind === 'axis' || b.kind === 'button' : b.kind !== 'axis' && b.kind !== 'button');
    if (this.state === 'release') { if (!active.length) this.state = 'armed'; return; }
    if (this.state === 'armed' && relevant.length) { this.candidate = relevant[0]; this.state = 'neutral'; return; }
    if (this.state === 'neutral' && !active.length) this.state = 'preview';
  }
}
