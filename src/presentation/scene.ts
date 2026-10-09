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
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Plane } from '@babylonjs/core/Maths/math.plane';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
import '@babylonjs/core/Culling/ray';
import { BOXER_RULES, RIFLE_RULES, ROOM, WEAPONS } from '../game/config';
import { rayCoverDistance, rayTargetDistance, meleeEligible } from '../game/simulation';
import type { EnemyState, GameState, HitEvent, Vec2 } from '../game/types';
import { samplePillarPose, twoBoneJoint, type PillarPose, type PoseVector } from './pillar-animation';

// Original, reproducible prototype placeholders. No downloaded assets or shaders.
const PALETTE = {
  ink: '#303D45', plum: '#302D48', teal: '#178F91', floor: '#668C8C',
  mat: '#377C83', cream: '#FFF3DD', plaster: '#D8C9A6', coral: '#BA6659',
  red: '#D93445', gold: '#F4C950', skin: '#E7AC84', hair: '#82482F',
};
type Impact = { root: TransformNode; sparks: Mesh[]; ring: Mesh; age: number };
type RangeCue = { root: TransformNode; fill: Mesh; outline: LinesMesh; material: StandardMaterial; steps: number };
type BoxerView = {
  root: TransformNode; body: TransformNode; arms: TransformNode[]; legs: TransformNode[];
  cue: RangeCue; health: TransformNode; healthFill: Mesh; target: Mesh; material: StandardMaterial;
};
type LimbView = { root: TransformNode; upper: Mesh; lower: Mesh; joint: Mesh; end: Mesh };

export class GameView {
  readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: FreeCamera;
  private readonly instrumentation: SceneInstrumentation;
  private readonly materials = new Map<string, StandardMaterial>();
  private readonly staticMeshes: Mesh[] = [];
  private readonly player: TransformNode;
  private readonly body: TransformNode;
  private readonly torso: TransformNode;
  private readonly legs: TransformNode[] = [];
  private readonly arms: TransformNode[] = [];
  private readonly gloves: Mesh[] = [];
  private readonly rifle: TransformNode;
  private readonly rifleMagazine: Mesh;
  private readonly pillar: TransformNode;
  private readonly pillarArms: LimbView[] = [];
  private readonly pillarLegs: LimbView[] = [];
  private readonly scarf: TransformNode;
  private readonly shadow: Mesh;
  private readonly dummy: TransformNode;
  private readonly dummyBody: TransformNode;
  private readonly dummyMaterial: StandardMaterial;
  private readonly aim: RangeCue;
  private readonly rifleAim: LinesMesh;
  private readonly dummyTarget: Mesh;
  private readonly boxers = new Map<string, BoxerView>();
  private readonly tracers: LinesMesh[] = [];
  private readonly dashRing: Mesh;
  private readonly impacts: Impact[] = [];
  private previous: Vec2 | null = null;
  private lastHitId = -1;
  private previousTime = 0;
  private walkPhase = 0;
  private lastWeapon: GameState['weapon'] | null = null;
  private lastOutcome: GameState['outcome'] | null = null;
  private terminalSwing: number | null = null;
  private pillarPose: PillarPose = samplePillarPose('ready', 0);

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
    this.torso = new TransformNode('torso-animation', this.scene);
    this.torso.parent = this.body;
    this.torso.setPivotPoint(new Vector3(0, 0.78, 0));
    this.scarf = new TransformNode('scarf-secondary-motion', this.scene);
    this.scarf.parent = this.torso;
    this.buildCharacter();
    const rifle = this.buildRifle();
    this.rifle = rifle.root;
    this.rifleMagazine = rifle.magazine;
    this.pillar = this.buildPillar();
    this.buildPillarLimbs();
    this.shadow = this.disc('player-contact', 0.9, this.material('shadow', '#142B33', 0.25), null, 0, 0.026, 0);
    this.shadow.scaling.z = 0.8;

    this.dummy = new TransformNode('training-dummy', this.scene);
    this.dummyBody = new TransformNode('dummy-sway', this.scene);
    this.dummyBody.parent = this.dummy;
    this.dummyMaterial = this.material('dummy-padding', PALETTE.coral);
    this.buildDummy();
    this.aim = this.buildCone('weapon-reach', PALETTE.cream);
    this.rifleAim = MeshBuilder.CreateLines('rifle-cover-clipped-aim', { points: [Vector3.Zero(), Vector3.Zero()], updatable: true }, this.scene);
    this.rifleAim.color = Color3.FromHexString(PALETTE.cream);
    this.rifleAim.alpha = 0.65;
    this.rifleAim.isPickable = false;
    this.dummyTarget = this.buildTargetRing('dummy-target', 0.45);
    for (let i = 0; i < 4; i++) {
      const tracer = MeshBuilder.CreateLines(`cosmetic-tracer-${i}`, { points: [Vector3.Zero(), Vector3.Zero()], updatable: true }, this.scene);
      tracer.color = Color3.FromHexString(PALETTE.gold);
      tracer.isPickable = false;
      tracer.setEnabled(false);
      this.tracers.push(tracer);
    }
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
    const station = MeshBuilder.CreateTorus('preparation-station-ring', { diameter: 1.85, thickness: 0.032, tessellation: 40 }, this.scene);
    this.place(station, this.material('station-paint', '#B4CFC3'), null, 0, 0.074, -2.5);
    station.scaling.y = 0.1;
    const stationMark = this.box('preparation-station-mark', 0.32, 0.009, 0.045, this.color('cream'), null, 0, 0.078, -3.40);
    stationMark.rotation.y = Math.PI / 4;
    const stationTexture = new DynamicTexture('preparation-label', { width: 512, height: 96 }, this.scene, false);
    const stationContext = stationTexture.getContext() as CanvasRenderingContext2D;
    stationContext.fillStyle = PALETTE.mat;
    stationContext.fillRect(0, 0, 512, 96);
    stationContext.fillStyle = '#D3E1D2';
    stationContext.textAlign = 'center';
    stationContext.font = 'bold 49px sans-serif';
    stationContext.fillText('PREPARATION', 256, 67);
    stationTexture.update();
    const stationMaterial = this.material('preparation-label', '#FFFFFF');
    stationMaterial.diffuseTexture = stationTexture;
    const stationLabel = MeshBuilder.CreatePlane('preparation-label', { width: 1.55, height: 0.29, sideOrientation: Mesh.DOUBLESIDE }, this.scene);
    this.place(stationLabel, stationMaterial, null, 0.05, 0.081, -3.65);
    stationLabel.rotation.x = Math.PI / 2;

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
    this.box('athletic-torso', 0.62, 0.6, 0.37, this.color('teal'), this.torso, 0, 1.1, 0);
    this.box('jacket-hem', 0.60, 0.10, 0.38, this.color('ink'), this.torso, 0, 0.83, 0);
    this.box('jacket-zip', 0.035, 0.39, 0.02, this.color('cream'), this.torso, 0, 1.06, 0.195);
    this.box('hips', 0.42, 0.24, 0.32, this.color('plum'), this.body, 0, 0.7, 0);
    for (const side of [-1, 1]) {
      this.box('shoulder-panel', 0.15, 0.15, 0.4, this.color('gold'), this.torso, side * 0.27, 1.31, 0);
      const leg = new TransformNode(`leg-${side}`, this.scene);
      leg.parent = this.body;
      leg.position.set(side * 0.16, 0.67, 0);
      this.cylinder('trouser-leg', 0.23, 0.49, this.color('plum'), leg, 0, -0.23, 0, 0.27);
      this.box('sneaker', 0.27, 0.14, 0.39, this.color('cream'), leg, 0, -0.55, 0.08);
      this.box('sneaker-sole', 0.28, 0.04, 0.40, this.color('ink'), leg, 0, -0.62, 0.08);
      this.legs.push(leg);
      const arm = new TransformNode(`arm-${side}`, this.scene);
      arm.parent = this.torso;
      arm.position.set(side * 0.38, 1.12, 0.14);
      this.sphere('sleeve', 0.30, this.color('teal'), arm, 0, 0, -0.10).scaling.y = 1.2;
      this.gloves.push(this.sphere('glove-cuff', 0.23, this.color('ink'), arm, 0, -0.015, 0.10));
      const glove = this.sphere('boxing-glove', 0.38, this.color(side < 0 ? 'red' : 'cream'), arm, 0, 0.015, 0.28);
      glove.scaling.z = 1.08;
      this.gloves.push(glove, this.sphere('glove-thumb', 0.16, this.color(side < 0 ? 'red' : 'cream'), arm, -side * 0.16, -0.02, 0.20));
      this.sphere('hand', 0.19, this.color('skin'), arm, 0, 0, 0.18);
      this.arms.push(arm);
    }
    this.cylinder('neck', 0.21, 0.17, this.color('skin'), this.torso, 0, 1.47, 0);
    this.sphere('original-fictional-face', 0.47, this.color('skin'), this.torso, 0, 1.72, 0.015).scaling.set(0.92, 1.12, 0.92);
    this.sphere('copper-hair', 0.48, this.color('hair'), this.torso, 0, 1.87, -0.025).scaling.set(0.96, 0.63, 0.96);
    this.sphere('asymmetric-forelock', 0.20, this.color('hair'), this.torso, -0.10, 1.90, 0.13);
    this.sphere('nose', 0.11, this.color('skin'), this.torso, 0, 1.70, 0.235);
    for (const side of [-1, 1]) {
      this.sphere('eye', 0.036, this.color('ink'), this.torso, side * 0.098, 1.76, 0.214);
      const brow = this.box('eyebrow', 0.085, 0.026, 0.025, this.color('hair'), this.torso, side * 0.098, 1.806 + (side > 0 ? 0.016 : 0), 0.207);
      brow.rotation.z = side * -0.1;
    }
    const grin = this.box('crooked-grin', 0.14, 0.029, 0.035, this.color('cream'), this.torso, 0.015, 1.604, 0.202);
    grin.rotation.z = 0.10;
    this.cylinder('scarf-neck-red', 0.46, 0.15, this.color('red'), this.torso, 0, 1.435, 0);
    this.cylinder('scarf-neck-white', 0.464, 0.045, this.color('cream'), this.torso, 0, 1.45, 0);
    this.scarf.position.set(-0.11, 1.42, 0.23);
    for (let i = 0; i < 4; i++) {
      this.box('front-scarf-block', 0.17, 0.13, 0.065, this.color(i % 2 ? 'cream' : 'red'), this.scarf, 0, -i * 0.13, 0.025 + i * 0.015);
      const tail = this.box('rear-scarf-block', 0.19, 0.13, 0.075, this.color(i % 2 ? 'red' : 'cream'), this.scarf, 0.3, -i * 0.11 + 0.04, -0.48 - i * 0.06);
      tail.rotation.x = 0.45;
    }
  }

  private buildRifle(): { root: TransformNode; magazine: Mesh } {
    const root = new TransformNode('stylized-grot-placeholder', this.scene);
    root.parent = this.body;
    root.position.set(0.13, 1.06, 0.39);
    const metal = this.material('rifle-metal', '#424B50');
    this.box('rifle-receiver', 0.16, 0.20, 0.63, metal, root, 0, 0, 0.12);
    this.box('rifle-stock', 0.13, 0.22, 0.32, this.color('ink'), root, 0, -0.015, -0.30);
    this.box('rifle-handguard', 0.20, 0.17, 0.34, this.color('plaster'), root, 0, 0, 0.41);
    const barrel = this.cylinder('rifle-barrel', 0.063, 0.42, metal, root, 0, 0.025, 0.72);
    barrel.rotation.x = Math.PI / 2;
    this.box('rifle-sight', 0.045, 0.065, 0.075, this.color('cream'), root, 0, 0.14, 0.43);
    this.box('rifle-grip', 0.11, 0.21, 0.12, this.color('ink'), root, 0, -0.17, -0.05).rotation.x = -0.2;
    const magazine = this.box('rifle-magazine', 0.12, 0.32, 0.17, this.color('ink'), root, 0, -0.21, 0.18);
    magazine.rotation.x = 0.12;
    root.setEnabled(false);
    return { root, magazine };
  }

  private buildPillar(): TransformNode {
    const root = new TransformNode('portable-monument-placeholder', this.scene);
    root.parent = this.torso;
    root.position.set(0.48, 1.02, 0.25);
    const stone = this.material('pillar-stone', '#BBB7A7');
    this.cylinder('pillar-shortened-shaft', 0.21, 1.5, stone, root, 0, 0.25, 0, 0.27);
    this.box('pillar-capital', 0.48, 0.16, 0.45, this.color('plaster'), root, 0, 1.04, 0);
    this.box('pillar-base', 0.42, 0.17, 0.41, stone, root, 0, -0.58, 0);
    this.cylinder('pillar-neck', 0.29, 0.12, this.color('plaster'), root, 0, 0.9, 0);
    this.cylinder('pillar-lower-grip-wrap', 0.26, 0.15, this.color('red'), root, 0, -0.12, 0);
    this.cylinder('pillar-upper-grip-wrap', 0.26, 0.15, this.color('cream'), root, 0, 0.22, 0);
    // Abstract geometric finial; not a reproduction of a statue or scan.
    this.cylinder('pillar-finial', 0.20, 0.3, this.color('gold'), root, 0, 1.25, 0, 0.07);
    this.sphere('pillar-finial-tip', 0.14, this.color('gold'), root, 0, 1.43, 0);
    root.setEnabled(false);
    return root;
  }

  private buildPillarLimbs(): void {
    for (const side of [-1, 1]) {
      const arm = new TransformNode(`pillar-two-handed-arm-${side}`, this.scene);
      arm.parent = this.torso;
      const upper = this.cylinder('pillar-upper-sleeve', 0.24, 1, this.color('teal'), arm, 0, 0, 0, 0.29);
      const lower = this.cylinder('pillar-forearm', 0.16, 1, this.color('skin'), arm, 0, 0, 0, 0.21);
      const joint = this.sphere('pillar-elbow', 0.22, this.color('teal'), arm, 0, 0, 0);
      const hand = this.sphere('pillar-gripping-hand', 0.22, this.color('skin'), arm, 0, 0, 0);
      hand.scaling.set(1, 0.82, 1);
      this.pillarArms.push({ root: arm, upper, lower, joint, end: hand });
      arm.setEnabled(false);
      const leg = new TransformNode(`pillar-braced-leg-${side}`, this.scene);
      leg.parent = this.player;
      const thigh = this.cylinder('pillar-trouser-thigh', 0.24, 1, this.color('plum'), leg, 0, 0, 0, 0.28);
      const shin = this.cylinder('pillar-trouser-shin', 0.22, 1, this.color('plum'), leg, 0, 0, 0, 0.24);
      const knee = this.sphere('pillar-knee', 0.23, this.color('plum'), leg, 0, 0, 0);
      const foot = this.box('pillar-planted-sneaker', 0.28, 0.14, 0.40, this.color('cream'), leg, 0, 0, 0);
      const sole = this.box('pillar-planted-sole', 0.29, 0.04, 0.41, this.color('ink'), foot, 0, -0.065, 0);
      sole.isPickable = false;
      this.pillarLegs.push({ root: leg, upper: thigh, lower: shin, joint: knee, end: foot });
      leg.setEnabled(false);
    }
  }

  private placeSegment(mesh: Mesh, start: Vector3, end: Vector3): void {
    const direction = end.subtract(start);
    mesh.position.copyFrom(start.add(end).scale(0.5));
    mesh.scaling.y = direction.length();
    mesh.rotationQuaternion ??= Quaternion.Identity();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction.normalize(), mesh.rotationQuaternion);
  }

  private animatePillarLimbs(pose: PillarPose, walking: boolean): void {
    this.player.computeWorldMatrix(true);
    this.body.computeWorldMatrix(true);
    this.torso.computeWorldMatrix(true);
    this.pillar.computeWorldMatrix(true);
    const inverseTorso = Matrix.Invert(this.torso.getWorldMatrix());
    const inversePlayer = Matrix.Invert(this.player.getWorldMatrix());
    this.pillarArms.forEach((limb, i) => {
      const side = i === 0 ? -1 : 1;
      const shoulder = new Vector3(side * 0.35, 1.26, 0);
      const gripWorld = Vector3.TransformCoordinates(new Vector3(0, i === 0 ? 0.22 : -0.12, 0), this.pillar.getWorldMatrix());
      const grip = Vector3.TransformCoordinates(gripWorld, inverseTorso);
      const elbowPose = twoBoneJoint(shoulder, grip, 0.44, 0.48, { x: side, y: -0.65, z: -0.4 });
      const elbow = new Vector3(elbowPose.x, elbowPose.y, elbowPose.z);
      this.placeSegment(limb.upper, shoulder, elbow);
      this.placeSegment(limb.lower, elbow, grip);
      limb.joint.position.copyFrom(elbow);
      limb.end.position.copyFrom(grip);
    });
    this.pillarLegs.forEach((limb, i) => {
      const side = i === 0 ? -1 : 1;
      const hip = Vector3.TransformCoordinates(Vector3.TransformCoordinates(new Vector3(side * 0.17, 0.71, 0), this.body.getWorldMatrix()), inversePlayer);
      const footPose = pose.feet[i];
      const stride = walking ? Math.sin(this.walkPhase + i * Math.PI) : 0;
      const ankle = new Vector3(footPose.x, 0.12 + Math.max(0, stride) * 0.06, footPose.z + stride * 0.09);
      const kneePose = twoBoneJoint(hip, ankle, 0.34, 0.37, { x: side * 0.20, y: 0, z: 1 });
      const knee = new Vector3(kneePose.x, kneePose.y, kneePose.z);
      this.placeSegment(limb.upper, hip, knee);
      this.placeSegment(limb.lower, knee, ankle);
      limb.joint.position.copyFrom(knee);
      limb.end.position.set(ankle.x, ankle.y - 0.035, ankle.z + 0.065);
      limb.end.rotation.y = side * 0.13 + pose.body.rotation.y * 0.15;
      limb.end.rotation.x = Math.max(0, stride) * -0.10;
    });
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

  private buildCone(name: string, color: string): RangeCue {
    const root = new TransformNode(name, this.scene);
    const material = this.material(`${name}-fill`, color, 0.10);
    material.disableLighting = true;
    material.emissiveColor = Color3.FromHexString(color);
    material.backFaceCulling = false;
    const positions: number[] = [0, 0, 0], indices: number[] = [], normals: number[] = [0, 1, 0];
    const line: Vector3[] = [Vector3.Zero()];
    // 41 arc samples + both sides of each cover/room corner (32), padded when
    // corners are outside the cone. Fixed buffers avoid per-frame mesh allocation.
    const steps = 72;
    for (let i = 0; i <= steps; i++) {
      positions.push(0, 0, 0);
      normals.push(0, 1, 0);
      line.push(Vector3.Zero());
      if (i < steps) indices.push(0, i + 1, i + 2);
    }
    line.push(Vector3.Zero());
    const data = new VertexData();
    data.positions = positions; data.indices = indices; data.normals = normals;
    const mesh = new Mesh(`${name}-cover-clipped-fill`, this.scene);
    data.applyToMesh(mesh, true);
    mesh.material = material;
    mesh.parent = root;
    mesh.isPickable = false;
    const outline = MeshBuilder.CreateLines(`${name}-outline`, { points: line, updatable: true }, this.scene);
    outline.color = Color3.FromHexString(color);
    outline.alpha = 0.70;
    outline.parent = root;
    outline.isPickable = false;
    return { root, fill: mesh, outline, material, steps };
  }

  private updateCone(cue: RangeCue, position: Vec2, facing: Vec2, range: number, halfAngle: number, color: string, alpha: number): void {
    cue.root.position.set(position.x, 0.087, position.z);
    const positions = [0, 0, 0];
    const line = [new Vector3(0, 0.005, 0)];
    const yaw = Math.atan2(facing.x, facing.z);
    const angles = Array.from({ length: 41 }, (_, i) => -halfAngle + i / 40 * halfAngle * 2);
    const corners: Vec2[] = [];
    for (const obstacle of ROOM.obstacles) for (const xSide of [-1, 1]) for (const zSide of [-1, 1])
      corners.push({ x: obstacle.x + xSide * obstacle.width / 2, z: obstacle.z + zSide * obstacle.depth / 2 });
    for (const xSide of [-1, 1]) for (const zSide of [-1, 1]) corners.push({ x: xSide * ROOM.halfWidth, z: zSide * ROOM.halfDepth });
    for (const corner of corners) {
      const relative = Math.atan2(corner.x - position.x, corner.z - position.z) - yaw;
      const wrapped = Math.atan2(Math.sin(relative), Math.cos(relative));
      for (const offset of [-0.00001, 0.00001]) if (Math.abs(wrapped + offset) < halfAngle) angles.push(wrapped + offset);
    }
    angles.sort((a, b) => a - b);
    while (angles.length <= cue.steps) angles.push(halfAngle);
    for (let i = 0; i <= cue.steps; i++) {
      const angle = yaw + angles[i];
      const direction = { x: Math.sin(angle), z: Math.cos(angle) };
      const clipped = rayCoverDistance(position, direction, range, ROOM);
      const x = direction.x * clipped, z = direction.z * clipped;
      positions.push(x, 0, z);
      line.push(new Vector3(x, 0.005, z));
    }
    line.push(new Vector3(0, 0.005, 0));
    cue.fill.updateVerticesData(VertexBuffer.PositionKind, positions);
    cue.fill.refreshBoundingInfo();
    MeshBuilder.CreateLines(cue.outline.name, { points: line, instance: cue.outline }, this.scene);
    const tint = Color3.FromHexString(color);
    cue.material.diffuseColor.copyFrom(tint);
    cue.material.emissiveColor.copyFrom(tint);
    cue.material.alpha = alpha;
    cue.outline.color.copyFrom(tint);
  }

  private buildTargetRing(name: string, radius: number): Mesh {
    const mesh = MeshBuilder.CreateTorus(name, { diameter: radius * 2, thickness: 0.035, tessellation: 32 }, this.scene);
    mesh.material = this.material('eligible-target-ring', PALETTE.gold);
    mesh.isPickable = false;
    mesh.scaling.y = 0.15;
    mesh.setEnabled(false);
    return mesh;
  }

  private buildBoxer(id: string, index: number): BoxerView {
    const root = new TransformNode(`boxer-${id}`, this.scene);
    const body = new TransformNode(`boxer-body-${id}`, this.scene);
    body.parent = root;
    const arms: TransformNode[] = [], legs: TransformNode[] = [];
    const material = this.material(`boxer-jersey-${id}`, '#935758');
    this.disc(`boxer-shadow-${id}`, BOXER_RULES.radius * 2 + 0.2, this.material('shadow', '#142B33', 0.25), root, 0, 0.004, 0);
    this.box(`boxer-jersey-${id}`, 0.57, 0.56, 0.36, material, body, 0, 1.02, 0);
    this.box(`boxer-waist-${id}`, 0.52, 0.10, 0.37, this.color('cream'), body, 0, 0.76, 0);
    this.box(`boxer-shorts-${id}`, 0.50, 0.29, 0.36, this.color('plum'), body, 0, 0.57, 0);
    this.sphere(`boxer-head-${id}`, 0.45, this.color('skin'), body, 0, 1.58, 0);
    this.cylinder(`boxer-neck-${id}`, 0.23, 0.17, this.color('skin'), body, 0, 1.33, 0);
    this.box(`boxer-brow-${id}`, 0.29, 0.035, 0.035, this.color('hair'), body, 0, 1.64, 0.208);
    this.box(`boxer-nose-${id}`, 0.075, 0.08, 0.11, this.color('skin'), body, 0, 1.57, 0.22);
    for (const side of [-1, 1]) {
      const leg = new TransformNode(`boxer-leg-${id}-${side}`, this.scene);
      leg.parent = body;
      leg.position.set(side * 0.15, 0.59, 0);
      this.cylinder(`boxer-leg-skin-${id}`, 0.21, 0.39, this.color('skin'), leg, 0, -0.18, 0);
      this.box(`boxer-boot-${id}`, 0.23, 0.18, 0.33, this.color('cream'), leg, 0, -0.45, 0.06);
      legs.push(leg);
      const arm = new TransformNode(`boxer-arm-${id}-${side}`, this.scene);
      arm.parent = body;
      arm.position.set(side * 0.35, 1.11, 0.12);
      this.cylinder(`boxer-upper-arm-${id}`, 0.2, 0.25, this.color('skin'), arm, 0, 0, 0);
      this.sphere(`boxer-glove-${id}`, 0.32, this.color('coral'), arm, 0, 0.06, 0.23);
      arms.push(arm);
    }
    this.box(`boxer-number-${id}`, 0.06 + index * 0.035, 0.18, 0.02, this.color('cream'), body, 0, 1.06, 0.191);
    const health = new TransformNode(`boxer-health-${id}`, this.scene);
    // Align the bar with screen-right (+X,+Z), not the camera depth axis.
    health.rotation.y = -Math.PI / 4;
    this.box(`boxer-health-track-${id}`, 0.88, 0.085, 0.04, this.color('ink'), health, 0, 0, 0);
    const healthFill = this.box(`boxer-health-fill-${id}`, 0.80, 0.045, 0.05, this.color('coral'), health, 0, 0, -0.01);
    const cue = this.buildCone(`boxer-threat-${id}`, '#F6B856');
    return { root, body, arms, legs, cue, health, healthFill, target: this.buildTargetRing(`boxer-target-${id}`, BOXER_RULES.radius), material };
  }

  private updateBoxer(enemy: EnemyState, visual: BoxerView, time: number): void {
    visual.root.position.set(enemy.position.x, 0.08, enemy.position.z);
    visual.root.rotation.y = Math.atan2(enemy.facing.x, enemy.facing.z);
    const dead = enemy.phase === 'defeated';
    const walking = enemy.phase === 'approach';
    const flashing = Math.min(1, enemy.hitFlash / 0.18);
    visual.material.diffuseColor.copyFrom(Color3.Lerp(Color3.FromHexString('#935758'), Color3.FromHexString(PALETTE.cream), flashing));
    visual.body.rotation.x = dead ? -Math.PI / 2 : enemy.phase === 'staggered' ? -0.25 : enemy.phase === 'recovery' ? 0.13 : 0;
    visual.body.rotation.z = enemy.phase === 'staggered' ? Math.sin(time * 24) * 0.11 : 0;
    visual.body.position.y = dead ? 0.28 : walking ? Math.abs(Math.sin(time * 11)) * 0.028 : 0;
    visual.legs.forEach((leg, i) => { leg.rotation.x = walking ? Math.sin(time * 11 + i * Math.PI) * 0.27 : 0; });
    const phase = enemy.phase;
    visual.arms.forEach((arm, i) => {
      const punching = i === 1;
      arm.position.z = 0.12 + (punching ? phase === 'preparation' ? -0.16 * enemy.attackProgress : phase === 'active' ? 0.47 : phase === 'recovery' ? 0.47 * (1 - enemy.attackProgress) : 0 : 0);
      arm.position.y = phase === 'preparation' ? 1.20 : phase === 'staggered' ? 0.94 : 1.11;
      arm.rotation.x = phase === 'preparation' ? -0.22 : 0;
    });
    const threatening = phase === 'preparation' || phase === 'active';
    visual.cue.root.setEnabled(threatening);
    if (threatening) this.updateCone(visual.cue, enemy.position, enemy.facing, BOXER_RULES.range, BOXER_RULES.halfAngle,
      phase === 'active' ? '#FF6B57' : '#F6B856', phase === 'active' ? 0.58 : 0.16 + enemy.attackProgress * 0.22);
    visual.health.setEnabled(!dead);
    visual.health.position.set(enemy.position.x, 2.08, enemy.position.z);
    const hp = Math.max(0, enemy.health / enemy.maxHealth);
    visual.healthFill.scaling.x = hp;
    visual.healthFill.position.x = (hp - 1) * 0.4;
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

  render(state: GameState, events: HitEvent[], dt: number, cosmeticDt = 0): void {
    const cosmeticStep = state.outcome === 'complete' ? Math.max(0, Math.min(0.1, cosmeticDt)) : 0;
    const effectDt = Math.max(0, Math.min(dt, state.time - this.previousTime)) + cosmeticStep;
    if (state.time < this.previousTime || state.weapon !== this.lastWeapon || this.lastOutcome !== 'playing' && state.outcome === 'playing') {
      this.lastHitId = -1;
      this.previous = null;
      this.walkPhase = 0;
      this.terminalSwing = null;
      this.pillarPose = samplePillarPose('ready', 0);
      for (const effect of this.impacts) { effect.age = 1; effect.root.setEnabled(false); }
    }
    const finishingPillarHit = state.outcome === 'complete' && state.weapon === 'weapon_03'
      && events.some(event => event.id > this.lastHitId && event.source === 'player' && event.weapon === 'weapon_03');
    if (finishingPillarHit) this.terminalSwing = Math.max(0, Math.min(1, state.player.attackProgress)) * WEAPONS.weapon_03.active / 60;
    else if (this.terminalSwing !== null) {
      this.terminalSwing += cosmeticStep;
      if (this.terminalSwing >= (WEAPONS.weapon_03.active + WEAPONS.weapon_03.recovery) / 60 || state.outcome !== 'complete') this.terminalSwing = null;
    }
    this.lastWeapon = state.weapon;
    this.lastOutcome = state.outcome;
    this.previousTime = state.time;
    const p = state.player;
    const moved = this.previous ? Math.hypot(p.position.x - this.previous.x, p.position.z - this.previous.z) : 0;
    this.previous = { ...p.position };
    const walking = moved > 0.0001 && p.dashRemaining <= 0;
    if (walking) this.walkPhase += moved * 7.5;
    this.player.position.set(p.position.x, 0.065, p.position.z);
    this.player.rotation.y = Math.atan2(p.facing.x, p.facing.z);
    this.body.position.y = walking ? Math.abs(Math.sin(this.walkPhase)) * 0.055 : Math.sin(state.time * 3) * 0.018;
    this.body.rotation.x = p.health <= 0 ? -Math.PI * 0.45 : p.hitFlash > 0 ? -0.10 : p.dashRemaining > 0 ? 0.2 : 0;
    this.body.rotation.y = 0;
    this.body.rotation.z = 0;
    this.torso.rotation.set(0, 0, 0);
    this.legs.forEach((leg, i) => { leg.rotation.x = walking ? Math.sin(this.walkPhase + i * Math.PI) * 0.42 : 0; });
    const phase = p.attackPhase;
    const weapon = WEAPONS[state.weapon];
    const range = (state as GameState & { effectiveRange?: number }).effectiveRange ?? weapon.range;
    const candidates = state.sessionMode === 'dummy' ? [{ ...state.dummy, id: 'dummy' }] : state.enemies;
    const gloves = state.weapon === 'weapon_02';
    const rifle = state.weapon === 'weapon_01';
    this.gloves.forEach(mesh => mesh.setEnabled(gloves));
    this.rifle.setEnabled(rifle);
    this.pillar.setEnabled(state.weapon === 'weapon_03');
    const holdingPillar = state.weapon === 'weapon_03' && p.health > 0;
    this.arms.forEach(arm => arm.setEnabled(!holdingPillar));
    this.legs.forEach(leg => leg.setEnabled(!holdingPillar));
    this.pillarArms.forEach(limb => limb.root.setEnabled(holdingPillar));
    this.pillarLegs.forEach(limb => limb.root.setEnabled(holdingPillar));
    const extension = phase === 'active' ? 0.50 : phase === 'startup' ? -0.08 * p.attackProgress : phase === 'recovery' ? 0.48 * (1 - p.attackProgress) : 0;
    this.arms.forEach((arm, i) => {
      arm.position.z = 0.14 + (gloves && i === p.combo % 2 ? extension : !gloves ? 0.12 : 0);
      arm.position.y = 1.12 + (walking ? Math.sin(this.walkPhase + i * Math.PI) * 0.035 : 0);
      arm.rotation.set(0, 0, 0);
      if (rifle && phase === 'reload' && i === 0) {
        arm.position.y -= Math.sin(p.reloadProgress * Math.PI) * 0.28;
        arm.position.z += 0.08;
      }
    });
    this.rifle.position.z = 0.39 - (phase === 'active' ? 0.10 : phase === 'recovery' ? 0.10 * (1 - p.attackProgress) : 0);
    this.rifle.rotation.z = phase === 'reload' ? -0.22 : 0;
    this.rifle.rotation.x = phase === 'reload' ? -0.15 : 0;
    this.rifleMagazine.position.y = -0.21 - (phase === 'reload' ? Math.sin(p.reloadProgress * Math.PI) * 0.32 : 0);
    if (state.weapon === 'weapon_03') {
      const activeSeconds = WEAPONS.weapon_03.active / 60;
      const pose = this.terminalSwing === null ? samplePillarPose(phase, p.attackProgress)
        : this.terminalSwing < activeSeconds ? samplePillarPose('active', this.terminalSwing / activeSeconds)
        : samplePillarPose('recovery', (this.terminalSwing - activeSeconds) / (WEAPONS.weapon_03.recovery / 60));
      this.pillarPose = pose;
      this.pillar.position.set(pose.weapon.position.x, pose.weapon.position.y, pose.weapon.position.z);
      this.pillar.rotation.set(pose.weapon.rotation.x, pose.weapon.rotation.y, pose.weapon.rotation.z);
      if (holdingPillar && p.dashRemaining <= 0) {
        this.body.position.y += pose.body.height;
        this.body.rotation.set(pose.body.rotation.x + (p.hitFlash > 0 ? -0.10 : 0), pose.body.rotation.y, pose.body.rotation.z);
        this.torso.rotation.set(pose.torso.x, pose.torso.y, pose.torso.z);
      }
      if (holdingPillar) this.animatePillarLimbs(pose, walking);
    }
    this.scarf.rotation.x = p.dashRemaining > 0 ? -0.7 : Math.sin(state.time * 7) * (walking ? 0.2 : 0.035);
    this.scarf.rotation.z = walking ? Math.sin(this.walkPhase * 0.5) * 0.12 : 0;
    if (holdingPillar && p.dashRemaining <= 0) {
      this.scarf.rotation.x -= this.pillarPose.torso.x * 0.75;
      this.scarf.rotation.z -= this.pillarPose.body.rotation.y * 0.18;
    }
    this.shadow.position.set(p.position.x, 0.069, p.position.z);
    this.aim.root.setEnabled(!rifle && p.health > 0);
    if (!rifle) this.updateCone(this.aim, p.position, p.facing, range, weapon.halfAngle,
      phase === 'active' ? PALETTE.gold : PALETTE.cream, phase === 'active' ? 0.42 : phase === 'startup' ? 0.23 : phase === 'recovery' ? 0.11 : 0.055);
    const coverDistance = rayCoverDistance(p.position, p.facing, range + 1, ROOM);
    let rayDistance = Math.min(range, coverDistance);
    let rifleTarget: string | null = null;
    if (rifle) for (const target of candidates.filter(target => target.health > 0).sort((a, b) => a.id.localeCompare(b.id))) {
      const distance = rayTargetDistance(p.position, p.facing, target);
      // Match hitscan's inclusive range endpoint and cover-first intersection ties.
      if (distance <= range + 1e-9 && distance < coverDistance - 1e-9 && (distance < rayDistance - 1e-9 || !rifleTarget && distance <= rayDistance + 1e-9)) { rayDistance = distance; rifleTarget = target.id; }
    }
    this.rifleAim.setEnabled(rifle && p.health > 0);
    if (rifle) MeshBuilder.CreateLines(this.rifleAim.name, {
      points: [new Vector3(p.position.x, 0.09, p.position.z), new Vector3(p.position.x + p.facing.x * rayDistance, 0.09, p.position.z + p.facing.z * rayDistance)], instance: this.rifleAim,
    }, this.scene);
    this.dashRing.setEnabled(p.invulnerable || p.hurtRemaining > 0);
    this.dashRing.scaling.setAll(p.invulnerable ? 1 : 1.12);
    this.dashRing.visibility = p.hitFlash > 0 ? 1 : p.hurtRemaining > 0 ? 0.55 : 0.85;
    this.dashRing.position.set(p.position.x, 0.09, p.position.z);
    this.dummy.setEnabled(state.sessionMode === 'dummy');
    this.dummy.position.set(state.dummy.position.x, 0.065, state.dummy.position.z);
    const flash = Math.min(1, Math.max(0, state.dummy.hitFlash / 0.15));
    this.dummyMaterial.diffuseColor.copyFrom(Color3.Lerp(Color3.FromHexString(PALETTE.coral), Color3.FromHexString(PALETTE.cream), flash));
    const spent = state.dummy.health <= 0;
    this.dummyBody.rotation.x = spent ? -Math.PI * 0.45 : Math.sin(state.time * 42) * flash * 0.13;
    this.dummyBody.scaling.set(1 + flash * 0.08, spent ? 0.55 : 1 - flash * 0.05, 1 + flash * 0.08);
    // The floor fan shows weapon reach. Rings identify eligible target bodies,
    // including their radius at the reach boundary, using the combat helper.
    const eligible = candidates.filter(target => target.health > 0 && !rifle && meleeEligible(p.position, p.facing, target, range, weapon.halfAngle, ROOM))
      .sort((a, b) => Math.hypot(a.position.x - p.position.x, a.position.z - p.position.z) - Math.hypot(b.position.x - p.position.x, b.position.z - p.position.z) || a.id.localeCompare(b.id));
    const selected = new Set((gloves ? eligible.slice(0, 1) : eligible).map(target => target.id));
    if (rifleTarget) selected.add(rifleTarget);
    this.dummyTarget.setEnabled(state.sessionMode === 'dummy' && selected.has('dummy') && p.health > 0);
    this.dummyTarget.position.set(state.dummy.position.x, 0.095, state.dummy.position.z);
    const enemyIds = new Set(state.enemies.map(enemy => enemy.id));
    for (const [id, visual] of this.boxers) {
      if (!enemyIds.has(id) || state.sessionMode !== 'encounter') {
        visual.root.setEnabled(false); visual.cue.root.setEnabled(false); visual.health.setEnabled(false); visual.target.setEnabled(false);
      }
    }
    state.enemies.forEach((enemy, index) => {
      let visual = this.boxers.get(enemy.id);
      if (!visual) { visual = this.buildBoxer(enemy.id, index); this.boxers.set(enemy.id, visual); }
      visual.root.setEnabled(state.sessionMode === 'encounter');
      if (state.sessionMode !== 'encounter') return;
      this.updateBoxer(enemy, visual, state.time);
      visual.target.setEnabled(selected.has(enemy.id) && p.health > 0);
      visual.target.position.set(enemy.position.x, 0.095, enemy.position.z);
    });
    this.tracers.forEach((tracer, index) => {
      const event = state.tracers[index];
      tracer.setEnabled(Boolean(event));
      if (!event) return;
      // Origin/endpoints come only from simulation; this visual never deals damage.
      MeshBuilder.CreateLines(tracer.name, { points: [new Vector3(event.from.x, 0.96, event.from.z), new Vector3(event.to.x, 0.96, event.to.z)], instance: tracer }, this.scene);
      tracer.alpha = Math.min(1, event.remaining / RIFLE_RULES.tracerSeconds);
    });

    for (const event of events) {
      if (event.id <= this.lastHitId) continue;
      this.lastHitId = event.id;
      const effect = this.impacts.find(item => item.age >= 0.34) ?? this.impacts[0]!;
      effect.age = 0;
      effect.root.position.set(event.position.x, 0.08, event.position.z);
      effect.root.setEnabled(true);
    }
    for (const effect of this.impacts) {
      effect.age += effectDt;
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

  /** Debug evidence contains actual rendered hand/grip coordinates, never gameplay state. */
  getPillarPose(): PillarPose & { enabled: boolean; terminal: boolean; grips: PoseVector[]; hands: PoseVector[]; gripErrors: number[] } {
    const point = (value: Vector3): PoseVector => ({ x: value.x, y: value.y, z: value.z });
    this.pillar.computeWorldMatrix(true);
    const grips = [0.22, -0.12].map(height => Vector3.TransformCoordinates(new Vector3(0, height, 0), this.pillar.getWorldMatrix()));
    const hands = this.pillarArms.map(limb => { limb.end.computeWorldMatrix(true); return limb.end.getAbsolutePosition(); });
    return {
      ...structuredClone(this.pillarPose), enabled: this.pillar.isEnabled(), terminal: this.terminalSwing !== null,
      grips: grips.map(point), hands: hands.map(point), gripErrors: grips.map((grip, i) => Vector3.Distance(grip, hands[i])),
    };
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
