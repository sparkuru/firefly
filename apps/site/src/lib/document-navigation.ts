export const DOCUMENT_NAVIGATOR_FRAGMENT = '#terminal-reader' as const;

export type DocumentNavigatorEntry = 'always' | 'fragment';

export interface DocumentNavigatorProfile {
  readonly kind: 'document-navigator';
  readonly entry: DocumentNavigatorEntry;
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
