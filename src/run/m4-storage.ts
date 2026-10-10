import { M4_BUILD_ID, M4_CONTENT_VERSION, M4_SCHEMA_VERSION } from './m4-content';
import { validateM4RunCheckpoint, type M4RunCheckpoint } from './m4-director';
import { CheckpointStorage, type RunStorageOptions } from './storage';

export const M4_DATABASE_NAME = 'krewetek-buldogul-m4-runs';
export const M4_TAB_OWNER_KEY = `${M4_DATABASE_NAME}:tab-owner`;

/** M4 uses the same atomic journal/lease protocol, with its own codec and database. */
export class M4Storage extends CheckpointStorage<M4RunCheckpoint> {
  constructor(options: RunStorageOptions = {}) {
    super(options, { databaseName: M4_DATABASE_NAME, schemaVersion: M4_SCHEMA_VERSION, contentVersion: M4_CONTENT_VERSION, buildId: M4_BUILD_ID, validate: validateM4RunCheckpoint });
  }
}
