import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeUtf8, readFile } from '../publish-memos/src/files.mjs';
import { importCorpus, installCandidate, newDocument, validateCandidate } from './documents.mjs';

const usage = 'Memo documents: new [YYYYMMDD-HHMMSS.md] [--source-root ROOT] | import --config PRIVATE_JSON | validate --candidate-root ROOT | install --candidate-root ROOT --workspace-root ROOT [--apply]';
const flags = { new: ['source-root'], import: ['config'], validate: ['candidate-root'], install: ['candidate-root', 'workspace-root', 'apply'] };

export async function runCli(argv) {
  const [command, ...rest] = argv;
  if (command === '--help' || command === 'help') return usage;
  if (!Object.hasOwn(flags, command)) throw new TypeError(usage);
  const options = {};
  if (command === 'new' && rest[0] && !rest[0].startsWith('--')) options.name = rest.shift();
  while (rest.length) {
    const flag = rest.shift();
    if (!flag.startsWith('--')) throw new TypeError('Options must begin with --.');
    const key = flag.slice(2);
    if (!flags[command].includes(key) || Object.hasOwn(options, key)) throw new TypeError('Unsupported or repeated argument.');
    const value = key === 'apply' ? true : rest.shift();
    if (!value || (typeof value === 'string' && value.startsWith('--'))) throw new TypeError('Missing argument value.');
    options[key] = value;
  }
  const required = (key) => { if (typeof options[key] !== 'string') throw new TypeError(`--${key} is required.`); return path.resolve(options[key]); };
  if (command === 'new') return newDocument({ name: options.name, sourceRoot: options['source-root'] });
  if (command === 'validate') return validateCandidate(required('candidate-root'));
  if (command === 'install') return installCandidate({ candidateRoot: required('candidate-root'), workspaceRoot: required('workspace-root'), apply: options.apply === true });
  const configPath = required('config');
  const config = JSON.parse(decodeUtf8(readFile(path.dirname(configPath), path.basename(configPath))));
  return importCorpus(config);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli(process.argv.slice(2)).then((result) => process.stdout.write(`${typeof result === 'string' ? result : JSON.stringify(result)}\n`)).catch((error) => {
    const detail = error instanceof TypeError ? error.message : error.code === 'EEXIST' ? 'destination already exists.' : error.code === 'ENOENT' ? 'required input is missing.' : 'verification failed; inspect private inputs and report.';
    process.stderr.write(`Memo documents: ${detail}\n`);
    process.exitCode = 1;
  });
}
