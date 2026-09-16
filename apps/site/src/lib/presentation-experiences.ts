import { semanticPresentation } from '@firefly/presentation-semantic';
import { terminalPresentation } from '@firefly/presentation-terminal';
import type { PresentationAdapter } from '@firefly/x-core';
import type { DocumentNavigatorProfile } from './document-navigation.ts';

export type PresentationDocumentKind = 'semantic' | 'terminal';

export interface PresentationExperience {
  readonly id: string;
  readonly adapter: PresentationAdapter;
  readonly documentKind: PresentationDocumentKind;
  readonly documentNavigator: DocumentNavigatorProfile;
}

function freezeExperience(definition: PresentationExperience): PresentationExperience {
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
    documentNavigator: Object.freeze({
      kind: profile.kind,
      entry: profile.entry
    })
  });
}

export function createPresentationExperienceRegistry(
  definitions: readonly PresentationExperience[]
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
    documentNavigator: {
      kind: 'document-navigator',
      entry: 'always'
    }
  },
  {
    id: 'semantic',
    adapter: semanticPresentation,
    documentKind: 'semantic',
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
