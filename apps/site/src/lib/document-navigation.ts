export const DOCUMENT_NAVIGATOR_FRAGMENT = '#document-navigator' as const;

export type DocumentNavigatorEntry = 'always' | 'fragment';

export type DocumentNavigationCapability =
  | Readonly<{ readonly kind: 'document-navigator'; readonly supportsMobile: boolean }>
  | Readonly<{ readonly kind: 'none' }>;

export interface DocumentNavigationCapabilityEntry {
  readonly href: string;
  readonly capability: DocumentNavigationCapability;
}

export type DocumentNavigationCapabilityLookup = Readonly<Record<string, DocumentNavigationCapability>>;

export const MOBILE_DOCUMENT_NAVIGATION_QUERY = '(hover: none) and (pointer: coarse)' as const;

const canonicalRouteSegment = /^[^\\/?#%\s\u0000-\u001f\u007f.][^\\/?#%\s\u0000-\u001f\u007f]*$/u;

function isCanonicalDocumentPath(value: string): boolean {
  if (!value.startsWith('/') || !value.endsWith('/') || value === '/') return false;
  const segments = value.slice(1, -1).split('/');
  const collection = segments.shift();
  return (
    (collection === 'posts' || collection === 'pages') &&
    segments.length > 0 &&
    segments.every((segment) => canonicalRouteSegment.test(segment))
  );
}

function assertCapabilityEntry(value: unknown, index: number): asserts value is DocumentNavigationCapabilityEntry {
  const record = value as Record<string, unknown>;
  const href = value !== null && typeof value === 'object'
    ? Object.getOwnPropertyDescriptor(record, 'href')
    : undefined;
  const capability = value !== null && typeof value === 'object'
    ? Object.getOwnPropertyDescriptor(record, 'capability')
    : undefined;
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(record).length !== 2 ||
    href === undefined ||
    !('value' in href) ||
    !href.enumerable ||
    capability === undefined ||
    !('value' in capability) ||
    !capability.enumerable ||
    typeof href.value !== 'string' ||
    !isCanonicalDocumentPath(href.value) ||
    !isValidCapability(capability.value)
  ) {
    throw new TypeError(`Invalid document navigation capability entry at index ${index}.`);
  }
}

function isValidCapability(value: unknown): value is DocumentNavigationCapability {
  if (!isPlainRecord(value)) return false;
  const kind = Object.getOwnPropertyDescriptor(value, 'kind');
  if (kind === undefined || !('value' in kind) || !kind.enumerable) return false;
  if (kind.value === 'none') return Reflect.ownKeys(value).length === 1;
  if (kind.value !== 'document-navigator' || Reflect.ownKeys(value).length !== 2) return false;
  const supportsMobile = Object.getOwnPropertyDescriptor(value, 'supportsMobile');
  return supportsMobile !== undefined && 'value' in supportsMobile && supportsMobile.enumerable === true &&
    typeof supportsMobile.value === 'boolean';
}

export function createDocumentNavigationCapabilityLookup(
  entries: readonly DocumentNavigationCapabilityEntry[]
): DocumentNavigationCapabilityLookup {
  if (!Array.isArray(entries)) {
    throw new TypeError('Document navigation capability entries must be an array.');
  }

  const lookup: Record<string, DocumentNavigationCapability> = {};
  entries.forEach((entry, index) => {
    assertCapabilityEntry(entry, index);
    const href = entry.href;
    if (Object.hasOwn(lookup, href)) {
      throw new TypeError(`Duplicate document navigation capability for ${href}.`);
    }
    lookup[href] = Object.freeze({ ...entry.capability });
  });
  return Object.freeze(lookup);
}

export function serializeDocumentNavigationCapabilityLookup(
  lookup: DocumentNavigationCapabilityLookup
): string {
  if (typeof lookup !== 'object' || lookup === null || Array.isArray(lookup)) {
    throw new TypeError('Document navigation capability lookup must be an object.');
  }
  const ordered: Record<string, DocumentNavigationCapability> = {};
  for (const href of Object.keys(lookup).sort()) {
    const descriptor = Object.getOwnPropertyDescriptor(lookup, href);
    if (descriptor === undefined || !('value' in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`Invalid document navigation capability for ${href}.`);
    }
    const capability = descriptor.value;
    if (!isCanonicalDocumentPath(href) || !isValidCapability(capability)) {
      throw new TypeError(`Invalid document navigation capability for ${href}.`);
    }
    ordered[href] = capability;
  }
  return JSON.stringify(ordered);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function decodeDocumentNavigationCapabilityLookup(
  value: unknown
): DocumentNavigationCapabilityLookup {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new TypeError('Document navigation capability lookup is not valid JSON.');
    }
  }

  if (!isPlainRecord(parsed)) {
    throw new TypeError('Document navigation capability lookup must be a plain object.');
  }

  const entries: DocumentNavigationCapabilityEntry[] = [];
  for (const href of Object.keys(parsed)) {
    const descriptor = Object.getOwnPropertyDescriptor(parsed, href);
    if (descriptor === undefined || !('value' in descriptor) || !descriptor.enumerable) {
      throw new TypeError('Document navigation capability lookup contains an accessor or hidden value.');
    }
    entries.push({ href, capability: descriptor.value as DocumentNavigationCapability });
  }
  return createDocumentNavigationCapabilityLookup(entries);
}

export function documentNavigationCapabilityForPath(
  lookup: DocumentNavigationCapabilityLookup,
  pathname: string
): DocumentNavigationCapability | undefined {
  if (!isPlainRecord(lookup) || !isCanonicalDocumentPath(pathname) || !Object.hasOwn(lookup, pathname)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(lookup, pathname);
  return descriptor !== undefined && 'value' in descriptor && descriptor.enumerable
    ? descriptor.value as DocumentNavigationCapability
    : undefined;
}

export interface DocumentNavigatorProfile {
  readonly kind: 'document-navigator';
  readonly entry: DocumentNavigatorEntry;
  readonly supportsMobile?: boolean;
}

export interface ResolvedDocumentNavigatorProfile extends DocumentNavigatorProfile {
  readonly supportsMobile: boolean;
}

export interface NavigationInitialState {
  readonly regionTabIndex: 0 | -1;
  readonly statusHidden: boolean;
}

export function navigationInitialState(
  profile: DocumentNavigatorProfile
): NavigationInitialState {
  if (profile.kind !== 'document-navigator') {
    throw new TypeError('Document navigation profiles must identify the document-navigator behavior.');
  }

  switch (profile.entry) {
    case 'always':
      return { regionTabIndex: 0, statusHidden: false };
    case 'fragment':
      return { regionTabIndex: -1, statusHidden: true };
    default:
      throw new TypeError('Document navigation profiles must define an always or fragment entry policy.');
  }
}
