import type { Room, WeaponId } from './types';

// Approved prototype override in GDD section 6.3; not final production balance.
const GLOVE_ATTACK_RATE = 1.20;
export const RULES = {
  fixedStep: 1 / 60, moveSpeed: 6.6, radius: 0.34,
  dashDuration: 0.30, dashDistance: 3, dashInvulnerability: 0.15, dashCooldown: 1.20,
  inputBuffer: 0.10, comboReset: 0.40, attackMoveFactor: 0.70,
  gloveRange: 1.95, gloveHalfAngle: Math.PI / 6,
  strikes: [
    { startup: 3, active: 3, recovery: 6, damage: 20 },
    { startup: 3, active: 3, recovery: 6, damage: 20 },
    { startup: 6, active: 3, recovery: 9, damage: 30 },
    { startup: 6, active: 3, recovery: 9, damage: 30 },
  ].map(strike => ({
    ...strike,
    // Keep fractional tick boundaries. Whole strikes still total 10/10/15/15
    // ticks, so the four-strike cycle is exactly 50 ticks without rounding drift.
    startup: strike.startup / GLOVE_ATTACK_RATE,
    active: strike.active / GLOVE_ATTACK_RATE,
    recovery: strike.recovery / GLOVE_ATTACK_RATE,
  })),
} as const;
export const WEAPONS: Record<WeaponId, { name: string; range: number; halfAngle: number; moveFactor: number; startup: number; active: number; recovery: number; damage: number; stagger: number; knockback: number }> = {
  weapon_01: { name: 'Grot rifle', range: 12, halfAngle: 0, moveFactor: 0.8, startup: 3, active: 1, recovery: 5, damage: 21.6, stagger: 2, knockback: 0 },
  weapon_02: { name: 'Boxing gloves', range: RULES.gloveRange, halfAngle: RULES.gloveHalfAngle, moveFactor: RULES.attackMoveFactor, startup: 2.5, active: 2.5, recovery: 5, damage: 20, stagger: 4, knockback: 0 },
  weapon_03: { name: 'Monument pillar', range: 2.6, halfAngle: 50 * Math.PI / 180, moveFactor: 0.35, startup: 33, active: 9, recovery: 48, damage: 180, stagger: 30, knockback: 1 },
};
export const RIFLE_RULES = { magazine: 20, reloadTicks: 60, reloadMoveFactor: 0.8, tracerSeconds: 0.08 } as const;
export const PLAYER_RULES = { health: 100, postHitTicks: 21 } as const;
// B01_E01's GDD timings/health/damage; unspecified slice parameters are adjustable defaults.
export const BOXER_RULES = {
  health: 100, radius: 0.36, speed: 2.8, range: 1, halfAngle: Math.PI / 6,
  damage: 10, preparationTicks: 27, activeTicks: 3, recoveryTicks: 33,
  spawnGraceTicks: 60, maximumPreparing: 2,
  poise: 30, poiseResetTicks: 120, staggerTicks: 27, staggerImmunityTicks: 60,
  spawns: [{ x: -1.2, z: 1.7 }, { x: 1.2, z: 1.7 }, { x: 0, z: 3.4 }],
} as const;
// GDD section 8: adjustable M4 slice values, separate from the accepted weapon timings.
export const COUNTER_RULES = {
  health: 140, radius: 0.4, speed: 2.6, range: 1.25, halfAngle: Math.PI / 6,
  damage: 14, guardTicks: 60, guardHalfAngle: Math.PI / 3, guardReduction: 0.7,
  preparationTicks: 36, activeTicks: 3, recoveryTicks: 51,
} as const;
export const CLINCHER_RULES = {
  health: 180, radius: 0.44, speed: 2.5, range: 4, laneWidth: 1.2,
  damage: 16, preparationTicks: 48, activeTicks: 24, recoveryTicks: 60,
} as const;
export const COACH_RULES = {
  health: 900, radius: 0.65, speed: 2.3, phaseThreshold: 0.5, transitionTicks: 60,
  jabRange: 1.5, jabHalfAngle: Math.PI / 6, jabDamage: 10,
  sweepRange: 2.5, sweepHalfAngle: Math.PI * 0.65, sweepDamage: 16,
  slamRange: 2, slamDamage: 20,
  preparationTicks: 48, slamPreparationTicks: 60, activeTicks: 6,
  jabRecoveryTicks: 72, heavyRecoveryTicks: 96,
  poise: 120, staggerFactor: 0.25, staggerTicks: 24, staggerImmunityTicks: 180,
} as const;
export const ROOM: Room = {
  halfWidth: 8, halfDepth: 6,
  obstacles: [
    { id: 'equipment', x: -4.6, z: 1.3, width: 2.4, depth: 1.2, height: 1.0 },
    { id: 'bench', x: 4.4, z: -1.8, width: 2.4, depth: 0.8, height: 0.55 },
    { id: 'bag-platform', x: 4.7, z: 3.4, width: 1.3, depth: 1.3, height: 0.25 },
  ],
};
