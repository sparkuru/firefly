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
      firefly: [firefly.kind, firefly.profile.entry, firefly.profile.supportsMobile, firefly.exitPolicy],
      semantic: [semantic.kind, semantic.profile.entry, semantic.profile.supportsMobile, semantic.exitPolicy],
      disabled: [disabled.kind]
    },
    {
      firefly: ['document-navigator', 'always', false, 'home'],
      semantic: ['document-navigator', 'fragment', false, 'local'],
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
  assert.equal(composition.profile.supportsMobile, false);
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
    '/posts/enabled/': { kind: 'document-navigator', supportsMobile: false },
    '/pages/disabled/': { kind: 'none' }
  });
  assert.ok(Object.isFrozen(lookup));
  assert.ok(Object.isFrozen(lookup['/posts/enabled/']));
  assert.deepEqual(documentNavigationCapabilityForPath(lookup, '/posts/enabled/'), { kind: 'document-navigator', supportsMobile: false });
  assert.deepEqual(documentNavigationCapabilityForPath(lookup, '/pages/disabled/'), { kind: 'none' });
  assert.equal(documentNavigationCapabilityForPath(lookup, '/posts/enabled/?mode=reader'), undefined);
  const serialized = serializeDocumentNavigationCapabilityLookup(lookup);
  assert.equal(
    serialized,
    '{"/pages/disabled/":{"kind":"none"},"/posts/enabled/":{"kind":"document-navigator","supportsMobile":false}}'
  );
  assert.deepEqual(decodeDocumentNavigationCapabilityLookup(serialized), lookup);
  const optedIn = createDocumentNavigationCapabilityLookup([
    { href: '/pages/mobile/', capability: { kind: 'document-navigator', supportsMobile: true } }
  ]);
  assert.deepEqual(decodeDocumentNavigationCapabilityLookup(serializeDocumentNavigationCapabilityLookup(optedIn)), optedIn);
  assert.throws(
    () => createDocumentNavigationCapabilityLookup([
      { href: '/posts/enabled/', capability: { kind: 'none' } },
      { href: '/posts/enabled/', capability: { kind: 'document-navigator', supportsMobile: true } }
    ]),
    /Duplicate document navigation capability/iu
  );
  for (const capability of [
    { kind: 'document-navigator' },
    { kind: 'document-navigator', supportsMobile: 'true' },
    { kind: 'none', supportsMobile: false },
    { kind: 'unknown' }
  ]) {
    assert.throws(
      () => decodeDocumentNavigationCapabilityLookup({ '/posts/enabled/': capability }),
      /Invalid document navigation capability entry/iu
    );
  }
});
