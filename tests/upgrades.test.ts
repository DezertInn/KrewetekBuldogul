import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/game/simulation';
import { RULES, WEAPONS } from '../src/game/config';
import { createPlayerCarry, UPGRADE_IDS, UPGRADES, validatePlayerCarry, validateUpgradeRuntime, type UpgradeId } from '../src/game/upgrades';
import type { Actions, Room, WeaponId } from '../src/game/types';

const room: Room = { halfWidth: 40, halfDepth: 40, obstacles: [] };
const idle: Actions = { move: { x: 0, z: 0 }, aim: null, attackHeld: false, attackPressed: false, dashPressed: false };
const close = (actual: number, expected: number, message?: string) => assert.ok(Math.abs(actual - expected) < 1e-8, message ?? `${actual} != ${expected}`);
function ticks(sim: Simulation, count: number, changes: Partial<Actions> = {}) {
  return Array.from({ length: count }, () => sim.step({ ...idle, ...changes })).flat();
}
function dummy(weapon: WeaponId = 'weapon_02', effects: readonly UpgradeId[] = [], customRoom = room): Simulation {
  const sim = new Simulation(customRoom, { weapon });
  sim.state.player.position = { x: 0, z: 0 };
  sim.state.dummy.health = sim.state.dummy.maxHealth = 100000;
  for (const effect of effects) sim.addUpgrade(effect);
  return sim;
}
function encounter(effects: readonly UpgradeId[] = []): Simulation {
  const sim = new Simulation(room, { mode: 'encounter', enemySpawns: [{ x: 15, z: 15 }, { x: -15, z: 15 }] });
  sim.state.player.position = { x: 0, z: 0 };
  sim.setVisibleEnemyIds([]);
  for (const effect of effects) sim.addUpgrade(effect);
  return sim;
}
function hitWithBoxer(sim: Simulation): number {
  const enemy = sim.state.enemies[0];
  enemy.position = { x: 0, z: 0.9 }; enemy.facing = { x: 0, z: -1 }; enemy.phase = 'active';
  const before = sim.state.player.health;
  sim.step(idle);
  return before - sim.state.player.health;
}

test('seven source IDs and carry/runtime validation reject corrupt, duplicate and impossible state', () => {
  assert.equal(UPGRADE_IDS.length, 7); assert.equal(new Set(Object.values(UPGRADES).map(value => value.source)).size, 7);
  for (const weapon of ['weapon_01', 'weapon_02', 'weapon_03'] as const) assert.ok(validatePlayerCarry(createPlayerCarry(weapon)));
  const carry = createPlayerCarry();
  for (const invalid of [
    { ...carry, health: NaN }, { ...carry, ammo: 0.5 }, { ...carry, health: -1 }, { ...carry, barrier: 11 },
    { ...carry, dashCooldown: 2 }, { ...carry, attackCooldown: 1.51 }, { ...carry, hurtRemaining: 1 },
    { ...carry, arbitrary: 1 }, { ...carry, barrier: 2 },
  ]) assert.equal(validatePlayerCarry(invalid), false);
  for (const invalid of [
    { ...carry.upgrades, owned: ['SRC_GOD_03', 'SRC_GOD_03'] }, { ...carry.upgrades, owned: ['unknown'] },
    { ...carry.upgrades, impact: 0.5 }, { ...carry.upgrades, owned: ['SRC_SKLODOWSKA_02'], impact: 1 },
    { ...carry.upgrades, streetRemaining: 1 }, { ...carry.upgrades, owned: ['SRC_GOD_03'], noHealthLossTime: 4.1 },
  ]) assert.equal(validateUpgradeRuntime(invalid), false);
  const sim = dummy(); sim.addUpgrade('SRC_GOD_03'); sim.state.upgrades.noHealthLossTime = 3;
  sim.addUpgrade('SRC_GOD_03'); assert.deepEqual(sim.state.upgrades.owned, ['SRC_GOD_03']);
  assert.equal(sim.state.upgrades.noHealthLossTime, 3, 'duplicate acquisition does not refresh an effect');
  assert.throws(() => sim.addUpgrade('invalid' as UpgradeId));
  assert.throws(() => sim.restoreCarry({ ...carry, health: -1 }));
});

test('Quiet Resolve waits 4 active seconds, applies 15% primary damage and resets only on health damage', () => {
  const sim = dummy('weapon_02', ['SRC_GOD_03']);
  ticks(sim, 236); ticks(sim, 4, { attackHeld: true }); close(sim.state.lastDamage, 20, 'active hit before four seconds is unboosted');
  close(sim.state.upgrades.noHealthLossTime, 4);
  ticks(sim, 10, { attackHeld: true }); close(sim.state.lastDamage, 23);
  const receiving = encounter(['SRC_GOD_03']); ticks(receiving, 240); close(hitWithBoxer(receiving), 10);
  assert.equal(receiving.state.upgrades.noHealthLossTime, 0);
  const shielded = encounter(['SRC_GOD_03', 'SRC_SKLODOWSKA_02']); ticks(shielded, 240);
  shielded.state.player.barrier = 10; shielded.state.upgrades.barrierRemaining = 4;
  assert.equal(hitWithBoxer(shielded), 0); close(shielded.state.upgrades.noHealthLossTime, 4);
  assert.equal(shielded.state.player.barrier, 0);
});

test('Stand Firm starts after 0.5 seconds, applies reduction before barrier, and movement/dash/displacement end it', () => {
  const before = encounter(['SRC_FATHERLAND_01']); ticks(before, 28); close(hitWithBoxer(before), 10);
  const protectedSim = encounter(['SRC_FATHERLAND_01']); ticks(protectedSim, 30); close(hitWithBoxer(protectedSim), 8);
  const layered = encounter(['SRC_FATHERLAND_01', 'SRC_SKLODOWSKA_02']); ticks(layered, 30);
  layered.state.player.barrier = 5; layered.state.upgrades.barrierRemaining = 4;
  close(hitWithBoxer(layered), 3); assert.equal(layered.state.player.barrier, 0);
  for (const kind of ['move', 'dash', 'forced'] as const) {
    const sim = dummy('weapon_02', ['SRC_FATHERLAND_01']); sim.state.dummy.health = 0; ticks(sim, 30);
    if (kind === 'forced') sim.state.player.position.x += 0.1;
    sim.step({ ...idle, move: kind === 'move' ? { x: 1, z: 0 } : idle.move, dashPressed: kind === 'dash' });
    assert.equal(sim.state.upgrades.stationaryTime, 0, kind);
  }
});

test('High View increases all three effective ranges by 15% while angles and cover continue to block', () => {
  for (const weapon of ['weapon_01', 'weapon_02', 'weapon_03'] as const) {
    const sim = dummy(weapon, ['SRC_EAGLE_02']); const base = WEAPONS[weapon].range;
    sim.state.dummy.position = { x: 0, z: base * 1.15 + 0.44 };
    close(sim.state.effectiveRange, base * 1.15); ticks(sim, 90, { attackHeld: true }); assert.ok(sim.state.hits > 0, weapon);
    const beyond = dummy(weapon, ['SRC_EAGLE_02']); beyond.state.dummy.position = { x: 0, z: base * 1.15 + 0.451 };
    ticks(beyond, 90, { attackHeld: true }); assert.equal(beyond.state.hits, 0, weapon);
    const covered = dummy(weapon, ['SRC_EAGLE_02'], { ...room, obstacles: [{ id: 'wall', x: 0, z: 0.5, width: 4, depth: 0.05, height: 1 }] });
    ticks(covered, 90, { attackHeld: true }); assert.equal(covered.state.hits, 0);
    if (weapon !== 'weapon_01') {
      const angled = dummy(weapon, ['SRC_EAGLE_02']); const angle = WEAPONS[weapon].halfAngle + 0.01;
      angled.state.dummy.position = { x: Math.sin(angle) * base, z: Math.cos(angle) * base };
      ticks(angled, 90, { attackHeld: true }); assert.equal(angled.state.hits, 0);
    }
    close(WEAPONS[weapon].range, base, 'global weapon defaults stay unchanged');
  }
});

test('Slip Away starts at dash completion, lasts 2 seconds and does not refresh during its 3-second cooldown', () => {
  const sim = dummy('weapon_02', ['SRC_STREETS_03']); sim.state.dummy.health = 0;
  sim.step({ ...idle, dashPressed: true, move: { x: 1, z: 0 } }); ticks(sim, 16);
  assert.equal(sim.state.upgrades.streetRemaining, 0); sim.step(idle);
  assert.equal(sim.state.upgrades.streetRemaining, 2); assert.equal(sim.state.upgrades.streetCooldown, 3);
  const origin = sim.state.player.position.x;
  ticks(sim, 60, { move: { x: 1, z: 0 } }); close(sim.state.player.position.x - origin, 6.6 * 1.15);
  sim.step({ ...idle, dashPressed: true, move: { x: 1, z: 0 } }); ticks(sim, 17);
  close(sim.state.upgrades.streetRemaining, 0.7); close(sim.state.upgrades.streetCooldown, 1.7);
  ticks(sim, 42); assert.equal(sim.state.upgrades.streetRemaining, 0);
  ticks(sim, 60); assert.equal(sim.state.upgrades.streetCooldown, 0);
  sim.step({ ...idle, dashPressed: true }); ticks(sim, 17);
  assert.equal(sim.state.upgrades.streetRemaining, 2); assert.equal(sim.state.upgrades.streetCooldown, 3);
});

test('Flowing Step adds exactly 20 percentage points to attack movement without changing attack/reload timing', () => {
  for (const [weapon, factor] of [['weapon_01', 1], ['weapon_02', 0.9], ['weapon_03', 0.55]] as const) {
    const sim = dummy(weapon, ['SRC_CHOPIN_02']); sim.state.dummy.health = 0;
    ticks(sim, 9, { move: { x: 1, z: 0 }, attackHeld: true }); close(sim.state.player.position.x, 6.6 * factor * 9 / 60);
    const baseline = dummy(weapon), upgraded = dummy(weapon, ['SRC_CHOPIN_02']);
    for (let tick = 0; tick < 300; tick++) {
      const a = baseline.step({ ...idle, attackHeld: true }), b = upgraded.step({ ...idle, attackHeld: true });
      assert.deepEqual(b, a); assert.equal(upgraded.state.player.attackPhase, baseline.state.player.attackPhase);
      assert.equal(upgraded.state.player.reloadRemaining, baseline.state.player.reloadRemaining);
    }
  }
});

test('Controlled Shield uses unmodified weighted Impact for each weapon, retains fractions and caps at 10', () => {
  for (const [weapon, duration, impact, barrier] of [['weapon_01', 4, 0.216, 0], ['weapon_02', 4, 0.2, 0], ['weapon_03', 34, 0.8, 2]] as const) {
    const sim = dummy(weapon, ['SRC_SKLODOWSKA_02', 'SRC_GOD_03']); ticks(sim, 240);
    ticks(sim, duration, { attackHeld: true }); close(sim.state.upgrades.impact, impact); close(sim.state.player.barrier, barrier);
    close(sim.state.lastDamage, (weapon === 'weapon_01' ? 21.6 : weapon === 'weapon_03' ? 180 : 20) * 1.15);
  }
  const sim = dummy('weapon_03', ['SRC_SKLODOWSKA_02']); ticks(sim, 270, { attackHeld: true });
  close(sim.state.player.barrier, 10); close(sim.state.upgrades.impact, 0.4);
  const afterHits = sim.state.upgrades.barrierRemaining; assert.ok(afterHits > 3 && afterHits < 4);
  ticks(sim, 61); assert.ok(sim.state.upgrades.barrierRemaining < 3);
  sim.step({ ...idle, attackPressed: true }); ticks(sim, 33);
  close(sim.state.player.barrier, 10); close(sim.state.upgrades.barrierRemaining, 4, 'new pulse refreshes at the cap');
  ticks(sim, 239); assert.ok(sim.state.player.barrier > 0); sim.step(idle);
  assert.equal(sim.state.player.barrier, 0); assert.equal(sim.state.upgrades.barrierRemaining, 0);
});

test('pillar Impact selects the nearest first-tick positive recipient with stable IDs, never all recipients or later contacts', () => {
  const sim = new Simulation(room, { weapon: 'weapon_03', mode: 'encounter', enemySpawns: [{ x: 15, z: 15 }, { x: 16, z: 15 }, { x: 17, z: 15 }] });
  sim.state.player.position = { x: 0, z: 0 }; sim.setVisibleEnemyIds([]); sim.addUpgrade('SRC_SKLODOWSKA_02');
  ticks(sim, 33, { attackHeld: true });
  sim.state.enemies[0].position = { x: -0.3, z: 1.7 }; sim.state.enemies[0].health = 5;
  sim.state.enemies[1].position = { x: 0.3, z: 1.7 }; sim.state.enemies[1].health = 1000;
  sim.state.enemies[2].position = { x: 15, z: 15 }; sim.state.enemies[2].health = 1000;
  const events = sim.step(idle); assert.deepEqual(events.map(event => event.targetId), ['jabber-1', 'jabber-2']);
  close(sim.state.upgrades.impact, 0.05, 'tied nearest jabber-1 pre-hit health caps credit');
  sim.state.enemies[2].position = { x: 0, z: 1.3 }; sim.step(idle);
  assert.equal(sim.state.enemies[2].health, 820); close(sim.state.upgrades.impact, 0.05, 'late contact is the same opportunity');
  assert.equal(sim.state.player.barrier, 0);
  const missed = dummy('weapon_03', ['SRC_SKLODOWSKA_02']); missed.state.dummy.position = { x: 8, z: 8 };
  ticks(missed, 90, { attackHeld: true }); assert.equal(missed.state.upgrades.impact, 0);
  const canceled = dummy('weapon_03', ['SRC_SKLODOWSKA_02']); canceled.step({ ...idle, attackPressed: true });
  canceled.step({ ...idle, dashPressed: true }); ticks(canceled, 100);
  assert.equal(canceled.state.upgrades.impact, 0); assert.equal(canceled.state.hits, 0);
});

test('Wider Orbit travels 3.6 metres in 18 ticks with unchanged 9-tick invulnerability and swept collision', () => {
  const sim = dummy('weapon_03', ['SRC_KOPERNIK_03']); sim.state.dummy.health = 0;
  const invulnerable: boolean[] = [];
  for (let tick = 0; tick < 18; tick++) { sim.step({ ...idle, dashPressed: tick === 0, move: { x: 1, z: 0 } }); invulnerable.push(sim.state.player.invulnerable); }
  close(sim.state.player.position.x, 3.6); close(sim.state.time, 0.3); close(sim.state.player.dashCooldown, 0.9);
  assert.deepEqual(invulnerable, [...Array(9).fill(true), ...Array(9).fill(false)]);
  const blocked = dummy('weapon_03', ['SRC_KOPERNIK_03'], { halfWidth: 4, halfDepth: 4, obstacles: [{ id: 'thin', x: 1, z: 0, width: 0.02, depth: 4, height: 1 }] });
  blocked.state.dummy.health = 0; blocked.step({ ...idle, dashPressed: true, move: { x: 1, z: 0 } }); ticks(blocked, 17);
  assert.ok(blocked.state.player.position.x <= 0.99 - RULES.radius + 1e-9);
});

test('safe-room carry preserves health/ammo/timers/Impact/protection without replaying active input or windows', () => {
  const source = dummy('weapon_01', ['SRC_SKLODOWSKA_02', 'SRC_STREETS_03', 'SRC_GOD_03']);
  source.state.player.health = 67; ticks(source, 4, { attackHeld: true });
  source.state.player.barrier = 6; source.state.upgrades.barrierRemaining = 2.5;
  source.state.upgrades.streetRemaining = 1.25; source.state.upgrades.streetCooldown = 2;
  source.step({ ...idle, dashPressed: true }); ticks(source, 4);
  const carry = source.captureCarry(); assert.ok(validatePlayerCarry(carry));
  const next = dummy('weapon_01'); next.restoreCarry(carry);
  assert.deepEqual(next.captureCarry(), carry); assert.equal(next.state.player.attackPhase, 'ready'); assert.equal(next.state.player.dashRemaining, 0);
  assert.equal(next.state.player.ammo, 19); assert.equal(next.state.player.health, 67);
  const frozen = structuredClone(next.captureCarry()); next.clearBufferedActions(); assert.deepEqual(next.captureCarry(), frozen, 'paused/menu time has no tick');
  next.step(idle); assert.equal(next.state.hits, 0); close(next.state.upgrades.barrierRemaining, carry.upgrades.barrierRemaining - 1 / 60);
  const fresh = dummy('weapon_01'); assert.deepEqual(fresh.captureCarry(), createPlayerCarry('weapon_01'));
  carry.upgrades.owned.push('SRC_EAGLE_02'); assert.equal(next.state.upgrades.owned.includes('SRC_EAGLE_02'), false, 'restored data is isolated');
});

test('last-enemy pillar hit and canceled reload preserve original remaining action lock across stage boundaries', () => {
  const final = new Simulation(room, { weapon: 'weapon_03', mode: 'encounter', enemySpawns: [{ x: 15, z: 15 }] });
  final.state.player.position = { x: 0, z: 0 }; final.setVisibleEnemyIds([]);
  ticks(final, 33, { attackHeld: true }); final.state.enemies[0].position = { x: 0, z: 1.7 };
  final.step(idle); assert.equal(final.state.outcome, 'complete');
  const carry = final.captureCarry(); close(carry.attackCooldown, 56 / 60);
  const next = dummy('weapon_03'); next.restoreCarry(carry);
  ticks(next, 56, { attackHeld: true }); assert.equal(next.state.hits, 0); assert.equal(next.state.player.attackPhase, 'ready');
  next.step({ ...idle, attackHeld: true }); assert.equal(next.state.player.attackPhase, 'startup');
  const rifle = dummy('weapon_01'); rifle.state.player.ammo = 5; rifle.step({ ...idle, reloadPressed: true }); ticks(rifle, 19);
  const reloading = rifle.captureCarry(); close(reloading.attackCooldown, 40 / 60); assert.equal(reloading.ammo, 5);
  const resumed = dummy('weapon_01'); resumed.restoreCarry(reloading);
  ticks(resumed, 40, { attackHeld: true }); assert.equal(resumed.state.player.ammo, 5); assert.equal(resumed.state.player.reloadRemaining, 0);
  resumed.step({ ...idle, attackHeld: true }); assert.equal(resumed.state.player.attackPhase, 'startup');
  const hurt = encounter(); hitWithBoxer(hurt); const hurtCarry = hurt.captureCarry(); assert.ok(hurtCarry.hurtRemaining > 0);
  const protectedNext = encounter(); protectedNext.restoreCarry(hurtCarry); assert.equal(hitWithBoxer(protectedNext), 0);
});
