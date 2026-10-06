import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCandidate, buildRollbackCandidate, decodeReceipt, newMemo, promoteCandidate, readCurrentHistory, validateCandidate } from './index.mjs';
import { decodeUtf8, readFile } from './files.mjs';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const usage = 'Usage: memos new <name> | build | validate | state | promote | rollback [--source-root PATH] [--assets-root PATH] [--output-root PATH] [--display-name NAME] [--history PATH] [--candidate-root PATH] [--deployment-root PATH] [--expected-base DIGEST|null] [--initial-deletion-floor N]';
function argumentsFor(argv) {
  const [command, ...rest] = argv;
  if (command === '--help' || command === 'help') return { command: 'help', options: {} };
  if (!['new', 'build', 'validate', 'state', 'promote', 'rollback'].includes(command)) throw new TypeError(usage);
  const allowed = {
    new: ['source-root'], build: ['source-root', 'assets-root', 'output-root', 'display-name', 'history', 'initial-deletion-floor'],
    validate: ['candidate-root'], state: ['deployment-root'],
    promote: ['deployment-root', 'candidate-root', 'expected-base', 'initial-deletion-floor'],
    rollback: ['candidate-root', 'history', 'output-root']
  }[command];
  const options = {};
  if (command === 'new') options.name = rest.shift();
  while (rest.length) {
    const flag = rest.shift();
    const key = flag?.startsWith('--') ? flag.slice(2) : '';
    const value = rest.shift();
    if (!allowed.includes(key) || !value || value.startsWith('--') || Object.hasOwn(options, key)) throw new TypeError(usage);
    options[key] = value;
  }
  return { command, options };
}
function required(options, key) {
  if (!options[key]) throw new TypeError(`--${key} is required.`);
  return path.resolve(options[key]);
}
function historyFile(filename) {
  if (!filename) return null;
  const absolute = path.resolve(filename);
  const raw = JSON.parse(decodeUtf8(readFile(path.dirname(absolute), path.basename(absolute))));
  // An explicit state probe serializes null only for a proven empty destination.
  return raw === null ? null : decodeReceipt(raw);
}
function bootstrapFloor(options) {
  const raw = options['initial-deletion-floor'] ?? '0';
  if (!/^(?:0|[1-9][0-9]*)$/u.test(raw) || !Number.isSafeInteger(Number(raw))) throw new TypeError('--initial-deletion-floor must be a non-negative safe integer.');
  return Number(raw);
}

export async function runCli(argv) {
  const { command, options } = argumentsFor(argv);
  switch (command) {
    case 'help': return usage;
    case 'new': return newMemo({ sourceRoot: options['source-root'] ?? path.join(repo, 'content/memos'), name: options.name });
    case 'build': {
      const outputRoot = options['output-root'] ? path.resolve(options['output-root']) : path.join(repo, '.firefly/memos', `candidate-${Date.now()}`);
      const result = await buildCandidate({ sourceRoot: options['source-root'] ?? path.join(repo, 'content/memos'), assetsRoot: options['assets-root'], outputRoot, displayName: options['display-name'] ?? 'Owner', history: historyFile(options.history), initialDeletionFloor: bootstrapFloor(options) });
      return { candidateRoot: result.candidateRoot, receipt: result.receipt };
    }
    case 'validate': return (await validateCandidate(required(options, 'candidate-root'))).receipt;
    case 'state': return readCurrentHistory(required(options, 'deployment-root'));
    case 'promote': {
      if (!Object.hasOwn(options, 'expected-base')) throw new TypeError('--expected-base is required (digest or null).');
      return promoteCandidate({ deploymentRoot: required(options, 'deployment-root'), candidateRoot: required(options, 'candidate-root'), expectedBase: options['expected-base'] === 'null' ? null : options['expected-base'], initialDeletionFloor: bootstrapFloor(options) });
    }
    case 'rollback': {
      const outputRoot = required(options, 'output-root');
      return (await buildRollbackCandidate({ priorCandidateRoot: required(options, 'candidate-root'), history: historyFile(required(options, 'history')), outputRoot })).receipt;
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli(process.argv.slice(2)).then((result) => { process.stdout.write(`${typeof result === 'string' ? result : JSON.stringify(result)}\n`); }).catch((error) => {
    // Do not serialize owner input/config or stacks into operational logs.
    const operation = ['new', 'build', 'validate', 'state', 'promote', 'rollback'].includes(process.argv[2]) ? process.argv[2] : 'command';
    const detail = error instanceof TypeError ? error.message : error.code === 'EEXIST' ? 'destination or publication lock already exists; inspect the owned boundary before retrying.' : error.code === 'ENOENT' ? 'required input is missing.' : 'operation failed; check the owned input/output boundary.';
    process.stderr.write(`memos ${operation}: ${detail}\n`);
    process.exitCode = 1;
  });
}
