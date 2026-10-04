import type { MemosActivationConfig, MemosPublicConfig } from '../../../../../plugins/memos/config.mjs';
import type { PublicMemosExport } from '../../../../../plugins/memos/public.mjs';

export interface MemoSiteConfig {
  readonly plugins: { readonly memos: MemosActivationConfig };
  readonly memos: MemosPublicConfig;
}
export interface MemoStreamBuildData {
  readonly public: MemosPublicConfig;
  readonly envelope: PublicMemosExport;
}
export function loadMemoStream(config: MemoSiteConfig, options?: { readonly exportPath?: string; readonly repositoryRoot?: string }): MemoStreamBuildData | null;
