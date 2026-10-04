import { SITE_CONFIG } from '../src/lib/site-config.mjs';
import { loadMemoStream } from '../src/plugins/memos/index.mjs';

if (loadMemoStream(SITE_CONFIG) !== null) process.stdout.write('[memos] validated public export\n');
