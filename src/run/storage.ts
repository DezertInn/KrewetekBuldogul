import { RUN_BUILD_ID, RUN_CONTENT_VERSION, RUN_SCHEMA_VERSION } from './content';
import { validRunId, validateRunCheckpoint, type RunCheckpoint } from './director';

export const RUN_DATABASE_NAME = 'krewetek-buldogul-m3-runs';
export const RUN_TAB_OWNER_KEY = `${RUN_DATABASE_NAME}:tab-owner`;
export type StorageStatus = 'ok' | 'empty' | 'unavailable' | 'conflict' | 'unsupported' | 'corrupt' | 'settled';
export interface PersistedRunCheckpoint { runId: string; phase: string }
export interface StorageResult<T extends PersistedRunCheckpoint = RunCheckpoint> {
  status: StorageStatus;
  checkpoint?: T;
  revision?: number;
  recovered?: boolean;
  message: string;
}
export interface CheckpointEnvelope<T extends PersistedRunCheckpoint = RunCheckpoint> {
  schemaVersion: number;
  contentVersion: string;
  buildId: string;
  revision: number;
  checkpoint: T;
}
export interface RunJournal<T extends PersistedRunCheckpoint = RunCheckpoint> {
  formatVersion: number;
  revision: number;
  current: CheckpointEnvelope<T> | null;
  previous: CheckpointEnvelope<T> | null;
  settledRunIds: string[];
  lease: { owner: string; expiresAt: number } | null;
}
export interface JournalTransaction<T> { value: unknown; result: T; write: boolean }
// One read/write transaction owns the complete journal, including lease and tombstones.
// The callback is synchronous: IndexedDB transactions cannot survive arbitrary awaits.
export interface RunStorageBackend {
  transact<T>(operation: (value: unknown) => JournalTransaction<T>): Promise<T>;
  close?(): void;
}
export interface RunStorageOptions {
  databaseName?: string;
  ownerId?: string;
  backend?: RunStorageBackend;
  now?: () => number;
  leaseMs?: number;
  heartbeat?: boolean;
}
export interface RunStorageCodec<T extends PersistedRunCheckpoint> {
  databaseName: string;
  schemaVersion: number;
  contentVersion: string;
  buildId: string;
  validate(value: unknown): value is T;
}
export interface TabIdentityLease { ownerId: string; release(): void }
export interface TabIdentityAdapter {
  read(): string | null;
  write(ownerId: string): void;
  tryAcquire(ownerId: string): Promise<(() => void) | null>;
}
function randomOwnerId(): string { return globalThis.crypto?.randomUUID() ?? `tab_${Date.now()}_${Math.floor(Math.random() * 1e9)}`; }

/** Reloads reuse a tab ID; copied sessionStorage cannot reuse a live document's ID. */
export async function acquireTabIdentity(adapter: TabIdentityAdapter, createId: () => string = randomOwnerId): Promise<TabIdentityLease> {
  let candidate: string | null = null;
  try { candidate = adapter.read(); } catch { /* Denied session storage leaves a document-only identity. */ }
  if (!validRunId(candidate)) candidate = createId();
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!validRunId(candidate)) throw new Error('Invalid browser tab identity.');
    const release = await adapter.tryAcquire(candidate);
    if (release) {
      try { adapter.write(candidate); } catch { /* The exclusive lock still protects this document. */ }
      return { ownerId: candidate, release };
    }
    candidate = createId();
  }
  throw new Error('Could not acquire an exclusive browser tab identity.');
}

function browserTabIdentity(databaseName: string): TabIdentityAdapter | null {
  const locks = globalThis.navigator?.locks;
  if (!locks?.request) return null;
  return {
    read: () => globalThis.sessionStorage.getItem(`${databaseName}:tab-owner`),
    write: ownerId => globalThis.sessionStorage.setItem(`${databaseName}:tab-owner`, ownerId),
    tryAcquire: ownerId => new Promise((resolve, reject) => {
      // The request promise lives until release/navigation. The outer promise resolves
      // as soon as the callback establishes whether the candidate ID is available.
      void locks.request(`krewetek-buldogul-tab:${databaseName}:${ownerId}`, { mode: 'exclusive', ifAvailable: true }, lock => {
        if (!lock) { resolve(null); return; }
        let release!: () => void;
        const held = new Promise<void>(done => { release = done; });
        resolve(release);
        return held;
      }).catch(reject);
    }),
  };
}
const clone = <T>(value: T): T => structuredClone(value);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const natural = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const freshJournal = <T extends PersistedRunCheckpoint>(): RunJournal<T> => ({ formatVersion: 1, revision: 0, current: null, previous: null, settledRunIds: [], lease: null });

function journalStatus(value: unknown): StorageStatus | null {
  if (!object(value)) return 'corrupt';
  if (natural(value.formatVersion) && value.formatVersion !== 1) return 'unsupported';
  if (value.formatVersion !== 1 || !natural(value.revision) || !Array.isArray(value.settledRunIds) || !value.settledRunIds.every(validRunId) || new Set(value.settledRunIds).size !== value.settledRunIds.length) return 'corrupt';
  if (value.lease !== null && (!object(value.lease) || !validRunId(value.lease.owner) || typeof value.lease.expiresAt !== 'number' || !Number.isFinite(value.lease.expiresAt) || value.lease.expiresAt < 0)) return 'corrupt';
  if (!('current' in value) || !('previous' in value)) return 'corrupt';
  return null;
}
function envelopeStatus<T extends PersistedRunCheckpoint>(value: unknown, revision: number, codec: RunStorageCodec<T>): StorageStatus | null {
  if (!object(value)) return 'corrupt';
  // Incompatible schema/content is preserved verbatim, including a newer build's save.
  if ((natural(value.schemaVersion) && value.schemaVersion !== codec.schemaVersion) || (typeof value.contentVersion === 'string' && value.contentVersion !== codec.contentVersion)) return 'unsupported';
  if (value.schemaVersion !== codec.schemaVersion || value.contentVersion !== codec.contentVersion || typeof value.buildId !== 'string' || value.buildId.length < 1 || value.buildId.length > 100 || !natural(value.revision) || value.revision > revision || !codec.validate(value.checkpoint) || value.checkpoint.phase === 'results') return 'corrupt';
  return null;
}
function makeEnvelope<T extends PersistedRunCheckpoint>(checkpoint: T, revision: number, codec: RunStorageCodec<T>): CheckpointEnvelope<T> {
  return { schemaVersion: codec.schemaVersion, contentVersion: codec.contentVersion, buildId: codec.buildId, revision, checkpoint: clone(checkpoint) };
}
function result<T extends PersistedRunCheckpoint>(status: StorageStatus, message: string, journal?: RunJournal<T>, checkpoint?: T): StorageResult<T> {
  return { status, message, ...(journal ? { revision: journal.revision } : {}), ...(checkpoint ? { checkpoint: clone(checkpoint) } : {}) };
}

class IndexedDbBackend implements RunStorageBackend {
  private constructor(private readonly database: IDBDatabase) {}
  static open(name: string): Promise<IndexedDbBackend> {
    return new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('Browser storage is unavailable.')); return; }
      const request = globalThis.indexedDB.open(name, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('journal')) request.result.createObjectStore('journal'); };
      request.onerror = () => reject(request.error ?? new Error('Cannot open browser storage.'));
      request.onblocked = () => { reject(new Error('Another tab blocks the storage upgrade.')); };
      request.onsuccess = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('journal')) { database.close(); reject(new Error('Checkpoint store is missing.')); return; }
        database.onversionchange = () => database.close();
        resolve(new IndexedDbBackend(database));
      };
    });
  }
  transact<T>(operation: (value: unknown) => JournalTransaction<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      let transaction: IDBTransaction;
      try { transaction = this.database.transaction('journal', 'readwrite'); }
      catch (error) { reject(error); return; }
      const store = transaction.objectStore('journal');
      const request = store.get('state');
      let outcome: T;
      let completedOperation = false;
      transaction.oncomplete = () => completedOperation ? resolve(outcome) : reject(new Error('Storage transaction did not run.'));
      transaction.onerror = () => reject(transaction.error ?? new Error('Checkpoint transaction failed.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Checkpoint transaction was aborted.'));
      request.onsuccess = () => {
        try {
          const change = operation(request.result);
          outcome = change.result; completedOperation = true;
          if (change.write) store.put(change.value, 'state');
        } catch (error) { transaction.abort(); reject(error); }
      };
    });
  }
  close(): void { this.database.close(); }
}

export class CheckpointStorage<T extends PersistedRunCheckpoint> {
  revision = 0;
  private backend?: RunStorageBackend;
  private owner: string;
  private identityReady: Promise<void> | null = null;
  private releaseIdentity: (() => void) | null = null;
  private readonly now: () => number;
  private readonly leaseMs: number;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private last: StorageResult<T> = { status: 'empty', message: 'No saved run.' };
  private closed = false;

  constructor(private readonly options: RunStorageOptions, private readonly codec: RunStorageCodec<T>) {
    this.backend = options.backend;
    this.owner = options.ownerId ?? randomOwnerId();
    if (!validRunId(this.owner)) throw new Error('Invalid storage owner ID.');
    this.now = options.now ?? Date.now;
    this.leaseMs = options.leaseMs ?? 15000;
    if (!Number.isFinite(this.leaseMs) || this.leaseMs < 1000) throw new Error('Invalid checkpoint lease duration.');
  }
  get status(): StorageStatus { return this.last.status; }
  get message(): string { return this.last.message; }

  async open(): Promise<StorageResult<T>> {
    if (this.closed) return this.remember(this.result('unavailable', 'Checkpoint storage was closed. Play temporarily without saving.'));
    await this.ensureTabIdentity();
    if (this.closed) return this.remember(this.result('unavailable', 'Checkpoint storage was closed. Play temporarily without saving.'));
    if (!this.backend) {
      try { this.backend = await IndexedDbBackend.open(this.options.databaseName ?? this.codec.databaseName); }
      catch (error) {
        const name = object(error) ? error.name : '';
        return this.remember(this.result(name === 'VersionError' ? 'unsupported' : 'unavailable', name === 'VersionError' ? 'This checkpoint database belongs to a newer version and was preserved.' : 'Checkpoint storage is unavailable. Play temporarily without saving.'));
      }
    }
    return this.remember(this.result('ok', 'Checkpoint storage opened.'));
  }

  async load(): Promise<StorageResult<T>> { return this.loadWithLease(false); }
  async takeover(): Promise<StorageResult<T>> { return this.loadWithLease(true); }

  async save(checkpoint: T): Promise<StorageResult<T>> {
    if (!this.codec.validate(checkpoint) || checkpoint.phase === 'results') return this.remember(this.result('corrupt', 'Invalid checkpoint was not saved. Finished runs must be settled.'));
    checkpoint = clone(checkpoint);
    const expectedRevision = this.revision;
    const saved = await this.perform(raw => {
      const journal = this.readJournal(raw);
      if ('status' in journal) return { value: raw, result: journal, write: false };
      const blocked = this.checkCurrentCompatibility(journal);
      if (blocked) return { value: raw, result: blocked, write: false };
      const conflict = this.checkWriteLease(journal, expectedRevision);
      if (conflict) return { value: raw, result: conflict, write: false };
      if (journal.settledRunIds.includes(checkpoint.runId)) return { value: raw, result: this.result('settled', 'This run has already ended; its old checkpoint was rejected.', journal), write: false };
      if (journal.current && !this.envelopeStatus(journal.current, journal.revision) && journal.current.checkpoint.runId !== checkpoint.runId && !journal.settledRunIds.includes(journal.current.checkpoint.runId)) return { value: raw, result: this.result('conflict', 'Settle the saved run before replacing it with a new run.', journal), write: false };
      if (journal.current && !this.envelopeStatus(journal.current, journal.revision) && !journal.settledRunIds.includes(journal.current.checkpoint.runId)) journal.previous = clone(journal.current);
      journal.revision++; journal.current = this.makeEnvelope(checkpoint, journal.revision);
      this.claim(journal);
      return { value: journal, result: this.result('ok', 'Run saved at a safe checkpoint.', journal, checkpoint), write: true };
    });
    if (saved.status === 'ok') this.startHeartbeat();
    return saved;
  }

  async settle(runId: string): Promise<StorageResult<T>> {
    if (!validRunId(runId)) return this.remember(this.result('corrupt', 'Invalid run identifier.'));
    const expectedRevision = this.revision;
    let activeAfterSettlement = false;
    const settled = await this.perform(raw => {
      const journal = this.readJournal(raw);
      if ('status' in journal) return { value: raw, result: journal, write: false };
      const blocked = this.checkCurrentCompatibility(journal);
      if (blocked) return { value: raw, result: blocked, write: false };
      const conflict = this.checkWriteLease(journal, expectedRevision);
      if (conflict) return { value: raw, result: conflict, write: false };
      if (journal.settledRunIds.includes(runId)) { activeAfterSettlement = journal.current !== null; return { value: raw, result: this.result('settled', 'Run settlement was already recorded.', journal), write: false }; }
      journal.settledRunIds.push(runId);
      for (const key of ['current', 'previous'] as const) {
        const envelope = journal[key];
        if (object(envelope) && object(envelope.checkpoint) && envelope.checkpoint.runId === runId) journal[key] = null;
      }
      journal.revision++;
      activeAfterSettlement = journal.current !== null;
      if (activeAfterSettlement) this.claim(journal); else journal.lease = null;
      return { value: journal, result: this.result('settled', 'Run ended; its checkpoints can no longer be resumed.', journal), write: true };
    });
    if (settled.status === 'settled') {
      if (activeAfterSettlement) this.startHeartbeat(); else this.stopHeartbeat();
    }
    return settled;
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    // Do not depend on a pagehide IndexedDB transaction to finish. The replacement
    // document can reuse this tab's ID even if the old journal lease remains.
    this.releaseIdentity?.(); this.releaseIdentity = null;
    this.stopHeartbeat();
    try {
      await this.backend?.transact(raw => {
        if (journalStatus(raw) !== null) return { value: raw, result: undefined, write: false };
        const journal = clone(raw as RunJournal<T>);
        if (this.checkCurrentCompatibility(journal)) return { value: raw, result: undefined, write: false };
        if (journal.lease?.owner !== this.owner) return { value: raw, result: undefined, write: false };
        journal.lease = null;
        return { value: journal, result: undefined, write: true };
      });
    } catch { /* Browser close can end immediately; the finite lease still expires. */ }
    this.backend?.close?.();
  }

  private async loadWithLease(takeover: boolean): Promise<StorageResult<T>> {
    const loaded = await this.perform(raw => {
      const journal = this.readJournal(raw);
      if ('status' in journal) return { value: raw, result: journal, write: false };
      const blocked = this.checkCurrentCompatibility(journal);
      if (blocked) return { value: raw, result: blocked, write: false };
      // Reading an empty run store must not lock unrelated practice/settings tabs.
      // Also clear an obsolete lease left by an older empty-store implementation.
      if (journal.current === null) {
        const changed = raw === undefined || raw === null || journal.lease !== null;
        journal.lease = null;
        return { value: journal, result: this.result('empty', 'No active saved run.', journal), write: changed };
      }
      if (!takeover && journal.lease && journal.lease.owner !== this.owner && journal.lease.expiresAt > this.now()) return { value: raw, result: this.result('conflict', 'Another tab owns this run. Take over explicitly before saving.', journal), write: false };
      // A displaced tab must remain stale even after the replacement lease expires.
      if (raw !== undefined && raw !== null && journal.lease?.owner !== this.owner) journal.revision++;
      this.claim(journal);
      let envelope = journal.current;
      let recovered = false;
      if (this.envelopeStatus(envelope, journal.revision)) {
        const previous = journal.previous;
        if (!previous || this.envelopeStatus(previous, journal.revision) || journal.settledRunIds.includes(previous.checkpoint.runId)) return { value: journal, result: this.result('corrupt', 'Checkpoint is damaged and no valid previous revision exists. Play temporarily without saving.', journal), write: true };
        journal.revision++; envelope = this.makeEnvelope(previous.checkpoint, journal.revision); journal.current = envelope; recovered = true;
      }
      if (journal.settledRunIds.includes(envelope.checkpoint.runId)) { journal.current = null; journal.lease = null; return { value: journal, result: this.result('settled', 'The saved run already ended and cannot be restored.', journal), write: true }; }
      const restored = this.result('ok', recovered ? 'Recovered the previous safe checkpoint.' : 'A safe run checkpoint is available.', journal, envelope.checkpoint);
      restored.recovered = recovered;
      return { value: journal, result: restored, write: true };
    });
    if (['ok', 'corrupt'].includes(loaded.status)) this.startHeartbeat();
    else if (loaded.status === 'empty' || loaded.status === 'settled') this.stopHeartbeat();
    return loaded;
  }
  private async ensureTabIdentity(): Promise<void> {
    // Explicit identities and injected backends stay deterministic and browser-free.
    if (this.options.ownerId || this.options.backend) return;
    if (!this.identityReady) this.identityReady = (async () => {
      try {
        const adapter = browserTabIdentity(this.options.databaseName ?? this.codec.databaseName);
        if (!adapter) return; // Without Web Locks, keep random ID + explicit takeover.
        const lease = await acquireTabIdentity(adapter);
        if (this.closed) { lease.release(); return; }
        this.owner = lease.ownerId; this.releaseIdentity = lease.release;
      } catch { /* A unavailable identity API falls back to the existing lease protocol. */ }
    })();
    await this.identityReady;
  }
  private readJournal(raw: unknown): RunJournal<T> | StorageResult<T> {
    if (raw === undefined || raw === null) return freshJournal<T>();
    const issue = journalStatus(raw);
    if (issue) return this.result(issue, issue === 'unsupported' ? 'This journal format is unsupported and was preserved.' : 'The checkpoint journal is damaged and was preserved. Play temporarily without saving.');
    return clone(raw as RunJournal<T>);
  }
  private checkCurrentCompatibility(journal: RunJournal<T>): StorageResult<T> | null {
    // Even a damaged current record must not hide an incompatible previous revision.
    for (const envelope of [journal.current, journal.previous]) if (envelope && this.envelopeStatus(envelope, journal.revision) === 'unsupported') return this.result('unsupported', 'Checkpoint schema or content is unsupported and was preserved.', journal);
    return null;
  }
  private checkWriteLease(journal: RunJournal<T>, expectedRevision: number): StorageResult<T> | null {
    if (journal.revision !== expectedRevision || (journal.lease && journal.lease.owner !== this.owner && journal.lease.expiresAt > this.now())) return this.result('conflict', 'Checkpoint changed or another tab owns it. Reload or explicitly take over.', journal);
    return null;
  }
  private claim(journal: RunJournal<T>): void { journal.lease = { owner: this.owner, expiresAt: this.now() + this.leaseMs }; }
  private async perform(operation: (value: unknown) => JournalTransaction<StorageResult<T>>): Promise<StorageResult<T>> {
    if (this.closed) return this.remember(this.result('unavailable', 'Checkpoint storage is closed. Play temporarily without saving.'));
    if (!this.backend) { const opened = await this.open(); if (opened.status !== 'ok') return opened; }
    try { return this.remember(await this.backend!.transact(operation)); }
    catch { return this.remember(this.result('unavailable', 'Checkpoint write/read failed. Progress is temporary until saving works again.')); }
  }
  private remember(value: StorageResult<T>): StorageResult<T> {
    this.last = clone(value);
    // Conflicts must not silently advance the local expected revision.
    if (value.revision !== undefined && value.status !== 'conflict' && value.status !== 'unsupported') this.revision = value.revision;
    return clone(value);
  }
  private startHeartbeat(): void {
    if (this.options.heartbeat === false || this.heartbeatTimer || this.closed) return;
    this.heartbeatTimer = setInterval(() => { void this.renewLease(); }, Math.max(500, this.leaseMs / 3));
    this.heartbeatTimer.unref?.();
  }
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }
  private async renewLease(): Promise<void> {
    if (!this.backend || this.closed) return;
    try {
      const owned = await this.backend.transact(raw => {
        if (journalStatus(raw) !== null) return { value: raw, result: false, write: false };
        const journal = clone(raw as RunJournal<T>);
        if (this.checkCurrentCompatibility(journal)) return { value: raw, result: false, write: false };
        if (journal.lease?.owner !== this.owner) return { value: raw, result: false, write: false };
        this.claim(journal); return { value: journal, result: true, write: true };
      });
      if (!owned) this.last = this.result('conflict', 'Another tab took over this run. Saving is blocked until explicit takeover.');
    } catch { this.last = this.result('unavailable', 'Checkpoint storage is unavailable. Current progress is temporary.'); }
  }
  private envelopeStatus(value: unknown, revision: number): StorageStatus | null { return envelopeStatus(value, revision, this.codec); }
  private makeEnvelope(checkpoint: T, revision: number): CheckpointEnvelope<T> { return makeEnvelope(checkpoint, revision, this.codec); }
  private result(status: StorageStatus, message: string, journal?: RunJournal<T>, checkpoint?: T): StorageResult<T> { return result<T>(status, message, journal, checkpoint); }

}


// The historical M3 API and namespace remain unchanged.
export class RunStorage extends CheckpointStorage<RunCheckpoint> {
  constructor(options: RunStorageOptions = {}) {
    super(options, { databaseName: RUN_DATABASE_NAME, schemaVersion: RUN_SCHEMA_VERSION, contentVersion: RUN_CONTENT_VERSION, buildId: RUN_BUILD_ID, validate: validateRunCheckpoint });
  }
}
