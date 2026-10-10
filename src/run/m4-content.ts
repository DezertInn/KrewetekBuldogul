import { RULES } from '../game/config';
import type { EnemyDefinition, Room, Vec2 } from '../game/types';

export const M4_CONTENT_VERSION = 'm4-b01-six-rooms-v1';
export const M4_SCHEMA_VERSION = 1;
export const M4_BUILD_ID = 'm4-prototype-1';

export interface M4RoomDefinition {
  id: string;
  levelId: string;
  roomId: string;
  encounterId: string;
  name: string;
  room: Room;
  enemyDefinitions: readonly EnemyDefinition[];
}

function room(levelId: string, index: number, levelName: string, name: string, theme: 'warmup' | 'bags' | 'ring', obstacles: Room['obstacles'], boss = false): Room {
  return { id: `${levelId}_R0${index}`, levelId, levelName, name, theme, halfWidth: boss ? 9 : 8, halfDepth: boss ? 7 : 6, obstacles, playerSpawn: { x: 0, z: boss ? -4.8 : -4.3 }, exit: { x: 0, z: boss ? 5.5 : 4.6 } };
}
function definition(levelId: string, index: number, spatial: Room, enemies: readonly [EnemyDefinition['archetype'], number, number][]): M4RoomDefinition {
  const roomId = `${levelId}_R0${index}`;
  return { id: roomId, levelId, roomId, encounterId: `${roomId}_E01`, name: spatial.name!, room: spatial, enemyDefinitions: enemies.map(([archetype, x, z], enemyIndex) => ({ id: `${roomId}_EN${String(enemyIndex + 1).padStart(2, '0')}`, archetype, position: { x, z } })) };
}

// Authored geometry and compositions: this is the actual B01 slice, separate from M3.
export const M4_ROOMS: readonly M4RoomDefinition[] = [
  definition('B01L01', 1, room('B01L01', 1, 'Warm-up Floor', 'Open training mats', 'warmup', [
    { id: 'left-equipment', x: -5.8, z: 1.7, width: 1.8, depth: 1.2, height: .75 },
    { id: 'right-bench', x: 5.9, z: -1.4, width: 1.8, depth: .7, height: .5 },
  ]), [['B01_E01', -2.1, 1], ['B01_E01', 2.1, 1], ['B01_E01', 0, 3.2]]),
  definition('B01L01', 2, room('B01L01', 2, 'Warm-up Floor', 'Guard coaching lanes', 'warmup', [
    { id: 'left-mat-storage', x: -4.8, z: -.5, width: 1.3, depth: 2.3, height: .7 },
    { id: 'right-mat-storage', x: 4.8, z: 1.1, width: 1.3, depth: 2.3, height: .7 },
  ]), [['B01_E01', -2.6, .9], ['B01_E01', 2.6, .9], ['B01_E01', -1.6, 3.3], ['B01_E02', 1.6, 3.3]]),
  definition('B01L02', 1, room('B01L02', 1, 'Heavy Bag Hall', 'Charge training aisle', 'bags', [
    { id: 'left-bag-island', x: -3.4, z: -.3, width: 1.2, depth: 1.8, height: .45 },
    { id: 'right-bag-island', x: 3.4, z: -.3, width: 1.2, depth: 1.8, height: .45 },
    { id: 'rear-rack', x: -5.8, z: 3.6, width: 1.7, depth: .8, height: .9 },
  ]), [['B01_E01', -1.8, 1.7], ['B01_E01', 1.8, 1.7], ['B01_E02', -3.1, 3.3], ['B01_E03', .6, 3.5]]),
  definition('B01L02', 2, room('B01L02', 2, 'Heavy Bag Hall', 'Mixed bag circuit', 'bags', [
    { id: 'left-bag-island', x: -3.3, z: 1, width: 1.4, depth: 1.8, height: .45 },
    { id: 'right-bag-island', x: 3.3, z: 1, width: 1.4, depth: 1.8, height: .45 },
    { id: 'front-bench', x: -5.8, z: -3.6, width: 1.6, depth: .7, height: .5 },
  ]), [['B01_E01', -5.2, 2.6], ['B01_E01', 5.2, 2.6], ['B01_E02', -1.5, 3.2], ['B01_E03', 1.5, 3.2], ['B01_E01', 0, .8]]),
  definition('B01L03', 1, room('B01L03', 1, 'Main Ring', 'Ring approach', 'ring', [
    { id: 'left-training-rail', x: -5.5, z: .7, width: .5, depth: 4, height: .8 },
    { id: 'right-training-rail', x: 5.5, z: .7, width: .5, depth: 4, height: .8 },
    { id: 'corner-stool', x: 6.7, z: 4.4, width: .7, depth: .7, height: .5 },
  ]), [['B01_E01', -3, 1.8], ['B01_E01', 3, 1.8], ['B01_E02', 0, .6], ['B01_E03', -1.4, 3.7], ['B01_E02', 1.4, 3.7]]),
  definition('B01L03', 2, room('B01L03', 2, 'Main Ring', 'Coach central ring', 'ring', [
    { id: 'northwest-corner', x: -6.5, z: 4.7, width: 1.2, depth: 1.2, height: .8 },
    { id: 'northeast-corner', x: 6.5, z: 4.7, width: 1.2, depth: 1.2, height: .8 },
    { id: 'southwest-corner', x: -6.5, z: -4.7, width: 1.2, depth: 1.2, height: .8 },
    { id: 'southeast-corner', x: 6.5, z: -4.7, width: 1.2, depth: 1.2, height: .8 },
  ], true), [['B01_M01', 0, 1]]),
];

const finitePoint = (point: Vec2): boolean => !!point && Number.isFinite(point.x) && Number.isFinite(point.z);
const radiusFor = (enemy: EnemyDefinition): number => enemy.archetype === 'B01_M01' ? .65 : .5;
export function walkableM4Point(point: Vec2, radius: number, spatial: Room): boolean {
  return finitePoint(point) && Math.abs(point.x) + radius < spatial.halfWidth && Math.abs(point.z) + radius < spatial.halfDepth && !spatial.obstacles.some(obstacle => {
    const x = Math.max(obstacle.x - obstacle.width / 2, Math.min(point.x, obstacle.x + obstacle.width / 2));
    const z = Math.max(obstacle.z - obstacle.depth / 2, Math.min(point.z, obstacle.z + obstacle.depth / 2));
    return Math.hypot(point.x - x, point.z - z) <= radius;
  });
}

/** A conservative .25 m grid verifies clearance for melee approach and enemy routing. */
export function reachableM4Point(start: Vec2, target: Vec2, radius: number, spatial: Room): boolean {
  if (!walkableM4Point(start, radius, spatial) || !walkableM4Point(target, radius, spatial)) return false;
  const step = .25;
  const queue: Vec2[] = [start];
  const visited = new Set(['0,0']);
  for (let head = 0; head < queue.length; head++) {
    const point = queue[head];
    if (Math.hypot(point.x - target.x, point.z - target.z) <= step * 1.5) return true;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = Math.round((point.x - start.x) / step) + dx;
      const z = Math.round((point.z - start.z) / step) + dz;
      const key = `${x},${z}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const next = { x: start.x + x * step, z: start.z + z * step };
      if (walkableM4Point(next, radius, spatial)) queue.push(next);
    }
  }
  return false;
}

export function validateM4Content(rooms: readonly M4RoomDefinition[] = M4_ROOMS): string[] {
  const errors: string[] = [];
  if (rooms.length !== 6) errors.push('M4 must contain exactly six rooms.');
  for (const field of ['id', 'roomId', 'encounterId'] as const) if (new Set(rooms.map(value => value[field])).size !== rooms.length) errors.push(`Duplicate ${field}.`);
  for (const [index, value] of rooms.entries()) {
    const levelId = `B01L0${Math.floor(index / 2) + 1}`;
    const roomId = `${levelId}_R0${index % 2 + 1}`;
    const spatial = value.room;
    if (value.id !== roomId || value.roomId !== roomId || value.levelId !== levelId || value.encounterId !== `${roomId}_E01` || spatial.id !== roomId || spatial.levelId !== levelId || !value.name || !spatial.levelName || !['warmup', 'bags', 'ring'].includes(spatial.theme ?? '')) errors.push(`Invalid room identity ${value.id}.`);
    if (!Number.isFinite(spatial.halfWidth) || !Number.isFinite(spatial.halfDepth) || spatial.halfWidth < 5 || spatial.halfDepth < 5 || new Set(spatial.obstacles.map(obstacle => obstacle.id)).size !== spatial.obstacles.length || spatial.obstacles.some(obstacle => !obstacle.id || ![obstacle.x, obstacle.z, obstacle.width, obstacle.depth, obstacle.height].every(Number.isFinite) || obstacle.width <= 0 || obstacle.depth <= 0 || obstacle.height < 0)) { errors.push(`Invalid geometry ${value.id}.`); continue; }
    const entry = spatial.playerSpawn;
    const exit = spatial.exit;
    if (!entry || !exit || !reachableM4Point(entry, exit, .65, spatial)) errors.push(`Unreachable entry or exit ${value.id}.`);
    const enemies = value.enemyDefinitions;
    if (index === 5 ? enemies.length !== 1 || enemies[0]?.archetype !== 'B01_M01' : enemies.length < 3 || enemies.length > 5 || enemies.some(enemy => enemy.archetype === 'B01_M01')) errors.push(`Invalid encounter composition ${value.id}.`);
    if (new Set(enemies.map(enemy => enemy.id)).size !== enemies.length) errors.push(`Duplicate enemy identity ${value.id}.`);
    for (const [enemyIndex, enemy] of enemies.entries()) {
      const radius = radiusFor(enemy);
      if (!enemy.id || !['B01_E01', 'B01_E02', 'B01_E03', 'B01_M01'].includes(enemy.archetype) || !walkableM4Point(enemy.position, radius, spatial)) errors.push(`Blocked spawn ${value.id}/${enemyIndex}.`);
      if (entry && Math.hypot(enemy.position.x - entry.x, enemy.position.z - entry.z) < radius + RULES.radius + 2) errors.push(`Unsafe player-entry spawn ${value.id}/${enemyIndex}.`);
      if (entry && !reachableM4Point(entry, enemy.position, radius, spatial)) errors.push(`Unreachable spawn ${value.id}/${enemyIndex}.`);
      if (enemies.slice(enemyIndex + 1).some(other => Math.hypot(enemy.position.x - other.position.x, enemy.position.z - other.position.z) <= radius + radiusFor(other))) errors.push(`Overlapping spawns ${value.id}/${enemyIndex}.`);
      if (index === 0 && enemy.archetype !== 'B01_E01' || index === 1 && !['B01_E01', 'B01_E02'].includes(enemy.archetype)) errors.push(`Role introduced too early ${value.id}.`);
    }
    if (index === 1 && !enemies.some(enemy => enemy.archetype === 'B01_E02') || index >= 2 && index < 5 && !enemies.some(enemy => enemy.archetype === 'B01_E03')) errors.push(`Missing introduced role ${value.id}.`);
  }
  return errors;
}
