import type { UpgradeRuntime } from './upgrades';
export type { UpgradeId, UpgradeRuntime, PlayerCarry } from './upgrades';
export interface Vec2 { x: number; z: number }
export interface Obstacle { id: string; x: number; z: number; width: number; depth: number; height: number }
export interface Room { halfWidth: number; halfDepth: number; obstacles: Obstacle[] }
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
export interface EnemyState {
  id: string;
  archetype: 'B01_E01';
  position: Vec2;
  facing: Vec2;
  radius: number;
  health: number;
  maxHealth: number;
  phase: 'approach' | 'preparation' | 'active' | 'recovery' | 'staggered' | 'defeated';
  attackProgress: number;
  hitFlash: number;
  poise: number;
  staggerRemaining: number;
  staggerImmunity: number;
}
export interface Tracer { id: number; from: Vec2; to: Vec2; remaining: number }
export interface GameState {
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
