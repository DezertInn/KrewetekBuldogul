export interface Vec2 { x: number; z: number }
export interface Obstacle { id: string; x: number; z: number; width: number; depth: number; height: number }
export interface Room { halfWidth: number; halfDepth: number; obstacles: Obstacle[] }
export interface Actions {
  move: Vec2;
  aim: Vec2 | null;
  attackHeld: boolean;
  attackPressed: boolean;
  dashPressed: boolean;
}
export type AttackPhase = 'ready' | 'startup' | 'active' | 'recovery';
export interface GameState {
  time: number;
  player: { position: Vec2; facing: Vec2; radius: number; dashRemaining: number; dashCooldown: number; invulnerable: boolean; attackPhase: AttackPhase; attackProgress: number; combo: number };
  dummy: { position: Vec2; radius: number; health: number; maxHealth: number; hitFlash: number };
  damageTotal: number;
  hits: number;
  lastDamage: number;
}
export interface HitEvent { kind: 'hit'; position: Vec2; damage: number; id: number }
