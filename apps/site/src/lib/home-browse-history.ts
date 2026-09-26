export const HOME_BROWSE_HISTORY_KEY = 'fireflyHomeBrowse';

export function homeBrowseHref(state: unknown, directories: ReadonlySet<string>): string {
  if (state === null || typeof state !== 'object' || Array.isArray(state)) return '/';
  const value = (state as Record<string, unknown>)[HOME_BROWSE_HISTORY_KEY];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return '/';
  const browse = value as Record<string, unknown>;
  return browse.version === 1 && typeof browse.href === 'string' &&
    Object.keys(browse).length === 2 && (browse.href === '/' || directories.has(browse.href)) ? browse.href : '/';
}

export function homeBrowseState(state: unknown, href: string): Record<string, unknown> {
  return {
    ...(state !== null && typeof state === 'object' && !Array.isArray(state) ? state : {}),
    [HOME_BROWSE_HISTORY_KEY]: { version: 1, href }
  };
}
