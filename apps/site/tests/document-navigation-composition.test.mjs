import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDocumentNavigationLookup,
  resolveDocumentNavigation,
  validateDocumentNavigationConfig
} from '../src/lib/document-navigation-composition.ts';
import {
  createDocumentNavigationCapabilityLookup,
  decodeDocumentNavigationCapabilityLookup,
  documentNavigationCapabilityForPath,
  serializeDocumentNavigationCapabilityLookup
} from '../src/lib/document-navigation.ts';

test('composition preserves the approved enabled defaults and resolves none independently', () => {
  const firefly = resolveDocumentNavigation('firefly', {});
  const semantic = resolveDocumentNavigation('semantic', {});
  const disabled = resolveDocumentNavigation('semantic', {
    documentNavigation: { semantic: { navigator: 'none' } }
  });

  assert.deepEqual(
    {
      firefly: [firefly.kind, firefly.profile.entry, firefly.exitPolicy],
      semantic: [semantic.kind, semantic.profile.entry, semantic.exitPolicy],
      disabled: [disabled.kind]
    },
    {
      firefly: ['document-navigator', 'always', 'home'],
      semantic: ['document-navigator', 'fragment', 'local'],
      disabled: ['none']
    }
  );
  assert.equal(Object.hasOwn(disabled, 'profile'), false);
  assert.equal(Object.hasOwn(disabled, 'assets'), false);
});

test('composition validates presentation and navigator IDs before rendering', () => {
  assert.throws(
    () => validateDocumentNavigationConfig({
      documentNavigation: { unknown: { navigator: 'none' } }
    }),
    /unknown presentation ID/iu
  );
  assert.throws(
    () => resolveDocumentNavigation('semantic', {
      documentNavigation: { semantic: { navigator: 'missing-navigator' } }
    }),
    /documentNavigation\.semantic\.navigator.*Unknown document navigator/iu
  );
  assert.throws(
    () => resolveDocumentNavigation('semantic', {
      documentNavigation: { semantic: { navigator: '' } }
    }),
    /documentNavigation\.semantic.*non-empty/iu
  );
});

test('composition consumes a test-only alternate navigator definition through the registry contract', () => {
  const alternate = {
    id: 'alternate-navigator',
    kind: 'document-navigator',
    assets: {
      runtime: 'alternate-navigator',
      semanticStyles: 'alternate-navigator-semantic',
      terminalStyles: 'alternate-navigator-terminal'
    }
  };
  const composition = resolveDocumentNavigation(
    'semantic',
    { documentNavigation: { semantic: { navigator: alternate.id } } },
    { navigatorRegistry: [alternate] }
  );
  assert.equal(composition.kind, 'document-navigator');
  assert.equal(composition.navigator.id, alternate.id);
  assert.equal(composition.profile.entry, 'fragment');
  assert.equal(composition.exitPolicy, 'local');
});

test('destination capability lookup is public, canonical, frozen, and round-trips safely', () => {
  const lookup = createDocumentNavigationLookup([
    {
      href: '/posts/enabled/',
      entry: { data: { draft: false, access: { visibility: 'public' }, presentation: 'firefly' } }
    },
    {
      href: '/pages/disabled/',
      entry: { data: { draft: false, access: { visibility: 'public' }, presentation: 'semantic' } }
    },
    {
      href: '/posts/private/',
      entry: { data: { draft: true, access: { visibility: 'public' }, presentation: 'firefly' } }
    }
  ], {
    documentNavigation: { semantic: { navigator: 'none' } }
  });
  assert.deepEqual(lookup, {
    '/posts/enabled/': 'document-navigator',
    '/pages/disabled/': 'none'
  });
  assert.ok(Object.isFrozen(lookup));
  assert.equal(documentNavigationCapabilityForPath(lookup, '/posts/enabled/'), 'document-navigator');
  assert.equal(documentNavigationCapabilityForPath(lookup, '/pages/disabled/'), 'none');
  assert.equal(documentNavigationCapabilityForPath(lookup, '/posts/enabled/?mode=reader'), undefined);
  const serialized = serializeDocumentNavigationCapabilityLookup(lookup);
  assert.equal(
    serialized,
    '{"/pages/disabled/":"none","/posts/enabled/":"document-navigator"}'
  );
  assert.deepEqual(decodeDocumentNavigationCapabilityLookup(serialized), lookup);
  assert.throws(
    () => createDocumentNavigationCapabilityLookup([
      { href: '/posts/enabled/', capability: 'none' },
      { href: '/posts/enabled/', capability: 'document-navigator' }
    ]),
    /Duplicate document navigation capability/iu
  );
});
