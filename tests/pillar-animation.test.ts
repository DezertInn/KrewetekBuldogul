import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { samplePillarPose, twoBoneJoint, type PillarPose } from '../src/presentation/pillar-animation';

const transforms = ({ phase: _phase, progress: _progress, ...pose }: PillarPose) => pose;
const vector = (value: { x: number; y: number; z: number }) => new Vector3(value.x, value.y, value.z);
function nearTransforms(a: PillarPose, b: PillarPose): void {
  const numbers = (value: unknown): number[] => typeof value === 'number' ? [value]
    : value && typeof value === 'object' ? Object.values(value).flatMap(numbers) : [];
  const left = numbers(transforms(a)), right = numbers(transforms(b));
  assert.equal(left.length, right.length);
  assert.ok(left.every((value, i) => Math.abs(value - right[i]) < 1e-10), 'pose boundaries match within floating-point precision');
}

test('pillar poses join continuously through preparation, contact, follow-through and ready', () => {
  nearTransforms(samplePillarPose('ready', 0), samplePillarPose('startup', 0));
  nearTransforms(samplePillarPose('startup', 1), samplePillarPose('active', 0));
  nearTransforms(samplePillarPose('active', 1), samplePillarPose('recovery', 0));
  nearTransforms(samplePillarPose('recovery', 1), samplePillarPose('ready', 0));
  const before = samplePillarPose('recovery', 0.16 - 1e-7);
  const after = samplePillarPose('recovery', 0.16 + 1e-7);
  assert.ok(Vector3.Distance(vector(before.weapon.position), vector(after.weapon.position)) < 1e-6);
  const loaded = samplePillarPose('startup', 1), struck = samplePillarPose('active', 1);
  assert.ok(struck.body.rotation.y - loaded.body.rotation.y > 0.6, 'hips visibly transfer weight during the swing');
  assert.ok(struck.torso.y - loaded.torso.y > 0.4, 'shoulders contribute independently of the hips');
  assert.ok(Vector3.Distance(vector(loaded.weapon.position), vector(struck.weapon.position)) > 0.5, 'weapon grip sweeps across the body');
  assert.ok(samplePillarPose('recovery', 0.16).body.height < struck.body.height, 'follow-through settles before resetting');
});

test('both grips stay reachable by fixed-length articulated arms throughout the entire attack', () => {
  for (const phase of ['ready', 'startup', 'active', 'recovery'] as const) {
    for (let index = 0; index <= 100; index++) {
      const pose = samplePillarPose(phase, index / 100);
      const matrix = Matrix.Compose(Vector3.One(), Quaternion.FromEulerAngles(pose.weapon.rotation.x, pose.weapon.rotation.y, pose.weapon.rotation.z), vector(pose.weapon.position));
      for (const [side, height] of [[-1, 0.22], [1, -0.12]]) {
        const shoulder = new Vector3(side * 0.35, 1.26, 0);
        const grip = Vector3.TransformCoordinates(new Vector3(0, height, 0), matrix);
        const elbow = vector(twoBoneJoint(shoulder, grip, 0.44, 0.48, { x: side, y: -0.65, z: -0.4 }));
        assert.ok(Math.abs(Vector3.Distance(shoulder, elbow) - 0.44) < 1e-7, `${phase}/${index}: upper arm length`);
        assert.ok(Math.abs(Vector3.Distance(elbow, grip) - 0.48) < 1e-7, `${phase}/${index}: forearm length and exact grip`);
      }
    }
  }
});

test('pose sampling is independent of frame count and does not mutate previously sampled poses', () => {
  const pose = samplePillarPose('active', 0.5);
  const original = structuredClone(pose);
  for (let i = 0; i < 200; i++) samplePillarPose('recovery', i / 200);
  assert.deepEqual(pose, original);
  assert.deepEqual(samplePillarPose('active', 0.5), original);
  assert.deepEqual(transforms(samplePillarPose('startup', -1)), transforms(samplePillarPose('startup', 0)));
  nearTransforms(samplePillarPose('recovery', 2), samplePillarPose('ready', 0));
});
