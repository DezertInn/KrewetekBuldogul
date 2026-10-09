import { BOXER_RULES, ROOM, RULES } from '../game/config';
import type { Vec2 } from '../game/types';

export const RUN_CONTENT_VERSION = 'm3-gym-run-v1';
export const RUN_SCHEMA_VERSION = 1;
export const RUN_BUILD_ID = 'm3-prototype-1';

export interface RunStage {
  id: string;
  levelId: string;
  roomId: string;
  encounterId: string;
  name: string;
  spawns: readonly Vec2[];
}

// Test-only route. These IDs do not claim to implement the production B01 route.
export const RUN_STAGES: readonly RunStage[] = [
  { id: 'M3_STAGE_01', levelId: 'M3_B01L01', roomId: 'M3_ROOM_01', encounterId: 'M3_ENCOUNTER_01', name: 'Warm-up formation', spawns: [{ x: -1.2, z: 1.7 }, { x: 1.2, z: 1.7 }, { x: 0, z: 3.4 }] },
  { id: 'M3_STAGE_02', levelId: 'M3_B01L02', roomId: 'M3_ROOM_02', encounterId: 'M3_ENCOUNTER_02', name: 'Wide formation', spawns: [{ x: -2.8, z: 0 }, { x: 2.8, z: .7 }, { x: -1.5, z: 3.8 }] },
  { id: 'M3_STAGE_03', levelId: 'M3_B01L03', roomId: 'M3_ROOM_03', encounterId: 'M3_ENCOUNTER_03', name: 'Final formation', spawns: [{ x: -2.8, z: 3.7 }, { x: 0, z: 2.5 }, { x: 2.7, z: 3.8 }] },
];

export function validateRunContent(stages: readonly RunStage[] = RUN_STAGES): string[] {
  const errors: string[] = [];
  if (!stages.length) errors.push('The run route must contain a stage.');
  for (const field of ['id', 'levelId', 'roomId', 'encounterId'] as const) {
    if (new Set(stages.map(stage => stage[field])).size !== stages.length) errors.push(`Duplicate ${field}.`);
  }
  for (const stage of stages) {
    if (!stage.id || !stage.name || !stage.spawns.length || stage.spawns.length > 5) errors.push(`Invalid stage ${stage.id}.`);
    for (const [index, spawn] of stage.spawns.entries()) {
      const radius = BOXER_RULES.radius;
      if (!Number.isFinite(spawn.x) || !Number.isFinite(spawn.z) || Math.abs(spawn.x) + radius >= ROOM.halfWidth || Math.abs(spawn.z) + radius >= ROOM.halfDepth) errors.push(`Out-of-room spawn ${stage.id}/${index}.`);
      if (Math.hypot(spawn.x, spawn.z + 2.5) < radius + RULES.radius + 1) errors.push(`Unsafe player-entry spawn ${stage.id}/${index}.`);
      for (const obstacle of ROOM.obstacles) {
        const nearestX = Math.max(obstacle.x - obstacle.width / 2, Math.min(spawn.x, obstacle.x + obstacle.width / 2));
        const nearestZ = Math.max(obstacle.z - obstacle.depth / 2, Math.min(spawn.z, obstacle.z + obstacle.depth / 2));
        if (Math.hypot(spawn.x - nearestX, spawn.z - nearestZ) <= radius) errors.push(`Blocked spawn ${stage.id}/${index}.`);
      }
      for (const other of stage.spawns.slice(index + 1)) if (Math.hypot(spawn.x - other.x, spawn.z - other.z) <= radius * 2) errors.push(`Overlapping spawns ${stage.id}/${index}.`);
    }
  }
  return errors;
}
