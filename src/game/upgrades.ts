import { PLAYER_RULES, RIFLE_RULES, RULES, WEAPONS } from './config';
import type { WeaponId } from './types';

// M3's authorized adjustable prototype effects; these are not production balance.
export const UPGRADE_IDS = [
  'SRC_GOD_03', 'SRC_FATHERLAND_01', 'SRC_EAGLE_02', 'SRC_STREETS_03',
  'SRC_CHOPIN_02', 'SRC_SKLODOWSKA_02', 'SRC_KOPERNIK_03',
] as const;
export type UpgradeId = typeof UPGRADE_IDS[number];
export const UPGRADES: Record<UpgradeId, { name: string; source: string; description: string }> = {
  SRC_GOD_03: { name: 'Quiet Resolve', source: 'Bóg', description: 'After 4 seconds without losing health, primary damage increases by 15%. Health damage resets the timer.' },
  SRC_FATHERLAND_01: { name: 'Stand Firm', source: 'Ojczyzna', description: 'After standing still for 0.5 seconds, take 20% less damage. Movement, dash and displacement end the protection.' },
  SRC_EAGLE_02: { name: 'High View', source: 'Orzeł Biały w koronie', description: 'Attack reach increases by 15%. Attack angles and solid cover stay the same.' },
  SRC_STREETS_03: { name: 'Slip Away', source: 'Szacunek ulicy', description: 'Completing a dash grants 15% movement speed for 2 seconds. A 3-second cooldown prevents refreshing it.' },
  SRC_CHOPIN_02: { name: 'Flowing Step', source: 'Fryderyk Chopin', description: 'Attack movement becomes rifle 100%, gloves 90%, pillar 55%. Attack and reload timing stay the same.' },
  SRC_SKLODOWSKA_02: { name: 'Controlled Shield', source: 'Maria Skłodowska-Curie', description: 'Each full Impact pulse adds 2 barrier points, up to 10. A pulse refreshes the barrier to 4 seconds.' },
  SRC_KOPERNIK_03: { name: 'Wider Orbit', source: 'Mikołaj Kopernik', description: 'Dash travels 3.6 metres in 0.30 seconds. Invulnerability and wall collision stay the same.' },
};

export interface UpgradeRuntime {
  owned: UpgradeId[];
  /** Fractional Curie Impact credit after consuming all whole pulses. */
  impact: number;
  noHealthLossTime: number;
  stationaryTime: number;
  streetRemaining: number;
  streetCooldown: number;
  barrierRemaining: number;
}
/** Safe-room state only: no held input, active hit window, reload or dash motion. */
export interface PlayerCarry {
  health: number;
  ammo: number;
  barrier: number;
  dashCooldown: number;
  /** Original scheduled attack end, or an interrupted reload's remaining lock. */
  attackCooldown: number;
  hurtRemaining: number;
  upgrades: UpgradeRuntime;
}

export function createUpgradeRuntime(): UpgradeRuntime {
  return { owned: [], impact: 0, noHealthLossTime: 0, stationaryTime: 0, streetRemaining: 0, streetCooldown: 0, barrierRemaining: 0 };
}
export function createPlayerCarry(weapon: WeaponId = 'weapon_02'): PlayerCarry {
  return { health: PLAYER_RULES.health, ammo: weapon === 'weapon_01' ? RIFLE_RULES.magazine : 0, barrier: 0, dashCooldown: 0, attackCooldown: 0, hurtRemaining: 0, upgrades: createUpgradeRuntime() };
}
export function isUpgradeId(value: unknown): value is UpgradeId {
  return typeof value === 'string' && (UPGRADE_IDS as readonly string[]).includes(value);
}
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function bounded(value: unknown, max: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max; }
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
export function validateUpgradeRuntime(value: unknown): value is UpgradeRuntime {
  if (!record(value) || !exactKeys(value, ['owned', 'impact', 'noHealthLossTime', 'stationaryTime', 'streetRemaining', 'streetCooldown', 'barrierRemaining'])) return false;
  if (!Array.isArray(value.owned) || value.owned.length > UPGRADE_IDS.length || !value.owned.every(isUpgradeId) || new Set(value.owned).size !== value.owned.length) return false;
  if (!bounded(value.impact, 1) || value.impact >= 1 || !bounded(value.noHealthLossTime, 4) || !bounded(value.stationaryTime, 0.5)
    || !bounded(value.streetRemaining, 2) || !bounded(value.streetCooldown, 3) || !bounded(value.barrierRemaining, 4)) return false;
  return (value.owned.includes('SRC_GOD_03') || value.noHealthLossTime === 0)
    && (value.owned.includes('SRC_FATHERLAND_01') || value.stationaryTime === 0)
    && (value.owned.includes('SRC_STREETS_03') || value.streetRemaining === 0 && value.streetCooldown === 0)
    && (value.owned.includes('SRC_SKLODOWSKA_02') || value.impact === 0 && value.barrierRemaining === 0);
}
export function validatePlayerCarry(value: unknown): value is PlayerCarry {
  if (!record(value) || !exactKeys(value, ['health', 'ammo', 'barrier', 'dashCooldown', 'attackCooldown', 'hurtRemaining', 'upgrades'])) return false;
  if (!bounded(value.health, PLAYER_RULES.health) || !bounded(value.ammo, RIFLE_RULES.magazine) || !Number.isInteger(value.ammo)
    || !bounded(value.barrier, 10) || !bounded(value.dashCooldown, RULES.dashCooldown) || !bounded(value.attackCooldown, 1.5)
    || !bounded(value.hurtRemaining, PLAYER_RULES.postHitTicks * RULES.fixedStep) || !validateUpgradeRuntime(value.upgrades)) return false;
  return value.barrier === 0 || value.upgrades.owned.includes('SRC_SKLODOWSKA_02') && value.upgrades.barrierRemaining > 0;
}
export function owns(runtime: UpgradeRuntime, id: UpgradeId): boolean { return runtime.owned.includes(id); }
export function effectiveRange(runtime: UpgradeRuntime, weapon: WeaponId): number { return WEAPONS[weapon].range * (owns(runtime, 'SRC_EAGLE_02') ? 1.15 : 1); }
export function attackMoveFactor(runtime: UpgradeRuntime, weapon: WeaponId): number { return Math.min(1, WEAPONS[weapon].moveFactor + (owns(runtime, 'SRC_CHOPIN_02') ? 0.2 : 0)); }
export function primaryDamageFactor(runtime: UpgradeRuntime): number { return owns(runtime, 'SRC_GOD_03') && runtime.noHealthLossTime >= 4 - 1e-9 ? 1.15 : 1; }
export function incomingDamageFactor(runtime: UpgradeRuntime): number { return owns(runtime, 'SRC_FATHERLAND_01') && runtime.stationaryTime >= 0.5 - 1e-9 ? 0.8 : 1; }
