import { createPlayerCarry, UPGRADE_IDS, validatePlayerCarry, type PlayerCarry, type UpgradeId } from '../game/upgrades';
import type { WeaponId } from '../game/types';
import { RUN_STAGES, validateRunContent, type RunStage } from './content';

export type RunPhase = 'encounter' | 'reward' | 'results';
export type RunOutcome = 'victory' | 'defeat' | 'abandoned';
export interface RunReward {
  id: string;
  stageId: string;
  choices: UpgradeId[];
  selected: UpgradeId | null;
}
export interface RunCheckpoint {
  runId: string;
  seed: number;
  rngState: number;
  weapon: WeaponId;
  stageIndex: number;
  phase: RunPhase;
  carry: PlayerCarry;
  activeSeconds: number;
  clearedStages: string[];
  rewards: RunReward[];
  offer: UpgradeId[];
  outcome: RunOutcome | null;
}
export interface RunSummary {
  runId: string;
  phase: RunPhase;
  outcome: RunOutcome | null;
  weapon: WeaponId;
  stage: number;
  stageReached: number;
  stageName: string;
  stageCount: number;
  cleared: number;
  upgrades: UpgradeId[];
  activeSeconds: number;
}
export interface RunSimulation {
  state: { time: number; weapon: WeaponId; outcome: 'playing' | 'complete' | 'defeat' };
  captureCarry(): PlayerCarry;
}
const clone = <T>(value: T): T => structuredClone(value);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const uint32 = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
export const validRunId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const upgradeId = (value: unknown): value is UpgradeId => typeof value === 'string' && (UPGRADE_IDS as readonly string[]).includes(value);

export function validateRunCheckpoint(value: unknown): value is RunCheckpoint {
  if (!object(value) || !exactKeys(value, ['runId', 'seed', 'rngState', 'weapon', 'stageIndex', 'phase', 'carry', 'activeSeconds', 'clearedStages', 'rewards', 'offer', 'outcome']) || !validRunId(value.runId) || !uint32(value.seed) || !uint32(value.rngState) || !['weapon_01', 'weapon_02', 'weapon_03'].includes(String(value.weapon))) return false;
  if (!Number.isInteger(value.stageIndex) || (value.stageIndex as number) < 0 || (value.stageIndex as number) >= RUN_STAGES.length || !['encounter', 'reward', 'results'].includes(String(value.phase))) return false;
  if (!validatePlayerCarry(value.carry) || typeof value.activeSeconds !== 'number' || !Number.isFinite(value.activeSeconds) || value.activeSeconds < 0 || value.activeSeconds > 1e9) return false;
  const carry = value.carry;
  if (value.weapon !== 'weapon_01' && carry.ammo !== 0) return false;
  if (!Array.isArray(value.clearedStages) || !Array.isArray(value.rewards) || !Array.isArray(value.offer) || value.clearedStages.length > RUN_STAGES.length || value.rewards.length > RUN_STAGES.length - 1) return false;
  if (value.clearedStages.some((id, index) => id !== RUN_STAGES[index]?.id)) return false;
  const stageIndex = value.stageIndex as number;
  const phase = value.phase as RunPhase;
  const rewards = value.rewards;
  if (phase !== 'reward' && value.offer.length !== 0) return false;
  const selected: UpgradeId[] = [];
  for (const [index, reward] of value.rewards.entries()) {
    if (!object(reward) || !exactKeys(reward, ['id', 'stageId', 'choices', 'selected']) || reward.stageId !== RUN_STAGES[index]?.id || reward.id !== `${value.runId}_${reward.stageId}_reward` || !Array.isArray(reward.choices) || reward.choices.length !== 3 || !reward.choices.every(upgradeId) || new Set(reward.choices).size !== 3 || reward.choices.some(id => selected.includes(id))) return false;
    if (reward.selected !== null) {
      if (!upgradeId(reward.selected) || !reward.choices.includes(reward.selected) || selected.includes(reward.selected)) return false;
      selected.push(reward.selected);
    } else if (index !== value.rewards.length - 1 || phase === 'encounter') return false;
  }
  if (selected.length !== carry.upgrades.owned.length || selected.some((id, index) => id !== carry.upgrades.owned[index])) return false;
  if (phase === 'encounter') return value.outcome === null && value.carry.health > 0 && value.clearedStages.length === stageIndex && value.rewards.length === stageIndex;
  if (phase === 'reward') return value.outcome === null && value.carry.health > 0 && stageIndex < RUN_STAGES.length - 1 && value.clearedStages.length === stageIndex + 1 && rewards.length === stageIndex + 1 && rewards[stageIndex].selected === null && value.offer.length === 3 && value.offer.every((id, index) => id === rewards[stageIndex].choices[index]);
  if (!['victory', 'defeat', 'abandoned'].includes(String(value.outcome))) return false;
  if (value.outcome === 'victory') return stageIndex === RUN_STAGES.length - 1 && value.clearedStages.length === RUN_STAGES.length && value.rewards.length === RUN_STAGES.length - 1 && selected.length === value.rewards.length;
  if (value.outcome === 'defeat') return value.carry.health === 0 && value.clearedStages.length === stageIndex && value.rewards.length === stageIndex;
  return selected.length === stageIndex && ((value.clearedStages.length === stageIndex && rewards.length === stageIndex) || (stageIndex < RUN_STAGES.length - 1 && value.clearedStages.length === stageIndex + 1 && rewards.length === stageIndex + 1 && rewards[stageIndex]?.selected === null));
}

function randomUint32(): number {
  return globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 0x100000000);
}
function randomRunId(): string { return globalThis.crypto?.randomUUID() ?? `run_${Date.now()}_${randomUint32()}`; }
// A stateful selection generator; unlike an ambient RNG, its state travels with saves.
export function nextRunRandom(state: number): { state: number; value: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let mixed = Math.imul(next ^ next >>> 15, next | 1);
  mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
  return { state: next, value: ((mixed ^ mixed >>> 14) >>> 0) / 0x100000000 };
}

export class RunDirector {
  private value: RunCheckpoint | null = null;
  private observed: RunSimulation | null = null;
  private observedTime = 0;

  constructor() {
    const errors = validateRunContent();
    if (errors.length) throw new Error(errors.join(' '));
  }
  get checkpoint(): RunCheckpoint { if (!this.value) throw new Error('No active run.'); return clone(this.value); }
  get phase(): RunPhase | 'idle' { return this.value?.phase ?? 'idle'; }
  get stage(): RunStage { return RUN_STAGES[this.checkpoint.stageIndex]; }
  get summary(): RunSummary | null {
    if (!this.value) return null;
    return { runId: this.value.runId, phase: this.value.phase, outcome: this.value.outcome, weapon: this.value.weapon, stage: this.value.stageIndex + 1, stageReached: this.value.stageIndex + 1, stageName: RUN_STAGES[this.value.stageIndex].name, stageCount: RUN_STAGES.length, cleared: this.value.clearedStages.length, upgrades: [...this.value.carry.upgrades.owned], activeSeconds: this.value.activeSeconds };
  }
  start(weapon: WeaponId, seed: number = randomUint32()): RunCheckpoint {
    if (!['weapon_01', 'weapon_02', 'weapon_03'].includes(weapon) || !uint32(seed)) throw new Error('Invalid run weapon or seed.');
    this.value = { runId: randomRunId(), seed, rngState: seed, weapon, stageIndex: 0, phase: 'encounter', carry: createPlayerCarry(weapon), activeSeconds: 0, clearedStages: [], rewards: [], offer: [], outcome: null };
    this.observed = null; this.observedTime = 0;
    return this.checkpoint;
  }
  resume(checkpoint: RunCheckpoint): RunCheckpoint {
    if (!validateRunCheckpoint(checkpoint) || checkpoint.phase === 'results') throw new Error('Invalid or finished checkpoint.');
    this.value = clone(checkpoint); this.observed = null; this.observedTime = 0;
    return this.checkpoint;
  }
  updateFrom(sim: RunSimulation): RunCheckpoint {
    const value = this.requireEncounter();
    if (sim.state.weapon !== value.weapon || !Number.isFinite(sim.state.time) || sim.state.time < 0) throw new Error('Simulation does not match this run.');
    if (this.observed !== sim) { this.observed = sim; this.observedTime = 0; }
    if (sim.state.time < this.observedTime) throw new Error('Cannot restart one stage inside an active run.');
    const carry = sim.captureCarry();
    if (!validatePlayerCarry(carry) || carry.upgrades.owned.length !== value.carry.upgrades.owned.length || carry.upgrades.owned.some((id, index) => id !== value.carry.upgrades.owned[index])) throw new Error('Invalid simulation carry.');
    value.activeSeconds += sim.state.time - this.observedTime;
    this.observedTime = sim.state.time;
    value.carry = clone(carry);
    return this.checkpoint;
  }
  completeEncounter(sim: RunSimulation): RunCheckpoint {
    if (this.value?.phase !== 'encounter') return this.checkpoint;
    if (sim.state.outcome === 'playing') throw new Error('The encounter objective is incomplete.');
    this.updateFrom(sim);
    const value = this.value;
    if (sim.state.outcome === 'defeat' || value.carry.health <= 0) { value.phase = 'results'; value.outcome = 'defeat'; return this.checkpoint; }
    value.clearedStages.push(RUN_STAGES[value.stageIndex].id);
    if (value.stageIndex === RUN_STAGES.length - 1) { value.phase = 'results'; value.outcome = 'victory'; return this.checkpoint; }
    const candidates = UPGRADE_IDS.filter(id => !value.carry.upgrades.owned.includes(id));
    const choices: UpgradeId[] = [];
    while (choices.length < 3) {
      const random = nextRunRandom(value.rngState); value.rngState = random.state;
      choices.push(candidates.splice(Math.floor(random.value * candidates.length), 1)[0]);
    }
    const stageId = RUN_STAGES[value.stageIndex].id;
    value.rewards.push({ id: `${value.runId}_${stageId}_reward`, stageId, choices, selected: null });
    value.offer = [...choices];
    value.phase = 'reward';
    return this.checkpoint;
  }
  chooseUpgrade(id: UpgradeId): RunCheckpoint {
    if (!this.value || this.value.phase !== 'reward') throw new Error('No pending upgrade choice.');
    const reward = this.value.rewards.at(-1)!;
    if (!reward.choices.includes(id) || reward.selected !== null || this.value.carry.upgrades.owned.includes(id)) throw new Error('This upgrade is unavailable.');
    reward.selected = id; this.value.carry.upgrades.owned.push(id);
    this.value.stageIndex++; this.value.phase = 'encounter'; this.value.offer = [];
    this.observed = null; this.observedTime = 0;
    return this.checkpoint;
  }
  abandon(sim?: RunSimulation): RunCheckpoint {
    if (!this.value) throw new Error('No active run.');
    if (this.value.phase === 'results') return this.checkpoint;
    if (sim && this.value.phase === 'encounter') this.updateFrom(sim);
    this.value.phase = 'results'; this.value.outcome = 'abandoned'; this.value.offer = [];
    return this.checkpoint;
  }
  private requireEncounter(): RunCheckpoint {
    if (!this.value || this.value.phase !== 'encounter') throw new Error('The run is not fighting.');
    return this.value;
  }
}
