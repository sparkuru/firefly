import assert from 'node:assert/strict';
import test from 'node:test';
import { executeCat } from '../src/commands/cat.js';
import { executeCd } from '../src/commands/cd.js';
import { executeFind } from '../src/commands/find.js';
import { executeGrep } from '../src/commands/grep.js';
import { executeLs } from '../src/commands/ls.js';
import { executeTree } from '../src/commands/tree.js';
import { executeOpen, executeVim } from '../src/commands/session.js';
import { commandArguments } from '../src/commands/arguments.js';
import { GREP_COMMAND_SPEC } from '../src/commands/grep.js';
import { createCommandSpecRegistry, NEUTRAL_COMMAND_REGISTRY } from '../src/commands/registry.js';
import type { ProcessContext } from '../src/shell/contracts.js';
import { runRshellInput } from '../src/shell/runner.js';
import { textStream } from '../src/shell/streams.js';
import { createPublicIndex } from '../src/vfs/public-index.js';

const fs = createPublicIndex({
  documents: [
    { kind: 'post', path: '/posts/characters/alpha.md', relativePath: 'characters/alpha.md', filename: 'alpha.md', title: 'Alpha', href: '/posts/characters/alpha/', date: '2026-05-28' },
    { kind: 'page', path: '/pages/about.md', relativePath: 'about.md', filename: 'about.md', title: 'About', href: '/pages/about/', date: '2026-02-01' }
  ],
  experiments: [{ id: 'nerv', title: 'NERV', href: '/lab/nerv/' }],
  textDocuments: [
    { path: '/posts/characters/alpha.md', lines: ['Alpha record', 'nahida keeps the archive'] },
    { path: '/pages/about.md', lines: ['About page', 'durable writing'] }
  ]
});

const scopedFs = createPublicIndex({
  documents: [
    { kind: 'post', path: '/posts/infra/operations.md', relativePath: 'infra/operations.md', filename: 'operations.md', title: 'Operations', href: '/posts/infra/operations/', date: '2026-05-28' },
    { kind: 'post', path: '/posts/infra/nested/deep-operations.md', relativePath: 'infra/nested/deep-operations.md', filename: 'deep-operations.md', title: 'Deep Operations', href: '/posts/infra/nested/deep-operations/', date: '2026-05-29' },
    { kind: 'post', path: '/posts/other/operations.md', relativePath: 'other/operations.md', filename: 'operations.md', title: 'Other Operations', href: '/posts/other/operations/', date: '2026-05-30' },
    { kind: 'page', path: '/pages/operations.md', relativePath: 'operations.md', filename: 'operations.md', title: 'Page Operations', href: '/pages/operations/', date: '2026-05-31' },
    { kind: 'post', path: '/lab/leaked.md', relativePath: 'leaked.md', filename: 'leaked.md', title: 'Leaked', href: '/posts/leaked/', date: '2026-06-01' }
  ],
  experiments: [],
  textDocuments: [
    { path: '/posts/infra/operations.md', lines: ['infra marker'] },
    { path: '/posts/infra/nested/deep-operations.md', lines: ['nested marker'] },
    { path: '/posts/other/operations.md', lines: ['other marker'] },
    { path: '/pages/operations.md', lines: ['page marker'] },
    { path: '/lab/leaked.md', lines: ['lab marker'] }
  ]
});

function context(overrides: Partial<ProcessContext> = {}): ProcessContext {
  return {
    cwd: '/posts',
    fs,
    session: { history: [], scratch: [] },
    clock: () => new Date('2026-08-12T04:05:06.000Z'),
    signal: { aborted: false },
    ...overrides
  };
}

function runnerOptions(overrides: Partial<Parameters<typeof runRshellInput>[1]> = {}): Parameters<typeof runRshellInput>[1] {
  return {
    cwd: '/posts',
    fs,
    session: { history: [], scratch: [] },
    clock: () => new Date('2026-08-12T04:05:06.000Z'),
    signal: { aborted: false },
    registry: NEUTRAL_COMMAND_REGISTRY,
    identity: {
      user: 'guest',
      host: 'firefly',
      workingDirectory: '~/blog/posts',
      about: 'A small public foundation.'
    },
    friendLinks: [
      { name: 'Example', desc: 'A useful example site.', url: 'https://example.test/blog' },
      { name: 'Docs', url: 'http://docs.example.test/?from=site' }
    ],
    ...overrides
  };
}

const args = commandArguments;

test('metadata titles are visible while index filenames remain ordering and path identity', () => {
  const indexFs = createPublicIndex({
    documents: [{
      kind: 'post',
      path: '/posts/notes/index-001.md',
      relativePath: 'notes/index-001.md',
      filename: 'index-001.md',
      title: 'Readable note',
      href: '/posts/notes/index-001/',
      date: '2026-05-28'
    }],
    experiments: [],
    textDocuments: [{ path: '/posts/notes/index-001.md', lines: ['Readable note'] }]
  });
  const commandContext = context({ cwd: '/posts/notes', fs: indexFs });
  const tree = executeTree(commandContext, args([]));
  assert.deepEqual(tree.stdout.lines, ['~/blog/posts/notes', '└── Readable note']);
  assert.equal(tree.value?.kind === 'tree' ? tree.value.nodes[0]?.node.path : undefined, '/posts/notes/index-001.md');
  const listing = executeLs(commandContext, args([]));
  assert.deepEqual(listing.stdout.lines, ['Readable note — 2026-05-28 — ~/blog/posts/notes/index-001.md']);
});

test('public index exposes a bounded virtual namespace, not host paths', () => {
  assert.deepEqual(fs.resolve('characters', '/posts', 'directory'), { ok: true, path: '/posts/characters' });
  assert.deepEqual(fs.resolve('.', '/', 'pattern'), { ok: true, path: '/' });
  assert.equal(fs.stat('/etc/passwd'), undefined);
  assert.deepEqual(fs.list('/')?.directories, ['lab/', 'pages/', 'posts/']);
  assert.deepEqual(fs.list('/')?.documents, []);
  assert.deepEqual(fs.list('/posts')?.documents, []);
  assert.deepEqual(fs.list('/posts/characters')?.documents.map(({ path }) => path), ['/posts/characters/alpha.md']);
  assert.deepEqual(fs.glob('/pages/*'), ['/pages/about.md']);
  for (const operand of ['/', '/posts', '/pages/about.md', '/lab/nerv', '/etc/passwd', '~', '~/', '~/other', '~other/path']) {
    assert.equal(fs.resolve(operand, '/', 'resource').ok, false, operand);
  }
  assert.deepEqual(fs.resolve('~/blog/pages/about.md', '/lab', 'resource'), { ok: true, path: '/pages/about.md' });
  assert.deepEqual(fs.resolve('~/blog/.rshell/tmp/help', '/lab', 'resource'), { ok: true, path: '/.rshell/tmp/help' });
});

test('each neutral command owns an argv parser and accepts interspersed options', () => {
  assert.equal(NEUTRAL_COMMAND_REGISTRY.definitions.every(({ parse }) => typeof parse === 'function'), true);
  const leading = runRshellInput('grep -i nahida', runnerOptions());
  const trailing = runRshellInput('grep nahida -i', runnerOptions());
  const clustered = runRshellInput('grep -inF nahida', runnerOptions());
  assert.deepEqual(trailing, leading);
  assert.equal(clustered.status, 0);
  assert.deepEqual(runRshellInput('grep --ignore-case nahida', runnerOptions()), leading);
  assert.equal(runRshellInput('grep -- nahida', runnerOptions()).status, 0);
  assert.equal(runRshellInput('grep -x nahida', runnerOptions()).status, 1);
});

test('grep supports whole-word fixed and safe-regex matching with explicit extended mode', () => {
  const fixed = executeGrep(
    context({ stdin: textStream(['cat catalog cat! _cat cat_']) }),
    args(['cat'], { 'fixed-strings': true, 'word-regexp': true })
  );
  assert.deepEqual(fixed.value, {
    kind: 'grep-report',
    report: {
      pattern: 'cat',
      matches: [{ path: '-', line: 'cat catalog cat! _cat cat_', ranges: [[0, 3], [12, 15]] }],
      noResults: false,
      truncated: false
    }
  });

  const insensitive = executeGrep(
    context({ stdin: textStream(['CAT catapult CAT.']) }),
    args(['cat'], { 'ignore-case': true, 'word-regexp': true })
  );
  assert.deepEqual(insensitive.stdout.lines, ['CAT catapult CAT.']);
  assert.deepEqual(insensitive.value?.kind === 'grep-report' ? insensitive.value.report.matches[0]?.ranges : [], [[0, 3], [13, 16]]);

  const regular = executeGrep(
    context({ stdin: textStream(['catalog dog']) }),
    args(['cat|dog'], { 'extended-regexp': true, 'word-regexp': true })
  );
  assert.deepEqual(regular.value?.kind === 'grep-report' ? regular.value.report.matches[0]?.ranges : [], [[8, 11]]);

  const boundaryInvalidThenValid = executeGrep(
    context({ stdin: textStream(['xxa x!']) }),
    args(['x+'], { 'word-regexp': true })
  );
  assert.deepEqual(boundaryInvalidThenValid.value?.kind === 'grep-report' ? boundaryInvalidThenValid.value.report.matches[0]?.ranges : [], [[4, 5]]);

  const longAbsent = executeGrep(
    context({ stdin: textStream(['x'.repeat(4_096)]) }),
    args(['x+z'], { 'word-regexp': true })
  );
  assert.deepEqual(longAbsent.value, {
    kind: 'grep-report',
    report: { pattern: 'x+z', matches: [], noResults: true, truncated: false }
  });

  const escapedLiteral = executeGrep(
    context({ stdin: textStream(['left + right']) }),
    args(['\\+'], { 'extended-regexp': true, 'word-regexp': true })
  );
  assert.deepEqual(escapedLiteral.value?.kind === 'grep-report' ? escapedLiteral.value.report.matches[0]?.ranges : [], [[5, 6]]);

  const repeated = executeGrep(
    context({ stdin: textStream(['catapult cat!']) }),
    args(['\\w+'], { 'word-regexp': true })
  );
  assert.deepEqual(repeated.value?.kind === 'grep-report' ? repeated.value.report.matches[0]?.ranges : [], [[0, 8], [9, 12]]);

  const zeroWidth = executeGrep(
    context({ stdin: textStream(['cat']) }),
    args(['^'], { 'word-regexp': true })
  );
  assert.deepEqual(zeroWidth.value, {
    kind: 'grep-report',
    report: { pattern: '^', matches: [], noResults: true, truncated: false }
  });

  const zeroWidthRepeat = executeGrep(
    context({ stdin: textStream(['b', 'a']) }),
    args(['a*'], { 'word-regexp': true })
  );
  assert.deepEqual(zeroWidthRepeat.value, {
    kind: 'grep-report',
    report: { pattern: 'a*', matches: [{ path: '-', line: 'a', ranges: [[0, 1]] }], noResults: false, truncated: false }
  });

  const conflict = executeGrep(
    context({ stdin: textStream(['cat']) }),
    args(['cat'], { 'extended-regexp': true, 'fixed-strings': true })
  );
  assert.deepEqual(conflict.stderr.lines, ['grep cannot combine --extended-regexp with --fixed-strings.']);
  assert.equal(runRshellInput('grep -Ew nahida', runnerOptions()).status, 0);
  assert.equal(runRshellInput('grep --extended-regexp --word-regexp nahida', runnerOptions()).status, 0);
  assert.match(runRshellInput('grep -EF nahida', runnerOptions()).stderr.lines[0] ?? '', /cannot combine/u);
});

test('grep defaults to the current recursive public cwd and keeps positional scopes explicit', () => {
  const nested = executeGrep(context({ fs: scopedFs, cwd: '/posts/infra' }), args(['marker']));
  assert.deepEqual(nested.value?.kind === 'grep-report' ? nested.value.report.matches.map(({ path }) => path) : [], [
    '/posts/infra/nested/deep-operations.md',
    '/posts/infra/operations.md'
  ]);

  const posts = executeGrep(context({ fs: scopedFs, cwd: '/pages' }), args(['marker', '~/blog/posts']));
  assert.deepEqual(posts.value?.kind === 'grep-report' ? posts.value.report.matches.map(({ path }) => path) : [], [
    '/posts/infra/nested/deep-operations.md',
    '/posts/infra/operations.md',
    '/posts/other/operations.md'
  ]);

  const root = executeGrep(context({ fs: scopedFs, cwd: '/posts/infra' }), args(['marker', '~/blog']));
  assert.deepEqual(root.value?.kind === 'grep-report' ? root.value.report.matches.map(({ path }) => path) : [], [
    '/pages/operations.md',
    '/posts/infra/nested/deep-operations.md',
    '/posts/infra/operations.md',
    '/posts/other/operations.md'
  ]);

  const publicRoot = executeGrep(context({ fs: scopedFs, cwd: '/' }), args(['marker']));
  assert.deepEqual(publicRoot.value?.kind === 'grep-report' ? publicRoot.value.report.matches.map(({ path }) => path) : [], [
    '/pages/operations.md',
    '/posts/infra/nested/deep-operations.md',
    '/posts/infra/operations.md',
    '/posts/other/operations.md'
  ]);
  assert.match(executeGrep(context({ fs: scopedFs, cwd: '/lab' }), args(['marker'])).stderr.lines[0] ?? '', /listed public documents/u);
  assert.deepEqual(executeFind(context({ fs: scopedFs, cwd: '/' }), args(['leaked'])).stdout.lines, ['No matches for "leaked".']);
  assert.match(executeFind(context({ fs: scopedFs, cwd: '/lab' }), args(['marker'])).stderr.lines[0] ?? '', /known public virtual directories/u);
  assert.match(executeGrep(context({ fs: scopedFs, cwd: '/' }), args(['marker', '~/blog/lab/leaked.md'])).stderr.lines[0] ?? '', /listed public documents/u);

  for (const option of ['-h', '--help']) {
    const result = runRshellInput(`grep ${option}`, runnerOptions());
    assert.equal(result.status, 0, option);
    assert.match(result.stdout.lines.join('\n'), /grep a ~\/blog\/posts/u, option);
  }
});

test('find searches visible filenames, filters public paths and dates, and explains itself', () => {
  const alpha = executeFind(context(), args(['ALPHA']));
  assert.deepEqual(alpha.stdout.lines, [
    'Alpha — 2026-05-28 — ~/blog/posts/characters/alpha.md'
  ]);
  assert.deepEqual(alpha.value, {
    kind: 'document-search',
    keyword: 'ALPHA',
    documents: [{
      kind: 'post',
      path: '/posts/characters/alpha.md',
      relativePath: 'characters/alpha.md',
      filename: 'alpha.md',
      title: 'Alpha',
      href: '/posts/characters/alpha/',
      date: '2026-05-28'
    }]
  });
  assert.deepEqual(executeFind(context(), args(['about'])).stdout.lines, [
    'No matches for "about".'
  ]);
  assert.deepEqual(executeFind(context({ cwd: '/' }), args(['about'])).stdout.lines, [
    'About — 2026-02-01 — ~/blog/pages/about.md'
  ]);
  assert.deepEqual(executeFind(context({ cwd: '/' }), args(['about'], { path: 'pages' })).stdout.lines, [
    'About — 2026-02-01 — ~/blog/pages/about.md'
  ]);
  assert.deepEqual(executeFind(context({ cwd: '/' }), args(['alpha'], { path: '~/blog/posts' })).stdout.lines, [
    'Alpha — 2026-05-28 — ~/blog/posts/characters/alpha.md'
  ]);
  assert.deepEqual(executeFind(context({ cwd: '/' }), args(['about'], { path: '~/blog' })).stdout.lines, [
    'About — 2026-02-01 — ~/blog/pages/about.md'
  ]);
  assert.deepEqual(executeFind(context({ cwd: '/posts/infra' }), args(['~/blog/posts', 'alpha'])).stdout.lines, [
    'Alpha — 2026-05-28 — ~/blog/posts/characters/alpha.md'
  ]);
  assert.deepEqual(executeFind(context({ cwd: '/posts/infra' }), args(['~/blog', 'about'])).stdout.lines, [
    'About — 2026-02-01 — ~/blog/pages/about.md'
  ]);
  assert.deepEqual(executeFind(context(), args(['durable'])).stdout.lines, [
    'No matches for "durable".'
  ]);
  assert.deepEqual(executeFind(context(), args(['alpha'], { after: '2026-05-28', before: '2026-05-28' })).stdout.lines, [
    'Alpha — 2026-05-28 — ~/blog/posts/characters/alpha.md'
  ]);
  assert.deepEqual(executeFind(context(), args(['alpha'], { before: '2026-02-01' })).stdout.lines, [
    'No matches for "alpha".'
  ]);
  assert.deepEqual(executeFind(context({ cwd: '/' }), args(['alpha'], { path: 'pages' })).stdout.lines, [
    'No matches for "alpha".'
  ]);
  assert.deepEqual(executeFind(context(), args([], { help: true })).stdout.lines, [
    'Usage: find [--path <directory>] [--after YYYY-MM-DD] [--before YYYY-MM-DD] [path] <keyword>',
    'find public documents by filename substring',
    'Options:',
    '  --path <directory>   search recursively below one public virtual directory.',
    '  --after YYYY-MM-DD   include documents published on or after this date.',
    '  --before YYYY-MM-DD  include documents published on or before this date.',
    'Examples:',
    '  find ~/blog/posts xxxx — search filenames below a public directory',
    '  find --path ~/blog/posts xxxx — search filenames below a public directory'
  ]);

  assert.match(executeFind(context(), args(['~/blog/posts', 'alpha'], { path: '~/blog/pages' })).stderr.lines[0] ?? '', /Usage:/u);

  for (const [operand, message] of [
    ['lab', 'find --path accepts only known public virtual directories.'],
    ['lab/nerv', 'find --path accepts only known public virtual directories.'],
    ['pages/about.md', 'find --path accepts only known public virtual directories.'],
    ['../../pages', 'find --path accepts only known public virtual directories.']
  ] as const) {
    assert.deepEqual(executeFind(context(), args(['about'], { path: operand })).stderr.lines, [message], operand);
  }
  for (const operand of ['~/blog/lab', '../../pages']) {
    assert.deepEqual(executeFind(context(), args([operand, 'about'])).stderr.lines, ['find --path accepts only known public virtual directories.'], operand);
  }
  assert.match(executeFind(context(), args(['alpha'], { after: '2026-02-30' })).stderr.lines[0] ?? '', /Usage:/u);
  assert.match(executeFind(context(), args(['alpha'], { after: '2026-06-01', before: '2026-05-28' })).stderr.lines[0] ?? '', /cannot be later/u);
  assert.match(executeFind(context(), args([])).stderr.lines[0] ?? '', /Usage:/u);
});

test('find and grep neutral runners preserve cwd defaults and explicit path scopes', () => {
  const nestedOptions = runnerOptions({ cwd: '/posts/characters' });
  assert.equal(runRshellInput('find ~/blog/posts alpha', nestedOptions).status, 0);
  assert.deepEqual(runRshellInput('find ~/blog/posts alpha', nestedOptions).stdout.lines, [
    'Alpha — 2026-05-28 — ~/blog/posts/characters/alpha.md'
  ]);
  assert.deepEqual(runRshellInput('find --path ~/blog/posts alpha', nestedOptions).stdout.lines, [
    'Alpha — 2026-05-28 — ~/blog/posts/characters/alpha.md'
  ]);
  assert.match(runRshellInput('find --path ~/blog/pages ~/blog/posts alpha', nestedOptions).stderr.lines[0] ?? '', /Usage:/u);
  assert.match(runRshellInput('grep -h', nestedOptions).stdout.lines.join('\n'), /grep a ~\/blog\/posts/u);
  assert.match(runRshellInput('grep --help', nestedOptions).stdout.lines.join('\n'), /grep a ~\/blog\/posts/u);
});

test('relative commands resolve the virtual root without a double slash', () => {
  const root = runRshellInput('ls', runnerOptions({ cwd: '/' }));
  assert.equal(root.status, 0);
  assert.deepEqual(root.stdout.lines, ['lab/', 'pages/', 'posts/']);
  assert.deepEqual(runRshellInput('ls .', runnerOptions({ cwd: '/' })).stdout.lines, root.stdout.lines);
});

test('root resource mounts resolve for reads, search, and navigation without changing nested fallback', () => {
  const root = context({ cwd: '/' });
  for (const operand of ['pages/about.md', './pages/about.md']) {
    const page = executeCat(root, args([operand]));
    assert.equal(page.value?.kind, 'document', operand);
    assert.equal(page.value?.kind === 'document' ? page.value.document.path : undefined, '/pages/about.md', operand);
  }

  for (const operand of ['posts/characters/alpha.md', './posts/characters/alpha.md']) {
    const post = executeCat(root, args([operand]));
    assert.equal(post.value?.kind, 'document', operand);
    assert.equal(post.value?.kind === 'document' ? post.value.document.path : undefined, '/posts/characters/alpha.md', operand);
  }

  const barePost = executeCat(root, args(['characters/alpha.md']));
  assert.equal(barePost.value?.kind, 'document');
  assert.equal(barePost.value?.kind === 'document' ? barePost.value.document.path : undefined, '/posts/characters/alpha.md');

  for (const operand of ['pages/about.md', './pages/about.md']) {
    const grep = executeGrep(root, args(['About', operand]));
    assert.deepEqual(grep.stdout.lines, ['~/blog/pages/about.md:About page'], operand);
    const wholeWordGrep = executeGrep(root, args(['about', operand], { 'ignore-case': true, 'word-regexp': true }));
    assert.deepEqual(wholeWordGrep.value?.kind === 'grep-report' ? wholeWordGrep.value.report.matches[0]?.ranges : [], [[0, 5]], operand);
    assert.deepEqual(executeVim(root, args([operand])).controls, [{ kind: 'open-document', path: '/pages/about.md' }], operand);
  }
  const postGrep = executeGrep(root, args(['Alpha', './posts/characters/alpha.md']));
  assert.deepEqual(postGrep.stdout.lines, ['~/blog/posts/characters/alpha.md:Alpha record']);
  assert.deepEqual(executeVim(root, args(['./posts/characters/alpha.md'])).controls, [{ kind: 'open-document', path: '/posts/characters/alpha.md' }]);

  for (const operand of ['lab/nerv', './lab/nerv']) {
    const experiment = executeCat(root, args([operand]));
    assert.deepEqual(experiment.stderr.lines, [`Cannot read rshell experiment "${operand}" as a document. Try "open ${operand}".`], operand);
  }
  const directory = executeCat(root, args(['pages']));
  assert.deepEqual(directory.stderr.lines, ['Cannot read rshell directory "pages" as a document. Try "ls pages".']);

  const nestedPage = executeCat(context(), args(['pages/about.md']));
  assert.match(nestedPage.stderr.lines[0] ?? '', /No readable rshell resource named "pages\/about\.md"/u);
  for (const operand of ['../pages/about.md', './pages/../posts/characters/alpha.md']) {
    const traversal = executeCat(root, args([operand]));
    assert.match(traversal.stderr.lines[0] ?? '', /No readable rshell resource named/u, operand);
  }
});

test('neutral commands exchange streams and values without terminal effects', () => {
  const listing = executeLs(context(), args());
  assert.equal(listing.status, 0);
  assert.equal(listing.value?.kind, 'directory-listing');
  assert.deepEqual(listing.stdout.lines, ['characters/']);

  const document = executeCat(context(), args(['characters/alpha.md']));
  assert.equal(document.value?.kind, 'document');
  assert.deepEqual(document.stdout.lines, ['Alpha record', 'nahida keeps the archive']);

  const changed = executeCd(context(), args(['characters']));
  assert.deepEqual(changed.statePatch, { kind: 'cwd', cwd: '/posts/characters' });

  const piped = executeCat(context({ stdin: textStream(['piped line']) }), args());
  assert.deepEqual(piped.stdout.lines, ['piped line']);
});

test('grep and navigation use independent value/control channels', () => {
  const nested = executeGrep(context(), args(['nahida'], { 'line-number': true }));
  assert.deepEqual(nested.stdout.lines, ['~/blog/posts/characters/alpha.md:2:nahida keeps the archive']);
  const report = executeGrep(context({ stdin: textStream(['nahida keeps the archive']) }), args(['nahida'], { 'line-number': true }));
  assert.equal(report.value?.kind, 'grep-report');
  assert.deepEqual(report.stdout.lines, ['1:nahida keeps the archive']);
  assert.deepEqual(executeOpen(context({ cwd: '/' }), args(['lab/nerv'])).controls, [{ kind: 'open-experiment', id: 'nerv' }]);
  assert.deepEqual(executeOpen(context({ cwd: '/lab' }), args(['nerv'])).controls, [{ kind: 'open-experiment', id: 'nerv' }]);
  assert.deepEqual(executeOpen(context({ cwd: '/lab' }), args(['./nerv'])).controls, [{ kind: 'open-experiment', id: 'nerv' }]);
  assert.deepEqual(executeOpen(context({ cwd: '/lab' }), args(['~/blog/lab/nerv'])).controls, [{ kind: 'open-experiment', id: 'nerv' }]);
  assert.equal(executeOpen(context({ cwd: '/lab' }), args(['lab/nerv'])).status, 1);
  assert.equal(executeOpen(context({ cwd: '/lab' }), args(['/lab/nerv'])).status, 1);
  assert.deepEqual(executeVim(context(), args(['~/blog/pages/about.md'])).controls, [{ kind: 'open-document', path: '/pages/about.md' }]);
});

test('named grep locations are directly reusable with cat while stdin stays line-oriented', () => {
  const named = runRshellInput('grep -F "Alpha record"', runnerOptions());
  assert.deepEqual(named.stdout.lines, ['~/blog/posts/characters/alpha.md:Alpha record']);
  const namedMatch = named.stdout.lines[0];
  assert.ok(namedMatch);
  const [displayedPath] = namedMatch.split(':', 1);
  assert.equal(displayedPath, '~/blog/posts/characters/alpha.md');
  assert.deepEqual(runRshellInput(`cat ${displayedPath}`, runnerOptions()).stdout.lines, [
    'Alpha record',
    'nahida keeps the archive'
  ]);

  const stdin = executeGrep(context({ stdin: textStream(['Alpha record']) }), args(['Alpha'], { 'line-number': true }));
  assert.deepEqual(stdin.stdout.lines, ['1:Alpha record']);
  assert.deepEqual(stdin.value?.kind === 'grep-report' ? stdin.value.report.matches.map(({ path }) => path) : [], ['-']);
});

test('neutral runner wires stdout only and keeps final values and controls separate', () => {
  const piped = runRshellInput('cat characters/alpha.md | grep -nF nahida', runnerOptions());
  assert.equal(piped.status, 0);
  assert.deepEqual(piped.stderr.lines, []);
  assert.deepEqual(piped.stdout.lines, ['2:nahida keeps the archive']);
  assert.equal(piped.value?.kind, 'grep-report');

  const findPiped = runRshellInput('find alpha | cat', runnerOptions());
  assert.equal(findPiped.status, 0);
  assert.deepEqual(findPiped.stdout.lines, ['Alpha — 2026-05-28 — ~/blog/posts/characters/alpha.md']);

  const opened = runRshellInput('open ~/blog/lab/nerv', runnerOptions());
  assert.deepEqual(opened.controls, [{ kind: 'open-experiment', id: 'nerv' }]);
  assert.deepEqual(opened.stdout.lines, []);

  const standalone = runRshellInput('cd characters | cat', runnerOptions());
  assert.equal(standalone.status, 1);
  assert.deepEqual(standalone.stderr.lines, ['"cd" is a standalone command and cannot be piped.']);
});

test('neutral friends preserves descriptions for direct and text projections', () => {
  const direct = runRshellInput('friends', runnerOptions());
  assert.deepEqual(direct.stdout.lines, [
    'Example — A useful example site. — https://example.test/blog',
    'Docs — http://docs.example.test/?from=site'
  ]);
  assert.deepEqual(direct.value, {
    kind: 'links',
    links: [
      { name: 'Example', desc: 'A useful example site.', url: 'https://example.test/blog' },
      { name: 'Docs', url: 'http://docs.example.test/?from=site' }
    ]
  });
  const piped = runRshellInput('friends | grep useful', runnerOptions());
  assert.deepEqual(piped.stdout.lines, ['Example — A useful example site. — https://example.test/blog']);
  assert.equal(piped.value?.kind, 'grep-report');
});

test('neutral runner applies state patches and bounded scratch redirects', () => {
  const changed = runRshellInput('cd characters', runnerOptions());
  assert.deepEqual(changed.statePatch, { kind: 'cwd', cwd: '/posts/characters' });

  const written = runRshellInput('ls --help > ~/blog/.rshell/tmp/help', runnerOptions());
  assert.equal(written.status, 0);
  assert.deepEqual(written.stdout.lines, []);
  assert.deepEqual(written.statePatch?.kind, 'session');
  if (written.statePatch?.kind !== 'session') return;
  assert.deepEqual(written.statePatch.session.scratch, [{
    name: 'help',
    lines: [
      'Usage: ls [path|pattern]',
      'list a public or session virtual directory',
      'Options: -h, --help; * matches known public names.'
    ]
  }]);

  const findRedirect = runRshellInput(
    'find alpha > ~/blog/.rshell/tmp/find',
    runnerOptions({ session: written.statePatch.session })
  );
  assert.equal(findRedirect.status, 0);
  assert.deepEqual(findRedirect.stdout.lines, []);
  assert.deepEqual(
    findRedirect.statePatch?.kind === 'session'
      ? findRedirect.statePatch.session.scratch.find(({ name }) => name === 'find')
      : undefined,
    {
      name: 'find',
      lines: ['Alpha — 2026-05-28 — ~/blog/posts/characters/alpha.md']
    }
  );

  if (findRedirect.statePatch?.kind !== 'session') return;
  const session = findRedirect.statePatch.session;
  const scratchFs = createPublicIndex({
    documents: [
      { kind: 'post', path: '/posts/characters/alpha.md', relativePath: 'characters/alpha.md', filename: 'alpha.md', title: 'Alpha', href: '/posts/characters/alpha/', date: '2026-05-28' },
      { kind: 'page', path: '/pages/about.md', relativePath: 'about.md', filename: 'about.md', title: 'About', href: '/pages/about/', date: '2026-02-01' }
    ],
    experiments: [{ id: 'nerv', title: 'NERV', href: '/lab/nerv/' }],
    textDocuments: [{ path: '/posts/characters/alpha.md', lines: ['Alpha record', 'nahida keeps the archive'] }],
    scratch: session.scratch
  });
  const scratchGrep = runRshellInput(
    'grep -F Alpha ~/blog/.rshell/tmp/find | cat',
    runnerOptions({ fs: scratchFs, session })
  );
  assert.deepEqual(scratchGrep.stdout.lines, [
    '~/blog/.rshell/tmp/find:Alpha — 2026-05-28 — ~/blog/posts/characters/alpha.md'
  ]);
  const read = runRshellInput('cat ~/blog/.rshell/tmp/help', runnerOptions({ fs: scratchFs, session }));
  assert.equal(read.status, 0);
  assert.deepEqual(read.stdout.lines, session.scratch.find(({ name }) => name === 'help')?.lines);
});

test('neutral session commands consume injected identity, command metadata, and VFS', () => {
  const help = runRshellInput('help', runnerOptions());
  assert.equal(help.status, 0);
  assert.equal(help.value?.kind, 'help');
  assert.equal(help.stdout.lines[0], 'Explore');
  assert.ok(help.stdout.lines.some((line) => line.includes('help [command] (?)')));

  const tree = runRshellInput('tree ~/blog', runnerOptions());
  assert.equal(tree.status, 0);
  assert.deepEqual(tree.stdout.lines, [
    '~/blog',
    '├── lab/',
    '│   └── nerv/',
    '├── pages/',
    '│   └── About',
    '└── posts/',
    '    └── characters/',
    '        └── Alpha'
  ]);

  assert.deepEqual(runRshellInput('pwd', runnerOptions()).stdout.lines, ['~/blog/posts']);
  assert.deepEqual(runRshellInput('whoami', runnerOptions()).stdout.lines, ['guest']);
  assert.deepEqual(runRshellInput('id', runnerOptions()).stdout.lines[0], 'uid=guest gid=guest groups=public-read');
  assert.deepEqual(runRshellInput('history', runnerOptions({ session: { history: ['ls'], scratch: [] } })).stdout.lines, ['1  ls']);
  assert.ok(runRshellInput('alias ?', runnerOptions()).stdout.lines.includes('?=help'));
  const alias = runRshellInput('alias la=ls', runnerOptions());
  assert.equal(alias.status, 0);
  assert.deepEqual(alias.stdout.lines, ['la=ls']);
  assert.deepEqual(alias.statePatch?.kind === 'session' ? alias.statePatch.session.aliases : undefined, [{ name: 'la', target: 'ls' }]);
  assert.equal(runRshellInput('la', runnerOptions({ session: { history: [], scratch: [], aliases: [{ name: 'la', target: 'ls' }] } })).status, 0);
});

test('neutral Help enumerates descriptor-owned examples from custom registries', () => {
  const example = { command: 'hello', description: 'say hello' };
  Object.defineProperties(example, {
    command: { value: 'hello', enumerable: false },
    description: { value: 'say hello', enumerable: false }
  });
  const registry = createCommandSpecRegistry([
    ...NEUTRAL_COMMAND_REGISTRY.definitions,
    {
      ...GREP_COMMAND_SPEC,
      name: 'hello',
      aliases: Object.freeze(['hi']),
      usage: 'hello',
      summary: 'print a greeting',
      examples: [example]
    }
  ]);
  const result = runRshellInput('help hi', runnerOptions({ registry }));
  assert.equal(result.status, 0);
  assert.deepEqual(result.value?.kind === 'help' ? result.value.detail : undefined, {
    name: 'hello',
    aliases: ['hi'],
    summary: 'print a greeting',
    usage: 'hello',
    examples: [{ command: 'hello', description: 'say hello' }]
  });
  assert.deepEqual(result.stdout.lines, [
    'Usage: hello',
    'print a greeting',
    'Aliases: hi',
    'Examples:',
    '  hello — say hello'
  ]);
});
