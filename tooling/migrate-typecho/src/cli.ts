#!/usr/bin/env node
import path from 'node:path';
import { migrateTypecho } from './index.js';

interface CliOptions {
  readonly repositoryRoot: string;
  readonly dumpPath: string;
  readonly sha256: string;
  readonly ledgerRoot: string;
  readonly adapterCommand?: string;
  readonly uploadsRoot?: string;
  readonly resourceManifestPath?: string;
  readonly materializePublic: boolean;
  readonly materializeCandidate: boolean;
  readonly outputRoot?: string;
  readonly expectedPosts: number;
  readonly expectedPages: number;
}

function usage(): string {
  return [
    'Usage: migrate-typecho --repository-root <directory> --dump <file.sql[.gz]> --sha256 <hex> --ledger-root <.private/path>',
    '  [--adapter-command <absolute-executable>] [--uploads-root <directory> --resource-manifest <json>]',
    '  [--expected-posts <count>] [--expected-pages <count>]',
    '  [--materialize-public --output-root <content-descendant>]',
    '  [--materialize-candidate --output-root <ledger-root/candidates/descendant>]'
  ].join('\n');
}

function count(value: string | undefined, owner: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (!/^\d+$/u.test(value)) throw new TypeError(`${owner} must be a non-negative integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new TypeError(`${owner} must be a safe integer.`);
  return parsed;
}

function parseArguments(arguments_: readonly string[]): CliOptions {
  const values = new Map<string, string>();
  let materializePublic = false;
  let materializeCandidate = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--materialize-public') {
      if (materializePublic) throw new TypeError('--materialize-public may appear only once.');
      materializePublic = true;
      continue;
    }
    if (argument === '--materialize-candidate') {
      if (materializeCandidate) throw new TypeError('--materialize-candidate may appear only once.');
      materializeCandidate = true;
      continue;
    }
    if (argument === undefined || !argument.startsWith('--')) throw new TypeError(`Unexpected argument ${argument ?? ''}.`);
    if (!['--repository-root', '--dump', '--sha256', '--ledger-root', '--adapter-command', '--uploads-root', '--resource-manifest', '--output-root', '--expected-posts', '--expected-pages'].includes(argument)) {
      throw new TypeError(`Unknown option ${argument}.`);
    }
    if (values.has(argument)) throw new TypeError(`${argument} may appear only once.`);
    const value = arguments_[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`${argument} requires a value.`);
    values.set(argument, value);
    index += 1;
  }
  const required = (name: string): string => {
    const value = values.get(name);
    if (value === undefined) throw new TypeError(`${name} is required.`);
    return value;
  };
  const outputRoot = values.get('--output-root');
  if (materializePublic && materializeCandidate) throw new TypeError('Choose either --materialize-public or --materialize-candidate.');
  if ((materializePublic || materializeCandidate) !== (outputRoot !== undefined)) throw new TypeError('A materialization mode and --output-root must be supplied together.');
  if ((values.get('--uploads-root') === undefined) !== (values.get('--resource-manifest') === undefined)) throw new TypeError('--uploads-root and --resource-manifest must be supplied together.');
  const repositoryRoot = path.resolve(required('--repository-root'));
  const resolveFromRoot = (value: string): string => path.resolve(repositoryRoot, value);
  return Object.freeze({
    repositoryRoot,
    dumpPath: resolveFromRoot(required('--dump')),
    sha256: required('--sha256'),
    ledgerRoot: resolveFromRoot(required('--ledger-root')),
    ...(values.get('--adapter-command') === undefined ? {} : { adapterCommand: resolveFromRoot(values.get('--adapter-command') ?? '') }),
    ...(values.get('--uploads-root') === undefined ? {} : { uploadsRoot: resolveFromRoot(values.get('--uploads-root') ?? '') }),
    ...(values.get('--resource-manifest') === undefined ? {} : { resourceManifestPath: resolveFromRoot(values.get('--resource-manifest') ?? '') }),
    materializePublic,
    materializeCandidate,
    ...(outputRoot === undefined ? {} : { outputRoot: resolveFromRoot(outputRoot) }),
    expectedPosts: count(values.get('--expected-posts'), '--expected-posts', 93),
    expectedPages: count(values.get('--expected-pages'), '--expected-pages', 7)
  });
}

async function main(arguments_: readonly string[]): Promise<number> {
  if (arguments_.includes('--help') || arguments_.includes('-h')) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  const options = parseArguments(arguments_);
  const result = await migrateTypecho({
    repositoryRoot: options.repositoryRoot,
    dumpPath: options.dumpPath,
    expectedSha256: options.sha256,
    ledgerRoot: options.ledgerRoot,
    ...(options.adapterCommand === undefined ? {} : { adapterCommand: options.adapterCommand }),
    ...(options.uploadsRoot === undefined ? {} : { uploadsRoot: options.uploadsRoot }),
    ...(options.resourceManifestPath === undefined ? {} : { resourceManifestPath: options.resourceManifestPath }),
    materializePublic: options.materializePublic,
    materializeCandidate: options.materializeCandidate,
    ...(options.outputRoot === undefined ? {} : { outputRoot: options.outputRoot }),
    expectedPosts: options.expectedPosts,
    expectedPages: options.expectedPages
  });
  process.stdout.write(`${JSON.stringify({
    schemaVersion: 1,
    inventory: result.inventory,
    ledgerRoot: path.relative(options.repositoryRoot, result.ledgerRoot),
    ...(result.outputRoot === undefined ? {} : { outputRoot: path.relative(options.repositoryRoot, result.outputRoot) })
  }, null, 2)}\n`);
  return result.exceptions.length === 0 ? 0 : 1;
}

main(process.argv.slice(2)).then(
  (status) => { process.exitCode = status; },
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${usage()}\n`);
    process.exitCode = 1;
  }
);
