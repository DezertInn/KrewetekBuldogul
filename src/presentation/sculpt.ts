import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';

export interface SculptRing { y: number; x: number; z: number; offsetX?: number; offsetZ?: number }

/** Original editable low-poly volumes. Rings describe actual geometry, not sprites. */
export function sculpt(name: string, rings: readonly SculptRing[], scene: Scene, sides = 12): Mesh {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
  const minimum = rings[0].y, height = Math.max(1e-8, rings[rings.length - 1].y - minimum);
  for (const ring of rings) for (let side = 0; side < sides; side++) {
    const angle = side / sides * Math.PI * 2;
    positions.push(Math.sin(angle) * ring.x + (ring.offsetX ?? 0), ring.y, Math.cos(angle) * ring.z + (ring.offsetZ ?? 0));
    uvs.push(side / sides, (ring.y - minimum) / height);
  }
  for (let row = 0; row < rings.length - 1; row++) for (let side = 0; side < sides; side++) {
    const a = row * sides + side, b = row * sides + (side + 1) % sides;
    // Babylon's default left-handed scene uses clockwise outward faces.
    indices.push(a, a + sides, b, b, a + sides, b + sides);
  }
  for (const [row, flip] of [[0, true], [rings.length - 1, false]] as const) {
    const ring = rings[row], center = positions.length / 3;
    positions.push(ring.offsetX ?? 0, ring.y, ring.offsetZ ?? 0);
    uvs.push(0.5, 0.5);
    for (let side = 0; side < sides; side++) {
      const a = row * sides + side, b = row * sides + (side + 1) % sides;
      indices.push(center, ...(flip ? [a, b] : [b, a]));
    }
  }
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uvs;
  const mesh = new Mesh(name, scene); data.applyToMesh(mesh); mesh.isPickable = false;
  return mesh;
}
