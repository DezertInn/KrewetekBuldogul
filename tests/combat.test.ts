import test from 'node:test';
import assert from 'node:assert/strict';
import { BOXER_RULES, RIFLE_RULES, RULES, WEAPONS } from '../src/game/config';
import { Simulation, rayCoverDistance, rayTargetDistance } from '../src/game/simulation';
import type { Actions, Room, WeaponId } from '../src/game/types';

const room: Room = { halfWidth: 20, halfDepth: 20, obstacles: [] };
const idle: Actions = { move: { x: 0, z: 0 }, aim: null, attackHeld: false, attackPressed: false, dashPressed: false };
function ticks(sim: Simulation, count: number, changes: Partial<Actions> = {}) {
  return Array.from({ length: count }, () => sim.step({ ...idle, ...changes })).flat();
}
function dummy(weapon: WeaponId, customRoom = room) {
  const sim = new Simulation(customRoom, { weapon });
  sim.state.player.position = { x: 0, z: 0 };
  sim.state.dummy.health = sim.state.dummy.maxHealth = 100000;
  return sim;
}
function encounter(weapon: WeaponId = 'weapon_02', customRoom = room) {
  const sim = new Simulation(customRoom, { weapon, mode: 'encounter' });
  sim.state.player.position = { x: 0, z: 0 };
  return sim;
}

test('actual 60-second complete cycles deliver 120/120/108 sustained DPS', () => {
  for (const [weapon, damage, hits] of [['weapon_01', 6480, 300], ['weapon_02', 7200, 288], ['weapon_03', 7200, 40]] as const) {
    const sim = dummy(weapon);
    const events = ticks(sim, 3600, { attackHeld: true }); // Half-open interval [0, 3600): no event at the next cycle's boundary.
    assert.equal(sim.state.time, 60);
    assert.equal(events.length, hits);
    assert.equal(sim.state.hits, hits);
    assert.equal(new Set(events.map(event => event.id)).size, hits);
    // IEEE-754 accumulation of 300 fractional 21.6-point rifle hits: absolute 1e-8 tolerance.
    assert.ok(Math.abs(sim.state.damageTotal - damage) < 1e-8, `${weapon}: ${sim.state.damageTotal}`);
    assert.ok(Math.abs(events.reduce((total, event) => total + event.damage, 0) - damage) < 1e-8);
    assert.deepEqual(sim.state.dummy.position, { x: 0, z: 1 }, 'benchmark target is stationary, without knockback');
    if (weapon === 'weapon_01') { assert.equal(sim.state.player.ammo, 20); assert.equal(sim.state.player.reloadRemaining, 0); }
  }
});

test('rifle has exact 3/1/5 phases, fractional damage and a 60-tick automatic reload after all recovery', () => {
  const sim = dummy('weapon_01');
  const phases: string[] = [];
  for (let tick = 0; tick < 9; tick++) { sim.step({ ...idle, attackHeld: true }); phases.push(sim.state.player.attackPhase); }
  assert.deepEqual(phases, ['startup', 'startup', 'startup', 'active', ...Array(5).fill('recovery')]);
  assert.equal(sim.state.lastDamage, 21.6); assert.equal(sim.state.player.ammo, 19);
  ticks(sim, 171, { attackHeld: true });
  assert.equal(sim.state.hits, 20); assert.equal(sim.state.player.ammo, 0);
  assert.equal(sim.state.player.attackPhase, 'recovery'); assert.equal(sim.state.player.reloadRemaining, 0);
  ticks(sim, 59, { attackHeld: true });
  assert.equal(sim.state.player.ammo, 0); assert.equal(sim.state.hits, 20);
  assert.ok(Math.abs(sim.state.player.reloadRemaining - 1 / 60) < 1e-9);
  sim.step({ ...idle, attackHeld: true });
  assert.equal(sim.state.player.ammo, 20); assert.equal(sim.state.player.reloadRemaining, 0);
  ticks(sim, 3, { attackHeld: true }); assert.equal(sim.state.hits, 20);
  sim.step({ ...idle, attackHeld: true }); assert.equal(sim.state.hits, 21);
});

test('manual reload waits for shot recovery, retains missing rounds until completion and full-magazine reload is inert', () => {
  const sim = dummy('weapon_01');
  sim.step({ ...idle, reloadPressed: true });
  assert.equal(sim.state.player.attackPhase, 'ready'); assert.equal(sim.state.player.reloadRemaining, 0);
  ticks(sim, 4, { attackHeld: true });
  sim.step({ ...idle, reloadPressed: true, attackHeld: true });
  assert.equal(sim.state.player.attackPhase, 'recovery'); assert.equal(sim.state.player.ammo, 19);
  ticks(sim, 4, { attackHeld: true });
  assert.equal(sim.state.player.reloadRemaining, 0);
  ticks(sim, 59, { attackHeld: true });
  assert.equal(sim.state.player.attackPhase, 'reload'); assert.equal(sim.state.player.ammo, 19);
  assert.equal(sim.state.hits, 1);
  sim.step({ ...idle, attackHeld: true }); assert.equal(sim.state.player.ammo, 20);
});

test('canceling rifle startup spends no round and canceling reload requires a new full reload', () => {
  const sim = dummy('weapon_01');
  sim.step({ ...idle, attackPressed: true }); sim.step({ ...idle, dashPressed: true, move: { x: 1, z: 0 } });
  ticks(sim, 18); assert.equal(sim.state.hits, 0); assert.equal(sim.state.player.ammo, 20);
  ticks(sim, 9, { attackHeld: true }); assert.equal(sim.state.player.ammo, 19);
  sim.step({ ...idle, reloadPressed: true }); ticks(sim, 44);
  assert.equal(sim.state.player.ammo, 19);
  sim.step({ ...idle, dashPressed: true, move: { x: -1, z: 0 } });
  assert.equal(sim.state.player.reloadRemaining, 0); assert.equal(sim.state.player.ammo, 19);
  ticks(sim, 17);
  sim.step({ ...idle, reloadPressed: true }); ticks(sim, 58);
  assert.equal(sim.state.player.ammo, 19);
  sim.step(idle); assert.equal(sim.state.player.ammo, 20);
});

test('safety discards a reload queued during attack recovery', () => {
  const sim = dummy('weapon_01'); ticks(sim, 4, { attackHeld: true });
  sim.step({ ...idle, reloadPressed: true }); sim.clearBufferedActions(); ticks(sim, 80);
  assert.equal(sim.state.player.ammo, 19); assert.equal(sim.state.player.reloadRemaining, 0);
});

test('rifle samples each shot aim and renders a tracer for hits and misses', () => {
  const sim = dummy('weapon_01'); sim.state.dummy.position = { x: 4, z: 0 };
  ticks(sim, 3, { attackHeld: true, aim: { x: 0, z: 1 } });
  sim.step({ ...idle, attackHeld: true, aim: { x: 1, z: 0 } });
  assert.equal(sim.state.hits, 1); assert.ok(Math.abs(sim.state.tracers[0].to.x - 3.55) < 1e-9);
  ticks(sim, 5); ticks(sim, 4, { attackHeld: true, aim: { x: 0, z: 1 } });
  assert.equal(sim.state.hits, 1); assert.deepEqual(sim.state.tracers.at(-1)!.to, { x: 0, z: 12 });
  ticks(sim, 5); assert.equal(sim.state.tracers.length, 0);
});

test('rifle targets the first ray intersection and respects range, circle misses and solid cover', () => {
  const sim = encounter('weapon_01'); ticks(sim, 3, { attackHeld: true });
  sim.state.enemies[0].position = { x: 0, z: 4 };
  sim.state.enemies[1].position = { x: 0, z: 2 };
  sim.state.enemies[2].position = { x: 5, z: 5 };
  const events = sim.step(idle);
  assert.deepEqual(events.map(event => event.targetId), ['jabber-2']);
  assert.equal(sim.state.enemies[0].health, 100);
  assert.ok(Math.abs(sim.state.tracers[0].to.z - 1.64) < 1e-9);
  for (const position of [{ x: 0, z: 12.46 }, { x: 0.46, z: 5 }, { x: 0, z: -2 }]) {
    const miss = dummy('weapon_01'); miss.state.dummy.position = position;
    ticks(miss, 9, { attackHeld: true }); assert.equal(miss.state.hits, 0);
  }
  const boundary = dummy('weapon_01'); boundary.state.dummy.position = { x: 0, z: 12.45 };
  ticks(boundary, 4, { attackHeld: true }); assert.equal(boundary.state.hits, 1, 'target surface exactly at 12 m is included');
  const wallTie = dummy('weapon_01', { ...room, obstacles: [{ id: 'cover', x: 0, z: 2.5, width: 2, depth: 1, height: 1 }] });
  wallTie.state.dummy.position = { x: 0, z: 2.45 };
  ticks(wallTie, 4, { attackHeld: true }); assert.equal(wallTie.state.hits, 0, 'cover wins a target-surface tie at 2 m');
  const covered = dummy('weapon_01', { ...room, obstacles: [{ id: 'cover', x: 0, z: 0.6, width: 2, depth: 0.1, height: 1 }] });
  ticks(covered, 4, { attackHeld: true }); assert.equal(covered.state.hits, 0);
  assert.ok(Math.abs(covered.state.tracers[0].to.z - 0.55) < 1e-9);
  assert.equal(rayCoverDistance({ x: 0, z: 0 }, { x: 0, z: 1 }, 12, { halfWidth: 5, halfDepth: 5, obstacles: [] }), 5);
  assert.equal(rayTargetDistance({ x: 0, z: 0 }, { x: 0, z: 1 }, { position: { x: 2, z: 5 }, radius: 0.4 }), Infinity);
});

test('gloves choose only the nearest eligible target, with stable ID tie-breaks', () => {
  const sim = encounter(); ticks(sim, 3, { attackHeld: true });
  sim.state.enemies[0].position = { x: -0.2, z: 1.7 };
  sim.state.enemies[1].position = { x: 0.2, z: 1.1 };
  sim.state.enemies[2].position = { x: 2, z: 0 };
  assert.deepEqual(sim.step(idle).map(event => event.targetId), ['jabber-2']);
  assert.equal(sim.step(idle).length, 0);
  const tied = encounter(); ticks(tied, 3, { attackHeld: true });
  tied.state.enemies[0].position = { x: -0.2, z: 1.7 }; tied.state.enemies[1].position = { x: 0.2, z: 1.7 };
  tied.state.enemies[2].position = { x: 2, z: 0 };
  assert.deepEqual(tied.step(idle).map(event => event.targetId), ['jabber-1']);
});

test('pillar has 33/9/48 phases, one hit per target per sweep, crowd damage separate from single-target DPS', () => {
  const phaseSim = dummy('weapon_03'); const phases: string[] = [];
  for (let tick = 0; tick < 90; tick++) { phaseSim.step({ ...idle, attackHeld: true }); phases.push(phaseSim.state.player.attackPhase); }
  assert.deepEqual(phases, [...Array(33).fill('startup'), ...Array(9).fill('active'), ...Array(48).fill('recovery')]);
  assert.equal(phaseSim.state.hits, 1); assert.equal(phaseSim.state.damageTotal, 180);
  const sim = encounter('weapon_03'); ticks(sim, 33, { attackHeld: true });
  for (const [index, enemy] of sim.state.enemies.entries()) { enemy.position = { x: (index - 1) * 0.7, z: 1.4 }; enemy.health = enemy.maxHealth = 1000; }
  const events = ticks(sim, 9);
  assert.equal(events.filter(event => event.source === 'player').length, 3);
  assert.equal(sim.state.damageTotal, 540, 'crowd aggregate is 3 × 180; not the single-target benchmark');
  assert.ok(sim.state.enemies.every(enemy => enemy.health === 820));
});

test('pillar reach, 100-degree cone, cover and activation-facing lock share the displayed envelope', () => {
  for (const [angle, distance, hits] of [[0, 3.05, 1], [0, 3.051, 0], [50 * Math.PI / 180 - 1e-6, 2.5, 1], [50 * Math.PI / 180 + 1e-6, 2.5, 0]] as const) {
    const sim = dummy('weapon_03'); sim.state.dummy.position = { x: Math.sin(angle) * distance, z: Math.cos(angle) * distance };
    ticks(sim, 90, { attackHeld: true }); assert.equal(sim.state.hits, hits);
  }
  const lock = dummy('weapon_03'); lock.state.dummy.position = { x: 2, z: 0 };
  ticks(lock, 32, { attackHeld: true }); lock.step({ ...idle, aim: { x: 1, z: 0 } });
  ticks(lock, 9, { aim: { x: 0, z: 1 } });
  assert.equal(lock.state.hits, 1); assert.deepEqual(lock.state.player.facing, { x: 1, z: 0 });
  const cover = dummy('weapon_03', { ...room, obstacles: [{ id: 'cover', x: 0, z: 0.6, width: 2, depth: 0.1, height: 1 }] });
  ticks(cover, 90, { attackHeld: true }); assert.equal(cover.state.hits, 0);
});

test('pillar active cannot be canceled and canceling its recovery preserves the original end barrier', () => {
  const sim = dummy('weapon_03'); ticks(sim, 34, { attackHeld: true });
  sim.step({ ...idle, dashPressed: true, move: { x: 1, z: 0 } });
  assert.equal(sim.state.player.dashRemaining, 0);
  ticks(sim, 7);
  sim.step({ ...idle, dashPressed: true, move: { x: 1, z: 0 } });
  assert.ok(sim.state.player.dashRemaining > 0);
  ticks(sim, 47, { attackHeld: true });
  assert.equal(sim.state.player.attackPhase, 'ready'); assert.equal(sim.state.hits, 1);
  sim.step({ ...idle, attackHeld: true }); assert.equal(sim.state.player.attackPhase, 'startup');
});

test('rifle and pillar attack movement and reload movement use their specified multipliers', () => {
  for (const weapon of ['weapon_01', 'weapon_03'] as const) {
    const sim = dummy(weapon); sim.state.dummy.health = 0;
    ticks(sim, 60, { attackHeld: true, move: { x: 1, z: 0 } });
    assert.ok(Math.abs(sim.state.player.position.x - RULES.moveSpeed * WEAPONS[weapon].moveFactor) < 1e-8);
  }
  const reload = dummy('weapon_01'); ticks(reload, 9, { attackHeld: true });
  const start = reload.state.player.position.x;
  reload.step({ ...idle, reloadPressed: true, move: { x: 1, z: 0 } }); ticks(reload, 59, { move: { x: 1, z: 0 } });
  assert.ok(Math.abs(reload.state.player.position.x - start - RULES.moveSpeed * RIFLE_RULES.reloadMoveFactor) < 1e-8);
});

test('encounter starts safely, limits simultaneous preparation and respects explicit visibility', () => {
  const sim = encounter(); sim.setVisibleEnemyIds([]);
  ticks(sim, 180); assert.equal(sim.state.player.health, 100);
  assert.ok(sim.state.enemies.every(enemy => enemy.phase === 'approach'));
  sim.setVisibleEnemyIds(['jabber-1', 'jabber-2', 'jabber-3']);
  for (let tick = 0; tick < 27; tick++) {
    sim.step(idle);
    assert.ok(sim.state.enemies.filter(enemy => enemy.phase === 'preparation' || enemy.phase === 'active').length <= 2);
    assert.equal(sim.state.player.health, 100, 'entering view never skips 27-tick preparation');
  }
  ticks(sim, 3); assert.equal(sim.state.player.health, 90);
  const fresh = encounter(); ticks(fresh, 60); assert.equal(fresh.state.player.health, 100);
});

test('enemy jab has a locked telegraph, can be evaded, and body collision stops approach', () => {
  const sim = encounter(); sim.state.enemies.slice(1).forEach(enemy => { enemy.health = 0; });
  while (sim.state.enemies[0].phase !== 'preparation') sim.step(idle);
  const locked = { ...sim.state.enemies[0].facing };
  ticks(sim, 26, { move: { x: 1, z: 0 } });
  assert.deepEqual(sim.state.enemies[0].facing, locked);
  ticks(sim, 3); assert.equal(sim.state.player.health, 100);
  const crowd = encounter(); crowd.setVisibleEnemyIds([]); ticks(crowd, 180);
  for (const enemy of crowd.state.enemies) assert.ok(Math.hypot(enemy.position.x, enemy.position.z) >= enemy.radius + crowd.state.player.radius - 1e-8);
});

test('enemy displayed phases match all 27 preparation, 3 active and 33 recovery samples', () => {
  const sim = encounter(); sim.state.enemies.slice(1).forEach(enemy => { enemy.health = 0; });
  const enemy = sim.state.enemies[0];
  while (enemy.phase !== 'preparation') sim.step(idle);
  const phases: string[] = [enemy.phase];
  for (let index = 1; index < 63; index++) {
    const events = sim.step(idle); phases.push(enemy.phase);
    if (events.some(event => event.source === 'enemy')) assert.equal(enemy.phase, 'active');
  }
  assert.deepEqual(phases, [...Array(27).fill('preparation'), ...Array(3).fill('active'), ...Array(33).fill('recovery')]);
});

test('dash invulnerability and 0.35-second post-hit protection prevent simultaneous crowd damage', () => {
  const sim = encounter(); ticks(sim, 87);
  assert.equal(sim.state.player.health, 100);
  sim.step(idle); assert.equal(sim.state.player.health, 90);
  assert.ok(sim.state.player.hurtRemaining > 0);
  ticks(sim, 20); assert.equal(sim.state.player.health, 90); assert.equal(sim.state.player.hurtRemaining, 0);
  const dodge = encounter(); ticks(dodge, 87);
  dodge.step({ ...idle, dashPressed: true, move: { x: 0, z: 1 } });
  assert.equal(dodge.state.player.health, 100); assert.equal(dodge.state.player.invulnerable, true);
});

test('pillar stagger interrupts preparation, moves surviving ordinary targets, and grants immunity after recovery', () => {
  const sim = encounter('weapon_03'); sim.state.enemies.slice(1).forEach(enemy => { enemy.health = 0; });
  const enemy = sim.state.enemies[0]; enemy.health = enemy.maxHealth = 1000;
  ticks(sim, 45); ticks(sim, 33, { attackHeld: true });
  assert.equal(enemy.phase, 'preparation');
  const before = { ...enemy.position };
  sim.step({ ...idle, aim: { x: 0, z: 1 } });
  // Face the actual approaching enemy in a repeatable fixture if it approached diagonally.
  assert.equal(sim.state.hits, 1); assert.equal(enemy.phase, 'staggered');
  assert.ok(Math.hypot(enemy.position.x - before.x, enemy.position.z - before.z) > 0.9);
  ticks(sim, 26); assert.equal(enemy.phase, 'approach'); assert.equal(enemy.poise, BOXER_RULES.poise);
  sim.step(idle); assert.ok(enemy.staggerImmunity > 0.9);
});

test('stagger cannot cancel an already-active enemy jab and the glove finisher alone knocks back', () => {
  const sim = encounter('weapon_01'); sim.state.enemies.slice(1).forEach(enemy => { enemy.health = 0; });
  const enemy = sim.state.enemies[0]; enemy.health = enemy.maxHealth = 1000;
  while (enemy.phase !== 'active') sim.step(idle);
  // Start a rifle shot to resolve on the first active sample of the next jab.
  while (sim.state.enemies[0].phase !== 'preparation' || enemy.attackProgress < 24 / 27) sim.step(idle);
  const aim = { x: enemy.position.x, z: enemy.position.z };
  ticks(sim, 3, { attackHeld: true, aim });
  assert.equal(enemy.phase, 'active');
  enemy.poise = 2;
  sim.step({ ...idle, aim });
  assert.equal(enemy.poise, 0); assert.equal(enemy.phase, 'active');
  sim.step(idle); assert.equal(enemy.phase, 'active');
  sim.step(idle); assert.equal(enemy.phase, 'staggered');

  const gloves = encounter(); gloves.state.enemies.slice(1).forEach(target => { target.health = 0; });
  const target = gloves.state.enemies[0]; target.health = target.maxHealth = 1000;
  for (let tick = 0; tick <= 40; tick++) {
    target.position = { x: 0, z: 1 }; target.phase = 'recovery';
    const before = target.position.z;
    const events = gloves.step({ ...idle, attackHeld: true });
    if (events.length) assert.ok(Math.abs(target.position.z - before - (tick === 40 ? 0.35 : 0)) < 1e-9);
  }
});

test('poise restores after two seconds without stagger damage and knockback stops at cover', () => {
  const poise = encounter('weapon_01'); poise.setVisibleEnemyIds([]);
  poise.state.enemies.slice(1).forEach(enemy => { enemy.health = 0; });
  const enemy = poise.state.enemies[0]; enemy.position = { x: 0, z: 2 };
  ticks(poise, 4, { attackHeld: true }); assert.equal(enemy.poise, 28);
  ticks(poise, 119); assert.equal(enemy.poise, 28);
  poise.step(idle); assert.equal(enemy.poise, 30);
  const covered: Room = { ...room, obstacles: [{ id: 'wall', x: 0, z: 2.4, width: 4, depth: 0.2, height: 1 }] };
  const knock = encounter('weapon_03', covered); ticks(knock, 33, { attackHeld: true });
  knock.state.enemies.slice(1).forEach(target => { target.health = 0; });
  const survivor = knock.state.enemies[0]; survivor.position = { x: 0, z: 1.6 }; survivor.health = 1000;
  knock.step(idle); assert.equal(knock.state.hits, 1);
  assert.ok(survivor.position.z <= 2.3 - survivor.radius + 1e-9);
  assert.ok(survivor.position.z > 1.6);
});

test('boxers navigate around cover rather than attack through it or remain stranded', () => {
  const covered: Room = { halfWidth: 8, halfDepth: 6, obstacles: [{ id: 'cover', x: 0, z: 1.5, width: 2, depth: 0.8, height: 1 }] };
  const sim = encounter('weapon_02', covered); sim.state.enemies.slice(1).forEach(enemy => { enemy.health = 0; });
  const enemy = sim.state.enemies[0]; enemy.position = { x: 0, z: 3 };
  ticks(sim, 30); assert.equal(sim.state.player.health, 100);
  assert.ok(Math.abs(enemy.position.x) > 0.5);
  ticks(sim, 150);
  assert.ok(Math.hypot(enemy.position.x, enemy.position.z) < 1.35);
  assert.ok(sim.state.player.health < 100);
});

test('boxers can reach a player hugging each gym obstacle and the room boundary', () => {
  for (const position of [{ x: 4.4, z: -2.55 }, { x: -4.6, z: 0.35 }, { x: 4.7, z: 2.4 }, { x: 7.66, z: 0 }]) {
    const sim = new Simulation(undefined, { mode: 'encounter' });
    sim.state.player.position = position;
    const starts = sim.state.enemies.map(enemy => ({ ...enemy.position }));
    ticks(sim, 600);
    assert.ok(sim.state.enemies.some((enemy, index) => Math.hypot(enemy.position.x - starts[index].x, enemy.position.z - starts[index].z) > 1), `boxers approach ${JSON.stringify(position)}`);
    assert.ok(sim.state.player.health < 100, `cover-hugging player at ${JSON.stringify(position)} is reachable`);
  }
});

test('a boxer displaced against cover leaves its navigation margin without crossing solid cover', () => {
  const covered: Room = { halfWidth: 8, halfDepth: 6, obstacles: [{ id: 'cover', x: 0, z: 1.5, width: 2, depth: 0.8, height: 1 }] };
  const sim = encounter('weapon_02', covered);
  sim.state.enemies.slice(1).forEach(enemy => { enemy.health = 0; });
  const enemy = sim.state.enemies[0];
  enemy.position = { x: 0, z: 2.27 }; // 0.37 m beyond cover: body fits, extra navigation margin does not.
  for (let tick = 0; tick < 300; tick++) {
    sim.step(idle);
    const nearestX = Math.max(-1, Math.min(enemy.position.x, 1));
    const nearestZ = Math.max(1.1, Math.min(enemy.position.z, 1.9));
    assert.ok(Math.hypot(enemy.position.x - nearestX, enemy.position.z - nearestZ) >= enemy.radius - 1e-8, 'enemy body never crosses cover');
  }
  assert.ok(sim.state.player.health < 100, 'boxer resumes approach and attacks after leaving the margin');
});

test('defeated enemies stop colliding immediately; completion and defeat stop all future combat', () => {
  const sim = encounter('weapon_03'); ticks(sim, 33, { attackHeld: true });
  sim.state.enemies.forEach((enemy, index) => { enemy.position = { x: (index - 1) * 0.6, z: 1 }; });
  sim.step(idle); assert.equal(sim.state.outcome, 'complete');
  assert.ok(sim.state.enemies.every(enemy => enemy.health === 0 && enemy.phase === 'defeated'));
  const complete = structuredClone(sim.state);
  assert.equal(ticks(sim, 60, { attackHeld: true, dashPressed: true, reloadPressed: true }).length, 0);
  assert.deepEqual(sim.state, complete);
  const defeat = encounter(); ticks(defeat, 1800);
  assert.equal(defeat.state.outcome, 'defeat'); assert.equal(defeat.state.player.health, 0);
  const end = structuredClone(defeat.state); ticks(defeat, 120, { attackHeld: true }); assert.deepEqual(defeat.state, end);
  const surviving = encounter('weapon_01'); ticks(surviving, 3, { attackHeld: true });
  surviving.state.enemies[0].position = { x: 0, z: 0.75 }; surviving.state.enemies[0].health = 1;
  surviving.state.enemies.slice(1).forEach((enemy, index) => { enemy.position = { x: 8, z: index * 2 }; });
  surviving.step(idle); assert.equal(surviving.state.enemies[0].health, 0);
  const before = surviving.state.player.position.z; ticks(surviving, 10, { move: { x: 0, z: 1 } });
  assert.ok(surviving.state.player.position.z - before > 0.9);
});

test('new sessions deterministically clear ammunition, health, events, reload, enemies and buffers', () => {
  const previous = encounter('weapon_01'); ticks(previous, 80, { attackHeld: true });
  previous.step({ ...idle, reloadPressed: true }); previous.step({ ...idle, attackPressed: true, dashPressed: true });
  const a = encounter('weapon_01'); const b = encounter('weapon_01');
  assert.deepEqual(a.state, b.state); assert.equal(a.state.player.ammo, 20); assert.equal(a.state.player.health, 100);
  assert.equal(a.state.hits, 0); assert.equal(a.state.tracers.length, 0); assert.equal(a.state.player.reloadRemaining, 0);
  for (let index = 0; index < 300; index++) { assert.deepEqual(a.step(idle), b.step(idle)); assert.deepEqual(a.state, b.state); }
});
