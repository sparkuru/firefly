import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { Root as HastRoot } from 'hast';
import type { DocumentContext, NormalizedDocumentInput } from '@f1refly/x-core';
import { terminalPresentation } from '../src/index.js';
import {
  DEFAULT_TERMINAL_IDENTITY,
  DEFAULT_TERMINAL_PROMPT,
  completeCommand,
  createTerminalState,
  decodeTerminalEntries,
  decodeTerminalExperiments,
  executeCommand,
  navigateHistory,
  tokenizeCommand,
  type TerminalEntry
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
  { kind: 'post', slug: 'alpha', filename: 'alpha.md', title: 'Alpha', href: '/posts/alpha/', date: '2026-05-28' },
  { kind: 'page', slug: 'about', filename: 'about.md', title: 'About', href: '/pages/about/', date: '2026-02-01' }
] as const;
const entries = decodeTerminalEntries(rawEntries);
const experiments = decodeTerminalExperiments([
  { id: 'nerv', title: 'NERV', href: '/lab/nerv/' },
  { id: 'quiet-lab', title: 'Quiet Lab', href: '/lab/quiet-lab/' }
]);

test('default prompt stays derived from the default identity', () => {
  assert.equal(DEFAULT_TERMINAL_PROMPT, 'guest@f1refly $');
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
    { ...rawEntries[0], slug: '../alpha' },
    { ...rawEntries[0], filename: 'other.md' },
    { ...rawEntries[0], href: 'https://example.com/' },
    { ...rawEntries[0], date: '2026-02-30' },
    Object.assign(Object.create({}), rawEntries[0])
  ];
  for (const item of invalid) {
    assert.throws(() => decodeTerminalEntries([item]));
  }
  assert.throws(() => decodeTerminalEntries([rawEntries[0], rawEntries[0]]), /duplicate/u);
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

  assert.doesNotMatch(graph, /@f1refly\/x-core|\b(?:hast|astro)\b|\.\/index\.js/u);
  assert.doesNotMatch(runtime, /^\s*import\s/mu);
});

test('tokenizer accepts balanced quotes and rejects unbalanced input without shell interpretation', () => {
  assert.deepEqual(tokenizeCommand(`cat 'alpha.md'`), { ok: true, tokens: ['cat', 'alpha.md'] });
  assert.deepEqual(tokenizeCommand('about ""'), { ok: true, tokens: ['about', ''] });
  assert.deepEqual(tokenizeCommand('cat $(whoami)'), { ok: true, tokens: ['cat', '$(whoami)'] });
  assert.equal(tokenizeCommand(`cat 'alpha.md`).ok, false);
});

test('every command has deterministic output and strict usage errors', () => {
  const help = JSON.stringify(run('help').effect);
  assert.match(help, /cat \[\.\/\]<slug>\.md/u);
  assert.match(help, /clear — clear the screen/u);
  assert.doesNotMatch(help, /dynamic transcript/u);
  assert.match(help, /ls \[posts\|pages\|lab\]/u);
  assert.match(help, /open lab\/<id>/u);
  assert.equal(run('ls').effect?.kind, 'entries');
  const posts = run('ls posts').effect;
  const pages = run('ls pages').effect;
  assert.deepEqual(posts?.kind === 'entries' ? posts.entries : [], [entries[0]]);
  assert.deepEqual(pages?.kind === 'entries' ? pages.entries : [], [entries[1]]);
  const document = run('cat alpha.md');
  assert.equal(document.effect?.kind, 'document');
  assert.deepEqual(document.effect?.kind === 'document' ? document.effect.entry : null, entries[0]);
  assert.equal(document.announcement, 'Rendered Alpha.');
  const relativeDocument = run('cat ./alpha.md');
  assert.equal(relativeDocument.effect?.kind, 'document');
  assert.deepEqual(
    relativeDocument.effect?.kind === 'document' ? relativeDocument.effect.entry : null,
    entries[0]
  );
  assert.match(JSON.stringify(run('cat missing.md').effect), /No public document/u);
  for (const operand of ['../alpha.md', './nested/alpha.md', '/alpha.md', 'https://example.com/alpha.md']) {
    assert.match(JSON.stringify(run(`cat ${operand}`).effect), /No public document/u, operand);
  }
  assert.match(JSON.stringify(run('about').effect), /static garden/u);
  assert.match(JSON.stringify(run('pwd').effect), /~\/blog/u);
  assert.match(JSON.stringify(run('whoami').effect), /guest/u);
  assert.match(JSON.stringify(run('date').effect), /2026-08-12 04:05:06 UTC/u);
  assert.match(JSON.stringify(run('history').effect), /1  history/u);
  assert.equal(run('clear').effect?.kind, 'clear');
  for (const command of ['help extra', 'ls posts extra', 'ls lab extra', 'cat', 'cat alpha.md extra', 'open', 'open other', 'open lab/nerv extra', 'about extra', 'pwd extra', 'whoami extra', 'date extra', 'history extra', 'clear extra']) {
    assert.match(JSON.stringify(run(command).effect), /Usage:/u, command);
  }
  assert.match(JSON.stringify(run('wat').effect), /Unknown command: wat/u);
  const lab = run('ls lab');
  assert.equal(lab.effect?.kind, 'experiments');
  assert.deepEqual(lab.effect?.kind === 'experiments' ? lab.effect.experiments : [], experiments);
  assert.equal(lab.announcement, '2 experiments listed.');
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
  navigation = navigateHistory(navigation.state, 'down', navigation.input);
  assert.equal(navigation.input, 'unfinished');
  assert.equal(navigation.state.historyCursor, null);
});

test('completion consumes only unique contextual document and lab matches', () => {
  assert.deepEqual(completeCommand('hel', entries, experiments), { kind: 'unique', value: 'help ', candidates: ['help'] });
  assert.equal(completeCommand('l', entries, experiments).kind, 'unique');
  assert.equal(completeCommand('', entries, experiments).kind, 'ambiguous');
  assert.equal(completeCommand('ls p', entries, experiments).kind, 'ambiguous');
  assert.deepEqual(completeCommand('ls l', entries, experiments), { kind: 'unique', value: 'ls lab', candidates: ['lab'] });
  assert.deepEqual(completeCommand('cat alp', entries, experiments), { kind: 'unique', value: 'cat alpha.md', candidates: ['alpha.md'] });
  assert.deepEqual(completeCommand('cat ./alp', entries, experiments), { kind: 'unique', value: 'cat ./alpha.md', candidates: ['alpha.md'] });
  assert.equal(completeCommand('cat missing', entries, experiments).kind, 'none');
  for (const input of ['cat ../alp', 'cat ./nested/alp', 'cat /alp', 'cat https://example.com/alp']) {
    assert.equal(completeCommand(input, entries, experiments).kind, 'none', input);
  }
  assert.deepEqual(completeCommand('open lab/n', entries, experiments), { kind: 'unique', value: 'open lab/nerv', candidates: ['lab/nerv'] });
  assert.equal(completeCommand('open lab/', entries, experiments).kind, 'ambiguous');
});
