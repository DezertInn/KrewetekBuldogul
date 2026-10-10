import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
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
import type { EnemyState, GameState, HitEvent, Room, Vec2 } from '../game/types';
import { samplePillarPose, twoBoneJoint, type PillarPose, type PoseVector } from './pillar-animation';
import { sculpt, type SculptRing } from './sculpt';
import { buildGymRoom, type GymRoomView } from './gym-room';
import { sampleGlovePose } from './weapon-poses';

// Original editable 3D art: authored silhouettes, volumes, materials and rigs.
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
  archetype: EnemyState['archetype']; limbs: LimbView[]; guard: RangeCue; zone: Mesh; lane: Mesh; roleMark: Mesh;
};
type LimbView = { root: TransformNode; upper: Mesh; lower: Mesh; joint: Mesh; end: Mesh };

export class GameView {
  readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: FreeCamera;
  private readonly instrumentation: SceneInstrumentation;
  private readonly materials = new Map<string, StandardMaterial>();
  private room: Room = ROOM;
  private roomKey = '';
  private roomView: GymRoomView | null = null;
  private reducedEffects = false;
  private readonly player: TransformNode;
  private readonly body: TransformNode;
  private readonly torso: TransformNode;
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
  private wasWalking = false;
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

    this.setRoom(ROOM);
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

  private setRoom(room: Room): void {
    const key = JSON.stringify([room]);
    this.room = room;
    if (key === this.roomKey) return;
    this.roomView?.root.dispose(false, false);
    for (const texture of this.roomView?.textures ?? []) texture.dispose();
    this.roomView = buildGymRoom(this.scene, room, (name, color, alpha) => this.material(name, color, alpha));
    this.roomKey = key;
    if (this.player) this.resize();
  }

  private volume(name: string, rings: SculptRing[], material: StandardMaterial, parent: TransformNode, x = 0, y = 0, z = 0, sides = 12): Mesh {
    return this.place(sculpt(name, rings, this.scene, sides), material, parent, x, y, z);
  }

  /** Merge non-articulated pieces only; hands, weapons and joints retain their pivots. */
  private batchChildren(parent: TransformNode): void {
    const groups = new Map<StandardMaterial, Mesh[]>();
    for (const mesh of parent.getChildMeshes(true)) if (mesh instanceof Mesh && mesh.material instanceof StandardMaterial) {
      mesh.computeWorldMatrix(true);
      const list = groups.get(mesh.material) ?? []; list.push(mesh); groups.set(mesh.material, list);
    }
    const inverse = Matrix.Invert(parent.computeWorldMatrix(true));
    for (const [material, meshes] of groups) if (meshes.length > 1) {
      const merged = Mesh.MergeMeshes(meshes, true, true);
      if (merged) {
        merged.name = `${parent.name}-${material.name}`;
        merged.bakeTransformIntoVertices(inverse); merged.parent = parent; merged.isPickable = false;
      }
    }
  }

  private buildCharacter(): void {
    this.volume('tailored-athletic-jacket', [
      { y: 0.79, x: 0.25, z: 0.18 }, { y: 0.91, x: 0.28, z: 0.19 },
      { y: 1.23, x: 0.35, z: 0.19 }, { y: 1.36, x: 0.27, z: 0.16 },
    ], this.color('teal'), this.torso);
    this.volume('jacket-structured-hem', [{ y: 0.78, x: 0.255, z: 0.186 }, { y: 0.88, x: 0.278, z: 0.196 }], this.color('ink'), this.torso);
    this.volume('athletic-hips', [{ y: 0.57, x: 0.23, z: 0.15 }, { y: 0.76, x: 0.25, z: 0.17 }, { y: 0.81, x: 0.25, z: 0.17 }], this.color('plum'), this.body);
    for (const side of [-1, 1]) {
      const panel = this.box('jacket-raglan-panel', 0.12, 0.24, 0.36, this.color('gold'), this.torso, side * 0.29, 1.23, 0.005); panel.rotation.z = side * -0.3;
      this.box('jacket-pocket-seam', 0.18, 0.02, 0.023, this.color('ink'), this.torso, side * 0.15, 0.98, 0.185).rotation.z = side * -0.18;
      this.sphere('original-ear', 0.10, this.color('skin'), this.torso, side * 0.222, 1.72, 0);
      this.sphere('eye-white', 0.057, this.color('cream'), this.torso, side * 0.10, 1.765, 0.209).scaling.set(1.2, 0.65, 0.42);
      this.sphere('eye-dark-pupil', 0.029, this.color('ink'), this.torso, side * 0.092, 1.766, 0.229);
      const brow = this.box('expressive-brow', 0.10, 0.025, 0.032, this.color('hair'), this.torso, side * 0.099, 1.817 + (side > 0 ? 0.015 : 0), 0.205); brow.rotation.z = side * -0.19;
    }
    this.box('jacket-zipper', 0.027, 0.45, 0.022, this.color('cream'), this.torso, 0, 1.04, 0.195);
    this.cylinder('adult-neck', 0.21, 0.17, this.color('skin'), this.torso, 0, 1.46, 0);
    this.volume('original-adult-jaw-and-face', [
      { y: 1.49, x: 0.10, z: 0.115, offsetZ: 0.035 }, { y: 1.58, x: 0.17, z: 0.17, offsetZ: 0.014 },
      { y: 1.72, x: 0.215, z: 0.21 }, { y: 1.88, x: 0.195, z: 0.19, offsetZ: -0.01 }, { y: 1.96, x: 0.11, z: 0.12, offsetZ: -0.02 },
    ], this.color('skin'), this.torso);
    this.volume('original-cropped-hair', [{ y: 1.85, x: 0.205, z: 0.194, offsetZ: -0.03 }, { y: 1.97, x: 0.18, z: 0.17, offsetX: -0.025, offsetZ: -0.025 }, { y: 2.02, x: 0.09, z: 0.08, offsetX: -0.065 }], this.color('hair'), this.torso);
    this.volume('asymmetric-swept-forelock', [{ y: 1.86, x: 0.15, z: 0.045 }, { y: 1.96, x: 0.12, z: 0.08, offsetX: -0.02 }, { y: 2.02, x: 0.05, z: 0.02, offsetX: -0.05 }], this.color('hair'), this.torso, -0.055, 0, 0.165);
    this.volume('angular-comic-nose', [{ y: 1.66, x: 0.04, z: 0.055 }, { y: 1.72, x: 0.035, z: 0.055 }, { y: 1.77, x: 0.02, z: 0.018, offsetZ: -0.025 }], this.color('skin'), this.torso, 0, 0, 0.22, 8);
    const mouth = this.box('crooked-friendly-smile', 0.14, 0.025, 0.029, this.color('ink'), this.torso, 0.014, 1.60, 0.185); mouth.rotation.z = 0.10;
    this.box('grin-highlight', 0.11, 0.012, 0.032, this.color('cream'), this.torso, 0.014, 1.604, 0.192).rotation.z = 0.10;
    this.cylinder('thick-red-white-scarf-knot', 0.45, 0.15, this.color('red'), this.torso, 0, 1.43, 0);
    this.cylinder('scarf-neck-white-stripe', 0.455, 0.048, this.color('cream'), this.torso, 0, 1.445, 0);
    this.scarf.position.set(-0.11, 1.42, 0.23);
    for (let i = 0; i < 4; i++) {
      this.volume('front-woven-scarf-tail', [{ y: -0.14, x: 0.087, z: 0.028 }, { y: 0, x: 0.080, z: 0.034 }], this.color(i % 2 ? 'cream' : 'red'), this.scarf, 0, -i * 0.13, 0.026 + i * 0.018, 8);
      const rear = this.volume('second-woven-scarf-tail', [{ y: -0.14, x: 0.092, z: 0.031 }, { y: 0, x: 0.08, z: 0.033 }], this.color(i % 2 ? 'red' : 'cream'), this.scarf, 0.30, -i * 0.11 + 0.04, -0.48 - i * 0.055, 8); rear.rotation.x = 0.42;
    }
    for (let i = 0; i < 4; i++) this.cylinder('scarf-fringe', 0.014, 0.06, this.color('cream'), this.scarf, -0.065 + i * 0.043, -0.57, 0.08);
    this.batchChildren(this.torso); this.batchChildren(this.body); this.batchChildren(this.scarf);
  }

  private buildRifle(): { root: TransformNode; magazine: Mesh } {
    const root = new TransformNode('original-stylized-grot', this.scene); root.parent = this.torso; root.position.set(0.12, 1.11, 0.35);
    const metal = this.material('rifle-metal', '#3D4955'), edge = this.material('rifle-edge', '#8998A0');
    this.box('grot-upper-receiver', 0.15, 0.15, 0.60, metal, root, 0, 0.025, 0.10);
    this.box('grot-lower-receiver', 0.12, 0.13, 0.33, this.color('ink'), root, 0, -0.065, -0.01);
    this.box('grot-flat-top-rail', 0.055, 0.035, 0.63, edge, root, 0, 0.115, 0.12);
    this.volume('grot-sport-handguard', [{ y: -0.07, x: 0.085, z: 0.19 }, { y: 0.075, x: 0.085, z: 0.19 }], this.color('plaster'), root, 0, 0, 0.44, 8);
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) this.box('grot-handguard-vent', 0.006, 0.035, 0.06, this.color('ink'), root, side * 0.081, 0.018, 0.32 + i * 0.105);
    this.box('grot-stock-beam', 0.085, 0.12, 0.27, edge, root, 0, -0.005, -0.31);
    this.box('grot-adjustable-butt', 0.13, 0.25, 0.12, this.color('ink'), root, 0, -0.045, -0.46).rotation.x = -0.12;
    const barrel = this.cylinder('grot-simplified-barrel', 0.056, 0.33, metal, root, 0, 0.025, 0.76); barrel.rotation.x = Math.PI / 2;
    const muzzle = this.cylinder('grot-rounded-muzzle', 0.083, 0.08, edge, root, 0, 0.025, 0.94); muzzle.rotation.x = Math.PI / 2;
    this.box('grot-rear-sight', 0.06, 0.058, 0.05, this.color('ink'), root, 0, 0.145, -0.10);
    this.box('grot-front-sight', 0.044, 0.07, 0.05, this.color('ink'), root, 0, 0.14, 0.57);
    this.box('grot-pistol-grip', 0.095, 0.20, 0.11, this.color('ink'), root, 0, -0.17, -0.04).rotation.x = -0.22;
    this.box('grot-trigger-guard', 0.08, 0.07, 0.14, metal, root, 0, -0.13, 0.07);
    const magazine = this.box('grot-curved-magazine', 0.105, 0.28, 0.16, this.color('ink'), root, 0, -0.21, 0.18); magazine.rotation.x = 0.15;
    // Keep the magazine articulated during reload; merge the other rigid pieces.
    magazine.parent = null; this.batchChildren(root); magazine.parent = root;
    root.setEnabled(false); return { root, magazine };
  }

  private buildPillar(): TransformNode {
    const root = new TransformNode('original-portable-monument', this.scene); root.parent = this.torso;
    const stone = this.material('pillar-warm-stone', '#C3B69B'), edge = this.material('pillar-stone-edge', '#E0CFAC'), bronze = this.material('pillar-abstract-bronze', '#706041');
    this.volume('pillar-tapered-shaft', [{ y: -0.50, x: 0.117, z: 0.117 }, { y: -0.40, x: 0.108, z: 0.108 }, { y: 0.84, x: 0.133, z: 0.133 }, { y: 0.95, x: 0.15, z: 0.15 }], stone, root, 0, 0, 0, 16);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      this.cylinder('pillar-selective-flute', 0.016, 0.95, edge, root, Math.sin(angle) * 0.123, 0.40, Math.cos(angle) * 0.123);
    }
    this.box('pillar-broad-capital', 0.49, 0.12, 0.45, edge, root, 0, 1.02, 0);
    this.box('pillar-capital-shadow-step', 0.42, 0.065, 0.39, stone, root, 0, 1.10, 0);
    this.box('pillar-square-base', 0.43, 0.12, 0.41, stone, root, 0, -0.57, 0);
    this.cylinder('pillar-base-bead', 0.31, 0.07, edge, root, 0, -0.48, 0);
    this.cylinder('pillar-neck-bead', 0.31, 0.09, edge, root, 0, 0.92, 0);
    this.cylinder('pillar-lower-red-grip', 0.265, 0.15, this.color('red'), root, 0, -0.12, 0);
    this.cylinder('pillar-upper-white-grip', 0.265, 0.15, this.color('cream'), root, 0, 0.22, 0);
    // An original tiny crowned figure, constructed here; no photograph or monument scan.
    this.volume('pillar-abstract-royal-figure', [{ y: 0, x: 0.075, z: 0.06 }, { y: 0.18, x: 0.06, z: 0.045 }, { y: 0.27, x: 0.095, z: 0.065 }], bronze, root, 0, 1.14, 0, 8);
    this.sphere('pillar-figure-head', 0.14, bronze, root, 0, 1.48, 0);
    this.cylinder('pillar-original-crown', 0.13, 0.04, this.color('gold'), root, 0, 1.55, 0, 0.16);
    this.cylinder('pillar-figure-staff', 0.024, 0.35, bronze, root, -0.105, 1.40, 0);
    this.box('pillar-figure-outstretched-arm', 0.20, 0.045, 0.045, bronze, root, -0.06, 1.39, 0).rotation.z = -0.18;
    this.batchChildren(root); root.setEnabled(false); return root;
  }

  private buildPillarLimbs(): void {
    for (const side of [-1, 1]) {
      const arm = new TransformNode(`pillar-two-handed-arm-${side}`, this.scene);
      arm.parent = this.torso;
      const upper = this.cylinder('pillar-upper-sleeve', 0.24, 1, this.color('teal'), arm, 0, 0, 0, 0.29);
      const lower = this.cylinder('pillar-forearm', 0.16, 1, this.color('skin'), arm, 0, 0, 0, 0.21);
      const joint = this.sphere('pillar-elbow', 0.22, this.color('teal'), arm, 0, 0, 0);
      joint.setEnabled(false); // sleeve and forearm meet at the actual elbow pivot
      const hand = this.sphere('pillar-gripping-hand', 0.22, this.color('skin'), arm, 0, 0, 0);
      hand.scaling.set(1, 0.82, 1);
      const cuff = this.cylinder('boxing-glove-bound-cuff', 0.25, 0.16, this.color('ink'), hand, 0, 0, 0);
      cuff.rotation.x = Math.PI / 2;
      const glove = this.volume('sculpted-boxing-glove', [
        { y: -0.15, x: 0.13, z: 0.16 }, { y: -0.05, x: 0.195, z: 0.20 },
        { y: 0.11, x: 0.18, z: 0.20 }, { y: 0.16, x: 0.13, z: 0.16 },
      ], this.color(side < 0 ? 'red' : 'cream'), hand, 0, 0.015, 0.085, 12);
      const thumb = this.sphere('boxing-glove-curled-thumb', 0.15, this.color(side < 0 ? 'red' : 'cream'), hand, -side * 0.14, -0.04, 0.06);
      const stitch = this.box('boxing-glove-knuckle-seam', 0.20, 0.015, 0.01, this.color('ink'), hand, 0, 0.05, 0.29);
      this.gloves.push(cuff, glove, thumb, stitch);
      this.pillarArms.push({ root: arm, upper, lower, joint, end: hand });
      arm.setEnabled(false);
      const leg = new TransformNode(`pillar-braced-leg-${side}`, this.scene);
      leg.parent = this.player;
      const thigh = this.cylinder('pillar-trouser-thigh', 0.24, 1, this.color('plum'), leg, 0, 0, 0, 0.28);
      const shin = this.cylinder('pillar-trouser-shin', 0.22, 1, this.color('plum'), leg, 0, 0, 0, 0.24);
      const knee = this.sphere('pillar-knee', 0.23, this.color('plum'), leg, 0, 0, 0);
      knee.setEnabled(false);
      const foot = this.box('pillar-planted-sneaker', 0.28, 0.14, 0.40, this.color('cream'), leg, 0, 0, 0);
      const sole = this.box('pillar-planted-sole', 0.29, 0.04, 0.41, this.color('ink'), foot, 0, -0.065, 0);
      sole.isPickable = false;
      this.box('sneaker-toe-cap', 0.24, 0.035, 0.12, this.color('gold'), foot, 0, 0.045, 0.12);
      for (const offset of [-0.035, 0.025]) this.box('sneaker-lace', 0.18, 0.009, 0.014, this.color('ink'), foot, 0, 0.074, offset);
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
      limb.end.rotation.set(0, 0, 0);
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

  private animateOtherLimbs(state: GameState, walking: boolean): void {
    const p = state.player;
    const glovePose = sampleGlovePose(p.attackPhase, p.attackProgress, p.combo);
    if (state.weapon === 'weapon_02' && p.health > 0 && p.dashRemaining <= 0) {
      this.body.position.y += glovePose.height; this.body.rotation.y = glovePose.twist * 0.45;
      this.torso.rotation.y = glovePose.twist * 0.55; this.torso.rotation.x = glovePose.lean;
    }
    this.player.computeWorldMatrix(true); this.body.computeWorldMatrix(true); this.torso.computeWorldMatrix(true); this.rifle.computeWorldMatrix(true);
    const inverseTorso = Matrix.Invert(this.torso.getWorldMatrix()), inversePlayer = Matrix.Invert(this.player.getWorldMatrix());
    this.pillarArms.forEach((limb, i) => {
      const side = i === 0 ? -1 : 1, shoulder = new Vector3(side * 0.35, 1.26, 0);
      let grip: Vector3;
      if (state.weapon === 'weapon_01') {
        const local = i === 0 ? new Vector3(0, -0.055, 0.36) : new Vector3(0, -0.13, -0.035);
        if (i === 0 && p.attackPhase === 'reload') local.set(0, this.rifleMagazine.position.y - 0.03, this.rifleMagazine.position.z);
        grip = Vector3.TransformCoordinates(Vector3.TransformCoordinates(local, this.rifle.getWorldMatrix()), inverseTorso);
      } else { const target = glovePose.hands[i]; grip = new Vector3(target.x, target.y, target.z); }
      const elbowPose = twoBoneJoint(shoulder, grip, 0.44, 0.48, { x: side, y: -0.6, z: -0.3 });
      const elbow = new Vector3(elbowPose.x, elbowPose.y, elbowPose.z);
      this.placeSegment(limb.upper, shoulder, elbow); this.placeSegment(limb.lower, elbow, grip);
      limb.joint.position.copyFrom(elbow); limb.end.position.copyFrom(grip);
      limb.end.rotation.set(0, state.weapon === 'weapon_02' ? side * -0.20 : 0, 0);
    });
    this.pillarLegs.forEach((limb, i) => {
      const side = i === 0 ? -1 : 1, stride = walking ? Math.sin(this.walkPhase + i * Math.PI) : 0;
      const hip = Vector3.TransformCoordinates(Vector3.TransformCoordinates(new Vector3(side * 0.17, 0.71, 0), this.body.getWorldMatrix()), inversePlayer);
      const ankle = new Vector3(side * 0.22, 0.12 + Math.max(0, stride) * 0.09, side * -0.10 + stride * 0.16);
      const kneePose = twoBoneJoint(hip, ankle, 0.34, 0.37, { x: side * 0.16, y: 0, z: 1 });
      const knee = new Vector3(kneePose.x, kneePose.y, kneePose.z);
      this.placeSegment(limb.upper, hip, knee); this.placeSegment(limb.lower, knee, ankle);
      limb.joint.position.copyFrom(knee); limb.end.position.set(ankle.x, ankle.y - 0.035, ankle.z + 0.065);
      limb.end.rotation.set(Math.max(0, stride) * -0.12, side * 0.10, 0);
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
    // Arc samples and authored cover corners, with fixed GPU buffers.
    const steps = 128;
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
    for (const obstacle of this.room.obstacles) for (const xSide of [-1, 1]) for (const zSide of [-1, 1])
      corners.push({ x: obstacle.x + xSide * obstacle.width / 2, z: obstacle.z + zSide * obstacle.depth / 2 });
    for (const xSide of [-1, 1]) for (const zSide of [-1, 1]) corners.push({ x: xSide * this.room.halfWidth, z: zSide * this.room.halfDepth });
    for (const corner of corners) {
      const relative = Math.atan2(corner.x - position.x, corner.z - position.z) - yaw;
      const wrapped = Math.atan2(Math.sin(relative), Math.cos(relative));
      for (const offset of [-0.00001, 0.00001]) if (Math.abs(wrapped + offset) < halfAngle) angles.push(wrapped + offset);
    }
    angles.sort((a, b) => a - b);
    if (angles.length > cue.steps + 1) {
      const sampled = Array.from({ length: cue.steps + 1 }, (_, i) => angles[Math.round(i * (angles.length - 1) / cue.steps)]);
      angles.splice(0, angles.length, ...sampled);
    }
    while (angles.length <= cue.steps) angles.push(halfAngle);
    for (let i = 0; i <= cue.steps; i++) {
      const angle = yaw + angles[i];
      const direction = { x: Math.sin(angle), z: Math.cos(angle) };
      const clipped = rayCoverDistance(position, direction, range, this.room);
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

  private buildBoxer(enemy: EnemyState): BoxerView {
    const id = enemy.id, role = enemy.archetype;
    const root = new TransformNode(`boxer-${id}`, this.scene), body = new TransformNode(`boxer-body-${id}`, this.scene); body.parent = root;
    const coach = role === 'B01_M01', clincher = role === 'B01_E03', counter = role === 'B01_E02';
    const width = coach ? 0.44 : clincher ? 0.40 : counter ? 0.36 : 0.285;
    const color = coach ? '#B37C47' : clincher ? '#6F7250' : counter ? '#515C76' : '#A25E60';
    const material = this.material(`boxer-jersey-${id}`, color);
    root.scaling.setAll(coach ? 1.28 : clincher ? 1.07 : 1);
    this.disc(`boxer-shadow-${id}`, enemy.radius * 2 + 0.18, this.material('shadow', '#142B33', 0.25), root, 0, 0.004, 0);
    this.volume(`boxer-sculpted-${role}-torso`, [{ y: 0.73, x: width * 0.77, z: 0.16 }, { y: 0.90, x: width * (clincher ? 1.06 : 0.86), z: clincher ? 0.26 : 0.20 }, { y: 1.22, x: width, z: 0.20 }, { y: 1.32, x: width * 0.77, z: 0.16 }], material, body);
    this.volume('boxer-tailored-shorts', [{ y: 0.48, x: width * 0.79, z: 0.18 }, { y: 0.73, x: width * 0.80, z: 0.18 }], this.color('plum'), body);
    this.volume('boxer-wide-waistband', [{ y: 0.70, x: width * 0.83, z: 0.184 }, { y: 0.78, x: width * 0.82, z: 0.183 }], this.color('cream'), body);
    this.cylinder('boxer-neck', 0.22, 0.15, this.color('skin'), body, 0, 1.38, 0);
    this.volume('boxer-adult-jaw', [{ y: 1.44, x: 0.11, z: 0.11, offsetZ: 0.025 }, { y: 1.53, x: 0.18, z: 0.17 }, { y: 1.72, x: 0.20, z: 0.19 }, { y: 1.84, x: 0.12, z: 0.12 }], this.color('skin'), body);
    this.volume(coach ? 'coach-cropped-flat-hair' : 'boxer-short-hair', [{ y: 1.72, x: 0.203, z: 0.18, offsetZ: -0.018 }, { y: 1.85, x: coach ? 0.17 : 0.14, z: 0.14 }, { y: 1.88, x: 0.10, z: 0.08 }], this.color(coach || counter ? 'ink' : 'hair'), body);
    this.box('boxer-brow', 0.28, 0.028, 0.03, this.color('hair'), body, 0, 1.70, 0.186);
    this.box('boxer-angular-nose', 0.075, 0.08, 0.09, this.color('skin'), body, 0, 1.62, 0.207);
    for (const side of [-1, 1]) this.sphere('boxer-eye', 0.028, this.color('ink'), body, side * 0.09, 1.655, 0.196);
    if (counter) for (const side of [-1, 1]) this.box('counter-square-shoulder-panel', 0.13, 0.17, 0.36, this.color('cream'), body, side * width * 0.78, 1.24, 0);
    if (coach) {
      this.box('coach-jacket-lapel', 0.065, 0.38, 0.04, this.color('cream'), body, -0.14, 1.11, 0.21).rotation.z = -0.21;
      this.box('coach-jacket-lapel', 0.065, 0.38, 0.04, this.color('cream'), body, 0.14, 1.11, 0.21).rotation.z = 0.21;
      this.cylinder('coach-whistle-prop', 0.067, 0.09, this.color('gold'), body, 0, 1.08, 0.237).rotation.x = Math.PI / 2;
    }
    this.box(`role-mark-${role}`, clincher ? 0.19 : 0.055, counter ? 0.08 : 0.24, 0.022, this.color('cream'), body, 0, 1.04, 0.21);
    this.batchChildren(body);
    // The role marker remains separately controllable for a non-colour boss phase cue.
    const marker = this.box('boss-phase-chevron', 0.16, 0.036, 0.025, this.color('gold'), body, 0, 1.15, 0.23); marker.rotation.z = -0.35; marker.setEnabled(coach);
    const arms: TransformNode[] = [], legs: TransformNode[] = [], limbs: LimbView[] = [];
    for (const side of [-1, 1]) {
      const arm = new TransformNode(`boxer-articulated-arm-${id}-${side}`, this.scene); arm.parent = body;
      const upper = this.cylinder('boxer-upper-arm', counter ? 0.24 : 0.21, 1, this.color('skin'), arm, 0, 0, 0, counter ? 0.28 : 0.24);
      const lower = this.cylinder('boxer-forearm', 0.17, 1, this.color('skin'), arm, 0, 0, 0, 0.21);
      const joint = this.sphere('boxer-elbow', 0.205, this.color('skin'), arm, 0, 0, 0);
      joint.setEnabled(false);
      const end = this.sphere(clincher ? 'clincher-open-hand' : 'boxer-padded-glove', clincher ? 0.25 : coach ? 0.39 : 0.33, this.color(clincher ? 'cream' : 'coral'), arm, 0, 0, 0);
      if (counter) this.cylinder('boxer-wrist-wrap', 0.23, 0.12, this.color('cream'), end, 0, -0.07, -0.07).rotation.x = Math.PI / 2;
      if (clincher) for (const offset of [-0.07, 0, 0.07]) this.box('clincher-finger-silhouette', 0.045, 0.10, 0.07, this.color('cream'), end, offset, 0.085, 0.07);
      this.batchChildren(end);
      limbs.push({ root: arm, upper, lower, joint, end }); arms.push(arm);
      const leg = new TransformNode(`boxer-legged-${id}-${side}`, this.scene); leg.parent = body; leg.position.set(side * width * 0.57, 0.60, 0);
      this.cylinder('boxer-calf', 0.22, 0.38, this.color('skin'), leg, 0, -0.17, 0, 0.25);
      this.cylinder('boxer-long-sock', 0.224, 0.15, this.color('cream'), leg, 0, -0.32, 0);
      this.box('boxer-boot', 0.25, 0.16, 0.38, this.color('ink'), leg, 0, -0.46, 0.06);
      this.box('boxer-boot-toe', 0.24, 0.075, 0.13, this.color('cream'), leg, 0, -0.445, 0.19); this.batchChildren(leg); legs.push(leg);
    }
    const health = new TransformNode(`boxer-health-${id}`, this.scene); health.rotation.y = -Math.PI / 4;
    const barWidth = coach ? 1.40 : 0.88;
    this.box('boxer-health-track', barWidth, 0.085, 0.04, this.color('ink'), health, 0, 0, 0);
    const healthFill = this.box('boxer-health-fill', barWidth - 0.08, 0.045, 0.05, this.color('coral'), health, 0, 0, -0.01);
    const cue = this.buildCone(`boxer-threat-${id}`, '#F6B856'), guard = this.buildCone(`boxer-guard-${id}`, '#A8DBEF'); guard.root.setEnabled(false);
    const danger = this.material(`boxer-zone-${id}`, '#F6B856', 0.25); danger.disableLighting = true; danger.emissiveColor = Color3.FromHexString('#F6B856');
    const zone = this.disc('enemy-circle-threat', 2, danger, null, 0, 0.091, 0); zone.setEnabled(false);
    const lane = this.box('enemy-charge-threat', 1, 0.006, 1, danger, null, 0, 0.092, 0); lane.setEnabled(false);
    return { root, body, arms, legs, limbs, cue, guard, zone, lane, health, healthFill, target: this.buildTargetRing(`boxer-target-${id}`, enemy.radius), material, archetype: role, roleMark: marker };
  }

  private updateBoxer(enemy: EnemyState, visual: BoxerView, time: number): void {
    visual.root.position.set(enemy.position.x, 0.08, enemy.position.z); visual.root.rotation.y = Math.atan2(enemy.facing.x, enemy.facing.z);
    const role = enemy.archetype, coach = role === 'B01_M01', clincher = role === 'B01_E03', counter = role === 'B01_E02';
    const dead = enemy.phase === 'defeated', walking = enemy.phase === 'approach', phase = enemy.phase;
    const flashing = this.reducedEffects ? 0 : Math.min(1, enemy.hitFlash / 0.18);
    const color = coach ? '#B37C47' : clincher ? '#6F7250' : counter ? '#515C76' : '#A25E60';
    visual.material.diffuseColor.copyFrom(Color3.Lerp(Color3.FromHexString(color), Color3.FromHexString(PALETTE.cream), flashing));
    visual.body.rotation.set(dead ? -0.96 : phase === 'staggered' ? -0.23 : phase === 'preparation' ? (clincher ? 0.22 : -0.10) : phase === 'recovery' ? 0.13 : 0, phase === 'active' && enemy.attackKind === 'sweep' ? 0.35 : 0, phase === 'staggered' && !this.reducedEffects ? Math.sin(time * 24) * 0.08 : 0);
    visual.body.position.y = dead ? 0.24 : phase === 'preparation' && (clincher || enemy.attackKind === 'slam') ? -0.08 : walking ? Math.abs(Math.sin(time * 11)) * 0.025 : 0;
    visual.legs.forEach((leg, i) => { leg.rotation.x = walking ? Math.sin(time * 11 + i * Math.PI) * 0.26 : dead ? -0.4 : 0; });
    const width = coach ? 0.44 : clincher ? 0.40 : counter ? 0.36 : 0.285;
    visual.limbs.forEach((limb, i) => {
      const side = i === 0 ? -1 : 1, shoulder = new Vector3(side * (width + 0.02), 1.23, 0);
      const guard = enemy.guardActive, loading = phase === 'preparation', attacking = phase === 'active', recovery = phase === 'recovery';
      let hand = new Vector3(side * width * 0.78, guard ? 1.45 : clincher ? 0.97 : 1.23, guard ? 0.29 : clincher ? 0.40 : 0.38);
      if (loading) hand = new Vector3(side * (clincher ? 0.47 : width * 0.76), enemy.attackKind === 'slam' ? 1.64 : clincher ? 0.99 : 1.32, clincher ? 0.42 : 0.24);
      if (attacking || recovery) {
        const amount = attacking ? 1 : Math.max(0, 1 - enemy.attackProgress);
        if (enemy.attackKind === 'charge') hand = new Vector3(side * 0.41, 1.05, 0.43 + amount * 0.16);
        else if (enemy.attackKind === 'slam') hand = new Vector3(side * 0.24, 1.30 - amount * 0.38, 0.43 + amount * 0.15);
        else if (enemy.attackKind === 'sweep') hand = new Vector3(side * width * (1 - amount * 0.4), 1.22, 0.38 + amount * 0.34);
        else if (i === (enemy.attackKind === 'double-jab' && enemy.attackProgress > 0.5 ? 0 : 1)) hand.z += amount * 0.37;
      }
      if (dead) hand.set(side * 0.35, 0.85, 0.17);
      const elbowPose = twoBoneJoint(shoulder, hand, 0.40, 0.44, { x: side, y: -0.65, z: -0.3 }); const elbow = new Vector3(elbowPose.x, elbowPose.y, elbowPose.z);
      this.placeSegment(limb.upper, shoulder, elbow); this.placeSegment(limb.lower, elbow, hand); limb.joint.position.copyFrom(elbow); limb.end.position.copyFrom(hand);
    });
    const threatening = phase === 'preparation' || phase === 'active', shape = enemy.attackShape;
    visual.cue.root.setEnabled(threatening && (!shape || shape.kind === 'cone'));
    visual.zone.setEnabled(threatening && shape?.kind === 'circle'); visual.lane.setEnabled(threatening && shape?.kind === 'lane');
    const cueColor = phase === 'active' ? '#FF6B57' : '#F6B856', alpha = phase === 'active' ? 0.56 : 0.18 + enemy.attackProgress * 0.20;
    if (threatening && (!shape || shape.kind === 'cone')) this.updateCone(visual.cue, enemy.position, enemy.facing, shape?.range ?? BOXER_RULES.range, shape?.halfAngle ?? BOXER_RULES.halfAngle, cueColor, alpha);
    if (threatening && shape) {
      const center = shape.center ?? enemy.position;
      if (shape.kind === 'circle') { visual.zone.position.set(center.x, 0.095, center.z); visual.zone.scaling.set(shape.range, 1, shape.range); }
      if (shape.kind === 'lane') {
        visual.lane.position.set(center.x + enemy.facing.x * shape.range / 2, 0.095, center.z + enemy.facing.z * shape.range / 2);
        visual.lane.rotation.y = Math.atan2(enemy.facing.x, enemy.facing.z); visual.lane.scaling.set(shape.width ?? 1.2, 1, shape.range);
      }
      const mat = visual.zone.material as StandardMaterial; mat.alpha = alpha; mat.emissiveColor.copyFrom(Color3.FromHexString(cueColor)); mat.diffuseColor.copyFrom(mat.emissiveColor);
    }
    visual.guard.root.setEnabled(Boolean(enemy.guardActive && !dead));
    if (enemy.guardActive && !dead) this.updateCone(visual.guard, enemy.position, enemy.facing, enemy.radius + 0.45, enemy.guardHalfAngle, '#A8DBEF', 0.11);
    visual.roleMark.setEnabled(coach && !dead); visual.roleMark.scaling.y = enemy.bossPhase === 2 ? 2 : 1;
    visual.roleMark.rotation.z = enemy.phase === 'transition' ? Math.PI / 2 : -0.35;
    visual.health.setEnabled(!dead); visual.health.position.set(enemy.position.x, coach ? 2.65 : clincher ? 2.18 : 2.08, enemy.position.z);
    const hp = Math.max(0, enemy.health / enemy.maxHealth), barWidth = coach ? 1.32 : 0.80;
    visual.healthFill.scaling.x = hp; visual.healthFill.position.x = (hp - 1) * barWidth / 2;
  }

  private disposeBoxer(visual: BoxerView): void {
    visual.root.dispose(); visual.health.dispose(); visual.cue.root.dispose(); visual.guard.root.dispose();
    visual.target.dispose(); visual.zone.dispose(); visual.lane.dispose();
    for (const material of [visual.material, visual.cue.material, visual.guard.material, visual.zone.material]) if (material instanceof StandardMaterial) {
      this.materials.delete(material.name); material.dispose();
    }
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
    this.setRoom(state.room ?? ROOM);
    const simulationAdvanced = state.time > this.previousTime;
    const cosmeticStep = state.outcome === 'complete' ? Math.max(0, Math.min(0.1, cosmeticDt)) : 0;
    const effectDt = Math.max(0, Math.min(dt, state.time - this.previousTime)) + cosmeticStep;
    if (state.time < this.previousTime || state.weapon !== this.lastWeapon || this.lastOutcome !== 'playing' && state.outcome === 'playing') {
      this.lastHitId = -1;
      this.previous = null;
      this.walkPhase = 0;
      this.wasWalking = false;
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
    const walking = simulationAdvanced || cosmeticStep > 0 || moved > 0.0001 ? moved > 0.0001 && p.dashRemaining <= 0 : this.wasWalking;
    this.wasWalking = walking;
    if (walking) this.walkPhase += moved * 7.5;
    this.player.position.set(p.position.x, 0.065, p.position.z);
    this.player.rotation.y = Math.atan2(p.facing.x, p.facing.z);
    this.body.position.y = walking ? Math.abs(Math.sin(this.walkPhase)) * 0.055 : Math.sin(state.time * 3) * 0.018;
    this.body.rotation.x = p.health <= 0 ? -Math.PI * 0.45 : p.hitFlash > 0 ? -0.10 : p.dashRemaining > 0 ? 0.2 : 0;
    this.body.rotation.y = 0;
    this.body.rotation.z = 0;
    this.torso.rotation.set(0, 0, 0);
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
    this.pillarArms.forEach(limb => limb.root.setEnabled(true));
    this.pillarLegs.forEach(limb => limb.root.setEnabled(true));
    this.rifle.position.z = 0.35 - (phase === 'active' ? 0.07 : phase === 'recovery' ? 0.07 * (1 - p.attackProgress) : 0);
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
    } else this.animateOtherLimbs(state, walking);
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
    const coverDistance = rayCoverDistance(p.position, p.facing, range + 1, this.room);
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
    const flash = this.reducedEffects ? 0 : Math.min(1, Math.max(0, state.dummy.hitFlash / 0.15));
    this.dummyMaterial.diffuseColor.copyFrom(Color3.Lerp(Color3.FromHexString(PALETTE.coral), Color3.FromHexString(PALETTE.cream), flash));
    const spent = state.dummy.health <= 0;
    this.dummyBody.rotation.x = spent ? -Math.PI * 0.45 : Math.sin(state.time * 42) * flash * 0.13;
    this.dummyBody.scaling.set(1 + flash * 0.08, spent ? 0.55 : 1 - flash * 0.05, 1 + flash * 0.08);
    // The floor fan shows weapon reach. Rings identify eligible target bodies,
    // including their radius at the reach boundary, using the combat helper.
    const eligible = candidates.filter(target => target.health > 0 && !rifle && meleeEligible(p.position, p.facing, target, range, weapon.halfAngle, this.room))
      .sort((a, b) => Math.hypot(a.position.x - p.position.x, a.position.z - p.position.z) - Math.hypot(b.position.x - p.position.x, b.position.z - p.position.z) || a.id.localeCompare(b.id));
    const selected = new Set((gloves ? eligible.slice(0, 1) : eligible).map(target => target.id));
    if (rifleTarget) selected.add(rifleTarget);
    this.dummyTarget.setEnabled(state.sessionMode === 'dummy' && selected.has('dummy') && p.health > 0);
    this.dummyTarget.position.set(state.dummy.position.x, 0.095, state.dummy.position.z);
    const enemyIds = new Set(state.enemies.map(enemy => enemy.id));
    for (const [id, visual] of this.boxers) {
      if (!enemyIds.has(id) || state.sessionMode !== 'encounter') {
        this.disposeBoxer(visual); this.boxers.delete(id);
      }
    }
    state.enemies.forEach(enemy => {
      let visual = this.boxers.get(enemy.id);
      if (state.sessionMode !== 'encounter') return;
      if (visual && visual.archetype !== enemy.archetype) { this.disposeBoxer(visual); this.boxers.delete(enemy.id); visual = undefined; }
      if (!visual) { visual = this.buildBoxer(enemy); this.boxers.set(enemy.id, visual); }
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
      if (this.reducedEffects) continue;
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
    if (this.roomView) {
      this.roomView.exitLock?.setEnabled(state.outcome !== 'complete');
      this.roomView.exitArrow?.setEnabled(state.outcome === 'complete');
      const actors = [p.position, ...state.enemies.filter(enemy => enemy.health > 0).map(enemy => enemy.position)];
      for (const prop of this.roomView.occluders) {
        // Projected camera ray: fade a prop in front of an actor, retain its footprint.
        const obstructing = actors.some(actor => {
          const dx = prop.position.x - actor.x, dz = prop.position.z - actor.z;
          const depth = (dx - dz) * Math.SQRT1_2, lateral = Math.abs((dx + dz) * Math.SQRT1_2);
          return depth > 0 && depth < prop.height / Math.tan(35 * Math.PI / 180) + 0.3 && lateral < (prop.width + prop.depth) * 0.36 + 0.32;
        });
        for (const mesh of prop.meshes) mesh.visibility = obstructing ? 0.25 : 1;
      }
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
    const span = this.room.halfWidth + this.room.halfDepth;
    const halfHeight = Math.max(7.75, span * 0.49, span * Math.SQRT1_2 / Math.max(0.2, aspect) + 0.8);
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

  setReducedEffects(enabled: boolean): void {
    this.reducedEffects = enabled;
    if (enabled) for (const effect of this.impacts) { effect.age = 1; effect.root.setEnabled(false); }
  }

  getMetrics(): { fps: number; meshes: number; drawCalls: number; visibleTriangles: number; materials: number; textures: number; roomId: string; renderer: string; webglVersion: string; renderSize: [number, number] } {
    const gl = this.engine.getGlInfo();
    const active = this.scene.getActiveMeshes();
    return {
      fps: this.engine.getFps(), meshes: this.scene.meshes.length,
      drawCalls: this.instrumentation.drawCallsCounter.current,
      visibleTriangles: active.data.slice(0, active.length).filter(mesh => !(mesh instanceof LinesMesh)).reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0),
      materials: this.scene.materials.length, textures: this.scene.textures.length,
      roomId: this.room.id ?? 'practice',
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
