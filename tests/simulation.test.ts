import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, clampMovement, moveWithCollision, lineBlocked } from '../src/game/simulation';
import { RULES } from '../src/game/config';
import type { Actions, Room } from '../src/game/types';
const room: Room = { halfWidth: 20, halfDepth: 20, obstacles: [] };
const idle: Actions = { move: { x: 0, z: 0 }, aim: null, attackHeld: false, attackPressed: false, dashPressed: false };
function nearTarget(): Simulation {
  const sim = new Simulation(room); sim.state.player.position = { x: 0, z: 0 }; return sim;
}
function ticks(sim: Simulation, count: number, changes: Partial<Actions> = {}) {
  return Array.from({ length: count }, () => sim.step({ ...idle, ...changes })).flat();
}
test('keyboard diagonal is normalized while analog magnitude retains its speed', () => {
  assert.ok(Math.abs(Math.hypot(...Object.values(clampMovement({ x: 1, z: 1 }))) - 1) < 1e-9);
  const sim = new Simulation(room); sim.state.dummy.health = 0;
  ticks(sim, 60, { move: { x: 0.5, z: 0 } });
  assert.ok(Math.abs(sim.state.player.position.x - 3) < 1e-9);
});
test('startup deals no damage, active window hits once, complete glove cycle totals 100', () => {
  const sim = nearTarget();
  assert.equal(ticks(sim, 3, { attackHeld: true }).length, 0);
  assert.equal(sim.state.damageTotal, 0);
  assert.equal(ticks(sim, 3, { attackHeld: true }).length, 1);
  assert.equal(sim.state.damageTotal, 20);
  ticks(sim, 54, { attackHeld: true });
  assert.equal(sim.state.damageTotal, 100); assert.equal(sim.state.hits, 4);
  ticks(sim, 60, { attackHeld: true });
  assert.equal(sim.state.damageTotal, 200); assert.equal(sim.state.hits, 8);
});
test('short attack press completes only its strike, and combo resets after a gap', () => {
  const sim = nearTarget(); sim.step({ ...idle, attackPressed: true }); ticks(sim, 59);
  assert.equal(sim.state.hits, 1);
  sim.step({ ...idle, attackPressed: true }); ticks(sim, 4);
  assert.equal(sim.state.player.combo, 0); assert.equal(sim.state.damageTotal, 40);
});
test('melee respects facing, range, and solid cover', () => {
  for (const position of [{ x: 0, z: 4 }, { x: 1.1, z: 0 }]) {
    const sim = nearTarget(); sim.state.dummy.position = position;
    ticks(sim, 12, { attackHeld: true }); assert.equal(sim.state.hits, 0);
  }
  const covered: Room = { ...room, obstacles: [{ id: 'thin', x: 0, z: 0.5, width: 2, depth: 0.05, height: 1 }] };
  const sim = new Simulation(covered); sim.state.player.position = { x: 0, z: 0 };
  ticks(sim, 12, { attackHeld: true }); assert.equal(sim.state.hits, 0);
  assert.ok(lineBlocked({ x: 0, z: 0 }, { x: 0, z: 1 }, covered));
});
test('dash travels 3m with 1.2s cooldown, retained aim fallback, no attacks during dash', () => {
  const sim = nearTarget(); sim.state.dummy.health = 0;
  sim.step({ ...idle, dashPressed: true, attackHeld: true }); ticks(sim, 17, { attackHeld: true });
  assert.ok(Math.abs(sim.state.player.position.z - 3) < 1e-8);
  assert.equal(sim.state.hits, 0); assert.equal(sim.state.player.dashRemaining, 0);
  assert.ok(Math.abs(sim.state.player.dashCooldown - 0.9) < 1e-8);
  const before = sim.state.player.position.z;
  sim.step({ ...idle, dashPressed: true }); assert.equal(sim.state.player.position.z, before);
});

test('a dash ending inside the live dummy allows walking out but not further in', () => {
  const sim = new Simulation();
  sim.step({ ...idle, dashPressed: true }); ticks(sim, 17);
  const dashEnd = { ...sim.state.player.position };
  assert.ok(Math.hypot(dashEnd.x - sim.state.dummy.position.x, dashEnd.z - sim.state.dummy.position.z) < RULES.radius + sim.state.dummy.radius);
  sim.step({ ...idle, move: { x: 0, z: 1 } });
  assert.deepEqual(sim.state.player.position, dashEnd, 'walking cannot deepen the overlap');
  ticks(sim, 10, { move: { x: 0, z: -1 } });
  assert.ok(sim.state.player.position.z < dashEnd.z - 0.9, 'walk away immediately without waiting for another dash');
  assert.equal(sim.state.dummy.health, sim.state.dummy.maxHealth);
});
test('dash cannot tunnel through thin cover or room walls and slides along cover', () => {
  const obstacleRoom: Room = { halfWidth: 4, halfDepth: 4, obstacles: [{ id: 'wall', x: 0, z: 1, width: 4, depth: 0.02, height: 1 }] };
  const pos = moveWithCollision({ x: 0, z: 0 }, { x: 1, z: 3 }, RULES.radius, obstacleRoom);
  assert.ok(pos.z <= 0.99 - RULES.radius + 1e-9); assert.ok(pos.x > 0.9);
  const edge = moveWithCollision({ x: 3, z: -2 }, { x: 5, z: 0 }, RULES.radius, obstacleRoom);
  assert.ok(edge.x <= 4 - RULES.radius + 1e-9);
});
test('dash cancels startup without a hit; active window is not canceled', () => {
  const canceled = nearTarget(); canceled.step({ ...idle, attackPressed: true });
  canceled.step({ ...idle, dashPressed: true }); ticks(canceled, 10);
  assert.equal(canceled.state.damageTotal, 0);
  const active = nearTarget(); ticks(active, 4, { attackHeld: true });
  active.step({ ...idle, dashPressed: true });
  assert.equal(active.state.player.dashRemaining, 0);
  ticks(active, 2); assert.ok(active.state.player.dashRemaining > 0);
});
test('safety clears queued attacks; restarting constructs a fresh full-health dummy', () => {
  const sim = nearTarget();
  sim.step({ ...idle, dashPressed: true }); ticks(sim, 14);
  sim.step({ ...idle, attackPressed: true }); sim.clearBufferedActions(); ticks(sim, 10);
  assert.equal(sim.state.player.attackPhase, 'ready');
  const fresh = new Simulation(); assert.equal(fresh.state.dummy.health, fresh.state.dummy.maxHealth);
  assert.equal(fresh.state.damageTotal, 0);
});
