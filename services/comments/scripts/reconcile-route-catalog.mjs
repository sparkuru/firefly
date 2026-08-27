import {
  FAILURE_MESSAGES,
  RouteCatalogFailure,
  createState,
  parseArguments,
  reconcileRouteCatalog,
  summaryFor
} from './route-catalog.mjs';

async function main() {
  const state = createState();
  let failureCode = null;
  let exitCode = 1;
  try {
    const argumentsValue = parseArguments(process.argv.slice(2), { requireOutput: true });
    await reconcileRouteCatalog({
      releaseRoot: argumentsValue.release,
      configPath: argumentsValue.config,
      outputPath: argumentsValue.output,
      state
    });
    process.stdout.write(`${JSON.stringify({ ...summaryFor(state, 'pass'), candidateRouteCount: state.staticRoutes.size })}\n`);
    return;
  } catch (error) {
    if (error instanceof RouteCatalogFailure) {
      failureCode = error.code;
      exitCode = error.exitCode;
    } else {
      failureCode = 'invalidCandidate';
    }
  }

  process.stdout.write(`${JSON.stringify(summaryFor(state, 'fail'))}\n`);
  const message = FAILURE_MESSAGES[failureCode] ?? 'candidate generation failed';
  process.stderr.write(`route catalog reconciliation failed: ${message}.\n`);
  process.exitCode = exitCode;
}

await main();
