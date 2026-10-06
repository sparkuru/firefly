import { buildCandidate, newMemo, readCurrentHistory, promoteCandidate, validateCandidate, type MemoReceipt, type BuildOptions } from '../src/index.mjs';
const options: BuildOptions = { sourceRoot: '/source', outputRoot: '/candidate', displayName: 'Owner' };
async function types() {
  const candidate = await buildCandidate(options);
  const history: MemoReceipt | null = await readCurrentHistory('/deployment');
  const receipt: MemoReceipt = await promoteCandidate({ deploymentRoot: '/deployment', candidateRoot: candidate.candidateRoot, expectedBase: history?.digest ?? null });
  // @ts-expect-error Publication history is immutable.
  receipt.sequence = 0;
  // @ts-expect-error Schema 2 explicitly requires Markdown semantics.
  candidate.bundle.bodyFormat = 'text';
  await validateCandidate(candidate.candidateRoot);
  newMemo({ sourceRoot: options.sourceRoot, name: 'note' });
}
void types;
