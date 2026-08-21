export { MemoryCommentRepository } from './memory-repository.js';
export { SQLiteCommentRepository, hasNodeSqlite } from './sqlite-repository.js';
export {
  assertSupportedRuntimeDialect,
  normalizeStorageCatalogEntry,
  resolveCommentsDataRoot,
  resolveCoreDatabasePath,
  resolvePluginStoragePath,
  type DatabaseDialect,
  type StorageCatalogEntry
} from './storage.js';
export type { CommentRepository, RepositoryAuditEvent, StoredComment } from './types.js';
