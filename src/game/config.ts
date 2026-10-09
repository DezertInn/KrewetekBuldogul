import type { Room } from './types';

// Adjustable milestone-1 defaults from GDD sections 5 and 6. Not final balance.
export const RULES = {
  fixedStep: 1 / 60, moveSpeed: 6, radius: 0.34,
  dashDuration: 0.30, dashDistance: 3, dashInvulnerability: 0.15, dashCooldown: 1.20,
  inputBuffer: 0.10, comboReset: 0.40, attackMoveFactor: 0.70,
  gloveRange: 1.5, gloveHalfAngle: Math.PI / 6,
  strikes: [
    { startup: 3, active: 3, recovery: 6, damage: 20 },
    { startup: 3, active: 3, recovery: 6, damage: 20 },
    { startup: 6, active: 3, recovery: 9, damage: 30 },
    { startup: 6, active: 3, recovery: 9, damage: 30 },
  ],
} as const;
export const ROOM: Room = {
  halfWidth: 8, halfDepth: 6,
  obstacles: [
    { id: 'equipment', x: -4.6, z: 1.3, width: 2.4, depth: 1.2, height: 1.0 },
    { id: 'bench', x: 4.4, z: -1.8, width: 2.4, depth: 0.8, height: 0.55 },
    { id: 'bag-platform', x: 4.7, z: 3.4, width: 1.3, depth: 1.3, height: 0.25 },
  ],
};
