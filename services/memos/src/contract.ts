import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// Emitted modules live one level deeper than sources; keep the package build
// independent without emitting or copying shared contract implementations.
const directory = path.dirname(fileURLToPath(import.meta.url));
export const publicContract = await import(pathToFileURL(path.resolve(directory, '../../../../plugins/memos/public.mjs')).href) as typeof import('../../../plugins/memos/public.mjs');
export const configContract = await import(pathToFileURL(path.resolve(directory, '../../../../plugins/memos/config.mjs')).href) as typeof import('../../../plugins/memos/config.mjs');
