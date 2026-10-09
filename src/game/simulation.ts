import { BOXER_RULES, PLAYER_RULES, RIFLE_RULES, ROOM, RULES, WEAPONS } from './config';
import type { Actions, EnemyState, GameState, HitEvent, Room, SessionMode, Vec2, WeaponId } from './types';
import { attackMoveFactor, createUpgradeRuntime, effectiveRange, incomingDamageFactor, isUpgradeId, owns, primaryDamageFactor, validatePlayerCarry, type PlayerCarry, type UpgradeId } from './upgrades';

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
// Bounded substeps plus axis sliding prevent tunneling through thin cover.
export function moveWithCollision(position: Vec2, delta: Vec2, radius: number, room: Room, body?: { position: Vec2; radius: number } | { position: Vec2; radius: number }[]): Vec2 {
  const p = { ...position };
  const bodies = body ? Array.isArray(body) ? body : [body] : [];
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / (radius * 0.45)));
  const valid = (v: Vec2) => Math.abs(v.x) <= room.halfWidth - radius + EPSILON
    && Math.abs(v.z) <= room.halfDepth - radius + EPSILON
    && !room.obstacles.some(b => circleBox(v, radius, b))
    && bodies.every(b => Math.hypot(v.x - b.position.x, v.z - b.position.z) >= radius + b.radius - EPSILON
      || Math.hypot(v.x - b.position.x, v.z - b.position.z) > Math.hypot(p.x - b.position.x, p.z - b.position.z) + EPSILON);
  for (let i = 0; i < steps; i++) {
    const nextX = { x: p.x + delta.x / steps, z: p.z };
    if (valid(nextX)) p.x = nextX.x;
    const nextZ = { x: p.x, z: p.z + delta.z / steps };
    if (valid(nextZ)) p.z = nextZ.z;
  }
  return p;
}

/** Distance to first cover or room edge on a normalized hitscan ray. */
export function rayCoverDistance(origin: Vec2, direction: Vec2, range: number, room: Room): number {
  const facing = unit(direction);
  let distance = range;
  for (const [start, delta, half] of [[origin.x, facing.x, room.halfWidth], [origin.z, facing.z, room.halfDepth]]) {
    if (Math.abs(delta) > EPSILON) distance = Math.min(distance, ((delta > 0 ? half : -half) - start) / delta);
  }
  for (const box of room.obstacles) {
    let lo = 0; let hi = distance;
    for (const [start, delta, min, max] of [
      [origin.x, facing.x, box.x - box.width / 2, box.x + box.width / 2],
      [origin.z, facing.z, box.z - box.depth / 2, box.z + box.depth / 2],
    ]) {
      if (Math.abs(delta) < EPSILON) { if (start < min || start > max) { hi = -1; break; } }
      else { const a = (min - start) / delta; const b = (max - start) / delta; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); }
    }
    if (lo <= hi) distance = Math.min(distance, lo);
  }
  return Math.max(0, distance);
}

export function rayTargetDistance(origin: Vec2, direction: Vec2, target: { position: Vec2; radius: number }): number {
  const facing = unit(direction);
  const delta = { x: target.position.x - origin.x, z: target.position.z - origin.z };
  const along = delta.x * facing.x + delta.z * facing.z;
  const perpendicular2 = delta.x ** 2 + delta.z ** 2 - along ** 2;
  if (perpendicular2 > target.radius ** 2 + EPSILON) return Infinity;
  const halfChord = Math.sqrt(Math.max(0, target.radius ** 2 - perpendicular2));
  return along + halfChord < 0 ? Infinity : Math.max(0, along - halfChord);
}

/** M1 envelope: target center lies in the cone and its circular body touches reach. */
export function meleeEligible(origin: Vec2, facing: Vec2, target: { position: Vec2; radius: number }, range: number, halfAngle: number, room: Room): boolean {
  const delta = { x: target.position.x - origin.x, z: target.position.z - origin.z };
  const distance = Math.hypot(delta.x, delta.z);
  const dot = distance < EPSILON ? 1 : (delta.x * facing.x + delta.z * facing.z) / distance;
  return distance <= range + target.radius && dot >= Math.cos(halfAngle) && !lineBlocked(origin, target.position, room);
}

interface EnemyBrain { phaseAge: number; hit: boolean; staggerTicks: number; immunityUntil: number; lastStagger: number; pendingStagger: boolean }
interface Attack { strike: number; age: number; hitIds: Set<string>; fired: boolean; facing: Vec2; facingLocked: boolean; impactCredited: boolean }
interface Target { id: string; position: Vec2; radius: number; health: number; hitFlash: number }

/** Small deterministic visibility graph around inflated cover; no teleporting AI. */
function approachDirection(origin: Vec2, goal: Vec2, radius: number, room: Room): Vec2 {
  const margin = radius + 0.07;
  const expanded: Room = { ...room, obstacles: room.obstacles.map(box => ({ ...box, width: box.width + margin * 2, depth: box.depth + margin * 2 })) };
  const navigable = (point: Vec2) => Math.abs(point.x) < room.halfWidth - radius
    && Math.abs(point.z) < room.halfDepth - radius && !expanded.obstacles.some(box => circleBox(point, 0.01, box));
  const projectOutsideMargin = (point: Vec2): Vec2 | null => {
    if (navigable(point)) return point;
    point = {
      x: Math.max(-room.halfWidth + radius + 0.03, Math.min(point.x, room.halfWidth - radius - 0.03)),
      z: Math.max(-room.halfDepth + radius + 0.03, Math.min(point.z, room.halfDepth - radius - 0.03)),
    };
    if (navigable(point)) return point;
    const candidates: Vec2[] = [];
    for (const box of expanded.obstacles) {
      if (!circleBox(point, 0.01, box)) continue;
      const minX = box.x - box.width / 2, maxX = box.x + box.width / 2;
      const minZ = box.z - box.depth / 2, maxZ = box.z + box.depth / 2;
      candidates.push(
        { x: minX - 0.03, z: Math.max(minZ, Math.min(point.z, maxZ)) },
        { x: maxX + 0.03, z: Math.max(minZ, Math.min(point.z, maxZ)) },
        { x: Math.max(minX, Math.min(point.x, maxX)), z: minZ - 0.03 },
        { x: Math.max(minX, Math.min(point.x, maxX)), z: maxZ + 0.03 },
      );
    }
    return candidates.filter(navigable).sort((a, b) => Math.hypot(a.x - point.x, a.z - point.z) - Math.hypot(b.x - point.x, b.z - point.z))[0] ?? null;
  };
  // A smaller player may stand inside the boxer's navigation clearance. Route
  // toward the nearest free approach point instead of an unreachable center.
  const approach = projectOutsideMargin(goal);
  if (!approach) return { x: 0, z: 0 };
  goal = approach;
  // Knockback can leave a boxer in the extra navigation margin while its body
  // remains outside solid cover. Walk out normally before planning a route.
  const escape = projectOutsideMargin(origin);
  if (!escape) return { x: 0, z: 0 };
  if (escape !== origin) return unit({ x: escape.x - origin.x, z: escape.z - origin.z });
  if (!lineBlocked(origin, goal, expanded)) return unit({ x: goal.x - origin.x, z: goal.z - origin.z });
  const points = [origin, goal];
  for (const b of expanded.obstacles) for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const p = { x: b.x + x * (b.width / 2 + 0.03), z: b.z + z * (b.depth / 2 + 0.03) };
    if (Math.abs(p.x) < room.halfWidth - radius && Math.abs(p.z) < room.halfDepth - radius && !expanded.obstacles.some(box => circleBox(p, 0.01, box))) points.push(p);
  }
  const costs = points.map(() => Infinity); const previous = points.map(() => -1); const visited = new Set<number>(); costs[0] = 0;
  for (let n = 0; n < points.length; n++) {
    let current = -1;
    for (let i = 0; i < points.length; i++) if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
    if (current < 0 || !Number.isFinite(costs[current]) || current === 1) break;
    visited.add(current);
    for (let next = 0; next < points.length; next++) {
      if (visited.has(next) || next === current || lineBlocked(points[current], points[next], expanded)) continue;
      const cost = costs[current] + Math.hypot(points[next].x - points[current].x, points[next].z - points[current].z);
      if (cost < costs[next]) { costs[next] = cost; previous[next] = current; }
    }
  }
  let next = 1;
  if (previous[next] < 0) return { x: 0, z: 0 };
  while (previous[next] > 0) next = previous[next];
  return unit({ x: points[next].x - origin.x, z: points[next].z - origin.z });
}

export class Simulation {
  state: GameState;
  private tick = 0;
  private attack: Attack | null = null;
  private nextAttackTick = 0;
  private lastAttackEnd = -999;
  private nextCombo = 0;
  private dashTicks = 0;
  private dashReadyTick = 0;
  private dashDirection: Vec2 = { x: 0, z: 1 };
  private attackBuffer = -1;
  private dashBuffer = -1;
  private reloadRequested = false;
  private reloadTicks = 0;
  private hurtUntil = 0;
  private hitId = 0;
  private tracerId = 0;
  private visibleEnemies: Set<string> | null = null;
  private brains = new Map<string, EnemyBrain>();
  private previousPosition: Vec2 | null = null;
  private healthLostThisTick = false;
  private barrierRefreshedThisTick = false;
  private streetTriggeredThisTick = false;

  constructor(private readonly room: Room = ROOM, options: { weapon?: WeaponId; mode?: SessionMode; enemySpawns?: readonly Vec2[] } = {}) {
    const weapon = options.weapon ?? 'weapon_02';
    const mode = options.mode ?? 'dummy';
    this.state = {
      time: 0, weapon, sessionMode: mode, outcome: 'playing',
      upgrades: createUpgradeRuntime(), effectiveRange: WEAPONS[weapon].range,
      player: { position: { x: 0, z: -2.5 }, facing: { x: 0, z: 1 }, radius: RULES.radius, dashRemaining: 0, dashCooldown: 0, invulnerable: false, attackPhase: 'ready', attackProgress: 0, combo: 0, health: PLAYER_RULES.health, maxHealth: PLAYER_RULES.health, barrier: 0, hitFlash: 0, hurtRemaining: 0, ammo: weapon === 'weapon_01' ? RIFLE_RULES.magazine : 0, maxAmmo: weapon === 'weapon_01' ? RIFLE_RULES.magazine : 0, reloadRemaining: 0, reloadProgress: 0 },
      dummy: { position: { x: 0, z: 1 }, radius: 0.45, health: 1000, maxHealth: 1000, hitFlash: 0 },
      enemies: mode === 'encounter' ? (options.enemySpawns ?? BOXER_RULES.spawns).map((position, index) => ({ id: `jabber-${index + 1}`, archetype: 'B01_E01', position: { ...position }, facing: { x: 0, z: -1 }, radius: BOXER_RULES.radius, health: BOXER_RULES.health, maxHealth: BOXER_RULES.health, phase: 'approach', attackProgress: 0, hitFlash: 0, poise: BOXER_RULES.poise, staggerRemaining: 0, staggerImmunity: 0 })) : [],
      tracers: [], damageTotal: 0, hits: 0, lastDamage: 0,
    };
    for (const enemy of this.state.enemies) this.brains.set(enemy.id, { phaseAge: 0, hit: false, staggerTicks: 0, immunityUntil: 0, lastStagger: -999, pendingStagger: false });
  }

  /** The static camera fits the full room; alternate cameras can explicitly gate AI initiation. */
  setVisibleEnemyIds(ids: readonly string[] | null): void { this.visibleEnemies = ids === null ? null : new Set(ids); }

  /** Browser safety transitions discard queued actions, without fast-forwarding paused attacks. */
  clearBufferedActions(): void { this.attackBuffer = -1; this.dashBuffer = -1; this.reloadRequested = false; }

  captureCarry(): PlayerCarry {
    const player = this.state.player;
    return {
      health: player.health, ammo: player.ammo, barrier: player.barrier,
      dashCooldown: Math.max(0, (this.dashReadyTick - this.tick) * RULES.fixedStep),
      attackCooldown: Math.max(0, (this.nextAttackTick - this.tick) * RULES.fixedStep, this.reloadTicks * RULES.fixedStep),
      hurtRemaining: Math.max(0, (this.hurtUntil - this.tick) * RULES.fixedStep),
      upgrades: structuredClone(this.state.upgrades),
    };
  }

  restoreCarry(carry: PlayerCarry): void {
    if (!validatePlayerCarry(carry) || this.state.weapon !== 'weapon_01' && carry.ammo !== 0) throw new Error('Invalid player checkpoint');
    const ticks = (seconds: number) => Math.ceil(seconds / RULES.fixedStep - EPSILON);
    const player = this.state.player;
    player.health = carry.health; player.ammo = carry.ammo; player.barrier = carry.barrier;
    this.state.upgrades = structuredClone(carry.upgrades);
    this.state.effectiveRange = effectiveRange(this.state.upgrades, this.state.weapon);
    this.attack = null; this.reloadTicks = 0; this.dashTicks = 0;
    this.nextAttackTick = this.tick + ticks(carry.attackCooldown);
    this.lastAttackEnd = this.nextAttackTick; this.nextCombo = 0;
    this.dashReadyTick = this.tick + ticks(carry.dashCooldown);
    this.hurtUntil = this.tick + ticks(carry.hurtRemaining);
    player.attackPhase = 'ready'; player.attackProgress = 0; player.combo = 0;
    player.reloadRemaining = 0; player.reloadProgress = 0; player.dashRemaining = 0;
    player.dashCooldown = carry.dashCooldown; player.hurtRemaining = carry.hurtRemaining;
    player.invulnerable = carry.hurtRemaining > 0; player.hitFlash = 0;
    this.previousPosition = { ...player.position };
    this.clearBufferedActions();
  }

  addUpgrade(id: UpgradeId): void {
    if (!isUpgradeId(id)) throw new Error('Unknown upgrade');
    if (owns(this.state.upgrades, id)) return;
    this.state.upgrades.owned.push(id);
    this.state.effectiveRange = effectiveRange(this.state.upgrades, this.state.weapon);
  }

  step(actions: Actions): HitEvent[] {
    const events: HitEvent[] = [];
    if (this.state.outcome !== 'playing') return events;
    const { player, dummy } = this.state;
    const upgrades = this.state.upgrades;
    this.healthLostThisTick = false; this.barrierRefreshedThisTick = false; this.streetTriggeredThisTick = false;
    this.state.effectiveRange = effectiveRange(upgrades, this.state.weapon);
    const move = clampMovement(actions.move);
    const bufferTicks = Math.round(RULES.inputBuffer / RULES.fixedStep);
    this.state.tracers = this.state.tracers.map(tracer => ({ ...tracer, remaining: tracer.remaining - RULES.fixedStep })).filter(tracer => tracer.remaining > 0);
    if (actions.attackPressed) this.attackBuffer = this.tick + bufferTicks;
    if (actions.dashPressed) this.dashBuffer = this.tick + bufferTicks;
    if (actions.reloadPressed && this.state.weapon === 'weapon_01' && player.ammo < RIFLE_RULES.magazine) this.reloadRequested = true;
    if (actions.aim && Math.hypot(actions.aim.x, actions.aim.z) > EPSILON && (this.attackPhase() !== 'active' || this.state.weapon === 'weapon_01')) player.facing = unit(actions.aim);

    if (this.dashBuffer >= this.tick && this.tick >= this.dashReadyTick && this.dashTicks === 0 && this.attackPhase() !== 'active') {
      this.dashTicks = Math.round(RULES.dashDuration / RULES.fixedStep);
      this.dashReadyTick = this.tick + Math.round(RULES.dashCooldown / RULES.fixedStep);
      this.dashDirection = Math.hypot(move.x, move.z) > EPSILON ? unit(move) : { ...player.facing };
      this.dashBuffer = -1;
      // Keep the interrupted attack's scheduled end, so a cancel cannot raise DPS.
      if (this.attack) { this.lastAttackEnd = this.nextAttackTick; this.attack = null; this.nextCombo = 0; }
      this.reloadTicks = 0; this.reloadRequested = false;
    }
    if (!this.attack && !this.dashTicks && !this.reloadTicks && this.tick >= this.nextAttackTick && this.state.weapon === 'weapon_01' && (this.reloadRequested || player.ammo === 0)) {
      this.reloadTicks = RIFLE_RULES.reloadTicks;
      this.reloadRequested = false;
    }
    if (!this.attack && !this.dashTicks && !this.reloadTicks && this.tick >= this.nextAttackTick && (actions.attackHeld || this.attackBuffer >= this.tick)) {
      if (this.tick - this.lastAttackEnd >= Math.round(RULES.comboReset / RULES.fixedStep)) this.nextCombo = 0;
      const strike = this.strike(this.nextCombo);
      this.attack = { strike: this.nextCombo, age: 0, hitIds: new Set(), fired: false, facing: { ...player.facing }, facingLocked: false, impactCredited: false };
      this.nextAttackTick = this.tick + strike.startup + strike.active + strike.recovery;
      this.attackBuffer = -1;
    }

    player.attackPhase = this.attackPhase();
    player.attackProgress = 0;
    if (this.attack) {
      const strike = this.strike(this.attack.strike);
      player.combo = this.attack.strike;
      const age = this.attack.age;
      if (age < strike.startup) player.attackProgress = age / strike.startup;
      else if (age < strike.startup + strike.active) {
        player.attackProgress = (age - strike.startup) / strike.active;
        // Latch on the first active sample, including fractional glove boundaries.
        if (!this.attack.facingLocked) { this.attack.facing = { ...player.facing }; this.attack.facingLocked = true; }
        player.facing = { ...this.attack.facing };
      } else player.attackProgress = (age - strike.startup - strike.active) / strike.recovery;
    }
    const dashing = this.dashTicks > 0;
    player.invulnerable = (dashing && this.dashTicks > Math.round((RULES.dashDuration - RULES.dashInvulnerability) / RULES.fixedStep)) || this.tick < this.hurtUntil;
    const velocity = dashing ? this.dashDirection : move;
    const speed = dashing ? (owns(upgrades, 'SRC_KOPERNIK_03') ? 3.6 : RULES.dashDistance) / RULES.dashDuration
      : RULES.moveSpeed * (this.attack ? attackMoveFactor(upgrades, this.state.weapon) : this.reloadTicks ? RIFLE_RULES.reloadMoveFactor : 1)
        * (upgrades.streetRemaining > 0 ? 1.15 : 1);
    const bodies = this.state.sessionMode === 'dummy' ? (dummy.health > 0 ? [dummy] : []) : this.state.enemies.filter(enemy => enemy.health > 0);
    const beforeMove = player.position;
    player.position = moveWithCollision(player.position, { x: velocity.x * speed * RULES.fixedStep, z: velocity.z * speed * RULES.fixedStep }, player.radius, this.room, dashing ? undefined : bodies);
    if (owns(upgrades, 'SRC_FATHERLAND_01')) {
      const displaced = Math.hypot(player.position.x - beforeMove.x, player.position.z - beforeMove.z) > EPSILON
        || this.previousPosition !== null && Math.hypot(beforeMove.x - this.previousPosition.x, beforeMove.z - this.previousPosition.z) > EPSILON;
      upgrades.stationaryTime = dashing || displaced ? 0 : Math.min(0.5, upgrades.stationaryTime + RULES.fixedStep);
    }
    this.previousPosition = { ...player.position };

    if (this.attack && player.attackPhase === 'active') this.resolveAttack(events);
    if (this.attack) {
      this.attack.age++;
      if (this.tick + 1 >= this.nextAttackTick) {
        this.nextCombo = this.state.weapon === 'weapon_02' ? (this.attack.strike + 1) % RULES.strikes.length : 0;
        this.lastAttackEnd = this.tick + 1;
        this.attack = null;
      }
    }
    if (this.reloadTicks) {
      this.reloadTicks--;
      if (this.reloadTicks === 0) player.ammo = RIFLE_RULES.magazine;
    }
    player.reloadRemaining = this.reloadTicks * RULES.fixedStep;
    player.reloadProgress = player.attackPhase === 'reload' ? 1 - this.reloadTicks / RIFLE_RULES.reloadTicks : 0;
    if (this.state.sessionMode === 'encounter') {
      this.updateEnemies(events);
      if (player.health <= 0) this.finish('defeat');
      else if (this.state.enemies.every(enemy => enemy.health <= 0)) this.finish('complete');
    }
    if (this.dashTicks) {
      this.dashTicks--;
      if (this.dashTicks === 0 && owns(upgrades, 'SRC_STREETS_03') && upgrades.streetCooldown === 0) {
        upgrades.streetRemaining = 2; upgrades.streetCooldown = 3;
        this.streetTriggeredThisTick = true;
      }
    }
    this.advanceUpgradeTimers();
    this.tick++;
    this.state.time = this.tick * RULES.fixedStep;
    player.dashRemaining = this.dashTicks * RULES.fixedStep;
    player.dashCooldown = Math.max(0, (this.dashReadyTick - this.tick) * RULES.fixedStep);
    player.hurtRemaining = Math.max(0, (this.hurtUntil - this.tick) * RULES.fixedStep);
    player.hitFlash = Math.max(0, player.hitFlash - RULES.fixedStep);
    dummy.hitFlash = Math.max(0, dummy.hitFlash - RULES.fixedStep);
    return events;
  }

  private advanceUpgradeTimers(): void {
    const runtime = this.state.upgrades;
    const reduce = (remaining: number) => remaining <= RULES.fixedStep + EPSILON ? 0 : remaining - RULES.fixedStep;
    if (owns(runtime, 'SRC_GOD_03') && !this.healthLostThisTick) runtime.noHealthLossTime = Math.min(4, runtime.noHealthLossTime + RULES.fixedStep);
    if (!this.streetTriggeredThisTick) {
      runtime.streetRemaining = reduce(runtime.streetRemaining);
      runtime.streetCooldown = reduce(runtime.streetCooldown);
    }
    if (!this.barrierRefreshedThisTick) runtime.barrierRemaining = reduce(runtime.barrierRemaining);
    if (runtime.barrierRemaining === 0) this.state.player.barrier = 0;
  }

  private strike(index: number) {
    if (this.state.weapon === 'weapon_02') return { ...RULES.strikes[index], stagger: [4, 4, 6, 8][index], knockback: index === 3 ? 0.35 : 0 };
    return WEAPONS[this.state.weapon];
  }

  private targets(): Target[] {
    if (this.state.sessionMode === 'dummy') return this.state.dummy.health > 0 ? [{ ...this.state.dummy, id: 'dummy' }] : [];
    return this.state.enemies.filter(enemy => enemy.health > 0);
  }

  private resolveAttack(events: HitEvent[]): void {
    const attack = this.attack!;
    const { player, weapon: weaponId } = this.state;
    const weapon = WEAPONS[weaponId];
    const range = this.state.effectiveRange;
    const candidates = this.targets();
    if (weaponId === 'weapon_01') {
      if (attack.fired) return;
      attack.fired = true;
      player.ammo--;
      const coverDistance = rayCoverDistance(player.position, attack.facing, range + 1, this.room);
      let distance = Math.min(range, coverDistance);
      let hit: Target | undefined;
      for (const target of candidates.sort((a, b) => a.id.localeCompare(b.id))) {
        const entry = rayTargetDistance(player.position, attack.facing, target);
        // Range includes its endpoint. Solid cover wins an exact intersection tie.
        if (entry <= range + EPSILON && entry < coverDistance - EPSILON && (entry < distance - EPSILON || !hit && entry <= distance + EPSILON)) { distance = entry; hit = target; }
      }
      this.state.tracers.push({ id: ++this.tracerId, from: { ...player.position }, to: { x: player.position.x + attack.facing.x * distance, z: player.position.z + attack.facing.z * distance }, remaining: RIFLE_RULES.tracerSeconds });
      if (hit) this.damageTargets([hit], events);
      return;
    }
    if (weaponId === 'weapon_02' && attack.hitIds.size) return;
    const eligible = candidates.filter(target => !attack.hitIds.has(target.id) && meleeEligible(player.position, attack.facing, target, range, weapon.halfAngle, this.room));
    eligible.sort((a, b) => Math.hypot(a.position.x - player.position.x, a.position.z - player.position.z) - Math.hypot(b.position.x - player.position.x, b.position.z - player.position.z) || a.id.localeCompare(b.id));
    this.damageTargets(weaponId === 'weapon_02' ? eligible.slice(0, 1) : eligible, events);
  }

  /** Snapshot canonical credit on the first positive-damage tick, then settle it once. */
  private damageTargets(targets: Target[], events: HitEvent[]): void {
    const attack = this.attack!;
    const snapshots = targets.map(target => ({ target, health: target.health }));
    let primaryHealth: number | undefined;
    for (const snapshot of snapshots) {
      const damage = this.damageTarget(snapshot.target, events);
      if (damage > 0 && primaryHealth === undefined) primaryHealth = snapshot.health;
    }
    if (primaryHealth === undefined || attack.impactCredited) return;
    attack.impactCredited = true;
    const runtime = this.state.upgrades;
    if (!owns(runtime, 'SRC_SKLODOWSKA_02')) return;
    const credit = Math.min(this.strike(attack.strike).damage, primaryHealth) / 100;
    const total = runtime.impact + credit;
    const pulses = Math.floor(total + EPSILON);
    runtime.impact = Math.max(0, total - pulses);
    if (pulses) {
      this.state.player.barrier = Math.min(10, this.state.player.barrier + 2 * pulses);
      runtime.barrierRemaining = 4;
      this.barrierRefreshedThisTick = true;
    }
  }

  private damageTarget(target: Target, events: HitEvent[]): number {
    const attack = this.attack!;
    const strike = this.strike(attack.strike);
    const liveTarget = target.id === 'dummy' ? this.state.dummy : this.state.enemies.find(enemy => enemy.id === target.id)!;
    const damage = Math.min(liveTarget.health, strike.damage * primaryDamageFactor(this.state.upgrades));
    if (damage <= 0) return 0;
    liveTarget.health = Math.max(0, liveTarget.health - damage);
    liveTarget.hitFlash = 0.18;
    this.state.damageTotal += damage; this.state.hits++; this.state.lastDamage = damage;
    attack.hitIds.add(target.id);
    events.push({ kind: 'hit', position: { ...liveTarget.position }, damage, id: ++this.hitId, targetId: target.id, source: 'player', weapon: this.state.weapon });
    // The stationary benchmark dummy intentionally has no poise or displacement.
    if (target.id === 'dummy') return damage;
    const enemy = liveTarget as EnemyState;
    const brain = this.brains.get(enemy.id)!;
    if (enemy.health <= 0) { enemy.phase = 'defeated'; enemy.attackProgress = 0; enemy.staggerRemaining = 0; brain.pendingStagger = false; return damage; }
    if (this.tick >= brain.immunityUntil && brain.staggerTicks === 0 && !brain.pendingStagger) {
      enemy.poise = Math.max(0, enemy.poise - strike.stagger); brain.lastStagger = this.tick;
      if (enemy.poise === 0) {
        // Preserve an already opened enemy active window; interrupt preparation immediately.
        if (enemy.phase === 'active') brain.pendingStagger = true;
        else this.beginStagger(enemy, brain);
      }
    }
    if (strike.knockback > 0) {
      const direction = unit({ x: enemy.position.x - this.state.player.position.x, z: enemy.position.z - this.state.player.position.z });
      enemy.position = moveWithCollision(enemy.position, { x: direction.x * strike.knockback, z: direction.z * strike.knockback }, enemy.radius, this.room, this.state.enemies.filter(other => other !== enemy && other.health > 0));
    }
    return damage;
  }

  private beginStagger(enemy: EnemyState, brain: EnemyBrain): void {
    enemy.phase = 'staggered'; enemy.attackProgress = 0; brain.phaseAge = 0;
    brain.staggerTicks = BOXER_RULES.staggerTicks; brain.pendingStagger = false;
    enemy.staggerRemaining = brain.staggerTicks * RULES.fixedStep;
  }

  private updateEnemies(events: HitEvent[]): void {
    const { player, enemies } = this.state;
    let preparing = enemies.filter(enemy => enemy.health > 0 && (enemy.phase === 'preparation' || enemy.phase === 'active')).length;
    for (const enemy of enemies) {
      const brain = this.brains.get(enemy.id)!;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - RULES.fixedStep);
      if (enemy.health <= 0) { enemy.phase = 'defeated'; continue; }
      enemy.staggerImmunity = Math.max(0, (brain.immunityUntil - this.tick) * RULES.fixedStep);
      if (this.tick - brain.lastStagger >= BOXER_RULES.poiseResetTicks && !brain.staggerTicks && !brain.pendingStagger) enemy.poise = BOXER_RULES.poise;
      // Resolve phase transitions before this sample. Rendered phases therefore
      // describe the sample that actually dealt damage, never the next sample.
      if (enemy.phase === 'preparation' && brain.phaseAge >= BOXER_RULES.preparationTicks) { enemy.phase = 'active'; brain.phaseAge = 0; }
      else if (enemy.phase === 'active' && brain.phaseAge >= BOXER_RULES.activeTicks) {
        preparing--;
        if (brain.pendingStagger) this.beginStagger(enemy, brain);
        else { enemy.phase = 'recovery'; brain.phaseAge = 0; }
      } else if (enemy.phase === 'recovery' && brain.phaseAge >= BOXER_RULES.recoveryTicks) { enemy.phase = 'approach'; brain.phaseAge = 0; }
      if (brain.staggerTicks) {
        brain.staggerTicks--;
        enemy.staggerRemaining = brain.staggerTicks * RULES.fixedStep;
        if (!brain.staggerTicks) { enemy.phase = 'approach'; enemy.poise = BOXER_RULES.poise; brain.immunityUntil = this.tick + 1 + BOXER_RULES.staggerImmunityTicks; }
        continue;
      }
      if (enemy.phase === 'approach') {
        enemy.attackProgress = 0;
        const distance = Math.hypot(enemy.position.x - player.position.x, enemy.position.z - player.position.z);
        const canPrepare = distance <= BOXER_RULES.range + player.radius && !lineBlocked(enemy.position, player.position, this.room) && this.tick >= BOXER_RULES.spawnGraceTicks && preparing < BOXER_RULES.maximumPreparing && (this.visibleEnemies === null || this.visibleEnemies.has(enemy.id));
        if (canPrepare) {
          enemy.facing = unit({ x: player.position.x - enemy.position.x, z: player.position.z - enemy.position.z });
          enemy.phase = 'preparation'; brain.phaseAge = 0; brain.hit = false; preparing++;
        } else {
          const direction = approachDirection(enemy.position, player.position, enemy.radius, this.room);
          enemy.facing = direction.x || direction.z ? direction : enemy.facing;
          const bodies = [...enemies.filter(other => other !== enemy && other.health > 0), player];
          enemy.position = moveWithCollision(enemy.position, { x: direction.x * BOXER_RULES.speed * RULES.fixedStep, z: direction.z * BOXER_RULES.speed * RULES.fixedStep }, enemy.radius, this.room, bodies);
          continue;
        }
      }
      if (enemy.phase === 'preparation') {
        enemy.attackProgress = brain.phaseAge / BOXER_RULES.preparationTicks;
        brain.phaseAge++;
      } else if (enemy.phase === 'active') {
        enemy.attackProgress = brain.phaseAge / BOXER_RULES.activeTicks;
        if (!brain.hit && player.health > 0 && meleeEligible(enemy.position, enemy.facing, player, BOXER_RULES.range, BOXER_RULES.halfAngle, this.room)) {
          brain.hit = true;
          if (!player.invulnerable) {
            const reduced = BOXER_RULES.damage * incomingDamageFactor(this.state.upgrades);
            const absorbed = Math.min(player.barrier, reduced);
            player.barrier -= absorbed;
            const damage = Math.min(player.health, reduced - absorbed);
            player.health -= damage; player.hitFlash = 0.2; this.hurtUntil = this.tick + PLAYER_RULES.postHitTicks; player.invulnerable = true;
            if (damage > 0) { this.state.upgrades.noHealthLossTime = 0; this.healthLostThisTick = true; }
            events.push({ kind: 'hit', position: { ...player.position }, damage, id: ++this.hitId, targetId: 'player', source: 'enemy' });
          }
        }
        brain.phaseAge++;
      } else if (enemy.phase === 'recovery') {
        enemy.attackProgress = brain.phaseAge / BOXER_RULES.recoveryTicks;
        brain.phaseAge++;
      }
    }
  }

  private finish(outcome: 'complete' | 'defeat'): void {
    this.state.outcome = outcome; this.attack = null; this.reloadTicks = 0; this.dashTicks = 0;
    this.clearBufferedActions(); this.state.player.attackPhase = 'ready'; this.state.player.reloadRemaining = 0; this.state.player.reloadProgress = 0;
    for (const enemy of this.state.enemies) if (enemy.health > 0) { enemy.phase = 'recovery'; enemy.attackProgress = 0; }
  }

  private attackPhase(): GameState['player']['attackPhase'] {
    if (this.reloadTicks) return 'reload';
    if (!this.attack) return 'ready';
    const strike = this.strike(this.attack.strike);
    if (this.attack.age < strike.startup) return 'startup';
    if (this.attack.age < strike.startup + strike.active) return 'active';
    return 'recovery';
  }
}
