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
  for (const [move, distance] of [
    [{ x: 1, z: 0 }, 6.6],
    [{ x: 1, z: 1 }, 6.6],
    [{ x: 0.5, z: 0 }, 3.3],
    [{ x: 0.3, z: 0.4 }, 3.3],
  ] as const) {
    const sim = nearTarget(); sim.state.dummy.health = 0;
    ticks(sim, 60, { move });
    assert.ok(Math.abs(Math.hypot(sim.state.player.position.x, sim.state.player.position.z) - distance) < 1e-9);
  }
});
test('attacking retains the 70 percent movement multiplier at the new walking speed', () => {
  const sim = nearTarget(); sim.state.dummy.health = 0;
  ticks(sim, 60, { move: { x: 1, z: 0 }, attackHeld: true });
  assert.ok(Math.abs(sim.state.player.position.x - 4.62) < 1e-9);
});
test('fractional attack phases preserve complete 50-tick cycles without duplicate hits', () => {
  const sim = nearTarget();
  const phases: string[][] = [[], [], [], []];
  const hitTicks: number[] = [];
  const damage: number[] = [];
  for (let tick = 0; tick < 50; tick++) {
    const events = sim.step({ ...idle, attackHeld: true });
    phases[sim.state.player.combo].push(sim.state.player.attackPhase);
    assert.ok(sim.state.player.attackProgress >= 0 && sim.state.player.attackProgress < 1);
    for (const event of events) { hitTicks.push(tick); damage.push(event.damage); }
  }
  const quick = ['startup', 'startup', 'startup', 'active', 'active', ...Array(5).fill('recovery')];
  const heavy = [...Array(5).fill('startup'), ...Array(3).fill('active'), ...Array(7).fill('recovery')];
  assert.deepEqual(phases, [quick, quick, heavy, heavy]);
  assert.deepEqual(hitTicks, [3, 13, 25, 40]);
  assert.deepEqual(damage, [20, 20, 30, 30]);
  assert.equal(sim.state.damageTotal, 100); assert.equal(sim.state.hits, 4);
  sim.step(idle);
  assert.equal(sim.state.player.attackPhase, 'ready');
});
test('repeated four-strike cycles sustain 120 DPS with no timing drift or duplicate events', () => {
  const sim = nearTarget(); sim.state.dummy.health = sim.state.dummy.maxHealth = 10000;
  const hitTicks: number[] = [];
  const ids: number[] = [];
  for (let tick = 0; tick < 600; tick++) {
    for (const event of sim.step({ ...idle, attackHeld: true })) { hitTicks.push(tick); ids.push(event.id); }
  }
  assert.deepEqual(hitTicks, Array.from({ length: 12 }, (_, cycle) => [3, 13, 25, 40].map(offset => cycle * 50 + offset)).flat());
  assert.equal(new Set(ids).size, 48);
  assert.equal(sim.state.hits, 48);
  assert.equal(sim.state.time, 10);
  assert.equal(sim.state.damageTotal, 1200);
  assert.equal(sim.state.damageTotal / sim.state.time, 120);
});
test('aim follows startup then locks its latest direction through the active window', () => {
  const sim = nearTarget(); sim.state.dummy.position = { x: 1.8, z: 0 };
  sim.step({ ...idle, attackPressed: true, aim: { x: 0, z: 1 } });
  sim.step({ ...idle, aim: { x: 1, z: 1 } });
  sim.step({ ...idle, aim: { x: 1, z: 0 } });
  assert.equal(sim.state.damageTotal, 0);
  assert.equal(sim.state.player.attackPhase, 'startup');
  assert.deepEqual(sim.state.player.facing, { x: 1, z: 0 });
  assert.equal(sim.step({ ...idle, aim: { x: 0, z: 1 } }).length, 1);
  assert.equal(sim.state.player.attackPhase, 'active');
  assert.deepEqual(sim.state.player.facing, { x: 1, z: 0 }, 'active entry locks the final startup aim');
  assert.equal(sim.step({ ...idle, aim: { x: -1, z: 0 } }).length, 0);
  assert.deepEqual(sim.state.player.facing, { x: 1, z: 0 });
  sim.step({ ...idle, aim: { x: -1, z: 0 } });
  assert.equal(sim.state.player.attackPhase, 'recovery');
  assert.deepEqual(sim.state.player.facing, { x: -1, z: 0 });
  assert.equal(sim.state.damageTotal, 20);
});
test('short attack press completes only its strike, and combo resets after a gap', () => {
  const sim = nearTarget(); sim.step({ ...idle, attackPressed: true }); ticks(sim, 59);
  assert.equal(sim.state.hits, 1);
  sim.step({ ...idle, attackPressed: true }); ticks(sim, 4);
  assert.equal(sim.state.player.combo, 0); assert.equal(sim.state.damageTotal, 40);
});
test('glove reach includes the new boundary plus target radius but excludes points beyond it', () => {
  for (const [distance, expectedHits] of [[2.2, 1], [2.4 - 1e-6, 1], [2.4, 1], [2.4 + 1e-6, 0]] as const) {
    const sim = nearTarget(); sim.state.dummy.position = { x: 0, z: distance };
    sim.step({ ...idle, attackPressed: true }); ticks(sim, 9);
    assert.equal(sim.state.hits, expectedHits, `target center at ${distance}m`);
  }
});
test('the 60-degree cone and solid cover still limit the longer glove reach', () => {
  for (const [angle, expectedHits] of [[Math.PI / 6 - 1e-6, 1], [Math.PI / 6 + 1e-6, 0], [Math.PI, 0]] as const) {
    const sim = nearTarget(); sim.state.dummy.position = { x: Math.sin(angle) * 2.2, z: Math.cos(angle) * 2.2 };
    sim.step({ ...idle, attackPressed: true }); ticks(sim, 9);
    assert.equal(sim.state.hits, expectedHits, `target direction ${angle} radians from facing`);
  }
  const covered: Room = { ...room, obstacles: [{ id: 'thin', x: 0, z: 1.8, width: 2, depth: 0.05, height: 1 }] };
  const sim = new Simulation(covered); sim.state.player.position = { x: 0, z: 0 };
  sim.state.dummy.position = { x: 0, z: 2.2 };
  ticks(sim, 50, { attackHeld: true }); assert.equal(sim.state.hits, 0);
  assert.ok(lineBlocked(sim.state.player.position, sim.state.dummy.position, covered));
});
test('dash retains 3m in 0.3s, 0.15s invulnerability, 1.2s cooldown and aim fallback', () => {
  const sim = nearTarget(); sim.state.dummy.health = 0;
  const invulnerable: boolean[] = [];
  for (let tick = 0; tick < 18; tick++) {
    sim.step({ ...idle, dashPressed: tick === 0, attackHeld: true });
    invulnerable.push(sim.state.player.invulnerable);
    assert.equal(sim.state.player.attackPhase, 'ready', 'attack cannot begin during dash');
  }
  assert.deepEqual(invulnerable, [...Array(9).fill(true), ...Array(9).fill(false)]);
  assert.ok(Math.abs(sim.state.player.position.z - 3) < 1e-8);
  assert.ok(Math.abs(sim.state.time - 0.3) < 1e-9);
  assert.equal(sim.state.hits, 0); assert.equal(sim.state.player.dashRemaining, 0);
  assert.ok(Math.abs(sim.state.player.dashCooldown - 0.9) < 1e-8);
  const before = sim.state.player.position.z;
  sim.step({ ...idle, dashPressed: true }); assert.equal(sim.state.player.position.z, before);
  ticks(sim, 53);
  assert.equal(sim.state.player.dashCooldown, 0);
  assert.equal(sim.state.player.position.z, before, 'the early dash press expires during cooldown');
  sim.step({ ...idle, dashPressed: true });
  assert.ok(sim.state.player.dashRemaining > 0);
  assert.ok(sim.state.player.position.z > before);
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
  active.step(idle); assert.ok(active.state.player.dashRemaining > 0);
  assert.equal(active.state.damageTotal, 20);
});
test('canceling recovery cannot replay its hit or start attacks during the dash', () => {
  const sim = nearTarget(); ticks(sim, 5, { attackHeld: true });
  assert.equal(sim.state.damageTotal, 20);
  sim.step({ ...idle, dashPressed: true, attackHeld: true });
  ticks(sim, 17, { attackHeld: true });
  assert.equal(sim.state.damageTotal, 20);
  assert.equal(sim.state.hits, 1);
  assert.equal(sim.state.player.attackPhase, 'ready');
  sim.step({ ...idle, attackHeld: true });
  assert.equal(sim.state.player.attackPhase, 'startup');
  assert.equal(sim.state.player.combo, 0);
});
test('a buffered attack waits for recovery and fires once, while an expired press does not replay', () => {
  const sim = nearTarget(); sim.step({ ...idle, attackPressed: true }); ticks(sim, 6);
  sim.step({ ...idle, attackPressed: true });
  assert.equal(sim.state.player.attackPhase, 'recovery');
  ticks(sim, 2);
  assert.equal(sim.state.hits, 1);
  sim.step(idle);
  assert.equal(sim.state.player.attackPhase, 'startup');
  assert.equal(sim.state.player.combo, 1);
  ticks(sim, 30);
  assert.equal(sim.state.hits, 2);
  assert.equal(sim.state.damageTotal, 40);
  const expired = nearTarget(); expired.step({ ...idle, dashPressed: true });
  expired.step({ ...idle, attackPressed: true }); ticks(expired, 30);
  assert.equal(expired.state.player.attackPhase, 'ready');
  assert.equal(expired.state.hits, 0);
});
test('safety clears queued attacks; restarting constructs a fresh full-health dummy', () => {
  const sim = nearTarget();
  sim.step({ ...idle, dashPressed: true }); ticks(sim, 14);
  sim.step({ ...idle, attackPressed: true }); sim.clearBufferedActions(); ticks(sim, 10);
  assert.equal(sim.state.player.attackPhase, 'ready');
  const fresh = new Simulation(); assert.equal(fresh.state.dummy.health, fresh.state.dummy.maxHealth);
  assert.equal(fresh.state.damageTotal, 0);
});
test('safety also clears a dash queued during an uncancelable active window', () => {
  const sim = nearTarget(); ticks(sim, 4, { attackHeld: true });
  sim.step({ ...idle, dashPressed: true });
  assert.equal(sim.state.player.dashRemaining, 0);
  sim.clearBufferedActions(); ticks(sim, 10);
  assert.deepEqual(sim.state.player.position, { x: 0, z: 0 });
  assert.equal(sim.state.player.dashCooldown, 0);
  assert.equal(sim.state.player.attackPhase, 'ready');
});
