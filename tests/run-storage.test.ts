import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { RunDirector } from '../src/run/director';
import { acquireTabIdentity, RunStorage, type JournalTransaction, type RunJournal, type RunStorageBackend, type TabIdentityAdapter } from '../src/run/storage';

class MemoryBackend implements RunStorageBackend {
  value: unknown = undefined;
  failed = false;
  transactions = 0;
  private queue: Promise<unknown> = Promise.resolve();
  transact<T>(operation: (value: unknown) => JournalTransaction<T>): Promise<T> {
    const run = this.queue.then(() => {
      this.transactions++;
      if (this.failed) throw new Error('Storage denied/quota exceeded.');
      const change = operation(structuredClone(this.value));
      if (change.write) this.value = structuredClone(change.value);
      return structuredClone(change.result);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
  get journal(): RunJournal { return this.value as RunJournal; }
}
function store(backend: MemoryBackend, ownerId = 'tab_1', now: () => number = () => 1000): RunStorage {
  return new RunStorage({ backend, ownerId, now, heartbeat: false });
}
function started() { const run = new RunDirector(); run.start('weapon_01', 37); return run; }

test('safe checkpoint roundtrip includes schema/content/build/revision and keeps paused offer stable', async () => {
  const backend = new MemoryBackend(); const storage = store(backend); const run = started();
  assert.equal((await storage.open()).status, 'ok'); assert.equal((await storage.load()).status, 'empty');
  assert.equal((await storage.save(run.checkpoint)).status, 'ok');
  const carry = run.checkpoint.carry;
  run.completeEncounter({ state: { time: 11, weapon: 'weapon_01', outcome: 'complete' }, captureCarry: () => carry });
  const pending = run.checkpoint;
  assert.equal((await storage.save(pending)).status, 'ok');
  assert.equal(backend.journal.current!.schemaVersion, 1); assert.ok(backend.journal.current!.contentVersion); assert.ok(backend.journal.current!.buildId);
  assert.equal(backend.journal.revision, 2); assert.equal(backend.journal.previous!.revision, 1);
  await storage.close();
  const reopened = store(backend, 'tab_2', () => 9999999);
  const result = await reopened.load(); assert.equal(result.status, 'ok'); assert.deepEqual(result.checkpoint, pending);
  const resumed = new RunDirector(); resumed.resume(result.checkpoint!);
  assert.deepEqual(resumed.checkpoint.offer, pending.offer); assert.deepEqual(resumed.checkpoint.carry, pending.carry, 'absence cannot recharge or expire effects');
  resumed.chooseUpgrade(pending.offer[0]);
  await reopened.save(resumed.checkpoint);
  const atomic = backend.journal.current!.checkpoint;
  assert.equal(atomic.phase, 'encounter'); assert.equal(atomic.stageIndex, 1); assert.equal(atomic.rewards[0].selected, pending.offer[0]);
  assert.deepEqual(atomic.carry.upgrades.owned, [pending.offer[0]]); assert.deepEqual(atomic.offer, []);
});

test('known corruption recovers only a valid previous checkpoint, never rerolls a retained offer', async () => {
  const backend = new MemoryBackend(); const storage = store(backend); const run = started(); await storage.load();
  const carry = run.checkpoint.carry;
  run.completeEncounter({ state: { time: 3, weapon: 'weapon_01', outcome: 'complete' }, captureCarry: () => carry });
  const pending = run.checkpoint; await storage.save(pending);
  run.chooseUpgrade(pending.offer[0]); await storage.save(run.checkpoint);
  backend.journal.current!.checkpoint.carry.health = -10;
  const recovered = await storage.load(); assert.equal(recovered.status, 'ok'); assert.equal(recovered.recovered, true);
  assert.deepEqual(recovered.checkpoint!.offer, pending.offer); assert.equal(recovered.checkpoint!.phase, 'reward');
  assert.equal(recovered.revision, 3);
});

test('settlement tombstones defeat/complete/abandon checkpoints and defeat cannot revive a last-good revision', async () => {
  const backend = new MemoryBackend(); const storage = store(backend); const run = started(); await storage.load();
  await storage.save(run.checkpoint); const old = structuredClone(backend.journal.current!);
  const carry = run.checkpoint.carry;
  run.completeEncounter({ state: { time: 2, weapon: 'weapon_01', outcome: 'complete' }, captureCarry: () => carry });
  await storage.save(run.checkpoint); const runId = run.checkpoint.runId;
  assert.equal((await storage.settle(runId)).status, 'settled');
  assert.equal(backend.journal.current, null); assert.equal(backend.journal.previous, null);
  assert.equal((await storage.save(old.checkpoint)).status, 'settled');
  const before = backend.journal.revision;
  assert.equal((await storage.settle(runId)).status, 'settled'); assert.equal(backend.journal.revision, before, 'settlement is idempotent');
  // Simulate a damaged current record alongside an older but correctly shaped copy.
  backend.journal.current = old; backend.journal.current.checkpoint.carry.health = -1;
  backend.journal.previous = structuredClone(old); backend.journal.previous.checkpoint.carry.health = 100;
  assert.equal((await storage.load()).status, 'corrupt', 'tombstoned previous state is never recovered');
  backend.journal.current = structuredClone(old); backend.journal.current.checkpoint.carry.health = 100;
  const ended = await storage.load(); assert.equal(ended.status, 'settled'); assert.equal(ended.checkpoint, undefined);
});

test('unsupported schema/content/journal versions are preserved and cannot be overwritten by save or settle', async () => {
  for (const target of ['schema', 'content', 'journal'] as const) {
    const backend = new MemoryBackend(); const storage = store(backend); const run = started(); await storage.load(); await storage.save(run.checkpoint);
    if (target === 'schema') backend.journal.current!.schemaVersion = 999;
    if (target === 'content') backend.journal.current!.contentVersion = 'a-future-build';
    if (target === 'journal') backend.journal.formatVersion = 999;
    const snapshot = structuredClone(backend.value);
    assert.equal((await storage.load()).status, 'unsupported'); assert.equal((await storage.save(run.checkpoint)).status, 'unsupported');
    assert.equal((await storage.settle(run.checkpoint.runId)).status, 'unsupported'); assert.equal((await storage.takeover()).status, 'unsupported');
    assert.deepEqual(backend.value, snapshot);
  }
});

for (const unsupported of ['future schema', 'incompatible content'] as const) test(`corrupt current cannot overwrite a previous ${unsupported} through operations, live heartbeat or close`, async () => {
  let now = 1000;
  const backend = new MemoryBackend();
  const storage = new RunStorage({ backend, ownerId: 'protected_previous_tab', now: () => now, heartbeat: true, leaseMs: 1500 });
  try {
    const run = started(); await storage.load();
    await storage.save(run.checkpoint); await storage.save(run.checkpoint);
    backend.journal.current!.checkpoint.carry.health = -1;
    if (unsupported === 'future schema') backend.journal.previous!.schemaVersion = 99;
    else backend.journal.previous!.contentVersion = 'a-different-content-version';
    const preserved = structuredClone(backend.value);
    for (const operation of [
      () => storage.load(), () => storage.takeover(),
      () => storage.save(run.checkpoint), () => storage.settle(run.checkpoint.runId),
    ]) {
      assert.equal((await operation()).status, 'unsupported');
      assert.deepEqual(backend.value, preserved, 'operation must preserve the entire incompatible journal');
    }
    // Make a renewal observable if it were incorrectly allowed; then let the real
    // scheduled heartbeat execute against the protected previous revision.
    now = 4000;
    const beforeHeartbeat = backend.transactions;
    await delay(650);
    assert.ok(backend.transactions > beforeHeartbeat, 'the actual 500ms heartbeat transaction ran');
    assert.deepEqual(backend.value, preserved, 'heartbeat cannot rewrite a lease in the incompatible journal');
    const beforeClose = backend.transactions;
    await storage.close();
    assert.equal(backend.transactions, beforeClose + 1, 'close attempted its real cleanup transaction');
    assert.deepEqual(backend.value, preserved, 'close cannot rewrite or erase the incompatible previous revision');
  } finally { await storage.close(); }
});

test('second tab cannot write through another lease; explicit takeover and revision conflicts protect transactions', async () => {
  const backend = new MemoryBackend(); const first = store(backend, 'tab_first'); const second = store(backend, 'tab_second');
  const run = started(); await first.load(); await first.save(run.checkpoint);
  assert.equal((await second.load()).status, 'conflict'); assert.equal((await second.save(run.checkpoint)).status, 'conflict');
  const takeover = await second.takeover(); assert.equal(takeover.status, 'ok'); assert.deepEqual(takeover.checkpoint, run.checkpoint);
  assert.equal((await first.save(run.checkpoint)).status, 'conflict'); assert.equal((await first.settle(run.checkpoint.runId)).status, 'conflict');
  await second.save(run.checkpoint); assert.equal((await first.takeover()).status, 'ok');
  assert.equal((await second.save(run.checkpoint)).status, 'conflict');
  const attempts = await Promise.all([first.save(run.checkpoint), first.save(run.checkpoint)]);
  assert.equal(attempts.filter(attempt => attempt.status === 'ok').length, 1, 'two concurrent writes with the same expected revision cannot both commit');
});

test('empty practice tabs do not own a lease or heartbeat; concurrent new runs have one atomic winner', async () => {
  let now = 1000;
  const backend = new MemoryBackend();
  const first = new RunStorage({ backend, ownerId: 'practice_tab_1', now: () => now, heartbeat: true, leaseMs: 1500 });
  const second = new RunStorage({ backend, ownerId: 'practice_tab_2', now: () => now, heartbeat: true, leaseMs: 1500 });
  try {
    assert.equal((await first.load()).status, 'empty'); assert.equal((await second.load()).status, 'empty');
    assert.equal(backend.journal.lease, null); assert.equal(backend.journal.revision, 0);
    const passiveTransactions = backend.transactions;
    await delay(650);
    assert.equal(backend.transactions, passiveTransactions, 'empty reads cannot start a heartbeat');
    const firstRun = started(), secondRun = started();
    const writes = await Promise.all([first.save(firstRun.checkpoint), second.save(secondRun.checkpoint)]);
    assert.equal(writes.filter(write => write.status === 'ok').length, 1);
    assert.equal(writes.filter(write => write.status === 'conflict').length, 1);
    const winner = writes[0].status === 'ok' ? firstRun : secondRun;
    assert.equal(backend.journal.current!.checkpoint.runId, winner.checkpoint.runId);
    assert.equal(backend.journal.revision, 1, 'losing new run never overwrites the first checkpoint');
    const activeTransactions = backend.transactions; now = 2000;
    await delay(650);
    assert.ok(backend.transactions > activeTransactions, 'successful first save starts the real heartbeat');
    assert.equal(backend.journal.lease!.expiresAt, 3500);
  } finally { await first.close(); await second.close(); }
});

test('settling the active run releases its lease and stops heartbeat so another practice tab can start', async () => {
  const backend = new MemoryBackend();
  const first = new RunStorage({ backend, ownerId: 'ended_run_tab', heartbeat: true, leaseMs: 1500 });
  const second = store(backend, 'next_run_tab');
  try {
    const run = started(); await first.load(); await first.save(run.checkpoint);
    assert.ok(backend.journal.lease);
    assert.equal((await first.settle(run.checkpoint.runId)).status, 'settled');
    assert.equal(backend.journal.lease, null); assert.equal(backend.journal.current, null);
    const stoppedTransactions = backend.transactions;
    await delay(650); assert.equal(backend.transactions, stoppedTransactions, 'ended run cannot continue a heartbeat');
    assert.equal((await second.load()).status, 'empty');
    const next = started(); assert.equal((await second.save(next.checkpoint)).status, 'ok');
    assert.equal(backend.journal.current!.checkpoint.runId, next.checkpoint.runId);
    assert.equal((await first.save(run.checkpoint)).status, 'conflict', 'stale ended run cannot replace the new owner');
  } finally { await first.close(); await second.close(); }
});

test('expired tab lease can be reacquired, while replacing an active run requires settlement', async () => {
  let now = 1; const backend = new MemoryBackend(); const first = store(backend, 'tab_first', () => now); const second = store(backend, 'tab_second', () => now);
  const run = started(); await first.load(); await first.save(run.checkpoint);
  now = 20000; assert.equal((await second.load()).status, 'ok');
  const fresh = started(); assert.equal((await second.save(fresh.checkpoint)).status, 'conflict');
  await second.settle(run.checkpoint.runId); assert.equal((await second.save(fresh.checkpoint)).status, 'ok');
});

test('denied/quota-failed storage reports temporary progress and cannot half-commit a choice', async () => {
  const backend = new MemoryBackend(); const storage = store(backend); const run = started(); await storage.load(); await storage.save(run.checkpoint);
  const before = structuredClone(backend.value); backend.failed = true;
  assert.equal((await storage.load()).status, 'unavailable'); assert.equal((await storage.save(run.checkpoint)).status, 'unavailable');
  assert.equal((await storage.settle(run.checkpoint.runId)).status, 'unavailable'); assert.deepEqual(backend.value, before);
  backend.failed = false; assert.equal((await storage.load()).status, 'ok');
  const noStorage = new RunStorage({ heartbeat: false });
  assert.equal((await noStorage.open()).status, 'unavailable');
});

test('invalid checkpoint data is never accepted and results require settlement instead of serialization', async () => {
  const backend = new MemoryBackend(); const storage = store(backend); const run = started(); await storage.load();
  const invalid = run.checkpoint; invalid.carry.ammo = 21;
  assert.equal((await storage.save(invalid)).status, 'corrupt'); assert.equal(backend.journal.current, null);
  run.abandon(); assert.equal((await storage.save(run.checkpoint)).status, 'corrupt');
  backend.value = { formatVersion: 1, revision: -4 };
  const preserved = structuredClone(backend.value); assert.equal((await storage.load()).status, 'corrupt');
  assert.deepEqual(backend.value, preserved);
});

function virtualTab(initial: string | null, held: Set<string>): { adapter: TabIdentityAdapter; session: () => string | null } {
  let session = initial;
  return {
    session: () => session,
    adapter: {
      read: () => session,
      write: owner => { session = owner; },
      tryAcquire: async owner => {
        if (held.has(owner)) return null;
        held.add(owner);
        return () => { held.delete(owner); };
      },
    },
  };
}

test('document reload reuses exclusive tab identity even when pagehide leaves an unexpired journal lease', async () => {
  const held = new Set<string>(); const tab = virtualTab(null, held);
  const before = await acquireTabIdentity(tab.adapter, () => 'stable_tab');
  const backend = new MemoryBackend(); const storage = store(backend, before.ownerId); const run = started();
  await storage.load(); await storage.save(run.checkpoint);
  assert.equal(backend.journal.lease!.owner, 'stable_tab');
  // Navigation releases a Web Lock even if the unload checkpoint cleanup never runs.
  before.release();
  const after = await acquireTabIdentity(tab.adapter, () => 'unexpected_new_id');
  assert.equal(after.ownerId, before.ownerId);
  const reloaded = store(backend, after.ownerId);
  const loaded = await reloaded.load();
  assert.equal(loaded.status, 'ok'); assert.deepEqual(loaded.checkpoint, run.checkpoint);
  assert.equal(held.size, 1); after.release();
});

test('duplicated sessionStorage cannot reuse a live document owner and keeps tab conflict/takeover protection', async () => {
  const held = new Set<string>(); const originalTab = virtualTab('shared_candidate', held);
  const original = await acquireTabIdentity(originalTab.adapter, () => 'unused');
  const duplicateTab = virtualTab(originalTab.session(), held);
  const duplicate = await acquireTabIdentity(duplicateTab.adapter, () => 'new_duplicate_owner');
  assert.equal(original.ownerId, 'shared_candidate'); assert.equal(duplicate.ownerId, 'new_duplicate_owner');
  assert.equal(originalTab.session(), 'shared_candidate'); assert.equal(duplicateTab.session(), 'new_duplicate_owner');
  const backend = new MemoryBackend(); const first = store(backend, original.ownerId); const second = store(backend, duplicate.ownerId);
  const run = started(); await first.load(); await first.save(run.checkpoint);
  assert.equal((await second.load()).status, 'conflict');
  assert.equal((await second.takeover()).status, 'ok');
  assert.equal((await first.save(run.checkpoint)).status, 'conflict');
  original.release(); duplicate.release(); assert.equal(held.size, 0);
});

test('invalid or denied session identity produces a valid document owner without accepting unsafe IDs', async () => {
  const held = new Set<string>(); const invalid = virtualTab('../invalid', held);
  const lease = await acquireTabIdentity(invalid.adapter, () => 'safe_generated_owner');
  assert.equal(lease.ownerId, 'safe_generated_owner'); lease.release();
  const denied: TabIdentityAdapter = {
    read: () => { throw new Error('Session storage denied.'); },
    write: () => { throw new Error('Session storage denied.'); },
    tryAcquire: async () => () => undefined,
  };
  const temporary = await acquireTabIdentity(denied, () => 'temporary_owner');
  assert.equal(temporary.ownerId, 'temporary_owner'); temporary.release();
});
