import { semanticPresentation } from '@firefly/presentation-semantic';
import { terminalPresentation } from '@firefly/presentation-terminal';
import type { PresentationAdapter } from '@firefly/x-core';
import type { DocumentNavigatorProfile } from './document-navigation.ts';

export type PresentationDocumentKind = 'semantic' | 'terminal';
export type DocumentNavigatorExitPolicy = 'home' | 'local';

export interface PresentationExperienceDefinition {
  readonly id: string;
  readonly adapter: PresentationAdapter;
  readonly documentKind: PresentationDocumentKind;
  readonly documentNavigatorId: string;
  readonly documentNavigator: DocumentNavigatorProfile;
  readonly documentNavigatorExit?: DocumentNavigatorExitPolicy;
}

export interface PresentationExperience {
  readonly id: string;
  readonly adapter: PresentationAdapter;
  readonly documentKind: PresentationDocumentKind;
  readonly documentNavigatorId: string;
  readonly documentNavigator: DocumentNavigatorProfile;
  readonly documentNavigatorExit: DocumentNavigatorExitPolicy;
}

export interface DocumentNavigatorAssets {
  readonly runtime: string;
  readonly semanticStyles: string;
  readonly terminalStyles: string;
}

export interface DocumentNavigatorDefinition {
  readonly id: string;
  readonly kind: 'document-navigator';
  readonly assets: DocumentNavigatorAssets;
}

const safeRegistryId = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

function freezeNavigatorDefinition(definition: DocumentNavigatorDefinition): DocumentNavigatorDefinition {
  if (
    typeof definition !== 'object' ||
    definition === null ||
    typeof definition.id !== 'string' ||
    !safeRegistryId.test(definition.id) ||
    definition.kind !== 'document-navigator' ||
    typeof definition.assets !== 'object' ||
    definition.assets === null
  ) {
    throw new TypeError('Document navigator definitions require a safe ID, kind, and assets.');
  }

  const { assets } = definition;
  if (
    typeof assets.runtime !== 'string' ||
    !safeRegistryId.test(assets.runtime) ||
    typeof assets.semanticStyles !== 'string' ||
    !safeRegistryId.test(assets.semanticStyles) ||
    typeof assets.terminalStyles !== 'string' ||
    !safeRegistryId.test(assets.terminalStyles)
  ) {
    throw new TypeError(`Document navigator "${definition.id}" has invalid asset handles.`);
  }

  return Object.freeze({
    id: definition.id,
    kind: definition.kind,
    assets: Object.freeze({
      runtime: assets.runtime,
      semanticStyles: assets.semanticStyles,
      terminalStyles: assets.terminalStyles
    })
  });
}

export function createDocumentNavigatorRegistry(
  definitions: readonly DocumentNavigatorDefinition[]
): readonly DocumentNavigatorDefinition[] {
  if (!Array.isArray(definitions)) {
    throw new TypeError('Document navigator definitions must be provided as an array.');
  }

  const ids = new Set<string>();
  return Object.freeze(definitions.map((definition) => {
    const navigator = freezeNavigatorDefinition(definition);
    if (ids.has(navigator.id)) {
      throw new TypeError(`Duplicate document navigator "${navigator.id}".`);
    }
    ids.add(navigator.id);
    return navigator;
  }));
}

export const DOCUMENT_NAVIGATORS = createDocumentNavigatorRegistry([
  {
    id: 'document-navigator',
    kind: 'document-navigator',
    assets: {
      runtime: 'document-navigator',
      semanticStyles: 'document-navigation-semantic',
      terminalStyles: 'document-navigation-terminal'
    }
  }
]);

const documentNavigatorById = new Map(
  DOCUMENT_NAVIGATORS.map((navigator) => [navigator.id, navigator])
);

export function resolveDocumentNavigator(
  id: string,
  registry: readonly DocumentNavigatorDefinition[] = DOCUMENT_NAVIGATORS
): DocumentNavigatorDefinition {
  if (typeof id !== 'string' || !safeRegistryId.test(id)) {
    throw new Error(`Unknown document navigator "${String(id)}".`);
  }
  const navigator = registry === DOCUMENT_NAVIGATORS
    ? documentNavigatorById.get(id)
    : registry.find((candidate) => candidate.id === id);
  if (navigator === undefined) {
    throw new Error(`Unknown document navigator "${id}".`);
  }
  return navigator;
}

function freezeExperience(definition: PresentationExperienceDefinition): PresentationExperience {
  if (
    typeof definition !== 'object' ||
    definition === null ||
    typeof definition.id !== 'string' ||
    definition.id.length === 0 ||
    typeof definition.adapter !== 'object' ||
    definition.adapter === null
  ) {
    throw new TypeError('Presentation experiences require an ID and adapter.');
  }

  if (definition.id !== definition.adapter.id) {
    throw new TypeError(
      `Presentation experience "${definition.id}" does not match adapter "${String(definition.adapter.id)}".`
    );
  }

  if (definition.documentKind !== 'semantic' && definition.documentKind !== 'terminal') {
    throw new TypeError(`Presentation experience "${definition.id}" has an unsupported document kind.`);
  }

  if (typeof definition.documentNavigatorId !== 'string' || !safeRegistryId.test(definition.documentNavigatorId)) {
    throw new TypeError(`Presentation experience "${definition.id}" has an invalid default document navigator ID.`);
  }

  const documentNavigatorExit = definition.documentNavigatorExit ?? (
    definition.documentKind === 'semantic' ? 'local' : 'home'
  );
  if (documentNavigatorExit !== 'home' && documentNavigatorExit !== 'local') {
    throw new TypeError(`Presentation experience "${definition.id}" has an invalid document navigator exit policy.`);
  }

  const profile = definition.documentNavigator;
  if (
    typeof profile !== 'object' ||
    profile === null ||
    profile.kind !== 'document-navigator' ||
    (profile.entry !== 'always' && profile.entry !== 'fragment')
  ) {
    throw new TypeError(`Presentation experience "${definition.id}" has an invalid document navigator profile.`);
  }

  return Object.freeze({
    id: definition.id,
    adapter: definition.adapter,
    documentKind: definition.documentKind,
    documentNavigatorId: definition.documentNavigatorId,
    documentNavigatorExit,
    documentNavigator: Object.freeze({
      kind: profile.kind,
      entry: profile.entry
    })
  });
}

export function createPresentationExperienceRegistry(
  definitions: readonly PresentationExperienceDefinition[]
): readonly PresentationExperience[] {
  if (!Array.isArray(definitions)) {
    throw new TypeError('Presentation experiences must be provided as an array.');
  }

  const ids = new Set<string>();
  return Object.freeze(definitions.map((definition) => {
    const experience = freezeExperience(definition);
    if (ids.has(experience.id)) {
      throw new TypeError(`Duplicate presentation experience "${experience.id}".`);
    }
    ids.add(experience.id);
    return experience;
  }));
}

export const PRESENTATION_EXPERIENCES = createPresentationExperienceRegistry([
  {
    id: 'firefly',
    adapter: terminalPresentation,
    documentKind: 'terminal',
    documentNavigatorId: 'document-navigator',
    documentNavigatorExit: 'home',
    documentNavigator: {
      kind: 'document-navigator',
      entry: 'always'
    }
  },
  {
    id: 'semantic',
    adapter: semanticPresentation,
    documentKind: 'semantic',
    documentNavigatorId: 'document-navigator',
    documentNavigatorExit: 'local',
    documentNavigator: {
      kind: 'document-navigator',
      entry: 'fragment'
    }
  }
]);

const presentationExperienceById = new Map(
  PRESENTATION_EXPERIENCES.map((experience) => [experience.id, experience])
);

export function resolvePresentationExperience(id: string): PresentationExperience {
  const experience = presentationExperienceById.get(id);
  if (experience === undefined) {
    throw new Error(`Unsupported site presentation "${id}".`);
  }
  return experience;
}
