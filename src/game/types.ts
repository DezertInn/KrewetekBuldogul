import type { UpgradeRuntime } from './upgrades';
export type { UpgradeId, UpgradeRuntime, PlayerCarry } from './upgrades';
export interface Vec2 { x: number; z: number }
export interface Obstacle { id: string; x: number; z: number; width: number; depth: number; height: number }
export interface Room {
  halfWidth: number; halfDepth: number; obstacles: Obstacle[];
  id?: string; levelId?: string; levelName?: string; name?: string;
  theme?: 'warmup' | 'bags' | 'ring'; exit?: Vec2; playerSpawn?: Vec2;
}
export interface Actions {
  move: Vec2;
  aim: Vec2 | null;
  attackHeld: boolean;
  attackPressed: boolean;
  dashPressed: boolean;
  reloadPressed?: boolean;
  interactPressed?: boolean;
}
export type WeaponId = 'weapon_01' | 'weapon_02' | 'weapon_03';
export type SessionMode = 'dummy' | 'encounter';
export type AttackPhase = 'ready' | 'startup' | 'active' | 'recovery' | 'reload';
export type EnemyArchetype = 'B01_E01' | 'B01_E02' | 'B01_E03' | 'B01_M01';
export interface EnemyDefinition { id?: string; archetype: EnemyArchetype; position: Vec2 }
/** Simulation-owned telegraph geometry; presentation never resolves these hits. */
export interface EnemyAttackShape {
  kind: 'cone' | 'lane' | 'circle'; range: number; halfAngle: number;
  width?: number; center?: Vec2;
}
export interface EnemyState {
  id: string;
  archetype: EnemyArchetype;
  position: Vec2;
  facing: Vec2;
  radius: number;
  health: number;
  maxHealth: number;
  phase: 'approach' | 'guard' | 'preparation' | 'active' | 'recovery' | 'transition' | 'staggered' | 'defeated';
  attackKind: 'jab' | 'counter' | 'charge' | 'double-jab' | 'sweep' | 'slam' | null;
  attackShape: EnemyAttackShape | null;
  guardActive: boolean;
  guardHalfAngle: number;
  bossPhase: 1 | 2 | null;
  phaseTransitionRemaining: number;
  attackProgress: number;
  hitFlash: number;
  poise: number;
  staggerRemaining: number;
  staggerImmunity: number;
}
export interface Tracer { id: number; from: Vec2; to: Vec2; remaining: number }
export interface GameState {
  room: Room;
  time: number;
  weapon: WeaponId;
  sessionMode: SessionMode;
  outcome: 'playing' | 'complete' | 'defeat';
  upgrades: UpgradeRuntime;
  effectiveRange: number;
  player: { position: Vec2; facing: Vec2; radius: number; dashRemaining: number; dashCooldown: number; invulnerable: boolean; attackPhase: AttackPhase; attackProgress: number; combo: number; health: number; maxHealth: number; barrier: number; hitFlash: number; hurtRemaining: number; ammo: number; maxAmmo: number; reloadRemaining: number; reloadProgress: number };
  dummy: { position: Vec2; radius: number; health: number; maxHealth: number; hitFlash: number };
  enemies: EnemyState[];
  tracers: Tracer[];
  damageTotal: number;
  hits: number;
  lastDamage: number;
}
export interface HitEvent { kind: 'hit'; position: Vec2; damage: number; id: number; targetId?: string; source?: 'player' | 'enemy'; weapon?: WeaponId }
export interface SimulationSoundEvent {
  id: number;
  kind: 'attack' | 'miss' | 'reload-start' | 'reload-end' | 'dash' | 'step' | 'warning' | 'phase-change';
  weapon?: WeaponId;
  archetype?: EnemyArchetype;
}
