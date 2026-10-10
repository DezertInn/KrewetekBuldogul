import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createPlayerCarry, type PlayerCarry, type UpgradeId } from '../src/game/upgrades';
import type { WeaponId } from '../src/game/types';
import { M4_ROOMS, reachableM4Point, validateM4Content } from '../src/run/m4-content';
import { M4RunDirector, validateM4RunCheckpoint, type M4RunCheckpoint, type M4RunSimulation } from '../src/run/m4-director';
import { RUN_STAGES } from '../src/run/content';

function fixture(checkpoint: M4RunCheckpoint, outcome: M4RunSimulation['state']['outcome'] = 'complete', seconds = 5, carry: PlayerCarry = checkpoint.carry): M4RunSimulation {
  return { state: { weapon: checkpoint.weapon, outcome, time: seconds }, captureCarry: () => structuredClone(carry) };
}
function firstReward(weapon: WeaponId = 'weapon_02', seed = 7): M4RunDirector {
  const director = new M4RunDirector(); director.start(weapon, seed);
  director.completeEncounter(fixture(director.checkpoint)); director.advanceRoom();
  director.completeEncounter(fixture(director.checkpoint)); return director;
}

test('actual B01 topology introduces roles in six distinct reachable rooms, independently of M3', () => {
  assert.deepEqual(validateM4Content(), []);
  assert.deepEqual(M4_ROOMS.map(stage => stage.levelId), ['B01L01', 'B01L01', 'B01L02', 'B01L02', 'B01L03', 'B01L03']);
  assert.deepEqual(M4_ROOMS.map(stage => stage.enemyDefinitions.length), [3, 4, 4, 5, 5, 1]);
  assert.equal(new Set(M4_ROOMS.map(stage => JSON.stringify(stage.room.obstacles))).size, 6);
  assert.ok(M4_ROOMS.every(stage => RUN_STAGES.every(legacy => legacy.id !== stage.id && legacy.levelId !== stage.levelId && legacy.roomId !== stage.roomId && legacy.encounterId !== stage.encounterId)));
  for (const stage of M4_ROOMS) {
    for (const radius of [.34, .36, .4, .44, .65]) {
      assert.ok(reachableM4Point(stage.room.playerSpawn!, stage.room.exit!, radius, stage.room));
      for (const enemy of stage.enemyDefinitions) assert.ok(reachableM4Point(stage.room.playerSpawn!, enemy.position, radius, stage.room), `${stage.id}/${enemy.id} radius ${radius}`);
    }
  }
  const coach = M4_ROOMS.at(-1)!;
  assert.deepEqual(coach.enemyDefinitions.map(enemy => enemy.archetype), ['B01_M01']);
  assert.ok(coach.room.halfWidth > M4_ROOMS[0].room.halfWidth);
});

test('content rejects blocked, stranded, overlapping, unsafe or premature spawns and route corruption', () => {
  const blocked = structuredClone(M4_ROOMS); blocked[0].enemyDefinitions = [{ id: 'blocked', archetype: 'B01_E01', position: { x: -5.8, z: 1.7 } }, ...blocked[0].enemyDefinitions.slice(1)];
  assert.ok(validateM4Content(blocked).some(error => error.includes('Blocked spawn')));
  const stranded = structuredClone(M4_ROOMS); stranded[0].room.obstacles.push({ id: 'divider', x: 0, z: 0, width: 16, depth: 1, height: 1 });
  assert.ok(validateM4Content(stranded).some(error => error.includes('Unreachable')));
  const unsafe = structuredClone(M4_ROOMS); unsafe[0].enemyDefinitions = unsafe[0].enemyDefinitions.map((enemy, index) => ({ ...enemy, position: index < 2 ? { x: 0, z: -4 } : enemy.position }));
  const unsafeErrors = validateM4Content(unsafe); assert.ok(unsafeErrors.some(error => error.includes('Unsafe'))); assert.ok(unsafeErrors.some(error => error.includes('Overlapping')));
  const early = structuredClone(M4_ROOMS); early[0].enemyDefinitions = early[0].enemyDefinitions.map(enemy => ({ ...enemy, archetype: 'B01_E03' }));
  assert.ok(validateM4Content(early).some(error => error.includes('too early')));
  const badIds = structuredClone(M4_ROOMS); badIds[1].roomId = badIds[0].roomId;
  assert.ok(validateM4Content(badIds).some(error => error.includes('Duplicate')));
});

test('every weapon traverses five ordinary encounters and Coach with exactly two choices, no heal or final offer', () => {
  for (const weapon of ['weapon_01', 'weapon_02', 'weapon_03'] as const) {
    const director = new M4RunDirector(); director.start(weapon, 99);
    assert.deepEqual(director.checkpoint.carry, createPlayerCarry(weapon));
    const choices: UpgradeId[] = [];
    for (let roomIndex = 0; roomIndex < 6; roomIndex++) {
      assert.equal(director.stage.id, M4_ROOMS[roomIndex].id);
      const before = director.checkpoint;
      const carry = structuredClone(before.carry); carry.health = 73; carry.ammo = weapon === 'weapon_01' ? 3 : 0;
      const cp = director.completeEncounter(fixture(before, 'complete', 4, carry));
      assert.equal(validateM4RunCheckpoint(cp), true);
      assert.deepEqual(director.completeEncounter(fixture(cp)), cp, 'one completion settlement');
      assert.equal(cp.carry.health, 73); assert.equal(cp.carry.ammo, carry.ammo);
      if (roomIndex % 2 === 0) {
        assert.equal(cp.phase, 'cleared'); assert.deepEqual(cp.offer, []); assert.equal(cp.rewards.length, Math.floor(roomIndex / 2));
        director.advanceRoom();
      } else if (roomIndex < 5) {
        assert.equal(cp.phase, 'reward'); assert.equal(cp.offer.length, 3); assert.equal(new Set(cp.offer).size, 3);
        assert.ok(cp.offer.every(id => !choices.includes(id)));
        choices.push(cp.offer[0]); director.chooseUpgrade(cp.offer[0]);
      } else {
        assert.equal(cp.phase, 'results'); assert.equal(cp.outcome, 'victory'); assert.equal(cp.rewards.length, 2); assert.deepEqual(cp.offer, []);
      }
      assert.equal(validateM4RunCheckpoint(director.checkpoint), true);
      assert.equal(director.checkpoint.carry.health, 73, 'no level/boss heal');
    }
    assert.deepEqual(director.summary!.upgrades, choices);
    assert.equal(director.summary!.cleared, 6); assert.equal(director.summary!.level, 3); assert.equal(director.summary!.room, 2); assert.equal(director.summary!.activeSeconds, 24);
    assert.throws(() => director.advanceRoom(), /locked/); assert.throws(() => director.chooseUpgrade(choices[0]), /pending/);
    director.start(weapon, 2); assert.equal(director.summary!.cleared, 0); assert.deepEqual(director.checkpoint.carry, createPlayerCarry(weapon));
  }
});

test('cleared room resume stays settled, traversal carries simulation timers and time, and exit gates cannot skip fights/rewards', () => {
  const director = new M4RunDirector(); director.start('weapon_01', 10);
  assert.throws(() => director.advanceRoom(), /locked/);
  assert.throws(() => director.completeEncounter(fixture(director.checkpoint, 'playing')), /incomplete/);
  const carry = structuredClone(director.checkpoint.carry); carry.health = 41; carry.ammo = 7; carry.dashCooldown = .8; carry.attackCooldown = .9; carry.hurtRemaining = .2;
  const sim = fixture(director.checkpoint, 'complete', 11, carry);
  const cleared = director.completeEncounter(sim);
  assert.equal(cleared.phase, 'cleared'); assert.equal(cleared.clearedRooms.length, 1);
  const resumed = new M4RunDirector(); resumed.resume(cleared);
  assert.deepEqual(resumed.completeEncounter(fixture(cleared)), cleared);
  const traversed = structuredClone(carry); traversed.dashCooldown = .2; traversed.attackCooldown = .3; traversed.hurtRemaining = 0;
  sim.state.time = 11.6; sim.captureCarry = () => structuredClone(traversed);
  director.updateFrom(sim); director.updateFrom(sim);
  const next = director.advanceRoom(sim);
  assert.equal(next.roomIndex, 1); assert.deepEqual(next.carry, traversed); assert.equal(next.activeSeconds, 11.6); assert.equal(validateM4RunCheckpoint(next), true);
  const newSim = fixture(resumed.checkpoint, 'complete', .6, traversed); resumed.advanceRoom(newSim);
  assert.deepEqual(resumed.checkpoint.carry, next.carry); assert.equal(resumed.summary!.activeSeconds, 11.6);
  director.completeEncounter(fixture(next)); assert.throws(() => director.advanceRoom(), /locked/);
  assert.throws(() => director.updateFrom(fixture(director.checkpoint)), /not active/);
});

test('reward reloads retain generated choices and future RNG; snapshots cannot mutate director or room content', () => {
  const director = firstReward('weapon_03', 123);
  const cp = director.checkpoint;
  const resumed = new M4RunDirector(); resumed.resume(cp);
  assert.deepEqual(resumed.checkpoint, cp);
  cp.offer.reverse(); assert.notDeepEqual(resumed.checkpoint.offer, cp.offer);
  const stage = director.stage; stage.room.obstacles.length = 0; assert.ok(director.stage.room.obstacles.length > 0);
  const chosen = director.checkpoint.offer[1]; director.chooseUpgrade(chosen); resumed.chooseUpgrade(chosen);
  for (const active of [director, resumed]) { active.completeEncounter(fixture(active.checkpoint)); active.advanceRoom(); active.completeEncounter(fixture(active.checkpoint)); }
  assert.deepEqual(resumed.checkpoint.offer, director.checkpoint.offer); assert.equal(resumed.checkpoint.rngState, director.checkpoint.rngState);
  assert.equal(director.checkpoint.rewards[0].choices.length, 3);
  assert.throws(() => director.chooseUpgrade(chosen), /unavailable/);
  const next = director.chooseUpgrade(director.checkpoint.offer[0]); assert.equal(next.roomIndex, 4); assert.equal(next.carry.upgrades.owned.length, 2);
  assert.throws(() => director.chooseUpgrade(next.carry.upgrades.owned[1]), /pending/);
});

test('remaining barrier, Impact, action and hurt timers survive level choice and two room boundaries without renewal', () => {
  let director = firstReward('weapon_01', 0);
  for (let seed = 1; !director.checkpoint.offer.includes('SRC_SKLODOWSKA_02') && seed < 100; seed++) director = firstReward('weapon_01', seed);
  assert.ok(director.checkpoint.offer.includes('SRC_SKLODOWSKA_02'));
  director.chooseUpgrade('SRC_SKLODOWSKA_02');
  const carry = structuredClone(director.checkpoint.carry);
  carry.health = 34; carry.ammo = 2; carry.barrier = 6; carry.dashCooldown = .9; carry.attackCooldown = 1.1; carry.hurtRemaining = .2;
  carry.upgrades.impact = .63; carry.upgrades.barrierRemaining = 2.3;
  director.completeEncounter(fixture(director.checkpoint, 'complete', 6, carry));
  director.advanceRoom(); assert.deepEqual(director.checkpoint.carry, carry);
  director.completeEncounter(fixture(director.checkpoint, 'complete', 4, carry));
  const chosen = director.checkpoint.offer[0]; director.chooseUpgrade(chosen);
  assert.deepEqual({ ...director.checkpoint.carry, upgrades: { ...director.checkpoint.carry.upgrades, owned: carry.upgrades.owned } }, carry);
  const resumed = new M4RunDirector(); resumed.resume(director.checkpoint); assert.deepEqual(resumed.checkpoint.carry, director.checkpoint.carry);
});

test('defeat and abandonment settle each legal phase once without resumable results', () => {
  for (const roomIndex of [0, 1, 2, 3, 4, 5]) {
    const director = new M4RunDirector(); director.start('weapon_02', 8);
    while (director.checkpoint.roomIndex < roomIndex) { director.completeEncounter(fixture(director.checkpoint)); if (director.phase === 'cleared') director.advanceRoom(); else director.chooseUpgrade(director.checkpoint.offer[0]); }
    const dead = structuredClone(director.checkpoint.carry); dead.health = 0;
    const defeated = director.completeEncounter(fixture(director.checkpoint, 'defeat', 3, dead));
    assert.equal(defeated.outcome, 'defeat'); assert.equal(validateM4RunCheckpoint(defeated), true);
    assert.deepEqual(director.abandon(), defeated); assert.throws(() => new M4RunDirector().resume(defeated), /finished/);
  }
  for (const phase of ['encounter', 'cleared', 'reward'] as const) {
    const director = new M4RunDirector(); director.start('weapon_03', 11);
    if (phase !== 'encounter') director.completeEncounter(fixture(director.checkpoint));
    if (phase === 'reward') { director.advanceRoom(); director.completeEncounter(fixture(director.checkpoint)); }
    const ended = director.abandon(); assert.equal(validateM4RunCheckpoint(ended), true); assert.equal(ended.outcome, 'abandoned'); assert.deepEqual(director.abandon(), ended);
  }
});

test('M4 checkpoint rejects identity, phase, settlement, carry, seeded-offer and unknown-key corruption', () => {
  const cp = firstReward().checkpoint; assert.equal(validateM4RunCheckpoint(cp), true);
  const corruptions: ((value: M4RunCheckpoint) => void)[] = [
    value => { value.roomIndex = 5; }, value => { value.roomId = 'M3_ROOM_01'; }, value => { value.levelId = 'B02L01'; }, value => { value.encounterId = 'wrong'; },
    value => { value.phase = 'cleared'; }, value => { value.phase = 'encounter'; }, value => { value.clearedRooms.pop(); }, value => { value.clearedRooms[1] = value.clearedRooms[0]; },
    value => { value.offer.reverse(); }, value => { value.rewards[0].choices.reverse(); }, value => { value.rewards[0].levelId = 'B01L03'; }, value => { value.rewards[0].selected = value.offer[0]; },
    value => { value.rngState++; }, value => { value.seed++; }, value => { value.carry.health = 0; }, value => { value.carry.ammo = 1; }, value => { value.carry.upgrades.owned.push(value.offer[0]); },
    value => { value.activeSeconds = Infinity; }, value => { value.runId = '../private'; }, value => { Object.assign(value, { unknown: true }); },
  ];
  for (const corrupt of corruptions) { const invalid = structuredClone(cp); corrupt(invalid); assert.equal(validateM4RunCheckpoint(invalid), false); }
});
