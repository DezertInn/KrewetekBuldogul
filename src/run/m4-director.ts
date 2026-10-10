import { createPlayerCarry, isUpgradeId, UPGRADE_IDS, validatePlayerCarry, type PlayerCarry, type UpgradeId } from '../game/upgrades';
import type { WeaponId } from '../game/types';
import { nextRunRandom, validRunId, type RunOutcome, type RunSimulation } from './director';
import { M4_ROOMS, validateM4Content, type M4RoomDefinition } from './m4-content';

export type M4RunPhase = 'encounter' | 'cleared' | 'reward' | 'results';
export type M4RunSimulation = RunSimulation;
export interface M4RunReward {
  id: string;
  levelId: string;
  roomId: string;
  choices: UpgradeId[];
  selected: UpgradeId | null;
}
export interface M4RunCheckpoint {
  runId: string;
  seed: number;
  rngState: number;
  weapon: WeaponId;
  roomIndex: number;
  levelId: string;
  roomId: string;
  encounterId: string;
  phase: M4RunPhase;
  carry: PlayerCarry;
  activeSeconds: number;
  clearedRooms: string[];
  rewards: M4RunReward[];
  offer: UpgradeId[];
  outcome: RunOutcome | null;
}
export interface M4RunSummary {
  runId: string;
  phase: M4RunPhase;
  outcome: RunOutcome | null;
  weapon: WeaponId;
  stage: number;
  stageReached: number;
  stageName: string;
  stageCount: number;
  level: number;
  room: number;
  levelId: string;
  roomId: string;
  levelName: string;
  totalRooms: number;
  cleared: number;
  upgrades: UpgradeId[];
  activeSeconds: number;
}
const clone = <T>(value: T): T => structuredClone(value);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const uint32 = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffffff;

function rollOffer(rngState: number, owned: readonly UpgradeId[]): { choices: UpgradeId[]; rngState: number } {
  const candidates = UPGRADE_IDS.filter(id => !owned.includes(id));
  if (candidates.length < 3) throw new Error('Not enough unowned upgrades.');
  const choices: UpgradeId[] = [];
  while (choices.length < 3) {
    const random = nextRunRandom(rngState); rngState = random.state;
    choices.push(candidates.splice(Math.floor(random.value * candidates.length), 1)[0]);
  }
  return { choices, rngState };
}

export function validateM4RunCheckpoint(value: unknown): value is M4RunCheckpoint {
  if (!object(value) || !exactKeys(value, ['runId', 'seed', 'rngState', 'weapon', 'roomIndex', 'levelId', 'roomId', 'encounterId', 'phase', 'carry', 'activeSeconds', 'clearedRooms', 'rewards', 'offer', 'outcome']) || !validRunId(value.runId) || !uint32(value.seed) || !uint32(value.rngState) || !['weapon_01', 'weapon_02', 'weapon_03'].includes(String(value.weapon))) return false;
  if (!Number.isInteger(value.roomIndex) || (value.roomIndex as number) < 0 || (value.roomIndex as number) >= M4_ROOMS.length || !['encounter', 'cleared', 'reward', 'results'].includes(String(value.phase))) return false;
  const roomIndex = value.roomIndex as number;
  const stage = M4_ROOMS[roomIndex];
  if (value.levelId !== stage.levelId || value.roomId !== stage.roomId || value.encounterId !== stage.encounterId || !validatePlayerCarry(value.carry) || value.weapon !== 'weapon_01' && value.carry.ammo !== 0) return false;
  if (typeof value.activeSeconds !== 'number' || !Number.isFinite(value.activeSeconds) || value.activeSeconds < 0 || value.activeSeconds > 1e9 || !Array.isArray(value.clearedRooms) || !Array.isArray(value.rewards) || !Array.isArray(value.offer) || value.clearedRooms.length > M4_ROOMS.length || value.rewards.length > 2) return false;
  const carry = value.carry;
  const rewards = value.rewards;
  if (value.clearedRooms.some((id, index) => id !== M4_ROOMS[index]?.roomId)) return false;
  if (value.phase !== 'reward' && value.offer.length !== 0) return false;
  const selected: UpgradeId[] = [];
  let rngState = value.seed;
  for (const [index, reward] of value.rewards.entries()) {
    const rewardedRoom = M4_ROOMS[index * 2 + 1];
    if (!object(reward) || !exactKeys(reward, ['id', 'levelId', 'roomId', 'choices', 'selected']) || reward.levelId !== rewardedRoom.levelId || reward.roomId !== rewardedRoom.roomId || reward.id !== `${value.runId}_${reward.levelId}_reward` || !Array.isArray(reward.choices) || reward.choices.length !== 3 || !reward.choices.every(isUpgradeId) || new Set(reward.choices).size !== 3 || reward.choices.some(id => selected.includes(id))) return false;
    const rolled = rollOffer(rngState, selected); rngState = rolled.rngState;
    if (reward.choices.some((id, choiceIndex) => id !== rolled.choices[choiceIndex])) return false;
    if (reward.selected !== null) {
      if (!isUpgradeId(reward.selected) || !reward.choices.includes(reward.selected) || selected.includes(reward.selected)) return false;
      selected.push(reward.selected);
    } else if (index !== value.rewards.length - 1 || value.phase !== 'reward' && !(value.phase === 'results' && value.outcome === 'abandoned')) return false;
  }
  if (value.rngState !== rngState || selected.length !== carry.upgrades.owned.length || selected.some((id, index) => id !== carry.upgrades.owned[index])) return false;
  const priorRewards = Math.floor(roomIndex / 2);
  const fighting = value.clearedRooms.length === roomIndex && value.rewards.length === priorRewards && selected.length === priorRewards;
  const cleared = roomIndex % 2 === 0 && value.clearedRooms.length === roomIndex + 1 && value.rewards.length === priorRewards && selected.length === priorRewards;
  const rewarding = roomIndex % 2 === 1 && roomIndex < 5 && value.clearedRooms.length === roomIndex + 1 && value.rewards.length === priorRewards + 1 && selected.length === priorRewards && value.rewards.at(-1)?.selected === null;
  if (value.phase === 'encounter') return value.outcome === null && value.carry.health > 0 && fighting;
  if (value.phase === 'cleared') return value.outcome === null && value.carry.health > 0 && cleared;
  if (value.phase === 'reward') return value.outcome === null && value.carry.health > 0 && rewarding && value.offer.length === 3 && value.offer.every((id, index) => id === rewards.at(-1)!.choices[index]);
  if (value.outcome === 'victory') return roomIndex === 5 && value.carry.health > 0 && value.clearedRooms.length === 6 && value.rewards.length === 2 && selected.length === 2;
  if (value.outcome === 'defeat') return value.carry.health === 0 && fighting;
  return value.outcome === 'abandoned' && value.carry.health > 0 && (fighting || cleared || rewarding);
}

const randomUint32 = (): number => globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 0x100000000);
const randomRunId = (): string => globalThis.crypto?.randomUUID() ?? `m4_${Date.now()}_${randomUint32()}`;
let contentVerified = false;

export class M4RunDirector {
  private value: M4RunCheckpoint | null = null;
  private observed: M4RunSimulation | null = null;
  private observedTime = 0;

  constructor() {
    if (!contentVerified) {
      const errors = validateM4Content();
      if (errors.length) throw new Error(errors.join(' '));
      contentVerified = true;
    }
  }
  get checkpoint(): M4RunCheckpoint { if (!this.value) throw new Error('No active M4 run.'); return clone(this.value); }
  get phase(): M4RunPhase | 'idle' { return this.value?.phase ?? 'idle'; }
  get stage(): M4RoomDefinition { return clone(M4_ROOMS[this.checkpoint.roomIndex]); }
  get summary(): M4RunSummary | null {
    if (!this.value) return null;
    const value = this.value;
    const stage = M4_ROOMS[value.roomIndex];
    return { runId: value.runId, phase: value.phase, outcome: value.outcome, weapon: value.weapon, stage: value.roomIndex + 1, stageReached: value.roomIndex + 1, stageName: stage.name, stageCount: M4_ROOMS.length, level: Math.floor(value.roomIndex / 2) + 1, room: value.roomIndex % 2 + 1, levelId: stage.levelId, roomId: stage.roomId, levelName: stage.room.levelName!, totalRooms: M4_ROOMS.length, cleared: value.clearedRooms.length, upgrades: [...value.carry.upgrades.owned], activeSeconds: value.activeSeconds };
  }
  start(weapon: WeaponId, seed: number = randomUint32()): M4RunCheckpoint {
    if (!['weapon_01', 'weapon_02', 'weapon_03'].includes(weapon) || !uint32(seed)) throw new Error('Invalid M4 weapon or seed.');
    const stage = M4_ROOMS[0];
    this.value = { runId: randomRunId(), seed, rngState: seed, weapon, roomIndex: 0, levelId: stage.levelId, roomId: stage.roomId, encounterId: stage.encounterId, phase: 'encounter', carry: createPlayerCarry(weapon), activeSeconds: 0, clearedRooms: [], rewards: [], offer: [], outcome: null };
    this.resetObserved();
    return this.checkpoint;
  }
  resume(checkpoint: M4RunCheckpoint): M4RunCheckpoint {
    if (!validateM4RunCheckpoint(checkpoint) || checkpoint.phase === 'results') throw new Error('Invalid or finished M4 checkpoint.');
    this.value = clone(checkpoint); this.resetObserved();
    return this.checkpoint;
  }
  updateFrom(sim: M4RunSimulation): M4RunCheckpoint {
    if (!this.value || !['encounter', 'cleared'].includes(this.value.phase)) throw new Error('M4 is not active in a room.');
    const value = this.value;
    if (sim.state.weapon !== value.weapon || !Number.isFinite(sim.state.time) || sim.state.time < 0 || value.phase === 'cleared' && sim.state.outcome !== 'complete') throw new Error('Simulation does not match this M4 room.');
    const carry = sim.captureCarry();
    if (!validatePlayerCarry(carry) || value.weapon !== 'weapon_01' && carry.ammo !== 0 || carry.upgrades.owned.length !== value.carry.upgrades.owned.length || carry.upgrades.owned.some((id, index) => id !== value.carry.upgrades.owned[index])) throw new Error('Invalid M4 simulation carry.');
    const observedTime = this.observed === sim ? this.observedTime : 0;
    if (sim.state.time < observedTime) throw new Error('Cannot restart one room inside an active M4 run.');
    value.activeSeconds += sim.state.time - observedTime;
    value.carry = clone(carry);
    this.observed = sim; this.observedTime = sim.state.time;
    return this.checkpoint;
  }
  completeEncounter(sim: M4RunSimulation): M4RunCheckpoint {
    if (this.value?.phase !== 'encounter') return this.checkpoint;
    if (sim.state.outcome === 'playing') throw new Error('The room objective is incomplete.');
    this.updateFrom(sim);
    const value = this.value;
    if (sim.state.outcome === 'defeat' || value.carry.health === 0) {
      if (value.carry.health !== 0) throw new Error('Defeat must carry zero health.');
      value.phase = 'results'; value.outcome = 'defeat'; return this.checkpoint;
    }
    value.clearedRooms.push(value.roomId);
    if (value.roomIndex === M4_ROOMS.length - 1) { value.phase = 'results'; value.outcome = 'victory'; return this.checkpoint; }
    if (value.roomIndex % 2 === 0) { value.phase = 'cleared'; return this.checkpoint; }
    const rolled = rollOffer(value.rngState, value.carry.upgrades.owned); value.rngState = rolled.rngState;
    value.rewards.push({ id: `${value.runId}_${value.levelId}_reward`, levelId: value.levelId, roomId: value.roomId, choices: [...rolled.choices], selected: null });
    value.offer = [...rolled.choices]; value.phase = 'reward';
    return this.checkpoint;
  }
  advanceRoom(sim?: M4RunSimulation): M4RunCheckpoint {
    if (!this.value || this.value.phase !== 'cleared') throw new Error('The room exit is locked.');
    if (sim) this.updateFrom(sim);
    this.enterNextRoom();
    return this.checkpoint;
  }
  chooseUpgrade(id: UpgradeId): M4RunCheckpoint {
    if (!this.value || this.value.phase !== 'reward') throw new Error('No pending M4 upgrade choice.');
    const reward = this.value.rewards.at(-1)!;
    if (!reward.choices.includes(id) || reward.selected !== null || this.value.carry.upgrades.owned.includes(id)) throw new Error('This upgrade is unavailable.');
    reward.selected = id; this.value.carry.upgrades.owned.push(id);
    this.enterNextRoom();
    return this.checkpoint;
  }
  abandon(sim?: M4RunSimulation): M4RunCheckpoint {
    if (!this.value) throw new Error('No active M4 run.');
    if (this.value.phase === 'results') return this.checkpoint;
    if (sim && ['encounter', 'cleared'].includes(this.value.phase)) this.updateFrom(sim);
    this.value.phase = 'results'; this.value.outcome = 'abandoned'; this.value.offer = [];
    return this.checkpoint;
  }
  private enterNextRoom(): void {
    const value = this.value!;
    const stage = M4_ROOMS[++value.roomIndex];
    if (!stage) throw new Error('M4 has no additional room.');
    value.levelId = stage.levelId; value.roomId = stage.roomId; value.encounterId = stage.encounterId;
    value.phase = 'encounter'; value.offer = []; this.resetObserved();
  }
  private resetObserved(): void { this.observed = null; this.observedTime = 0; }
}
