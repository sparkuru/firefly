import type { PublicMemo, PublicMemosExport } from '../../../plugins/memos/public.mjs';
export interface InventoryFile { readonly path: string; readonly bytes: number; readonly digest: string; }
export interface AcceptedMemo { readonly id: string; readonly createdAt: string; readonly digest: string; }
export interface MemoReceipt {
  readonly schemaVersion: 1;
  readonly sequence: number;
  readonly deletionFloor: number;
  readonly retiredIds: readonly string[];
  readonly acceptedMemos: readonly AcceptedMemo[];
  readonly exportDigest: string;
  readonly expectedBase: string | null;
  readonly inventory: readonly InventoryFile[];
  readonly digest: string;
}
export interface MemoCandidate { readonly candidateRoot: string; readonly bundle: PublicMemosExport; readonly receipt: MemoReceipt; }
export interface BuildOptions {
  readonly sourceRoot: string; readonly assetsRoot?: string; readonly outputRoot: string;
  readonly displayName: string; readonly history?: MemoReceipt | null; readonly generatedAt?: string;
  readonly initialDeletionFloor?: number;
}
export function buildCandidate(options: BuildOptions): Promise<MemoCandidate>;
export function validateCandidate(candidateRoot: string): Promise<MemoCandidate>;
export function readCurrentHistory(deploymentRoot: string): Promise<MemoReceipt | null>;
export function promoteCandidate(options: { readonly deploymentRoot: string; readonly candidateRoot: string; readonly expectedBase: string | null; readonly initialDeletionFloor?: number }): Promise<MemoReceipt>;
export function buildRollbackCandidate(options: { readonly priorCandidateRoot: string; readonly history: MemoReceipt; readonly outputRoot: string; readonly generatedAt?: string }): Promise<MemoCandidate>;
export function decodeReceipt(value: unknown): MemoReceipt;
export function newMemo(options: { readonly sourceRoot: string; readonly name: string; readonly now?: string }): { id: string; createdAt: string; filename: string };
export function parseMemoSource(bytes: Uint8Array, displayName: string): PublicMemo & { readonly draft: boolean };
export function readMemoSources(sourceRoot: string, displayName: string, acceptedMemos?: readonly AcceptedMemo[]): PublicMemo[];
export function renderMarkdown(body: string, assetsRoot: string, assets?: Map<string, Uint8Array>, id?: string): Promise<string>;
