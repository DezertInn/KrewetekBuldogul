import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleGlovePose } from '../src/presentation/weapon-poses';
import { twoBoneJoint } from '../src/presentation/pillar-animation';

test('all four glove strikes join smoothly and return to the same two-hand guard', () => {
  const numbers = (value: unknown): number[] => typeof value === 'number' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(numbers) : [];
  const near = (a: unknown, b: unknown): void => {
    const first = numbers(a), second = numbers(b); assert.equal(first.length, second.length);
    assert.ok(first.every((value, index) => Math.abs(value - second[index]) < 1e-10));
  };
  for (let combo = 0; combo < 4; combo++) {
    near(sampleGlovePose('startup', 0, combo), sampleGlovePose('ready', 0, combo));
    near(sampleGlovePose('startup', 1, combo), sampleGlovePose('active', 0, combo));
    near(sampleGlovePose('active', 1, combo), sampleGlovePose('recovery', 0, combo));
    near(sampleGlovePose('recovery', 1, combo), sampleGlovePose('ready', 0, combo));
  }
  assert.notDeepEqual(sampleGlovePose('active', 1, 0).hands, sampleGlovePose('active', 1, 2).hands, 'hook has a distinct trajectory from the jab');
  assert.ok(sampleGlovePose('active', 1, 3).hands[1].y > sampleGlovePose('active', 1, 1).hands[1].y, 'rising finisher has a distinct vertical contact');
});

test('glove guard, windup and contact remain reachable without stretching either arm', () => {
  const distance = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  for (let combo = 0; combo < 4; combo++) for (const phase of ['ready', 'startup', 'active', 'recovery'] as const) for (let frame = 0; frame <= 100; frame++) {
    const pose = sampleGlovePose(phase, frame / 100, combo);
    for (let index = 0; index < 2; index++) {
      const side = index === 0 ? -1 : 1, shoulder = { x: side * 0.35, y: 1.26, z: 0 }, hand = pose.hands[index];
      const elbow = twoBoneJoint(shoulder, hand, 0.44, 0.48, { x: side, y: -0.6, z: -0.3 });
      assert.ok(Math.abs(distance(shoulder, elbow) - 0.44) < 1e-8);
      assert.ok(Math.abs(distance(elbow, hand) - 0.48) < 1e-8);
    }
  }
});
