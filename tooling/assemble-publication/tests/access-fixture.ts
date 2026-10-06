import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { publicationContractRoot } from '../src/plugins/memos.js';
const { writePluginAccess } = await import(pathToFileURL(path.join(publicationContractRoot, 'plugins/public-access-files.mjs')).href) as typeof import('../../../plugins/public-access-files.mjs');

export async function writeAccess(root: string, flags: { comments: boolean; memos: boolean }): Promise<void> {
  await writePluginAccess(root, { schemaVersion: 1, plugins: { comments: { enabled: flags.comments }, memos: { enabled: flags.memos } } });
}
