import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { sculpt } from '../src/presentation/sculpt';

test('code-authored volumes have closed surfaces, outward normals and actual three-dimensional bounds', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  try {
    const mesh = sculpt('original-volume-test', [{ y: 0, x: 0.5, z: 0.25 }, { y: 0.6, x: 0.7, z: 0.4 }, { y: 1.2, x: 0.4, z: 0.3 }], scene);
    const indices = mesh.getIndices()!, positions = mesh.getVerticesData(VertexBuffer.PositionKind)!, normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
    const edges = new Map<string, number>();
    for (let triangle = 0; triangle < indices.length; triangle += 3) for (let side = 0; side < 3; side++) {
      const a = indices[triangle + side], b = indices[triangle + (side + 1) % 3], key = a < b ? `${a}/${b}` : `${b}/${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
    assert.ok([...edges.values()].every(count => count === 2), 'every surface edge has two faces, including end caps');
    for (let index = 0; index < positions.length - 6; index += 3) assert.ok(positions[index] * normals[index] + positions[index + 2] * normals[index + 2] > 0, 'side normals point out from the actor volume');
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;
    assert.ok(bounds.maximum.x - bounds.minimum.x > 1 && bounds.maximum.z - bounds.minimum.z > 0.6);
    assert.ok(Math.abs(bounds.maximum.y - bounds.minimum.y - 1.2) < 1e-6);
    assert.equal(mesh.getVerticesData(VertexBuffer.UVKind)!.length, positions.length / 3 * 2, 'authored volumes retain the attribute layout of Babylon primitives');
    const detail = MeshBuilder.CreateBox('standard-detail', { size: 0.2 }, scene);
    const merged = Mesh.MergeMeshes([mesh, detail], true, true);
    assert.ok(merged, 'mixed authored volumes and standard details can be batched into the runtime actor');
    merged.dispose(); assert.equal(scene.meshes.length, 0, 'scene removes disposed authored geometry');
  } finally { scene.dispose(); engine.dispose(); }
});
