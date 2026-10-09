import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createPlayerCarry, type PlayerCarry, type UpgradeId } from '../src/game/upgrades';
import type { WeaponId } from '../src/game/types';
import { RUN_STAGES, validateRunContent } from '../src/run/content';
import { RunDirector, validateRunCheckpoint, type RunCheckpoint, type RunSimulation } from '../src/run/director';

function fixture(checkpoint: RunCheckpoint, outcome: RunSimulation['state']['outcome'] = 'complete', seconds = 12): RunSimulation {
  const carry = structuredClone(checkpoint.carry);
  return { state: { time: seconds, weapon: checkpoint.weapon, outcome }, captureCarry: () => structuredClone(carry) };
}
function pending(weapon: WeaponId = 'weapon_02', seed = 123): RunDirector {
  const director = new RunDirector(); director.start(weapon, seed); director.completeEncounter(fixture(director.checkpoint)); return director;
}

test('M3 route contains three distinct valid one-room/one-encounter stages with safe spawns', () => {
  assert.equal(RUN_STAGES.length, 3); assert.deepEqual(validateRunContent(), []);
  assert.equal(new Set(RUN_STAGES.map(stage => JSON.stringify(stage.spawns))).size, RUN_STAGES.length);
  const invalid = structuredClone(RUN_STAGES); invalid[1].spawns = [{ x: -4.6, z: 1.3 }];
  assert.ok(validateRunContent(invalid).some(error => error.includes('Blocked')));
});

test('all weapons traverse exactly three stages, two distinct offers and no final reward', () => {
  for (const weapon of ['weapon_01', 'weapon_02', 'weapon_03'] as const) {
    const director = new RunDirector(); director.start(weapon, 77);
    assert.deepEqual(director.checkpoint.carry, createPlayerCarry(weapon));
    const chosen: UpgradeId[] = [];
    for (let index = 0; index < RUN_STAGES.length; index++) {
      assert.equal(director.stage.id, RUN_STAGES[index].id);
      assert.equal(director.checkpoint.stageIndex, index);
      const completed = director.completeEncounter(fixture(director.checkpoint, 'complete', 5 + index));
      assert.equal(validateRunCheckpoint(completed), true);
      assert.deepEqual(director.completeEncounter(fixture(completed)), completed, 'completion does not settle twice');
      if (index < RUN_STAGES.length - 1) {
        assert.equal(completed.phase, 'reward'); assert.equal(completed.offer.length, 3);
        assert.equal(new Set(completed.offer).size, 3); assert.ok(completed.offer.every(id => !chosen.includes(id)));
        chosen.push(completed.offer[0]); director.chooseUpgrade(completed.offer[0]);
      } else {
        assert.equal(completed.phase, 'results'); assert.equal(completed.outcome, 'victory');
        assert.deepEqual(completed.offer, []); assert.equal(completed.rewards.length, 2);
      }
    }
    assert.equal(director.summary!.stageReached, 3); assert.equal(director.summary!.activeSeconds, 18);
    assert.deepEqual(director.summary!.upgrades, chosen);
    director.start(weapon, 9);
    assert.equal(director.checkpoint.phase, 'encounter'); assert.deepEqual(director.checkpoint.carry, createPlayerCarry(weapon));
    assert.deepEqual(director.checkpoint.rewards, []); assert.equal(director.summary!.activeSeconds, 0);
  }
});

test('objective and offer gates cannot be bypassed or a choice duplicated', () => {
  const director = new RunDirector(); director.start('weapon_03', 3);
  assert.throws(() => director.completeEncounter(fixture(director.checkpoint, 'playing')), /incomplete/);
  assert.throws(() => director.chooseUpgrade('SRC_GOD_03'), /pending/);
  director.completeEncounter(fixture(director.checkpoint));
  const checkpoint = director.checkpoint;
  const invalid = ['SRC_GOD_03', 'SRC_FATHERLAND_01', 'SRC_EAGLE_02', 'SRC_STREETS_03', 'SRC_CHOPIN_02', 'SRC_SKLODOWSKA_02', 'SRC_KOPERNIK_03'].find(id => !checkpoint.offer.includes(id as UpgradeId)) as UpgradeId;
  assert.throws(() => director.chooseUpgrade(invalid), /unavailable/);
  director.chooseUpgrade(checkpoint.offer[0]);
  assert.throws(() => director.chooseUpgrade(checkpoint.offer[0]), /pending/);
});

test('resume preserves one seeded offer and future RNG selection, unaffected by outside mutation', () => {
  const director = pending(); const original = director.checkpoint;
  const resumed = new RunDirector(); resumed.resume(original);
  assert.deepEqual(resumed.checkpoint, original);
  original.offer.reverse(); assert.notDeepEqual(resumed.checkpoint.offer, original.offer, 'snapshot cannot mutate live director');
  const chosen = resumed.checkpoint.offer[1]; director.chooseUpgrade(chosen); resumed.chooseUpgrade(chosen);
  director.completeEncounter(fixture(director.checkpoint)); resumed.completeEncounter(fixture(resumed.checkpoint));
  assert.deepEqual(resumed.checkpoint.offer, director.checkpoint.offer); assert.equal(resumed.checkpoint.rngState, director.checkpoint.rngState);
  const sameSeed = pending('weapon_02', 123); assert.deepEqual(sameSeed.checkpoint.offer, director.checkpoint.rewards[0].choices);
});

test('carry transfers damage, ammunition, fractional credit, protection and remaining times without renewal', () => {
  let director = pending('weapon_01', 0);
  for (let seed = 1; !director.checkpoint.offer.includes('SRC_SKLODOWSKA_02') && seed < 100; seed++) director = pending('weapon_01', seed);
  assert.ok(director.checkpoint.offer.includes('SRC_SKLODOWSKA_02'));
  director.chooseUpgrade('SRC_SKLODOWSKA_02');
  const carry = structuredClone(director.checkpoint.carry);
  carry.health = 38.5; carry.ammo = 4; carry.dashCooldown = .7; carry.attackCooldown = .8; carry.hurtRemaining = .2;
  // Fractional/timed values are valid only for owned upgrades; test the generic carry
  // through an owned effect rather than manufacturing an incompatible runtime.
  if (carry.upgrades.owned.includes('SRC_SKLODOWSKA_02')) { carry.barrier = 6; carry.upgrades.impact = .43; carry.upgrades.barrierRemaining = 2.4; }
  if (carry.upgrades.owned.includes('SRC_STREETS_03')) { carry.upgrades.streetRemaining = 1.3; carry.upgrades.streetCooldown = 2.1; }
  const sim = { state: { time: 8, weapon: 'weapon_01' as const, outcome: 'complete' as const }, captureCarry: () => structuredClone(carry) };
  director.updateFrom(sim); director.updateFrom(sim);
  const previousTime = director.summary!.activeSeconds;
  director.completeEncounter(sim); assert.equal(director.summary!.activeSeconds, previousTime);
  const chosen = director.checkpoint.offer[0]; director.chooseUpgrade(chosen);
  const next = director.checkpoint.carry;
  assert.deepEqual({ ...next, upgrades: { ...next.upgrades, owned: carry.upgrades.owned } }, carry);
  const resumed = new RunDirector(); resumed.resume(director.checkpoint);
  assert.deepEqual(resumed.checkpoint.carry, next);
  const nextSim = fixture(resumed.checkpoint, 'playing', 2); resumed.updateFrom(nextSim);
  assert.equal(resumed.summary!.activeSeconds, previousTime + 2);
});

test('defeat and abandonment create results with owned-effect summary; finished saves cannot resume', () => {
  const director = pending(); director.chooseUpgrade(director.checkpoint.offer[0]);
  const dead = structuredClone(director.checkpoint.carry); dead.health = 0;
  const sim = { state: { time: 7, weapon: director.checkpoint.weapon, outcome: 'defeat' as const }, captureCarry: () => dead };
  const result = director.completeEncounter(sim);
  assert.equal(result.outcome, 'defeat'); assert.equal(validateRunCheckpoint(result), true);
  assert.equal(director.summary!.upgrades.length, 1); assert.throws(() => new RunDirector().resume(result), /finished/);
  const abandoned = pending(); abandoned.abandon();
  assert.equal(validateRunCheckpoint(abandoned.checkpoint), true); assert.equal(abandoned.summary!.outcome, 'abandoned');
});

test('checkpoint validator rejects route, ownership, reward and numeric corruption', () => {
  const valid = pending().checkpoint; assert.equal(validateRunCheckpoint(valid), true);
  const corruptions: ((value: RunCheckpoint) => void)[] = [
    cp => { cp.stageIndex = 90; }, cp => { cp.activeSeconds = NaN; }, cp => { cp.carry.health = -1; },
    cp => { cp.clearedStages.push(cp.clearedStages[0]); }, cp => { cp.offer[1] = cp.offer[0]; },
    cp => { cp.carry.upgrades.owned.push(cp.offer[0]); }, cp => { cp.rewards[0].selected = cp.offer[0]; },
    cp => { cp.rngState = -1; }, cp => { cp.runId = '../private'; }, cp => { cp.phase = 'encounter'; },
    cp => { cp.weapon = 'weapon_03'; cp.carry.ammo = 20; },
  ];
  for (const corrupt of corruptions) { const value = structuredClone(valid); corrupt(value); assert.equal(validateRunCheckpoint(value), false); }
});
