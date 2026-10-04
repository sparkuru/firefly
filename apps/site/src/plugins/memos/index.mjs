import path from 'node:path';
import { existsSync } from 'node:fs';
import { decodePublicMemosExport } from '../../../../../plugins/memos/public.mjs';
import { parseMemosPublicConfig } from '../../../../../plugins/memos/config.mjs';
import { readContainedFile } from '../../lib/contained-file.mjs';

const repositoryRoot = [process.cwd(), path.resolve(process.cwd(), '../..'), path.resolve(import.meta.dirname, '../../../../..')]
  .find((candidate) => existsSync(path.join(candidate, 'plugins/memos/public.mjs')));

export function loadMemoStream(config, options = {}) {
  if (!config.plugins.memos.enabled) return null;
  const publicConfig = parseMemosPublicConfig({ public: config.memos }, 'memo public configuration', { enabled: true });
  const override = options.exportPath ?? process.env.FIREFLY_MEMOS_EXPORT;
  const exportPath = override === undefined || override === '' ? publicConfig.exportPath : override;
  if (typeof exportPath !== 'string' || !exportPath.endsWith('.json')) {
    throw new TypeError('Memo export must use a repository-relative JSON path.');
  }
  const bytes = readContainedFile(exportPath, options.repositoryRoot ?? repositoryRoot, 'memo export');
  const envelope = decodePublicMemosExport(bytes, 'memo export');
  return Object.freeze({ public: publicConfig, envelope });
}
