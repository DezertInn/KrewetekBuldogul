/** Keyboard-only test driver waypoints. Reads collider data; never modifies gameplay. */
export function exitRoute(room: any, position: { x: number; z: number }): { x: number; z: number }[] {
  const points: { x: number; z: number }[] = [], indices = new Map<string, number>();
  const nx = Math.floor((room.halfWidth * 2 - 1.5) / 0.5), nz = Math.floor((room.halfDepth * 2 - 1.5) / 0.5);
  for (let z = 0; z <= nz; z++) for (let x = 0; x <= nx; x++) {
    const point = { x: -room.halfWidth + 0.75 + x * 0.5, z: -room.halfDepth + 0.75 + z * 0.5 };
    if (room.obstacles.some((o: any) => Math.abs(point.x - o.x) < o.width / 2 + 0.44 && Math.abs(point.z - o.z) < o.depth / 2 + 0.44)) continue;
    indices.set(`${x},${z}`, points.length); points.push(point);
  }
  const nearest = (target: any) => points.reduce((best, p, i) => Math.hypot(p.x - target.x, p.z - target.z) < Math.hypot(points[best].x - target.x, points[best].z - target.z) ? i : best, 0);
  const start = nearest(position), end = nearest(room.exit), previous = new Map<number, number>([[start, -1]]), queue = [start];
  while (queue.length) {
    const id = queue.shift()!; if (id === end) break;
    const p = points[id], x = Math.round((p.x + room.halfWidth - 0.75) * 2), z = Math.round((p.z + room.halfDepth - 0.75) * 2);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const next = indices.get(`${x + dx},${z + dz}`); if (next !== undefined && !previous.has(next)) { previous.set(next, id); queue.push(next); } }
  }
  if (!previous.has(end)) throw new Error('No safe test-driver path to exit.');
  const path = []; for (let id = end; id !== -1; id = previous.get(id)!) path.unshift(points[id]);
  return [...path, room.exit];
}
