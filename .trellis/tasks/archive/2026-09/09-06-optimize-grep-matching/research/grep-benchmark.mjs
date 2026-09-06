import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const contentRoot = process.env.FIREFLY_CONTENT_ROOT;
if (contentRoot === undefined || contentRoot.length === 0) {
  throw new Error('FIREFLY_CONTENT_ROOT is required.');
}

const repositoryRoot = process.cwd();
const { executeGrep } = await import(pathToFileURL(join(
  repositoryRoot,
  'presentations/terminal/dist/src/commands/grep.js'
)).href);
const { commandArguments } = await import(pathToFileURL(join(
  repositoryRoot,
  'presentations/terminal/dist/src/commands/arguments.js'
)).href);
const { createPublicIndex } = await import(pathToFileURL(join(
  repositoryRoot,
  'presentations/terminal/dist/src/vfs/public-index.js'
)).href);

async function collect(directory, collection) {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path, collection));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push({ path, collection });
  }
  return files;
}

const files = [
  ...await collect(join(contentRoot, 'pages'), 'pages'),
  ...await collect(join(contentRoot, 'posts'), 'posts')
];
const records = await Promise.all(files.map(async ({ path, collection }) => {
  const lines = (await readFile(path, 'utf8')).split(/\r?\n/u);
  const relativePath = relative(join(contentRoot, collection), path).split('\\').join('/');
  const virtualPath = '/' + collection + '/' + relativePath;
  return {
    document: {
      kind: collection === 'posts' ? 'post' : 'page',
      path: virtualPath,
      relativePath,
      filename: basename(path),
      title: basename(path, '.md'),
      href: virtualPath.slice(0, -3) + '/',
      date: '2026-01-01'
    },
    textDocument: { path: virtualPath, lines }
  };
}));

const fs = createPublicIndex({
  documents: records.map(({ document }) => document),
  experiments: [],
  textDocuments: records.map(({ textDocument }) => textDocument)
});
const context = {
  cwd: '/',
  fs,
  session: { history: [], scratch: [] },
  clock: () => new Date('2026-01-01T00:00:00.000Z'),
  signal: { aborted: false }
};
const cases = [
  { name: 'grep cat', operands: ['cat'], options: {} },
  { name: 'grep -w cat', operands: ['cat'], options: { 'word-regexp': true } },
  { name: 'grep -E cat|dog', operands: ['cat|dog'], options: { 'extended-regexp': true } },
  {
    name: 'grep -Ew cat|dog',
    operands: ['cat|dog'],
    options: { 'extended-regexp': true, 'word-regexp': true }
  },
  { name: 'grep -w zzzzzz', operands: ['zzzzzz'], options: { 'word-regexp': true } },
  { name: 'grep -E zzzzzz', operands: ['zzzzzz'], options: { 'extended-regexp': true } }
];
const summary = {
  files: records.length,
  lines: records.reduce((total, { textDocument }) => total + textDocument.lines.length, 0),
  characters: records.reduce(
    (total, { textDocument }) => total + textDocument.lines.reduce((sum, line) => sum + line.length, 0),
    0
  ),
  maxLine: Math.max(...records.flatMap(({ textDocument }) => textDocument.lines.map((line) => line.length))),
  cases: {}
};

for (const item of cases) {
  const samples = [];
  let last;
  for (let run = 0; run < 3; run += 1) {
    const start = performance.now();
    last = executeGrep(context, commandArguments(item.operands, item.options));
    samples.push(performance.now() - start);
  }
  const report = last?.value?.kind === 'grep-report' ? last.value.report : undefined;
  summary.cases[item.name] = {
    samples: samples.map((value) => Number(value.toFixed(1))),
    min: Number(Math.min(...samples).toFixed(1)),
    max: Number(Math.max(...samples).toFixed(1)),
    matches: report?.matches.length ?? null,
    truncated: report?.truncated ?? null
  };
}

console.log(JSON.stringify(summary, null, 2));
