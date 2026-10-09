import type { AttackPhase } from '../game/types';

export type PoseVector = { x: number; y: number; z: number };
export interface PillarPose {
  phase: AttackPhase;
  progress: number;
  body: { height: number; rotation: PoseVector };
  torso: PoseVector;
  weapon: { position: PoseVector; rotation: PoseVector };
  feet: [PoseVector, PoseVector];
}

const vector = (x: number, y: number, z: number): PoseVector => ({ x, y, z });
const ready: PillarPose = {
  phase: 'ready', progress: 0,
  body: { height: -0.025, rotation: vector(0.025, 0, 0) }, torso: vector(0, 0, 0),
  weapon: { position: vector(0.22, 1.13, 0.34), rotation: vector(0.30, 0.18, -0.78) },
  feet: [vector(-0.25, 0, 0.13), vector(0.25, 0, -0.12)],
};
const loaded: PillarPose = {
  phase: 'startup', progress: 1,
  body: { height: -0.105, rotation: vector(-0.045, -0.34, 0.025) }, torso: vector(-0.10, -0.27, -0.07),
  weapon: { position: vector(-0.21, 1.16, 0.12), rotation: vector(-0.28, -0.74, -1.19) },
  feet: [vector(-0.30, 0, 0.19), vector(0.28, 0, -0.15)],
};
const contact: PillarPose = {
  phase: 'active', progress: 1,
  body: { height: -0.10, rotation: vector(0.13, 0.39, -0.04) }, torso: vector(0.17, 0.21, 0.065),
  weapon: { position: vector(0.14, 1.04, 0.56), rotation: vector(1.08, 0.78, -1.24) },
  feet: [vector(-0.30, 0, 0.23), vector(0.27, 0, -0.16)],
};
const followThrough: PillarPose = {
  phase: 'recovery', progress: 0.16,
  body: { height: -0.145, rotation: vector(0.17, 0.49, -0.04) }, torso: vector(0.21, 0.24, 0.075),
  weapon: { position: vector(0.05, 0.97, 0.49), rotation: vector(1.23, 0.94, -1.28) },
  feet: [vector(-0.30, 0, 0.23), vector(0.27, 0, -0.16)],
};
const clamp = (value: number): number => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const ease = (value: number): number => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const mixVector = (a: PoseVector, b: PoseVector, t: number): PoseVector => vector(mix(a.x, b.x, t), mix(a.y, b.y, t), mix(a.z, b.z, t));
function blend(a: PillarPose, b: PillarPose, t: number, phase: AttackPhase, progress: number): PillarPose {
  return {
    phase, progress,
    body: { height: mix(a.body.height, b.body.height, t), rotation: mixVector(a.body.rotation, b.body.rotation, t) },
    torso: mixVector(a.torso, b.torso, t),
    weapon: { position: mixVector(a.weapon.position, b.weapon.position, t), rotation: mixVector(a.weapon.rotation, b.weapon.rotation, t) },
    feet: [mixVector(a.feet[0], b.feet[0], t), mixVector(a.feet[1], b.feet[1], t)],
  };
}

/** Presentation only: consume the simulation's existing phases, never advance an attack. */
export function samplePillarPose(phase: AttackPhase, progress: number): PillarPose {
  const p = clamp(progress);
  if (phase === 'startup') return blend(ready, loaded, ease(p), phase, p);
  if (phase === 'active') return blend(loaded, contact, ease(p), phase, p);
  if (phase === 'recovery') {
    return p < 0.16
      ? blend(contact, followThrough, ease(p / 0.16), phase, p)
      : blend(followThrough, ready, ease((p - 0.16) / 0.84), phase, p);
  }
  return blend(ready, ready, 0, phase, 0);
}

/** Two fixed-length segments bend toward a hint while keeping their endpoint on a grip. */
export function twoBoneJoint(start: PoseVector, end: PoseVector, upper: number, lower: number, bendHint: PoseVector): PoseVector {
  const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
  const distance = Math.hypot(dx, dy, dz);
  if (distance < 1e-8) return vector(start.x, start.y - upper, start.z);
  const direction = vector(dx / distance, dy / distance, dz / distance);
  const along = Math.max(0, Math.min(distance, (upper * upper - lower * lower + distance * distance) / (2 * distance)));
  const projection = direction.x * bendHint.x + direction.y * bendHint.y + direction.z * bendHint.z;
  let bend = vector(bendHint.x - projection * direction.x, bendHint.y - projection * direction.y, bendHint.z - projection * direction.z);
  let length = Math.hypot(bend.x, bend.y, bend.z);
  if (length < 1e-8) {
    bend = Math.abs(direction.y) < 0.9 ? vector(-direction.z, 0, direction.x) : vector(1, 0, 0);
    length = Math.hypot(bend.x, bend.y, bend.z);
  }
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  return vector(start.x + direction.x * along + bend.x / length * height,
    start.y + direction.y * along + bend.y / length * height,
    start.z + direction.z * along + bend.z / length * height);
}
