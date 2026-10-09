import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Plane } from '@babylonjs/core/Maths/math.plane';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import '@babylonjs/core/Culling/ray';
import { ROOM, RULES } from '../game/config';
import type { GameState, HitEvent, Vec2 } from '../game/types';

// Original, reproducible milestone-1 placeholders. No downloaded assets or shaders.
const PALETTE = {
  ink: '#303D45', plum: '#302D48', teal: '#178F91', floor: '#668C8C',
  mat: '#377C83', cream: '#FFF3DD', plaster: '#D8C9A6', coral: '#BA6659',
  red: '#D93445', gold: '#F4C950', skin: '#E7AC84', hair: '#82482F',
};
type Impact = { root: TransformNode; sparks: Mesh[]; ring: Mesh; age: number };

export class GameView {
  readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: FreeCamera;
  private readonly instrumentation: SceneInstrumentation;
  private readonly materials = new Map<string, StandardMaterial>();
  private readonly staticMeshes: Mesh[] = [];
  private readonly player: TransformNode;
  private readonly body: TransformNode;
  private readonly legs: TransformNode[] = [];
  private readonly arms: TransformNode[] = [];
  private readonly scarf: TransformNode;
  private readonly shadow: Mesh;
  private readonly dummy: TransformNode;
  private readonly dummyBody: TransformNode;
  private readonly dummyMaterial: StandardMaterial;
  private readonly aim: TransformNode;
  private readonly coneMaterial: StandardMaterial;
  private readonly dashRing: Mesh;
  private readonly impacts: Impact[] = [];
  private previous: Vec2 | null = null;
  private lastHitId = -1;
  private previousTime = 0;
  private walkPhase = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false }, false);
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.5));
    this.scene = new Scene(this.engine);
    this.instrumentation = new SceneInstrumentation(this.scene);
    this.scene.clearColor = Color4.FromHexString('#18272CFF');
    this.scene.ambientColor = new Color3(0.18, 0.19, 0.19);
    this.scene.skipPointerMovePicking = true;
    this.scene.skipPointerDownPicking = true;
    this.scene.skipPointerUpPicking = true;

    // Match the art draft's 45-degree yaw / 35-degree downward pitch exactly.
    const cameraHeight = 0.5 + Math.tan(35 * Math.PI / 180) * Math.hypot(16, 16);
    this.camera = new FreeCamera('fixed-isometric', new Vector3(16, cameraHeight, -16), this.scene);
    this.camera.setTarget(new Vector3(0, 0.5, 0));
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 100;
    this.camera.inputs.clear();
    this.scene.activeCamera = this.camera;
    const ambient = new HemisphericLight('soft-sky', new Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.85;
    ambient.groundColor = Color3.FromHexString('#554857');
    const sun = new DirectionalLight('warm-key', new Vector3(0.5, -1, 0.4), this.scene);
    sun.intensity = 0.75;
    sun.diffuse = Color3.FromHexString('#FFF0DA');

    this.buildRoom();
    this.mergeRoom();
    this.player = new TransformNode('player', this.scene);
    this.body = new TransformNode('body-animation', this.scene);
    this.body.parent = this.player;
    this.scarf = new TransformNode('scarf-secondary-motion', this.scene);
    this.scarf.parent = this.body;
    this.buildCharacter();
    this.shadow = this.disc('player-contact', 0.9, this.material('shadow', '#142B33', 0.25), null, 0, 0.026, 0);
    this.shadow.scaling.z = 0.8;

    this.dummy = new TransformNode('training-dummy', this.scene);
    this.dummyBody = new TransformNode('dummy-sway', this.scene);
    this.dummyBody.parent = this.dummy;
    this.dummyMaterial = this.material('dummy-padding', PALETTE.coral);
    this.buildDummy();
    this.aim = new TransformNode('glove-reach', this.scene);
    this.coneMaterial = this.material('range-fill', PALETTE.cream, 0.08);
    this.coneMaterial.disableLighting = true;
    this.coneMaterial.emissiveColor = Color3.FromHexString(PALETTE.cream);
    this.buildCone();
    this.dashRing = MeshBuilder.CreateTorus('dash-indicator', { diameter: 0.85, thickness: 0.035, tessellation: 32 }, this.scene);
    this.dashRing.material = this.material('dash', '#9EE5DC', 0.6);
    this.dashRing.isPickable = false;
    this.dashRing.setEnabled(false);
    this.buildImpacts();
    this.resize();
  }

  private material(name: string, hex: string, alpha = 1): StandardMaterial {
    const existing = this.materials.get(name);
    if (existing) return existing;
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = Color3.FromHexString(hex);
    material.specularColor = new Color3(0.02, 0.025, 0.025);
    material.alpha = alpha;
    this.materials.set(name, material);
    return material;
  }

  private color(name: keyof typeof PALETTE): StandardMaterial {
    return this.material(name, PALETTE[name]);
  }

  private place(mesh: Mesh, material: StandardMaterial, parent: TransformNode | null, x: number, y: number, z: number): Mesh {
    mesh.material = material;
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.isPickable = false;
    return mesh;
  }

  private box(name: string, w: number, h: number, d: number, material: StandardMaterial, parent: TransformNode | null, x: number, y: number, z: number): Mesh {
    return this.place(MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene), material, parent, x, y, z);
  }

  private sphere(name: string, diameter: number, material: StandardMaterial, parent: TransformNode | null, x: number, y: number, z: number): Mesh {
    return this.place(MeshBuilder.CreateSphere(name, { diameter, segments: 6 }, this.scene), material, parent, x, y, z);
  }

  private cylinder(name: string, diameter: number, h: number, material: StandardMaterial, parent: TransformNode | null, x: number, y: number, z: number, top = diameter): Mesh {
    return this.place(MeshBuilder.CreateCylinder(name, { diameterBottom: diameter, diameterTop: top, height: h, tessellation: 12 }, this.scene), material, parent, x, y, z);
  }

  private disc(name: string, diameter: number, material: StandardMaterial, parent: TransformNode | null, x: number, y: number, z: number): Mesh {
    return this.cylinder(name, diameter, 0.008, material, parent, x, y, z);
  }

  private buildRoom(): void {
    const w = ROOM.halfWidth, d = ROOM.halfDepth;
    this.box('floating-foundation', w * 2 + 0.6, 0.5, d * 2 + 0.6, this.color('ink'), null, 0, -0.31, 0);
    this.box('floor-edge', w * 2 + 0.18, 0.12, d * 2 + 0.18, this.color('plaster'), null, 0, -0.05, 0);
    this.box('quiet-floor', w * 2, 0.08, d * 2, this.color('floor'), null, 0, -0.012, 0);
    // Decorative seams and paint are flush with the floor, never colliders.
    const seam = this.material('tile-seam', '#557D7E');
    for (let x = -6; x <= 6; x += 2) this.box('floor-seam', 0.014, 0.005, d * 2, seam, null, x, 0.032, 0);
    for (let z = -4; z <= 4; z += 2) this.box('floor-seam', w * 2, 0.005, 0.014, seam, null, 0, 0.032, z);
    this.box('canvas-mat-edge', 7.4, 0.015, 7.25, this.color('ink'), null, 0, 0.039, 0);
    this.box('canvas-mat', 7.1, 0.015, 6.95, this.color('mat'), null, 0, 0.05, 0);
    const paint = this.material('mat-paint', '#88AAA3');
    for (const side of [-1, 1]) {
      this.box('ring-painted-boundary', 6.55, 0.006, 0.035, paint, null, 0, 0.062, side * 3.18);
      this.box('ring-painted-boundary', 0.035, 0.006, 6.36, paint, null, side * 3.27, 0.062, 0);
      this.box('corner-paint', 0.16, 0.009, 0.62, this.color('cream'), null, side * 3.16, 0.066, -3.05);
    }
    const center = MeshBuilder.CreateTorus('mat-center-paint', { diameter: 2.7, thickness: 0.024, tessellation: 48 }, this.scene);
    this.place(center, paint, null, 0, 0.063, 0);
    center.scaling.y = 0.1;

    // Tall walls only on the far sides; near-side plinths preserve actor visibility.
    this.box('back-plaster', w * 2 + 0.15, 2.6, 0.22, this.color('plaster'), null, 0, 1.3, d + 0.11);
    this.box('left-plaster', 0.22, 2.6, d * 2 + 0.15, this.color('plaster'), null, -w - 0.11, 1.3, 0);
    this.box('back-wall-padding', w * 2, 0.94, 0.08, this.color('mat'), null, 0, 0.47, d - 0.005);
    this.box('left-wall-padding', 0.08, 0.94, d * 2, this.color('mat'), null, -w + 0.005, 0.47, 0);
    this.box('back-coral-stripe', w * 2, 0.08, 0.085, this.color('coral'), null, 0, 1.02, d - 0.01);
    this.box('left-coral-stripe', 0.085, 0.08, d * 2, this.color('coral'), null, -w + 0.01, 1.02, 0);
    this.box('near-boundary', w * 2 + 0.18, 0.13, 0.16, this.color('plaster'), null, 0, 0.065, -d - 0.08);
    this.box('right-boundary', 0.16, 0.13, d * 2 + 0.18, this.color('plaster'), null, w + 0.08, 0.065, 0);
    for (const x of [-6, 5.8]) {
      this.box('window-frame', 2.8, 1.05, 0.12, this.color('ink'), null, x, 1.86, d - 0.045);
      this.box('warm-window', 2.61, 0.87, 0.025, this.material('window-light', '#ECCC8F'), null, x, 1.86, d - 0.116);
      this.box('window-mullion', 0.065, 0.9, 0.04, this.color('ink'), null, x, 1.86, d - 0.14);
    }
    this.box('club-sign-frame', 4.45, 0.99, 0.15, this.color('ink'), null, -0.15, 1.9, d - 0.08);
    this.sign('club-sign', 'KLUB / 01', 'DOBRA FORMA. DOBRY HUMOR.', 4.22, 0.78, -0.15, 1.9, d - 0.165);
    this.sign('training-poster', 'RUSZAJ!', 'TRENING CZYNI MISTRZA', 2.4, 0.8, -w + 0.035, 1.84, -2.9, -Math.PI / 2);
    // The three authored physical props use exactly the simulation's footprints.
    for (const item of ROOM.obstacles) {
      if (item.id === 'equipment') {
        this.box('equipment-shadow', item.width, 0.015, item.depth, this.color('ink'), null, item.x, 0.07, item.z);
        this.box('equipment-cabinet', item.width, item.height, item.depth, this.color('coral'), null, item.x, item.height / 2, item.z);
        this.box('equipment-cream-top', item.width + 0.02, 0.09, item.depth + 0.02, this.color('plaster'), null, item.x, item.height, item.z);
        for (const offset of [-0.76, 0, 0.76]) {
          this.box('cabinet-door', 0.68, 0.73, 0.016, this.material('cabinet-door', '#A9564C'), null, item.x + offset, 0.5, item.z - item.depth / 2 - 0.009);
          this.box('cabinet-handle', 0.045, 0.15, 0.045, this.color('cream'), null, item.x + offset + 0.18, 0.57, item.z - item.depth / 2 - 0.035);
        }
        this.sphere('spare-glove', 0.39, this.color('red'), null, item.x - 0.62, 1.21, item.z);
        this.sphere('spare-glove', 0.39, this.color('cream'), null, item.x - 0.2, 1.21, item.z + 0.04);
        this.box('folded-towel', 0.58, 0.10, 0.39, this.color('cream'), null, item.x + 0.65, 1.1, item.z);
        this.box('towel-stripe', 0.10, 0.105, 0.40, this.color('red'), null, item.x + 0.6, 1.102, item.z);
      } else if (item.id === 'bench') {
        this.box('bench-top', item.width, 0.14, item.depth, this.material('wood', '#C79068'), null, item.x, item.height - 0.07, item.z);
        for (const offset of [-0.86, 0.86]) this.box('bench-foot', 0.15, item.height - 0.14, item.depth - 0.12, this.color('ink'), null, item.x + offset, (item.height - 0.14) / 2, item.z);
        this.box('bench-seat-line', item.width, 0.01, 0.018, this.color('hair'), null, item.x, item.height + 0.006, item.z);
        this.cylinder('water-bottle', 0.18, 0.32, this.color('teal'), null, item.x + 0.78, item.height + 0.16, item.z);
        this.cylinder('bottle-cap', 0.12, 0.05, this.color('cream'), null, item.x + 0.78, item.height + 0.345, item.z);
      } else {
        this.box('bag-platform', item.width, item.height, item.depth, this.color('ink'), null, item.x, item.height / 2, item.z);
        this.cylinder('bag-stem', 0.17, 0.52, this.color('ink'), null, item.x, item.height + 0.26, item.z);
        this.cylinder('training-bag', 0.65, 1.26, this.color('plum'), null, item.x, 1.25, item.z, 0.58);
        this.cylinder('bag-wrap', 0.668, 0.22, this.color('coral'), null, item.x, 1.3, item.z);
        this.cylinder('bag-cap', 0.57, 0.07, this.color('cream'), null, item.x, 1.915, item.z);
      }
    }
    this.staticMeshes.push(...this.scene.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh));
  }

  private sign(name: string, title: string, subtitle: string, width: number, height: number, x: number, y: number, z: number, yaw = 0): void {
    const texture = new DynamicTexture(name, { width: 1024, height: 256 }, this.scene, false);
    const context = texture.getContext() as CanvasRenderingContext2D;
    context.fillStyle = PALETTE.cream;
    context.fillRect(0, 0, 1024, 256);
    context.textAlign = 'center';
    context.fillStyle = PALETTE.ink;
    context.font = 'bold 112px sans-serif';
    context.fillText(title, 512, 139);
    context.font = 'bold 28px sans-serif';
    context.fillText(subtitle, 512, 206);
    context.fillStyle = PALETTE.coral;
    context.fillRect(60, 228, 904, 5);
    texture.update();
    const material = this.material(name, '#FFFFFF');
    material.diffuseTexture = texture;
    material.specularColor = Color3.Black();
    const plane = MeshBuilder.CreatePlane(name, { width, height }, this.scene);
    this.place(plane, material, null, x, y, z);
    plane.rotation.y = yaw;
  }

  private mergeRoom(): void {
    const groups = new Map<StandardMaterial, Mesh[]>();
    for (const mesh of this.staticMeshes) {
      if (!(mesh.material instanceof StandardMaterial)) continue;
      const list = groups.get(mesh.material) ?? [];
      list.push(mesh);
      groups.set(mesh.material, list);
      mesh.computeWorldMatrix(true);
    }
    for (const [material, meshes] of groups) {
      const result = meshes.length > 1 ? Mesh.MergeMeshes(meshes, true, true) : meshes[0];
      if (result) {
        result.name = `gym-${material.name}`;
        result.isPickable = false;
        result.freezeWorldMatrix();
      }
    }
    this.staticMeshes.length = 0;
  }

  private buildCharacter(): void {
    this.box('athletic-torso', 0.62, 0.6, 0.37, this.color('teal'), this.body, 0, 1.1, 0);
    this.box('jacket-hem', 0.60, 0.10, 0.38, this.color('ink'), this.body, 0, 0.83, 0);
    this.box('jacket-zip', 0.035, 0.39, 0.02, this.color('cream'), this.body, 0, 1.06, 0.195);
    this.box('hips', 0.42, 0.24, 0.32, this.color('plum'), this.body, 0, 0.7, 0);
    for (const side of [-1, 1]) {
      this.box('shoulder-panel', 0.15, 0.15, 0.4, this.color('gold'), this.body, side * 0.27, 1.31, 0);
      const leg = new TransformNode(`leg-${side}`, this.scene);
      leg.parent = this.body;
      leg.position.set(side * 0.16, 0.67, 0);
      this.cylinder('trouser-leg', 0.23, 0.49, this.color('plum'), leg, 0, -0.23, 0, 0.27);
      this.box('sneaker', 0.27, 0.14, 0.39, this.color('cream'), leg, 0, -0.55, 0.08);
      this.box('sneaker-sole', 0.28, 0.04, 0.40, this.color('ink'), leg, 0, -0.62, 0.08);
      this.legs.push(leg);
      const arm = new TransformNode(`arm-${side}`, this.scene);
      arm.parent = this.body;
      arm.position.set(side * 0.38, 1.12, 0.14);
      this.sphere('sleeve', 0.30, this.color('teal'), arm, 0, 0, -0.10).scaling.y = 1.2;
      this.sphere('glove-cuff', 0.23, this.color('ink'), arm, 0, -0.015, 0.10);
      this.sphere('boxing-glove', 0.38, this.color(side < 0 ? 'red' : 'cream'), arm, 0, 0.015, 0.28).scaling.z = 1.08;
      this.sphere('glove-thumb', 0.16, this.color(side < 0 ? 'red' : 'cream'), arm, -side * 0.16, -0.02, 0.20);
      this.arms.push(arm);
    }
    this.cylinder('neck', 0.21, 0.17, this.color('skin'), this.body, 0, 1.47, 0);
    this.sphere('original-fictional-face', 0.47, this.color('skin'), this.body, 0, 1.72, 0.015).scaling.set(0.92, 1.12, 0.92);
    this.sphere('copper-hair', 0.48, this.color('hair'), this.body, 0, 1.87, -0.025).scaling.set(0.96, 0.63, 0.96);
    this.sphere('asymmetric-forelock', 0.20, this.color('hair'), this.body, -0.10, 1.90, 0.13);
    this.sphere('nose', 0.11, this.color('skin'), this.body, 0, 1.70, 0.235);
    for (const side of [-1, 1]) {
      this.sphere('eye', 0.036, this.color('ink'), this.body, side * 0.098, 1.76, 0.214);
      const brow = this.box('eyebrow', 0.085, 0.026, 0.025, this.color('hair'), this.body, side * 0.098, 1.806 + (side > 0 ? 0.016 : 0), 0.207);
      brow.rotation.z = side * -0.1;
    }
    const grin = this.box('crooked-grin', 0.14, 0.029, 0.035, this.color('cream'), this.body, 0.015, 1.604, 0.202);
    grin.rotation.z = 0.10;
    this.cylinder('scarf-neck-red', 0.46, 0.15, this.color('red'), this.body, 0, 1.435, 0);
    this.cylinder('scarf-neck-white', 0.464, 0.045, this.color('cream'), this.body, 0, 1.45, 0);
    this.scarf.position.set(-0.11, 1.42, 0.23);
    for (let i = 0; i < 4; i++) {
      this.box('front-scarf-block', 0.17, 0.13, 0.065, this.color(i % 2 ? 'cream' : 'red'), this.scarf, 0, -i * 0.13, 0.025 + i * 0.015);
      const tail = this.box('rear-scarf-block', 0.19, 0.13, 0.075, this.color(i % 2 ? 'red' : 'cream'), this.scarf, 0.3, -i * 0.11 + 0.04, -0.48 - i * 0.06);
      tail.rotation.x = 0.45;
    }
  }

  private buildDummy(): void {
    this.disc('dummy-contact', 1.22, this.material('shadow', '#142B33', 0.25), this.dummy, 0, 0.04, 0);
    this.cylinder('dummy-weight', 0.76, 0.13, this.color('ink'), this.dummy, 0, 0.09, 0);
    this.cylinder('dummy-pole', 0.12, 0.85, this.color('plaster'), this.dummyBody, 0, 0.58, 0);
    this.cylinder('dummy-padded-body', 0.74, 0.88, this.dummyMaterial, this.dummyBody, 0, 1.10, 0, 0.6);
    this.sphere('dummy-head', 0.49, this.dummyMaterial, this.dummyBody, 0, 1.69, 0);
    this.cylinder('dummy-cream-band', 0.748, 0.16, this.color('cream'), this.dummyBody, 0, 1.15, 0);
    this.cylinder('dummy-dark-band', 0.74, 0.05, this.color('ink'), this.dummyBody, 0, 0.91, 0);
    for (const side of [-1, 1]) {
      const arm = this.cylinder('dummy-guard', 0.21, 0.51, this.color('plum'), this.dummyBody, side * 0.48, 1.18, 0.01);
      arm.rotation.z = side * -0.6;
      this.sphere('dummy-pad', 0.28, this.color('cream'), this.dummyBody, side * 0.61, 1.34, 0.01);
    }
  }

  private buildCone(): void {
    const positions: number[] = [0, 0, 0], indices: number[] = [], normals: number[] = [0, 1, 0];
    const line: Vector3[] = [Vector3.Zero()];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const angle = -RULES.gloveHalfAngle + i / steps * RULES.gloveHalfAngle * 2;
      const x = Math.sin(angle) * RULES.gloveRange, z = Math.cos(angle) * RULES.gloveRange;
      positions.push(x, 0, z);
      normals.push(0, 1, 0);
      line.push(new Vector3(x, 0.005, z));
      if (i < steps) indices.push(0, i + 1, i + 2);
    }
    line.push(Vector3.Zero());
    const data = new VertexData();
    data.positions = positions; data.indices = indices; data.normals = normals;
    const mesh = new Mesh('exact-glove-range', this.scene);
    data.applyToMesh(mesh);
    mesh.material = this.coneMaterial;
    this.coneMaterial.backFaceCulling = false;
    mesh.parent = this.aim;
    mesh.isPickable = false;
    const outline = MeshBuilder.CreateLines('reach-outline', { points: line }, this.scene);
    outline.color = Color3.FromHexString('#DCE6D4');
    outline.alpha = 0.45;
    outline.parent = this.aim;
    outline.isPickable = false;
  }

  private buildImpacts(): void {
    for (let i = 0; i < 6; i++) {
      const root = new TransformNode(`impact-${i}`, this.scene);
      const sparks: Mesh[] = [];
      for (let n = 0; n < 5; n++) sparks.push(this.box('impact-chip', 0.07, 0.15, 0.055, this.color(n % 2 ? 'cream' : 'gold'), root, 0, 0.7, 0));
      const ring = MeshBuilder.CreateTorus('soft-hit-ring', { diameter: 0.6, thickness: 0.034, tessellation: 24 }, this.scene);
      this.place(ring, this.color('cream'), root, 0, 0.10, 0);
      root.setEnabled(false);
      this.impacts.push({ root, sparks, ring, age: 1 });
    }
  }

  render(state: GameState, events: HitEvent[], dt: number): void {
    if (state.time < this.previousTime) {
      this.lastHitId = -1;
      this.previous = null;
      this.walkPhase = 0;
      for (const effect of this.impacts) { effect.age = 1; effect.root.setEnabled(false); }
    }
    this.previousTime = state.time;
    const p = state.player;
    const moved = this.previous ? Math.hypot(p.position.x - this.previous.x, p.position.z - this.previous.z) : 0;
    this.previous = { ...p.position };
    const walking = moved > 0.0001 && p.dashRemaining <= 0;
    if (walking) this.walkPhase += moved * 7.5;
    this.player.position.set(p.position.x, 0.065, p.position.z);
    this.player.rotation.y = Math.atan2(p.facing.x, p.facing.z);
    this.body.position.y = walking ? Math.abs(Math.sin(this.walkPhase)) * 0.055 : Math.sin(state.time * 3) * 0.018;
    this.body.rotation.x = p.dashRemaining > 0 ? 0.2 : 0;
    this.legs.forEach((leg, i) => { leg.rotation.x = walking ? Math.sin(this.walkPhase + i * Math.PI) * 0.42 : 0; });
    const phase = p.attackPhase;
    const extension = phase === 'active' ? 0.50 : phase === 'startup' ? -0.08 * p.attackProgress : phase === 'recovery' ? 0.48 * (1 - p.attackProgress) : 0;
    this.arms.forEach((arm, i) => {
      arm.position.z = 0.14 + (i === p.combo % 2 ? extension : 0);
      arm.position.y = 1.12 + (walking ? Math.sin(this.walkPhase + i * Math.PI) * 0.035 : 0);
    });
    this.scarf.rotation.x = p.dashRemaining > 0 ? -0.7 : Math.sin(state.time * 7) * (walking ? 0.2 : 0.035);
    this.scarf.rotation.z = walking ? Math.sin(this.walkPhase * 0.5) * 0.12 : 0;
    this.shadow.position.set(p.position.x, 0.069, p.position.z);
    this.aim.position.set(p.position.x, 0.079, p.position.z);
    this.aim.rotation.y = this.player.rotation.y;
    this.coneMaterial.alpha = phase === 'active' ? 0.42 : phase === 'startup' ? 0.23 : phase === 'recovery' ? 0.11 : 0.055;
    const coneColor = Color3.FromHexString(phase === 'active' ? PALETTE.gold : PALETTE.cream);
    this.coneMaterial.diffuseColor.copyFrom(coneColor);
    this.coneMaterial.emissiveColor.copyFrom(coneColor);
    this.dashRing.setEnabled(p.invulnerable);
    this.dashRing.position.set(p.position.x, 0.09, p.position.z);
    this.dummy.position.set(state.dummy.position.x, 0.065, state.dummy.position.z);
    const flash = Math.min(1, Math.max(0, state.dummy.hitFlash / 0.15));
    this.dummyMaterial.diffuseColor.copyFrom(Color3.Lerp(Color3.FromHexString(PALETTE.coral), Color3.FromHexString(PALETTE.cream), flash));
    const spent = state.dummy.health <= 0;
    this.dummyBody.rotation.x = spent ? -Math.PI * 0.45 : Math.sin(state.time * 42) * flash * 0.13;
    this.dummyBody.scaling.set(1 + flash * 0.08, spent ? 0.55 : 1 - flash * 0.05, 1 + flash * 0.08);

    for (const event of events) {
      if (event.id <= this.lastHitId) continue;
      this.lastHitId = event.id;
      const effect = this.impacts.find(item => item.age >= 0.34) ?? this.impacts[0]!;
      effect.age = 0;
      effect.root.position.set(event.position.x, 0.08, event.position.z);
      effect.root.setEnabled(true);
    }
    for (const effect of this.impacts) {
      effect.age += Math.max(0, dt);
      if (effect.age >= 0.34) { effect.root.setEnabled(false); continue; }
      const t = effect.age / 0.34;
      effect.ring.scaling.setAll(0.55 + t * 1.7);
      effect.ring.visibility = 1 - t;
      effect.sparks.forEach((spark, i) => {
        const a = i * Math.PI * 2 / effect.sparks.length + 0.3;
        spark.position.set(Math.cos(a) * t * 0.68, 0.8 + Math.sin(t * Math.PI) * 0.45, Math.sin(a) * t * 0.68);
        spark.rotation.set(t * 3, a, t * 4);
        spark.scaling.setAll(1 - t * 0.7);
        spark.visibility = 1 - t;
      });
    }
    // The application owns requestAnimationFrame, so it does not enter Babylon's
    // runRenderLoop lifecycle. Pair these explicitly for FPS, frame IDs and flushes.
    this.engine.beginFrame();
    try { this.scene.render(); }
    finally { this.engine.endFrame(); }
  }

  resize(): void {
    this.engine.resize();
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    const halfHeight = Math.max(7.75, 11.1 / Math.max(0.2, aspect));
    this.camera.orthoTop = halfHeight;
    this.camera.orthoBottom = -halfHeight;
    this.camera.orthoLeft = -halfHeight * aspect;
    this.camera.orthoRight = halfHeight * aspect;
  }

  pointerAim(clientX: number, clientY: number, player: Vec2): Vec2 | null {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    // Babylon applies the hardware pixel scale internally; supply CSS pixels here.
    const ray = this.scene.createPickingRay(clientX - rect.left, clientY - rect.top, Matrix.Identity(), this.camera);
    const distance = ray.intersectsPlane(new Plane(0, 1, 0, 0));
    if (distance === null || distance < 0) return null;
    const hit = ray.origin.add(ray.direction.scale(distance));
    const x = hit.x - player.x, z = hit.z - player.z;
    const length = Math.hypot(x, z);
    return length < 0.05 ? null : { x: x / length, z: z / length };
  }

  screenDirection(x: number, y: number): Vec2 {
    // Camera yaw is fixed at 45 degrees; screen y grows downward.
    return { x: (x + y) * Math.SQRT1_2, z: (x - y) * Math.SQRT1_2 };
  }

  project(position: Vec2): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const point = Vector3.Project(new Vector3(position.x, 0, position.z), Matrix.Identity(), this.scene.getTransformMatrix(), this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight()));
    return { x: rect.left + point.x / this.engine.getRenderWidth() * rect.width, y: rect.top + point.y / this.engine.getRenderHeight() * rect.height };
  }

  getMetrics(): { fps: number; meshes: number; drawCalls: number; renderer: string; webglVersion: string; renderSize: [number, number] } {
    const gl = this.engine.getGlInfo();
    return {
      fps: this.engine.getFps(), meshes: this.scene.meshes.length,
      drawCalls: this.instrumentation.drawCallsCounter.current,
      renderer: gl.renderer, webglVersion: gl.version,
      renderSize: [this.engine.getRenderWidth(), this.engine.getRenderHeight()],
    };
  }

  dispose(): void {
    this.instrumentation.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
