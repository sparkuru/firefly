export interface PublicMemo {
  readonly id: string;
  readonly displayName: string;
  readonly body: string;
  readonly createdAt: string;
}
export interface PublicMemosExport {
  readonly schemaVersion: 1;
  readonly sourceRevision: string;
  readonly generatedAt: string;
  readonly tombstoneEpoch: number;
  readonly memos: readonly PublicMemo[];
  readonly digest: string;
}
export type PublicMemosPayload = Omit<PublicMemosExport, 'digest'>;
export class PublicMemosContractError extends TypeError { constructor(message: string); }
export const PUBLIC_EXPORT_SCHEMA_VERSION: 1;
export const MAX_DISPLAY_NAME_CODE_POINTS: 80;
export const MAX_BODY_BYTES: 8192;
export function normalizeDisplayName(value: unknown): string;
export function normalizeBody(value: unknown): string;
export function normalizePublicId(value: unknown): string;
export function validatePublicMemo(value: unknown): PublicMemo;
export function comparePublicMemos(left: PublicMemo, right: PublicMemo): number;
export function digestForExport(value: PublicMemosPayload): string;
export function decodePublicMemosExport(value: unknown, source?: string): PublicMemosExport;
export function createPublicExport(value: PublicMemosPayload): PublicMemosExport;
export function serializePublicExport(value: PublicMemosExport): string;
