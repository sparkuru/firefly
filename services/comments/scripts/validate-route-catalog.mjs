import {
  FAILURE_MESSAGES,
  RouteCatalogFailure,
  assertValidInventory,
  calculateRouteDifferences,
  createState,
  inspectInputs,
  parseArguments,
  summaryFor,
  writeCatalog
} from './route-catalog.mjs';

async function main() {
  const state = createState();
  let failureCode = null;
  let exitCode = 1;
  try {
    const argumentsValue = parseArguments(process.argv.slice(2));
    const inputs = await inspectInputs({
      releaseRoot: argumentsValue.release,
      configPath: argumentsValue.config,
      state
    });
    calculateRouteDifferences(state);
    assertValidInventory(state, { requireExactMatch: true });
    if (argumentsValue.output !== null) {
      await writeCatalog(argumentsValue.output, state.staticRoutes, {
        inputPath: inputs.configPath,
        inputStats: inputs.config.configStats,
        forbiddenRoot: inputs.resolvedReleaseRoot
      });
    }
    process.stdout.write(`${JSON.stringify(summaryFor(state, 'pass'))}\n`);
    return;
  } catch (error) {
    if (error instanceof RouteCatalogFailure) {
      failureCode = error.code;
      exitCode = error.exitCode;
    } else {
      failureCode = 'invalidReleaseTree';
    }
  }

  process.stdout.write(`${JSON.stringify(summaryFor(state, 'fail'))}\n`);
  const message = FAILURE_MESSAGES[failureCode] ?? 'validation failed';
  process.stderr.write(`route catalog validation failed: ${message}.\n`);
  process.exitCode = exitCode;
}

await main();
