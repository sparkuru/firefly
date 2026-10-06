import { chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, renameSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicExport, decodePublicMemosExport, normalizeDisplayName, serializePublicExport, timestamp } from '../../../plugins/memos/public.mjs';
import { decodeUtf8, makeSafeDirectory, overlaps, readFile, safeDirectory, walkFiles } from './files.mjs';
import { readMemoSources } from './source.mjs';
import { renderPublication } from './render.mjs';
import { acceptedMemosFor, assertTransition, decodeReceipt, hash, makeReceipt, nextHistory } from './history.mjs';
export { newMemo, parseMemoSource, readMemoSources } from './source.mjs';
export { decodeReceipt } from './history.mjs';
export { renderMarkdown } from './render.mjs';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const fail = (message) => { throw new TypeError(`Memo publication refused: ${message}`); };
const ESTABLISHED = 'firefly-owner-memos-v1\n';

function ownedOutput(outputRoot, sourceRoot) {
  const output = path.resolve(outputRoot);
  if (overlaps(repositoryRoot, output) && !overlaps(path.join(repositoryRoot, '.firefly/memos'), output)) fail('repository output must stay inside the independent .firefly/memos boundary.');
  for (const protectedRoot of ['artifacts', 'dist', 'apps', 'content', 'packages', 'presentations', 'experiments', 'services', 'plugins']) {
    if (overlaps(path.join(repositoryRoot, protectedRoot), output) || overlaps(output, path.join(repositoryRoot, protectedRoot))) fail('output must stay outside blog source and release boundaries.');
  }
  if (sourceRoot && (overlaps(sourceRoot, output) || overlaps(output, sourceRoot))) fail('source and output roots must not overlap.');
  return output;
}

function writePublic(root, file, bytes) {
  const target = path.join(root, 'public', file);
  mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
  writeFileSync(target, bytes, { mode: 0o644, flag: 'wx' });
  chmodSync(target, 0o644);
  let directory = path.dirname(target);
  while (directory !== root) { chmodSync(directory, 0o755); directory = path.dirname(directory); }
}

async function emitCandidate({ memos, assetsRoot, outputRoot, history, generatedAt, initialDeletionFloor = 0 }) {
  const next = nextHistory(memos, history, initialDeletionFloor);
  const bundle = createPublicExport({ schemaVersion: 2, bodyFormat: 'markdown', sourceRevision: `s${next.sequence}-${hash(acceptedMemosFor({ memos }))}`, generatedAt: timestamp(generatedAt, 'generatedAt'), tombstoneEpoch: next.deletionFloor, memos });
  const rendered = await renderPublication(bundle, assetsRoot);
  const root = ownedOutput(outputRoot);
  makeSafeDirectory(path.dirname(root));
  // Absent-only candidates prevent an interrupted build from reusing stale files.
  mkdirSync(root, { mode: 0o700 });
  writePublic(root, 'index.html', rendered.html);
  writePublic(root, 'memos.public.v2.json', serializePublicExport(bundle));
  for (const [relative, bytes] of rendered.assets) writePublic(root, relative, bytes);
  const inventory = inventoryFor(root);
  const receipt = makeReceipt(bundle, history, inventory, initialDeletionFloor);
  writeFileSync(path.join(root, 'receipt.json'), `${JSON.stringify(receipt)}\n`, { mode: 0o600, flag: 'wx' });
  await validateCandidate(root);
  return { candidateRoot: root, bundle, receipt };
}

export async function buildCandidate({ sourceRoot, assetsRoot = path.join(sourceRoot, 'assets'), outputRoot, displayName, history = null, generatedAt = new Date().toISOString(), initialDeletionFloor = 0 }) {
  const root = safeDirectory(sourceRoot);
  ownedOutput(outputRoot, root);
  if (overlaps(assetsRoot, outputRoot) || overlaps(outputRoot, assetsRoot)) fail('assets and output roots must not overlap.');
  const accepted = history === null ? [] : decodeReceipt(history).acceptedMemos;
  const memos = readMemoSources(root, normalizeDisplayName(displayName), accepted);
  return emitCandidate({ memos, assetsRoot, outputRoot, history, generatedAt, initialDeletionFloor });
}

function inventoryFor(root) {
  return walkFiles(root).filter((file) => file.startsWith('public/')).map((file) => {
    const bytes = readFile(root, file);
    return { path: file, bytes: bytes.length, digest: hash(bytes) };
  });
}

export async function validateCandidate(candidateRoot) {
  const root = safeDirectory(candidateRoot);
  const files = walkFiles(root, true);
  if ((lstatSync(path.join(root, 'receipt.json')).mode & 0o077) !== 0) fail('private candidate receipt must be owner-only.');
  const receipt = decodeReceipt(decodeUtf8(readFile(root, 'receipt.json')));
  const bundle = decodePublicMemosExport(readFile(root, 'public/memos.public.v2.json'));
  if (receipt.exportDigest !== bundle.digest || receipt.deletionFloor !== bundle.tombstoneEpoch || JSON.stringify(receipt.acceptedMemos) !== JSON.stringify(acceptedMemosFor(bundle))) fail('public export does not match private receipt.');
  if (JSON.stringify(inventoryFor(root)) !== JSON.stringify(receipt.inventory)) fail('public inventory/digests do not match receipt.');
  const rendered = await renderPublication(bundle, path.join(root, 'public/assets/media'));
  if (decodeUtf8(readFile(root, 'public/index.html')) !== rendered.html) fail('HTML is not the canonical sanitized Markdown render.');
  if (decodeUtf8(readFile(root, 'public/memos.public.v2.json')) !== serializePublicExport(bundle)) fail('public export must use canonical serialization.');
  const expected = ['receipt.json', 'public/index.html', 'public/memos.public.v2.json', ...[...rendered.assets.keys()].map((file) => `public/${file}`)].sort();
  if (JSON.stringify(files) !== JSON.stringify(expected)) fail('candidate contains extra or missing files.');
  for (const [file, bytes] of rendered.assets) if (!readFile(root, `public/${file}`).equals(bytes)) fail('asset differs from deterministic render.');
  return { candidateRoot: root, bundle, receipt };
}

export async function readCurrentHistory(deploymentRoot) {
  try { lstatSync(deploymentRoot); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const root = safeDirectory(deploymentRoot);
  const current = path.join(root, 'current');
  let pointer;
  try { pointer = lstatSync(current); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const entries = readdirSync(root);
    if (entries.some((name) => !['releases', 'incoming', '.publish-lock'].includes(name)) || (existsSync(path.join(root, 'releases')) && readdirSync(safeDirectory(path.join(root, 'releases'))).length)) fail('missing established current/history; recover accepted receipt.');
    for (const entry of entries) safeDirectory(path.join(root, entry));
    return null;
  }
  if (!pointer.isSymbolicLink()) fail('current must be the owned release pointer.');
  if (decodeUtf8(readFile(root, 'established')) !== ESTABLISHED) fail('missing or malformed established boundary marker.');
  const relative = readlinkSync(current);
  if (!/^releases\/r_[1-9][0-9]*_[a-f0-9]{64}$/u.test(relative)) fail('current points outside owned releases.');
  const accepted = await validateCandidate(path.join(root, relative));
  if ((lstatSync(path.join(root, relative, 'receipt.json')).mode & 0o077) !== 0 || (lstatSync(path.join(root, 'established')).mode & 0o077) !== 0) fail('accepted private metadata must be owner-only.');
  if (relative !== `releases/r_${accepted.receipt.sequence}_${accepted.receipt.digest}`) fail('current release name does not match receipt.');
  return accepted.receipt;
}

export async function promoteCandidate({ deploymentRoot, candidateRoot, expectedBase, initialDeletionFloor = 0 }) {
  const candidate = await validateCandidate(candidateRoot);
  if (expectedBase !== candidate.receipt.expectedBase) fail('expectedBase must match candidate receipt.');
  const target = ownedOutput(deploymentRoot);
  if (overlaps(target, candidateRoot) || overlaps(candidateRoot, target)) {
    // A staged remote input may be below incoming/, never below current releases.
    if (!path.resolve(candidateRoot).startsWith(`${target}${path.sep}incoming${path.sep}`)) fail('candidate must be separate from accepted releases.');
  }
  safeDirectory(path.dirname(target));
  if (!existsSync(target)) { mkdirSync(target, { mode: 0o755 }); chmodSync(target, 0o755); }
  safeDirectory(target);
  const lock = path.join(target, '.publish-lock');
  mkdirSync(lock, { mode: 0o700 });
  let temporaryPointer;
  try {
    const current = await readCurrentHistory(target);
    if ((current?.digest ?? null) !== expectedBase) fail('stale expected base; another publisher changed current.');
    assertTransition(candidate.receipt, candidate.bundle, current, initialDeletionFloor);
    const releases = path.join(target, 'releases');
    if (!existsSync(releases)) { mkdirSync(releases, { mode: 0o755 }); chmodSync(releases, 0o755); }
    safeDirectory(releases);
    const releaseName = `r_${candidate.receipt.sequence}_${candidate.receipt.digest}`;
    const release = path.join(releases, releaseName);
    if (existsSync(release)) fail('release already exists; inspect current before retrying.');
    mkdirSync(release, { mode: 0o755 });
    chmodSync(release, 0o755);
    for (const file of walkFiles(candidate.candidateRoot)) {
      if (file.startsWith('public/')) writePublic(release, file.slice('public/'.length), readFile(candidate.candidateRoot, file));
      else writeFileSync(path.join(release, file), readFile(candidate.candidateRoot, file), { mode: 0o600, flag: 'wx' });
    }
    const copied = await validateCandidate(release);
    if (copied.receipt.digest !== candidate.receipt.digest) fail('staged release changed during copy.');
    if (current === null) writeFileSync(path.join(target, 'established'), ESTABLISHED, { flag: 'wx', mode: 0o600 });
    temporaryPointer = path.join(target, `.current-${randomBytes(12).toString('hex')}`);
    symlinkSync(`releases/${releaseName}`, temporaryPointer);
    renameSync(temporaryPointer, path.join(target, 'current'));
    temporaryPointer = undefined;
    return candidate.receipt;
  } finally {
    if (temporaryPointer) unlinkSync(temporaryPointer);
    rmdirSync(lock);
  }
}

export async function buildRollbackCandidate({ priorCandidateRoot, history, outputRoot, generatedAt = new Date().toISOString() }) {
  if (history === null || history === undefined) fail('rollback requires current established history.');
  const prior = await validateCandidate(priorCandidateRoot);
  const current = decodeReceipt(history);
  if (prior.receipt.sequence >= current.sequence) fail('rollback content must be from an earlier accepted sequence.');
  ownedOutput(outputRoot, priorCandidateRoot);
  return emitCandidate({ memos: [...prior.bundle.memos], assetsRoot: path.join(prior.candidateRoot, 'public/assets/media'), outputRoot, history: current, generatedAt });
}
