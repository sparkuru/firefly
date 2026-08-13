#!/usr/bin/env node
import path from 'node:path';
import { discoverExperiments } from '@f1refly/validate-experiments';
import { assemblePublication, buildExperiments } from './index.js';

function usage(): string {
  return 'Usage: assemble-publication [--root <repository-root>] [--build-experiments]';
}

async function main(arguments_: readonly string[]): Promise<number> {
  if (arguments_.includes('--help') || arguments_.includes('-h')) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  let repositoryRoot = path.resolve(import.meta.dirname, '../../../..');
  let shouldBuild = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--root') {
      const value = arguments_[index + 1];
      if (value === undefined) {
        process.stderr.write(`${usage()}\n`);
        return 2;
      }
      repositoryRoot = path.resolve(value);
      index += 1;
    } else if (argument === '--build-experiments') {
      shouldBuild = true;
    } else {
      process.stderr.write(`${usage()}\n`);
      return 2;
    }
  }
  const discovery = await discoverExperiments({ repositoryRoot });
  if (shouldBuild) {
    await buildExperiments(discovery.manifests);
    process.stdout.write(`${JSON.stringify({ built: discovery.manifests.map((manifest) => manifest.id) })}\n`);
    return 0;
  }
  const result = await assemblePublication({ repositoryRoot, discovery });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return 0;
}

main(process.argv.slice(2)).then(
  (status) => {
    process.exitCode = status;
  },
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = typeof (error as { exitCode?: unknown }).exitCode === 'number'
      ? (error as { exitCode: number }).exitCode
      : 1;
  }
);
