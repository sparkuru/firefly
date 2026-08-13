#!/usr/bin/env node
import path from 'node:path';
import { discoverExperiments } from './index.js';

function usage(): string {
  return 'Usage: validate-experiments --root <repository-root>';
}

async function main(arguments_: readonly string[]): Promise<number> {
  if (arguments_.includes('--help') || arguments_.includes('-h')) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (arguments_.length !== 2 || arguments_[0] !== '--root' || arguments_[1] === undefined) {
    process.stderr.write(`${usage()}\n`);
    return 2;
  }
  const repositoryRoot = path.resolve(arguments_[1]);
  const discovery = await discoverExperiments({ repositoryRoot });
  process.stdout.write(`${JSON.stringify({
    trustBoundary: 'repository-controlled manifests only',
    manifestCount: discovery.manifests.length,
    listedCount: discovery.catalog.length,
    ids: discovery.manifests.map((manifest) => manifest.id),
    catalog: discovery.catalog
  }, null, 2)}\n`);
  return 0;
}

main(process.argv.slice(2)).then(
  (status) => {
    process.exitCode = status;
  },
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
);
