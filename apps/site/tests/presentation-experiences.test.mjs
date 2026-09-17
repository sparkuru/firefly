import assert from 'node:assert/strict';
import test from 'node:test';
import { semanticPresentation } from '@firefly/presentation-semantic';
import { terminalPresentation } from '@firefly/presentation-terminal';
import { PresentationRegistry } from '@firefly/x-core';
import {
  createPresentationExperienceRegistry,
  PRESENTATION_EXPERIENCES,
  resolvePresentationExperience
} from '../src/lib/presentation-experiences.ts';
import {
  DOCUMENT_NAVIGATOR_FRAGMENT,
  navigationInitialState
} from '../src/lib/document-navigation.ts';

test('presentation experiences keep adapter registration and document dispatch together', () => {
  assert.deepEqual(
    PRESENTATION_EXPERIENCES.map(({ id, adapter, documentKind, documentNavigator }) => ({
      id,
      adapterId: adapter.id,
      documentKind,
      documentNavigator
    })),
    [
      {
        id: 'firefly',
        adapterId: 'firefly',
        documentKind: 'terminal',
        documentNavigator: { kind: 'document-navigator', entry: 'always' }
      },
      {
        id: 'semantic',
        adapterId: 'semantic',
        documentKind: 'semantic',
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
