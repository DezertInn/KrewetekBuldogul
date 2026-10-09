import type { Room } from './types';

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
export const ROOM: Room = {
  halfWidth: 8, halfDepth: 6,
  obstacles: [
    { id: 'equipment', x: -4.6, z: 1.3, width: 2.4, depth: 1.2, height: 1.0 },
    { id: 'bench', x: 4.4, z: -1.8, width: 2.4, depth: 0.8, height: 0.55 },
    { id: 'bag-platform', x: 4.7, z: 3.4, width: 1.3, depth: 1.3, height: 0.25 },
  ],
};
