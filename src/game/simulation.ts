import { BOXER_RULES, CLINCHER_RULES, COACH_RULES, COUNTER_RULES, PLAYER_RULES, RIFLE_RULES, ROOM, RULES, WEAPONS } from './config';
import type { Actions, EnemyDefinition, EnemyState, GameState, HitEvent, Room, SessionMode, SimulationSoundEvent, Vec2, WeaponId } from './types';
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

interface EnemyBrain {
  phaseAge: number; hit: boolean; staggerTicks: number; immunityUntil: number;
  lastStagger: number; pendingStagger: boolean; cycleIndex: number; jabIndex: number;
  pendingTransition: boolean; transitionDone: boolean; chargeDistance: number; chargeBlocked: boolean;
}
interface Attack { strike: number; age: number; hitIds: Set<string>; fired: boolean; facing: Vec2; facingLocked: boolean; impactCredited: boolean; soundStarted: boolean; missSettled: boolean }
interface Target { id: string; position: Vec2; radius: number; health: number; hitFlash: number }

function enemyRules(archetype: EnemyState['archetype']) {
  return archetype === 'B01_E02' ? COUNTER_RULES : archetype === 'B01_E03' ? CLINCHER_RULES : archetype === 'B01_M01' ? COACH_RULES : BOXER_RULES;
}

/** A charge never slides around a wall or changes its latched direction. */
function moveStraight(position: Vec2, delta: Vec2, radius: number, room: Room, bodies: EnemyState[]) {
  let current = { ...position };
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / (radius * 0.45)));
  for (let index = 0; index < steps; index++) {
    const next = { x: current.x + delta.x / steps, z: current.z + delta.z / steps };
    if (Math.abs(next.x) > room.halfWidth - radius + EPSILON || Math.abs(next.z) > room.halfDepth - radius + EPSILON
      || room.obstacles.some(box => circleBox(next, radius, box))
      || bodies.some(body => Math.hypot(next.x - body.position.x, next.z - body.position.z) < radius + body.radius - EPSILON)) return { position: current, blocked: true };
    current = next;
  }
  return { position: current, blocked: false };
}

function segmentDistance(point: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x, dz = b.z - a.z;
  const length2 = dx * dx + dz * dz;
  const t = length2 <= EPSILON ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / length2));
  return Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t);
}

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
  private readonly room: Room;
  private traversal = false;
  private soundEvents: SimulationSoundEvent[] = [];
  private soundId = 0;
  private footstepDistance = 0;

  constructor(room: Room = ROOM, options: { weapon?: WeaponId; mode?: SessionMode; enemySpawns?: readonly Vec2[]; enemyDefinitions?: readonly EnemyDefinition[]; room?: Room } = {}) {
    this.room = options.room ?? room;
    const weapon = options.weapon ?? 'weapon_02';
    const mode = options.mode ?? 'dummy';
    const definitions: readonly EnemyDefinition[] = options.enemyDefinitions ?? (options.enemySpawns ?? BOXER_RULES.spawns).map(position => ({ archetype: 'B01_E01', position }));
    const ids = new Set<string>();
    const enemies: EnemyState[] = mode === 'encounter' ? definitions.map((definition, index) => {
      const rules = enemyRules(definition.archetype);
      const id = definition.id ?? `${definition.archetype === 'B01_E01' ? 'jabber' : definition.archetype.toLowerCase()}-${index + 1}`;
      if (ids.has(id)) throw new Error('Duplicate enemy ID');
      ids.add(id);
      return { id, archetype: definition.archetype, position: { ...definition.position }, facing: { x: 0, z: -1 }, radius: rules.radius, health: rules.health, maxHealth: rules.health,
        phase: 'approach', attackKind: null, attackShape: null, guardActive: false, guardHalfAngle: COUNTER_RULES.guardHalfAngle,
        bossPhase: definition.archetype === 'B01_M01' ? 1 : null, phaseTransitionRemaining: 0,
        attackProgress: 0, hitFlash: 0, poise: definition.archetype === 'B01_M01' ? COACH_RULES.poise : BOXER_RULES.poise, staggerRemaining: 0, staggerImmunity: 0 };
    }) : [];
    this.state = {
      room: this.room, time: 0, weapon, sessionMode: mode, outcome: 'playing',
      upgrades: createUpgradeRuntime(), effectiveRange: WEAPONS[weapon].range,
      player: { position: { ...this.room.playerSpawn ?? { x: 0, z: -2.5 } }, facing: { x: 0, z: 1 }, radius: RULES.radius, dashRemaining: 0, dashCooldown: 0, invulnerable: false, attackPhase: 'ready', attackProgress: 0, combo: 0, health: PLAYER_RULES.health, maxHealth: PLAYER_RULES.health, barrier: 0, hitFlash: 0, hurtRemaining: 0, ammo: weapon === 'weapon_01' ? RIFLE_RULES.magazine : 0, maxAmmo: weapon === 'weapon_01' ? RIFLE_RULES.magazine : 0, reloadRemaining: 0, reloadProgress: 0 },
      dummy: { position: { x: 0, z: 1 }, radius: 0.45, health: 1000, maxHealth: 1000, hitFlash: 0 },
      enemies,
      tracers: [], damageTotal: 0, hits: 0, lastDamage: 0,
    };
    for (const enemy of this.state.enemies) this.brains.set(enemy.id, { phaseAge: 0, hit: false, staggerTicks: 0, immunityUntil: 0, lastStagger: -999, pendingStagger: false, cycleIndex: 0, jabIndex: 0, pendingTransition: false, transitionDone: false, chargeDistance: 0, chargeBlocked: false });
  }

  /** The static camera fits the full room; alternate cameras can explicitly gate AI initiation. */
  setVisibleEnemyIds(ids: readonly string[] | null): void { this.visibleEnemies = ids === null ? null : new Set(ids); }

  /** Browser safety transitions discard queued actions, without fast-forwarding paused attacks. */
  clearBufferedActions(): void { this.attackBuffer = -1; this.dashBuffer = -1; this.reloadRequested = false; this.soundEvents = []; }

  drainSoundEvents(): SimulationSoundEvent[] { const events = this.soundEvents; this.soundEvents = []; return events; }

  private sound(kind: SimulationSoundEvent['kind'], detail: Pick<SimulationSoundEvent, 'weapon' | 'archetype'> = {}): void {
    this.soundEvents.push({ id: ++this.soundId, kind, ...detail });
    if (this.soundEvents.length > 128) this.soundEvents.shift();
  }

  /** Cleared rooms keep their completed outcome while allowing only safe traversal. */
  stepTraversal(actions: Actions): HitEvent[] {
    if (this.state.outcome !== 'complete') return [];
    this.traversal = true;
    try { return this.step({ ...actions, attackHeld: false, attackPressed: false, reloadPressed: false }); }
    finally { this.traversal = false; this.state.outcome = 'complete'; }
  }

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
    if (this.state.outcome !== 'playing' && !this.traversal) return events;
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
      this.sound('dash');
    }
    if (!this.traversal && !this.attack && !this.dashTicks && !this.reloadTicks && this.tick >= this.nextAttackTick && this.state.weapon === 'weapon_01' && (this.reloadRequested || player.ammo === 0)) {
      this.reloadTicks = RIFLE_RULES.reloadTicks;
      this.reloadRequested = false;
      this.sound('reload-start', { weapon: this.state.weapon });
    }
    if (!this.traversal && !this.attack && !this.dashTicks && !this.reloadTicks && this.tick >= this.nextAttackTick && (actions.attackHeld || this.attackBuffer >= this.tick)) {
      if (this.tick - this.lastAttackEnd >= Math.round(RULES.comboReset / RULES.fixedStep)) this.nextCombo = 0;
      const strike = this.strike(this.nextCombo);
      this.attack = { strike: this.nextCombo, age: 0, hitIds: new Set(), fired: false, facing: { ...player.facing }, facingLocked: false, impactCredited: false, soundStarted: false, missSettled: false };
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
    if (!dashing) {
      this.footstepDistance += Math.hypot(player.position.x - beforeMove.x, player.position.z - beforeMove.z);
      if (this.footstepDistance >= 0.9) { this.footstepDistance %= 0.9; this.sound('step'); }
    }
    if (owns(upgrades, 'SRC_FATHERLAND_01')) {
      const displaced = Math.hypot(player.position.x - beforeMove.x, player.position.z - beforeMove.z) > EPSILON
        || this.previousPosition !== null && Math.hypot(beforeMove.x - this.previousPosition.x, beforeMove.z - this.previousPosition.z) > EPSILON;
      upgrades.stationaryTime = dashing || displaced ? 0 : Math.min(0.5, upgrades.stationaryTime + RULES.fixedStep);
    }
    this.previousPosition = { ...player.position };

    if (this.attack && player.attackPhase === 'active') this.resolveAttack(events);
    if (this.attack) {
      this.attack.age++;
      const strike = this.strike(this.attack.strike);
      if (this.attack.soundStarted && !this.attack.missSettled && this.attack.age >= strike.startup + strike.active) {
        this.attack.missSettled = true;
        if (!this.attack.hitIds.size) this.sound('miss', { weapon: this.state.weapon });
      }
      if (this.tick + 1 >= this.nextAttackTick) {
        this.nextCombo = this.state.weapon === 'weapon_02' ? (this.attack.strike + 1) % RULES.strikes.length : 0;
        this.lastAttackEnd = this.tick + 1;
        this.attack = null;
      }
    }
    if (this.reloadTicks) {
      this.reloadTicks--;
      if (this.reloadTicks === 0) { player.ammo = RIFLE_RULES.magazine; this.sound('reload-end', { weapon: this.state.weapon }); }
    }
    player.reloadRemaining = this.reloadTicks * RULES.fixedStep;
    player.reloadProgress = player.attackPhase === 'reload' ? 1 - this.reloadTicks / RIFLE_RULES.reloadTicks : 0;
    if (this.state.sessionMode === 'encounter' && !this.traversal) {
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
    if (!attack.soundStarted) { attack.soundStarted = true; this.sound('attack', { weapon: this.state.weapon }); }
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
    const guarded = target.id !== 'dummy' && (liveTarget as EnemyState).guardActive
      && meleeEligible(liveTarget.position, (liveTarget as EnemyState).facing, this.state.player, Infinity, (liveTarget as EnemyState).guardHalfAngle, this.room);
    const damage = Math.min(liveTarget.health, strike.damage * primaryDamageFactor(this.state.upgrades) * (guarded ? 1 - COUNTER_RULES.guardReduction : 1));
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
    if (enemy.health <= 0) { enemy.phase = 'defeated'; enemy.attackProgress = 0; enemy.staggerRemaining = 0; enemy.guardActive = false; enemy.attackShape = null; enemy.attackKind = null; enemy.phaseTransitionRemaining = 0; brain.pendingStagger = false; return damage; }
    if (this.tick >= brain.immunityUntil && brain.staggerTicks === 0 && !brain.pendingStagger) {
      enemy.poise = Math.max(0, enemy.poise - strike.stagger * (enemy.archetype === 'B01_M01' ? COACH_RULES.staggerFactor : 1)); brain.lastStagger = this.tick;
      if (enemy.poise === 0) {
        // Preserve an already opened enemy active window; interrupt preparation immediately.
        if (enemy.phase === 'active' || enemy.archetype === 'B01_M01' && enemy.phase !== 'recovery') brain.pendingStagger = true;
        else this.beginStagger(enemy, brain);
      }
    }
    if (strike.knockback > 0 && enemy.archetype !== 'B01_M01') {
      const direction = unit({ x: enemy.position.x - this.state.player.position.x, z: enemy.position.z - this.state.player.position.z });
      enemy.position = moveWithCollision(enemy.position, { x: direction.x * strike.knockback, z: direction.z * strike.knockback }, enemy.radius, this.room, this.state.enemies.filter(other => other !== enemy && other.health > 0));
    }
    return damage;
  }

  private beginStagger(enemy: EnemyState, brain: EnemyBrain): void {
    enemy.phase = 'staggered'; enemy.attackProgress = 0; enemy.guardActive = false; brain.phaseAge = 0;
    brain.staggerTicks = enemy.archetype === 'B01_M01' ? COACH_RULES.staggerTicks : BOXER_RULES.staggerTicks; brain.pendingStagger = false;
    enemy.staggerRemaining = brain.staggerTicks * RULES.fixedStep;
  }

  private enemyTiming(enemy: EnemyState) {
    if (enemy.archetype === 'B01_E01') return { preparation: BOXER_RULES.preparationTicks, active: BOXER_RULES.activeTicks, recovery: BOXER_RULES.recoveryTicks, damage: BOXER_RULES.damage };
    if (enemy.archetype === 'B01_E02') return { preparation: COUNTER_RULES.preparationTicks, active: COUNTER_RULES.activeTicks, recovery: COUNTER_RULES.recoveryTicks, damage: COUNTER_RULES.damage };
    if (enemy.archetype === 'B01_E03') return { preparation: CLINCHER_RULES.preparationTicks, active: CLINCHER_RULES.activeTicks, recovery: CLINCHER_RULES.recoveryTicks, damage: CLINCHER_RULES.damage };
    return { preparation: enemy.attackKind === 'slam' ? COACH_RULES.slamPreparationTicks : COACH_RULES.preparationTicks, active: COACH_RULES.activeTicks,
      recovery: enemy.attackKind === 'double-jab' ? COACH_RULES.jabRecoveryTicks : COACH_RULES.heavyRecoveryTicks,
      damage: enemy.attackKind === 'sweep' ? COACH_RULES.sweepDamage : enemy.attackKind === 'slam' ? COACH_RULES.slamDamage : COACH_RULES.jabDamage };
  }

  private nextEnemyAttack(enemy: EnemyState, brain: EnemyBrain): NonNullable<EnemyState['attackKind']> {
    if (enemy.archetype === 'B01_E01') return 'jab';
    if (enemy.archetype === 'B01_E02') return 'counter';
    if (enemy.archetype === 'B01_E03') return 'charge';
    return enemy.bossPhase === 2 ? (['double-jab', 'slam', 'sweep'] as const)[brain.cycleIndex % 3] : (['double-jab', 'sweep'] as const)[brain.cycleIndex % 2];
  }

  private enemyAttackRange(kind: NonNullable<EnemyState['attackKind']>): number {
    return kind === 'charge' ? CLINCHER_RULES.range : kind === 'counter' ? COUNTER_RULES.range
      : kind === 'double-jab' ? COACH_RULES.jabRange : kind === 'sweep' ? COACH_RULES.sweepRange : kind === 'slam' ? COACH_RULES.slamRange : BOXER_RULES.range;
  }

  private prepareEnemy(enemy: EnemyState, brain: EnemyBrain, kind: NonNullable<EnemyState['attackKind']>): void {
    enemy.facing = unit({ x: this.state.player.position.x - enemy.position.x, z: this.state.player.position.z - enemy.position.z });
    enemy.phase = 'preparation'; enemy.attackKind = kind; enemy.guardActive = false;
    brain.phaseAge = 0; brain.hit = false; brain.chargeDistance = 0; brain.chargeBlocked = false;
    const range = this.enemyAttackRange(kind);
    enemy.attackShape = kind === 'charge' ? { kind: 'lane', range, halfAngle: 0, width: CLINCHER_RULES.laneWidth, center: { ...enemy.position } }
      : kind === 'slam' ? { kind: 'circle', range, halfAngle: Math.PI, center: { ...enemy.position } }
      : { kind: 'cone', range, halfAngle: kind === 'sweep' ? COACH_RULES.sweepHalfAngle : kind === 'double-jab' ? COACH_RULES.jabHalfAngle : BOXER_RULES.halfAngle };
    this.sound('warning', { archetype: enemy.archetype });
  }

  private beginBossTransition(enemy: EnemyState, brain: EnemyBrain): void {
    enemy.phase = 'transition'; enemy.bossPhase = 2; enemy.attackKind = null; enemy.attackShape = null; enemy.attackProgress = 0;
    enemy.guardActive = false; enemy.phaseTransitionRemaining = COACH_RULES.transitionTicks * RULES.fixedStep;
    brain.phaseAge = 0; brain.pendingTransition = false; brain.transitionDone = true; brain.cycleIndex = 0; brain.jabIndex = 0;
    if (brain.staggerTicks) {
      // A completed phase transition must not leave invisible stagger time in approach.
      brain.staggerTicks = 0; enemy.staggerRemaining = 0; enemy.poise = COACH_RULES.poise;
      brain.immunityUntil = Math.max(brain.immunityUntil, this.tick + COACH_RULES.staggerImmunityTicks);
    }
    this.sound('phase-change', { archetype: enemy.archetype });
  }

  private recoverEnemy(enemy: EnemyState, brain: EnemyBrain): void {
    enemy.phase = 'recovery'; brain.phaseAge = 0; enemy.guardActive = false;
    if (enemy.archetype === 'B01_M01') { brain.cycleIndex++; brain.jabIndex = 0; }
    if (brain.pendingStagger) this.beginStagger(enemy, brain);
  }

  private damagePlayer(baseDamage: number, events: HitEvent[]): void {
    const player = this.state.player;
    if (player.invulnerable || player.health <= 0) return;
    const reduced = baseDamage * incomingDamageFactor(this.state.upgrades);
    const absorbed = Math.min(player.barrier, reduced);
    player.barrier -= absorbed;
    const damage = Math.min(player.health, reduced - absorbed);
    player.health -= damage; player.hitFlash = 0.2; this.hurtUntil = this.tick + PLAYER_RULES.postHitTicks; player.invulnerable = true;
    if (damage > 0) { this.state.upgrades.noHealthLossTime = 0; this.healthLostThisTick = true; }
    events.push({ kind: 'hit', position: { ...player.position }, damage, id: ++this.hitId, targetId: 'player', source: 'enemy' });
  }

  private updateEnemies(events: HitEvent[]): void {
    const { player, enemies } = this.state;
    const isOrdinary = (enemy: EnemyState) => enemy.archetype !== 'B01_M01';
    let preparing = enemies.filter(enemy => enemy.health > 0 && isOrdinary(enemy) && (enemy.phase === 'preparation' || enemy.phase === 'active')).length;
    for (const enemy of enemies) {
      const brain = this.brains.get(enemy.id)!;
      const major = !isOrdinary(enemy);
      const rules = enemyRules(enemy.archetype);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - RULES.fixedStep);
      if (enemy.health <= 0) { enemy.phase = 'defeated'; enemy.guardActive = false; enemy.attackShape = null; enemy.attackKind = null; enemy.phaseTransitionRemaining = 0; continue; }
      if (major && !brain.transitionDone && enemy.health <= enemy.maxHealth * COACH_RULES.phaseThreshold) brain.pendingTransition = true;
      enemy.staggerImmunity = Math.max(0, (brain.immunityUntil - this.tick) * RULES.fixedStep);
      if (this.tick - brain.lastStagger >= BOXER_RULES.poiseResetTicks && !brain.staggerTicks && !brain.pendingStagger) enemy.poise = major ? COACH_RULES.poise : BOXER_RULES.poise;
      if (brain.pendingTransition && enemy.phase !== 'active') this.beginBossTransition(enemy, brain);
      const timing = this.enemyTiming(enemy);
      // Phases describe the current damaging sample, preserving the Jabber's M3 boundaries.
      if (enemy.phase === 'preparation' && brain.phaseAge >= timing.preparation) { enemy.phase = 'active'; brain.phaseAge = 0; }
      else if (enemy.phase === 'active' && (brain.phaseAge >= timing.active || brain.chargeBlocked)) {
        if (!major) preparing--;
        if (brain.pendingTransition) this.beginBossTransition(enemy, brain);
        else if (major && enemy.attackKind === 'double-jab' && brain.jabIndex === 0) {
          brain.jabIndex = 1;
          // The second jab receives its own full visible preparation and fresh hit latch.
          this.prepareEnemy(enemy, brain, 'double-jab');
        } else if (brain.pendingStagger && !major) this.beginStagger(enemy, brain);
        else this.recoverEnemy(enemy, brain);
      } else if (enemy.phase === 'recovery' && brain.phaseAge >= timing.recovery) {
        enemy.phase = 'approach'; brain.phaseAge = 0; enemy.attackKind = null; enemy.attackShape = null;
      }
      if (enemy.phase === 'transition') {
        enemy.attackProgress = brain.phaseAge / COACH_RULES.transitionTicks;
        brain.phaseAge++;
        enemy.phaseTransitionRemaining = Math.max(0, (COACH_RULES.transitionTicks - brain.phaseAge) * RULES.fixedStep);
        if (brain.phaseAge >= COACH_RULES.transitionTicks) { enemy.phase = 'approach'; brain.phaseAge = 0; }
        continue;
      }
      if (brain.staggerTicks) {
        brain.staggerTicks--;
        enemy.staggerRemaining = brain.staggerTicks * RULES.fixedStep;
        if (!brain.staggerTicks) {
          enemy.phase = 'approach'; enemy.attackKind = null; enemy.attackShape = null; enemy.poise = major ? COACH_RULES.poise : BOXER_RULES.poise;
          brain.immunityUntil = this.tick + 1 + (major ? COACH_RULES.staggerImmunityTicks : BOXER_RULES.staggerImmunityTicks);
        }
        continue;
      }
      const visible = this.visibleEnemies === null || this.visibleEnemies.has(enemy.id);
      if (enemy.phase === 'approach') {
        enemy.attackProgress = 0;
        const kind = this.nextEnemyAttack(enemy, brain);
        const distance = Math.hypot(enemy.position.x - player.position.x, enemy.position.z - player.position.z);
        const canPrepare = distance <= this.enemyAttackRange(kind) + player.radius && !lineBlocked(enemy.position, player.position, this.room)
          && this.tick >= BOXER_RULES.spawnGraceTicks && (major || preparing < BOXER_RULES.maximumPreparing) && visible;
        if (canPrepare && enemy.archetype === 'B01_E02') {
          enemy.facing = unit({ x: player.position.x - enemy.position.x, z: player.position.z - enemy.position.z });
          enemy.phase = 'guard'; enemy.guardActive = true; enemy.attackKind = 'counter'; enemy.attackShape = null; brain.phaseAge = 0;
        } else if (canPrepare) { this.prepareEnemy(enemy, brain, kind); if (!major) preparing++; }
        else {
          const direction = approachDirection(enemy.position, player.position, enemy.radius, this.room);
          enemy.facing = direction.x || direction.z ? direction : enemy.facing;
          const bodies = [...enemies.filter(other => other !== enemy && other.health > 0), player];
          enemy.position = moveWithCollision(enemy.position, { x: direction.x * rules.speed * RULES.fixedStep, z: direction.z * rules.speed * RULES.fixedStep }, enemy.radius, this.room, bodies);
          continue;
        }
      }
      if (enemy.phase === 'guard') {
        enemy.attackProgress = Math.min(1, brain.phaseAge / COUNTER_RULES.guardTicks);
        if (brain.phaseAge >= COUNTER_RULES.guardTicks) {
          if (preparing < BOXER_RULES.maximumPreparing && visible && !lineBlocked(enemy.position, player.position, this.room)) {
            this.prepareEnemy(enemy, brain, 'counter'); preparing++;
          } else {
            enemy.phase = 'approach'; enemy.guardActive = false; enemy.attackKind = null; enemy.attackShape = null; brain.phaseAge = 0;
            continue;
          }
        } else { brain.phaseAge++; continue; }
      }
      const currentTiming = this.enemyTiming(enemy);
      if (enemy.phase === 'preparation') {
        enemy.attackProgress = brain.phaseAge / currentTiming.preparation; brain.phaseAge++;
      } else if (enemy.phase === 'active') {
        enemy.attackProgress = brain.phaseAge / currentTiming.active;
        let eligible = false;
        // Legacy M3 integrations can force a Jabber's active phase directly.
        // Natural attack transitions always install their authoritative shape.
        const shape = enemy.attackShape ?? { kind: 'cone' as const, range: BOXER_RULES.range, halfAngle: BOXER_RULES.halfAngle };
        if (enemy.attackKind === 'charge') {
          const before = enemy.position;
          const travel = Math.min(CLINCHER_RULES.range - brain.chargeDistance, CLINCHER_RULES.range / CLINCHER_RULES.activeTicks);
          const result = moveStraight(before, { x: enemy.facing.x * travel, z: enemy.facing.z * travel }, enemy.radius, this.room, enemies.filter(other => other !== enemy && other.health > 0));
          enemy.position = result.position; brain.chargeBlocked = result.blocked;
          brain.chargeDistance += Math.hypot(enemy.position.x - before.x, enemy.position.z - before.z);
          eligible = segmentDistance(player.position, before, enemy.position) <= CLINCHER_RULES.laneWidth / 2 + player.radius && !lineBlocked(enemy.position, player.position, this.room);
        } else if (shape.kind === 'circle') {
          const center = shape.center!;
          eligible = Math.hypot(player.position.x - center.x, player.position.z - center.z) <= shape.range + player.radius && !lineBlocked(center, player.position, this.room);
        } else eligible = meleeEligible(enemy.position, enemy.facing, player, shape.range, shape.halfAngle, this.room);
        if (!brain.hit && eligible && player.health > 0) { brain.hit = true; this.damagePlayer(currentTiming.damage, events); }
        brain.phaseAge++;
      } else if (enemy.phase === 'recovery') {
        enemy.attackProgress = brain.phaseAge / currentTiming.recovery; brain.phaseAge++;
      }
    }
  }

  private finish(outcome: 'complete' | 'defeat'): void {
    this.state.outcome = outcome; this.attack = null; this.reloadTicks = 0; this.dashTicks = 0;
    this.attackBuffer = -1; this.dashBuffer = -1; this.reloadRequested = false;
    this.state.player.attackPhase = 'ready'; this.state.player.reloadRemaining = 0; this.state.player.reloadProgress = 0;
    for (const enemy of this.state.enemies) if (enemy.health > 0) { enemy.phase = 'recovery'; enemy.attackProgress = 0; enemy.guardActive = false; enemy.attackShape = null; enemy.phaseTransitionRemaining = 0; }
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
