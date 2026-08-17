import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { Root as HastRoot } from 'hast';
import type { DocumentContext, NormalizedDocumentInput } from '@f1refly/x-core';
import { terminalPresentation } from '../src/index.js';
import {
  DEFAULT_TERMINAL_IDENTITY,
  DEFAULT_TERMINAL_COMMAND_REGISTRY,
  DEFAULT_TERMINAL_PROMPT,
  cancelCommandInput,
  completeCommand,
  createTerminalCommandRegistry,
  createTerminalState,
  decodeTerminalEntries,
  decodeTerminalExperiments,
  executeCommand,
  formatDocumentOperand,
  navigateHistory,
  tokenizeCommand,
  type TerminalEntry,
  type TerminalTextDocument
} from '../src/runtime.js';

const context: DocumentContext = {
  documentId: 'posts/example.md',
  route: '/posts/example/',
  collection: 'posts',
  slug: 'example',
  layout: 'post',
  presentation: 'terminal'
};

const rawEntries = [
  { kind: 'post', virtualPath: 'posts/characters/alpha.md', relativePath: 'characters/alpha.md', filename: 'alpha.md', title: 'Alpha', href: '/posts/characters/alpha/', date: '2026-05-28' },
  { kind: 'page', virtualPath: 'pages/about.md', relativePath: 'about.md', filename: 'about.md', title: 'About', href: '/pages/about/', date: '2026-02-01' }
] as const;
const entries = decodeTerminalEntries(rawEntries);
const experiments = decodeTerminalExperiments([
  { id: 'nerv', title: 'NERV', href: '/lab/nerv/' },
  { id: 'quiet-lab', title: 'Quiet Lab', href: '/lab/quiet-lab/' }
]);

test('default prompt stays derived from the default identity', () => {
  assert.equal(DEFAULT_TERMINAL_PROMPT, 'guest@f1refly:~/blog/posts $');
});

function input(tree: HastRoot): NormalizedDocumentInput {
  return { context, summary: '', references: [], tree };
}

function run(command: string, state = createTerminalState()) {
  return executeCommand({
    state,
    input: command,
    entries,
    experiments,
    identity: DEFAULT_TERMINAL_IDENTITY,
    now: () => new Date('2026-08-12T04:05:06.000Z')
  });
}

const documents: readonly TerminalTextDocument[] = Object.freeze([
  Object.freeze({ virtualPath: 'posts/characters/alpha.md', lines: Object.freeze(['Alpha record', 'nahida keeps the archive']) }),
  Object.freeze({ virtualPath: 'pages/about.md', lines: Object.freeze(['About this garden', 'durable writing']) })
]);

function runShell(command: string, state = createTerminalState()) {
  return executeCommand({
    state,
    input: command,
    entries,
    experiments,
    documents,
    identity: DEFAULT_TERMINAL_IDENTITY,
    now: () => new Date('2026-08-12T04:05:06.000Z')
  });
}

test('terminal adapter supports posts/pages and preserves input identities immutably', () => {
  assert.equal(terminalPresentation.supports(context), true);
  assert.equal(terminalPresentation.supports({ ...context, collection: 'pages', layout: 'page' }), true);
  assert.equal(terminalPresentation.supports({ ...context, layout: 'timeline' }), false);
  const tree: HastRoot = {
    type: 'root',
    children: [{
      type: 'element',
      tagName: 'section',
      properties: { dataNodeId: 'section-1' },
      children: [{
        type: 'element',
        tagName: 'pre',
        properties: { dataNodeId: 'pre-1' },
        children: [{ type: 'text', value: 'wide' }]
      }]
    }, {
      type: 'element',
      tagName: 'table',
      properties: { dataNodeId: 'table-1' },
      children: []
    }]
  };
  const snapshot = structuredClone(tree);
  const first = terminalPresentation.transform(input(tree));
  const second = terminalPresentation.transform(input(tree));
  assert.deepEqual(tree, snapshot);
  assert.deepEqual(first, second);
  assert.equal(first.children[0]?.type === 'element' && first.children[0].children[0]?.type === 'element' && first.children[0].children[0].properties.dataTerminalWide, 'code');
  assert.equal(first.children[1]?.type === 'element' && first.children[1].properties.dataTerminalWide, 'table');
  assert.match(JSON.stringify(first), /section-1/u);
  assert.match(JSON.stringify(first), /pre-1/u);
  assert.match(JSON.stringify(first), /table-1/u);
  assert.deepEqual(terminalPresentation.enhancements(input(first)), []);
});

test('strict index decoder clones valid entries and rejects malformed structures without invoking accessors', () => {
  const decoded = decodeTerminalEntries(rawEntries);
  assert.deepEqual(decoded, rawEntries);
  assert.notEqual(decoded, rawEntries);
  assert.equal(Object.isFrozen(decoded), true);
  assert.equal(Object.isFrozen(decoded[0]), true);

  const invalid: unknown[] = [
    { ...rawEntries[0], extra: 'no' },
    { ...rawEntries[0], virtualPath: 'posts/../alpha.md' },
    { ...rawEntries[0], virtualPath: 'posts/.private.md', relativePath: '.private.md', filename: '.private.md', href: '/posts/.private/' },
    { ...rawEntries[0], virtualPath: 'posts/%2e%2e/alpha.md', relativePath: '%2e%2e/alpha.md', href: '/posts/%2e%2e/alpha/' },
    { ...rawEntries[0], filename: 'other.md' },
    { ...rawEntries[0], href: 'https://example.com/' },
    { ...rawEntries[0], date: '2026-02-30' },
    Object.assign(Object.create({}), rawEntries[0])
  ];
  for (const item of invalid) {
    assert.throws(() => decodeTerminalEntries([item]));
  }
  assert.throws(() => decodeTerminalEntries([rawEntries[0], rawEntries[0]]), /duplicate/u);
  assert.throws(() => decodeTerminalEntries([
    { ...rawEntries[0], virtualPath: 'posts/Stra\u00dfe.md', relativePath: 'Stra\u00dfe.md', filename: 'Stra\u00dfe.md', href: '/posts/Stra\u00dfe/' },
    { ...rawEntries[0], virtualPath: 'posts/STRASSE.md', relativePath: 'STRASSE.md', filename: 'STRASSE.md', href: '/posts/STRASSE/' }
  ]), /duplicate/u);
  const sparse = new Array(1);
  assert.throws(() => decodeTerminalEntries(sparse), /dense/u);
  let invoked = false;
  const accessor = Object.defineProperty({}, 'kind', { get() { invoked = true; return 'post'; } });
  assert.throws(() => decodeTerminalEntries([accessor]), /data properties/u);
  assert.equal(invoked, false);

  const decorated = [rawEntries[0]];
  Object.defineProperty(decorated, 'map', {
    value: () => {
      invoked = true;
      return [];
    }
  });
  assert.throws(() => decodeTerminalEntries(decorated), /unexpected properties/u);
  assert.equal(invoked, false);
});

test('strict experiment decoder clones exact canonical listed destinations', () => {
  assert.equal(Object.isFrozen(experiments), true);
  assert.equal(Object.isFrozen(experiments[0]), true);
  assert.throws(() => decodeTerminalExperiments([{ id: 'nerv', title: 'NERV', href: '/lab/other/' }]), /canonical/u);
  assert.throws(() => decodeTerminalExperiments([{ id: 'nerv', title: 'NERV', href: '/lab/nerv/', extra: true }]), /unknown/u);
  assert.throws(() => decodeTerminalExperiments([
    { id: 'nerv', title: 'NERV', href: '/lab/nerv/' },
    { id: 'nerv', title: 'Again', href: '/lab/nerv/' }
  ]), /duplicate/u);
  const sparse = new Array(1);
  assert.throws(() => decodeTerminalExperiments(sparse), /dense/u);
  let invoked = false;
  const accessor = Object.defineProperty({}, 'id', {
    get() { invoked = true; return 'nerv'; }
  });
  assert.throws(() => decodeTerminalExperiments([accessor]), /data properties/u);
  assert.equal(invoked, false);
});

test('runtime subpath stays side-effect-free and independent from adapter dependencies', async () => {
  const runtime = await readFile(new URL('../src/runtime.js', import.meta.url), 'utf8');
  const declarations = await readFile(new URL('../src/runtime.d.ts', import.meta.url), 'utf8');
  const graph = `${runtime}\n${declarations}`;

  assert.doesNotMatch(graph, /@f1refly\/x-core|\b(?:hast|astro)\b|\.\/index\.js|apps\/site/u);
});

test('tokenizer accepts balanced quotes and rejects unbalanced input without shell interpretation', () => {
  assert.deepEqual(tokenizeCommand(`cat 'alpha.md'`), { ok: true, tokens: ['cat', 'alpha.md'] });
  assert.deepEqual(tokenizeCommand('about ""'), { ok: true, tokens: ['about', ''] });
  assert.deepEqual(tokenizeCommand('cat $(whoami)'), { ok: true, tokens: ['cat', '$(whoami)'] });
  assert.equal(tokenizeCommand(`cat 'alpha.md`).ok, false);
});

test('every command has deterministic output and strict usage errors', () => {
  const helpEffect = run('help').effect;
  assert.equal(helpEffect?.kind, 'help');
  const help = JSON.stringify(helpEffect);
  assert.deepEqual(
    helpEffect?.kind === 'help' ? helpEffect.groups.map(({ name }) => name) : [],
    ['Explore', 'Read & navigate', 'Identity & time', 'Session']
  );
  assert.match(help, /cat \[path\]/u);
  assert.match(help, /render a document or stream text/u);
  assert.match(help, /vim <path>/u);
  assert.match(help, /tree \[path\]/u);
  assert.match(help, /clear/u);
  assert.match(help, /clear the screen/u);
  assert.match(help, /cls/u);
  assert.doesNotMatch(help, /dynamic transcript/u);
  assert.match(help, /ls \[path\|pattern\]/u);
  assert.match(help, /open lab\/<id>/u);
  assert.equal(run('ls').effect?.kind, 'entries');
  const posts = run('ls posts').effect;
  const pages = run('ls pages').effect;
  assert.deepEqual(posts?.kind === 'entries' ? posts.entries : [], []);
  assert.deepEqual(pages?.kind === 'entries' ? pages.entries : [], [entries[1]]);
  assert.deepEqual(run('ls /').effect, {
    kind: 'lines',
    tone: 'normal',
    lines: ['lab/', 'pages/', 'posts/']
  });
  const charactersState = run('cd characters').state;
  assert.equal(charactersState.cwd, '~/blog/posts/characters');
  assert.deepEqual(run('ls', charactersState).effect, {
    kind: 'entries',
    directories: [],
    entries: [entries[0]],
    label: 'posts',
    directory: '/posts/characters'
  });
  const workspaceState = run('cd ../', run('cd /posts').state).state;
  assert.equal(workspaceState.cwd, '~/blog');
  assert.deepEqual(run('ls', workspaceState).effect, run('ls /').effect);
  assert.equal(formatDocumentOperand(entries[0]!), 'characters/alpha.md');
  assert.equal(formatDocumentOperand(entries[1]!), '/pages/about.md');
  const document = run('cat characters/alpha.md');
  assert.equal(document.effect?.kind, 'document');
  assert.deepEqual(document.effect?.kind === 'document' ? document.effect.entry : null, entries[0]);
  assert.equal(document.announcement, 'Rendered Alpha.');
  const relativeDocument = run('cat ./characters/alpha.md');
  assert.equal(relativeDocument.effect?.kind, 'document');
  assert.deepEqual(
    relativeDocument.effect?.kind === 'document' ? relativeDocument.effect.entry : null,
    entries[0]
  );
  assert.equal(run('cat alpha.md', charactersState).effect?.kind, 'document');
  assert.match(JSON.stringify(run('cat missing.md').effect), /No readable rshell resource/u);
  assert.match(JSON.stringify(run('vim missing.md').effect), /Relative paths resolve under posts/u);
  assert.match(JSON.stringify(run('cat ./pages/about.md').effect), /No readable rshell resource/u);
  assert.equal(run('cat /posts/characters/alpha.md').effect?.kind, 'document');
  assert.equal(run('cat /pages/about.md').effect?.kind, 'document');
  assert.equal(run('vim ./characters/alpha.md').effect?.kind, 'document-navigation');
  const postsTree = run('tree').effect;
  assert.deepEqual(postsTree, {
    kind: 'tree',
    root: '~/blog/posts',
    lines: ['└── characters/', '    └── alpha.md']
  });
  const fullTree = run('tree /').effect;
  assert.deepEqual(fullTree, {
    kind: 'tree',
    root: '~/blog',
    lines: [
      '├── lab/',
      '│   ├── nerv/',
      '│   └── quiet-lab/',
      '├── pages/',
      '│   └── about.md',
      '└── posts/',
      '    └── characters/',
      '        └── alpha.md'
    ]
  });
  for (const operand of ['../alpha.md', './nested/../alpha.md', '/alpha.md', 'https://example.com/alpha.md', '/etc/passwd', 'characters\\alpha.md']) {
    assert.match(JSON.stringify(run(`cat ${operand}`).effect), /No readable rshell resource/u, operand);
  }
  assert.match(JSON.stringify(run('about').effect), /static garden/u);
  assert.match(JSON.stringify(run('pwd').effect), /~\/blog\/posts/u);
  assert.match(JSON.stringify(run('whoami').effect), /guest/u);
  assert.match(JSON.stringify(run('date').effect), /2026-08-12 04:05:06 UTC/u);
  assert.match(JSON.stringify(run('history').effect), /1  history/u);
  assert.equal(run('clear').effect?.kind, 'clear');
  assert.equal(run('cls').effect?.kind, 'clear');
  assert.equal(run('l').effect?.kind, 'entries');
  assert.equal(run('ll').effect?.kind, 'entries');
  assert.match(JSON.stringify(run('alias').effect), /l=ls/u);
  assert.match(JSON.stringify(run('alias').effect), /ll=ls/u);
  assert.match(JSON.stringify(run('alias').effect), /cls=clear/u);
  assert.deepEqual(run('alias l').effect, { kind: 'lines', tone: 'normal', lines: ['l=ls'] });
  const aliasState = run('alias la=ls').state;
  assert.deepEqual(aliasState.aliases, [{ name: 'la', target: 'ls' }]);
  assert.deepEqual(run('alias la', aliasState).effect, { kind: 'lines', tone: 'normal', lines: ['la=ls'] });
  assert.match(JSON.stringify(run('help', aliasState).effect), /la/u);
  assert.equal(run('la', aliasState).effect?.kind, 'entries');
  assert.match(JSON.stringify(run('la').effect), /Unknown command: la/u);
  assert.equal(run('alias la=cat').state.aliases[0]?.target, 'cat');
  assert.deepEqual(run('ls cha').effect, {
    kind: 'lines',
    tone: 'error',
    lines: ['No rshell directory named "cha". Did you mean "characters/"? Press Tab to complete.']
  });
  for (const pattern of ['cha*', '*cha*']) {
    assert.deepEqual(run(`ls ${pattern}`).effect, {
      kind: 'entries',
      directories: [],
      entries: [entries[0]],
      label: 'posts',
      directory: '/posts/characters'
    }, pattern);
  }
  for (const option of ['-h', '--help']) {
    assert.deepEqual(run(`ls ${option}`).effect, {
      kind: 'lines',
      tone: 'normal',
      lines: [
        'Usage: ls [path|pattern]',
        'list a public or session virtual directory',
        'Options: -h, --help; * matches known public names.'
      ]
    }, option);
  }
  for (const command of ['help extra', 'ls posts extra', 'ls lab extra', 'cat', 'cat alpha.md extra', 'vim', 'tree /private', 'open', 'open other', 'open lab/nerv extra', 'about extra', 'pwd extra', 'whoami extra', 'date extra', 'history extra', 'clear extra']) {
    assert.match(JSON.stringify(run(command).effect), /Usage:/u, command);
  }
  assert.match(JSON.stringify(run('wat').effect), /Unknown command: wat/u);
  const lab = run('ls lab');
  assert.equal(lab.effect?.kind, 'experiments');
  assert.deepEqual(lab.effect?.kind === 'experiments' ? lab.effect.experiments : [], experiments);
  assert.equal(lab.announcement, '2 experiments listed.');
  assert.deepEqual(run('ls lab/').effect, lab.effect);
  assert.deepEqual(run('ls /lab/').effect, lab.effect);
  assert.deepEqual(run('ls characters/').effect, run('ls characters').effect);
  assert.deepEqual(run('ls /pages/about.md').effect, {
    kind: 'entries',
    directories: [],
    entries: [entries[1]],
    label: 'pages',
    directory: '/pages'
  });
  assert.deepEqual(run('ls /posts/characters/alpha.md').effect, {
    kind: 'entries',
    directories: [],
    entries: [entries[0]],
    label: 'posts',
    directory: '/posts/characters'
  });
  for (const operand of ['h', 'llm']) {
    assert.deepEqual(run(`ls ${operand}`).effect, {
      kind: 'lines',
      tone: 'error',
      lines: [`No rshell directory named "${operand}". Try "ls --help".`]
    }, operand);
  }
  assert.deepEqual(run('ls h?').effect, {
    kind: 'lines',
    tone: 'error',
    lines: ['ls accepts only safe rshell virtual paths or * directory patterns.']
  });
  for (const pattern of ['h*', 'l*']) {
    assert.deepEqual(run(`ls ${pattern}`).effect, {
      kind: 'lines',
      tone: 'error',
      lines: [`No rshell path matches "${pattern}". Try "ls --help".`]
    }, pattern);
  }
  for (const operand of ['/lab/nerv', '/lab/nerv/']) {
    assert.deepEqual(run(`ls ${operand}`).effect, {
      kind: 'lines',
      tone: 'normal',
      lines: ['nerv/ — NERV', 'Use "open lab/nerv" to enter this experiment.']
    }, operand);
  }
  const navigation = run('open lab/nerv');
  assert.equal(navigation.effect?.kind, 'navigation');
  assert.deepEqual(navigation.effect?.kind === 'navigation' ? navigation.effect.experiment : null, experiments[0]);
  assert.equal(navigation.announcement, 'Opening NERV.');
  assert.match(JSON.stringify(run('open lab/unlisted').effect), /No listed experiment/u);
});

test('history keeps 50 submissions and Arrow navigation preserves the draft', () => {
  let state = createTerminalState();
  for (let index = 0; index < 55; index += 1) {
    state = run(`unknown-${index}`, state).state;
  }
  assert.equal(state.history.length, 50);
  assert.equal(state.history[0], 'unknown-5');
  let navigation = navigateHistory(state, 'up', 'unfinished');
  assert.equal(navigation.input, 'unknown-54');
  navigation = navigateHistory(navigation.state, 'up', navigation.input);
  assert.equal(navigation.input, 'unknown-53');
  navigation = navigateHistory(navigation.state, 'down', navigation.input);
  assert.equal(navigation.input, 'unknown-54');
  assert.equal(navigation.state.historyCursor, 49);
  const cancelled = cancelCommandInput(navigation.state);
  assert.deepEqual(cancelled.history, navigation.state.history);
  assert.equal(cancelled.historyCursor, null);
  assert.equal(cancelled.draftInput, '');
  assert.equal(Object.isFrozen(cancelled), true);
  const afterCancel = navigateHistory(cancelled, 'down', '');
  assert.equal(afterCancel.input, '');
  assert.equal(afterCancel.state.historyCursor, null);
});

test('rshell keeps virtual state, bounded text pipes, substitutions, scratch, and regex resources isolated', () => {
  let state = createTerminalState();
  assert.deepEqual(runShell('grep -i nahida', state).effect, runShell('grep nahida -i', state).effect);
  assert.match(JSON.stringify(runShell('?').effect), /grep \[-inF\]/u);
  let result = runShell('cd /pages', state);
  state = result.state;
  assert.equal(state.cwd, '~/blog/pages');
  assert.match(JSON.stringify(runShell('pwd', state).effect), /~\/blog\/pages/u);
  assert.equal(runShell('cat about.md', state).effect?.kind, 'document');

  result = runShell("cat /posts/characters/alpha.md | grep -in 'nahida|furina'", state);
  assert.deepEqual(result.effect, {
    kind: 'grep',
    pattern: 'nahida|furina',
    matches: [{ path: '-', lineNumber: 2, line: 'nahida keeps the archive', ranges: [[0, 6]] }],
    noResults: false,
    truncated: false
  });
  assert.deepEqual(runShell("cat /posts/characters/alpha.md | grep -in 'nahida|furina' | cat", state).effect, {
    kind: 'lines',
    tone: 'normal',
    lines: ['2:nahida keeps the archive']
  });

  result = runShell('whoami > /.rshell/tmp/identity.txt', state);
  state = result.state;
  assert.match(JSON.stringify(result.effect), /Wrote 1 line/u);
  result = runShell('date >> /.rshell/tmp/identity.txt', state);
  state = result.state;
  assert.match(JSON.stringify(result.effect), /Wrote 2 lines/u);
  assert.deepEqual(runShell('cat /.rshell/tmp/identity.txt', state).effect, { kind: 'lines', tone: 'normal', lines: ['guest', '2026-08-12 04:05:06 UTC'] });
  assert.deepEqual(runShell('grep -F guest /.rshell/tmp/identity.txt', state).effect, {
    kind: 'grep',
    pattern: 'guest',
    matches: [{ path: '/.rshell/tmp/identity.txt', line: 'guest', ranges: [[0, 5]] }],
    noResults: false,
    truncated: false
  });
  assert.deepEqual(runShell('grep $(whoami) /.rshell/tmp/identity.txt', state).effect, {
    kind: 'grep',
    pattern: 'guest',
    matches: [{ path: '/.rshell/tmp/identity.txt', line: 'guest', ranges: [[0, 5]] }],
    noResults: false,
    truncated: false
  });
  assert.match(JSON.stringify(runShell("cat '$(whoami)'", state).effect), /\$\(whoami\)/u);

  assert.deepEqual(runShell('echo $(whoami)', state).effect, { kind: 'lines', tone: 'error', lines: ['Unknown command: echo. Type "help" for commands.'] });
  assert.match(JSON.stringify(runShell('grep $(cd /) /.rshell/tmp/identity.txt', state).effect), /Command substitution did not produce text/u);
  assert.match(JSON.stringify(runShell('cd / | grep blog', state).effect), /standalone command/u);
  const noWrite = runShell('whoami > /not-scratch', state);
  assert.equal(noWrite.state.scratch.length, state.scratch.length);
  assert.match(JSON.stringify(runShell('grep secret /etc/passwd', state).effect), /only listed public documents/u);
  assert.match(JSON.stringify(runShell('grep "(?=x)" /posts', state).effect), /safe regular-language subset/u);
  assert.match(JSON.stringify(runShell('grep "\\1" /posts', state).effect), /safe regular-language subset/u);
  assert.match(JSON.stringify(runShell('grep "a{65}" /posts', state).effect), /safe regular-language subset/u);

  const oversized: readonly TerminalTextDocument[] = Object.freeze([
    Object.freeze({ virtualPath: 'posts/characters/alpha.md', lines: Object.freeze(Array.from({ length: 300 }, (_value, index) => `line-${index}`)) })
  ]);
  assert.match(JSON.stringify(executeCommand({ state: createTerminalState(), input: 'cat characters/alpha.md | cat', entries, documents: oversized }).effect), /output truncated/u);
});

test('grep preserves source lines, reports canonical locations, and exposes safe ranges', () => {
  const source: readonly TerminalTextDocument[] = Object.freeze([
    Object.freeze({
      virtualPath: 'posts/characters/alpha.md',
      lines: Object.freeze(['tree:', '├── characters/', '  # keep this line'])
    })
  ]);
  const result = executeCommand({
    state: createTerminalState(),
    input: 'grep -nF "# " /posts/characters/alpha.md',
    entries,
    documents: source
  });
  assert.deepEqual(result.effect, {
    kind: 'grep',
    pattern: '# ',
    matches: [{ path: '/posts/characters/alpha.md', lineNumber: 3, line: '  # keep this line', ranges: [[2, 4]] }],
    noResults: false,
    truncated: false
  });
  const empty = executeCommand({
    state: createTerminalState(),
    input: 'grep -F absent /posts/characters/alpha.md',
    entries,
    documents: source
  });
  assert.deepEqual(empty.effect, { kind: 'grep', pattern: 'absent', matches: [], noResults: true, truncated: false });
  assert.equal(empty.announcement, 'No matches for "absent".');
});

test('completion consumes only unique contextual document and lab matches', () => {
  assert.deepEqual(completeCommand('hel', entries, experiments), { kind: 'unique', value: 'help ', candidates: ['help'] });
  assert.deepEqual(completeCommand('l', entries, experiments), { kind: 'unique', value: 'l ', candidates: ['l'] });
  assert.equal(completeCommand('', entries, experiments).kind, 'ambiguous');
  const listCompletion = completeCommand('ls p', entries, experiments);
  assert.deepEqual(listCompletion, { kind: 'ambiguous', candidates: ['pages/', 'posts/'], ownsTab: false });
  assert.equal(listCompletion.kind === 'ambiguous' && listCompletion.ownsTab, false);
  assert.deepEqual(completeCommand('ls pa', entries, experiments), { kind: 'unique', value: 'ls pages/', candidates: ['pages/'] });
  const emptyListCompletion = completeCommand('ls ', entries, experiments);
  assert.equal(emptyListCompletion.kind, 'ambiguous');
  assert.equal(emptyListCompletion.kind === 'ambiguous' && emptyListCompletion.ownsTab, true);
  assert.deepEqual(completeCommand('ls l', entries, experiments), { kind: 'unique', value: 'ls lab/', candidates: ['lab/'] });
  assert.deepEqual(completeCommand('ls cha', entries, experiments), { kind: 'unique', value: 'ls characters/', candidates: ['characters/'] });
  assert.deepEqual(completeCommand('ls --he', entries, experiments), { kind: 'unique', value: 'ls --help', candidates: ['--help'] });
  assert.deepEqual(completeCommand('cd cha', entries, experiments, DEFAULT_TERMINAL_COMMAND_REGISTRY, '~/blog/posts'), { kind: 'unique', value: 'cd characters/', candidates: ['characters/'] });
  assert.deepEqual(completeCommand('cd la', entries, experiments, DEFAULT_TERMINAL_COMMAND_REGISTRY, '~/blog'), { kind: 'unique', value: 'cd lab/', candidates: ['lab/'] });
  assert.deepEqual(completeCommand('cd la', entries, experiments, DEFAULT_TERMINAL_COMMAND_REGISTRY, '~/blog/posts'), { kind: 'no-match', candidates: [], ownsTab: true });
  const rootCdCompletion = completeCommand('cd ', entries, experiments, DEFAULT_TERMINAL_COMMAND_REGISTRY, '~/blog');
  assert.deepEqual(rootCdCompletion, { kind: 'ambiguous', candidates: ['lab/', 'pages/', 'posts/'], ownsTab: true });
  assert.deepEqual(completeCommand('cat a', entries, experiments, DEFAULT_TERMINAL_COMMAND_REGISTRY, '~/blog/posts/characters'), { kind: 'unique', value: 'cat alpha.md', candidates: ['alpha.md'] });
  assert.deepEqual(completeCommand('cat cha', entries, experiments), { kind: 'unique', value: 'cat characters/', candidates: ['characters/'] });
  assert.deepEqual(completeCommand('cat characters/alp', entries, experiments), { kind: 'unique', value: 'cat characters/alpha.md', candidates: ['characters/alpha.md'] });
  assert.deepEqual(completeCommand('cat ./characters/alp', entries, experiments), { kind: 'unique', value: 'cat ./characters/alpha.md', candidates: ['characters/alpha.md'] });
  assert.deepEqual(completeCommand('vim /pages/abo', entries, experiments), { kind: 'unique', value: 'vim /pages/about.md', candidates: ['pages/about.md'] });
  const pathEntries = decodeTerminalEntries([
    ...rawEntries,
    { kind: 'post', virtualPath: 'posts/beta.md', relativePath: 'beta.md', filename: 'beta.md', title: 'Beta', href: '/posts/beta/', date: '2026-06-01' }
  ]);
  const helloEntries = decodeTerminalEntries([
    ...rawEntries,
    { kind: 'post', virtualPath: 'posts/hello-static-foundation.md', relativePath: 'hello-static-foundation.md', filename: 'hello-static-foundation.md', title: 'Hello, static foundation', href: '/posts/hello-static-foundation/', date: '2026-08-12' }
  ]);
  const wildcardEntries = decodeTerminalEntries([
    ...helloEntries,
    { kind: 'post', virtualPath: 'posts/hidden-draft.md', relativePath: 'hidden-draft.md', filename: 'hidden-draft.md', title: 'Hidden draft', href: '/posts/hidden-draft/', date: '2026-08-11' }
  ]);
  assert.deepEqual(completeCommand('ls he', helloEntries, experiments), {
    kind: 'unique',
    value: 'ls hello-static-foundation.md',
    candidates: ['hello-static-foundation.md']
  });
  assert.deepEqual(completeCommand('ls /pages/ab', entries, experiments), {
    kind: 'unique',
    value: 'ls /pages/about.md',
    candidates: ['pages/about.md']
  });
  assert.deepEqual(executeCommand({
    state: createTerminalState(),
    input: 'ls hello-static-foundation.md',
    entries: helloEntries,
    experiments
  }).effect, {
    kind: 'entries',
    directories: [],
    entries: [helloEntries[2]],
    label: 'posts',
    directory: '/posts'
  });
  assert.deepEqual(executeCommand({
    state: createTerminalState(),
    input: 'ls he*',
    entries: helloEntries,
    experiments
  }).effect, {
    kind: 'entries',
    directories: [],
    entries: [helloEntries[2]],
    label: 'posts',
    directory: '/posts'
  });
  assert.deepEqual(executeCommand({
    state: createTerminalState(),
    input: 'ls *.md',
    entries: wildcardEntries,
    experiments
  }).effect, {
    kind: 'entries',
    directories: [],
    entries: [wildcardEntries[2], wildcardEntries[3]],
    label: 'posts',
    directory: '/posts'
  });
  assert.deepEqual(completeCommand('cat ./', pathEntries, experiments), {
    kind: 'ambiguous',
    candidates: ['./beta.md', './characters/'],
    ownsTab: true
  });
  assert.deepEqual(completeCommand('vim /', pathEntries, experiments), {
    kind: 'ambiguous',
    candidates: ['/pages/', '/posts/'],
    ownsTab: true
  });
  for (const input of ['cat 1', 'vim ./does-not-exist', 'cat /posts/does-not-exist']) {
    assert.deepEqual(completeCommand(input, entries, experiments), {
      kind: 'no-match',
      candidates: [],
      ownsTab: true
    }, input);
  }
  for (const input of ['cat ../alp', 'cat ./nested/../alp', 'cat /alp', 'cat https://example.com/alp', 'cat /etc/pass', 'cat cafe\u0301.md', 'cat control\u0001path']) {
    assert.equal(completeCommand(input, entries, experiments).kind, 'none', input);
  }
  assert.deepEqual(completeCommand('open lab/n', entries, experiments), { kind: 'unique', value: 'open lab/nerv', candidates: ['lab/nerv'] });
  assert.equal(completeCommand('open lab/', entries, experiments).kind, 'ambiguous');
});

test('immutable command registry keeps a unit-only alias consistent', () => {
  const registry = createTerminalCommandRegistry([...DEFAULT_TERMINAL_COMMAND_REGISTRY.definitions, {
    name: 'greet',
    aliases: ['hi'],
    summary: 'print a greeting',
    usage: 'greet',
    execute: (operands) => operands.length === 0
      ? { kind: 'lines', tone: 'normal', lines: ['hello'] }
      : { kind: 'lines', tone: 'error', lines: ['Usage: greet'] },
    complete: () => ({ kind: 'none', candidates: [] })
  }]);
  const result = executeCommand({ state: createTerminalState(), input: 'hi', entries, registry });
  assert.deepEqual(result.effect, { kind: 'lines', tone: 'normal', lines: ['hello'] });
  assert.deepEqual(executeCommand({ state: createTerminalState(), input: 'hi | grep hello', entries, registry }).effect, {
    kind: 'grep',
    pattern: 'hello',
    matches: [{ path: '-', line: 'hello', ranges: [[0, 5]] }],
    noResults: false,
    truncated: false
  });
  assert.deepEqual(executeCommand({ state: createTerminalState(), input: 'hi | grep hello | cat', entries, registry }).effect, {
    kind: 'lines',
    tone: 'normal',
    lines: ['hello']
  });
  assert.deepEqual(result.state.history, ['hi']);
  assert.deepEqual(completeCommand('gree', entries, [], registry), { kind: 'unique', value: 'greet ', candidates: ['greet'] });
  assert.deepEqual(completeCommand('hi', entries, [], registry), { kind: 'unique', value: 'hi ', candidates: ['hi'] });
  const customHelp = executeCommand({ state: createTerminalState(), input: 'help', entries, registry }).effect;
  assert.equal(customHelp?.kind, 'help');
  assert.equal(customHelp?.kind === 'help' && customHelp.groups.at(-1)?.commands[0]?.summary, 'print a greeting');
  const overriddenHelp = createTerminalCommandRegistry([{
    name: 'help',
    aliases: [],
    summary: 'custom help',
    usage: 'help',
    execute: () => ({ kind: 'lines', tone: 'normal', lines: ['custom help'] })
  }]);
  assert.deepEqual(executeCommand({ state: createTerminalState(), input: 'help', entries, registry: overriddenHelp }).effect, {
    kind: 'lines',
    tone: 'normal',
    lines: ['custom help']
  });
  assert.equal(Object.isFrozen(registry.definitions), true);
  assert.throws(() => createTerminalCommandRegistry([
    { name: 'one', aliases: ['shared'], summary: 'one', usage: 'one', execute: () => ({ kind: 'clear' }) },
    { name: 'shared', aliases: [], summary: 'two', usage: 'shared', execute: () => ({ kind: 'clear' }) }
  ]), /collision/u);
});
