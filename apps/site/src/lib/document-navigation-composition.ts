import type { CanonicalDocument } from './content';
import {
  createDocumentNavigationCapabilityLookup,
  type DocumentNavigationCapabilityLookup,
  type DocumentNavigationCapabilityEntry
} from './document-navigation.ts';
import {
  DOCUMENT_NAVIGATORS,
  createDocumentNavigatorRegistry,
  resolveDocumentNavigator,
  resolvePresentationExperience,
  type DocumentNavigatorDefinition,
  type DocumentNavigatorExitPolicy
} from './presentation-experiences.ts';
import { SITE_CONFIG } from './site-config.mjs';

export interface DocumentNavigationOverride {
  readonly navigator: string;
}

export interface DocumentNavigationSiteConfig {
  readonly documentNavigation?: Readonly<Record<string, DocumentNavigationOverride>>;
}

export interface DisabledDocumentNavigation {
  readonly kind: 'none';
}

export interface EnabledDocumentNavigation {
  readonly kind: 'document-navigator';
  readonly navigator: DocumentNavigatorDefinition;
  readonly profile: Readonly<{
    readonly kind: 'document-navigator';
    readonly entry: 'always' | 'fragment';
    readonly supportsMobile: boolean;
  }>;
  readonly exitPolicy: DocumentNavigatorExitPolicy;
  readonly assets: DocumentNavigatorDefinition['assets'];
}

export type DocumentNavigationComposition =
  | DisabledDocumentNavigation
  | EnabledDocumentNavigation;

export interface ResolveDocumentNavigationOptions {
  readonly navigatorRegistry?: readonly DocumentNavigatorDefinition[];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertOverride(
  value: unknown,
  field: string
): asserts value is DocumentNavigationOverride {
  if (!isPlainRecord(value)) {
    throw new TypeError(`${field} must be a plain object.`);
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== 'navigator') {
    throw new TypeError(`${field} must contain only navigator.`);
  }
  const navigator = Object.getOwnPropertyDescriptor(value, 'navigator');
  if (
    navigator === undefined ||
    !('value' in navigator) ||
    !navigator.enumerable ||
    typeof navigator.value !== 'string' ||
    navigator.value.trim() !== navigator.value ||
    navigator.value.length === 0
  ) {
    throw new TypeError(`${field}.navigator must be a non-empty string.`);
  }
}

function validateDocumentNavigationTable(
  config: DocumentNavigationSiteConfig,
  navigatorRegistry: readonly DocumentNavigatorDefinition[]
): Readonly<Record<string, DocumentNavigationOverride>> {
  const table = config.documentNavigation;
  if (table === undefined) return Object.freeze({});
  if (!isPlainRecord(table)) {
    throw new TypeError('Invalid site configuration field documentNavigation: expected a plain object.');
  }

  const validated: Record<string, DocumentNavigationOverride> = {};
  for (const presentation of Object.keys(table)) {
    const field = `documentNavigation.${presentation}`;
    try {
      resolvePresentationExperience(presentation);
    } catch (error) {
      throw new Error(`${field}: unknown presentation ID (${error instanceof Error ? error.message : String(error)}).`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(table, presentation);
    if (descriptor === undefined || !('value' in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`${field} must be an enumerable data property.`);
    }
    assertOverride(descriptor.value, field);
    if (descriptor.value.navigator !== 'none') {
      try {
        resolveDocumentNavigator(descriptor.value.navigator, navigatorRegistry);
      } catch (error) {
        throw new Error(`${field}.navigator: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    validated[presentation] = Object.freeze({ navigator: descriptor.value.navigator });
  }
  return Object.freeze(validated);
}

function siteConfigForResolution(
  config: DocumentNavigationSiteConfig,
  navigatorRegistry: readonly DocumentNavigatorDefinition[]
): Readonly<{ documentNavigation: Readonly<Record<string, DocumentNavigationOverride>> }> {
  if (!isPlainRecord(config)) {
    throw new TypeError('Site configuration must be a plain object.');
  }
  return Object.freeze({
    documentNavigation: validateDocumentNavigationTable(config, navigatorRegistry)
  });
}

export function validateDocumentNavigationConfig(
  config: DocumentNavigationSiteConfig = SITE_CONFIG,
  options: ResolveDocumentNavigationOptions = {}
): void {
  const navigatorRegistry = options.navigatorRegistry === undefined
    ? DOCUMENT_NAVIGATORS
    : createDocumentNavigatorRegistry(options.navigatorRegistry);
  siteConfigForResolution(config, navigatorRegistry);
}

export function resolveDocumentNavigation(
  presentationId: string,
  config: DocumentNavigationSiteConfig = SITE_CONFIG,
  options: ResolveDocumentNavigationOptions = {}
): DocumentNavigationComposition {
  const experience = resolvePresentationExperience(presentationId);
  const navigatorRegistry = options.navigatorRegistry === undefined
    ? DOCUMENT_NAVIGATORS
    : createDocumentNavigatorRegistry(options.navigatorRegistry);
  const validatedConfig = siteConfigForResolution(config, navigatorRegistry);
  const override = validatedConfig.documentNavigation?.[experience.id];
  const navigatorId = override?.navigator ?? experience.documentNavigatorId;

  if (navigatorId === 'none') {
    return Object.freeze({ kind: 'none' });
  }

  let navigator: DocumentNavigatorDefinition;
  try {
    navigator = resolveDocumentNavigator(
      navigatorId,
      navigatorRegistry
    );
  } catch (error) {
    throw new Error(
      `documentNavigation.${experience.id}.navigator: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const profile = Object.freeze({
    kind: navigator.kind,
    entry: experience.documentNavigator.entry,
    supportsMobile: experience.documentNavigator.supportsMobile ?? false
  });
  return Object.freeze({
    kind: 'document-navigator',
    navigator,
    profile,
    exitPolicy: experience.documentNavigatorExit,
    assets: navigator.assets
  });
}

function isPublicDocument(document: CanonicalDocument): boolean {
  return document.entry.data.draft === false && document.entry.data.access.visibility === 'public';
}

export function createDocumentNavigationLookup(
  documents: readonly CanonicalDocument[],
  config: DocumentNavigationSiteConfig = SITE_CONFIG,
  options: ResolveDocumentNavigationOptions = {}
): DocumentNavigationCapabilityLookup {
  if (!Array.isArray(documents)) {
    throw new TypeError('Canonical documents must be provided as an array.');
  }

  const navigatorRegistry = options.navigatorRegistry === undefined
    ? DOCUMENT_NAVIGATORS
    : createDocumentNavigatorRegistry(options.navigatorRegistry);
  const validatedConfig = siteConfigForResolution(config, navigatorRegistry);
  const entries: DocumentNavigationCapabilityEntry[] = [];
  for (const document of documents) {
    if (!isPublicDocument(document)) continue;
    const composition = resolveDocumentNavigation(
      document.entry.data.presentation,
      validatedConfig,
      { navigatorRegistry }
    );
    entries.push({
      href: document.href,
      capability: composition.kind === 'none'
        ? { kind: 'none' }
        : { kind: 'document-navigator', supportsMobile: composition.profile.supportsMobile }
    });
  }
  return createDocumentNavigationCapabilityLookup(entries);
}
