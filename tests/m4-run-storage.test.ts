import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { RunDirector } from '../src/run/director';
import { M4_BUILD_ID, M4_CONTENT_VERSION, M4_SCHEMA_VERSION } from '../src/run/m4-content';
import { M4RunDirector, type M4RunCheckpoint, type M4RunSimulation } from '../src/run/m4-director';
import { M4_DATABASE_NAME, M4Storage } from '../src/run/m4-storage';
import { RUN_DATABASE_NAME, RunStorage, type JournalTransaction, type RunJournal, type RunStorageBackend } from '../src/run/storage';

class MemoryBackend implements RunStorageBackend {
  raw: unknown;
  fail = false;
  private queue: Promise<unknown> = Promise.resolve();
  transact<T>(operation: (value: unknown) => JournalTransaction<T>): Promise<T> {
    const pending = this.queue.then(() => {
      if (this.fail) throw new Error('Denied or quota exhausted.');
      const change = operation(structuredClone(this.raw));
      if (change.write) this.raw = structuredClone(change.value);
      return change.result;
    });
    this.queue = pending.catch(() => undefined); return pending;
  }
  get journal(): RunJournal<M4RunCheckpoint> { return this.raw as RunJournal<M4RunCheckpoint>; }
}
const store = (backend: MemoryBackend, ownerId = 'tab_A', now: () => number = () => 100): M4Storage => new M4Storage({ backend, ownerId, now, leaseMs: 1500, heartbeat: false });
function simulation(cp: M4RunCheckpoint): M4RunSimulation { return { state: { weapon: cp.weapon, outcome: 'complete', time: 8 }, captureCarry: () => structuredClone(cp.carry) }; }
function pending(): M4RunDirector {
  const director = new M4RunDirector(); director.start('weapon_01', 42);
  director.completeEncounter(simulation(director.checkpoint)); director.advanceRoom(); director.completeEncounter(simulation(director.checkpoint)); return director;
}

test('M4 journal round-trips every safe room entry, cleared settlement and stable level reward atomically', async () => {
  const backend = new MemoryBackend(); const storage = store(backend);
  const director = new M4RunDirector(); director.start('weapon_01', 21);
  for (let index = 0; index < 6; index++) {
    const entry = director.checkpoint;
    assert.equal((await storage.save(entry)).status, 'ok');
    const carry = structuredClone(entry.carry); carry.health = 67; carry.ammo = 5; carry.dashCooldown = .4; carry.attackCooldown = .8;
    const sim = simulation(entry); sim.captureCarry = () => carry;
    director.updateFrom(sim);
    assert.deepEqual((await storage.load()).checkpoint, entry, 'combat reload restores persisted safe entry');
    director.completeEncounter(sim);
    if (index === 5) {
      assert.equal((await storage.save(director.checkpoint)).status, 'corrupt');
      assert.equal((await storage.settle(entry.runId)).status, 'settled');
      break;
    }
    const settledRoom = director.checkpoint;
    assert.equal((await storage.save(settledRoom)).status, 'ok');
    const reload = (await storage.load()).checkpoint!;
    assert.deepEqual(reload, settledRoom);
    const resumed = new M4RunDirector(); resumed.resume(reload); assert.deepEqual(resumed.completeEncounter(simulation(reload)), reload);
    if (resumed.phase === 'cleared') resumed.advanceRoom(); else resumed.chooseUpgrade(reload.offer[0]);
    const next = resumed.checkpoint;
    assert.equal((await storage.save(next)).status, 'ok');
    assert.deepEqual((await storage.load()).checkpoint, next);
    assert.equal(next.carry.health, 67); assert.equal(next.carry.ammo, 5); assert.equal(next.carry.attackCooldown, .8);
    director.resume(next);
  }
  assert.equal(backend.journal.current, null); assert.equal(backend.journal.previous, null); assert.equal(backend.journal.lease, null);
  assert.equal(backend.journal.settledRunIds.length, 1);
  const legacy = new RunDirector(); legacy.start('weapon_02', 21);
  assert.notEqual(M4_DATABASE_NAME, RUN_DATABASE_NAME);
});

test('M4 has its own codec and namespace, and cannot overwrite or reinterpret a legacy M3 record', async () => {
  const m3Backend = new MemoryBackend(); const m4Backend = new MemoryBackend();
  const m3 = new RunStorage({ backend: m3Backend, ownerId: 'same_tab', heartbeat: false });
  const m4 = store(m4Backend, 'same_tab');
  const legacy = new RunDirector(); const legacyCp = legacy.start('weapon_02', 30);
  const current = new M4RunDirector(); const m4Cp = current.start('weapon_02', 30);
  assert.equal((await m3.save(legacyCp)).status, 'ok'); assert.equal((await m4.save(m4Cp)).status, 'ok');
  assert.deepEqual((await m3.load()).checkpoint, legacyCp); assert.deepEqual((await m4.load()).checkpoint, m4Cp);
  assert.equal(m4Backend.journal.current!.schemaVersion, M4_SCHEMA_VERSION); assert.equal(m4Backend.journal.current!.contentVersion, M4_CONTENT_VERSION); assert.equal(m4Backend.journal.current!.buildId, M4_BUILD_ID);
  const untouched = structuredClone(m3Backend.raw);
  const misdirected = store(m3Backend, 'same_tab');
  assert.equal((await misdirected.load()).status, 'unsupported'); assert.equal((await misdirected.save(m4Cp)).status, 'unsupported'); assert.equal((await misdirected.settle(m4Cp.runId)).status, 'unsupported');
  await misdirected.close(); assert.deepEqual(m3Backend.raw, untouched);
  assert.equal((await m4.save(legacyCp as unknown as M4RunCheckpoint)).status, 'corrupt');
  assert.equal((await m3.save(m4Cp as unknown as ReturnType<RunDirector['start']>)).status, 'corrupt');
});

test('damaged M4 current recovers the previous safe revision but never a settled run', async () => {
  const backend = new MemoryBackend(); const storage = store(backend); const director = pending();
  const reward = director.checkpoint; await storage.save(reward);
  director.chooseUpgrade(reward.offer[0]); await storage.save(director.checkpoint);
  backend.journal.current!.checkpoint.roomId = 'BROKEN';
  const loaded = await storage.load(); assert.equal(loaded.status, 'ok'); assert.equal(loaded.recovered, true); assert.deepEqual(loaded.checkpoint, reward);
  assert.equal(backend.journal.current!.revision, backend.journal.revision);
  await storage.settle(reward.runId);
  assert.equal((await storage.save(reward)).status, 'settled');
  assert.equal((await storage.load()).status, 'empty');
  assert.equal(backend.journal.previous, null);
});

test('future M4 schema/content in either revision is preserved through load/takeover/save/settle/close', async () => {
  for (const field of ['schemaVersion', 'contentVersion'] as const) {
    for (const revision of ['current', 'previous'] as const) {
      const backend = new MemoryBackend(); const storage = store(backend); const director = pending();
      await storage.save(director.checkpoint); director.chooseUpgrade(director.checkpoint.offer[0]); await storage.save(director.checkpoint);
      if (field === 'schemaVersion') backend.journal[revision]!.schemaVersion++;
      else backend.journal[revision]!.contentVersion = 'm4-future';
      if (revision === 'previous') backend.journal.current!.checkpoint.roomIndex = 900;
      const untouched = structuredClone(backend.raw);
      for (const action of [() => storage.load(), () => storage.takeover(), () => storage.save(director.checkpoint), () => storage.settle(director.checkpoint.runId)]) {
        assert.equal((await action()).status, 'unsupported'); assert.deepEqual(backend.raw, untouched);
      }
      await storage.close(); assert.deepEqual(backend.raw, untouched);
    }
  }
});

test('M4 tab takeover and expired lease displace stale revisions without duplicate choices', async () => {
  let now = 100;
  const backend = new MemoryBackend(); const first = store(backend, 'tab_A', () => now); const second = store(backend, 'tab_B', () => now);
  const director = pending(); const reward = director.checkpoint;
  await first.save(reward);
  assert.equal((await second.load()).status, 'conflict');
  const takeover = await second.takeover(); assert.equal(takeover.status, 'ok'); assert.deepEqual(takeover.checkpoint!.offer, reward.offer);
  assert.equal((await first.save(reward)).status, 'conflict');
  director.chooseUpgrade(reward.offer[1]); assert.equal((await second.save(director.checkpoint)).status, 'ok');
  now += 1600;
  assert.equal((await first.save(reward)).status, 'conflict', 'expiry cannot revive a stale revision');
  const resumed = await first.load(); assert.equal(resumed.status, 'ok'); assert.equal(resumed.checkpoint!.carry.upgrades.owned.length, 1);
  assert.equal((await second.save(director.checkpoint)).status, 'conflict');
});

test('empty M4 reads do not reserve a lease; concurrent writes have one winner and snapshot input before async transaction', async () => {
  const backend = new MemoryBackend(); const first = store(backend, 'tab_A'); const second = store(backend, 'tab_B');
  await first.load(); await second.load(); assert.equal(backend.journal.lease, null);
  const director = new M4RunDirector(); const cp = director.start('weapon_02', 2);
  const inFlight = first.save(cp); cp.roomIndex = 500;
  assert.equal((await inFlight).status, 'ok'); assert.equal(backend.journal.current!.checkpoint.roomIndex, 0);
  await first.load();
  const writes = await Promise.all([first.save(director.checkpoint), first.save(director.checkpoint)]);
  assert.deepEqual(writes.map(write => write.status), ['ok', 'conflict']);
  const otherDirector = new M4RunDirector(); otherDirector.start('weapon_03', 5);
  assert.equal((await second.save(otherDirector.checkpoint)).status, 'conflict');
});

test('settled M4 checkpoints never resurrect and release ownership for a new run while settings/M3 stay independent', async () => {
  const backend = new MemoryBackend(); const first = store(backend); const cp = pending().checkpoint;
  await first.save(cp);
  assert.equal((await first.settle(cp.runId)).status, 'settled');
  const revision = backend.journal.revision;
  assert.equal((await first.settle(cp.runId)).status, 'settled'); assert.equal(backend.journal.revision, revision);
  assert.equal(backend.journal.lease, null); assert.equal((await first.save(cp)).status, 'settled');
  const nextOwner = store(backend, 'tab_B'); assert.equal((await nextOwner.load()).status, 'empty');
  const next = new M4RunDirector().start('weapon_03', 2); assert.equal((await nextOwner.save(next)).status, 'ok');
  assert.equal((await first.save(cp)).status, 'conflict');
  assert.deepEqual(Object.keys(backend.journal).sort(), ['current', 'formatVersion', 'lease', 'previous', 'revision', 'settledRunIds']);
});

test('M4 denied reads/writes remain temporary and failed reward commitment preserves the prior atomic offer', async () => {
  const backend = new MemoryBackend(); const storage = store(backend); const director = pending();
  await storage.save(director.checkpoint); const untouched = structuredClone(backend.raw);
  director.chooseUpgrade(director.checkpoint.offer[0]); backend.fail = true;
  assert.equal((await storage.save(director.checkpoint)).status, 'unavailable'); assert.deepEqual(backend.raw, untouched);
  assert.equal((await storage.load()).status, 'unavailable');
  backend.fail = false;
  const restored = await storage.load(); assert.equal(restored.status, 'ok'); assert.equal(restored.checkpoint!.phase, 'reward'); assert.equal(restored.checkpoint!.carry.upgrades.owned.length, 0);
  assert.deepEqual(restored.checkpoint!.offer, (untouched as RunJournal<M4RunCheckpoint>).current!.checkpoint.offer);
});
