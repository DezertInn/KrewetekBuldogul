import type { AttackPhase } from '../game/types';
import type { PoseVector } from './pillar-animation';

export interface GlovePose { hands: [PoseVector, PoseVector]; twist: number; lean: number; height: number }
const vector = (x: number, y: number, z: number): PoseVector => ({ x, y, z });
const clamp = (value: number): number => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const ease = (value: number): number => { const t = clamp(value); return t * t * (3 - 2 * t); };
const blend = (a: PoseVector, b: PoseVector, t: number): PoseVector => vector(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);

/** Four original boxing poses: jab, cross, hook and rising finish, on simulation time. */
export function sampleGlovePose(phase: AttackPhase, progress: number, combo: number): GlovePose {
  const strike = ((Math.trunc(combo) % 4) + 4) % 4, side = strike % 2 === 0 ? -1 : 1;
  const ready: [PoseVector, PoseVector] = [vector(-0.27, 1.24, 0.43), vector(0.27, 1.20, 0.39)];
  const loaded = vector(side * 0.32, strike === 3 ? 1.05 : 1.26, 0.27);
  const contact = strike < 2 ? vector(side * 0.08, 1.24, 0.81)
    : strike === 2 ? vector(0.08, 1.27, 0.68) : vector(0.08, 1.48, 0.72);
  const index = side < 0 ? 0 : 1, p = ease(progress);
  let amount = 0, hand = ready[index], twist = 0;
  if (phase === 'startup') { hand = blend(ready[index], loaded, p); amount = p; twist = -side * 0.18 * p; }
  else if (phase === 'active') { hand = blend(loaded, contact, p); amount = 1; twist = -side * 0.18 + side * 0.43 * p; }
  else if (phase === 'recovery') { hand = blend(contact, ready[index], p); amount = 1 - p; twist = side * 0.25 * (1 - p); }
  const hands: [PoseVector, PoseVector] = [{ ...ready[0] }, { ...ready[1] }]; hands[index] = hand;
  return { hands, twist, lean: amount * 0.065, height: -amount * (strike === 3 ? 0.07 : 0.035) };
}
