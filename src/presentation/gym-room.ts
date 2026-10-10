import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { Room, Vec2 } from '../game/types';
import { sculpt } from './sculpt';

export interface GymRoomView {
  root: TransformNode;
  textures: DynamicTexture[];
  occluders: { meshes: Mesh[]; position: Vec2; width: number; depth: number; height: number }[];
  exit: TransformNode | null;
  exitLock: Mesh | null;
  exitArrow: Mesh | null;
}

/** Authored reusable 3D gym kit, assembled from the simulation's room footprints. */
export function buildGymRoom(scene: Scene, room: Room, material: (name: string, hex: string, alpha?: number) => StandardMaterial): GymRoomView {
  const meta = room as Room & { id?: string; name?: string; levelName?: string; theme?: string; exit?: Vec2; playerSpawn?: Vec2 };
  const root = new TransformNode(`gym-room-${meta.id ?? 'practice'}`, scene);
  const textures: DynamicTexture[] = [], occluders: GymRoomView['occluders'] = [];
  const theme = meta.theme ?? 'warmup';
  const floor = material(`gym-${theme}-floor`, theme === 'ring' ? '#334B61' : theme === 'bags' ? '#465A5D' : '#537E80');
  const mat = material(`gym-${theme}-canvas`, theme === 'ring' ? '#637B91' : theme === 'bags' ? '#677C75' : '#91ADA0');
  const ink = material('gym-structural-ink', '#263442'), cream = material('gym-plaster', '#D9CEB4');
  const wood = material('gym-warm-wood', '#B77C50'), red = material('gym-vinyl-coral', '#BC655B');
  const paint = material('gym-lane-paint', '#C1CFC1'), metal = material('gym-muted-metal', '#536470');
  const staticMeshes: Mesh[] = [];
  const place = (mesh: Mesh, mat: StandardMaterial, x: number, y: number, z: number, parent: TransformNode = root): Mesh => {
    mesh.parent = parent; mesh.material = mat; mesh.position.set(x, y, z); mesh.isPickable = false; staticMeshes.push(mesh); return mesh;
  };
  const box = (name: string, width: number, height: number, depth: number, mat: StandardMaterial, x: number, y: number, z: number, parent = root): Mesh =>
    place(MeshBuilder.CreateBox(name, { width, height, depth }, scene), mat, x, y, z, parent);
  const cylinder = (name: string, diameter: number, height: number, mat: StandardMaterial, x: number, y: number, z: number, parent = root, top = diameter): Mesh =>
    place(MeshBuilder.CreateCylinder(name, { diameterBottom: diameter, diameterTop: top, height, tessellation: 12 }, scene), mat, x, y, z, parent);
  const torus = (name: string, diameter: number, mat: StandardMaterial, x: number, z: number): Mesh => {
    const mesh = place(MeshBuilder.CreateTorus(name, { diameter, thickness: 0.024, tessellation: 32 }, scene), mat, x, 0.056, z); mesh.scaling.y = 0.16; return mesh;
  };
  const label = (name: string, title: string, subtitle: string, width: number, x: number, y: number, z: number): void => {
    const texture = new DynamicTexture(name, { width: 1024, height: 256 }, scene, false); textures.push(texture);
    const context = texture.getContext() as CanvasRenderingContext2D;
    context.fillStyle = '#D9CEB4'; context.fillRect(0, 0, 1024, 256); context.fillStyle = '#263442'; context.textAlign = 'center';
    context.font = 'bold 88px sans-serif'; context.fillText(title, 512, 115, 950);
    context.font = 'bold 30px sans-serif'; context.fillText(subtitle, 512, 190, 950);
    context.fillStyle = '#BC655B'; context.fillRect(64, 218, 896, 6); texture.update();
    const surface = material(`room-label-${name}`, '#FFFFFF'); surface.diffuseTexture = texture;
    place(MeshBuilder.CreatePlane(name, { width, height: width / 4 }, scene), surface, x, y, z);
  };
  const w = room.halfWidth, d = room.halfDepth;
  box('gym-raised-foundation', w * 2 + 0.5, 0.34, d * 2 + 0.5, ink, 0, -0.23, 0);
  box('gym-floor-rim', w * 2 + 0.16, 0.10, d * 2 + 0.16, wood, 0, -0.052, 0);
  box('quiet-combat-floor', w * 2, 0.08, d * 2, floor, 0, -0.005, 0);
  for (let x = -w + 2; x < w; x += 2) box('broad-floor-seam', 0.012, 0.003, d * 2, ink, x, 0.037, 0);
  for (let z = -d + 2; z < d; z += 2) box('broad-floor-seam', w * 2, 0.003, 0.012, ink, 0, 0.037, z);
  if (theme === 'warmup') {
    for (const side of [-1, 1]) {
      box('warmup-canvas-lane', w * 0.62, 0.012, d * 1.34, mat, side * w * 0.39, 0.041, 0);
      box('warmup-long-lane-marker', 0.05, 0.005, d * 1.14, paint, side * w * 0.39, 0.05, 0);
      for (let z = -d * 0.45; z <= d * 0.45; z += 1.8) box('warmup-footwork-rung', w * 0.4, 0.005, 0.045, paint, side * w * 0.39, 0.051, z);
    }
  } else if (theme === 'bags') {
    box('baghall-central-mat', w * 1.37, 0.012, d * 1.5, mat, 0, 0.042, 0);
    for (const side of [-1, 1]) for (const z of [-d * 0.4, d * 0.35]) torus('baghall-footwork-circle', 1.45, paint, side * w * 0.45, z);
  } else {
    box('main-ring-canvas-edge', w * 1.6, 0.012, d * 1.62, cream, 0, 0.04, 0);
    box('main-ring-canvas', w * 1.55, 0.012, d * 1.57, mat, 0, 0.05, 0);
    torus('ring-center-circle', Math.min(w, d) * 0.8, paint, 0, 0);
    for (const side of [-1, 1]) {
      box('ring-floor-boundary', w * 1.47, 0.007, 0.045, paint, 0, 0.061, side * d * 0.72);
      box('ring-floor-boundary', 0.045, 0.007, d * 1.44, paint, side * w * 0.73, 0.061, 0);
    }
  }
  const back = box('gym-back-plaster', w * 2 + 0.15, 2.8, 0.18, cream, 0, 1.4, d + 0.09);
  const left = box('gym-side-plaster', 0.18, 2.8, d * 2, cream, -w - 0.09, 1.4, 0);
  box('back-wall-vinyl', w * 2, 0.9, 0.08, red, 0, 0.45, d - 0.005);
  box('side-wall-vinyl', 0.08, 0.9, d * 2, red, -w + 0.005, 0.45, 0);
  box('back-wall-datum', w * 2, 0.045, 0.085, ink, 0, 0.98, d - 0.01);
  box('side-wall-datum', 0.085, 0.045, d * 2, ink, -w + 0.01, 0.98, 0);
  box('near-edge-collision-marker', w * 2, 0.09, 0.10, cream, 0, 0.045, -d - 0.05);
  box('right-edge-collision-marker', 0.10, 0.09, d * 2, cream, w + 0.05, 0.045, 0);
  for (const side of [-1, 1]) {
    const x = side * w * 0.63;
    box('window-recess', w * 0.44, 1.18, 0.1, ink, x, 1.9, d - 0.055);
    box('window-warm-plane', w * 0.42, 1.04, 0.025, material('gym-window', '#E1B77D'), x, 1.9, d - 0.12);
    box('window-middle-mullion', 0.055, 1.06, 0.035, metal, x, 1.9, d - 0.14);
    box('window-horizontal-mullion', w * 0.42, 0.055, 0.035, metal, x, 1.9, d - 0.145);
    box('window-ledge', w * 0.47, 0.075, 0.21, cream, x, 1.31, d - 0.08);
  }
  label('gym-title', theme === 'ring' ? 'GŁÓWNY RING' : theme === 'bags' ? 'SALA WORKÓW' : 'ROZGRZEWKA', 'DOBRA FORMA / DOBRY HUMOR', Math.min(4.2, w * 0.78), 0, 2.02, d - 0.11);
  // Tall decoration sits beyond the gameplay wall, never inventing cover or hazards.
  for (let z = -d * 0.5; z <= d * 0.5; z += 2.3) {
    box('outer-wall-gym-locker', 0.45, 1.55, 0.55, metal, -w - 0.35, 0.775, z);
    box('locker-inset', 0.02, 1.2, 0.43, ink, -w - 0.10, 0.8, z);
    if (theme === 'bags') {
      cylinder('perimeter-hanging-bag', 0.62, 1.28, red, w + 0.45, 1.06, z, root, 0.48);
      cylinder('bag-suspension', 0.025, 0.55, metal, w + 0.45, 1.97, z);
      cylinder('bag-label-wrap', 0.625, 0.15, cream, w + 0.45, 1.15, z);
    }
  }
  // Collider dressing uses the exact footprint, including low bench rifle cover.
  for (const prop of room.obstacles) {
    const propRoot = new TransformNode(`collider-art-${prop.id}`, scene); propRoot.parent = root;
    const start = staticMeshes.length;
    const kind = prop.id.includes('bench') ? 'bench' : prop.id.includes('bag') ? 'bag' : prop.id.includes('post') || prop.id.includes('rope') ? 'post' : 'cabinet';
    if (kind === 'bench') {
      box('bench-authored-seat', prop.width, 0.12, prop.depth, wood, prop.x, prop.height - 0.06, prop.z, propRoot);
      for (const side of [-1, 1]) box('bench-authored-foot', 0.12, Math.max(0.08, prop.height - 0.12), prop.depth * 0.76, metal, prop.x + side * prop.width * 0.36, (prop.height - 0.12) / 2, prop.z, propRoot);
      box('bench-front-edge', prop.width, 0.027, 0.025, cream, prop.x, prop.height - 0.07, prop.z - prop.depth / 2, propRoot);
    } else if (kind === 'bag') {
      box('bag-collider-platform', prop.width, prop.height, prop.depth, ink, prop.x, prop.height / 2, prop.z, propRoot);
      cylinder('weighted-bag-stem', 0.13, 0.46, metal, prop.x, prop.height + 0.23, prop.z, propRoot);
      place(sculpt('contoured-heavy-bag', [{ y: 0, x: 0.20, z: 0.20 }, { y: 0.12, x: 0.31, z: 0.31 }, { y: 1.05, x: 0.28, z: 0.28 }, { y: 1.18, x: 0.20, z: 0.20 }], scene), red, prop.x, prop.height + 0.18, prop.z, propRoot);
      cylinder('heavy-bag-wrap', 0.605, 0.15, cream, prop.x, prop.height + 0.75, prop.z, propRoot);
    } else if (kind === 'post') {
      box('ring-post-footprint', prop.width, prop.height, prop.depth, metal, prop.x, prop.height / 2, prop.z, propRoot);
      box('ring-padded-corner', prop.width * 0.92, Math.max(0.16, prop.height * 0.48), prop.depth * 0.92, red, prop.x, prop.height * 0.67, prop.z, propRoot);
    } else {
      box('cabinet-authored-footprint', prop.width, prop.height, prop.depth, red, prop.x, prop.height / 2, prop.z, propRoot);
      box('cabinet-solid-top', prop.width, 0.07, prop.depth, wood, prop.x, prop.height - 0.035, prop.z, propRoot);
      const count = Math.max(1, Math.floor(prop.width / 0.65));
      for (let i = 0; i < count; i++) {
        const x = prop.x + (i + 0.5) * prop.width / count - prop.width / 2;
        box('cabinet-raised-door', prop.width / count - 0.06, prop.height * 0.75, 0.018, cream, x, prop.height * 0.47, prop.z - prop.depth / 2 - 0.012, propRoot);
        box('cabinet-handle', 0.04, 0.15, 0.04, metal, x + 0.12, prop.height * 0.56, prop.z - prop.depth / 2 - 0.035, propRoot);
      }
    }
    const propGroups = new Map<StandardMaterial, Mesh[]>();
    for (const mesh of staticMeshes.slice(start)) {
      mesh.computeWorldMatrix(true); const mat = mesh.material as StandardMaterial;
      const list = propGroups.get(mat) ?? []; list.push(mesh); propGroups.set(mat, list);
    }
    const propMeshes: Mesh[] = [];
    for (const meshes of propGroups.values()) {
      const merged = meshes.length > 1 ? Mesh.MergeMeshes(meshes, true, true) : meshes[0];
      if (merged) { merged.parent = propRoot; merged.isPickable = false; propMeshes.push(merged); }
    }
    staticMeshes.splice(start, staticMeshes.length - start, ...propMeshes);
    occluders.push({ meshes: propMeshes, position: { x: prop.x, z: prop.z }, width: prop.width, depth: prop.depth, height: Math.max(prop.height, kind === 'bag' ? 1.8 : 0) });
  }
  const spawn = meta.playerSpawn ?? { x: 0, z: -2.5 }; torus('preparation-floor-ring', 1.65, paint, spawn.x, spawn.z);
  let exit: TransformNode | null = null, exitLock: Mesh | null = null, exitArrow: Mesh | null = null;
  if (meta.exit) {
    exit = new TransformNode('room-exit-marker', scene); exit.parent = root; exit.position.set(meta.exit.x, 0.08, meta.exit.z);
    box('exit-threshold', 1.2, 0.012, 0.7, paint, 0, 0, 0, exit);
    exitArrow = place(sculpt('exit-arrow-volume', [{ y: 0, x: 0.18, z: 0.25 }, { y: 0.05, x: 0.18, z: 0.25 }], scene, 3), material('gym-exit-open', '#F5D66D'), 0, 0.04, 0, exit); exitArrow.rotation.y = Math.PI;
    exitLock = box('exit-closed-bracket', 0.55, 0.08, 0.07, ink, 0, 0.04, 0, exit);
    cylinder('exit-left-post', 0.11, 0.6, metal, -0.61, 0.30, 0.23, exit); cylinder('exit-right-post', 0.11, 0.6, metal, 0.61, 0.30, 0.23, exit);
  }
  // Static scenery is batched by material. Fading props and exit states stay independent.
  const independent = new Set([...occluders.flatMap(item => item.meshes), ...exit?.getChildMeshes() ?? [], back, left]);
  const groups = new Map<StandardMaterial, Mesh[]>();
  for (const mesh of staticMeshes) if (!independent.has(mesh) && mesh.material) {
    mesh.computeWorldMatrix(true); const mat = mesh.material as StandardMaterial; const list = groups.get(mat) ?? []; list.push(mesh); groups.set(mat, list);
  }
  for (const [mat, meshes] of groups) {
    const merged = meshes.length > 1 ? Mesh.MergeMeshes(meshes, true, true) : meshes[0];
    if (merged) { merged.name = `batched-${theme}-${mat.name}`; merged.parent = root; merged.isPickable = false; merged.freezeWorldMatrix(); }
  }
  return { root, textures, occluders, exit, exitLock, exitArrow };
}
