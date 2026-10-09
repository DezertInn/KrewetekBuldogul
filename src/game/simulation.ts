import { ROOM, RULES } from './config';
import type { Actions, GameState, HitEvent, Room, Vec2 } from './types';

const EPSILON = 1e-9;
export function clampMovement(v: Vec2): Vec2 {
  const length = Math.hypot(v.x, v.z);
  if (!Number.isFinite(length)) return { x: 0, z: 0 };
  const scale = length > 1 ? 1 / length : 1;
  return { x: v.x * scale, z: v.z * scale };
}
function unit(v: Vec2): Vec2 {
  const length = Math.hypot(v.x, v.z);
  return length > EPSILON ? { x: v.x / length, z: v.z / length } : { x: 0, z: 1 };
}
function circleBox(p: Vec2, radius: number, b: Room['obstacles'][number]): boolean {
  const x = Math.max(b.x - b.width / 2, Math.min(p.x, b.x + b.width / 2));
  const z = Math.max(b.z - b.depth / 2, Math.min(p.z, b.z + b.depth / 2));
  return (p.x - x) ** 2 + (p.z - z) ** 2 < radius ** 2 - EPSILON;
}
export function lineBlocked(a: Vec2, b: Vec2, room: Room): boolean {
  return room.obstacles.some(box => {
    let lo = 0; let hi = 1;
    for (const [start, delta, min, max] of [
      [a.x, b.x - a.x, box.x - box.width / 2, box.x + box.width / 2],
      [a.z, b.z - a.z, box.z - box.depth / 2, box.z + box.depth / 2],
    ]) {
      if (Math.abs(delta) < EPSILON) { if (start < min || start > max) return false; }
      else {
        const first = (min - start) / delta; const last = (max - start) / delta;
        lo = Math.max(lo, Math.min(first, last)); hi = Math.min(hi, Math.max(first, last));
        if (lo > hi) return false;
      }
    }
    return true;
  });
}
// Bounded substeps plus axis sliding: even thin cover cannot be skipped by a dash.
export function moveWithCollision(position: Vec2, delta: Vec2, radius: number, room: Room, body?: { position: Vec2; radius: number }): Vec2 {
  const p = { ...position };
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / (radius * 0.45)));
  const valid = (v: Vec2) => Math.abs(v.x) <= room.halfWidth - radius + EPSILON
    && Math.abs(v.z) <= room.halfDepth - radius + EPSILON
    && !room.obstacles.some(b => circleBox(v, radius, b))
    && (!body || Math.hypot(v.x - body.position.x, v.z - body.position.z) >= radius + body.radius - EPSILON
      // A dash may end inside a body. Allow walking out without permitting deeper overlap.
      || Math.hypot(v.x - body.position.x, v.z - body.position.z) > Math.hypot(p.x - body.position.x, p.z - body.position.z) + EPSILON);
  for (let i = 0; i < steps; i++) {
    const nextX = { x: p.x + delta.x / steps, z: p.z };
    if (valid(nextX)) p.x = nextX.x;
    const nextZ = { x: p.x, z: p.z + delta.z / steps };
    if (valid(nextZ)) p.z = nextZ.z;
  }
  return p;
}

export class Simulation {
  state: GameState;
  private tick = 0;
  private attack: { strike: number; age: number; hit: boolean; facing: Vec2; facingLocked: boolean } | null = null;
  private nextAttackTick = 0;
  private lastAttackEnd = -999;
  private nextCombo = 0;
  private dashTicks = 0;
  private dashReadyTick = 0;
  private dashDirection: Vec2 = { x: 0, z: 1 };
  private attackBuffer = -1;
  private dashBuffer = -1;
  private hitId = 0;

  constructor(private readonly room: Room = ROOM) {
    this.state = {
      time: 0,
      player: { position: { x: 0, z: -2.5 }, facing: { x: 0, z: 1 }, radius: RULES.radius, dashRemaining: 0, dashCooldown: 0, invulnerable: false, attackPhase: 'ready', attackProgress: 0, combo: 0 },
      dummy: { position: { x: 0, z: 1 }, radius: 0.45, health: 1000, maxHealth: 1000, hitFlash: 0 },
      damageTotal: 0, hits: 0, lastDamage: 0,
    };
  }

  /** Browser safety transitions must discard buffered actions as well as held inputs. */
  clearBufferedActions(): void { this.attackBuffer = -1; this.dashBuffer = -1; }

  step(actions: Actions): HitEvent[] {
    const events: HitEvent[] = [];
    const { player, dummy } = this.state;
    const move = clampMovement(actions.move);
    const bufferTicks = Math.round(RULES.inputBuffer / RULES.fixedStep);
    if (actions.attackPressed) this.attackBuffer = this.tick + bufferTicks;
    if (actions.dashPressed) this.dashBuffer = this.tick + bufferTicks;
    if (actions.aim && Math.hypot(actions.aim.x, actions.aim.z) > EPSILON && this.attackPhase() !== 'active') {
      player.facing = unit(actions.aim);
    }
    if (this.dashBuffer >= this.tick && this.tick >= this.dashReadyTick && this.dashTicks === 0 && this.attackPhase() !== 'active') {
      this.dashTicks = Math.round(RULES.dashDuration / RULES.fixedStep);
      this.dashReadyTick = this.tick + Math.round(RULES.dashCooldown / RULES.fixedStep);
      this.dashDirection = Math.hypot(move.x, move.z) > EPSILON ? unit(move) : { ...player.facing };
      this.dashBuffer = -1;
      // nextAttackTick retains the original attack end, including canceled recovery.
      if (this.attack) { this.lastAttackEnd = this.nextAttackTick; this.attack = null; this.nextCombo = 0; }
    }
    if (!this.attack && !this.dashTicks && this.tick >= this.nextAttackTick && (actions.attackHeld || this.attackBuffer >= this.tick)) {
      if (this.tick - this.lastAttackEnd >= Math.round(RULES.comboReset / RULES.fixedStep)) this.nextCombo = 0;
      const strike = RULES.strikes[this.nextCombo];
      this.attack = { strike: this.nextCombo, age: 0, hit: false, facing: { ...player.facing }, facingLocked: false };
      this.nextAttackTick = this.tick + strike.startup + strike.active + strike.recovery;
      this.attackBuffer = -1;
    }

    player.attackPhase = this.attackPhase();
    player.attackProgress = 0;
    if (this.attack) {
      const strike = RULES.strikes[this.attack.strike];
      player.combo = this.attack.strike;
      const age = this.attack.age;
      if (age < strike.startup) player.attackProgress = age / strike.startup;
      else if (age < strike.startup + strike.active) {
        player.attackProgress = (age - strike.startup) / strike.active;
        // Fractional boundaries may fall between samples: latch on the first
        // active sample, rather than requiring age === startup (e.g. 2.5 ticks).
        if (!this.attack.facingLocked) {
          this.attack.facing = { ...player.facing };
          this.attack.facingLocked = true;
        }
        player.facing = { ...this.attack.facing };
      } else player.attackProgress = (age - strike.startup - strike.active) / strike.recovery;
    }

    const dashing = this.dashTicks > 0;
    const velocity = dashing ? this.dashDirection : move;
    const speed = dashing ? RULES.dashDistance / RULES.dashDuration : RULES.moveSpeed * (this.attack ? RULES.attackMoveFactor : 1);
    player.position = moveWithCollision(player.position, { x: velocity.x * speed * RULES.fixedStep, z: velocity.z * speed * RULES.fixedStep }, player.radius, this.room, dashing || dummy.health <= 0 ? undefined : dummy);

    if (this.attack && player.attackPhase === 'active' && !this.attack.hit && dummy.health > 0) {
      const delta = { x: dummy.position.x - player.position.x, z: dummy.position.z - player.position.z };
      const distance = Math.hypot(delta.x, delta.z);
      const dot = distance < EPSILON ? 1 : (delta.x * this.attack.facing.x + delta.z * this.attack.facing.z) / distance;
      if (distance <= RULES.gloveRange + dummy.radius && dot >= Math.cos(RULES.gloveHalfAngle) && !lineBlocked(player.position, dummy.position, this.room)) {
        const damage = Math.min(dummy.health, RULES.strikes[this.attack.strike].damage);
        dummy.health -= damage; dummy.hitFlash = 0.18;
        this.state.damageTotal += damage; this.state.hits++; this.state.lastDamage = damage;
        this.attack.hit = true;
        events.push({ kind: 'hit', position: { ...dummy.position }, damage, id: ++this.hitId });
      }
    }
    if (this.attack) {
      this.attack.age++;
      if (this.tick + 1 >= this.nextAttackTick) {
        this.nextCombo = (this.attack.strike + 1) % RULES.strikes.length;
        this.lastAttackEnd = this.tick + 1;
        this.attack = null;
      }
    }
    player.invulnerable = dashing && this.dashTicks > Math.round((RULES.dashDuration - RULES.dashInvulnerability) / RULES.fixedStep);
    if (this.dashTicks) this.dashTicks--;
    this.tick++;
    this.state.time = this.tick * RULES.fixedStep;
    player.dashRemaining = this.dashTicks * RULES.fixedStep;
    player.dashCooldown = Math.max(0, (this.dashReadyTick - this.tick) * RULES.fixedStep);
    dummy.hitFlash = Math.max(0, dummy.hitFlash - RULES.fixedStep);
    return events;
  }

  private attackPhase(): GameState['player']['attackPhase'] {
    if (!this.attack) return 'ready';
    const strike = RULES.strikes[this.attack.strike];
    if (this.attack.age < strike.startup) return 'startup';
    if (this.attack.age < strike.startup + strike.active) return 'active';
    return 'recovery';
  }
}
