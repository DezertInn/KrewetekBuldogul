import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/game/simulation';
import { BOXER_RULES, CLINCHER_RULES, COACH_RULES, RULES } from '../src/game/config';
import { UPGRADE_IDS, validatePlayerCarry } from '../src/game/upgrades';
import type { Actions, EnemyArchetype, EnemyState, HitEvent, Room, WeaponId } from '../src/game/types';

const room: Room = { halfWidth: 20, halfDepth: 20, obstacles: [] };
const idle: Actions = { move: { x: 0, z: 0 }, aim: null, attackHeld: false, attackPressed: false, dashPressed: false };
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
function ticks(sim: Simulation, count: number, changes: Partial<Actions> = {}): HitEvent[] {
  return Array.from({ length: count }, () => sim.step({ ...idle, ...changes })).flat();
}
function encounter(archetype: EnemyArchetype, weapon: WeaponId = 'weapon_02', customRoom: Room = room, position = { x: 0, z: 1.3 }) {
  const sim = new Simulation(customRoom, { weapon, mode: 'encounter', enemyDefinitions: [{ id: 'subject', archetype, position }] });
  sim.state.player.position = { x: 0, z: 0 };
  return sim;
}
function until(sim: Simulation, predicate: (enemy: EnemyState) => boolean, max = 1800): HitEvent[] {
  const events: HitEvent[] = [];
  for (let index = 0; !predicate(sim.state.enemies[0]); index++) {
    assert.ok(index < max && sim.state.outcome === 'playing', 'enemy reaches the requested state without a deadlock');
    events.push(...sim.step(idle));
  }
  return events;
}
function attackFrom(sim: Simulation, angle: number) {
  const enemy = sim.state.enemies[0];
  const facing = enemy.facing;
  const direction = { x: facing.x * Math.cos(angle) - facing.z * Math.sin(angle), z: facing.x * Math.sin(angle) + facing.z * Math.cos(angle) };
  sim.state.player.position = { x: enemy.position.x + direction.x, z: enemy.position.z + direction.z };
  return ticks(sim, sim.state.weapon === 'weapon_03' ? 34 : 4, { attackPressed: true, aim: { x: -direction.x, z: -direction.z } }).filter(event => event.source === 'player');
}

test('custom room, entry and explicit archetypes coexist with unchanged legacy Jabber construction', () => {
  const custom: Room = { ...room, id: 'room-entry', theme: 'ring', playerSpawn: { x: 3, z: -4 }, exit: { x: 0, z: 5 } };
  const sim = new Simulation(undefined, { room: custom, mode: 'encounter', enemyDefinitions: [
    { id: 'jab', archetype: 'B01_E01', position: { x: -3, z: 3 } },
    { id: 'counter', archetype: 'B01_E02', position: { x: -1, z: 3 } },
    { id: 'charge', archetype: 'B01_E03', position: { x: 1, z: 3 } },
    { id: 'coach', archetype: 'B01_M01', position: { x: 3, z: 3 } },
  ] });
  assert.equal(sim.state.room, custom); assert.deepEqual(sim.state.player.position, custom.playerSpawn);
  assert.deepEqual(sim.state.enemies.map(enemy => enemy.health), [100, 140, 180, 900]);
  assert.deepEqual(sim.state.enemies.map(enemy => enemy.bossPhase), [null, null, null, 1]);
  const legacy = new Simulation(room, { mode: 'encounter', enemySpawns: [{ x: 0, z: 1 }] });
  assert.equal(legacy.state.enemies[0].id, 'jabber-1'); assert.equal(legacy.state.enemies[0].archetype, 'B01_E01');
  assert.throws(() => new Simulation(room, { mode: 'encounter', enemyDefinitions: [
    { id: 'same', archetype: 'B01_E01', position: { x: 0, z: 1 } }, { id: 'same', archetype: 'B01_E02', position: { x: 2, z: 1 } },
  ] }), /Duplicate enemy ID/);
});

test('Counter guard reduces every weapon from the front, respects its 120-degree edge and permits flank damage', () => {
  for (const [weapon, expected] of [['weapon_01', 6.48], ['weapon_02', 6], ['weapon_03', 54]] as const) {
    const sim = encounter('B01_E02', weapon);
    until(sim, enemy => enemy.phase === 'guard');
    const hits = attackFrom(sim, 0);
    assert.equal(hits.length, 1); close(hits[0].damage, expected);
    assert.equal(sim.state.hits, 1, 'a broad pillar swing still contacts each guarded recipient once');
  }
  for (const [angle, expected] of [[Math.PI / 3 - 1e-6, 6], [Math.PI / 3 + 1e-6, 20], [Math.PI, 20]]) {
    const sim = encounter('B01_E02'); until(sim, enemy => enemy.phase === 'guard');
    close(attackFrom(sim, angle)[0].damage, expected);
  }
});

test('Counter displays 1s guard, .6s warning, one 14-damage counter and .85s unguarded recovery', () => {
  const sim = encounter('B01_E02'); until(sim, enemy => enemy.phase === 'guard');
  const phases = [sim.state.enemies[0].phase]; const events: HitEvent[] = [];
  for (let index = 1; index < 150; index++) {
    events.push(...sim.step(idle)); phases.push(sim.state.enemies[0].phase);
    assert.equal(sim.state.enemies[0].guardActive, sim.state.enemies[0].phase === 'guard');
  }
  assert.deepEqual(phases, [...Array(60).fill('guard'), ...Array(36).fill('preparation'), ...Array(3).fill('active'), ...Array(51).fill('recovery')]);
  assert.deepEqual(events.filter(event => event.source === 'enemy').map(event => event.damage), [14]);
  const exposed = encounter('B01_E02'); until(exposed, enemy => enemy.phase === 'recovery');
  close(attackFrom(exposed, 0)[0].damage, 20);
  const hidden = encounter('B01_E02'); until(hidden, enemy => enemy.phase === 'guard'); hidden.setVisibleEnemyIds([]);
  assert.equal(ticks(hidden, 60).filter(event => event.source === 'enemy').length, 0);
  assert.equal(hidden.state.enemies[0].phase, 'approach'); assert.equal(hidden.state.enemies[0].guardActive, false);
  ticks(hidden, 120); assert.equal(hidden.state.player.health, 100);
  hidden.setVisibleEnemyIds(null); hidden.step(idle);
  assert.equal(hidden.state.enemies[0].phase, 'guard'); close(hidden.state.enemies[0].attackProgress, 0);
});

test('Clincher telegraphs 4m lane for .8s, locks direction, can be sidestepped and recovers for 1s', () => {
  const sim = encounter('B01_E03', 'weapon_02', room, { x: 0, z: 4.2 });
  until(sim, enemy => enemy.phase === 'preparation');
  const enemy = sim.state.enemies[0]; const start = { ...enemy.position }; const facing = { ...enemy.facing };
  assert.equal(enemy.attackShape?.kind, 'lane'); assert.equal(enemy.attackShape?.range, 4); assert.equal(enemy.attackShape?.width, 1.2);
  assert.deepEqual(enemy.attackShape?.center, start);
  ticks(sim, 47, { move: { x: 1, z: 0 } });
  assert.equal(enemy.phase, 'preparation'); assert.equal(sim.state.player.health, 100);
  const events = ticks(sim, 24);
  assert.equal(enemy.phase, 'active'); assert.deepEqual(enemy.facing, facing);
  close(Math.hypot(enemy.position.x - start.x, enemy.position.z - start.z), 4);
  assert.equal(events.filter(event => event.source === 'enemy').length, 0, 'moving sideways leaves the latched lane');
  const phases: string[] = [];
  for (let index = 0; index < 60; index++) { sim.step(idle); phases.push(enemy.phase); }
  assert.deepEqual(phases, Array(60).fill('recovery'));
});

test('Clincher charge stops at solid cover without redirecting or hitting through it', () => {
  const covered: Room = { ...room, obstacles: [{ id: 'wall', x: 0, z: -1, width: 8, depth: 0.2, height: 1 }] };
  const sim = encounter('B01_E03', 'weapon_02', covered, { x: 0, z: 4.2 });
  until(sim, enemy => enemy.phase === 'preparation');
  const enemy = sim.state.enemies[0]; const start = { ...enemy.position };
  sim.state.player.position = { x: 0, z: -2 };
  const events = until(sim, target => target.phase === 'recovery');
  assert.equal(events.filter(event => event.source === 'enemy').length, 0); assert.equal(sim.state.player.health, 100);
  close(enemy.position.x, start.x); assert.ok(enemy.position.z >= -0.9 + enemy.radius - 1e-8);
  assert.ok(Math.hypot(enemy.position.x - start.x, enemy.position.z - start.z) < 4);
});

test('Clincher deals exactly one 16-damage hit per charge and dash protection avoids that hit', () => {
  const sim = encounter('B01_E03'); until(sim, enemy => enemy.phase === 'preparation');
  const events = until(sim, enemy => enemy.phase === 'recovery');
  assert.deepEqual(events.filter(event => event.source === 'enemy').map(event => event.damage), [16]);
  const dodge = encounter('B01_E03'); until(dodge, enemy => enemy.phase === 'preparation'); ticks(dodge, 47);
  const evaded = dodge.step({ ...idle, dashPressed: true, move: { x: 1, z: 0 } });
  assert.equal(evaded.filter(event => event.source === 'enemy').length, 0); assert.equal(dodge.state.player.health, 100);
  ticks(dodge, 23); assert.equal(dodge.state.player.health, 100);
});

test('Coach has two distinct prepared 10-damage jabs, then 1.2s recovery and a 2.5m sweep', () => {
  const sim = encounter('B01_M01'); until(sim, enemy => enemy.phase === 'preparation'); sim.drainSoundEvents();
  const enemy = sim.state.enemies[0]; assert.equal(enemy.attackKind, 'double-jab');
  const phases = [enemy.phase]; const events: HitEvent[] = [];
  while (enemy.phase !== 'recovery') { events.push(...sim.step(idle)); phases.push(enemy.phase); }
  assert.deepEqual(phases.slice(0, -1), [...Array(48).fill('preparation'), ...Array(6).fill('active'), ...Array(48).fill('preparation'), ...Array(6).fill('active')]);
  assert.deepEqual(events.filter(event => event.source === 'enemy').map(event => event.damage), [10, 10]);
  assert.equal(new Set(events.map(event => event.id)).size, events.length);
  ticks(sim, 71); assert.equal(enemy.phase, 'recovery');
  sim.step(idle); assert.equal(enemy.phase, 'preparation'); assert.equal(enemy.attackKind, 'sweep');
  assert.equal(enemy.attackShape?.range, 2.5); assert.equal(enemy.attackShape?.kind, 'cone');
  assert.ok(enemy.attackShape!.halfAngle > Math.PI / 2);
  const sweep = until(sim, target => target.phase === 'recovery');
  assert.deepEqual(sweep.filter(event => event.source === 'enemy').map(event => event.damage), [16]);
  ticks(sim, 95); assert.equal(enemy.phase, 'recovery');
});

test('Coach crosses 50% once, cancels preparation, remains damageable and has 1s harmless transition', () => {
  const sim = encounter('B01_M01', 'weapon_01'); until(sim, enemy => enemy.phase === 'preparation'); sim.drainSoundEvents();
  const enemy = sim.state.enemies[0]; enemy.health = 450;
  assert.equal(sim.step(idle).length, 0); assert.equal(enemy.phase, 'transition'); assert.equal(enemy.bossPhase, 2);
  const events = ticks(sim, 4, { attackPressed: true, aim: { x: 0, z: 1 } });
  assert.equal(events.filter(event => event.source === 'player').length, 1); close(enemy.health, 428.4);
  const quiet = ticks(sim, 55); assert.equal(quiet.filter(event => event.source === 'enemy').length, 0);
  assert.equal(sim.state.player.health, 100); assert.equal(enemy.phaseTransitionRemaining, 0);
  assert.equal(sim.drainSoundEvents().filter(event => event.kind === 'phase-change').length, 1);
  sim.state.player.health = 10000;
  ticks(sim, 480);
  assert.equal(sim.drainSoundEvents().filter(event => event.kind === 'phase-change').length, 0);
});

test('Coach threshold preserves an already active hit but never opens a hidden second jab', () => {
  const sim = encounter('B01_M01'); until(sim, enemy => enemy.phase === 'active'); sim.drainSoundEvents();
  const enemy = sim.state.enemies[0]; enemy.health = 450;
  const events = until(sim, target => target.phase === 'transition');
  assert.equal(events.filter(event => event.source === 'enemy').length, 0, 'the already settled active hit is not duplicated');
  assert.equal(sim.state.player.health, 90);
  assert.equal(sim.drainSoundEvents().filter(event => event.kind === 'phase-change').length, 1);
  assert.equal(ticks(sim, 59).filter(event => event.source === 'enemy').length, 0);
});

test('phase-two slam has a full 1s circular warning, one 20-damage hit, cover and a reachable safe edge', () => {
  for (const variant of ['inside', 'outside', 'cover'] as const) {
    const arena: Room = { ...room, obstacles: [] }; const sim = encounter('B01_M01', 'weapon_02', arena);
    const enemy = sim.state.enemies[0]; enemy.health = 450; sim.state.player.health = 10000;
    until(sim, target => target.phase === 'preparation' && target.attackKind === 'slam');
    assert.equal(enemy.attackShape?.kind, 'circle'); assert.equal(enemy.attackShape?.range, 2);
    const center = { ...enemy.attackShape!.center! };
    sim.state.player.position = { x: center.x + (variant === 'outside' ? 2.5 : 1.5), z: center.z };
    if (variant === 'cover') arena.obstacles.push({ id: 'slam-cover', x: center.x + 0.9, z: center.z, width: 0.2, depth: 3, height: 1 });
    const health = sim.state.player.health;
    assert.equal(ticks(sim, 59).filter(event => event.source === 'enemy').length, 0); assert.equal(enemy.phase, 'preparation');
    const events = until(sim, target => target.phase === 'recovery');
    close(health - sim.state.player.health, variant === 'inside' ? 20 : 0);
    assert.equal(events.filter(event => event.source === 'enemy').length, variant === 'inside' ? 1 : 0);
    assert.deepEqual(enemy.attackShape?.center, center);
    ticks(sim, 95); assert.equal(enemy.phase, 'recovery');
  }
});

test('Coach resists stagger at 25%, ignores knockback, and staggers only when the attack reaches recovery', () => {
  const sim = encounter('B01_M01', 'weapon_03'); until(sim, enemy => enemy.phase === 'preparation');
  const enemy = sim.state.enemies[0]; const start = { ...enemy.position };
  ticks(sim, 34, { attackPressed: true, aim: { x: 0, z: 1 } });
  close(enemy.poise, COACH_RULES.poise - 7.5); assert.deepEqual(enemy.position, start); assert.equal(enemy.phase, 'preparation');
  // Place the shared poise meter one pillar contribution from zero; retain natural AI transitions.
  ticks(sim, 56);
  while (enemy.phase !== 'preparation' || enemy.attackKind !== 'sweep') sim.step(idle);
  ticks(sim, 33, { attackPressed: true, aim: { x: 0, z: 1 } });
  enemy.poise = 7.5;
  sim.step({ ...idle, aim: { x: 0, z: 1 } });
  assert.equal(enemy.poise, 0); assert.equal(enemy.phase, 'preparation'); assert.deepEqual(enemy.position, start);
  until(sim, target => target.phase === 'staggered');
  ticks(sim, 23); assert.equal(enemy.phase, 'approach'); close(enemy.poise, COACH_RULES.poise);
  sim.step(idle); assert.ok(enemy.staggerImmunity >= 2.98);
});

test('a threshold hit during recovery consumes its stagger into the transition without hidden approach downtime', () => {
  const sim = encounter('B01_M01', 'weapon_01'); until(sim, enemy => enemy.phase === 'recovery');
  const enemy = sim.state.enemies[0]; enemy.health = 470;
  ticks(sim, 3, { attackPressed: true, aim: { x: 0, z: 1 } }); enemy.poise = 0.5;
  sim.step(idle);
  assert.equal(enemy.phase, 'transition'); assert.equal(enemy.bossPhase, 2); assert.equal(enemy.staggerRemaining, 0);
  assert.equal(ticks(sim, 59).filter(event => event.source === 'enemy').length, 0);
  sim.step(idle); assert.equal(enemy.phase, 'preparation'); close(enemy.attackProgress, 0);
  assert.equal(enemy.staggerRemaining, 0); assert.ok(enemy.staggerImmunity > 1.9);
});

test('mixed ordinary roles honor two damaging preparations and offscreen enemies always start with a full warning', () => {
  const sim = new Simulation(room, { mode: 'encounter', enemyDefinitions: [
    { id: 'jab-1', archetype: 'B01_E01', position: { x: -1, z: 2 } },
    { id: 'jab-2', archetype: 'B01_E01', position: { x: 1, z: 2 } },
    { id: 'counter', archetype: 'B01_E02', position: { x: 0, z: 3 } },
    { id: 'charge-1', archetype: 'B01_E03', position: { x: -2, z: 4 } },
    { id: 'charge-2', archetype: 'B01_E03', position: { x: 2, z: 4 } },
  ] });
  sim.state.player.position = { x: 0, z: 0 }; sim.setVisibleEnemyIds([]); ticks(sim, 180);
  assert.equal(sim.state.player.health, 100); assert.ok(sim.state.enemies.every(enemy => enemy.phase === 'approach'));
  sim.setVisibleEnemyIds(['charge-1']); sim.step(idle);
  const charge = sim.state.enemies.find(enemy => enemy.id === 'charge-1')!;
  assert.equal(charge.phase, 'preparation'); close(charge.attackProgress, 0);
  ticks(sim, CLINCHER_RULES.preparationTicks - 1); assert.equal(sim.state.player.health, 100);
  sim.setVisibleEnemyIds(null); sim.state.player.health = 10000;
  for (let index = 0; index < 600; index++) {
    sim.step(idle);
    assert.ok(sim.state.enemies.filter(enemy => enemy.phase === 'preparation' || enemy.phase === 'active').length <= BOXER_RULES.maximumPreparing);
  }
});

test('seven carried effects keep normalized Impact under a guarded pillar hit without bonus or multi-hit credit', () => {
  const sim = encounter('B01_E02', 'weapon_03'); until(sim, enemy => enemy.phase === 'guard');
  for (const id of UPGRADE_IDS) sim.addUpgrade(id);
  sim.state.upgrades.noHealthLossTime = 4; sim.state.upgrades.impact = 0.2;
  sim.state.player.barrier = 1; sim.state.upgrades.barrierRemaining = 1;
  const hits = attackFrom(sim, 0);
  assert.equal(hits.length, 1); close(hits[0].damage, 54 * 1.15);
  close(sim.state.upgrades.impact, 0.6); close(sim.state.player.barrier, 3);
  assert.ok(validatePlayerCarry(sim.captureCarry()));
  close(sim.state.effectiveRange, 2.6 * 1.15);
});

test('cleared traversal advances walking/dash/carry timers without hits, ammunition refill or combat resurrection', () => {
  const sim = encounter('B01_E01', 'weapon_01'); sim.state.enemies[0].health = 0; sim.step(idle);
  assert.equal(sim.state.outcome, 'complete'); sim.state.player.ammo = 0;
  sim.addUpgrade('SRC_SKLODOWSKA_02'); sim.addUpgrade('SRC_GOD_03'); sim.addUpgrade('SRC_STREETS_03');
  sim.state.upgrades.impact = 0.3; sim.state.player.barrier = 4; sim.state.upgrades.barrierRemaining = 1;
  sim.drainSoundEvents(); const before = sim.state.time; const health = sim.state.player.health;
  for (let index = 0; index < 60; index++) assert.deepEqual(sim.stepTraversal({ ...idle, move: { x: 1, z: 0 }, attackHeld: true, attackPressed: true, reloadPressed: true, dashPressed: index === 0 }), []);
  assert.equal(sim.state.outcome, 'complete'); assert.equal(sim.state.enemies[0].phase, 'defeated');
  close(sim.state.time - before, 1); assert.ok(sim.state.player.position.x > RULES.moveSpeed);
  assert.equal(sim.state.player.health, health); assert.equal(sim.state.player.ammo, 0); assert.equal(sim.state.player.barrier, 0);
  close(sim.state.upgrades.impact, 0.3); assert.equal(sim.state.player.attackPhase, 'ready'); assert.equal(sim.state.player.reloadRemaining, 0);
  assert.equal(sim.drainSoundEvents().some(event => ['attack', 'miss', 'reload-start', 'warning'].includes(event.kind)), false);
  const finished = sim.state.time; sim.step(idle); assert.equal(sim.state.time, finished);
});

test('semantic audio cues settle once per opportunity, drain once, omit canceled startups and count actual footsteps', () => {
  const sim = new Simulation(room, { weapon: 'weapon_03' }); sim.state.player.position = { x: 0, z: 0 }; sim.state.dummy.position = { x: 8, z: 0 };
  ticks(sim, 42, { attackPressed: true });
  const sounds = sim.drainSoundEvents(); assert.deepEqual(sounds.map(event => event.kind), ['attack', 'miss']);
  assert.equal(new Set(sounds.map(event => event.id)).size, sounds.length); assert.deepEqual(sim.drainSoundEvents(), []);
  const canceled = new Simulation(room, { weapon: 'weapon_03' }); canceled.step({ ...idle, attackPressed: true }); canceled.step({ ...idle, dashPressed: true });
  assert.equal(canceled.drainSoundEvents().some(event => event.kind === 'attack' || event.kind === 'miss'), false);
  const walking = new Simulation(room); walking.state.player.position = { x: room.halfWidth - RULES.radius, z: 0 };
  ticks(walking, 60, { move: { x: 1, z: 0 } }); assert.equal(walking.drainSoundEvents().filter(event => event.kind === 'step').length, 0);
  ticks(walking, 60, { move: { x: -1, z: 0 } }); assert.equal(walking.drainSoundEvents().filter(event => event.kind === 'step').length, 7);
  walking.step({ ...idle, dashPressed: true }); walking.clearBufferedActions(); assert.deepEqual(walking.drainSoundEvents(), []);
  const rifle = new Simulation(room, { weapon: 'weapon_01' }); rifle.state.player.ammo = 1;
  ticks(rifle, 9, { attackPressed: true }); ticks(rifle, 60);
  assert.deepEqual(rifle.drainSoundEvents().filter(event => event.kind.startsWith('reload')).map(event => event.kind), ['reload-start', 'reload-end']);
});
