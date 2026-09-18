import assert from 'node:assert/strict';
import test from 'node:test';
import { semanticPresentation } from '@firefly/presentation-semantic';
import { terminalPresentation } from '@firefly/presentation-terminal';
import { PresentationRegistry } from '@firefly/x-core';
import {
  createDocumentNavigatorRegistry,
  createPresentationExperienceRegistry,
  DOCUMENT_NAVIGATORS,
  PRESENTATION_EXPERIENCES,
  resolveDocumentNavigator,
  resolvePresentationExperience
} from '../src/lib/presentation-experiences.ts';
import {
  DOCUMENT_NAVIGATOR_FRAGMENT,
  navigationInitialState
} from '../src/lib/document-navigation.ts';

test('presentation experiences keep adapter registration and document dispatch together', () => {
  assert.deepEqual(
    PRESENTATION_EXPERIENCES.map(({ id, adapter, documentKind, documentNavigatorId, documentNavigator }) => ({
      id,
      adapterId: adapter.id,
      documentKind,
      documentNavigatorId,
      documentNavigator
    })),
    [
      {
        id: 'firefly',
        adapterId: 'firefly',
        documentKind: 'terminal',
        documentNavigatorId: 'document-navigator',
        documentNavigator: { kind: 'document-navigator', entry: 'always' }
      },
      {
        id: 'semantic',
        adapterId: 'semantic',
        documentKind: 'semantic',
        documentNavigatorId: 'document-navigator',
        documentNavigator: { kind: 'document-navigator', entry: 'fragment' }
      }
    ]
  );

  const registry = new PresentationRegistry();
  for (const { adapter } of PRESENTATION_EXPERIENCES) registry.register(adapter);
  const context = {
    documentId: 'posts/fixture',
    sourcePath: 'posts/fixture.md',
    route: '/posts/fixture/',
    collection: 'posts',
    slug: 'fixture',
    layout: 'post'
  };
  assert.equal(registry.resolve({ ...context, presentation: 'firefly' }), terminalPresentation);
  assert.equal(registry.resolve({ ...context, presentation: 'semantic' }), semanticPresentation);
  assert.equal(resolvePresentationExperience('firefly').documentKind, 'terminal');
  assert.equal(resolvePresentationExperience('semantic').documentKind, 'semantic');
  assert.throws(() => resolvePresentationExperience('missing'), /Unsupported site presentation/iu);
});

test('experience creation rejects adapter identity drift and duplicate IDs', () => {
  const profile = { kind: 'document-navigator', entry: 'always' };
  const definition = {
    id: 'firefly',
    adapter: terminalPresentation,
    documentKind: 'terminal',
    documentNavigatorId: 'document-navigator',
    documentNavigator: profile
  };
  assert.throws(
    () => createPresentationExperienceRegistry([{ ...definition, id: 'wrong' }]),
    /does not match adapter/iu
  );
  assert.throws(
    () => createPresentationExperienceRegistry([definition, definition]),
    /Duplicate presentation experience/iu
  );
  assert.equal(Object.isFrozen(PRESENTATION_EXPERIENCES), true);
  assert.equal(Object.isFrozen(PRESENTATION_EXPERIENCES[0]), true);
  assert.equal(Object.isFrozen(PRESENTATION_EXPERIENCES[0].documentNavigator), true);
});

test('document navigator initial state is derived from the pure profile', () => {
  assert.equal(DOCUMENT_NAVIGATOR_FRAGMENT, '#document-navigator');
  assert.deepEqual(
    navigationInitialState({ kind: 'document-navigator', entry: 'always' }),
    { regionTabIndex: 0, statusHidden: false }
  );
  assert.deepEqual(
    navigationInitialState({ kind: 'document-navigator', entry: 'fragment' }),
    { regionTabIndex: -1, statusHidden: true }
  );
  assert.throws(
    () => navigationInitialState({ kind: 'wrong', entry: 'always' }),
    /document-navigator/iu
  );
});

test('navigator registry validates identities independently from presentation profiles', () => {
  const alternate = {
    id: 'alternate-navigator',
    kind: 'document-navigator',
    assets: {
      runtime: 'alternate-navigator',
      semanticStyles: 'alternate-navigator-semantic',
      terminalStyles: 'alternate-navigator-terminal'
    }
  };
  const registry = createDocumentNavigatorRegistry([alternate]);
  assert.equal(resolveDocumentNavigator('alternate-navigator', registry).id, 'alternate-navigator');
  assert.equal(DOCUMENT_NAVIGATORS[0].id, 'document-navigator');
  assert.throws(
    () => createDocumentNavigatorRegistry([alternate, alternate]),
    /Duplicate document navigator/iu
  );
  assert.throws(
    () => createDocumentNavigatorRegistry([{ ...alternate, id: 'unsafe ID' }]),
    /safe ID/iu
  );
});
